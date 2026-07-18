/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/gate.ts" enhancement="_blank"/>

import {
  NsGateCheck,
  NsGateIssue,
  errorIssue,
  warningIssue,
} from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  collectDuplicateIds,
  normalizeModuleFolderName,
  normalizeNsId,
  uniqueNsId,
} from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

export const E2_JOURNEYS_SCHEMA_VERSION = '2026-07-06-ns-e2-v1';

export type NsE2Priority = 'now' | 'soon' | 'later' | 'never';
export type NsE2DecisionKind = 'actorRemoved' | 'featurePriority' | 'scopeChange' | 'other';

export interface NsE2Actor {
  actorId: string;
  name: string;
  description?: string;
}

export interface NsE2JourneyStep {
  stepId: string;
  title: string;
  intent: string;
  result?: string;
  featureRefs: string[];
}

export interface NsE2Journey {
  journeyId: string;
  actorId: string;
  title: string;
  goal: string;
  soThat?: string;
  trigger?: string;
  steps: NsE2JourneyStep[];
  outcome: string;
  businessRules: string[];
  notes: string;
}

export interface NsE2Feature {
  featureId: string;
  title: string;
  description?: string;
  priority: NsE2Priority;
  actorIds: string[];
  rationale?: string;
}

export interface NsE2Decision {
  decisionId: string;
  kind: NsE2DecisionKind;
  summary: string;
  target?: string;
}

export interface NsE2JourneysArtifact {
  schemaVersion: typeof E2_JOURNEYS_SCHEMA_VERSION;
  moduleName: string;
  moduleTitle: string;
  userLanguage: string;
  version: number;
  actors: NsE2Actor[];
  journeys: NsE2Journey[];
  features: NsE2Feature[];
  decisions: NsE2Decision[];
  createdAt: string;
}

export interface E2GateOptions {
  e1ActorIds?: Iterable<string>;
}

export interface E2MarkdownAuditOptions {
  previous?: NsE2JourneysArtifact | null;
  adjustment?: string;
  retryContext?: string;
  generatedAt?: string;
}

const PRIORITIES: readonly NsE2Priority[] = ['now', 'soon', 'later', 'never'];
const DECISION_KINDS: readonly NsE2DecisionKind[] = ['actorRemoved', 'featurePriority', 'scopeChange', 'other'];

export function prepareE2JourneysArtifact(input: unknown, options: E2GateOptions = {}): NsE2JourneysArtifact {
  const record = asRecord(input, 'artifact');
  const usedActors = new Set<string>();
  const usedJourneys = new Set<string>();
  const usedFeatures = new Set<string>();
  const usedDecisions = new Set<string>();

  const actors = readArray(record.actors).map((item, index) => {
    const actor = asRecord(item, `actors[${index}]`);
    const name = readString(actor.name) || readString(actor.actorId) || `Actor ${index + 1}`;
    const normalized: NsE2Actor = {
      actorId: uniqueNsId(actor.actorId || name, usedActors, `actor${index + 1}`),
      name,
    };
    const description = readString(actor.description);
    if (description) normalized.description = description;
    return normalized;
  });

  const features = readArray(record.features).map((item, index) => {
    const feature = asRecord(item, `features[${index}]`);
    const title = readString(feature.title) || readString(feature.featureId) || `Feature ${index + 1}`;
    const normalized: NsE2Feature = {
      featureId: uniqueNsId(feature.featureId || title, usedFeatures, `feature${index + 1}`),
      title,
      priority: normalizePriority(feature.priority),
      actorIds: readArray(feature.actorIds).map(actor => normalizeNsId(actor, 'actor')).filter(Boolean),
    };
    const description = readString(feature.description);
    if (description) normalized.description = description;
    const rationale = readString(feature.rationale);
    if (rationale) normalized.rationale = rationale;
    return normalized;
  });

  const journeys = readArray(record.journeys).map((item, index) => {
    const journey = asRecord(item, `journeys[${index}]`);
    const usedSteps = new Set<string>();
    const title = readString(journey.title) || `Journey ${index + 1}`;
    const steps = readArray(journey.steps).map((rawStep, stepIndex) => {
      const step = asRecord(rawStep, `journeys[${index}].steps[${stepIndex}]`);
      const stepTitle = readString(step.title) || `Step ${stepIndex + 1}`;
      const normalizedStep: NsE2JourneyStep = {
        stepId: uniqueNsId(step.stepId || stepTitle, usedSteps, `step${stepIndex + 1}`),
        title: stepTitle,
        intent: readString(step.intent) || stepTitle,
        featureRefs: readArray(step.featureRefs).map(ref => normalizeNsId(ref, 'feature')).filter(Boolean),
      };
      const result = readString(step.result);
      if (result) normalizedStep.result = result;
      return normalizedStep;
    });
    const normalized: NsE2Journey = {
      journeyId: uniqueNsId(journey.journeyId || title, usedJourneys, `journey${index + 1}`),
      actorId: normalizeNsId(journey.actorId, 'actor'),
      title,
      goal: readString(journey.goal) || 'Goal not described.',
      steps,
      outcome: readString(journey.outcome) || 'Outcome not described.',
      businessRules: readArray(journey.businessRules).map(rule => readString(rule)).filter((rule): rule is string => !!rule),
      notes: readString(journey.notes) || '',
    };
    const soThat = readString(journey.soThat);
    if (soThat) normalized.soThat = soThat;
    const trigger = readString(journey.trigger);
    if (trigger) normalized.trigger = trigger;
    return normalized;
  });

  const decisions = readArray(record.decisions).map((item, index) => {
    const decision = asRecord(item, `decisions[${index}]`);
    const normalized: NsE2Decision = {
      decisionId: uniqueNsId(decision.decisionId || decision.summary, usedDecisions, `decision${index + 1}`),
      kind: normalizeDecisionKind(decision.kind),
      summary: readString(decision.summary) || 'Decision not described.',
    };
    const target = readString(decision.target);
    if (target) normalized.target = target;
    return normalized;
  });

  return {
    schemaVersion: E2_JOURNEYS_SCHEMA_VERSION,
    moduleName: normalizeModuleFolderName(record.moduleName),
    moduleTitle: readString(record.moduleTitle) || humanizeModuleName(normalizeModuleFolderName(record.moduleName)),
    userLanguage: readString(record.userLanguage) || 'en',
    version: normalizeVersion(record.version),
    actors,
    journeys,
    features,
    decisions,
    createdAt: readString(record.createdAt) || new Date().toISOString(),
  };
}

export function validateE2JourneysInvariants(
  artifact: NsE2JourneysArtifact,
  options: E2GateOptions = {},
): NsGateCheck<NsE2JourneysArtifact> {
  const issues: NsGateIssue[] = [];

  const normalizedModuleName = normalizeModuleFolderName(artifact.moduleName);
  if (artifact.moduleName !== normalizedModuleName) {
    issues.push(errorIssue('module_name_not_normalized', `moduleName must be ${normalizedModuleName}`, 'moduleName'));
  }

  const duplicateActors = collectDuplicateIds(artifact.actors.map(actor => actor.actorId));
  if (duplicateActors.length > 0) issues.push(errorIssue('duplicate_actor_ids', `duplicated actors: ${duplicateActors.join(', ')}`, 'actors'));

  const duplicateJourneys = collectDuplicateIds(artifact.journeys.map(journey => journey.journeyId));
  if (duplicateJourneys.length > 0) issues.push(errorIssue('duplicate_journey_ids', `duplicated journeys: ${duplicateJourneys.join(', ')}`, 'journeys'));

  const duplicateFeatures = collectDuplicateIds(artifact.features.map(feature => feature.featureId));
  if (duplicateFeatures.length > 0) issues.push(errorIssue('duplicate_feature_ids', `duplicated features: ${duplicateFeatures.join(', ')}`, 'features'));

  const actorIds = new Set(artifact.actors.map(actor => actor.actorId));
  const featureIds = new Set(artifact.features.map(feature => feature.featureId));

  const referencedFeatures = new Set<string>();
  artifact.journeys.forEach((journey, index) => {
    if (!actorIds.has(journey.actorId)) {
      issues.push(errorIssue('unknown_journey_actor', `journey ${journey.journeyId} references unknown actor ${journey.actorId}`, `journeys[${index}].actorId`));
    }
    const duplicateSteps = collectDuplicateIds(journey.steps.map(step => step.stepId));
    if (duplicateSteps.length > 0) issues.push(errorIssue('duplicate_step_ids', `journey ${journey.journeyId} has duplicated steps: ${duplicateSteps.join(', ')}`, `journeys[${index}].steps`));
    journey.steps.forEach((step, stepIndex) => {
      step.featureRefs.forEach(ref => {
        referencedFeatures.add(ref);
        if (!featureIds.has(ref)) {
          issues.push(errorIssue('dangling_feature_ref', `journey ${journey.journeyId} step ${step.stepId} references unknown feature ${ref}`, `journeys[${index}].steps[${stepIndex}].featureRefs`));
        }
      });
    });
  });

  const journeyActorIds = new Set(artifact.journeys.map(journey => journey.actorId));
  artifact.actors.forEach((actor, index) => {
    if (!journeyActorIds.has(actor.actorId)) {
      issues.push(errorIssue('actor_without_journey', `actor ${actor.actorId} has no journey`, `actors[${index}]`));
    }
  });

  artifact.features.forEach((feature, index) => {
    if (!PRIORITIES.includes(feature.priority)) {
      issues.push(errorIssue('feature_priority', `feature ${feature.featureId} must have a priority (now|soon|later|never)`, `features[${index}].priority`));
    }
    if (!referencedFeatures.has(feature.featureId)) {
      issues.push(errorIssue('unreferenced_feature', `feature ${feature.featureId} is not referenced by any journey step`, `features[${index}]`));
    }
  });

  const removedActors = new Set(
    artifact.decisions.filter(decision => decision.kind === 'actorRemoved').map(decision => normalizeNsId(decision.target, 'actor')),
  );
  for (const e1ActorId of Array.from(options.e1ActorIds || []).map(id => normalizeNsId(id, 'actor'))) {
    if (!actorIds.has(e1ActorId) && !removedActors.has(e1ActorId)) {
      issues.push(errorIssue('missing_e1_actor', `E1 actor ${e1ActorId} is missing; keep it or record an actorRemoved decision`, 'actors'));
    }
  }

  if (artifact.journeys.length === 0) issues.push(warningIssue('empty_journeys', 'no journeys were produced', 'journeys'));

  return { artifact, issues, needsHumanInput: false };
}

export function renderE2JourneysMarkdown(artifact: NsE2JourneysArtifact, options: E2MarkdownAuditOptions = {}): string {
  const previous = options.previous || null;
  const changes = previous ? describeE2Changes(previous, artifact) : [
    `Initial E2 version created with ${artifact.actors.length} actor(s), ${artifact.journeys.length} journey(ies), and ${artifact.features.length} feature(s).`,
  ];
  const lines: string[] = [
    `# ${artifact.moduleTitle} - E2 Journey Audit`,
    '',
    `Module: \`${artifact.moduleName}\``,
    `Language: ${artifact.userLanguage}`,
    `Version: v${artifact.version}`,
    `Generated at: ${options.generatedAt || artifact.createdAt}`,
    '',
    '## Source of Truth',
    '- Full structured artifact: `e2-journeys.json`',
    '- This markdown is an audit summary, not a duplicate copy of the journey catalog.',
    '',
    '## Current Snapshot',
    `- Actors: ${artifact.actors.length}`,
    `- Journeys: ${artifact.journeys.length}`,
    `- Features: ${artifact.features.length}`,
    `- Feature priorities: ${renderPriorityCounts(artifact)}`,
  ];

  if (options.adjustment || options.retryContext) {
    lines.push('', '## Review Input');
    if (options.adjustment) lines.push(`- Adjustment request: ${options.adjustment}`);
    if (options.retryContext) lines.push(`- Gate retry context: ${singleLine(options.retryContext)}`);
  }

  lines.push('', '## Changes');
  changes.forEach(change => lines.push(`- ${change}`));

  if (artifact.decisions.length) {
    lines.push('', '## Recorded Decisions');
    artifact.decisions.forEach(decision => lines.push(`- [${decision.kind}] ${decision.summary}${decision.target ? ` (${decision.target})` : ''}`));
  }

  lines.push('', '## Audit Note');
  lines.push('- Human review should use the widget or the JSON artifact for the full journey content.');
  lines.push('- Future adjustment loops should append request/result events and promote only approved versions.');

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function describeE2Changes(previous: NsE2JourneysArtifact, next: NsE2JourneysArtifact): string[] {
  const changes: string[] = [];
  changes.push(...describeCollectionChanges('Actor', previous.actors, next.actors, actor => actor.actorId, actor => actor.name));
  changes.push(...describeCollectionChanges('Journey', previous.journeys, next.journeys, journey => journey.journeyId, journey => journey.title));
  changes.push(...describeCollectionChanges('Feature', previous.features, next.features, feature => feature.featureId, feature => feature.title));

  const previousFeatures = new Map(previous.features.map(feature => [feature.featureId, feature]));
  next.features.forEach(feature => {
    const old = previousFeatures.get(feature.featureId);
    if (!old) return;
    if (old.priority !== feature.priority) changes.push(`Feature priority changed: ${feature.title} (${old.priority} -> ${feature.priority}).`);
    if (old.title !== feature.title) changes.push(`Feature title changed: ${old.title} -> ${feature.title}.`);
  });

  const previousJourneys = new Map(previous.journeys.map(journey => [journey.journeyId, journey]));
  next.journeys.forEach(journey => {
    const old = previousJourneys.get(journey.journeyId);
    if (!old) return;
    if (old.title !== journey.title) changes.push(`Journey title changed: ${old.title} -> ${journey.title}.`);
    if (old.steps.length !== journey.steps.length) changes.push(`Journey step count changed: ${journey.title} (${old.steps.length} -> ${journey.steps.length}).`);
    if (!sameStringArray(old.businessRules, journey.businessRules)) changes.push(`Business rules changed: ${journey.title}.`);
    if ((old.notes || '') !== (journey.notes || '')) changes.push(`Notes changed: ${journey.title}.`);
  });

  if (changes.length === 0) changes.push('No structural changes detected against the previous version.');
  return changes;
}

function describeCollectionChanges<T>(
  label: string,
  previous: readonly T[],
  next: readonly T[],
  getId: (value: T) => string,
  getTitle: (value: T) => string,
): string[] {
  const changes: string[] = [];
  const previousById = new Map(previous.map(item => [getId(item), item]));
  const nextById = new Map(next.map(item => [getId(item), item]));
  nextById.forEach((item, id) => {
    if (!previousById.has(id)) changes.push(`${label} added: ${getTitle(item)} (\`${id}\`).`);
  });
  previousById.forEach((item, id) => {
    if (!nextById.has(id)) changes.push(`${label} removed: ${getTitle(item)} (\`${id}\`).`);
  });
  return changes;
}

function renderPriorityCounts(artifact: NsE2JourneysArtifact): string {
  return PRIORITIES.map(priority => `${priority}=${artifact.features.filter(feature => feature.priority === priority).length}`).join(', ');
}

function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePriority(value: unknown): NsE2Priority {
  return PRIORITIES.includes(value as NsE2Priority) ? value as NsE2Priority : 'later';
}

function normalizeDecisionKind(value: unknown): NsE2DecisionKind {
  return DECISION_KINDS.includes(value as NsE2DecisionKind) ? value as NsE2DecisionKind : 'other';
}

function normalizeVersion(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 ? value : 1;
}

function asRecord(value: unknown, path: string, allowEmpty = false): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as Record<string, unknown>;
  if (allowEmpty) return {};
  throw new Error(`${path} must be an object`);
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function humanizeModuleName(moduleName: string): string {
  const spaced = moduleName.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.slice(0, 1).toUpperCase() + spaced.slice(1);
}
