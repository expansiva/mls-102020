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
