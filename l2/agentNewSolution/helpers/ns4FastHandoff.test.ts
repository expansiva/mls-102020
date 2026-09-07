/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4FastHandoff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createNs4Pipeline,
  markNs4E10Approved,
  markNs4FastHandoff,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  NS4_FAST_HANDOFF_AGENT,
  NS4_FAST_HANDOFF_PLAN_ID,
  NS4_FAST_SKIP_REASON,
  buildNs4ChangeBackendHandoffMessage,
  decideNs4E1Clarification,
  decideNs4FastHandoff,
  isNs4FastMode,
  isNs4NochainMode,
  ns4E1SkippedDefaults,
  ns4NochainSuppressedNote,
  sendNs4FastHandoff,
} from '/_102020_/l2/agentNewSolution/helpers/ns4FastHandoff.js';

test('/fast skips the E1 widget; without the flag the widget still opens', () => {
  assert.equal(decideNs4E1Clarification(true), 'skip');
  assert.equal(decideNs4E1Clarification(false), 'open');
  assert.equal(isNs4FastMode({ fastMode: 'true' }), true);
  assert.equal(isNs4FastMode({}), false);
  assert.equal(isNs4FastMode(null), false);
  assert.equal(isNs4NochainMode({ nochainMode: 'true' }), true);
  assert.equal(isNs4NochainMode({ fastMode: 'true' }), false);
  assert.equal(isNs4NochainMode({}), false);
});

test('skipped E1 defaults are the review values, including product languages', () => {
  const defaults = ns4E1SkippedDefaults({
    module: { moduleName: 'petShop', title: 'Pet shop' },
    localization: { productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR' },
    reviewPolicy: { mode: 'smart' },
    userLanguage: 'pt-BR',
  });
  assert.deepEqual(defaults, {
    productLanguages: ['pt-BR'],
    defaultLanguage: 'pt-BR',
    moduleName: 'petShop',
    title: 'Pet shop',
    reviewPolicy: 'smart',
    userLanguage: 'pt-BR',
  });
  assert.equal(NS4_FAST_SKIP_REASON, 'fast skipped clarification');
});

test('skipped E1 defaults copy i18nWarnings so the run record is not silent', () => {
  const defaults = ns4E1SkippedDefaults({
    module: { moduleName: 'controleEstoque2', title: 'Controle de estoque' },
    localization: { productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR' },
    reviewPolicy: { mode: 'smart' },
    userLanguage: 'pt-BR',
    i18nWarnings: ['localization.productLanguages: discarded en, es — languages are a user decision and the user did not cite them in the clarification answer or in the original prompt; kept pt-BR.'],
  });
  assert.deepEqual(defaults.productLanguages, ['pt-BR']);
  assert.match(defaults.i18nWarnings?.[0] || '', /discarded en, es/);
});

test('NS /fast success emits the changeBackend intent once; other cases emit nothing', () => {
  assert.equal(
    buildNs4ChangeBackendHandoffMessage('petShop'),
    '@@agentChangeBackend /fast /rebuild all petShop',
  );
  assert.deepEqual(
    decideNs4FastHandoff({ fast: true, nochain: false, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: true, message: '@@agentChangeBackend /fast /rebuild all petShop', suppressed: false },
  );
  assert.deepEqual(
    decideNs4FastHandoff({ fast: false, nochain: false, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
  assert.deepEqual(
    decideNs4FastHandoff({ fast: true, nochain: false, success: false, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
  assert.deepEqual(
    decideNs4FastHandoff({ fast: true, nochain: false, success: true, alreadyDispatched: true, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
  assert.deepEqual(
    decideNs4FastHandoff({ fast: true, nochain: false, success: true, alreadyDispatched: false, moduleName: '' }),
    { dispatch: false, message: '', suppressed: false },
  );
});

test('NS /fast /nochain suppresses the handoff and names the next command', () => {
  assert.deepEqual(
    decideNs4FastHandoff({ fast: true, nochain: true, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '@@agentChangeBackend /rebuild all petShop', suppressed: true },
  );
  assert.equal(
    ns4NochainSuppressedNote('petShop'),
    'handoff: suppressed by /nochain — next: @@agentChangeBackend /rebuild all petShop',
  );
  // /nochain alone never chained, so it does not claim suppression.
  assert.deepEqual(
    decideNs4FastHandoff({ fast: false, nochain: true, success: true, alreadyDispatched: false, moduleName: 'petShop' }),
    { dispatch: false, message: '', suppressed: false },
  );
});

test('pipeline fastHandoff is idempotent', () => {
  const complete = markNs4E10Approved(createNs4Pipeline('petShop', 'petShop'), 'auto', '2026-08-29T12:00:00.000Z');
  const first = markNs4FastHandoff(complete, NS4_FAST_HANDOFF_AGENT, '@@agentChangeBackend /fast /rebuild all petShop', '2026-08-29T12:01:00.000Z');
  const second = markNs4FastHandoff(first, NS4_FAST_HANDOFF_AGENT, '@@agentChangeBackend /fast /rebuild all petShop', '2026-08-29T12:02:00.000Z');
  assert.equal(first.fastHandoff?.message, '@@agentChangeBackend /fast /rebuild all petShop');
  assert.equal(second.fastHandoff?.at, first.fastHandoff?.at);
});

test('E1 after-prompt and E10 finalize wire the skip and the handoff', () => {
  const root = readFileSync(fileURLToPath(new URL('../agentNewSolution.ts', import.meta.url)), 'utf8');
  assert.match(root, /nochainMode: 'true'/);
  const e1 = readFileSync(fileURLToPath(new URL('../steps/e1/agentNs4E1.ts', import.meta.url)), 'utf8');
  assert.match(e1, /decideNs4E1Clarification/);
  assert.match(e1, /ns4E1SkippedDefaults/);
  assert.match(e1, /skippedClarification: true/);
  assert.match(e1, /e1ReviewFallback\(plan, \{ answerIsProposal: isFast\(context\) \}\)/);
  assert.match(e1, /e1ReviewFallback\(plan\)/);
  assert.match(e1, /i18nWarnings: answer\.skippedDefaults\.i18nWarnings/);
  const e10 = readFileSync(fileURLToPath(new URL('../steps/e10/agentNs4E10.ts', import.meta.url)), 'utf8');
  assert.match(e10, /decideNs4FastHandoff/);
  assert.match(e10, /sendNs4FastHandoff/);
  assert.match(e10, /isNs4NochainMode/);
  assert.match(e10, /ns4NochainSuppressedNote/);
  assert.match(e10, /NS4_FAST_HANDOFF_PLAN_ID/);
  assert.doesNotMatch(e10, /function handoffResult/);
  assert.doesNotMatch(e10, /handoffResult\(/);
  assert.match(e10, /ensureProjectModule\(withType\.projectJson, moduleName\)/);
  assert.match(e10, /collectProjectJsonIssues\(withModule\.projectJson, moduleName\)/);
  assert.equal(NS4_FAST_HANDOFF_PLAN_ID, 'fast-handoff-changeBackend');
});

test('a throwing handoff send degrades and never throws', async () => {
  const result = await sendNs4FastHandoff({
    threadId: 't1',
    message: '@@agentChangeBackend /fast /rebuild all petShop',
    send: async () => { throw new Error('Parent step cannot be modified'); },
    persist: async () => { throw new Error('must not persist after send failure'); },
  });
  assert.equal(result.dispatched, false);
  assert.equal(result.degradation?.kind, 'fast-handoff-dispatch');
  assert.match(result.note, /DISPATCH FAILED/);
  assert.match(result.note, /re-send manually: @@agentChangeBackend \/fast \/rebuild all petShop/);
});

test('handoff send persists only after the thread message lands', async () => {
  const order: string[] = [];
  const result = await sendNs4FastHandoff({
    threadId: 't1',
    message: '@@agentChangeBackend /fast /rebuild all petShop',
    send: async () => { order.push('send'); },
    persist: async () => { order.push('persist'); },
  });
  assert.deepEqual(order, ['send', 'persist']);
  assert.equal(result.dispatched, true);
  assert.equal(result.degradation, null);
});
