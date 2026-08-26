/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.ts" enhancement="_blank"/>

// The E8a migration surgery: replaces a group's `renderReferenceTable()` method body with a thin call
// into the shared renderer, and adds the two imports it needs. Pure — no I/O; the step reads/writes the
// file, this only transforms text.
//
// ⚠️ THE WHOLE METHOD BODY IS REPLACED, not edited piecemeal. Measured across all 30 real groups
// (E8 prep, 2026-08-25): the `rows`/`headers` declaration shape is NOT consistent — 27 groups inline
// `Array<{...}>`, one declares `interface Row {...}` inside the method, one declares `type Row = {...}`
// inside the method, one (`groupEnterMoney`) has no type annotation on `rows` at all. All four shapes
// live ENTIRELY inside the method body (never at module or class scope), so replacing the whole method
// sidesteps every one of those shapes rather than needing to parse each — the only thing that has to be
// exactly right is finding where the method starts and where it ends.
//
// ⚠️ FINDING THE END NEEDS A REAL (if small) PARSER, not a naive brace counter: the body contains Lit
// template literals whose `${...}` interpolations can themselves contain MORE template literals
// (`${headers.map(h => html\`<th>${h.label}</th>\`)}`) — a brace inside plain template TEXT must not
// count, but a brace inside a `${}` expression must. findMatchingBrace below is a small stack-based
// scanner for exactly that: 'code' mode counts braces normally and enters 'template' mode on a raw
// backtick; 'template' mode ignores braces in plain text and enters 'code' mode on `${`.

export interface SyMigrationResult {
  migrated: string;
  changed: boolean;
  /** Set when changed is false — why nothing was done. */
  reason?: string;
}

const METHOD_MARKER = 'private renderReferenceTable(): TemplateResult {';
const ALREADY_MIGRATED_MARKER = "from './index.defs'";

/**
 * `sharedImportReference` is the import specifier for the shared renderer, e.g.
 * '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js' — passed in rather than hardcoded so the
 * pure helper does not know about project layout, and so a test can point it at a fixture path.
 */
export function syMigrateIndexTs(source: string, sharedImportReference: string): SyMigrationResult {
  const text = source || '';
  if (!text.trim()) return { migrated: text, changed: false, reason: 'empty file' };
  if (text.includes(ALREADY_MIGRATED_MARKER)) {
    return { migrated: text, changed: false, reason: 'already imports scenarios from ./index.defs' };
  }

  const markerAt = text.indexOf(METHOD_MARKER);
  if (markerAt < 0) {
    return { migrated: text, changed: false, reason: "no 'private renderReferenceTable(): TemplateResult {' method found" };
  }

  const openBraceAt = markerAt + METHOD_MARKER.length - 1; // the '{' the marker itself ends with
  const closeBraceAt = findMatchingBrace(text, openBraceAt);
  if (closeBraceAt < 0) {
    return { migrated: text, changed: false, reason: 'method body has no matching closing brace (unbalanced template literal or string)' };
  }

  const before = text.slice(0, markerAt);
  const after = text.slice(closeBraceAt + 1);
  const newMethod = [
    'private renderReferenceTable(): TemplateResult {',
    '    return renderCatalogReferenceTable(molecules, scenarios);',
    '  }',
  ].join('\n');

  const withNewMethod = `${before}${newMethod}${after}`;
  const migrated = insertImports(withNewMethod, sharedImportReference);
  return { migrated, changed: true };
}

/**
 * Inserts the two imports right after the LAST existing `import ...;` line — measured across all 30
 * groups: that line is always the last molecule side-effect import, immediately followed by a blank
 * line and then the `@customElement` decorator, so this position never lands inside a comment block or
 * the class body.
 */
function insertImports(text: string, sharedImportReference: string): string {
  const importLineRe = /^import .+;$/gm;
  let lastMatchEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importLineRe.exec(text))) lastMatchEnd = match.index + match[0].length;
  if (lastMatchEnd < 0) return text; // no import line found — leave the file alone rather than guess

  const newImports = [
    '',
    "import { molecules, scenarios } from './index.defs';",
    `import { renderCatalogReferenceTable } from '${sharedImportReference}';`,
  ].join('\n');

  return `${text.slice(0, lastMatchEnd)}${newImports}${text.slice(lastMatchEnd)}`;
}

/**
 * From `openBraceAt` (the index of a '{'), returns the index of its matching '}', correctly skipping
 * braces inside string/template literal TEXT while still counting braces inside a template literal's
 * `${...}` interpolations — including interpolations that themselves contain nested template literals.
 * Returns -1 if the input runs out before the brace closes (malformed/truncated source).
 */
function findMatchingBrace(text: string, openBraceAt: number): number {
  type Mode = 'code' | 'template';
  const stack: Mode[] = ['code'];
  let i = openBraceAt + 1;

  while (i < text.length) {
    const mode = stack[stack.length - 1];
    const ch = text[i];

    if (mode === 'template') {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { stack.pop(); i += 1; continue; }
      if (ch === '$' && text[i + 1] === '{') { stack.push('code'); i += 2; continue; }
      i += 1;
      continue;
    }

    // mode === 'code'
    if (ch === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      i = end < 0 ? text.length : end + 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (ch === "'" || ch === '"') {
      const quote = ch;
      i += 1;
      while (i < text.length && text[i] !== quote) i += text[i] === '\\' ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch === '`') { stack.push('template'); i += 1; continue; }
    if (ch === '{') { stack.push('code'); i += 1; continue; }
    if (ch === '}') {
      stack.pop();
      i += 1;
      if (stack.length === 0) return i - 1;
      continue;
    }
    i += 1;
  }
  return -1;
}

// ---- triggers (G1 / G3) ----

/** G1: the group has no index.ts at all. */
export function syNeedsIndexTsCreation(indexTsExists: boolean): boolean {
  return !indexTsExists;
}

/** G3: the group's index.ts exists and still has the old code-table, not the migrated import. */
export function syNeedsIndexTsMigration(indexTsExists: boolean, indexTsSource: string): boolean {
  return indexTsExists && !(indexTsSource || '').includes(ALREADY_MIGRATED_MARKER);
}
