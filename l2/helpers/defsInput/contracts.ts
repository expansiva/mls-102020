/// <mls fileReference="_102020_/l2/helpers/defsInput/contracts.ts" enhancement="_blank"/>

import type { PoolPlanStatus } from '/_102035_/l2/solution/poolPlan.js';

export interface D2RunIdentity { project: number; module: string }

export const D2_INPUT_VERSION = '2026-09-21-agent-defs-l2-input-v1' as const;
export const D2_INPUT_REPORT_VERSION = '2026-09-21-agent-defs-l2-input-report-v1' as const;

export type D2ProblemSeverity = 'error' | 'review' | 'info';

export interface D2InputProblem {
  severity: D2ProblemSeverity;
  code: string;
  file: string;
  message: string;
  pageId?: string;
  route?: string;
}

export interface D2SourceDigest {
  path: string;
  sha256: string;
  bytes: number;
  schemaVersion: string;
}

export interface D2AncestorContext {
  id: string;
  kind: string;
  label: string;
  context: string;
}

export type D2DestinationKind = 'contract' | 'shared' | 'desktopPage' | 'mobilePage';

export interface D2Destination {
  kind: D2DestinationKind;
  path: string;
  artifactId: string;
  materializationId?: string;
}

export interface D2SelectedPage {
  pageId: string;
  status: PoolPlanStatus;
  label: string;
  actors: string[];
  authorityRefs: string[];
  ancestors: D2AncestorContext[];
  journeyRefs: string[];
  organisms: unknown[];
  reads: unknown[];
  writes: unknown[];
  endpoints: Array<Record<string, unknown>>;
  usecases: Array<Record<string, unknown>>;
  operationBindings?: D2OperationBinding[];
  destinations: D2Destination[];
}

export interface D2OperationBinding {
  pageId: string;
  route: string;
  entityId: string;
  operation: string;
  actorRef: string;
  grantRefs: string[];
  authorities: string[];
  inputFields: Array<{ path: string; origin: 'actor' | 'server'; required: boolean }>;
  transition?: { transitionId: string; from: string[]; to: string; by: string[]; payload: string[] };
  ruleRefs: Array<{ ruleId: string; file: string; symbol: string; description: string }>;
  sourceHashes: string[];
}

export interface D2RemovedPage {
  pageId: string;
  status: 'toRemove';
  destinations: D2Destination[];
}

export interface D2InputSelection {
  pages: D2SelectedPage[];
  writePageIds: string[];
  preservePageIds: string[];
  remove: D2RemovedPage[];
  counts: {
    pages: number;
    endpoints: number;
    usecases: number;
    destinations: number;
    materializationItems: number;
  };
}

export interface D2ResolvedL4 {
  module: D2SourceDigest;
  journeyIndex: D2SourceDigest;
  journeys: Array<{ journeyId: string; source: D2SourceDigest }>;
  ontologyIndex: D2SourceDigest;
  entities: Array<{ entityId: string; source: D2SourceDigest }>;
  rules: D2SourceDigest;
  workflows: D2SourceDigest;
  access: D2SourceDigest;
  integration: D2SourceDigest;
}

export interface D2InputSnapshot extends D2RunIdentity {
  schemaVersion: typeof D2_INPUT_VERSION;
  device: 'web';
  snapshotHash: string;
  releaseIdentity: null;
  sources: D2SourceDigest[];
  l4: D2ResolvedL4;
  selection: D2InputSelection;
  normalizations: Array<{ code: string; detail: string }>;
  problems: D2InputProblem[];
}

export interface D2InputReport extends D2RunIdentity {
  schemaVersion: typeof D2_INPUT_REPORT_VERSION;
  outcome: 'accepted' | 'refused';
  snapshotHash?: string;
  problems: D2InputProblem[];
}

export interface D2InputArtifacts {
  sources: D2SourceDigest[];
  module: unknown;
  journeyIndex: unknown;
  journeys: Record<string, unknown>;
  ontologyIndex: unknown;
  entities: Record<string, unknown>;
  rules: unknown;
  workflows: unknown;
  access: unknown;
  integration: unknown;
  menu: unknown;
  needs: unknown;
  backend: unknown;
  effort: unknown;
}

export class D2InputValidationError extends Error {
  constructor(readonly problems: D2InputProblem[]) {
    super(problems.map(problem => `${problem.code}: ${problem.message}`).join('; ') || 'input validation failed');
    this.name = 'D2InputValidationError';
  }
}
