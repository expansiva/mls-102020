/// <mls fileReference="_102020_/l2/aura/molecules/shared/mentionEntry.ts" enhancement="_blank"/>

// SHARED mention-entry primitives (pure/node-testable). Consumed by every agent root that
// reads a '@@agent ...' mention — agentNewTheme (prose) and agentNewMoleculeVariant (a
// molecule reference) parse different payloads, but they face the same two platform facts:
//
// 1. The runtime hands beforePromptImplicit the message content with the FIRST
//    space-delimited token removed when it starts with '@@'
//    (aiAgentOrchestration.executeBeforePromptStream). So '@@agent <text>' arrives clean,
//    but '@@ agent <text>' (space after the sigil) still carries the agent name.
// 2. mls.common.safeParseArgs THROWS on anything that is not an object literal
//    ("Invalid args format, cannot parse."). The name means "tolerates JS-object syntax",
//    NOT "never throws" — calling it unconditionally breaks every free-text mention.

export type MentionArgsParser = (raw: string) => Record<string, unknown> | undefined;

// The mention text without OUR OWN '@@'/agent-name prefix. Another agent's '@@' is left
// intact on purpose, so the caller can tell it apart from real content.
export function stripAgentMention(userPrompt: string, agentName: string): string {
  const text = (userPrompt || '').trim();
  const name = (agentName || '').toLowerCase();
  if (!name) return text;
  const lower = text.toLowerCase();
  for (const prefix of [`@@${name}`, `@@ ${name}`, name]) {
    if (!lower.startsWith(prefix)) continue;
    const rest = text.slice(prefix.length);
    // 'agentNewThemeStyle ...' is content, not our mention followed by arguments.
    if (!rest || /^[\s:,{]/.test(rest)) return rest.trim();
  }
  return text;
}

// Only text that opens an object literal is worth handing to the arg parser.
export function looksLikeArgs(text: string): boolean {
  return text.trim().startsWith('{');
}

// Parse an object-literal mention, or null when it is not one / does not parse. Callers
// decide what a non-object mention means for them (prose, a bare reference, an error).
export function tryParseArgs(text: string, parseArgs: MentionArgsParser): Record<string, unknown> | null {
  if (!looksLikeArgs(text)) return null;
  try {
    return parseArgs(text) || null;
  } catch {
    return null;
  }
}

// A mention that is just ANOTHER agent's mention carries no content (the preview sends the
// mention itself in `prompt`).
export function isBareMention(text: string): boolean {
  return text.trim().startsWith('@@');
}
