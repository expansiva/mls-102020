/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/nodejsFormatTs.test.ts" enhancement="_blank"/>

// cf_format_codigo_gerado (27/ago): the generated .ts is formatted at write time in both runtimes.
// This suite proves the contracts on inline samples:
//   1. byte-safety — formatting is whitespace-only: stripped-whitespace equality AND identical AST
//      (identical AST == identical compile), idempotent;
//   2. format×gates order — the pipeline formats BEFORE the textual gates (wiring asserted on both
//      runtimes' sources) AND a defective page keeps its finding after formatting.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatGeneratedTsCli, syntaxSignature } from './nodejsFormatTs.js';
import {
  collectPageTemplateHygieneIssues,
  insertGeneratedTsLineBreaks,
  stripAllWhitespace,
} from './cfeMaterializeCore.js';

test('format×gates: a defective page keeps its finding after formatting', () => {
  const broken = 'import { html } from \'lit\';\nexport class P extends Base { render() { return html`<i>${this.x === 1 ? html`<p>e</p>` : nothing}</i>`; } }\nfunction nothing() { return html``; }';
  const formatted = formatGeneratedTsCli(broken);
  assert.notEqual(formatted, broken);
  const raw = collectPageTemplateHygieneIssues(broken);
  assert.equal(raw.length, 1, raw.join(' | '));
  assert.deepEqual(collectPageTemplateHygieneIssues(formatted), raw);
});

test('line breaks never touch template text, strings, comments or regex bodies', () => {
  const code = [
    "const re = /;{}[/]/g; const s = 'a; { b; }'; // c; { d; }",
    'export function f() { const t = html`<p>a; b</p><span>${cond ? list.map(x => { const y = x.id; return html`<i>${y}</i>`; }) : nothing}</span>`; return t; }',
  ].join('\n');
  const formatted = formatGeneratedTsCli(code);
  assert.equal(stripAllWhitespace(formatted), stripAllWhitespace(code));
  assert.equal(syntaxSignature(formatted), syntaxSignature(code));
  assert.match(formatted, /<p>a; b<\/p>/u, 'template text untouched');
  assert.match(formatted, /\/;\{\}\[\/\]\/g/u, 'regex body untouched');
  assert.match(formatted, /'a; \{ b; \}'/u, 'string untouched');
});

test('conservative: for-headers, short inline objects and joined keywords are not split', () => {
  const code = 'function f() { for (let i = 0; i < 3; i++) { g({ page: 1 }); } if (a) { h(); } else { k(); } }';
  const formatted = formatGeneratedTsCli(code);
  assert.match(formatted, /for \(let i = 0; i < 3; i\+\+\) \{/u, 'for-header semicolons stay inline');
  assert.match(formatted, /g\(\{ page: 1 \}\);/u, 'short object literal stays inline');
  assert.match(formatted, /\} else \{/u, '`} else {` is never split');
  assert.equal(syntaxSignature(formatted), syntaxSignature(code));
});

test('conservative: anything the scanner cannot classify comes back unchanged', () => {
  const unterminated = 'const t = html`<p>never closed';
  assert.equal(insertGeneratedTsLineBreaks(unterminated), unterminated);
  const unbalanced = 'export function f() { return 1;';
  assert.equal(insertGeneratedTsLineBreaks(unbalanced), unbalanced);
});

test('wiring: Studio resolves MLS imports, then formats the exact bytes saved and compiled', () => {
  const cli = readFileSync(new URL('../nodejsMaterializeL2.ts', import.meta.url), 'utf8');
  // The formatted string is the `code` the hygiene gates read and writeGeneratedArtifacts persists.
  assert.match(cli, /formatGeneratedTsCli\(applyHeader\(p\.item\.outputPath, r\.code\)\)/u);
  assert.ok(
    cli.indexOf('formatGeneratedTsCli(applyHeader(') < cli.indexOf('collectPageTemplateHygieneIssues(code)'),
    'CLI must format before the hygiene gates read `code`',
  );
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /normalizeMlsImports\(sharedGuard\.code, \{ outputPath: pipelineItem\.outputPath, \.\.\.importContext \}\)/u);
  assert.match(gen, /const formatted = await formatGeneratedTsInStudio\(normalized\.code\)/u);
  assert.ok(
    gen.indexOf('formatGeneratedTsInStudio(normalized.code)') < gen.indexOf('saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, formatted)'),
    'Studio must format resolved imports before saving the same bytes later compiled',
  );
  // Both surfaces share the SAME pure line-break stage, so they cannot drift on what gets split.
  const studio = readFileSync(new URL('./cfeMaterializeStudio.ts', import.meta.url), 'utf8');
  assert.match(studio, /insertGeneratedTsLineBreaks\(code\)/u);
  assert.match(studio, /editor\.action\.formatDocument/u);
  assert.match(studio, /stripAllWhitespace\(formatted\) === stripAllWhitespace\(code\)/u);
});

// cf_format_monaco_dispose (28/ago): the per-call model+editor create/dispose left the TS worker's
// async validation answering a disposed model — run01/102047 flooded the console with one
// "Could not find source file: 'inmemory://model/N'" per generated file. The fix is ONE persistent
// singleton; this wiring test pins the shape so a dispose-per-call cannot come back silently.
test('wiring: the Studio formatter reuses one persistent model+editor (no create/dispose per call)', () => {
  const studio = readFileSync(new URL('./cfeMaterializeStudio.ts', import.meta.url), 'utf8');
  const start = studio.indexOf('export async function formatGeneratedTsInStudio');
  assert.ok(start >= 0, 'formatGeneratedTsInStudio must exist');
  const end = studio.indexOf('\nexport ', start);
  const body = studio.slice(start, end > start ? end : studio.length);
  assert.ok(!body.includes('createModel('), 'no model creation per call — each one fires an async worker validation');
  assert.ok(!body.includes('.dispose('), 'no dispose per call — a disposed model orphans the worker response');
  assert.match(body, /getFormatterSingleton\(\)/u, 'the call must go through the persistent singleton');
  assert.match(body, /setValue\(''\)/u, 'the singleton is emptied after each call (no retained content)');
  // The singleton model has a stable, self-describing URI (never the anonymous inmemory://model/N).
  assert.match(studio, /monaco\.Uri\.parse\('inmemory:\/\/collab-cfe-formatter\//u);
});
