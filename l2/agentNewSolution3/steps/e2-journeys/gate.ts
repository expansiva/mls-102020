/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.ts" enhancement="_blank"/>

import {
  Ns3GateCheck,
  Ns3GateIssue,
  errorIssue,
  warningIssue,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  collectDuplicateIds,
  normalizeModuleFolderName,
  normalizeNs3Id,
  uniqueNs3Id,
} from '/_102020_/l2/agentNewSolution3/helpers/ns3Ids.js';

export const E2_JOURNEYS_SCHEMA_VERSION = '2026-07-06-ns3-e2-v1';

export type Ns3E2Priority = 'now' | 'soon' | 'later' | 'never';
export type Ns3E2DecisionKind = 'actorRemoved' | 'featurePriority' | 'scopeChange' | 'other';

export interface Ns3E2Actor {
  actorId: string;
  name: string;
  description?: string;
}

export interface Ns3E2JourneyStep {
  stepId: string;
  title: string;
  intent: string;
  result?: string;
  featureRefs: string[];
}

export interface Ns3E2Journey {
  journeyId: string;
  actorId: string;
  title: string;
  goal: string;
  soThat?: string;
  trigger?: string;
  steps: Ns3E2JourneyStep[];
  outcome: string;
  businessRules: string[];
  notes: string;
}

export interface Ns3E2Feature {
  featureId: string;
  title: string;
  description?: string;
  priority: Ns3E2Priority;
  actorIds: string[];
  rationale?: string;
}

export interface Ns3E2Decision {
  decisionId: string;
  kind: Ns3E2DecisionKind;
  summary: string;
  target?: string;
}

export interface Ns3E2JourneysArtifact {
  schemaVersion: typeof E2_JOURNEYS_SCHEMA_VERSION;
  moduleName: string;
  moduleTitle: string;
  userLanguage: string;
  version: number;
  actors: Ns3E2Actor[];
  journeys: Ns3E2Journey[];
  features: Ns3E2Feature[];
  decisions: Ns3E2Decision[];
  createdAt: string;
}

export interface E2GateOptions {
  e1ActorIds?: Iterable<string>;
}

const PRIORITIES: readonly Ns3E2Priority[] = ['now', 'soon', 'later', 'never'];
const DECISION_KINDS: readonly Ns3E2DecisionKind[] = ['actorRemoved', 'featurePriority', 'scopeChange', 'other'];

export function prepareE2JourneysArtifact(input: unknown, options: E2GateOptions = {}): Ns3E2JourneysArtifact {
  const record = asRecord(input, 'artifact');
  const usedActors = new Set<string>();
  const usedJourneys = new Set<string>();
  const usedFeatures = new Set<string>();
  const usedDecisions = new Set<string>();

  const actors = readArray(record.actors).map((item, index) => {
    const actor = asRecord(item, `actors[${index}]`);
    const name = readString(actor.name) || readString(actor.actorId) || `Actor ${index + 1}`;
    const normalized: Ns3E2Actor = {
      actorId: uniqueNs3Id(actor.actorId || name, usedActors, `actor${index + 1}`),
      name,
    };
    const description = readString(actor.description);
    if (description) normalized.description = description;
    return normalized;
  });

  const features = readArray(record.features).map((item, index) => {
    const feature = asRecord(item, `features[${index}]`);
    const title = readString(feature.title) || readString(feature.featureId) || `Feature ${index + 1}`;
    const normalized: Ns3E2Feature = {
      featureId: uniqueNs3Id(feature.featureId || title, usedFeatures, `feature${index + 1}`),
      title,
      priority: normalizePriority(feature.priority),
      actorIds: readArray(feature.actorIds).map(actor => normalizeNs3Id(actor, 'actor')).filter(Boolean),
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
      const normalizedStep: Ns3E2JourneyStep = {
        stepId: uniqueNs3Id(step.stepId || stepTitle, usedSteps, `step${stepIndex + 1}`),
        title: stepTitle,
        intent: readString(step.intent) || stepTitle,
        featureRefs: readArray(step.featureRefs).map(ref => normalizeNs3Id(ref, 'feature')).filter(Boolean),
      };
      const result = readString(step.result);
      if (result) normalizedStep.result = result;
      return normalizedStep;
    });
    const normalized: Ns3E2Journey = {
      journeyId: uniqueNs3Id(journey.journeyId || title, usedJourneys, `journey${index + 1}`),
      actorId: normalizeNs3Id(journey.actorId, 'actor'),
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
    const normalized: Ns3E2Decision = {
      decisionId: uniqueNs3Id(decision.decisionId || decision.summary, usedDecisions, `decision${index + 1}`),
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
  artifact: Ns3E2JourneysArtifact,
  options: E2GateOptions = {},
): Ns3GateCheck<Ns3E2JourneysArtifact> {
  const issues: Ns3GateIssue[] = [];

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
    artifact.decisions.filter(decision => decision.kind === 'actorRemoved').map(decision => normalizeNs3Id(decision.target, 'actor')),
  );
  for (const e1ActorId of Array.from(options.e1ActorIds || []).map(id => normalizeNs3Id(id, 'actor'))) {
    if (!actorIds.has(e1ActorId) && !removedActors.has(e1ActorId)) {
      issues.push(errorIssue('missing_e1_actor', `E1 actor ${e1ActorId} is missing; keep it or record an actorRemoved decision`, 'actors'));
    }
  }

  if (artifact.journeys.length === 0) issues.push(warningIssue('empty_journeys', 'no journeys were produced', 'journeys'));

  return { artifact, issues, needsHumanInput: false };
}

export function renderE2JourneysMarkdown(artifact: Ns3E2JourneysArtifact): string {
  const featureById = new Map(artifact.features.map(feature => [feature.featureId, feature]));
  const lines: string[] = [
    `# ${artifact.moduleTitle} - Journeys and Features`,
    '',
    `Module: \`${artifact.moduleName}\``,
    `Language: ${artifact.userLanguage}`,
    `Version: v${artifact.version}`,
    '',
    '## Journeys by Actor',
  ];

  for (const actor of artifact.actors) {
    const actorJourneys = artifact.journeys.filter(journey => journey.actorId === actor.actorId);
    lines.push('', `### ${actor.name} (\`${actor.actorId}\`)`);
    if (actor.description) lines.push(actor.description);
    if (actorJourneys.length === 0) {
      lines.push('- No journeys.');
      continue;
    }
    for (const journey of actorJourneys) {
      lines.push('', `#### ${journey.title} (\`${journey.journeyId}\`)`);
      lines.push(`- Goal: ${journey.goal}`);
      if (journey.soThat) lines.push(`- So that: ${journey.soThat}`);
      if (journey.trigger) lines.push(`- Trigger: ${journey.trigger}`);
      lines.push('- Steps:');
      journey.steps.forEach((step, index) => {
        const refs = step.featureRefs.map(ref => featureById.get(ref)?.title || ref).join(', ');
        lines.push(`  ${index + 1}. ${step.title} - ${step.intent}${refs ? ` _(features: ${refs})_` : ''}`);
      });
      lines.push(`- Outcome: ${journey.outcome}`);
      if (journey.businessRules.length) {
        lines.push('- Business rules:');
        journey.businessRules.forEach(rule => lines.push(`  - ${rule}`));
      }
      if (journey.notes) lines.push(`- Notes: ${journey.notes}`);
    }
  }

  lines.push('', '## Feature Catalog');
  for (const priority of PRIORITIES) {
    const featuresForPriority = artifact.features.filter(feature => feature.priority === priority);
    if (featuresForPriority.length === 0) continue;
    lines.push('', `### ${priority}`);
    featuresForPriority.forEach(feature => {
      const actors = feature.actorIds.join(', ');
      lines.push(`- ${feature.title} (\`${feature.featureId}\`)${feature.description ? `: ${feature.description}` : ''}${actors ? ` [${actors}]` : ''}`);
    });
  }

  if (artifact.decisions.length) {
    lines.push('', '## Decisions');
    artifact.decisions.forEach(decision => lines.push(`- [${decision.kind}] ${decision.summary}${decision.target ? ` (${decision.target})` : ''}`));
  }

  lines.push('');
  return `${lines.join('\n')}\n`;
}

function normalizePriority(value: unknown): Ns3E2Priority {
  return PRIORITIES.includes(value as Ns3E2Priority) ? value as Ns3E2Priority : 'later';
}

function normalizeDecisionKind(value: unknown): Ns3E2DecisionKind {
  return DECISION_KINDS.includes(value as Ns3E2DecisionKind) ? value as Ns3E2DecisionKind : 'other';
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
