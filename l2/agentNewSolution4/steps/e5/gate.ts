/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/gate.ts" enhancement="_blank"/>

import { Ns4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { Ns4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { Ns4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { Ns4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import {
  assembleNs4E5Review,
  Ns4E5PlanDraft,
  Ns4E5Review,
  Ns4E5RuleDraft,
  Ns4RuleDefinition,
  Ns4RulePlanItem,
} from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';

export interface Ns4E5GateIssue { code: string; path: string; message: string; }
export interface Ns4E5GateResult { ok: boolean; issues: Ns4E5GateIssue[]; }
export interface Ns4E5Sources { module: Ns4ModuleArtifact; journeys: Ns4E2Review; access: Ns4E3Review; ontology: Ns4E4Review; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const ERROR_CODE = /^[A-Z][A-Z0-9_]*$/;

export function ns4JourneyRuleSourceRef(journeyId: string, ruleId: string): string {
  return `journey:${journeyId}:rule:${ruleId}`;
}
export function ns4OntologyInvariantSourceRef(entityId: string, invariantId: string): string {
  return `ontology:${entityId}:invariant:${invariantId}`;
}
export function ns4AccessConstraintSourceRef(profileRef: string, authorityRef: string, index: number): string {
  return `access:${profileRef}:${authorityRef}:constraint:${index + 1}`;
}

export function validateNs4E5Review(review: Ns4E5Review, sources: Ns4E5Sources): Ns4E5GateResult {
  const issues: Ns4E5GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (review.moduleName !== sources.module.module.moduleName) add('NS4_E5_MODULE', 'moduleName', 'Must match the approved module.');
  if (!review.rules.length) add('NS4_E5_RULES_EMPTY', 'rules', 'At least one enforceable rule is required.');

  const entityIds = new Set(sources.ontology.entities.map(entity => entity.entityId));
  const fieldRefs = new Set(sources.ontology.entities.flatMap(entity => entity.fields.map(field => `${entity.entityId}.${field.fieldId}`)));
  const relationshipIds = new Set(sources.ontology.relationships.map(item => item.relationshipId));
  const journeyIds = new Set(sources.journeys.journeys.map(item => item.journeyId));
  const journeyStepRefs = new Set(sources.journeys.journeys.flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`)));
  const actorRefs = new Set([
    ...sources.module.businessScope.actors.map(actor => actor.actorId),
    ...sources.journeys.journeys.map(journey => journey.business.actorRef),
  ]);
  const authorityRefs = new Set(sources.access.authorities.map(item => item.authorityRef));
  const lifecycleEntities = new Set(sources.ontology.entities.filter(entity => entity.lifecycleStates.length).map(entity => entity.entityId));
  const expectedSources = new Set<string>([
    ...sources.journeys.journeys.flatMap(journey => journey.business.businessRules
      .map(rule => ns4JourneyRuleSourceRef(journey.journeyId, rule.journeyRuleId))),
    ...sources.ontology.entities.flatMap(entity => entity.invariants
      .map(invariant => ns4OntologyInvariantSourceRef(entity.entityId, invariant.invariantId))),
    ...sources.access.grants.flatMap(grant => grant.constraints
      .map((_, index) => ns4AccessConstraintSourceRef(grant.profileRef, grant.authorityRef, index))),
    ...sources.module.declaredConstraints.mandatoryIntegrations
      .map(dependency => `module:integration:${dependency.dependencyId}`),
    ...(sources.module.declaredConstraints.regulatoryNotes ? ['module:regulatoryNotes'] : []),
    ...(sources.module.declaredConstraints.criticalNotes ? ['module:criticalNotes'] : []),
  ]);

  const ruleIds = new Set<string>();
  review.rules.forEach((rule, index) => {
    const path = `rules[${index}]`;
    if (!MEMBER_ID.test(rule.ruleId)) add('NS4_E5_RULE_ID', `${path}.ruleId`, 'Must be a unique lower-camel id.');
    if (ruleIds.has(rule.ruleId)) add('NS4_E5_RULE_DUPLICATE', `${path}.ruleId`, `Duplicate rule ${rule.ruleId}.`);
    ruleIds.add(rule.ruleId);
    if (!rule.title || !rule.statement) add('NS4_E5_RULE_TEXT', path, 'Title and business statement are required.');
    if (!rule.condition.expression || !rule.condition.facts.length) add('NS4_E5_CONDITION', `${path}.condition`, 'An explicit expression and named facts are required.');
    validateRefs(rule.scope.entityRefs, entityIds, `${path}.scope.entityRefs`, add);
    validateRefs(rule.scope.fieldRefs, fieldRefs, `${path}.scope.fieldRefs`, add);
    validateRefs(rule.scope.relationshipRefs, relationshipIds, `${path}.scope.relationshipRefs`, add);
    validateRefs(rule.scope.journeyRefs, journeyIds, `${path}.scope.journeyRefs`, add);
    validateRefs(rule.scope.journeyStepRefs, journeyStepRefs, `${path}.scope.journeyStepRefs`, add);
    validateRefs(rule.scope.actorRefs, actorRefs, `${path}.scope.actorRefs`, add);
    validateRefs(rule.scope.authorityRefs, authorityRefs, `${path}.scope.authorityRefs`, add);
    if (!rule.sourceRefs.length) add('NS4_E5_SOURCE_EMPTY', `${path}.sourceRefs`, 'Every rule must cite an approved source.');
    for (const sourceRef of rule.sourceRefs) {
      if (!expectedSources.has(sourceRef)) add('NS4_E5_SOURCE_UNKNOWN', `${path}.sourceRefs`, `Unknown or invented source ${sourceRef}.`);
    }
    if (rule.criticality === 'blocking' && !rule.enforcement.backend.required) {
      add('NS4_E5_BACKEND_REQUIRED', `${path}.enforcement.backend.required`, 'Blocking rules must be enforced by the backend.');
    }
    if (rule.enforcement.backend.effect === 'reject' && !ERROR_CODE.test(rule.enforcement.backend.errorCode || '')) {
      add('NS4_E5_ERROR_CODE', `${path}.enforcement.backend.errorCode`, 'Reject rules require a stable UPPER_SNAKE error code.');
    }
    if ((rule.kind === 'authorization' || rule.kind === 'visibility') && !rule.scope.authorityRefs.length) {
      add('NS4_E5_AUTHORITY', `${path}.scope.authorityRefs`, 'Authorization and visibility rules must cite collab-auth authorities.');
    }
    if (rule.kind === 'transitionGuard' && !rule.scope.entityRefs.some(entityId => lifecycleEntities.has(entityId))) {
      add('NS4_E5_LIFECYCLE', `${path}.scope.entityRefs`, 'Transition guards must reference an entity with lifecycle states.');
    }
    if (!rule.acceptanceCases.length) add('NS4_E5_CASES_EMPTY', `${path}.acceptanceCases`, 'At least one executable acceptance case is required.');
    const caseIds = new Set<string>();
    for (const [caseIndex, testCase] of rule.acceptanceCases.entries()) {
      const casePath = `${path}.acceptanceCases[${caseIndex}]`;
      if (!MEMBER_ID.test(testCase.caseId) || caseIds.has(testCase.caseId)) add('NS4_E5_CASE_ID', `${casePath}.caseId`, 'Must be a unique lower-camel id inside the rule.');
      caseIds.add(testCase.caseId);
      if (!testCase.given.length || !testCase.when || !testCase.then) add('NS4_E5_CASE_TEXT', casePath, 'Given, when and then are required.');
    }
    if (rule.enforcement.backend.effect === 'reject') {
      if (!rule.acceptanceCases.some(testCase => testCase.expected === 'accept')) add('NS4_E5_POSITIVE_CASE', `${path}.acceptanceCases`, 'Reject rules require a positive acceptance case.');
      if (!rule.acceptanceCases.some(testCase => testCase.expected === 'reject')) add('NS4_E5_NEGATIVE_CASE', `${path}.acceptanceCases`, 'Reject rules require a negative rejection case.');
    }
  });

  const coverageSources = new Set(review.coverage.map(item => item.sourceRef));
  for (const sourceRef of expectedSources) {
    if (!coverageSources.has(sourceRef)) add('NS4_E5_COVERAGE', 'coverage', `Missing disposition for ${sourceRef}.`);
  }
  review.coverage.forEach((coverage, index) => {
    const path = `coverage[${index}]`;
    if (!coverage.sourceRef || !coverage.targetRef) add('NS4_E5_COVERAGE_REF', path, 'sourceRef and targetRef are required.');
    if (coverage.disposition === 'compiled' && !ruleIds.has(coverage.targetRef)) add('NS4_E5_COVERAGE_TARGET', `${path}.targetRef`, `Unknown rule ${coverage.targetRef}.`);
    if (coverage.disposition === 'routed' && !review.routedStatements.some(route => route.sourceRef === coverage.sourceRef)) {
      add('NS4_E5_ROUTE_MISSING', path, `Routed source ${coverage.sourceRef} needs a routedStatements entry.`);
    }
  });
  review.routedStatements.forEach((route, index) => {
    if (!route.sourceRef || !route.statement || !route.reason) add('NS4_E5_ROUTE_TEXT', `routedStatements[${index}]`, 'Source, statement and routing reason are required.');
    if (route.sourceRef && !expectedSources.has(route.sourceRef)) add('NS4_E5_ROUTE_SOURCE', `routedStatements[${index}].sourceRef`, `Unknown or invented source ${route.sourceRef}.`);
    if (route.destination === 'e5-rule' && (!route.ruleRef || !ruleIds.has(route.ruleRef))) add('NS4_E5_ROUTE_RULE', `routedStatements[${index}].ruleRef`, 'E5 destinations must reference an existing rule.');
  });
  return { ok: issues.length === 0, issues };
}

export function validateNs4E5Plan(plan: Ns4E5PlanDraft, sources: Ns4E5Sources): Ns4E5GateResult {
  const details: Ns4E5RuleDraft[] = plan.rulePlans.map(rulePlan => ({
    planId: 'e5-rule-detail', moduleName: plan.moduleName, reviewRound: plan.reviewRound,
    ruleId: rulePlan.ruleId, rule: placeholderRule(rulePlan),
  }));
  const gate = validateNs4E5Review(assembleNs4E5Review(plan, details), sources);
  const issues = [...gate.issues];
  const gapIds = new Set<string>();
  plan.upstreamGaps.forEach((gap, index) => {
    if (!MEMBER_ID.test(gap.gapId) || gapIds.has(gap.gapId)) {
      issues.push({ code: 'NS4_E5_UPSTREAM_GAP_ID', path: `upstreamGaps[${index}].gapId`, message: 'Must be a unique lower-camel id.' });
    }
    gapIds.add(gap.gapId);
    if (!gap.sourceRefs.length || !gap.missingContract || !gap.reason) {
      issues.push({ code: 'NS4_E5_UPSTREAM_GAP_TEXT', path: `upstreamGaps[${index}]`, message: 'Gap evidence, missing contract and reason are required.' });
    }
  });
  return { ok: issues.length === 0, issues };
}

export function validateNs4E5RuleDraft(
  plan: Ns4E5PlanDraft,
  detail: Ns4E5RuleDraft,
  sources: Ns4E5Sources,
): Ns4E5GateResult {
  const issues: Ns4E5GateIssue[] = [];
  const expected = plan.rulePlans.find(rule => rule.ruleId === detail.ruleId);
  if (detail.moduleName !== plan.moduleName) issues.push({ code: 'NS4_E5_RULE_MODULE', path: 'moduleName', message: `Expected ${plan.moduleName}.` });
  if (detail.reviewRound !== plan.reviewRound) issues.push({ code: 'NS4_E5_RULE_ROUND', path: 'reviewRound', message: `Expected ${plan.reviewRound}.` });
  if (!expected) issues.push({ code: 'NS4_E5_RULE_UNKNOWN', path: 'ruleId', message: `Unknown planned rule ${detail.ruleId}.` });
  if (expected && JSON.stringify(rulePlanOf(detail.rule)) !== JSON.stringify(expected)) {
    issues.push({
      code: 'NS4_E5_RULE_PLAN_CHANGED', path: 'rule',
      message: 'Rule detail cannot change identity, classification, scope or source grouping frozen by the plan.',
    });
  }
  if (issues.length) return { ok: false, issues };
  const details = plan.rulePlans.map(rulePlan => ({
    planId: 'e5-rule-detail' as const, moduleName: plan.moduleName, reviewRound: plan.reviewRound,
    ruleId: rulePlan.ruleId,
    rule: rulePlan.ruleId === detail.ruleId ? detail.rule : placeholderRule(rulePlan),
  }));
  return validateNs4E5Review(assembleNs4E5Review(plan, details), sources);
}

function rulePlanOf(rule: Ns4RuleDefinition): Ns4RulePlanItem {
  const { trigger, condition, enforcement, acceptanceCases, ...plan } = rule;
  return plan;
}

function placeholderRule(plan: Ns4RulePlanItem): Ns4RuleDefinition {
  return {
    ...plan,
    trigger: { type: 'create', description: 'Detail pass pending.' },
    condition: { expression: 'planned rule detail is pending', facts: ['planned rule'] },
    enforcement: {
      backend: { required: true, effect: 'filter' },
      frontend: { behavior: 'none' },
    },
    acceptanceCases: [{
      caseId: 'plannedRulePlaceholder', given: ['The rule plan is valid'],
      when: 'The parallel detail pass runs', then: 'The placeholder is replaced', expected: 'filter',
    }],
  };
}

function validateRefs(values: string[], allowed: Set<string>, path: string, add: (code: string, path: string, message: string) => void): void {
  for (const value of values) if (!allowed.has(value)) add('NS4_E5_UNKNOWN_REF', path, `Unknown approved reference ${value}.`);
}
