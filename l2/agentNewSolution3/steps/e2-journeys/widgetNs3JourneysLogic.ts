/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/widgetNs3JourneysLogic.ts" enhancement="_blank"/>

import type {
  Ns3E2JourneysArtifact,
  Ns3E2Priority,
} from '/_102020_/l2/agentNewSolution3/steps/e2-journeys/gate.js';

export const NS3_E2_PRIORITIES: readonly Ns3E2Priority[] = ['now', 'soon', 'later', 'never'];

export type Ns3JourneysReviewAction = 'approve' | 'adjust';
export type Ns3JourneysWidgetChangeKind =
  | 'featurePriorityChanged'
  | 'journeyBusinessRulesChanged'
  | 'journeyNotesChanged'
  | 'reviewSubmitted';

export interface Ns3JourneysWidgetEdits {
  featurePriorities: Record<string, Ns3E2Priority>;
  journeyBusinessRules: Record<string, string[]>;
  journeyNotes: Record<string, string>;
}

export interface Ns3JourneysWidgetChangeRecord {
  id: string;
  at: string;
  kind: Ns3JourneysWidgetChangeKind;
  targetId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export interface Ns3JourneysReviewPayload {
  type: 'checkpoint-journeys-answer';
  action: Ns3JourneysReviewAction;
  moduleName: string;
  version: number;
  approved: boolean;
  adjustment: string;
  edits: Ns3JourneysWidgetEdits;
  changes: Ns3JourneysWidgetChangeRecord[];
  proposedArtifact: Ns3E2JourneysArtifact;
}

export function emptyNs3JourneysWidgetEdits(): Ns3JourneysWidgetEdits {
  return {
    featurePriorities: {},
    journeyBusinessRules: {},
    journeyNotes: {},
  };
}

export function hasNs3JourneysWidgetEdits(edits: Ns3JourneysWidgetEdits): boolean {
  return Object.keys(edits.featurePriorities).length > 0
    || Object.keys(edits.journeyBusinessRules).length > 0
    || Object.keys(edits.journeyNotes).length > 0;
}

export function isNs3E2Priority(value: unknown): value is Ns3E2Priority {
  return NS3_E2_PRIORITIES.includes(value as Ns3E2Priority);
}

export function parseNs3BusinessRulesText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function serializeNs3BusinessRules(rules: readonly string[]): string {
  return rules.join('\n');
}

export function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function applyNs3JourneysWidgetEdits(
  artifact: Ns3E2JourneysArtifact,
  edits: Ns3JourneysWidgetEdits,
): Ns3E2JourneysArtifact {
  const featurePriorities = edits.featurePriorities || {};
  const journeyBusinessRules = edits.journeyBusinessRules || {};
  const journeyNotes = edits.journeyNotes || {};

  return {
    ...artifact,
    actors: artifact.actors.map(actor => ({ ...actor })),
    journeys: artifact.journeys.map(journey => {
      const next = {
        ...journey,
        steps: journey.steps.map(step => ({ ...step, featureRefs: [...step.featureRefs] })),
        businessRules: [...journey.businessRules],
      };
      if (hasOwn(journeyBusinessRules, journey.journeyId)) next.businessRules = [...(journeyBusinessRules[journey.journeyId] || [])];
      if (hasOwn(journeyNotes, journey.journeyId)) next.notes = journeyNotes[journey.journeyId] || '';
      return next;
    }),
    features: artifact.features.map(feature => {
      const priority = featurePriorities[feature.featureId];
      return {
        ...feature,
        priority: isNs3E2Priority(priority) ? priority : feature.priority,
        actorIds: [...feature.actorIds],
      };
    }),
    decisions: artifact.decisions.map(decision => ({ ...decision })),
  };
}

export function buildNs3JourneysReviewPayload(input: {
  artifact: Ns3E2JourneysArtifact;
  action: Ns3JourneysReviewAction;
  adjustment?: string;
  edits?: Ns3JourneysWidgetEdits;
  changes?: Ns3JourneysWidgetChangeRecord[];
}): Ns3JourneysReviewPayload {
  const edits = input.edits || emptyNs3JourneysWidgetEdits();
  return {
    type: 'checkpoint-journeys-answer',
    action: input.action,
    moduleName: input.artifact.moduleName,
    version: input.artifact.version,
    approved: input.action === 'approve',
    adjustment: (input.adjustment || '').trim(),
    edits: {
      featurePriorities: { ...edits.featurePriorities },
      journeyBusinessRules: cloneStringArrayRecord(edits.journeyBusinessRules),
      journeyNotes: { ...edits.journeyNotes },
    },
    changes: (input.changes || []).map(change => ({ ...change })),
    proposedArtifact: applyNs3JourneysWidgetEdits(input.artifact, edits),
  };
}

function cloneStringArrayRecord(record: Record<string, string[]>): Record<string, string[]> {
  const clone: Record<string, string[]> = {};
  Object.keys(record).forEach(key => { clone[key] = [...(record[key] || [])]; });
  return clone;
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
