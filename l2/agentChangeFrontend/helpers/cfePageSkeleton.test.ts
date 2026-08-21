/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageSkeleton.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPageSkeleton, I18N_UNTRANSLATED_MARKER, localesOf, organismRenderName, organismShortName, sharedI18nKeys } from './cfePageSkeleton.js';

// The shared .ts no longer carries an i18n block: the catalogue is PLANNED in the shared defs and
// EMITTED in the page, so the skeleton reads the defs.
const SHARED_DEFS_DATA = {
  baseClassName: 'BuildFlowFsmBillingSummaryWorkspaceBase',
  i18nMeta: { defaultLocale: 'en', runtimeLocales: ['en', 'pt-br'] },
  i18n: {
    'intent.billingSummaryWorkspace.list.empty': 'No summaries yet',
    'action.createBillingSummaryCmd.success': 'Created',
  },
};

const SHARED_SOURCE = [
  'export class BuildFlowFsmBillingSummaryWorkspaceBase extends CollabLitElement {',
  '}',
].join('\n');

const INPUT = {
  outputPath: '_102045_/l2/buildFlowFsm/web/desktop/page11/billingSummaryWorkspace.ts',
  data: { pageId: 'billingSummaryWorkspace', baseClassName: 'BuildFlowFsmBillingSummaryWorkspaceBase' },
  sharedTsRef: '_102045_/l2/buildFlowFsm/web/shared/billingSummaryWorkspace.ts',
  sharedSource: SHARED_SOURCE,
  sharedDefsData: SHARED_DEFS_DATA,
};

const ORGANISMS = [
  { n: 1, organism: 'overview', bindings: ['getProjectDetail'] },
  { n: 2, organism: 'delayRisk', bindings: ['triggerDelayRiskSuggestions', 'listDelayRiskSuggestions'] },
];

test('localesOf keeps the region and the declaration order (default first)', () => {
  assert.deepEqual(localesOf(SHARED_DEFS_DATA), ['en', 'pt-br']);
  assert.deepEqual(localesOf({ i18n: {} }), []);
  assert.deepEqual(localesOf(undefined), []);
});

test('sharedI18nKeys lists the vocabulary the page catalogue is built from', () => {
  assert.deepEqual(sharedI18nKeys(SHARED_DEFS_DATA), [
    'intent.billingSummaryWorkspace.list.empty',
    'action.createBillingSummaryCmd.success',
  ]);
});

test('skeleton derives the tag and the class name exactly as the generated pages use them', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  assert.match(code, /@customElement\('build-flow-fsm--web--desktop--page11--billing-summary-workspace-102045'\)/u);
  assert.match(code, /export class BuildFlowFsmDesktopPage11BillingSummaryWorkspacePage extends BuildFlowFsmBillingSummaryWorkspaceBase \{/u);
});

test('the page owns the COMPLETE catalogue: every key, every locale, no shared indirection', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // Emitted, not mapped: the model never sees a `fromShared` to fill, so it cannot miss a key and
  // cannot copy a literal — copying is what produced hardcoded English in files that compiled clean.
  assert.ok(!code.includes('fromShared'), 'the shared indirection is gone');
  assert.ok(!code.includes('sharedMessages'), 'the page does not read a shared catalogue');
  assert.match(code, /const pageMessage_en = \{\n  'intent\.billingSummaryWorkspace\.list\.empty': 'No summaries yet',\n  'action\.createBillingSummaryCmd\.success': 'Created',/u);
  // The annotation is what makes a forgotten translation a compile error (TS2741) instead of a hole.
  assert.match(code, /const pageMessage_pt_br: PageMessageType = \{ \/\/ collab_untranslated\n/u);
  // With no previous file the non-default locale starts as the default text, which @@addLanguage
  // translates — and the marker is what tells it this locale still needs translating. Detecting that by
  // "the const is missing" cannot work: every locale is emitted from birth.
  assert.match(code, /const pageMessage_pt_br: PageMessageType = \{ \/\/ collab_untranslated\n  'intent\.billingSummaryWorkspace\.list\.empty': 'No summaries yet',/u);
  assert.ok(!/const pageMessage_en[^\n]*collab_untranslated/u.test(code), 'the default locale is never marked');
  assert.match(code, /const pageMessages: \{ \[key: string\]: PageMessageType \} = \{ 'en': pageMessage_en, 'pt-br': pageMessage_pt_br \};/u);
});

function translatePtBr(code: string, entries: Array<[string, string]>): string {
  return entries.reduce((acc, [key, text]) => acc.replace(
    new RegExp(`(const pageMessage_pt_br[^\\n]*\\n(?:  '[^']+': '[^']*',\\n)*?  '${key.replace(/\./gu, '\\.')}': )'[^']*'`, 'u'),
    `$1'${text}'`,
  ), code);
}

test('regenerating a page carries its translations forward instead of resetting them', () => {
  const previous = buildPageSkeleton(INPUT).code ?? '';
  const translated = translatePtBr(previous, [['intent.billingSummaryWorkspace.list.empty', 'Nenhum resumo ainda']]);
  assert.notEqual(translated, previous, 'the fixture must actually contain the translated line');

  const again = buildPageSkeleton({ ...INPUT, previousSource: translated }).code ?? '';
  assert.match(again, /'intent\.billingSummaryWorkspace\.list\.empty': 'Nenhum resumo ainda',/u);
  // The default locale is never carried over: it is the plan's own text.
  assert.match(again, /const pageMessage_en = \{\n  'intent\.billingSummaryWorkspace\.list\.empty': 'No summaries yet',/u);
});

test('the untranslated marker survives a PARTIAL translation and clears on a complete one', () => {
  const first = buildPageSkeleton(INPUT).code ?? '';

  // One of the two keys translated: the locale still holds default text, so it must stay queued. This is
  // exactly the shape that shipped English column labels inside a Portuguese catalogue.
  const partial = buildPageSkeleton({
    ...INPUT,
    previousSource: translatePtBr(first, [['intent.billingSummaryWorkspace.list.empty', 'Nenhum resumo ainda']]),
  }).code ?? '';
  assert.match(partial, new RegExp(`const pageMessage_pt_br[^\\n]*${I18N_UNTRANSLATED_MARKER}`, 'u'));

  // Only @@addLanguage clears the marker — it is the only actor that knows a translation happened. The
  // skeleton propagates it, so a translated file WITHOUT the marker regenerates without it.
  const translatedByAddLanguage = translatePtBr(first, [
    ['intent.billingSummaryWorkspace.list.empty', 'Nenhum resumo ainda'],
    ['action.createBillingSummaryCmd.success', 'Criado'],
  ]).replace(` // ${I18N_UNTRANSLATED_MARKER}`, '');
  const complete = buildPageSkeleton({ ...INPUT, previousSource: translatedByAddLanguage }).code ?? '';
  assert.ok(!complete.includes(I18N_UNTRANSLATED_MARKER), 'a translated locale is not re-marked');
  assert.match(complete, /const pageMessage_pt_br: PageMessageType = \{\n/u);
  assert.match(complete, /'action\.createBillingSummaryCmd\.success': 'Criado',/u);
});

test('an organism carries over from ITS OWN previous file, not from the page', () => {
  const organismPrevious = (buildPageSkeleton({ ...INPUT, organisms: ORGANISMS, current: 2 }).code ?? '')
    .replace(
      /(const o2Message_pt_br: O2Msg = \{ \/\/ collab_untranslated\n  'intent\.billingSummaryWorkspace\.list\.empty': )'No summaries yet'/u,
      "$1'Traduzido no organismo'",
    );
  const again = buildPageSkeleton({ ...INPUT, organisms: ORGANISMS, current: 2, previousSource: organismPrevious }).code ?? '';
  assert.match(again, /'intent\.billingSummaryWorkspace\.list\.empty': 'Traduzido no organismo',/u);
});

test('skeleton marks every place the model has to write — i18n included', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // One per locale (the keys the page invents) + render() + the render<Name> slot. The shared mapping
  // marker is gone: that block is emitted, not written.
  assert.equal(code.split('/* to implement').length - 1, 4);
});

test('skeleton ships the language-cached getter, not a per-reference lookup', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  assert.match(code, /protected get msg\(\): PageMessageType \{/u);
  assert.match(code, /if \(lang !== this\.#msgLang\)/u);
  assert.match(code, /this\.getMessageKey\(pageMessages\)/u);
});

test('skeleton imports the base class from the .js ref — and nothing else from the shared', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // The leading slash is the whole point: without it the module is unresolvable at runtime and tsc

  // reports TS2307 -> TS1238 on the decorator -> TS2339 on every member.
  assert.match(code, /import \{ BuildFlowFsmBillingSummaryWorkspaceBase \} from '\/_102045_\/l2\/buildFlowFsm\/web\/shared\/billingSummaryWorkspace\.js';/u);
  assert.ok(!code.includes("from '../"), 'never a relative import (run18)');
  assert.ok(!/from '_\d+_\//u.test(code), 'every mls import is rooted with a leading slash');
});

test('bails instead of guessing when the inputs cannot produce a valid page', () => {
  assert.match(buildPageSkeleton({ ...INPUT, data: {} }).reason ?? '', /baseClassName/u);
  // The bail is on the DEFS now: reading the locale list from the .ts would silently fall through to
  // "the model writes the whole file", i18n included.
  assert.match(buildPageSkeleton({ ...INPUT, sharedDefsData: undefined }).reason ?? '', /no i18n catalogue/u);
  assert.match(buildPageSkeleton({ ...INPUT, sharedDefsData: { i18n: {} } }).reason ?? '', /no i18n catalogue/u);
  assert.match(buildPageSkeleton({ ...INPUT, outputPath: '_102045_/l2/m/web/shared/x.ts' }).reason ?? '', /not an l2 page/u);
});


// ---------------------------------------------------------------------------
// Página dividida: organismo = função exportada.

const split = (current?: number) => buildPageSkeleton({ ...INPUT, organisms: ORGANISMS, current }).code ?? '';

test('organism file and render name are DERIVED, so the page never has to read the generated file', () => {
  assert.equal(organismShortName('projectDetailWorkspace', 4), 'projectDetailWorkspace_O4');
  assert.equal(organismRenderName('delayRisk'), 'renderDelayRisk');
  assert.equal(organismRenderName('change-orders'), 'renderChangeOrders');
});

test('an organism exports ONE render function taking the page as host — no class, no inheritance', () => {
  const code = split(2);
  assert.match(code, /export function renderDelayRisk\(host: Host\) \{/u);
  assert.match(code, /import \{ type BuildFlowFsmBillingSummaryWorkspaceBase as Host/u);
  // msg lives in module scope: it never needed the class.
  assert.match(code, /const msg = o2Messages\[host\.getMessageKey\(o2Messages\)\] \|\| o2Fallback;/u);
  assert.ok(!code.includes('super.msg'), 'no inheritance, nothing to merge');
  assert.ok(!code.includes('@customElement'), 'an organism is not an element');
  assert.ok(!code.includes('class '), 'an organism declares no class');
});

test('the organism file names itself, and only the page keeps the page name', () => {
  assert.match(split(1), /^\/\/\/ <mls fileReference="_102045_\/l2\/buildFlowFsm\/web\/desktop\/page11\/billingSummaryWorkspace_O1\.ts"/u);
  assert.match(split(undefined), /^\/\/\/ <mls fileReference="_102045_\/l2\/buildFlowFsm\/web\/desktop\/page11\/billingSummaryWorkspace\.ts"/u);
});

test('the page imports every organism and is TOLD what to call', () => {
  const code = split(undefined);
  assert.match(code, /import \{ renderOverview \} from '\/_102045_\/l2\/buildFlowFsm\/web\/desktop\/page11\/billingSummaryWorkspace_O1\.js';/u);
  assert.match(code, /import \{ renderDelayRisk \} from '\/_102045_\/l2\/buildFlowFsm\/web\/desktop\/page11\/billingSummaryWorkspace_O2\.js';/u);
  // Not knowing the names is what made the composing page re-implement everything and time out.
  assert.match(code, /\/\/ {3}renderDelayRisk\(this\) {3}\[triggerDelayRiskSuggestions, listDelayRiskSuggestions\]/u);
  assert.match(code, /ONLY what no organism covers/u);
});

test('a split page keeps exactly the shape of an unsplit one', () => {
  const code = split(undefined);
  assert.match(code, /export class BuildFlowFsmDesktopPage11BillingSummaryWorkspacePage extends BuildFlowFsmBillingSummaryWorkspaceBase \{/u);
  assert.match(code, /protected get msg\(\): PageMessageType \{/u);
  assert.ok(!code.includes('super.msg'), 'the page extends the shared, as always');
});

test('bails when the requested organism is not in the plan', () => {
  assert.match(buildPageSkeleton({ ...INPUT, organisms: ORGANISMS, current: 9 }).reason ?? '', /no organism 9/u);
});
