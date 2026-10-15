/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsTokenSearch.ts" enhancement="_blank"/>

// Token search of the L5 → UI editor. Plain text matches the token NAME; a leading `=` matches the
// VALUE instead (light, dark or the single value), so `=#1273d4` finds every token painted with it.
// Case-insensitive substring both ways. Pure — Node-tested.

export interface TokenQuery { mode: 'name' | 'value'; text: string; }

export interface SearchableRow { name: string; light?: string; dark?: string; value?: string; }

/** null = no filter (empty or `=` alone). */
export function parseTokenQuery(raw: string): TokenQuery | null {
  const q = raw.trim();
  if (q.startsWith('=')) {
    const text = q.slice(1).trim().toLowerCase();
    return text ? { mode: 'value', text } : null;
  }
  return q ? { mode: 'name', text: q.toLowerCase() } : null;
}

export function rowMatchesQuery(row: SearchableRow, query: TokenQuery | null): boolean {
  if (!query) return true;
  if (query.mode === 'name') return row.name.toLowerCase().includes(query.text);
  return [row.light, row.dark, row.value].some(v => typeof v === 'string' && v.toLowerCase().includes(query.text));
}
