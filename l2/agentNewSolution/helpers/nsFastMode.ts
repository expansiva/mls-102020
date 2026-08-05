/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsFastMode.ts" enhancement="_102027_/l2/enhancementAgent"/>

// `/fast` mode (D5): skip the human clarifications by AUTO-ACCEPTING each step's own proposal —
// the opening clarification (e1) applies its default answers, the journeys checkpoint (e2) approves
// the proposed version. The flag rides the longMemory channel (same place cliCommand lives), so any
// sub-agent that can see `context.task.iaCompressed.longMemory` can branch on it.
//
// This module is PURE and dependency-free on purpose: the fast-mode decision + prompt parsing are
// unit-tested without pulling the libStor/DOM import chain (same reason the e6 gate keeps isRecord local).

export const NS_FAST_MEMORY_FLAG = 'fastMode';
export const NS_FAST_TRACE_NOTE = '[fast] clarification auto-aceita';

// Detect a standalone `/fast` token anywhere in the initial prompt and return the prompt without it.
// Only a whole-word `/fast` counts (so `/fastlane` or `refast` do not trigger).
export function parseNsFastMode(prompt: string): { fast: boolean; prompt: string } {
  const raw = String(prompt || '');
  const fast = /(^|\s)\/fast(\s|$)/i.test(raw);
  const cleaned = raw.replace(/(^|\s)\/fast(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { fast, prompt: cleaned };
}

// True only when longMemory carries the fast flag. Anything else (undefined, missing flag, other
// value) is false, so the interactive path is entered unchanged.
export function isNsFastMode(longMemory: unknown): boolean {
  return typeof longMemory === 'object' && longMemory !== null
    && (longMemory as Record<string, unknown>)[NS_FAST_MEMORY_FLAG] === 'true';
}

// `/rebuild` mode (newSolution_18): when the module already exists, soft-delete its l4 + l5 artifacts
// before regenerating — a clean slate so leftover data from a prior run (e.g. an old page/operation the
// new spec dropped) never collides. Same longMemory channel as /fast; the cleanup runs once in e1.
export const NS_REBUILD_MEMORY_FLAG = 'rebuild';
export const NS_REBUILD_TRACE_NOTE = '[rebuild] módulo existente limpo (l4+l5) antes de regenerar';

export function parseNsRebuildMode(prompt: string): { rebuild: boolean; prompt: string } {
  const raw = String(prompt || '');
  const rebuild = /(^|\s)\/rebuild(\s|$)/i.test(raw);
  const cleaned = raw.replace(/(^|\s)\/rebuild(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { rebuild, prompt: cleaned };
}

export function isNsRebuildMode(longMemory: unknown): boolean {
  return typeof longMemory === 'object' && longMemory !== null
    && (longMemory as Record<string, unknown>)[NS_REBUILD_MEMORY_FLAG] === 'true';
}

// `/l4only` (2026-08-03): stop after the SPEC. E7 normally fires `@@changeBackend` and
// `@@changeFrontend` as follow-up tasks; while the l4 itself is what is being iterated on, those two
// cost a lot and are thrown away on the next run. Same longMemory channel as /fast and /rebuild —
// the flag only suppresses the handoff dispatch, the l4/l5 artifacts are written exactly as always.
export const NS_L4_ONLY_MEMORY_FLAG = 'l4Only';
export const NS_L4_ONLY_TRACE_NOTE = '[l4only] handoff para changeFrontend/changeBackend suprimido';

export function parseNsL4OnlyMode(prompt: string): { l4Only: boolean; prompt: string } {
  const raw = String(prompt || '');
  const l4Only = /(^|\s)\/l4only(\s|$)/i.test(raw);
  const cleaned = raw.replace(/(^|\s)\/l4only(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { l4Only, prompt: cleaned };
}

export function isNsL4OnlyMode(longMemory: unknown): boolean {
  return typeof longMemory === 'object' && longMemory !== null
    && (longMemory as Record<string, unknown>)[NS_L4_ONLY_MEMORY_FLAG] === 'true';
}

// `/soft` (2026-08-03): DIAGNOSTIC mode. The e6/e7 quality gates stop failing the run — every artifact
// is written and the findings are recorded — so a complete l4 can be measured end to end by the T0
// ruler (`steps/e6-journey-map/metrics.ts`) instead of being judged only by the gate that blocked it.
// It exists because the package spent six runs never seeing a finished l4: without one, M1–M6 and "does
// the page come out with a list" are unanswerable.
//
// It does NOT loosen any gate: the checks run unchanged, the findings go to the trace and the pipeline
// exactly as before, and the completion message says the run was soft. Never a default — a soft run
// proves nothing about a real one, and the artifact it leaves behind is a MEASUREMENT, not a delivery.
export const NS_SOFT_MEMORY_FLAG = 'soft';
export const NS_SOFT_TRACE_NOTE = '[soft] gate errors recorded, run continued (diagnostic mode)';

export function parseNsSoftMode(prompt: string): { soft: boolean; prompt: string } {
  const raw = String(prompt || '');
  const soft = /(^|\s)\/soft(\s|$)/i.test(raw);
  const cleaned = raw.replace(/(^|\s)\/soft(?=\s|$)/gi, '$1').replace(/\s+/g, ' ').trim();
  return { soft, prompt: cleaned };
}

export function isNsSoftMode(longMemory: unknown): boolean {
  return typeof longMemory === 'object' && longMemory !== null
    && (longMemory as Record<string, unknown>)[NS_SOFT_MEMORY_FLAG] === 'true';
}
