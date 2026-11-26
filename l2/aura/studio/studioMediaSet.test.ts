/// <mls fileReference="_102020_/l2/aura/studio/studioMediaSet.test.ts" enhancement="_blank" />
// Source guards for the media molecule section of the picker (gallery, video, audio, PDF): the
// editor wiring that the pure tests of studioMediaSrc cannot reach.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8').replace(/\r\n/gu, '\n');
const PANEL = readFileSync(new URL('classPickerBase.ts', import.meta.url), 'utf8').replace(/\r\n/gu, '\n');

function body(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `${signature} exists`);
  return source.slice(start, source.indexOf('\n  }\n', start));
}

test('the set is resolved BEFORE the refusal of markup inside a molecule', () => {
  // Clicking the gallery picture selects the molecule's own markup — refused for class edits — but
  // the file it shows lives in the page's <Source> slots, so the set must survive that refusal.
  const show = EDITOR.slice(EDITOR.indexOf('state.mediaSet = await this.resolveMediaSet(el);'));
  assert.ok(show.indexOf('state.mediaSet = await') < show.indexOf('const ancestorProject = this.foreignProjectOfAncestor(el);'));
  // And the single row stays quiet inside a set: it could only say "not found".
  assert.ok(EDITOR.includes('state.media = state.mediaSet ? null : await this.resolveMediaSrc(el);'));
});

test('every media write goes through ONE writer, and so does its undo', () => {
  const writer = body(EDITOR, 'private async writeMediaAttrs(');
  assert.equal((writer.match(/commitSource\(/gu) ?? []).length, 1);
  assert.ok(writer.includes('spliceMediaAttributes('));
  assert.ok(!EDITOR.includes('writeMediaSrc('), 'the old single-attribute writer is gone');
  const undo = EDITOR.slice(EDITOR.indexOf("if (step.kind === 'media') {"));
  assert.ok(undo.slice(0, 600).includes('this.writeMediaAttrs('));
  assert.ok(undo.slice(0, 600).includes('from: undoing ? attr.after : attr.before'));
});

test('adding a source is ONE undo step: the copy and its file are captured together', () => {
  const add = body(EDITOR, 'private async addMediaSource(');
  assert.ok(add.indexOf('this.history.beginCapture();') < add.indexOf('this.duplicateElement('));
  assert.ok(add.includes('this.history.endCapture()'));
  assert.ok(add.includes("kind: 'group'"));
});

test('the last source is never removed: a player with no file has nothing to play', () => {
  const remove = body(EDITOR, 'private async removeMediaSource(');
  assert.ok(remove.includes('.length < 2) return;'));
  assert.ok(body(EDITOR, 'private projectMediaSet(').includes('removable: editable > 1'));
});

test('a source drawn by a .map() is data, not markup', () => {
  assert.ok(body(EDITOR, 'private async resolveMediaSet(').includes("resolved.renders > 1) item.reason = { id: 'reason.mediaSourceRepeated' }"));
});

test('the panel sends the item it means, and the gallery offers the kind of the molecule', () => {
  assert.ok(PANEL.includes("pick: (url) => this.emitMedia({ url, item: index }),"));
  assert.ok(PANEL.includes("pick: (url) => this.emitMedia({ url, item: 'poster' }),"));
  assert.ok(PANEL.includes("'picker-media-add'"));
  assert.ok(PANEL.includes("'picker-media-remove'"));
  assert.ok(body(PANEL, 'protected mediaChoices(').includes('categoriesFor(kind)'));
});

test('a gallery card is two sibling buttons, never a button inside a button', () => {
  const gallery = body(PANEL, 'protected renderMediaGallery(');
  const card = gallery.slice(gallery.indexOf('<div\n        class="acp-media-choice'));
  // The card itself is a div: the pick and the magnifier are its two children.
  assert.ok(!gallery.includes('<button type="button"\n        class="acp-media-choice'));
  assert.ok(card.indexOf('class="acp-media-pick"') < card.indexOf('</button>'));
  assert.ok(card.indexOf('</button>') < card.indexOf('class="acp-media-zoom"'));
  // The magnifier is not disabled on the current file: only the pick is.
  const zoom = card.slice(card.indexOf('class="acp-media-zoom"'), card.indexOf('</button>', card.indexOf('class="acp-media-zoom"')));
  assert.ok(!zoom.includes('?disabled'));
});

test('"use this file" goes through the same pick as the card', () => {
  const use = body(PANEL, 'private useMediaViewer(');
  assert.ok(use.includes('viewer.pick(url)'));
  assert.ok(body(PANEL, 'protected renderMediaGallery(').includes("this.openMediaViewer({ key: this.mediaOpen ?? '', kind, choices, index, value, pick })"));
});

test('the viewer owns its Esc: the editor leaves it, the viewer stops it', () => {
  assert.ok(PANEL.includes('class="acp-media-viewer" tabindex="-1" data-esc-owner'));
  const key = body(PANEL, 'private onMediaViewerKey(');
  assert.ok(key.indexOf("e.key === 'Escape'") < key.indexOf('e.stopPropagation()'));
  const esc = EDITOR.slice(EDITOR.indexOf("if (e.key === 'Escape') {\n      if (this.editSpan"));
  assert.ok(esc.indexOf('this.isEscOwnedInside(e)') >= 0);
  assert.ok(esc.indexOf('this.isEscOwnedInside(e)') < esc.indexOf('this.selectParentLevel()'));
});
