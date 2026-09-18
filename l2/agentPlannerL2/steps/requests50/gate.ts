/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/requests50/gate.ts" enhancement="_blank"/>

import type { PoolMessage } from '/_102035_/l2/solution/pool.js';
import type { P2ContractsDraft } from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import {
  collectP2RequestCalls,
  p2RequestArtifact,
  p2RequestSubject,
} from '/_102020_/l2/agentPlannerL2/steps/requests50/contracts.js';

export interface P2RequestGateIssue {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  path?: string;
}

export interface P2RequestGateResult {
  ok: boolean;
  issues: P2RequestGateIssue[];
}

export function validateP2Requests(
  requests: readonly PoolMessage[],
  contracts: P2ContractsDraft,
  received: PoolMessage,
): P2RequestGateResult {
  const issues: P2RequestGateIssue[] = [];
  const calls = collectP2RequestCalls(contracts);
  const expected = new Map<string, { workspaceId: string; callName: string }>();
  for (const entry of calls) {
    const subject = p2RequestSubject(contracts.moduleName, entry.workspaceId, entry.call.callName);
    expected.set(subject, { workspaceId: entry.workspaceId, callName: entry.call.callName });
  }

  if (requests.length !== calls.length) {
    error(
      issues,
      'P2_REQUEST_COUNT',
      `Expected ${calls.length} pool/l1 requests (one per BFF call), got ${requests.length}.`,
      'requests',
    );
  }

  const seen = new Set<string>();
  requests.forEach((request, index) => {
    const path = `requests[${index}]`;
    if (request.from !== 'l2') error(issues, 'P2_REQUEST_FROM', `from must be 'l2'.`, `${path}.from`);
    if (request.to !== 'l1') error(issues, 'P2_REQUEST_TO', `to must be 'l1'.`, `${path}.to`);
    if (request.thread !== received.thread) {
      error(issues, 'P2_REQUEST_THREAD', `thread must be the received thread ${received.thread}.`, `${path}.thread`);
    }
    if (request.round !== received.round) {
      error(issues, 'P2_REQUEST_ROUND', `round must be the received round ${received.round}.`, `${path}.round`);
    }
    if (request.mode !== received.mode) {
      error(issues, 'P2_REQUEST_MODE', `mode must be the received mode ${received.mode}.`, `${path}.mode`);
    }
    const wanted = expected.get(request.subject);
    if (!wanted) {
      error(issues, 'P2_REQUEST_ORPHAN', `No contract call for subject ${request.subject}.`, `${path}.subject`);
    } else if (seen.has(request.subject)) {
      error(issues, 'P2_REQUEST_DUP', `Duplicate request for ${request.subject}.`, `${path}.subject`);
    } else {
      seen.add(request.subject);
      const artifact = p2RequestArtifact(wanted.workspaceId);
      if (request.artifacts.length !== 1 || request.artifacts[0] !== artifact) {
        error(issues, 'P2_REQUEST_ARTIFACT', `artifacts must be ['${artifact}'].`, `${path}.artifacts`);
      }
    }
    if (!request.body.includes('Journey step ') || !request.body.includes('l4 fields:')) {
      error(issues, 'P2_REQUEST_BODY', 'body must name the journey step and the cited l4 fields.', `${path}.body`);
    }
  });

  for (const [subject] of expected) {
    if (!seen.has(subject)) {
      error(issues, 'P2_REQUEST_MISSING', `Missing request for call ${subject}.`, 'requests');
    }
  }

  return { ok: issues.every(issue => issue.severity !== 'error'), issues };
}

export function formatP2RequestGate(issues: readonly P2RequestGateIssue[]): string {
  return issues.map(issue => `${issue.code}: ${issue.message}`).join('\n');
}

function error(issues: P2RequestGateIssue[], code: string, message: string, path?: string): void {
  issues.push({ severity: 'error', code, message, path });
}
