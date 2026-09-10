/// <mls fileReference="_102020_/l2/aura/molecules/agentMigrateGroupTokens/helpers/mgtEntry.ts" enhancement="_blank"/>

// Parses the mention: '<grupo canonico> [a partir de <shortName>]'. Pure — no I/O.
//
// No group/molecule NAME matching happens here — that needs skills/index.ts and a stor scan, both
// impure. This only splits the raw text into the two things the root asks of it.

export interface MgtParsedEntry {
  /** As typed, trimmed — matched against skills/index.ts by the caller. */
  group: string;
  /** Lowercased short name after 'a partir de', or null when the phrase is absent. */
  startFrom: string | null;
  /** Non-empty when nothing usable could be parsed — the caller refuses without planting anything. */
  error: string;
}

const START_FROM_RE = /\s+a partir de\s+(ml-[a-z0-9-]+)\s*$/i;

export function mgtParseEntry(raw: string): MgtParsedEntry {
  const text = (raw || '').trim();
  if (!text) {
    return { group: '', startFrom: null, error: "say which group to migrate, e.g. '@@agentMigrateGroupTokens groupEnterDateTime'" };
  }

  const match = text.match(START_FROM_RE);
  const startFrom = match ? match[1].toLowerCase() : null;
  const group = (match ? text.slice(0, match.index) : text).trim();

  if (!group) {
    return { group: '', startFrom, error: 'say which group to migrate' };
  }
  return { group, startFrom, error: '' };
}
