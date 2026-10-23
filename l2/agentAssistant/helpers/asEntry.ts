/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asEntry.ts" enhancement="_blank"/>

// Entry parsing for '@@agentAssistant <sentence>' (pure; the platform arg parser is injected).
// The sentence is prose; `{ prompt: '...' }` is accepted too. Platform facts in shared/mentionEntry.

import {
  isBareMention,
  looksLikeArgs,
  stripAgentMention,
  tryParseArgs,
  type MentionArgsParser,
} from '/_102020_/l2/aura/molecules/shared/mentionEntry.js';

export function parseUserText(userPrompt: string, agentName: string, parseArgs: MentionArgsParser): string {
  const text = stripAgentMention(userPrompt, agentName);
  if (!text || isBareMention(text)) return '';
  if (!looksLikeArgs(text)) return text;
  const parsed = tryParseArgs(text, parseArgs);
  if (!parsed) return text;
  return typeof parsed.prompt === 'string' ? parsed.prompt.trim() : '';
}
