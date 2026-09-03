/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e9/coverage.ts" enhancement="_blank"/>

/**
 * E9 audit: E7-approved use cases versus operations actually written. Loss is declared, never a
 * gate — pruning a use case with no screen can be the right call; pruning it in silence is the defect.
 */

import type { Ns4PipelineState } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

export const NS4_USECASE_DROP_UNREFERENCED = 'no workspace references the step';
export const NS4_USECASE_DROP_DUPLICATE = 'uniqueBy discarded a duplicate operationId';

export interface Ns4ApprovedUseCase {
  useCaseId: string;
  compiledFrom: string[];
}

export interface Ns4UseCasesDropped {
  notEmitted: string[];
  approved: number;
  emitted: number;
  reasons?: Record<string, string>;
}

export type Ns4UseCaseCoverageVerdict =
  | { useCases: 'ok'; approved: number; emitted: number }
  | { useCases: 'degraded'; useCasesDropped: Ns4UseCasesDropped };

export function compareE7ToOperations(input: {
  approved: readonly Ns4ApprovedUseCase[];
  emittedOperationIds: readonly string[];
  hostedStepRefs?: readonly string[];
}): Ns4UseCaseCoverageVerdict {
  const approved = uniqueIds(input.approved.map(item => item.useCaseId).filter(Boolean));
  const byId = new Map(input.approved.filter(item => item.useCaseId).map(item => [item.useCaseId, item]));
  const emitted = new Set(input.emittedOperationIds.filter(Boolean));
  const hosted = new Set(input.hostedStepRefs || []);
  const notEmitted: string[] = [];
  const reasons: Record<string, string> = {};
  for (const useCaseId of approved) {
    if (emitted.has(useCaseId)) continue;
    notEmitted.push(useCaseId);
    const reason = dropReason(byId.get(useCaseId)?.compiledFrom || [], hosted);
    if (reason) reasons[useCaseId] = reason;
  }
  const dropped: Ns4UseCasesDropped = {
    notEmitted,
    approved: approved.length,
    emitted: emitted.size,
    ...(Object.keys(reasons).length ? { reasons } : {}),
  };
  if (notEmitted.length === 0) return { useCases: 'ok', approved: dropped.approved, emitted: dropped.emitted };
  return { useCases: 'degraded', useCasesDropped: dropped };
}

export function useCaseCoverageLogLine(verdict: Ns4UseCaseCoverageVerdict): string {
  // English: this line lands in the step status the user reads in the studio.
  const approved = verdict.useCases === 'ok' ? verdict.approved : verdict.useCasesDropped.approved;
  const emitted = verdict.useCases === 'ok' ? verdict.emitted : verdict.useCasesDropped.emitted;
  const notEmitted = verdict.useCases === 'ok' ? 0 : verdict.useCasesDropped.notEmitted.length;
  return `${approved} approved, ${emitted} emitted, ${notEmitted} not emitted`;
}

/** Strip a prior-run `degraded` first. A clean emit leaves no `useCases` / `useCasesDropped` on disk. */
export function applyNs4UseCaseCoverage(
  state: Ns4PipelineState,
  verdict: Ns4UseCaseCoverageVerdict,
): Ns4PipelineState {
  const { useCases: _useCases, useCasesDropped: _dropped, ...rest } = state;
  if (verdict.useCases === 'ok') return rest;
  return { ...rest, useCases: 'degraded', useCasesDropped: verdict.useCasesDropped };
}

function dropReason(compiledFrom: readonly string[], hosted: ReadonlySet<string>): string | undefined {
  if (!compiledFrom.length || hosted.size === 0) return undefined;
  if (!compiledFrom.some(ref => hosted.has(ref))) return NS4_USECASE_DROP_UNREFERENCED;
  return NS4_USECASE_DROP_DUPLICATE;
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
