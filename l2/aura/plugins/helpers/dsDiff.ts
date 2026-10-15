/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsDiff.ts" enhancement="_blank"/>

// What changed in the L5 → UI editor since the DS was loaded — per KEY (for the "old → new" list)
// and per TOKEN (for the row marks and the counts: editing only the dark value of `x` is ONE changed
// token, not two). Keys use the entry format: colors `x` / `_dark-x`, typography/global plain.
//
// The baseline is the form as LOADED (rows → maps), not the raw entry: the loader seeds the mandatory
// template under the entry, and comparing against the raw entry would flag every seeded token as new.
// Pure — Node-tested.

export interface TokenMaps {
  color: Record<string, string>;
  typography: Record<string, string>;
  global: Record<string, string>;
}
export type TokenSection = keyof TokenMaps;
export const TOKEN_SECTIONS: readonly TokenSection[] = ['color', 'typography', 'global'];

export type ChangeKind = 'changed' | 'added' | 'removed';

export interface KeyChange { section: TokenSection; key: string; kind: ChangeKind; from?: string; to?: string; }

const DARK = '_dark-';
const HEX = /^#[0-9a-fA-F]{3,8}$/;

export function baseName(key: string): string {
  return key.startsWith(DARK) ? key.slice(DARK.length) : key;
}

/** Equal for the user: trimmed, and hex compared case-insensitively (`#ABCDEF` = `#abcdef`). */
export function sameValue(a: string | undefined, b: string | undefined): boolean {
  const x = (a ?? '').trim();
  const y = (b ?? '').trim();
  if (HEX.test(x) && HEX.test(y)) return x.toLowerCase() === y.toLowerCase();
  return x === y;
}

export function colorRowsToMap(rows: readonly { name: string; light: string; dark: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const n = r.name.trim();
    if (!n || n in out) continue;
    out[n] = r.light;
    if (r.dark.trim()) out[`${DARK}${n}`] = r.dark.trim();
  }
  return out;
}

export function valueRowsToMap(rows: readonly { name: string; value: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of rows) {
    const n = r.name.trim();
    if (n && !(n in out)) out[n] = r.value;
  }
  return out;
}

/** Key-level diff, saved order first (changed/removed), then the keys only `current` has (added). */
export function diffMaps(section: TokenSection, saved: Record<string, string>, current: Record<string, string>): KeyChange[] {
  const out: KeyChange[] = [];
  for (const key of Object.keys(saved)) {
    if (!(key in current)) out.push({ section, key, kind: 'removed', from: saved[key] });
    else if (!sameValue(saved[key], current[key])) out.push({ section, key, kind: 'changed', from: saved[key], to: current[key] });
  }
  for (const key of Object.keys(current)) {
    if (!(key in saved)) out.push({ section, key, kind: 'added', to: current[key] });
  }
  return out;
}

export function diffTokens(saved: TokenMaps, current: TokenMaps): KeyChange[] {
  return TOKEN_SECTIONS.flatMap(s => diffMaps(s, saved[s], current[s]));
}

/**
 * Token-level status per section: a token is `added`/`removed` when its BASE key is; otherwise any
 * key of it that differs (e.g. only its dark value appeared) makes it `changed`.
 */
export function tokenStatus(saved: TokenMaps, changes: readonly KeyChange[]): Record<TokenSection, Map<string, ChangeKind>> {
  const out = { color: new Map(), typography: new Map(), global: new Map() } as Record<TokenSection, Map<string, ChangeKind>>;
  for (const c of changes) {
    const name = baseName(c.key);
    const map = out[c.section];
    if (c.key === name && c.kind !== 'changed') { map.set(name, c.kind); continue; }
    if (!map.has(name)) map.set(name, name in saved[c.section] ? 'changed' : 'added');
  }
  return out;
}

export function countByKind(status: Record<TokenSection, Map<string, ChangeKind>>): Record<ChangeKind, number> {
  const out: Record<ChangeKind, number> = { changed: 0, added: 0, removed: 0 };
  for (const s of TOKEN_SECTIONS) for (const kind of status[s].values()) out[kind]++;
  return out;
}
