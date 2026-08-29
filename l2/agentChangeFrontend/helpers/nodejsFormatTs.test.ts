/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/nodejsFormatTs.test.ts" enhancement="_blank"/>

// cf_format_codigo_gerado (27/ago): the generated .ts is formatted at write time in both runtimes.
// This suite proves the three contracts on the REAL evidence of run02/102047 (taskCatalogue.ts,
// 13KB in 35 lines, copied byte-for-byte into fixtures/ — the permanent test never depends on the
// disposable mls-102047 project):
//   1. byte-safety — formatting is whitespace-only: stripped-whitespace equality AND identical AST
//      (identical AST == identical compile), idempotent;
//   2. format×gates order — the pipeline formats BEFORE the textual gates (wiring asserted on both
//      runtimes' sources) AND the gates report the same findings on raw and formatted text;
//   3. i18n markers — @@addLanguage still recognizes the catalogue block after formatting.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatGeneratedTsCli, syntaxSignature } from './nodejsFormatTs.js';
import {
  collectChartEventIssues,
  collectMissingI18nBlockIssues,
  collectPageCatalogueIssues,
  collectPageCustomElementTagIssues,
  collectPageScenaryIssues,
  collectPageTemplateHygieneIssues,
  insertGeneratedTsLineBreaks,
  stripAllWhitespace,
} from './cfeMaterializeCore.js';

const FIXTURE = readFileSync(new URL('./fixtures/taskCatalogue102047Page11.txt', import.meta.url), 'utf8');
const FIXTURE_PATH = '_102047_/l2/todo/web/desktop/page11/taskCatalogue.ts';

test('run02 evidence: the 35-line taskCatalogue becomes one instruction per line', () => {
  assert.ok(FIXTURE.split('\n').length <= 36, 'fixture must be the unformatted evidence');
  const formatted = formatGeneratedTsCli(FIXTURE);
  assert.notEqual(formatted, FIXTURE, 'the formatter must actually act on the evidence');
  const lines = formatted.split('\n');
  assert.ok(lines.length > 150, `expected >150 lines, got ${lines.length}`);
  // The jammed render* method bodies are split: statements land on their own lines.
  assert.match(formatted, /\n\s*const rows: QryListTaskOutput\[\] = this\.qryListTaskData \?\? \[\];\n/u);
  // The jammed i18n catalogue keys are split one per line.
  assert.match(formatted, /\n\s*'intent\.taskCatalogue\.qryListTask\.list\.column\.ownerId\.label': 'Identificador do proprietário',\n/u);
});

test('byte-safety on the real evidence: whitespace-only, identical AST, idempotent', () => {
  const formatted = formatGeneratedTsCli(FIXTURE);
  assert.equal(stripAllWhitespace(formatted), stripAllWhitespace(FIXTURE));
  // Identical AST (every node kind + every leaf text, template parts included) == identical compile.
  assert.equal(syntaxSignature(formatted), syntaxSignature(FIXTURE));
  assert.equal(formatGeneratedTsCli(formatted), formatted, 'formatting must be idempotent');
});

test('format×gates: the textual gates report the same findings on raw and formatted evidence', () => {
  const formatted = formatGeneratedTsCli(FIXTURE);
  assert.deepEqual(collectPageTemplateHygieneIssues(formatted), collectPageTemplateHygieneIssues(FIXTURE));
  assert.deepEqual(collectPageCatalogueIssues(formatted), collectPageCatalogueIssues(FIXTURE));
  assert.deepEqual(collectMissingI18nBlockIssues(formatted, 'page'), collectMissingI18nBlockIssues(FIXTURE, 'page'));
  assert.deepEqual(collectChartEventIssues(formatted), collectChartEventIssues(FIXTURE));
  assert.deepEqual(collectPageCustomElementTagIssues(formatted, FIXTURE_PATH), collectPageCustomElementTagIssues(FIXTURE, FIXTURE_PATH));
  const scenaryShared = { states: [{ kind: 'uiScenary', name: 'uiScenary', valueSet: ['base'] }], scenaries: [{ value: 'base', kind: 'base' }] };
  assert.deepEqual(collectPageScenaryIssues(formatted, scenaryShared), collectPageScenaryIssues(FIXTURE, scenaryShared));
});

test('format×gates: a defective page keeps its finding after formatting', () => {
  const broken = 'import { html } from \'lit\';\nexport class P extends Base { render() { return html`<i>${this.x === 1 ? html`<p>e</p>` : nothing}</i>`; } }\nfunction nothing() { return html``; }';
  const formatted = formatGeneratedTsCli(broken);
  assert.notEqual(formatted, broken);
  const raw = collectPageTemplateHygieneIssues(broken);
  assert.equal(raw.length, 1, raw.join(' | '));
  assert.deepEqual(collectPageTemplateHygieneIssues(formatted), raw);
});

test('i18n block: markers and catalogue stay recognizable by @@addLanguage after formatting', () => {
  const formatted = formatGeneratedTsCli(FIXTURE);
  // Same recognition addLanguageCore applies: indexOf on the literal markers, then consts in the block.
  const start = formatted.indexOf('/// **collab_i18n_start**');
  const end = formatted.indexOf('/// **collab_i18n_end**');
  assert.ok(start >= 0 && end > start, 'markers must survive formatting');
  const block = formatted.slice(start, end);
  const locales = [...block.matchAll(/const\s+pageMessage_[A-Za-z0-9_]+/gu)].map(match => match[0]);
  assert.deepEqual(locales, ['const pageMessage_pt_br', 'const pageMessage_en', 'const pageMessage_es']);
  assert.match(formatted, /^\s*\/\/\/ \*\*collab_i18n_start\*\*\s*$/mu, 'start marker keeps its own line');
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

test('wiring: both runtimes format BEFORE the textual gates and before the write', () => {
  const cli = readFileSync(new URL('../nodejsMaterializeL2.ts', import.meta.url), 'utf8');
  // The formatted string is the `code` the hygiene gates read and writeGeneratedArtifacts persists.
  assert.match(cli, /formatGeneratedTsCli\(applyHeader\(p\.item\.outputPath, r\.code\)\)/u);
  assert.ok(
    cli.indexOf('formatGeneratedTsCli(applyHeader(') < cli.indexOf('collectPageTemplateHygieneIssues(code)'),
    'CLI must format before the hygiene gates read `code`',
  );
  const gen = readFileSync(new URL('../steps/materialize/agentCfeMaterializeGen.ts', import.meta.url), 'utf8');
  assert.match(gen, /formatGeneratedTsInStudio\(applyHeader\(pipelineItem\.outputPath, normalizeGeneratedCode\(/u);
  assert.ok(
    gen.indexOf('formatGeneratedTsInStudio(applyHeader(') < gen.indexOf('saveGeneratedTs(parsed.project, parsed.level, parsed.folder, parsed.shortName, code)'),
    'Studio must format before saving',
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
