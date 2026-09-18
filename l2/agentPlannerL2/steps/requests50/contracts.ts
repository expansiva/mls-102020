/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/requests50/contracts.ts" enhancement="_blank"/>

import type { PoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  emitP2ContractDefs,
  type P2ContractCall,
  type P2ContractsDraft,
  type P2EntityField,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import type { P2L4Sources, P2Workspace, P2WorkspacesDraft } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';

export interface P2RequestCall {
  workspaceId: string;
  call: P2ContractCall;
}

export interface P2BuildRequestsInput {
  project: number;
  moduleName: string;
  received: PoolMessage;
  contracts: P2ContractsDraft;
  workspaces: P2WorkspacesDraft;
  sources: P2L4Sources;
  catalog: ReadonlyMap<string, P2EntityField>;
}

/** One second per request so `writePoolMessage` names (`<stamp>_<thread>_<round>`) do not collide. */
export function p2RequestNow(now: Date, index: number): Date {
  return new Date(now.getTime() + index * 1000);
}

export function collectP2RequestCalls(contracts: P2ContractsDraft): P2RequestCall[] {
  const out: P2RequestCall[] = [];
  for (const workspace of contracts.workspaces) {
    for (const call of workspace.calls) {
      out.push({ workspaceId: workspace.workspaceId, call });
    }
  }
  return out;
}

export function p2RequestSubject(moduleName: string, workspaceId: string, callName: string): string {
  return `${moduleName}.${workspaceId}.${callName}`;
}

export function p2RequestArtifact(workspaceId: string): string {
  return `web/contracts/${workspaceId}.defs.ts`;
}

export function extractP2CallBlock(source: string, callName: string): string {
  const needle = `// bffCall ${callName} `;
  const start = source.indexOf(needle);
  if (start < 0) return '';
  const rest = source.slice(start);
  const next = rest.indexOf('\n// bffCall ');
  const chunk = next < 0 ? rest : rest.slice(0, next);
  return chunk.replace(/\s+$/u, '');
}

export function journeyStepOf(
  stepRef: string,
  workspace: P2Workspace | undefined,
  sources: P2L4Sources,
): { journeyId: string; stepId: string } {
  const journeyRefs = workspace?.journeyRefs || [];
  for (const journeyId of journeyRefs) {
    const journey = sources.journeys.find(item => item.journeyId === journeyId);
    if (journey?.steps.some(step => step.stepId === stepRef)) {
      return { journeyId, stepId: stepRef };
    }
  }
  return { journeyId: journeyRefs[0] || '', stepId: stepRef };
}

export function buildP2RequestBody(input: {
  journeyId: string;
  stepId: string;
  call: P2ContractCall;
  contractSource: string;
}): string {
  const block = extractP2CallBlock(input.contractSource, input.call.callName);
  const fields: string[] = [];
  const seen = new Set<string>();
  for (const path of [...input.call.inputFields, ...input.call.outputFields]) {
    if (!path || seen.has(path)) continue;
    seen.add(path);
    fields.push(path);
  }
  const lines = [
    `Journey step ${input.journeyId}/${input.stepId} motivates this BFF call.`,
    '',
    block,
    '',
    `l4 entity: ${input.call.entityRef}`,
    `l4 fields: ${fields.join(', ')}`,
  ];
  if (input.call.transitionRef) lines.push(`l4 transition: ${input.call.transitionRef}`);
  return lines.join('\n');
}

export function buildP2L1Requests(input: P2BuildRequestsInput): PoolMessage[] {
  const emitted = new Map<string, string>();
  const workspaceById = new Map(input.workspaces.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const out: PoolMessage[] = [];
  for (const entry of collectP2RequestCalls(input.contracts)) {
    let source = emitted.get(entry.workspaceId);
    if (!source) {
      source = emitP2ContractDefs({
        project: input.project,
        moduleName: input.moduleName,
        workspaceId: entry.workspaceId,
        calls: input.contracts.workspaces.find(item => item.workspaceId === entry.workspaceId)?.calls || [entry.call],
        catalog: input.catalog,
      });
      emitted.set(entry.workspaceId, source);
    }
    const cut = workspaceById.get(entry.workspaceId);
    const journey = journeyStepOf(entry.call.stepRef, cut, input.sources);
    out.push({
      from: 'l2',
      to: 'l1',
      thread: input.received.thread,
      round: input.received.round,
      mode: input.received.mode,
      subject: p2RequestSubject(input.moduleName, entry.workspaceId, entry.call.callName),
      artifacts: [p2RequestArtifact(entry.workspaceId)],
      body: buildP2RequestBody({
        journeyId: journey.journeyId,
        stepId: journey.stepId,
        call: entry.call,
        contractSource: source,
      }),
    });
  }
  return out;
}
