/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageSkeleton.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPageSkeleton, localesOf, organismRenderName, organismShortName, sharedI18nKeys } from './cfePageSkeleton.js';

const SHARED_SOURCE = [
  '/// **collab_i18n_start**',
  'const message_en = {',
  `  'intent.billingSummaryWorkspace.list.empty': 'No summaries yet',`,
  `  'action.createBillingSummaryCmd.success': 'Created',`,
  '};',
  'export type MessageType = typeof message_en;',
  `const message_pt_br: MessageType = {`,
  `  'intent.billingSummaryWorkspace.list.empty': 'Nenhum resumo ainda',`,
  `  'action.createBillingSummaryCmd.success': 'Criado',`,
  '};',
  `export const messages: { [key: string]: MessageType } = { 'en': message_en, 'pt-br': message_pt_br };`,
  '/// **collab_i18n_end**',
].join('\n');

const INPUT = {
  outputPath: '_102045_/l2/buildFlowFsm/web/desktop/page11/billingSummaryWorkspace.ts',
  data: { pageId: 'billingSummaryWorkspace', baseClassName: 'BuildFlowFsmBillingSummaryWorkspaceBase' },
  sharedTsRef: '_102045_/l2/buildFlowFsm/web/shared/billingSummaryWorkspace.ts',
  sharedSource: SHARED_SOURCE,
};

test('localesOf keeps the region and the declaration order (default first)', () => {
  assert.deepEqual(localesOf(SHARED_SOURCE), ['en', 'pt-br']);
  assert.deepEqual(localesOf('no block here'), []);
});

test('sharedI18nKeys lists the vocabulary the page can reference', () => {
  assert.deepEqual(sharedI18nKeys(SHARED_SOURCE), [
    'intent.billingSummaryWorkspace.list.empty',
    'action.createBillingSummaryCmd.success',
  ]);
});

test('skeleton derives the tag and the class name exactly as the generated pages use them', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  assert.match(code, /@customElement\('build-flow-fsm--web--desktop--page11--billing-summary-workspace-102045'\)/u);
  assert.match(code, /export class BuildFlowFsmDesktopPage11BillingSummaryWorkspacePage extends BuildFlowFsmBillingSummaryWorkspaceBase \{/u);
});

test('skeleton emits one i18n const per shared locale, non-default annotated for parity', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // The shared mapping is written ONCE with the locale as a parameter — writing it per locale cost 48
  // near-identical lines in a single organism (16 keys x 3 locales).
  assert.match(code, /const fromShared = \(m: MessageType\) => \(\{/u);
  assert.equal(code.match(/\.\.\.fromShared\(sharedMessages\['[\w-]+'\] \?\? sharedFallback\),/gu)?.length, 2);
  assert.match(code, /const pageMessage_en = \{/u);
  // The annotation is what makes a forgotten translation a compile error (TS2741) instead of a hole.
  assert.match(code, /const pageMessage_pt_br: PageMessageType = \{/u);
  assert.match(code, /const pageMessages: \{ \[key: string\]: PageMessageType \} = \{ 'en': pageMessage_en, 'pt-br': pageMessage_pt_br \};/u);
});

test('skeleton marks every place the model has to write — i18n included', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // fromShared (the shared mapping) + one per locale (the invented copy, translated) + render() + the
  // render<Name> slot.
  assert.equal(code.split('/* to implement').length - 1, 5);
});

test('skeleton ships the language-cached getter, not a per-reference lookup', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  assert.match(code, /protected get msg\(\): PageMessageType \{/u);
  assert.match(code, /if \(lang !== this\.#msgLang\)/u);
  assert.match(code, /this\.getMessageKey\(pageMessages\)/u);
});

test('skeleton imports the base class and the shared catalog from the .js ref', () => {
  const code = buildPageSkeleton(INPUT).code ?? '';
  // The leading slash is the whole point: without it the module is unresolvable at runtime and tsc

  // reports TS2307 -> TS1238 on the decorator -> TS2339 on every member.
  assert.match(code, /import \{ BuildFlowFsmBillingSummaryWorkspaceBase, messages as sharedMessages, type MessageType \} from '\/_102045_\/l2\/buildFlowFsm\/web\/shared\/billingSummaryWorkspace\.js';/u);
  assert.ok(!code.includes("from '../"), 'never a relative import (run18)');
  assert.ok(!/from '_\d+_\//u.test(code), 'every mls import is rooted with a leading slash');
});

test('bails instead of guessing when the inputs cannot produce a valid page', () => {
  assert.match(buildPageSkeleton({ ...INPUT, data: {} }).reason ?? '', /baseClassName/u);
  assert.match(buildPageSkeleton({ ...INPUT, sharedSource: '' }).reason ?? '', /no i18n block/u);
  assert.match(buildPageSkeleton({ ...INPUT, outputPath: '_102045_/l2/m/web/shared/x.ts' }).reason ?? '', /not an l2 page/u);
});


// ---------------------------------------------------------------------------
// Página dividida: organismo = função exportada.

const ORGANISMS = [
  { n: 1, organism: 'overview', bindings: ['getProjectDetail'] },
  { n: 2, organism: 'delayRisk', bindings: ['triggerDelayRiskSuggestions', 'listDelayRiskSuggestions'] },
];
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
