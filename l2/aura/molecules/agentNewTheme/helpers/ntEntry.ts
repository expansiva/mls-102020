/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntEntry.ts" enhancement="_blank"/>

// Entry parsing for the @@agentNewTheme mention (pure — unit-testable; the platform arg
// parser is injected). New Theme is a FREE-TEXT agent: the description is prose, so prose
// is the primary form and `{ prompt: '...' }` is accepted as an alternative.
// The platform facts behind this (mention stripping + safeParseArgs throwing on prose) and
// the primitives live in l2/aura/molecules/shared/mentionEntry.

import {
  isBareMention,
  looksLikeArgs,
  stripAgentMention,
  tryParseArgs,
  type MentionArgsParser,
} from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';

export type NtArgsParser = MentionArgsParser;

export { looksLikeArgs as ntLooksLikeArgs, stripAgentMention as ntStripMention };

// The style description the pipeline should work from. Empty means "ask me everything"
// (every field falls to the checkpoint) — a bare mention is valid input.
export function ntParseEntryPrompt(userPrompt: string, agentName: string, parseArgs: NtArgsParser): string {
  const text = stripAgentMention(userPrompt, agentName);
  if (!text || isBareMention(text)) return '';

  if (looksLikeArgs(text)) {
    const parsed = tryParseArgs(text, parseArgs);
    // A malformed object literal degrades to prose instead of killing the task.
    if (!parsed) return text;
    const value = parsed.prompt;
    return typeof value === 'string' ? value.trim() : '';
  }
  return text;
}
