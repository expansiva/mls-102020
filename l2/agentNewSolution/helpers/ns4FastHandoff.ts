/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4FastHandoff.ts" enhancement="_blank"/>

/**
 * `/fast` chain + E1 skip. Pure: the finalize step and the E1 after-prompt hook decide from this;
 * sending the thread message is the agent's I/O, not this file's.
 */

export const NS4_FAST_SKIP_REASON = 'fast skipped clarification';
export const NS4_FAST_HANDOFF_PLAN_ID = 'fast-handoff-changeBackend';
export const NS4_FAST_HANDOFF_AGENT = 'agentChangeBackend';

export interface Ns4E1SkippedDefaults {
  productLanguages: string[];
  defaultLanguage: string;
  moduleName: string;
  title: string;
  reviewPolicy: string;
  userLanguage: string;
}

export function isNs4FastMode(longMemory?: Record<string, unknown> | null): boolean {
  return longMemory?.fastMode === 'true';
}

export function ns4E1SkippedDefaults(review: {
  module: { moduleName: string; title: string };
  localization: { productLanguages: readonly string[]; defaultLanguage: string };
  reviewPolicy: { mode: string };
  userLanguage: string;
}): Ns4E1SkippedDefaults {
  return {
    productLanguages: [...review.localization.productLanguages],
    defaultLanguage: review.localization.defaultLanguage,
    moduleName: review.module.moduleName,
    title: review.module.title,
    reviewPolicy: review.reviewPolicy.mode,
    userLanguage: review.userLanguage,
  };
}

export function decideNs4E1Clarification(fast: boolean): 'skip' | 'open' {
  return fast ? 'skip' : 'open';
}

export function buildNs4ChangeBackendHandoffMessage(moduleName: string): string {
  const module = String(moduleName || '').trim();
  return module ? `@@agentChangeBackend /fast /rebuild all ${module}` : '';
}

export function decideNs4FastHandoff(input: {
  fast: boolean;
  success: boolean;
  alreadyDispatched: boolean;
  moduleName: string;
}): { dispatch: boolean; message: string } {
  const message = buildNs4ChangeBackendHandoffMessage(input.moduleName);
  if (!input.fast || !input.success || input.alreadyDispatched || !message) {
    return { dispatch: false, message: '' };
  }
  return { dispatch: true, message };
}
