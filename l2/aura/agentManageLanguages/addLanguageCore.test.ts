/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/addLanguageCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyTranslatedI18nBlock, constDeclarations, decideQueue, extractI18nBlock, hasPageCatalogue,
  I18N_UNTRANSLATED_MARKER, isPageCatalogueFileName, isPageCatalogueFolder, stripUntranslatedMarkers,
  TranslatedBlockError,
} from '/_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.js';

/** A page catalogue as the skeleton emits it: every runtime locale from birth, default first. */
function pageCatalogue(options: { ptTranslated?: boolean; marked?: boolean; prefix?: string; type?: string } = {}): string {
  const prefix = options.prefix ?? 'pageMessage';
  const type = options.type ?? 'PageMessageType';
  const marker = options.marked === false ? '' : ` // ${I18N_UNTRANSLATED_MARKER}`;
  return [
    "import { html } from 'lit';",
    '',
    '/// **collab_i18n_start**',
    `const ${prefix}_en = {`,
    `  'column.project.name.label': 'Name',`,
    `  'column.project.address.label': 'Address',`,
    '};',
    `type ${type} = typeof ${prefix}_en;`,
    `const ${prefix}_pt: ${type} = {${marker}`,
    options.ptTranslated
      ? `  'column.project.name.label': 'Nome',`
      : `  'column.project.name.label': 'Name',`,
    options.ptTranslated
      ? `  'column.project.address.label': 'Endereço',`
      : `  'column.project.address.label': 'Address',`,
    '};',
    `const ${prefix}s: { [key: string]: ${type} } = { 'en': ${prefix}_en, 'pt': ${prefix}_pt };`,
    '/// **collab_i18n_end**',
    '',
    'export class Page {}',
  ].join('\n');
}

// ── T1: the target moved from the shared to the pages ────────────────────────

test('the target is every page folder of the module, never the shared', () => {
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/desktop/page11', 'buildFlowFsm'), true);
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/desktop/page31', 'buildFlowFsm'), true);
  // The shared has no catalogue any more: scanning it would queue nothing.
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/shared', 'buildFlowFsm'), false);
  // Another module's pages are never touched: languages are per module.
  assert.equal(isPageCatalogueFolder('otherModule/web/desktop/page11', 'buildFlowFsm'), false);
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/mobile/page11', 'buildFlowFsm'), false);
});

test('generated pages and organisms qualify; typecheck tests and defs do not', () => {
  assert.equal(isPageCatalogueFileName('projectCatalogue', '.ts'), true);
  assert.equal(isPageCatalogueFileName('projectCatalogue_O2', '.ts'), true);
  assert.equal(isPageCatalogueFileName('projectCatalogue.test', '.ts'), false);
  assert.equal(isPageCatalogueFileName('projectCatalogue.defs', '.ts'), false);
  assert.equal(isPageCatalogueFileName('projectCatalogue', '.less'), false);
});

test('a file only qualifies when it actually holds a page catalogue', () => {
  assert.equal(hasPageCatalogue(pageCatalogue()), true);
  assert.equal(hasPageCatalogue(pageCatalogue({ prefix: 'o2Message', type: 'O2Msg' })), true);
  assert.equal(hasPageCatalogue('export class Page {}'), false);
  // A shared written by the previous generator has a block, but its consts are not a page catalogue.
  const legacyShared = [
    '/// **collab_i18n_start**',
    'const message_en = {',
    `  'a': 'b',`,
    '};',
    '/// **collab_i18n_end**',
  ].join('\n');
  assert.equal(hasPageCatalogue(legacyShared), false);
});

// ── T2: the root cause — a marked locale must be queued ──────────────────────

test('a marked locale is queued even though its const exists', () => {
  // The old rule was "queue when the locale is MISSING". Every locale is emitted from birth, so it never
  // fired: that is how a Portuguese catalogue shipped 'Name' and 'Address' in English.
  const decision = decideQueue(pageCatalogue(), ['pt']);
  assert.deepEqual(decision.languages, ['pt']);
  assert.equal(decision.reason, 'untranslated');
});

test('a translated locale without the marker is NOT queued again', () => {
  const decision = decideQueue(pageCatalogue({ ptTranslated: true, marked: false }), ['pt']);
  assert.deepEqual(decision.languages, []);
  assert.equal(decision.reason, 'complete');
});

test('a locale absent from the catalogue is queued', () => {
  const decision = decideQueue(pageCatalogue({ ptTranslated: true, marked: false }), ['es']);
  assert.deepEqual(decision.languages, ['es']);
  assert.equal(decision.reason, 'missing');
});

test('force ignores the detection entirely — the transition path for files with no marker', () => {
  // Files generated before the marker existed carry no evidence either way; force is how the first run
  // after the migration retranslates them.
  const legacy = pageCatalogue({ ptTranslated: false, marked: false });
  assert.deepEqual(decideQueue(legacy, ['pt', 'es']).languages, ['es'], 'without force only the absent one');
  const forced = decideQueue(legacy, ['pt', 'es'], true);
  assert.deepEqual(forced.languages, ['pt', 'es']);
  assert.equal(forced.reason, 'force');
});

test('force still skips a file that has no catalogue at all', () => {
  assert.deepEqual(decideQueue('export class Page {}', ['pt'], true), { languages: [], reason: 'noCatalogue' });
});

test('an organism catalogue is detected through its own const prefix', () => {
  const organism = pageCatalogue({ prefix: 'o2Message', type: 'O2Msg' });
  assert.deepEqual(decideQueue(organism, ['pt']).languages, ['pt']);
  assert.deepEqual(decideQueue(pageCatalogue({ prefix: 'o2Message', type: 'O2Msg', ptTranslated: true, marked: false }), ['pt']).languages, []);
});

test('a region-qualified locale matches the const suffix and the map key', () => {
  const source = pageCatalogue().replace(/_pt\b/gu, '_pt_br').replace(/'pt'/gu, "'pt-br'");
  assert.deepEqual(decideQueue(source, ['pt-br']).languages, ['pt-br']);
  assert.deepEqual(decideQueue(source, ['pt_BR']).languages, ['pt_BR'], 'the request is normalized, the answer echoes it');
});

// ── T3: the replace ─────────────────────────────────────────────────────────

test('the replace touches only the block, and consumes the markers', () => {
  const source = pageCatalogue();
  const translated = extractI18nBlock(pageCatalogue({ ptTranslated: true }))!;
  const result = applyTranslatedI18nBlock(source, translated);

  assert.ok(result.includes("'column.project.name.label': 'Nome',"));
  assert.ok(!result.includes(I18N_UNTRANSLATED_MARKER), 'the translation consumed the marker');
  // Everything outside the block survives untouched.
  assert.ok(result.startsWith("import { html } from 'lit';"));
  assert.ok(result.trimEnd().endsWith('export class Page {}'));
  // And the file no longer queues itself.
  assert.deepEqual(decideQueue(result, ['pt']).languages, []);
});

test('the parity annotation is part of the contract: a block that dropped it is rejected', () => {
  const source = pageCatalogue();
  // The annotation is what turns a forgotten translation into TS2741 instead of a silent hole, so losing
  // it must fail loudly rather than be written over a good file.
  const withoutAnnotation = extractI18nBlock(pageCatalogue({ ptTranslated: true }))!
    .replace('const pageMessage_pt: PageMessageType =', 'const pageMessage_pt =');
  assert.throws(() => applyTranslatedI18nBlock(source, withoutAnnotation), TranslatedBlockError);

  const withoutLocale = extractI18nBlock(pageCatalogue({ ptTranslated: true }))!
    .replace(/const pageMessage_pt: PageMessageType = \{[\s\S]*?\};\n/u, '');
  assert.throws(() => applyTranslatedI18nBlock(source, withoutLocale), /dropped or renamed/u);

  assert.throws(() => applyTranslatedI18nBlock(source, 'const pageMessage_pt = {};'), /not delimited/u);
  assert.throws(() => applyTranslatedI18nBlock('export class Page {}', 'x'), /no i18n block/u);
});

test('constDeclarations names every catalogue const with its annotation', () => {
  assert.deepEqual(constDeclarations(extractI18nBlock(pageCatalogue())!), [
    'const pageMessage_en =',
    'const pageMessage_pt: PageMessageType =',
  ]);
});

test('stripUntranslatedMarkers removes the comment and nothing else', () => {
  assert.equal(
    stripUntranslatedMarkers(`const pageMessage_pt: PageMessageType = { // ${I18N_UNTRANSLATED_MARKER}\n  'a': 'b',\n};`),
    "const pageMessage_pt: PageMessageType = {\n  'a': 'b',\n};",
  );
});
