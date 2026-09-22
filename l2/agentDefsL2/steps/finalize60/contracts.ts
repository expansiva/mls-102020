/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/contracts.ts" enhancement="_blank"/>

import type { D2DestinationKind } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

export const D2_FINALIZE_VERSION = '2026-09-21-agent-defs-l2-finalize-v1' as const;
export interface D2OwnedArtifact { pageId: string; kind: D2DestinationKind; path: string; sha256: string; removed?: true; }
export interface D2OwnershipReceipt extends D2RunIdentity { schemaVersion: typeof D2_FINALIZE_VERSION; artifacts: D2OwnedArtifact[]; }
export interface D2FinalizeReport extends D2RunIdentity {
  schemaVersion: typeof D2_FINALIZE_VERSION;
  status: 'complete' | 'blocked';
  snapshotHash: string;
  ready: string[];
  preserved: string[];
  removed: string[];
  pending: string[];
  materializationPendingRemove: string[];
  artifactPaths: string[];
}
export interface D2FinalizeResult { report: D2FinalizeReport; writes: number; deletes: number; }
