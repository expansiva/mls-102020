/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsMoleculeTokens.ts" enhancement="_blank"/>

// Molecule tokens (`--ml-*`) in the L5 → UI editor.
//
// Molecules read their own tokens as `var(--ml-x, default)` and never declare them, so a value on
// `:root` reaches every molecule that reads it. The design system gives them a value like any other
// token: a color lives in `color` (with its `_dark-` pair), anything else in `global`; the DS compiler
// turns each key into `--key`. Only the editor tells them apart, by the `ml-` prefix.
//
// Pure pieces (parsing, type, subject group, rows) are Node-tested; `loadMoleculeTokenCatalog` reads
// the molecule `.less` files from the stor once per session.

export const ML_PREFIX = 'ml-';

/** A design-system key that belongs to the molecules (`ml-border-width`, `_dark-ml-primary`). */
export function isComponentToken(name: string): boolean {
  const n = name.trim();
  return n.startsWith(ML_PREFIX) || n.startsWith(`_dark-${ML_PREFIX}`);
}

// ─── reading `var(--ml-x, fallback)` ─────────────────────────────────

export interface MlUse { name: string; fallback: string; }

/** Text up to the `)` closing the current `var(` — the fallback, nested `var()` included. */
function balancedTail(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      if (depth === 0) return text.slice(from, i);
      depth--;
    }
  }
  return text.slice(from);
}

/** Every `--ml-*` read in a css text, with its fallback ('' when the read has none). Nested reads count too. */
export function parseMlUses(css: string): MlUse[] {
  const out: MlUse[] = [];
  const re = /var\(\s*--(ml-[a-zA-Z0-9_-]+)\s*(,)?/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    out.push({ name: m[1], fallback: m[2] ? balancedTail(css, re.lastIndex).trim() : '' });
  }
  return out;
}

/** One entry per token, with the fallback written most often (ties: the first one seen). */
export function mergeMlUses(uses: Iterable<MlUse>): MlUse[] {
  const byName = new Map<string, Map<string, number>>();
  for (const u of uses) {
    const counts = byName.get(u.name) ?? new Map<string, number>();
    if (u.fallback) counts.set(u.fallback, (counts.get(u.fallback) ?? 0) + 1);
    byName.set(u.name, counts);
  }
  return [...byName].map(([name, counts]) => {
    let best = '';
    let bestN = 0;
    for (const [fb, n] of counts) if (n > bestN) { best = fb; bestN = n; }
    return { name, fallback: best };
  });
}

/** The literal under `var(--a, var(--b, 6px))` → `6px`; '' when the chain ends without a fallback. */
export function literalFallback(value: string): string {
  let v = value.trim();
  for (let guard = 0; guard < 8; guard++) {
    const m = /^var\(\s*--[a-zA-Z0-9_-]+\s*(?:,([\s\S]*))?\)$/.exec(v);
    if (!m) return v;
    if (m[1] === undefined) return '';
    v = m[1].trim();
  }
  return v;
}

// ─── the type of a token: which editor it gets ─────────────────────────

export type MlTokenType = 'color' | 'length' | 'ratio' | 'borderStyle' | 'duration' | 'text';

const NAMED_COLORS = new Set(['transparent', 'currentcolor', 'white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow', 'purple', 'pink', 'silver']);
const COLOR_FN = /^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)\(/i;

export function isColorValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v) || COLOR_FN.test(v) || NAMED_COLORS.has(v);
}

const LENGTH = /^(-?\d*\.?\d+)(px|rem|em|%)$/;

export function isLengthValue(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === '0' || LENGTH.test(v);
}

const DURATION = /^(\d*\.?\d+)(ms|s)$/;
const NUMBER = /^-?\d*\.?\d+$/;

/** Words in a token name that say "this is a color" when the fallback does not tell. */
const COLOR_WORDS = /(^|-)(primary|secondary|surface|outline|error|warning|success|info|color|gradient|on|bg|background|accent)(-|$)/;
const LENGTH_WORDS = /(^|-)(width|size|radius|gap|height|offset|padding|margin|spacing)(-|$)/;

/**
 * Which editor a token gets, from its name and its fallback. The name decides first where it is
 * unambiguous (`*-style`, `*-opacity`, `*-duration`), then the fallback's literal value.
 */
export function classifyMlToken(name: string, fallback: string): MlTokenType {
  const n = name.trim().replace(/^--/, '');
  const lit = literalFallback(fallback).toLowerCase();
  if (/(^|-)style$/.test(n)) return 'borderStyle';
  if (/(^|-)(opacity|scale)(-|$)/.test(n) && (!lit || NUMBER.test(lit))) return 'ratio';
  if (/(^|-)(duration|delay)(-|$)/.test(n) || DURATION.test(lit)) return 'duration';
  if (lit) {
    if (isColorValue(lit)) return 'color';
    if (isLengthValue(lit)) return 'length';
    return 'text';
  }
  if (COLOR_WORDS.test(n)) return 'color';
  if (LENGTH_WORDS.test(n)) return 'length';
  return 'text';
}

/** Slider range of a ratio token: opacity 0–1, a scale up to 2. */
export function ratioMax(name: string): number {
  return /(^|-)scale(-|$)/.test(name) ? 2 : 1;
}

export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'none'] as const;

// ─── subject groups (the order the inspector shows them) ──────────────

export type MlTokenGroup = 'colors' | 'border' | 'focus' | 'typography' | 'motion' | 'other';
export const ML_GROUP_ORDER: readonly MlTokenGroup[] = ['colors', 'border', 'focus', 'typography', 'motion', 'other'];

export function mlTokenGroup(name: string, type: MlTokenType): MlTokenGroup {
  if (type === 'color') return 'colors';
  if (type === 'duration' || /(^|-)(scale|transition|animation)(-|$)/.test(name)) return 'motion';
  if (/(^|-)(focus|disabled|opacity|active)(-|$)/.test(name)) return 'focus';
  if (/(^|-)(font|line|letter|text)(-|$)/.test(name)) return 'typography';
  if (/(^|-)(border|radius|shadow|outline)(-|$)/.test(name)) return 'border';
  return 'other';
}

// ─── editor values ──────────────────────────────────────────────────

/** `var(--role)` → `role`; anything else → null. */
export function roleOf(value: string): string | null {
  const m = /^var\(\s*--([a-zA-Z0-9_-]+)\s*\)$/.exec(value.trim());
  return m ? m[1] : null;
}

export function parseLength(value: string): { amount: string; unit: string } | null {
  const v = value.trim().toLowerCase();
  if (v === '0') return { amount: '0', unit: 'px' };
  const m = LENGTH.exec(v);
  return m ? { amount: m[1], unit: m[2] } : null;
}

/** `1.5s` → 1500, `200ms` → 200; null when it is not a duration. */
export function parseDurationMs(value: string): number | null {
  const m = DURATION.exec(literalFallback(value).toLowerCase());
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Math.round(m[2] === 's' ? n * 1000 : n);
}

/**
 * Design-system color roles that look like a good fit for a token (`ml-outline-focus` → roles with
 * "focus" or "outline"), best first. Only the base roles — no `-hover/-focus/-disabled` states.
 */
export function suggestRoles(token: string, roles: readonly string[], limit = 6): string[] {
  const words = token.replace(/^ml-/, '').split('-').filter(w => w.length > 2 && w !== 'dim');
  if (!words.length) return [];
  const scored = roles
    .map(role => ({ role, score: words.filter(w => role.split('-').includes(w)).length }))
    .filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score || a.role.length - b.role.length);
  return scored.slice(0, limit).map(r => r.role);
}

// ─── rows: the `ml-*` keys of a theme, apart from the other tokens ─────

export interface ColorRow { name: string; light: string; dark: string; }
export interface ValueRow { name: string; value: string; }

/** color map → rows, pairing `<token>` + `_dark-<token>` (dark '' = no dark value). */
export function colorMapToRows(color: Record<string, string>): ColorRow[] {
  return Object.entries(color)
    .filter(([k]) => !k.startsWith('_dark-'))
    .map(([name, light]) => ({ name, light, dark: color[`_dark-${name}`] ?? '' }));
}

export function valueMapToRows(map: Record<string, string>): ValueRow[] {
  return Object.entries(map).map(([name, value]) => ({ name, value }));
}

/** Split rows into the theme's own tokens and the molecule ones (`ml-*`), order kept. */
export function partitionMlRows<T extends { name: string }>(rows: readonly T[]): { base: T[]; ml: T[] } {
  const base: T[] = [];
  const ml: T[] = [];
  for (const r of rows) (isComponentToken(r.name) ? ml : base).push(r);
  return { base, ml };
}

export interface MlRows { colors: ColorRow[]; values: ValueRow[]; }

/**
 * Put a molecule token in the rows: a color in `colors` (light + optional dark), anything else in
 * `values`. A token that changes kind leaves the other list, so it never lives in both.
 */
export function upsertMlToken(rows: MlRows, name: string, next: { light: string; dark: string } | { value: string }): MlRows {
  const key = name.trim();
  if ('light' in next) {
    const colors = rows.colors.some(r => r.name.trim() === key)
      ? rows.colors.map(r => (r.name.trim() === key ? { name: key, light: next.light, dark: next.dark } : r))
      : [...rows.colors, { name: key, light: next.light, dark: next.dark }];
    return { colors, values: rows.values.filter(r => r.name.trim() !== key) };
  }
  const values = rows.values.some(r => r.name.trim() === key)
    ? rows.values.map(r => (r.name.trim() === key ? { name: key, value: next.value } : r))
    : [...rows.values, { name: key, value: next.value }];
  return { colors: rows.colors.filter(r => r.name.trim() !== key), values };
}

/** Drop a molecule token (its dark pair goes with the row): the molecules fall back to their default. */
export function removeMlToken(rows: MlRows, name: string): MlRows {
  const key = name.trim();
  return { colors: rows.colors.filter(r => r.name.trim() !== key), values: rows.values.filter(r => r.name.trim() !== key) };
}

// ─── values for ONE kind of molecule (theme `components`) ──────────

/** A value of one token for one molecule tag. `dark` only for colors ('' = the light value in both modes). */
export interface ComponentRow { tag: string; name: string; value: string; dark: string; }

/** The tag a value is stored under: the Studio's per-attempt suffix (`…-field-2`) dropped. */
export function baseMoleculeTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/-\d+$/, '');
}

export function componentKey(tag: string, name: string): string {
  return `${tag}/${name}`;
}

/** theme `components` → rows, pairing `<token>` + `_dark-<token>` per tag (a dark-only key still makes a row). */
export function componentMapToRows(components: Record<string, Record<string, string>> | undefined): ComponentRow[] {
  const out: ComponentRow[] = [];
  for (const [tag, keys] of Object.entries(components ?? {})) {
    if (!keys || typeof keys !== 'object') continue;
    const names = new Set<string>();
    for (const k of Object.keys(keys)) names.add(k.startsWith('_dark-') ? k.slice('_dark-'.length) : k);
    for (const name of names) out.push({ tag, name, value: keys[name] ?? '', dark: keys[`_dark-${name}`] ?? '' });
  }
  return out;
}

/** rows → theme `components`: empty values skipped, a tag left without keys disappears. Light keys first. */
export function componentRowsToMap(rows: readonly ComponentRow[]): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const pass of ['light', 'dark'] as const) {
    for (const r of rows) {
      const tag = r.tag.trim();
      const name = r.name.trim();
      const v = (pass === 'light' ? r.value : r.dark).trim();
      if (!tag || !name || !v) continue;
      const keys = out[tag] ?? (out[tag] = {});
      const key = pass === 'light' ? name : `_dark-${name}`;
      if (!(key in keys)) keys[key] = v;
    }
  }
  return out;
}

/** `components` flattened for the diff: `<tag>/<token>`, dark `_dark-<tag>/<token>` (so `baseName` still pairs them). */
export function flattenComponents(components: Record<string, Record<string, string>>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [tag, keys] of Object.entries(components)) {
    for (const [k, v] of Object.entries(keys)) {
      out[k.startsWith('_dark-') ? `_dark-${componentKey(tag, k.slice('_dark-'.length))}` : componentKey(tag, k)] = v;
    }
  }
  return out;
}

export function upsertComponentToken(rows: readonly ComponentRow[], tag: string, name: string, next: { value: string; dark: string }): ComponentRow[] {
  const t = baseMoleculeTag(tag);
  const n = name.trim();
  const row = { tag: t, name: n, value: next.value, dark: next.dark };
  return rows.some(r => r.tag === t && r.name === n) ? rows.map(r => (r.tag === t && r.name === n ? row : r)) : [...rows, row];
}

/** Drop a molecule's value (its dark pair goes with the row): that molecule falls back to the DS value, or its default. */
export function removeComponentToken(rows: readonly ComponentRow[], tag: string, name: string): ComponentRow[] {
  const t = baseMoleculeTag(tag);
  return rows.filter(r => !(r.tag === t && r.name === name.trim()));
}

/**
 * The preview copy of `components` for the Studio: each value is repeated for the suffixed tags
 * (`…-field-2`) found on the page, which the base-tag selector would miss. Never saved.
 */
export function withSuffixedTags(components: Record<string, Record<string, string>>, pageTags: Iterable<string>): Record<string, Record<string, string>> {
  const out = { ...components };
  for (const tag of pageTags) {
    const base = baseMoleculeTag(tag);
    if (base !== tag && components[base] && !out[tag]) out[tag] = components[base];
  }
  return out;
}

// ─── how many molecules read each token ────────────────────────────

export interface MlTokenInfo { count: number; fallback: string; }

/** Per token: how many distinct molecules read it, and the fallback they write most often. */
export function countTokenReaders(sources: readonly { id: string; text: string }[]): Map<string, MlTokenInfo> {
  const readers = new Map<string, Set<string>>();
  const uses: MlUse[] = [];
  for (const s of sources) {
    for (const u of parseMlUses(s.text)) {
      const set = readers.get(u.name) ?? new Set<string>();
      set.add(s.id);
      readers.set(u.name, set);
      uses.push(u);
    }
  }
  const fallbacks = new Map(mergeMlUses(uses).map(u => [u.name, u.fallback]));
  const out = new Map<string, MlTokenInfo>();
  for (const [name, set] of readers) out.set(name, { count: set.size, fallback: fallbacks.get(name) ?? '' });
  return out;
}

// ─── runtime: the molecule catalog in the stor ─────────────────────

const MOLECULE_FOLDER = /^molecules\/(group[a-z0-9]+)$/i;
/** Token → readers, and the molecule tags the catalog has (`group…--ml-…`, the file id IS the tag). */
export interface MoleculeCatalog { tokens: Map<string, MlTokenInfo>; tags: Set<string>; }

let _catalog: Promise<MoleculeCatalog> | null = null;

/**
 * Token → readers over every molecule `.less` the stor knows (`molecules/group*\/ml-*.less`, one per
 * molecule even when two projects carry it). Read once per session; an empty result (stor not ready)
 * is not cached, so the next call tries again.
 */
export function loadMoleculeTokenCatalog(): Promise<MoleculeCatalog> {
  if (_catalog) return _catalog;
  const run = (async () => {
    const started = performance.now();
    const files = new Map<string, any>();
    const all = (globalThis as any).mls?.stor?.files as Record<string, any> | undefined;
    for (const file of Object.values(all ?? {})) {
      if (!file || file.status === 'deleted' || file.extension !== '.less') continue;
      const m = MOLECULE_FOLDER.exec(file.folder || '');
      if (!m || !String(file.shortName).startsWith(ML_PREFIX)) continue;
      const id = `${m[1].toLowerCase()}--${file.shortName}`;
      if (!files.has(id)) files.set(id, file);
    }
    const sources: { id: string; text: string }[] = [];
    const entries = [...files];
    for (let i = 0; i < entries.length; i += 16) {
      const chunk = await Promise.all(entries.slice(i, i + 16).map(async ([id, file]) => {
        try {
          const content = await file.getContent();
          return typeof content === 'string' ? { id, text: content } : null;
        } catch {
          return null;
        }
      }));
      for (const c of chunk) if (c) sources.push(c);
    }
    const tokens = countTokenReaders(sources);
    console.debug(`[dsMoleculeTokens] catalog: ${sources.length} molecule(s), ${tokens.size} token(s), ${Math.round(performance.now() - started)}ms`);
    return { tokens, tags: new Set(files.keys()) };
  })();
  _catalog = run;
  run.then(cat => { if (!cat.tags.size && _catalog === run) _catalog = null; }, () => { if (_catalog === run) _catalog = null; });
  return run;
}
