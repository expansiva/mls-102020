/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e4-actors-rules/gate.ts" enhancement="_blank"/>

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { lowerFirst, toPascalCase } from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';

// isRecord is LOCAL — see e3-ontology/gate.ts (avoid the nsFs → libStor/libCommom DOM chain in node:test).
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export const E4_SCHEMA_VERSION = '2026-07-07-ns-e4-v1';

export const NS_RULE_LAYERS = ['domain', 'application'] as const;
export type NsRuleLayer = typeof NS_RULE_LAYERS[number];

export interface NsE4Actor {
  actorId: string;
  title: string;
  description: string;
  // Attached deterministically after the LLM call — never produced by the LLM.
  roleScope: string;
}

export interface NsE4Rule {
  ruleId: string;
  title: string;
  description: string;
  appliesTo: string[];
  layer: NsRuleLayer;
  // Verbatim copies of the E2 journey businessRules this rule absorbs.
  sourceJourneyRules: string[];
}

export interface NsE4ExternalRef {
  title: string;
  reason: string;
}

export interface NsE4ExternalRefs {
  mdm: NsE4ExternalRef[];
  horizontals: NsE4ExternalRef[];
  plugins: NsE4ExternalRef[];
  agents: NsE4ExternalRef[];
}

export interface NsE4Artifact {
  schemaVersion: typeof E4_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  createdAt: string;
  actors: NsE4Actor[];
  rules: NsE4Rule[];
  externalRefs: NsE4ExternalRefs;
}

export interface E4GateContext {
  moduleName: string;
  e2Actors: string[];
  e2BusinessRules: string[];
  entityIds: string[];
}

// ---------------------------------------------------------------------------
// prepare
// ---------------------------------------------------------------------------

export function prepareE4Artifact(input: unknown, context: { moduleName: string; userLanguage: string }): NsE4Artifact {
  const record = isRecord(input) ? input : {};
  const actors = Array.isArray(record.actors) ? record.actors.filter(isRecord) : [];
  const rules = Array.isArray(record.rules) ? record.rules.filter(isRecord) : [];
  const refs = isRecord(record.externalRefs) ? record.externalRefs : {};
  return {
    schemaVersion: E4_SCHEMA_VERSION,
    moduleName: readString(record.moduleName) || context.moduleName,
    userLanguage: readString(record.userLanguage) || context.userLanguage,
    createdAt: new Date().toISOString(),
    actors: actors.map(actor => {
      const actorId = lowerFirst(toPascalCase(readString(actor.actorId) || ''));
      return {
        actorId,
        title: readString(actor.title) || '',
        description: readString(actor.description) || '',
        // Deterministic attach: roleScope is NEVER taken from the LLM output.
        roleScope: `${context.moduleName}:${actorId}`,
      };
    }),
    rules: rules.map(rule => ({
      ruleId: lowerFirst(toPascalCase(readString(rule.ruleId) || '')),
      title: readString(rule.title) || '',
      description: readString(rule.description) || '',
      appliesTo: readStringArray(rule.appliesTo).map(toPascalCase),
      // Invalid layers pass through so the schema enum blocks them ('rule.layer.invalid' by schema).
      layer: (readString(rule.layer) || 'domain') as NsRuleLayer,
      sourceJourneyRules: readStringArray(rule.sourceJourneyRules),
    })),
    externalRefs: {
      mdm: readRefArray(refs.mdm),
      horizontals: readRefArray(refs.horizontals),
      plugins: readRefArray(refs.plugins),
      agents: readRefArray(refs.agents),
    },
  };
}

// ---------------------------------------------------------------------------
// invariants
// ---------------------------------------------------------------------------

export function validateE4Invariants(
  artifact: NsE4Artifact,
  context: E4GateContext,
): { artifact: NsE4Artifact; issues: NsGateIssue[] } {
  const issues: NsGateIssue[] = [];

  const actorIds = new Set<string>();
  for (const actor of artifact.actors) {
    if (actorIds.has(actor.actorId)) {
      issues.push(errorIssue('actor.id.duplicate', `duplicated actorId ${actor.actorId}`, actor.actorId));
    }
    actorIds.add(actor.actorId);
    if (actor.roleScope !== `${context.moduleName}:${actor.actorId}`) {
      issues.push(errorIssue('actor.roleScope.invalid', `actor ${actor.actorId}: roleScope must be "${context.moduleName}:${actor.actorId}", got "${actor.roleScope}"`, actor.actorId));
    }
  }
  // Every E2 actor must be present in the roster; extra supporting actors are allowed.
  for (const e2ActorId of context.e2Actors) {
    if (!actorIds.has(e2ActorId)) {
      issues.push(errorIssue('actor.missing', `E2 actor ${e2ActorId} is missing from the roster`, e2ActorId));
    }
  }

  const knownEntityIds = new Set(context.entityIds);
  const knownJourneyRules = new Set(context.e2BusinessRules.map(rule => rule.trim()));
  const absorbedJourneyRules = new Set<string>();
  const ruleIds = new Set<string>();
  for (const rule of artifact.rules) {
    if (ruleIds.has(rule.ruleId)) {
      issues.push(errorIssue('rule.id.duplicate', `duplicated ruleId ${rule.ruleId}`, rule.ruleId));
    }
    ruleIds.add(rule.ruleId);
    for (const entityId of rule.appliesTo) {
      if (!knownEntityIds.has(entityId)) {
        issues.push(errorIssue('rule.appliesTo.unknown', `rule ${rule.ruleId}: appliesTo entity ${entityId} is not part of e3-model.json`, rule.ruleId));
      }
    }
    for (const sourceRule of rule.sourceJourneyRules) {
      const trimmed = sourceRule.trim();
      if (!knownJourneyRules.has(trimmed)) {
        issues.push(errorIssue('rule.sourceRule.unknown', `rule ${rule.ruleId}: sourceJourneyRules entry "${trimmed}" is not a verbatim E2 journey businessRule`, rule.ruleId));
      } else {
        absorbedJourneyRules.add(trimmed);
      }
    }
  }
  // Every E2 journey businessRule should be absorbed by a consolidated rule.
  for (const journeyRule of knownJourneyRules) {
    if (!absorbedJourneyRules.has(journeyRule)) {
      issues.push(warningIssue('journeyRule.unmapped', `E2 journey businessRule not absorbed by any rule: "${journeyRule}"`));
    }
  }

  return { artifact, issues };
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE4Markdown(artifact: NsE4Artifact, options: { generatedAt?: string } = {}): string {
  const lines: string[] = [];
  lines.push(`# E4 — Actors, rules and external refs: ${artifact.moduleName}`);
  lines.push('');
  lines.push(`- module: \`${artifact.moduleName}\``);
  lines.push(`- actors: ${artifact.actors.length} / rules: ${artifact.rules.length}`);
  if (options.generatedAt) lines.push(`- generatedAt: ${options.generatedAt}`);
  lines.push('');
  lines.push('## Actors');
  lines.push('');
  lines.push('| actorId | roleScope | title | description |');
  lines.push('| --- | --- | --- | --- |');
  for (const actor of artifact.actors) {
    lines.push(`| \`${actor.actorId}\` | \`${actor.roleScope}\` | ${actor.title} | ${actor.description} |`);
  }
  lines.push('');
  lines.push('## Rules');
  lines.push('');
  if (artifact.rules.length === 0) lines.push('(none)');
  for (const rule of artifact.rules) {
    lines.push(`### \`${rule.ruleId}\` (${rule.layer}) — ${rule.title}`);
    lines.push('');
    lines.push(rule.description);
    lines.push('');
    lines.push(`- appliesTo: ${rule.appliesTo.map(entityId => `\`${entityId}\``).join(', ')}`);
    if (rule.sourceJourneyRules.length > 0) {
      lines.push('- absorbs journey rules:');
      for (const sourceRule of rule.sourceJourneyRules) {
        lines.push(`  - "${sourceRule}"`);
      }
    }
    lines.push('');
  }
  lines.push('## External refs');
  lines.push('');
  const groups: Array<[string, NsE4ExternalRef[]]> = [
    ['mdm', artifact.externalRefs.mdm],
    ['horizontals', artifact.externalRefs.horizontals],
    ['plugins', artifact.externalRefs.plugins],
    ['agents', artifact.externalRefs.agents],
  ];
  for (const [group, refs] of groups) {
    lines.push(`### ${group}`);
    lines.push('');
    if (refs.length === 0) {
      lines.push('(none)');
    } else {
      for (const ref of refs) {
        lines.push(`- **${ref.title}** — ${ref.reason}`);
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// small utils
// ---------------------------------------------------------------------------

function readRefArray(value: unknown): NsE4ExternalRef[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map(ref => ({
    title: readString(ref.title) || '',
    reason: readString(ref.reason) || '',
  }));
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(item => readString(item)).filter((item): item is string => !!item)
    : [];
}
