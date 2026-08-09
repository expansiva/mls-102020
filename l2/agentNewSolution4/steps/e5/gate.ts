/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/gate.ts" enhancement="_blank"/>

import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { Ns4E5Review } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';

export interface Ns4E5GateIssue { code: string; path: string; message: string; }
export interface Ns4E5GateResult { ok: boolean; issues: Ns4E5GateIssue[]; }
export interface Ns4E5Sources { module: Ns4ModuleArtifact; journeys: Ns4E2Review; access: Ns4E3Review; ontology: Ns4E4Review; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;

export function collectNs4ReferencedRuleIds(sources: Ns4E5Sources): string[] {
  return [...new Set([
    ...sources.journeys.journeys.flatMap(journey => journey.business.useRules),
    ...sources.access.grants.flatMap(grant => grant.useRules),
    ...sources.ontology.entities.flatMap(entity => entity.useRules),
  ])].sort();
}

export function validateNs4E5Review(review: Ns4E5Review, sources: Ns4E5Sources): Ns4E5GateResult {
  const issues: Ns4E5GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (review.moduleName !== sources.module.module.moduleName) add('NS4_E5_MODULE', 'moduleName', 'Must match the approved module.');
  const ruleIds = new Set<string>();
  review.rules.forEach((rule, index) => {
    const path = `rules[${index}]`;
    if (!MEMBER_ID.test(rule.id)) add('NS4_E5_RULE_ID', `${path}.id`, 'Must be a lower-camel id.');
    if (ruleIds.has(rule.id)) add('NS4_E5_RULE_DUPLICATE', `${path}.id`, `Duplicate rule ${rule.id}.`);
    if (rule.id) ruleIds.add(rule.id);
    if (!rule.description) add('NS4_E5_RULE_DESCRIPTION', `${path}.description`, 'Business description is required.');
  });

  for (const ruleId of collectNs4ReferencedRuleIds(sources)) {
    if (!ruleIds.has(ruleId)) add('NS4_E5_RULE_REFERENCE_MISSING', 'rules', `Referenced rule ${ruleId} has no description.`);
  }
  return { ok: issues.length === 0, issues };
}
