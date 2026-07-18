/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.ts" enhancement="_blank"/>

import type {
  NsE2JourneysArtifact,
  NsE2Priority,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';

export const NS_E2_PRIORITIES: readonly NsE2Priority[] = ['now', 'soon', 'later', 'never'];

export type NsJourneysReviewAction = 'approve' | 'adjust';
export type NsJourneysWidgetChangeKind =
  | 'featurePriorityChanged'
  | 'journeyBusinessRulesChanged'
  | 'journeyNotesChanged'
  | 'reviewSubmitted';

export interface NsJourneysWidgetEdits {
  featurePriorities: Record<string, NsE2Priority>;
  journeyBusinessRules: Record<string, string[]>;
  journeyNotes: Record<string, string>;
}

export interface NsJourneysWidgetChangeRecord {
  id: string;
  at: string;
  kind: NsJourneysWidgetChangeKind;
  targetId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}

export interface NsJourneysReviewPayload {
  type: 'checkpoint-journeys-answer';
  action: NsJourneysReviewAction;
  moduleName: string;
  version: number;
  approved: boolean;
  adjustment: string;
  edits: NsJourneysWidgetEdits;
  changes: NsJourneysWidgetChangeRecord[];
  proposedArtifact: NsE2JourneysArtifact;
}

export function emptyNsJourneysWidgetEdits(): NsJourneysWidgetEdits {
  return {
    featurePriorities: {},
    journeyBusinessRules: {},
    journeyNotes: {},
  };
}

export function hasNsJourneysWidgetEdits(edits: NsJourneysWidgetEdits): boolean {
  return Object.keys(edits.featurePriorities).length > 0
    || Object.keys(edits.journeyBusinessRules).length > 0
    || Object.keys(edits.journeyNotes).length > 0;
}

export function isNsE2Priority(value: unknown): value is NsE2Priority {
  return NS_E2_PRIORITIES.includes(value as NsE2Priority);
}

export function parseNsBusinessRulesText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
}

export function serializeNsBusinessRules(rules: readonly string[]): string {
  return rules.join('\n');
}

export function sameStringArray(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function applyNsJourneysWidgetEdits(
  artifact: NsE2JourneysArtifact,
  edits: NsJourneysWidgetEdits,
): NsE2JourneysArtifact {
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
        priority: isNsE2Priority(priority) ? priority : feature.priority,
        actorIds: [...feature.actorIds],
      };
    }),
    decisions: artifact.decisions.map(decision => ({ ...decision })),
  };
}

export function buildNsJourneysReviewPayload(input: {
  artifact: NsE2JourneysArtifact;
  action: NsJourneysReviewAction;
  adjustment?: string;
  edits?: NsJourneysWidgetEdits;
  changes?: NsJourneysWidgetChangeRecord[];
}): NsJourneysReviewPayload {
  const edits = input.edits || emptyNsJourneysWidgetEdits();
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
    proposedArtifact: applyNsJourneysWidgetEdits(input.artifact, edits),
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
