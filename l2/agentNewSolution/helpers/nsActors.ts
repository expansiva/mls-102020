/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsActors.ts" enhancement="_blank"/>

// Plural actors (D6): operations and workspaces declare `actors: string[]` — operations that serve
// several actors stop being duplicated, and a workspace's actors gate what its login can open.
//
// readActors is the TOLERANT reader (D6 back-compat): l4 defs written by the legacy pipeline carry
// a singular `actor`; new agentNewSolution defs carry `actors`. Every disk-read of an operation or
// workspace def goes through this so both layouts resolve to a string[]. Pure + dependency-free so
// the reader can be unit-tested without the libStor/DOM import chain.
export function readActors(record: unknown): string[] {
  if (typeof record !== 'object' || record === null) return [];
  const source = record as Record<string, unknown>;
  const plural = Array.isArray(source.actors)
    ? source.actors.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  if (plural.length > 0) return dedupe(plural);
  const singular = typeof source.actor === 'string' ? source.actor.trim() : '';
  return singular ? [singular] : [];
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
