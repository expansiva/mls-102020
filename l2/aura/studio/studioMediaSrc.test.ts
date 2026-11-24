/// <mls fileReference="_102020_/l2/aura/studio/studioMediaSrc.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  categoriesFor, hasPoster, isWritableMediaUrl, isWritableMediaValue, liveMediaSrc, mediaFileLabel, mediaKindOf, mimeOfUrl,
  moleculeMediaKind, readMediaSrc, readMediaValue, sourceChanges, spliceMediaAttributes, spliceMediaSrc,
} from '/_102020_/l2/aura/studio/studioMediaSrc.js';

const page = (tag: string) => `html\`<div class="p-4">${tag}<span>x</span></div>\``;
const at = (src: string, tag = '<img') => src.indexOf(tag);

test('media kind by tag; an img takes pictures and svg icons', () => {
  assert.equal(mediaKindOf('IMG'), 'image');
  assert.equal(mediaKindOf('video'), 'video');
  assert.equal(mediaKindOf('audio'), 'audio');
  assert.equal(mediaKindOf('div'), null);
  assert.deepEqual(categoriesFor('image'), ['image', 'icon']);
  assert.deepEqual(categoriesFor('video'), ['video']);
});

test('the current src is the final url, never the studio blob', () => {
  const swapped = new Map([['src', 'blob:x/1'], ['data-collab-asset-src', '/_1_/l3/assets/a.png']]);
  assert.equal(liveMediaSrc({ getAttribute: (n) => swapped.get(n) ?? null }), '/_1_/l3/assets/a.png');
  const plain = new Map([['src', '/_1_/l3/assets/b.png']]);
  assert.equal(liveMediaSrc({ getAttribute: (n) => plain.get(n) ?? null }), '/_1_/l3/assets/b.png');
  assert.equal(liveMediaSrc({ getAttribute: () => null }), '');
});

test('plan: literal, absent, binding and mixed', () => {
  const literal = page('<img class="w-8" src="/old.png" alt="x">');
  const plan = readMediaSrc(literal, at(literal));
  assert.equal(plan.ok && plan.kind, 'literal');
  assert.equal(plan.ok && plan.kind === 'literal' && plan.value, '/old.png');
  const absent = page('<img class="w-8">');
  assert.deepEqual(readMediaSrc(absent, at(absent)), { ok: true, kind: 'absent' });
  const bound = page('<img src=${this.photo}>');
  assert.deepEqual(readMediaSrc(bound, at(bound)), { ok: false, reason: 'reason.mediaSrcIsData' });
  const quotedBound = page('<img src="${this.photo}">');
  assert.deepEqual(readMediaSrc(quotedBound, at(quotedBound)), { ok: false, reason: 'reason.mediaSrcIsData' });
  const mixed = page('<img src="/img/${this.id}.png">');
  assert.deepEqual(readMediaSrc(mixed, at(mixed)), { ok: false, reason: 'reason.mediaSrcMixed' });
  assert.deepEqual(readMediaSrc(literal, -1), { ok: false, reason: 'reason.mediaSrcNotLocated' });
});

test('splice replaces a literal in place and keeps the rest byte for byte', () => {
  const src = page('<img class="w-8" src="/old.png" alt="x">');
  const out = spliceMediaSrc(src, at(src), '/_102052_/l3/assets/collabImg1.png');
  assert.ok(out.ok);
  assert.equal(out.source, page('<img class="w-8" src="/_102052_/l3/assets/collabImg1.png" alt="x">'));
  assert.equal(out.before, '/old.png');
});

test('splice inserts src right after the tag name, even with an arrow binding in the tag', () => {
  const src = page('<img class="w-8" @click=${() => this.open()}>');
  const out = spliceMediaSrc(src, at(src), '/_1_/l3/assets/a.png');
  assert.ok(out.ok);
  assert.equal(out.source, page('<img src="/_1_/l3/assets/a.png" class="w-8" @click=${() => this.open()}>'));
  assert.equal(out.before, null);
});

test('undo of an insertion removes the attribute and its separator', () => {
  const original = page('<img class="w-8">');
  const inserted = spliceMediaSrc(original, at(original), '/_1_/l3/assets/a.png');
  assert.ok(inserted.ok);
  const back = spliceMediaSrc(inserted.source, at(inserted.source), null);
  assert.ok(back.ok);
  assert.equal(back.source, original);
  assert.equal(back.before, '/_1_/l3/assets/a.png');
});

test('splice refuses blob/data urls, quotes, templates and a binding src', () => {
  const src = page('<img src="/old.png">');
  for (const bad of ['blob:https://x/1', 'data:image/png;base64,AA', '/a".png', '/a/${x}.png', 'relative.png']) {
    assert.deepEqual(spliceMediaSrc(src, at(src), bad), { ok: false, reason: 'reason.mediaSrcBadUrl' }, bad);
  }
  const bound = page('<img src=${this.photo}>');
  assert.deepEqual(spliceMediaSrc(bound, at(bound), '/_1_/l3/assets/a.png'), { ok: false, reason: 'reason.mediaSrcIsData' });
  assert.equal(isWritableMediaUrl('/_1_/l3/assets/a.png'), true);
});

test('label is the file name', () => {
  assert.equal(mediaFileLabel('/_1_/l3/assets/brand/logo.svg?v=2'), 'logo.svg');
  assert.equal(mediaFileLabel(''), '');
});

test('media molecules: kind by tag, then by the sources declared mime; a video takes a poster', () => {
  assert.equal(moleculeMediaKind('groupplaymedia--ml-image-gallery'), 'image');
  assert.equal(moleculeMediaKind('groupplaymedia--ml-video-player'), 'video');
  assert.equal(moleculeMediaKind('groupplaymedia--ml-audio-player'), 'audio');
  assert.equal(moleculeMediaKind('groupplaymedia--ml-pdf-viewer'), 'document');
  assert.equal(moleculeMediaKind('groupplaymedia--ml-player', ['', 'video/mp4']), 'video');
  assert.equal(moleculeMediaKind('groupviewtable--ml-data-table'), null);
  assert.deepEqual(categoriesFor('document'), ['document']);
  assert.equal(hasPoster('video'), true);
  assert.equal(hasPoster('image'), false);
});

test('mime by extension, query and hash ignored; unknown = empty', () => {
  assert.equal(mimeOfUrl('/_1_/l3/assets/a.JPG'), 'image/jpeg');
  assert.equal(mimeOfUrl('/_1_/l3/assets/clip.webm?v=2'), 'video/webm');
  assert.equal(mimeOfUrl('/_1_/l3/assets/song.mp3#t=3'), 'audio/mpeg');
  assert.equal(mimeOfUrl('/_1_/l3/assets/doc.pdf'), 'application/pdf');
  assert.equal(mimeOfUrl('/_1_/l3/assets/readme'), '');
  assert.equal(mimeOfUrl('/a.dir/file'), '');
  assert.equal(isWritableMediaValue('type', 'video/mp4'), true);
  assert.equal(isWritableMediaValue('type', 'video mp4'), false);
  assert.equal(isWritableMediaValue('poster', '/_1_/l3/assets/c.png'), true);
});

test('a Source swap writes src and the matching type in one splice', () => {
  const src = 'html`<ml-video><Source src="https://x/a.mp4" type="video/mp4"></Source></ml-video>`';
  const open = src.indexOf('<Source');
  const changes = sourceChanges('/_1_/l3/assets/b.webm', readMediaValue(src, open, 'type') ?? null);
  assert.deepEqual(changes.map((c) => c.name), ['src', 'type']);
  const out = spliceMediaAttributes(src, open, changes);
  assert.ok(out.ok);
  assert.equal(out.source, 'html`<ml-video><Source src="/_1_/l3/assets/b.webm" type="video/webm"></Source></ml-video>`');
  assert.deepEqual(out.before, [{ name: 'src', value: 'https://x/a.mp4' }, { name: 'type', value: 'video/mp4' }]);
  // The undo: the befores, checked against what the forward write left.
  const back = spliceMediaAttributes(out.source, open, [
    { name: 'src', from: '/_1_/l3/assets/b.webm', to: 'https://x/a.mp4' },
    { name: 'type', from: 'video/webm', to: 'video/mp4' },
  ]);
  assert.ok(back.ok);
  assert.equal(back.source, src);
});

test('same mime keeps type untouched; an absent type is inserted and its undo removes it', () => {
  assert.deepEqual(sourceChanges('/_1_/l3/assets/b.mp4', 'video/mp4').map((c) => c.name), ['src']);
  const src = 'html`<Source src="/old.png"></Source>`';
  const out = spliceMediaAttributes(src, 0 + src.indexOf('<Source'), sourceChanges('/_1_/l3/assets/n.png', null));
  assert.ok(out.ok);
  assert.equal(out.source, 'html`<Source type="image/png" src="/_1_/l3/assets/n.png"></Source>`');
  const back = spliceMediaAttributes(out.source, out.source.indexOf('<Source'), [
    { name: 'src', to: '/old.png' }, { name: 'type', to: null },
  ]);
  assert.ok(back.ok);
  assert.equal(back.source, src);
});

test('a stale from or a bound attribute refuses the whole write', () => {
  const src = 'html`<Source src="/a.png" type="image/png"></Source>`';
  const open = src.indexOf('<Source');
  assert.deepEqual(
    spliceMediaAttributes(src, open, [{ name: 'src', from: '/other.png', to: '/b.png' }]),
    { ok: false, reason: 'reason.mediaSrcStale' },
  );
  const bound = 'html`<Source src=${item.url} type="image/png"></Source>`';
  assert.deepEqual(
    spliceMediaAttributes(bound, bound.indexOf('<Source'), sourceChanges('/b.png', 'image/png')),
    { ok: false, reason: 'reason.mediaSrcIsData' },
  );
});

test('poster: literal replaced, absent inserted, binding refused', () => {
  const literal = 'html`<ml-video poster="/p.png" .muted=${true}></ml-video>`';
  const out = spliceMediaSrc(literal, literal.indexOf('<ml-video'), '/_1_/l3/assets/q.png', 'poster');
  assert.ok(out.ok);
  assert.equal(out.source, 'html`<ml-video poster="/_1_/l3/assets/q.png" .muted=${true}></ml-video>`');
  const absent = 'html`<ml-video .muted=${true}></ml-video>`';
  const added = spliceMediaSrc(absent, absent.indexOf('<ml-video'), '/_1_/l3/assets/q.png', 'poster');
  assert.ok(added.ok && added.before === null);
  assert.equal(added.ok && added.source, 'html`<ml-video poster="/_1_/l3/assets/q.png" .muted=${true}></ml-video>`');
  const bound = 'html`<ml-video poster=${this.cover}></ml-video>`';
  assert.deepEqual(readMediaSrc(bound, bound.indexOf('<ml-video'), 'poster'), { ok: false, reason: 'reason.mediaSrcIsData' });
});

test('the live value reads the stash of any attribute', () => {
  const swapped = new Map([['poster', 'blob:x'], ['data-collab-asset-poster', '/_1_/l3/assets/p.png']]);
  assert.equal(liveMediaSrc({ getAttribute: (n) => swapped.get(n) ?? null }, 'poster'), '/_1_/l3/assets/p.png');
});
