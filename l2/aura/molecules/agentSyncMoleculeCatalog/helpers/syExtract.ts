/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.ts" enhancement="_blank"/>

// Reading one molecule's data from its SOURCE TEXT, and the group's scenario table from its CURRENT
// index.ts. Pure — no I/O, no mls.* access; the step reads the files and hands their text here.
//
// ⚠️ THE TAG COMES FROM THE REAL `@customElement(...)` OF THE MOLECULE'S .ts, NEVER FROM THE FILENAME
// (todo §4.4 — this is what got 45/45 tags right in the pilot). syExtractTag reads the .ts; everything
// else (# Objective, layoutConfig) is read from the molecule's .defs.ts.
//
// ⚠️ SCENARIOS ARE THE ONE PART OF THE CATALOG THAT IS NOT DERIVED (todo §4.4) — they are editorial. But
// the very first time a group is synced, there is nowhere else for them to come from except the group's
// CURRENT index.ts (its hand-authored `renderReferenceTable()`), so syHarvestScenarios reads that table
// mechanically (no LLM: it is a data read, not composition — the LLM in s3 is only for the Lit page
// shape). ⚠️ Table columns use free, abbreviated field names (`floatingTextInput`, not the tag) — matched
// against a molecule by converting its short name to camelCase, not by string similarity: measured
// against the six seeded groups, that conversion is exact for every column.

import { SyLayoutAxes, SyScenario } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

// ---- one molecule ----

export function syExtractTag(tsSource: string): string | null {
  const match = /@customElement\(\s*['"]([^'"]+)['"]\s*\)/.exec(tsSource || '');
  return match ? match[1] : null;
}

export interface SyExtractedDefs {
  objective: string;
  layoutConfig: Record<string, string>;
}

/** Reads `# Objective` (COMPLETE — never truncated, todo §4.4) and `layoutConfig` from a .defs.ts. */
export function syExtractMoleculeDefs(defsSource: string): SyExtractedDefs | null {
  const text = defsSource || '';
  if (!text.trim()) return null;
  const objective = extractSection(text, 'Objective');
  if (!objective) return null;
  return { objective, layoutConfig: extractLayoutConfig(text) };
}

function extractSection(text: string, heading: string): string {
  const marker = `# ${heading}`;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const from = start + marker.length;
  const rest = text.slice(from);
  const nextHeading = rest.search(/\n#\s+[A-Za-z]/);
  const raw = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}

function extractLayoutConfig(text: string): Record<string, string> {
  const marker = 'export const layoutConfig = {';
  const start = text.indexOf(marker);
  if (start < 0) return {};
  const from = start + marker.length;
  const end = text.indexOf('};', from);
  if (end < 0) return {};
  const body = text.slice(from, end);
  const out: Record<string, string> = {};
  const re = /([A-Za-z0-9_]+)\s*:\s*["']([^"']*)["']/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) out[match[1]] = match[2];
  return out;
}

// ---- which layoutConfig axes vary across a group's siblings (todo §4.4 / analysis §6.2) ----

/**
 * An axis is published only when at least two DISTINCT values exist among the molecules that DEFINE it.
 * A molecule that does not define the axis at all contributes nothing to that set — absence is "not
 * defined", never a value of its own (todo §4.4: "eixo ausente é 'não definido', não valor diferente").
 */
export function syVaryingAxes(layoutConfigs: Array<Record<string, string>>): string[] {
  const valuesByAxis = new Map<string, Set<string>>();
  for (const config of layoutConfigs) {
    for (const [axis, value] of Object.entries(config)) {
      if (!valuesByAxis.has(axis)) valuesByAxis.set(axis, new Set());
      valuesByAxis.get(axis)?.add(value);
    }
  }
  return [...valuesByAxis.entries()]
    .filter(([, values]) => values.size >= 2)
    .map(([axis]) => axis)
    .sort((a, b) => a.localeCompare(b));
}

/** The `layout` object one molecule publishes: only the varying axes IT defines, or undefined if none. */
export function syPublishedLayout(layoutConfig: Record<string, string>, varyingAxes: string[]): SyLayoutAxes | undefined {
  const out: SyLayoutAxes = {};
  for (const axis of varyingAxes) {
    if (Object.prototype.hasOwnProperty.call(layoutConfig, axis)) out[axis] = layoutConfig[axis];
  }
  return Object.keys(out).length ? out : undefined;
}

// ---- scenarios already in a PREVIOUSLY GENERATED index.defs.ts (resync must not clobber them) ----

/**
 * Reads `export const scenarios = [ {...}, {...} ]` back from a group's index.defs.ts as this agent
 * itself writes it (one row per line — never the free-form, multi-line shape a hand-authored
 * `renderReferenceTable()` uses, which is what syHarvestScenarios is for).
 *
 * Returns null when the file has no `scenarios` export at all: either a brand-new group, or the
 * one-line stub every non-piloted group has today. The caller's job is to tell "null" (nothing to
 * preserve, try harvesting instead) apart from "[] on purpose" (a human cleared it — leave it alone).
 */
export function syExtractExistingScenarios(defsSource: string): SyScenario[] | null {
  const marker = 'export const scenarios = [';
  const start = (defsSource || '').indexOf(marker);
  if (start < 0) return null;
  const from = start + marker.length;
  const end = defsSource.indexOf('\n];', from);
  if (end < 0) return null;

  const scenarios: SyScenario[] = [];
  for (const line of defsSource.slice(from, end).split('\n')) {
    const scenarioMatch = /scenario:\s*'((?:\\.|[^'\\])*)'/.exec(line);
    if (!scenarioMatch) continue;
    const listMatch = /recommended:\s*\[([^\]]*)\]/.exec(line);
    const recommended = listMatch ? [...listMatch[1].matchAll(/'((?:\\.|[^'\\])*)'/g)].map(m => m[1]) : [];
    scenarios.push({ scenario: scenarioMatch[1], recommended });
  }
  return scenarios;
}

// ---- scenarios, harvested from the group's CURRENT index.ts (first sync only — see file header) ----

/**
 * Returns null when there is nothing to harvest: a brand-new group with no index.ts (G1), or a group
 * whose index.ts was already migrated (no `const rows` table left to read — it imports scenarios from
 * `./index.defs` instead). The caller decides what null means for it (empty scenarios, or "keep what is
 * already in the .defs.ts unchanged").
 */
export function syHarvestScenarios(indexTsSource: string, molecules: Array<{ tag: string }>): SyScenario[] | null {
  const rows = parseRowsBlock(indexTsSource || '');
  if (!rows) return null;

  const matchField = buildFieldMatcher(molecules);

  return rows
    .filter(row => row.scenario)
    .map(row => ({
      scenario: row.scenario,
      // A field that matches no molecule of THIS group (e.g. the original table recommended a molecule
      // that actually lives in a different group) is dropped, not guessed — todo §4.4.
      recommended: row.trueFields.map(matchField).filter((tag): tag is string => Boolean(tag)),
    }));
}

/**
 * Matches a table's boolean FIELD NAME to a molecule TAG by tokens, not by string similarity — measured
 * against the six seeded groups, groupViewTable is why: its fields are free abbreviations
 * (`detailGrid`, `advanced`, plain `data`), not `kebabToCamel(shortName)`.
 *
 * A field's tokens are matched against every molecule's own token set (no stopword pass — 'table' is
 * NOT common to every groupViewTable molecule either, `ml-lcrud-detail-grid` has none of it, so a fixed
 * stopword list is not a safe generalization). (1) An EXACT set match wins outright (`grouping` ==
 * the one molecule whose tokens are exactly {grouping}). (2) Failing that, among molecules whose tokens
 * are a SUPERSET of the field's (`detailGrid` -> {detail, grid} is a subset only of
 * lcrud-detail-grid's {lcrud, detail, grid}), the UNIQUE SMALLEST superset wins — bare `data` is a
 * subset of five `*-data-*` molecules, but `ml-data-table` {data, table} is the only one with no token
 * beyond what the field named, so it is the most specific match, the same way a human reading a
 * `data: true` column next to `advanced: true` and `select: true` columns reads it as the PLAIN table.
 * A genuine tie (two equally-small supersets) is left unmatched rather than guessed.
 *
 * ⚠️ SOME GROUPS KEEP THE 'ml' PREFIX IN THE FIELD NAME (`mlDateIntervalDrag`), most drop it
 * (`addressField`). Measured across all 30 groups with a real index.ts (D-E3 sweep): treating a leading
 * 'ml' token as noise on the FIELD side only — molecule tokens never carry it, `ml-` is already stripped
 * before tokenizing — turned 4 of the 7 groups the naive matcher flagged as "referencing another group"
 * into exact, in-group matches. It is never a discriminating word, so dropping it is safe both ways.
 */
function buildFieldMatcher(molecules: Array<{ tag: string }>): (field: string) => string | null {
  const candidates = molecules.map(({ tag }) => {
    const shortName = tag.includes('--') ? (tag.split('--').pop() as string) : tag;
    return { tag, tokens: new Set(tokensOf(shortName.replace(/^ml-/, ''))) };
  });

  return (field: string): string | null => {
    const fieldTokens = new Set(tokensOf(field).filter(token => token !== 'ml'));
    if (!fieldTokens.size) return null;

    const exact = candidates.find(c => setsEqual(c.tokens, fieldTokens));
    if (exact) return exact.tag;

    const supersets = candidates.filter(c => isSuperset(c.tokens, fieldTokens));
    if (!supersets.length) return null;

    const smallest = Math.min(...supersets.map(c => c.tokens.size));
    const smallestOnes = supersets.filter(c => c.tokens.size === smallest);
    if (smallestOnes.length === 1) return smallestOnes[0].tag;

    // Tier 3: a compound word spelled as ONE word in the filename ('mindmap', 'orgchart') but split by
    // camelCase in the field ('mindMap' -> {mind, map}) matches neither exactly nor as a token superset.
    // Squash both sides in their NATURAL (reading) order — a Set built from tokensOf() iterates in
    // insertion order, so joining without sorting preserves adjacency — and require a UNIQUE substring
    // match: 'mindmap' is a contiguous substring of only one candidate's squashed tokens
    // ('viewhierarchymindmap'); sorting first would scramble 'mind'+'map' into 'mapmind', which is NOT a
    // substring of the candidate and silently breaks this tier — do not sort.
    const squashedField = [...fieldTokens].join('');
    const squashedCandidates = candidates.filter(c => {
      const squashed = [...c.tokens].join('');
      return squashed.includes(squashedField) || squashedField.includes(squashed);
    });
    return squashedCandidates.length === 1 ? squashedCandidates[0].tag : null;
  };
}

/**
 * camelCase or kebab-case -> lowercase tokens: 'detailGrid' / 'detail-grid' -> ['detail', 'grid'].
 * Also splits a letter/digit boundary ('scanCode1d' -> ['scan', 'code', '1d']) — measured on
 * groupScanCode: without it, 'scanCode1d' tokenizes as {scan, code1d}, one merged token short of
 * `ml-scan-code-1d`'s {scan, code, 1d}, and a real in-group molecule reads as a foreign one.
 */
function tokensOf(text: string): string[] {
  return text
    .replace(/([a-z])([0-9])/g, '$1-$2')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .split(/[-_]+/)
    .map(token => token.toLowerCase())
    .filter(Boolean);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function isSuperset(superset: Set<string>, subset: Set<string>): boolean {
  for (const item of subset) if (!superset.has(item)) return false;
  return true;
}

interface SyParsedRow {
  scenario: string;
  /** Boolean field names that were `true`, in declaration order. */
  trueFields: string[];
}

/** Finds `const rows = [ {...}, {...} ]` and splits it into individual row object chunks. */
function parseRowsBlock(text: string): SyParsedRow[] | null {
  const constAt = text.indexOf('const rows');
  if (constAt < 0) return null;
  const bracketStart = text.indexOf('[', text.indexOf('=', constAt));
  if (bracketStart < 0) return null;

  const bracketEnd = matchDelimiter(text, bracketStart, '[', ']');
  if (bracketEnd < 0) return null;
  const body = text.slice(bracketStart + 1, bracketEnd);

  const rows: SyParsedRow[] = [];
  let depth = 0;
  let chunkStart = -1;
  let quote: string | null = null;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (char === '\\') { index += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') {
      if (depth === 0) chunkStart = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && chunkStart >= 0) {
        rows.push(parseRowObject(body.slice(chunkStart, index + 1)));
        chunkStart = -1;
      }
    }
  }
  return rows;
}

/** From `bracketStart` (pointing at an opening delimiter) to its match, respecting string literals. */
function matchDelimiter(text: string, start: number, open: string, close: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === '\\') { index += 1; continue; }
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function parseRowObject(chunk: string): SyParsedRow {
  const scenarioMatch = /scenario:\s*(['"])((?:\\.|(?!\1).)*)\1/.exec(chunk);
  const scenario = scenarioMatch ? scenarioMatch[2] : '';
  const trueFields: string[] = [];
  const fieldRe = /([A-Za-z0-9_]+):\s*(true|false)\b/g;
  let match: RegExpExecArray | null;
  while ((match = fieldRe.exec(chunk))) {
    if (match[2] === 'true') trueFields.push(match[1]);
  }
  return { scenario, trueFields };
}
