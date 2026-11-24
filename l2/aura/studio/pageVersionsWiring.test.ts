/// <mls fileReference="_102020_/l2/aura/studio/pageVersionsWiring.test.ts" enhancement="_blank" />
// Guards over WHERE the page timeline is fed: every Studio writer of a page `.ts` keeps the page before the write
// (when the timeline is missing it) and notes the write after it, and the snapshot carries the whole defs.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (name: string): string => readFileSync(new URL(name, import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const EDITOR = read('studioEditor.ts');
const GENOME = read('../services/serviceGenome.ts');
const SELECT_PAGE = read('../plugins/selectPage.ts');
const IO = read('../agentEditPage/editPageIo.ts');
const VERSIONS = read('pageVersions.ts');

function between(text: string, start: string, end: string): string {
  const from = text.indexOf(start);
  assert.ok(from >= 0, `missing: ${start}`);
  const to = text.indexOf(end, from + start.length);
  return text.slice(from, to < 0 ? undefined : to);
}

test('the editor commit keeps the page before the write and notes the write after the local copy', () => {
  const commit = between(EDITOR, 'private async commitSource(', '// --- Annotating the page');
  const ensure = commit.indexOf('void ensurePageVersion(page, model.getValue());');
  const write = commit.indexOf('model.pushEditOperations(');
  const local = commit.indexOf('await persistLocalEdit(file, newSource);');
  const note = commit.indexOf("notePageEdit(page, 'me', what);");
  assert.ok(ensure >= 0 && ensure < write, 'before the model changes');
  assert.ok(local >= 0 && local < note, 'after the local copy');
});

test('the in-place text edit is on the timeline too', () => {
  const ensure = EDITOR.indexOf('void ensurePageVersion(versionedPage(editTargetFile), model.getValue());');
  const write = EDITOR.indexOf('model.pushEditOperations(', ensure);
  assert.ok(ensure >= 0 && write > ensure);
  assert.ok(EDITOR.includes("notePageEdit(versionedPage(editTargetFile), 'me', what);"));
});

test('the page coming on screen starts or catches up the timeline', () => {
  const refresh = between(EDITOR, 'public async refreshTarget(', 'this.drawStatusOnly();');
  assert.ok(refresh.includes('void ensurePageVersion(versionedPage(result.target));'));
});

test('the molecule swap of the Genome knob is on the timeline', () => {
  const ensure = GENOME.indexOf('void ensurePageVersion(versioned, source);');
  const write = GENOME.indexOf('tsModel.model.pushEditOperations(', ensure);
  assert.ok(ensure >= 0 && write > ensure);
  assert.ok(GENOME.includes("notePageEdit(versioned, 'me', tStudio('versions.moleculeSwap'"));
});

test('a regeneration keeps the page before it and records the page after it', () => {
  const regen = between(SELECT_PAGE, 'private async _onRegenerate(', 'private async _executeAgent(');
  const ensure = regen.indexOf('await ensurePageVersion(versioned);');
  const run = regen.indexOf("this._executeAgent('agentGenomeUx'");
  assert.ok(ensure >= 0 && ensure < run);
  assert.ok(regen.indexOf("await recordPageVersion(versioned, 'regen', '');") > run);
});

test('the snapshot carries the whole defs, and a restore is recorded as a new version', () => {
  assert.ok(between(IO, 'export interface EditPageSnapshot', '}').includes('defs: string | null;'));
  const restore = between(VERSIONS, 'export async function restorePageVersion(', '\n}\n');
  assert.ok(restore.indexOf('await restoreEditPage(') < restore.indexOf("take(ref, 'restore'"));
});

test('the difference opens in the details panel on the right, never inline in the narrow list', () => {
  const panel = read('pageVersionsPanel.ts');
  assert.ok(panel.includes('void openElementInServiceDetails(element);'));
  assert.ok(panel.includes('document.createElement(PAGE_VERSION_DIFF_TAG)'));
  assert.ok(!/createDiffEditor/u.test(panel), 'no Monaco editor in the list');
  // Closing clears the details only when this panel opened something there.
  const close = between(panel, 'private _closeDiff(): void {', '\n  }\n');
  assert.ok(close.indexOf('if (this._diffRow === null) return;') < close.indexOf('clearServiceDetails()'));
  assert.ok(read('pageVersionDiff.ts').includes('createDiffEditor'));
});

test('the Page tab shows the versions panel', () => {
  assert.ok(SELECT_PAGE.includes("import '/_102020_/l2/aura/studio/pageVersionsPanel.js';"));
  assert.ok(SELECT_PAGE.includes('${this._renderVersions(page)}'));
});
