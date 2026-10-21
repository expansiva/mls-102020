/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/addLanguageCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyTranslatedI18nBlock, collectPending, constDeclarations, declaredTypeNames, decideQueue, dropRepeatedTypeLines, duplicateDeclarations, extractI18nBlock, isBrokenBlock, missingTypeDeclarations, restoreMissingTypeDeclarations, hasPageCatalogue, isFlattenedBlock, isPlanActionable,
  I18N_UNTRANSLATED_MARKER, isPageCatalogueFileName, isPageCatalogueFolder, planModuleLanguages, repairI18nBlock, stepFileReference, stripUntranslatedMarkers, unflattenBlock,
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
  // Mobile pages carry their own catalogue, in the same format.
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/mobile/page11', 'buildFlowFsm'), true);
  // The shared has no catalogue any more: scanning it would queue nothing.
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/shared', 'buildFlowFsm'), false);
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/contracts', 'buildFlowFsm'), false);
  assert.equal(isPageCatalogueFolder('buildFlowFsm/web/mobile', 'buildFlowFsm'), false);
  // Another module's pages are never touched: languages are per module.
  assert.equal(isPageCatalogueFolder('otherModule/web/desktop/page11', 'buildFlowFsm'), false);
  assert.equal(isPageCatalogueFolder('otherModule/web/mobile/page11', 'buildFlowFsm'), false);
});

test('a module with mobile pages only is not "without pages"', () => {
  const mobileOnly = { fileReference: '_1_/l2/m/web/mobile/page11/a.ts', source: pageCatalogue() };
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en'], requested: ['pt'], pages: [mobileOnly] });
  assert.equal(plan.kind, 'translate');
  assert.deepEqual(plan.pending.map(p => p.fileReference), [mobileOnly.fileReference]);
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

// ─── Adding a language to one module, or to every module of the project ───

const translated = { fileReference: '_1_/l2/m/web/desktop/page1/a.ts', source: pageCatalogue({ ptTranslated: true, marked: false }) };
const marked = { fileReference: '_1_/l2/m/web/desktop/page1/b.ts', source: pageCatalogue() };
const noCatalogue = { fileReference: '_1_/l2/m/web/desktop/page1/c.ts', source: 'export class Page {}' };

test('collectPending counts the pages with a catalogue and queues only what is still missing', () => {
  const scan = collectPending([translated, marked, noCatalogue], ['pt']);
  assert.equal(scan.pages, 2);
  assert.equal(scan.complete, 1);
  assert.equal(scan.noCatalogue, 1);
  assert.deepEqual(scan.pending, [{ languages: ['pt'], fileReference: marked.fileReference }]);
});

test('a module without module.defs.ts languages is ignored, whatever its pages say', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: null, requested: ['pt'], pages: [marked] });
  assert.equal(plan.kind, 'noDefs');
  assert.deepEqual(plan.pending, []);
  assert.equal(planModuleLanguages({ moduleName: 'm', defsLanguages: [], requested: ['pt'], pages: [marked] }).kind, 'noDefs');
});

test('a module without pages holding a catalogue is ignored', () => {
  assert.equal(planModuleLanguages({ moduleName: 'm', defsLanguages: ['en'], requested: ['pt'], pages: [] }).kind, 'noPages');
  assert.equal(planModuleLanguages({ moduleName: 'm', defsLanguages: ['en'], requested: ['pt'], pages: [noCatalogue] }).kind, 'noPages');
});

test('a module that lists the language and has every page translated has nothing to do', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [translated] });
  assert.equal(plan.kind, 'complete');
  assert.deepEqual(plan.addToDefs, []);
});

test('translated pages with the language missing from the defs only write the configuration', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en'], requested: ['pt'], pages: [translated] });
  assert.equal(plan.kind, 'configOnly');
  assert.deepEqual(plan.addToDefs, ['pt']);
  assert.deepEqual(plan.pending, []);
});

test('pending pages of a language the defs already lists complete the translation without touching the defs', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [translated, marked] });
  assert.equal(plan.kind, 'translate');
  assert.deepEqual(plan.addToDefs, []);
  assert.equal(plan.pages, 2);
  assert.deepEqual(plan.pending.map(p => p.fileReference), [marked.fileReference]);
});

test('a new language with pending pages translates and is added to the defs', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en'], requested: ['pt', 'es'], pages: [translated] });
  assert.equal(plan.kind, 'translate');
  assert.deepEqual(plan.addToDefs, ['pt', 'es']);
  assert.deepEqual(plan.pending, [{ languages: ['es'], fileReference: translated.fileReference }]);
});

// ─── What the model returns (cases seen on 20/10 with gpt-4.1-mini) ───

test('the file comes from the step args, even when the model moved it out of result', () => {
  const args = JSON.stringify({ languages: ['ja'], fileReference: '_102047_/l2/tarefas/web/desktop/page11/tarefas_equipe.ts' });
  // Real payload: `fileReference` beside `result`, not inside it.
  const payload = { type: 'flexible', result: { i18n: '...' }, fileReference: '_102047_/l2/other.ts' };
  assert.equal(stepFileReference(args, payload), '_102047_/l2/tarefas/web/desktop/page11/tarefas_equipe.ts');
});

test('without step args, the model echo is the fallback, inside or beside result', () => {
  assert.equal(stepFileReference(undefined, { result: { fileReference: 'a.ts' } }), 'a.ts');
  assert.equal(stepFileReference('not json', { result: {}, fileReference: 'b.ts' }), 'b.ts');
  assert.equal(stepFileReference(undefined, { result: {} }), '');
});

test('an exact repeat of the type declaration is dropped, and the block is accepted', () => {
  const source = pageCatalogue({ marked: false, ptTranslated: true });
  const block = extractI18nBlock(source)!;
  // Real case (20/10, many pages): `type PageMessageType = …` written again, word for word, after the new locale.
  const repeated = block.replace(
    "const pageMessages:",
    "type PageMessageType = typeof pageMessage_en;\nconst pageMessages:",
  );
  assert.deepEqual(duplicateDeclarations(repeated), ['type PageMessageType']);
  assert.deepEqual(duplicateDeclarations(dropRepeatedTypeLines(repeated)), []);
  assert.equal(applyTranslatedI18nBlock(source, repeated), source);
  assert.deepEqual(duplicateDeclarations(block), []);
});

test('a second, different declaration of the type is still rejected', () => {
  const source = pageCatalogue({ marked: false, ptTranslated: true });
  const block = extractI18nBlock(source)!;
  const different = block.replace(
    "const pageMessages:",
    "type PageMessageType = typeof pageMessage_pt;\nconst pageMessages:",
  );
  assert.throws(() => applyTranslatedI18nBlock(source, different), /more than once/u);
});

// ─── Blocks written on one line (20/10: the model escaped its JSON twice) ───

/** The page as the broken run left it: the whole block on the start-marker line, `\n` as two characters. */
function flattenedPage(): string {
  const good = pageCatalogue({ ptTranslated: true, marked: false });
  const block = extractI18nBlock(good)!;
  return good.replace(block, block.replace(/\n/gu, '\\n'));
}

test('a block whose line breaks are the characters \\ and n is flattened; a normal block is not', () => {
  assert.equal(isFlattenedBlock(extractI18nBlock(flattenedPage())!), true);
  assert.equal(isFlattenedBlock(extractI18nBlock(pageCatalogue())!), false);
});

test('the repair decodes the block in place and leaves the rest of the page alone', () => {
  const good = pageCatalogue({ ptTranslated: true, marked: false });
  assert.equal(repairI18nBlock(flattenedPage()), good);
  assert.equal(repairI18nBlock(good), null);
});

test('a flattened page is never sent to the model and makes the module actionable', () => {
  const broken = { fileReference: '_1_/l2/m/web/mobile/page11/minhas_tarefas.ts', source: flattenedPage() };
  const scan = collectPending([broken], ['pt']);
  assert.deepEqual(scan.broken, [broken.fileReference]);
  assert.deepEqual(scan.pending, []);
  assert.equal(scan.pages, 1);

  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [broken] });
  assert.equal(plan.kind, 'complete');
  assert.equal(isPlanActionable(plan), true);
});

test('a flattened answer from the model is decoded before it is written', () => {
  const source = pageCatalogue();
  const translated = extractI18nBlock(pageCatalogue({ ptTranslated: true, marked: false }))!;
  const result = applyTranslatedI18nBlock(source, translated.replace(/\n/gu, '\\n'));
  assert.equal(result, pageCatalogue({ ptTranslated: true, marked: false }));
  assert.equal(unflattenBlock('const a = 1;'), 'const a = 1;');
});

test('a one-line block without escapes is rejected: written as is it would be a comment', () => {
  const source = pageCatalogue();
  const oneLine = extractI18nBlock(pageCatalogue({ ptTranslated: true, marked: false }))!.replace(/\n/gu, ' ');
  assert.throws(() => applyTranslatedI18nBlock(source, oneLine), /no line breaks/u);
});

// ─── The model drops `type PageMessageType = …` (20/10, tarefas) ───

const ptBrOnly = [
  '/// **collab_i18n_start**',
  'const pageMessage_pt_br = {',
  "  titulo: 'Minhas tarefas',",
  '};',
  'type PageMessageType = typeof pageMessage_pt_br;',
  "const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };",
  '/// **collab_i18n_end**',
].join('\n');

/** What the model returned: the `ja` locale added, the type declaration gone. */
const jaWithoutType = [
  '/// **collab_i18n_start**',
  'const pageMessage_pt_br = {',
  "  titulo: 'Minhas tarefas',",
  '};',
  'const pageMessage_ja: PageMessageType = {',
  "  titulo: 'マイタスク',",
  '};',
  "const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br, 'ja': pageMessage_ja };",
  '/// **collab_i18n_end**',
].join('\n');

test('a used but undeclared type is found, with the default-locale const it is typeof', () => {
  assert.deepEqual(missingTypeDeclarations(jaWithoutType), [{ name: 'PageMessageType', base: 'pageMessage_pt_br' }]);
  assert.deepEqual(missingTypeDeclarations(ptBrOnly), []);
});

test('a translation that dropped the type gets it back right after the default locale', () => {
  const result = applyTranslatedI18nBlock(ptBrOnly, jaWithoutType);
  assert.match(result, /\};\ntype PageMessageType = typeof pageMessage_pt_br;\nconst pageMessage_ja: PageMessageType = \{/u);
  assert.equal(declaredTypeNames(result).length, 1);
  assert.deepEqual(missingTypeDeclarations(result), []);
});

test('a page already written without the type is broken and is repaired in place', () => {
  const page = `import { html } from 'lit';\n\n${jaWithoutType}\n\nexport class Page {}`;
  assert.equal(isBrokenBlock(extractI18nBlock(page)!), true);
  const repaired = repairI18nBlock(page)!;
  assert.match(repaired, /type PageMessageType = typeof pageMessage_pt_br;/u);
  assert.equal(isBrokenBlock(extractI18nBlock(repaired)!), false);
  assert.ok(repaired.startsWith("import { html } from 'lit';") && repaired.endsWith('export class Page {}'));

  const scan = collectPending([{ fileReference: 'p.ts', source: page }], ['ja']);
  assert.deepEqual(scan.broken, ['p.ts']);
  assert.deepEqual(scan.pending, []);
});

test('the type line keeps the file line endings', () => {
  const crlf = jaWithoutType.replace(/\n/gu, '\r\n');
  assert.match(restoreMissingTypeDeclarations(crlf), /\};\r\ntype PageMessageType = typeof pageMessage_pt_br;\r\n/u);
});

test('an organism catalogue gets its own type back', () => {
  const organism = [
    '/// **collab_i18n_start**',
    "const o1Message_pt_br = { a: 'A' };",
    "const o1Message_ja: O1Msg = { a: 'エー' };",
    "const o1Messages: Record<string, O1Msg> = { 'pt-br': o1Message_pt_br, 'ja': o1Message_ja };",
    '/// **collab_i18n_end**',
  ].join('\n');
  assert.deepEqual(missingTypeDeclarations(organism), [{ name: 'O1Msg', base: 'o1Message_pt_br' }]);
  assert.match(restoreMissingTypeDeclarations(organism), /const o1Message_pt_br = \{ a: 'A' \};\ntype O1Msg = typeof o1Message_pt_br;/u);
});

// ─── The app's language list (l5/config.json) kept in step ───

test('a module whose config.json list lags the defs is actionable even when the pages are done', () => {
  // The tarefas case: defs and pages already have the language, config.json still lists only the default.
  const plan = planModuleLanguages({
    moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [translated], runtimeLanguages: ['en'],
  });
  assert.equal(plan.kind, 'complete');
  assert.deepEqual(plan.languages, ['en', 'pt']);
  assert.equal(plan.runtimeStale, true);
  assert.equal(isPlanActionable(plan), true);
});

test('the config.json list is compared with the languages the module will have after the run', () => {
  const adding = planModuleLanguages({ moduleName: 'm', defsLanguages: ['pt-BR'], requested: ['ja'], pages: [translated], runtimeLanguages: ['pt-BR'] });
  assert.deepEqual(adding.languages, ['pt-BR', 'ja']);
  assert.equal(adding.runtimeStale, true);

  const inStep = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [translated], runtimeLanguages: ['en', 'pt'] });
  assert.equal(inStep.runtimeStale, false);
  assert.equal(isPlanActionable(inStep), false);
});

test('a module not registered in config.json is never stale', () => {
  const plan = planModuleLanguages({ moduleName: 'm', defsLanguages: ['en', 'pt'], requested: ['pt'], pages: [translated], runtimeLanguages: null });
  assert.equal(plan.runtimeStale, false);
});
