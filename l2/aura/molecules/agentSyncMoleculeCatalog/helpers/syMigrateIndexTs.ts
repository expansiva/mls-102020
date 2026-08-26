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
// Matched on the MODULE NAME, not the whole specifier: the specifier is absolute
// ('/_102053_/l2/molecules/groupenterdate/index.defs.js') and carries the project number, which differs
// per project — while the earlier build emitted a relative './index.defs'. Matching the name alone keeps
// a page migrated by either build recognized as migrated, so a re-run never migrates twice.
const ALREADY_MIGRATED_MARKER = 'index.defs';

/**
 * `sharedImportReference` is the import specifier for the shared renderer, e.g.
 * '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js'; `indexDefsReference` is the group's own
 * level-2 file, e.g. '/_102053_/l2/molecules/groupenterdate/index.defs.js'. Both are passed in rather
 * than hardcoded so the pure helper does not know about project layout, and so a test can point them at
 * fixture paths.
 *
 * ⚠️ BOTH MUST BE ABSOLUTE '/_project_/...' SPECIFIERS, and a named import ends in '.js'. The first
 * build emitted a RELATIVE "from './index.defs'" and it did not resolve in the Studio: swept the whole
 * l2 tree on 2026-08-26 and the only relative import in it was the one this migrator had just written —
 * every other module, in every project, is imported by absolute path.
 */
export function syMigrateIndexTs(source: string, sharedImportReference: string, indexDefsReference: string): SyMigrationResult {
  const text = source || '';
  if (!text.trim()) return { migrated: text, changed: false, reason: 'empty file' };
  // Already migrated — but by WHICH build? An earlier one emitted a relative './index.defs', and a
  // later one an absolute path without the '.js' a named import needs; neither resolves in the Studio.
  // Treating "already migrated" as "nothing to do" would leave those pages broken forever, because the
  // page never migrates twice. So a migrated page with the WRONG specifier gets its import line
  // rewritten in place — the method body is already the 3-line call and must not be touched again, and
  // re-running the full migration would duplicate the imports.
  if (importsIndexDefs(text)) {
    const fixed = rewriteIndexDefsImport(text, indexDefsReference);
    if (fixed === text) return { migrated: text, changed: false, reason: 'já importa molecules/scenarios do index.defs' };
    return { migrated: fixed, changed: true };
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
  const migrated = insertImports(withNewMethod, sharedImportReference, indexDefsReference);
  return { migrated, changed: true };
}

/**
 * Inserts the two imports right after the LAST existing `import ...;` line — measured across all 30
 * groups: that line is always the last molecule side-effect import, immediately followed by a blank
 * line and then the `@customElement` decorator, so this position never lands inside a comment block or
 * the class body.
 */
function insertImports(text: string, sharedImportReference: string, indexDefsReference: string): string {
  const importLineRe = /^import .+;$/gm;
  let lastMatchEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importLineRe.exec(text))) lastMatchEnd = match.index + match[0].length;
  if (lastMatchEnd < 0) return text; // no import line found — leave the file alone rather than guess

  const newImports = [
    '',
    `import { molecules, scenarios } from '${indexDefsReference}';`,
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

/** True when the page already pulls the catalog from its group's index.defs — either specifier form. */
function importsIndexDefs(text: string): boolean {
  return /^import\s*\{[^}]*\}\s*from\s*['"][^'"]*index\.defs(?:\.js)?['"];?$/m.test(text);
}

/**
 * Rewrites an existing `import { molecules, scenarios } from '<anything ending in index.defs[.js]>';`
 * to the canonical absolute specifier. Returns the input unchanged when it is already canonical.
 */
function rewriteIndexDefsImport(text: string, indexDefsReference: string): string {
  return text.replace(
    /^(import\s*\{[^}]*\}\s*from\s*)['"][^'"]*index\.defs(?:\.js)?['"];?$/m,
    `$1'${indexDefsReference}';`,
  );
}
