/// <mls fileReference="_102020_/l2/aura/plugins/selectPageEditFlow.test.ts" enhancement="_blank" />
// Guards over the AI tab's request flow: the annotation gives the page back when a request goes out, and an
// applied change can be discarded — only while the page is still the one the change left.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const SELECT_PAGE = read('selectPage.ts');
const IO = read('../agentEditPage/editPageIo.ts');

/** A method of the panel, up to the next member at the same indent. */
function member(signature: string): string {
  const start = SELECT_PAGE.indexOf(signature);
  assert.ok(start >= 0, `missing: ${signature}`);
  const rest = SELECT_PAGE.slice(start + signature.length);
  const end = rest.search(/\n {4}(?:private|public|protected|\/\*\*|\/\/ )/u);
  return rest.slice(0, end < 0 ? undefined : end);
}

test('sending the request (Review) and applying it leave the annotation mode', () => {
  for (const method of ['private async _onPlanEdit(', 'private async _onApplyPlan(']) {
    assert.ok(member(method).includes("if (this._annot.active) annotCommand({ kind: 'stop' });"), method);
  }
});

test('the page is read BEFORE the agent writes, and the change is discardable only when it changed the page', () => {
  const apply = member('private async _onApplyPlan(');
  const before = apply.indexOf('const before = await this._snapshotPage(entry);');
  const run = apply.indexOf("this._executeAgent('agentEditPage'");
  assert.ok(before >= 0 && before < run, 'snapshot first');
  assert.ok(apply.includes('if (before && after && after.source !== before.source) this._editUndo[page.name] = { before, after, appliedAt: Date.now() };'));
  // The page timeline: the page before the agent writes, then the applied request as a version of its own.
  const ensure = apply.indexOf('await ensurePageVersion(versioned);');
  assert.ok(ensure >= 0 && ensure < run, 'timeline before the write');
  assert.ok(apply.indexOf("await recordPageVersion(versioned, 'ai', plan.request);") > run);
});

test('a discard of a changed page asks first, goes through the timeline, and refuses only without it', () => {
  const discard = member('private async _onDiscardEdit(');
  const check = discard.indexOf('now.source !== undo.after.source');
  const confirm = discard.indexOf('this.msg.editDiscardConfirm');
  const restore = discard.indexOf('await restorePageVersion(versioned,');
  assert.ok(check >= 0 && check < confirm && confirm < restore, 'check, then ask, then restore');
  // Without the timeline nothing could bring the later edits back: refused, as before.
  assert.ok(discard.indexOf('!pageVersionsAvailable()') < discard.indexOf('this.msg.editDiscardStale'));
  assert.ok(discard.includes('if (!undo.confirmed) {'));
  // The page without a timeline (not a generated page folder) still discards by the snapshot.
  assert.ok(discard.includes('await restoreEditPage(undo.before)'));
});

test('a new request keeps the previous change for good', () => {
  assert.ok(member('private async _onPlanEdit(').includes('delete this._editUndo[page.name];'));
});

test('the restore goes through the same writes as the apply: the page source and the defs history', () => {
  const restore = IO.slice(IO.indexOf('export async function restoreEditPage('));
  assert.ok(restore.includes('commitPageSource(snapshot.project, snapshot.folder, snapshot.page, snapshot.source)'));
  // A snapshot with the whole defs puts the whole defs back (definition + history); else only its history.
  assert.ok(restore.indexOf('writeDefsText(snapshot.project, snapshot.folder, snapshot.page, snapshot.defs)') < restore.indexOf('recordInDefsHistory('));
  assert.ok(restore.includes('recordInDefsHistory(snapshot.project, snapshot.folder, snapshot.page, () => history)'));
});

test('the discard button and its messages exist in the three languages', () => {
  assert.ok(SELECT_PAGE.includes('@click=${() => this._onDiscardEdit(page)}'));
  for (const key of ['editDiscard', 'editDiscarding', 'editDiscarded', 'editDiscardStale', 'editDiscardConfirm']) {
    assert.equal(SELECT_PAGE.match(new RegExp(`^ +${key}: '`, 'gmu'))?.length ?? 0, 3, key);
  }
});
