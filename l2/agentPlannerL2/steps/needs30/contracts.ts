/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/contracts.ts" enhancement="_blank"/>

import type { PoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P2_MENU_DEVICE,
  type P2MenuDevice,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import type { PoolNeedsFile } from '/_102035_/l2/solution/poolPlan.js';
import { POOL_NEEDS_FAMILIES, POOL_NEEDS_OPERATIONS, POOL_NEEDS_SCHEMA_VERSION, POOL_NEEDS_SCOPES } from '/_102035_/l2/solution/poolPlan.js';

// Lists and version of needs.json come from the pool's one type (p2_34).
export const P2_NEEDS_SCHEMA_VERSION = POOL_NEEDS_SCHEMA_VERSION;
export const P2_NEEDS_OPERATIONS = POOL_NEEDS_OPERATIONS;
export const P2_NEEDS_SCOPES = POOL_NEEDS_SCOPES;
export const P2_NEEDS_FAMILIES = POOL_NEEDS_FAMILIES;
export const P2_NEEDS_ARTIFACT = 'pool/l1/web/needs.json' as const;

export {
  buildP2NeedsFile,
  collectP2NeedsPages,
  isP2NeedsFamily,
  isP2NeedsOperation,
  isP2NeedsScope,
  journeyStepOf,
  p2EntityFamily,
  p2WidestScope,
  type P2BuildNeedsInput,
  type P2NeedsFamily,
  type P2NeedsOperation,
  type P2NeedsScope,
  type P2ScopeWhere,
} from '/_102020_/l2/helpers/needs/build.js';

export function p2NeedsSubject(moduleName: string, device: P2MenuDevice = P2_MENU_DEVICE): string {
  return `needs of ${moduleName} (${device})`;
}

export function p2NeedsBody(file: PoolNeedsFile): string {
  return file.pages.map(page => `${page.pageId}: ${page.reads.length} reads / ${page.writes.length} writes`).join('\n');
}

export function buildP2NeedsMessage(input: {
  file: PoolNeedsFile;
  received: Pick<PoolMessage, 'thread' | 'round' | 'mode'>;
}): PoolMessage {
  return {
    from: 'l2',
    to: 'l1',
    thread: input.received.thread,
    round: input.received.round,
    mode: input.received.mode,
    subject: p2NeedsSubject(input.file.moduleName, input.file.device),
    artifacts: [P2_NEEDS_ARTIFACT],
    body: p2NeedsBody(input.file),
  };
}
