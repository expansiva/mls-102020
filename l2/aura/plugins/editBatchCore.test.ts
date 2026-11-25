/// <mls fileReference="_102020_/l2/aura/plugins/editBatchCore.test.ts" enhancement="_blank" />
// The rules of one request asked of several pages: scope, order, decision, and the guards of the panel and the
// molecule knob that use them.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  batchAdjusting, batchAdjustReady, batchAdjustTargets, batchCounts, batchDecision, batchOpen, batchOrder, moleculeTagsIn, pagesUsingTag, runLimited, scopePages, standardMisses, type BatchRow,
} from '/_102020_/l2/aura/plugins/editBatchCore.js';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `missing: ${start}`);
  const to = text.indexOf(end, from + start.length);
  return text.slice(from, to < 0 ? undefined : to);
}

test('molecule tags: opening tags only, each once, in order', () => {
  const source = '<groupviewtable--ml-table-basic .rows=${x}></groupviewtable--ml-table-basic>\n'
    + '<grouptriggeraction--ml-button-standard size="sm">a</grouptriggeraction--ml-button-standard>\n'
    + '<grouptriggeraction--ml-button-standard>b</grouptriggeraction--ml-button-standard><div></div>';
  assert.deepEqual(moleculeTagsIn(source), ['groupviewtable--ml-table-basic', 'grouptriggeraction--ml-button-standard']);
  const pages = [{ name: 'a', source }, { name: 'b', source: '<div>groupviewtable--ml-table-basic</div>' }];
  assert.deepEqual(pagesUsingTag(pages, 'groupviewtable--ml-table-basic'), ['a'], 'a mention in text is not a use');
});

test('scope: the page asked from first, distinct; at least 2 and at most the limit', () => {
  assert.deepEqual(scopePages('b', ['a', 'b', 'c', 'a'], 10), { pages: ['b', 'a', 'c'] });
  assert.deepEqual(scopePages('b', ['b'], 10), { refusal: 'none', count: 1 });
  assert.deepEqual(scopePages('a', ['b', 'c', 'd'], 3), { refusal: 'tooMany', count: 4 });
});

test('order: one by one, the page on screen last', () => {
  assert.deepEqual(batchOrder(['a', 'b', 'c'], 'a'), ['b', 'c', 'a']);
  assert.deepEqual(batchOrder(['a', 'b'], 'z'), ['a', 'b']);
  assert.deepEqual(batchOrder(['a', 'b'], null), ['a', 'b']);
});

test('limited lanes keep the order of the results and never run more than the limit', async () => {
  let running = 0;
  let peak = 0;
  const out = await runLimited([30, 10, 20, 5, 1], 2, async ms => {
    running++; peak = Math.max(peak, running);
    await new Promise(resolve => setTimeout(resolve, ms));
    running--;
    return ms * 2;
  });
  assert.deepEqual(out, [60, 20, 40, 10, 2]);
  assert.equal(peak, 2);
});

test('decision: ticked pages in review are applied, unticked discarded; other states untouched', () => {
  const rows: Record<string, BatchRow> = {
    a: { state: 'review', include: true }, b: { state: 'review', include: false },
    c: { state: 'failed', include: false }, d: { state: 'applied', include: true },
  };
  assert.deepEqual(batchDecision(rows), { apply: ['a'], discard: ['b'] });
  assert.equal(batchOpen(rows), true);
  assert.equal(batchOpen({ c: rows.c, d: rows.d }), false, 'nothing left to decide');
  assert.deepEqual(batchCounts(rows), { review: 2, failed: 1, applied: 1 });
});

test('the panel: plans a few at a time, previews one by one through the per-page review, page on screen last', () => {
  const panel = read('selectPage.ts');
  const plan = between(panel, 'private async _planBatchPages(', 'private async _generateBatchPages(');
  assert.ok(plan.includes('await runLimited(pages, BATCH_PLAN_LANES,'));
  // Two agent tasks on the same thread at once mix their steps up in the runtime: the plans go one by one.
  assert.ok(panel.includes('const BATCH_PLAN_LANES = 1;'));
  assert.ok(plan.includes('this._editEntry(page, request, device, null, undefined, [], [], this._batchOthers(pages, name), standard)'), 'no element, no marks, the other pages, the standard');
  const generate = between(panel, 'private async _generateBatchPages(', 'private async _onGenerateBatch(');
  assert.ok(generate.includes('for (const name of batchOrder(names, this._selectedPage?.name ?? null))'));
  assert.ok(generate.includes('await this._onApplyPlan(page);'), 'the same preview as a single page');
  assert.ok(panel.includes("const entry = this._editEntry(page, plan.request, plan.device, plan.element, plan.operations, plan.marks, [], plan.batch ?? [], plan.standard ?? null);"));
  assert.ok(panel.includes('const entry = this._editEntry(page, review.request, review.device, review.element, plan.operations, review.marks, adjust, review.batch ?? [], plan.standard);'));
  const decide = between(panel, 'private async _onBatchDecide(', 'private async _onBatchAdjustPlan(');
  assert.ok(decide.includes('await this._onReviewApply(page);') && decide.includes('await this._onReviewDiscard(page);'));
});

test('adjustment rows: ticked pages in review under the limit; the decision waits while one runs or waits', () => {
  const rows: Record<string, BatchRow> = {
    a: { state: 'review', include: true, adjust: 'planned' }, b: { state: 'review', include: false },
    c: { state: 'review', include: true, adjust: 'refused' }, d: { state: 'applied', include: true, adjust: 'planned' },
    e: { state: 'review', include: true },
  };
  assert.deepEqual(batchAdjustTargets(rows, name => (name === 'e' ? 3 : 0), 3), ['a', 'c']);
  assert.deepEqual(batchAdjustReady(rows), ['a'], 'only pages still in review');
  assert.equal(batchAdjusting(rows), true);
  assert.equal(batchAdjusting({ c: rows.c, e: { state: 'review', include: true, adjust: 'done' } }), false, 'refused and done wait for nothing');
});

test('the batch adjustment: analyzed page by page (rows say how it goes), then one Generate, the page on screen last', () => {
  const panel = read('selectPage.ts');
  const plan = between(panel, 'private async _onBatchAdjustPlan(', 'private async _onBatchAdjustGenerate(');
  assert.ok(plan.includes("this._setBatchRow(name, { adjust: 'planning' });"));
  assert.ok(plan.includes('const ok = await this._planAdjust(page, text, standard);'));
  assert.ok(plan.includes("{ adjust: 'refused', adjustReason: this._editError[name] ?? this.msg.editNoAnswer }"));
  assert.ok(plan.includes("this._batchAdjustScope === 'all' || name === onScreen"));
  const generate = between(panel, 'private async _onBatchAdjustGenerate(', 'private _onBatchAdjustCancel(');
  assert.ok(generate.includes('for (const name of batchOrder(ready, this._selectedPage?.name ?? null))'));
  assert.ok(generate.includes("this._setBatchRow(name, { adjust: 'generating' });") && generate.includes('const ok = await this._applyAdjust(page);'));
});

test('a request of several pages is decided in ONE place: the list; the page card only shows the page', () => {
  const panel = read('selectPage.ts');
  const list = between(panel, 'private _renderBatch(', '// Cancel: back to the request');
  assert.ok(!list.includes('editBatchApplyOne') && !list.includes('editBatchDiscardOne'), 'no Apply/Discard per row');
  assert.equal((list.match(/this\._onBatchDecide\('ticked'\)/gu) ?? []).length, 1);
  assert.ok(list.includes('this._onBatchAdjustPlan()') && list.includes('this._onBatchAdjustGenerate()'));
  const card = between(panel, 'private _renderEditReview(', 'private _renderReviewAdjust(');
  assert.ok(card.includes('const inBatch = this._inBatch(page);'));
  const decide = card.indexOf('this._onReviewApply(page)');
  assert.ok(decide > card.indexOf('${inBatch ? html`') && card.indexOf('this.msg.reviewInBatch') < decide, 'Apply only off the batch');
  assert.ok(card.indexOf('this._renderReviewAdjust(page, review)') > card.indexOf('this.msg.reviewInBatch'), 'the adjustment only off the batch');
});

test('with more than one page, the panel offers no Annotate, no marks and no selected element', () => {
  const panel = read('selectPage.ts');
  const editPanel = between(panel, 'private _renderEditPanel(', 'private _annotOnPage(');
  assert.ok(editPanel.includes('const many = this._manyPages(page, target.device);'));
  assert.ok(editPanel.includes('${many ? nothing : this._renderAnnotateButton(page, !!busy)}'));
  assert.ok(editPanel.includes('${many ? nothing : this._renderElementChip(page, !!busy)}'));
  assert.ok(editPanel.includes('${many ? this._renderScopeDetail(page, target.device, !!busy) : this._renderMarks(page, !!busy)}'));
  assert.ok(between(panel, 'private _setScope(', 'private _renderScopeSelect(').includes("if (kind !== 'page' && this._annot.active) annotCommand({ kind: 'stop' });"));
});

test('the request box is a composer: the text on top, a bar below with scope, Annotate and the send button', () => {
  const editPanel = between(read('selectPage.ts'), 'private _renderEditPanel(', 'private _annotOnPage(');
  assert.ok(editPanel.includes('rows="4"'));
  const bar = editPanel.indexOf('px-2 py-1.5 border-t border-gray-200 dark:border-gray-800');
  assert.ok(bar > editPanel.indexOf('<textarea'));
  assert.ok(editPanel.indexOf('this._renderScopeSelect(') > bar && editPanel.indexOf('this._renderPlanButton(') > editPanel.indexOf('this._renderAnnotateButton('));
});

test('a page written while another is on screen is not a "reload to see" warning', () => {
  const panel = read('selectPage.ts');
  assert.ok(read('../agentEditPage/editPageIo.ts').includes("live = host ? LIVE_OTHER_PAGE : 'no running app';"));
  assert.ok(between(panel, 'private _liveWarning(', '// Per-page edit state').includes('live !== LIVE_OTHER_PAGE'));
  assert.equal((panel.match(/editLiveNotApplied\.replace/gu) ?? []).length, 1, 'every warning goes through _liveWarning');
});

test('the panel: every batch text exists in the three languages', () => {
  const panel = read('selectPage.ts');
  for (const key of ['editScope', 'editScopeModule', 'editScopeMolecule', 'editScopePick', 'editScopeNoMarks', 'editBatchPlan', 'editBatchGenerate',
    'editBatchApplyTicked', 'editBatchDiscardAll', 'editBatchRetry', 'editBatchAdjustAll', 'editBatchAdjustOne', 'editBatchDone',
    'editBatchAdjustQuote', 'editBatchAdjustGenerate', 'editBatchTickHint', 'editAdjustQueued', 'editAdjustPlanning', 'editAdjustPlanned',
    'editAdjustRefused', 'editAdjustGenerating', 'editAdjustDone', 'editAdjustFailed', 'reviewAdjustPlanning', 'reviewAdjustPlanTitle',
    'reviewAdjustGenerate', 'reviewAdjustCancel', 'reviewInBatch']) {
    assert.equal(panel.match(new RegExp(`^ +${key}: '`, 'gmu'))?.length ?? 0, 3, key);
  }
});

test('the molecule knob: the other pages are offered after a swap, siblings in the same folder, never swapped unasked', () => {
  const service = read('../services/serviceGenome.ts');
  const offer = between(service, 'private async _offerModuleSwap(', 'private _onModuleSwapEvent(');
  assert.ok(offer.includes('this._pageSource(file.project, file.folder, entry.file.shortName)'));
  assert.ok(offer.includes('picked: true'));
  const apply = between(service, 'private async _onModuleSwapApply(', '/**\n     * Puts the swap in the RUNNING page');
  assert.ok(apply.includes("replaceComponentTag(swap.from, swap.to, source, undefined, 'all')"));
  assert.ok(apply.indexOf('if (isPageInReview(ref))') < apply.indexOf('commitPageSource('), 'a page in AI review is left alone');
  assert.ok(apply.includes('await commitPageSource(ref.project, ref.folder, ref.shortName, source);'), 'a page that does not compile goes back');
  assert.ok(apply.includes("scope: 'all'"));
  const knob = read('selectMolecule.ts');
  for (const key of ['moduleSwapTitle', 'moduleSwapApply', 'moduleSwapDone']) {
    assert.equal(knob.match(new RegExp(`^ +${key}: '`, 'gmu'))?.length ?? 0, 3, key);
  }
});

test('a preview or an adjustment that did not reach the screen is put there again, and what stops it is shown', () => {
  const panel = read('selectPage.ts');
  assert.ok(between(panel, 'private async _applyAdjust(', 'private async _onReviewAdjust(').includes('if (after) await this._ensureShown(page, after, result.notes.live);'));
  assert.ok(between(panel, 'private async _onApplyPlan(', 'private _reviewRef(').includes('await this._ensureShown(page, after, result.notes.live);'));
  const ensure = between(panel, 'private async _ensureShown(', 'private async _showCandidate(');
  assert.ok(ensure.includes('if (!live || live === LIVE_OTHER_PAGE) return;'));
  assert.ok(ensure.indexOf('await commitPageSource(') < ensure.indexOf("this._setEdit('_editError', page.name, warning);"));
});

test('standard misses: a rule is followed when every class is in the source as a whole class', () => {
  const standard = { rules: [
    { what: 'page header title', classes: 'text-2xl font-semibold' },
    { what: 'page header spacing', classes: 'pt-8 pb-6' },
    { what: 'subtitle color', classes: 'text-[var(--text-muted,currentColor)]' },
  ] };
  const source = 'html`<h1 class="text-2xl font-semibold">x</h1><header class=${a ? \'pt-8\' : \'\'} pb-60"><p class="text-[var(--text-muted,currentColor)] mt-1">`';
  assert.deepEqual(standardMisses(source, standard), ['page header spacing'], 'pb-60 is not pb-6');
  assert.deepEqual(standardMisses(source, null), []);
});

test('a batch decides the common standard first: approve, cancel or adjust it; then every page follows it', () => {
  const panel = read('selectPage.ts');
  const start = between(panel, 'private async _onPlanBatch(', 'private async _runStandard(');
  assert.ok(start.includes("phase: 'standard', standard: null"));
  assert.ok(start.includes('const standard = await this._runStandard(null);'));
  assert.ok(start.includes('if (!standard.rules.length) await this._planBatchPages();'), 'nothing in common: straight to the plans');
  const run = between(panel, 'private async _runStandard(', 'private async _onApproveStandard(');
  assert.ok(run.includes('this._batchOthers(batch.pages, origin.name), previous, true)'), 'one task for the batch, with the previous standard');
  assert.ok(between(panel, 'private async _onApproveStandard(', 'private async _onStandardAdjust(').includes('await this._planBatchPages();'));
  assert.ok(between(panel, 'private async _onStandardAdjust(', 'private async _planBatchPages(').includes('await this._runStandard(batch.standard ? text : null, batch.standard);'));
  const view = between(panel, 'private _renderBatchStandard(', 'private _renderBatch(');
  for (const call of ['this._onApproveStandard()', 'this._onCloseBatch()', 'this._onStandardAdjust()']) assert.ok(view.includes(call), call);
  const adjust = between(panel, 'private async _onBatchAdjustPlan(', 'private async _onBatchAdjustGenerate(');
  assert.ok(adjust.indexOf('standard = await this._runStandard(text, batch.standard);') < adjust.indexOf('await this._planAdjust(page, text, standard);'), 'on several pages the standard is adjusted first');
  assert.ok(between(panel, 'private async _generateBatchPages(', 'private async _onGenerateBatch(').includes('misses: standardMisses(review.after.source, batch.standard)'));
});
