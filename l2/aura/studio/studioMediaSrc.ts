/// <mls fileReference="_102020_/l2/aura/studio/studioMediaSrc.ts" enhancement="_blank" />
// The media rows of the picker: which project file an `<img>` / `<video>` / `<audio>` shows — or a
// media molecule's `<Source>` slots and its `poster` — read from the source and written back.
//
// A media url is not a text (no catalog key): it is written like a molecule property — the literal is
// replaced in place, or the attribute inserted right after the tag name. The url written is always
// the FINAL url of a project asset (`/_<p>_/l3/assets/<file>`), the one the published app serves; on
// screen the studio swaps it for the local bytes (studioAssets, 102033), so a `blob:` must never be
// read back as "the current src" nor written.

import { findAttributeValue, readAttributes, type IAttributeLocation } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import type { MediaCategory } from '/_102020_/l2/aura/plugins/helpers/assetsMediaCore.js';

export type MediaKind = 'image' | 'video' | 'audio' | 'document';

export const MEDIA_SRC_ATTRIBUTE = 'src';
export const MEDIA_TYPE_ATTRIBUTE = 'type';
export const MEDIA_POSTER_ATTRIBUTE = 'poster';

/** The slot a media molecule reads its files from (`<Source src type>`). */
export const MEDIA_SOURCE_SLOT = 'Source';

/** Where the studio keeps the final url of an attribute it swapped for a `blob:` (studioAssets). */
export const ASSET_STASH_PREFIX = 'data-collab-asset-';

const MEDIA_TAGS: Readonly<Record<string, MediaKind>> = { img: 'image', video: 'video', audio: 'audio' };

export function mediaKindOf(tag: string): MediaKind | null {
  return MEDIA_TAGS[tag.toLowerCase()] ?? null;
}

/** Which asset categories a media kind can show: an image takes pictures and svg icons. */
export function categoriesFor(kind: MediaKind): MediaCategory[] {
  if (kind === 'image') return ['image', 'icon'];
  return [kind];
}

/**
 * What a media molecule plays, from its tag (`ml-image-gallery`, `ml-video-player`) and, failing
 * that, from the mime types its sources declare. Null = not a media molecule.
 */
export function moleculeMediaKind(tag: string, types: readonly string[] = []): MediaKind | null {
  const name = tag.toLowerCase();
  if (/image|gallery|photo|picture/u.test(name)) return 'image';
  if (/video/u.test(name)) return 'video';
  if (/audio|podcast|sound/u.test(name)) return 'audio';
  if (/pdf|document/u.test(name)) return 'document';
  for (const type of types) {
    const mime = type.toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime === 'application/pdf') return 'document';
  }
  return null;
}

/** Whether the molecule takes a cover picture (`poster`) — a video does. */
export function hasPoster(kind: MediaKind): boolean {
  return kind === 'video';
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  avif: 'image/avif', bmp: 'image/bmp', svg: 'image/svg+xml', ico: 'image/x-icon', tif: 'image/tiff', tiff: 'image/tiff',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/opus',
  m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
  pdf: 'application/pdf',
};

/** The mime a `<Source type>` should say for a url, by its extension; '' when unknown. */
export function mimeOfUrl(url: string): string {
  const path = url.replace(/[?#].*$/u, '');
  const dot = path.lastIndexOf('.');
  if (dot < 0 || dot < path.lastIndexOf('/')) return '';
  return MIME_BY_EXTENSION[path.slice(dot + 1).toLowerCase()] ?? '';
}

/** The final url on screen: the studio's stash when it swapped it, the attribute otherwise. */
export function liveMediaSrc(
  el: { getAttribute(name: string): string | null },
  attribute: string = MEDIA_SRC_ATTRIBUTE,
): string {
  return el.getAttribute(`${ASSET_STASH_PREFIX}${attribute}`) ?? el.getAttribute(attribute) ?? '';
}

export type MediaSrcReason =
  | 'reason.mediaSrcIsData'
  | 'reason.mediaSrcMixed'
  | 'reason.mediaSrcNotLocated'
  | 'reason.mediaSourceRepeated';

export type MediaSrcPlan =
  | { ok: true; kind: 'literal'; value: string; start: number; end: number }
  | { ok: true; kind: 'absent' }
  | { ok: false; reason: MediaSrcReason };

/** What the source lets a media row do with one attribute of an element. */
export function planMediaSrc(found: IAttributeLocation | null): MediaSrcPlan {
  if (!found) return { ok: false, reason: 'reason.mediaSrcNotLocated' };
  if (found.kind === 'expression') return { ok: false, reason: 'reason.mediaSrcIsData' };
  if (found.kind === 'absent') return { ok: true, kind: 'absent' };
  // Part markup, part code (`/img/${id}.png`): replacing it would drop the binding.
  if (found.value.includes('${')) return { ok: false, reason: 'reason.mediaSrcMixed' };
  return { ok: true, kind: 'literal', value: found.value, start: found.start, end: found.end };
}

export function readMediaSrc(source: string, openStart: number, attribute: string = MEDIA_SRC_ATTRIBUTE): MediaSrcPlan {
  return planMediaSrc(openStart >= 0 ? findAttributeValue(source, openStart, attribute) : null);
}

/** What the attribute says now: the literal, null when absent, undefined when it cannot be written. */
export function readMediaValue(source: string, openStart: number, attribute: string): string | null | undefined {
  const plan = readMediaSrc(source, openStart, attribute);
  if (!plan.ok) return undefined;
  return plan.kind === 'literal' ? plan.value : null;
}

/**
 * A url a media row may write: a site path, or an absolute http(s) url — the one a page already had,
 * put back by an undo. No quote, no template, never a `blob:`/`data:` nor a relative path.
 */
export function isWritableMediaUrl(url: string): boolean {
  return (url.startsWith('/') || /^https?:\/\//u.test(url)) &&!/["'`<>\s]|\$\{/u.test(url);
}

/** A value a media attribute may receive: a url for `src`/`poster`, a mime for `type`. */
export function isWritableMediaValue(attribute: string, value: string): boolean {
  if (attribute === MEDIA_TYPE_ATTRIBUTE) return /^[\w.+-]+\/[\w.+-]+$/u.test(value);
  return isWritableMediaUrl(value);
}

export type MediaSrcSplice =
  | { ok: true; source: string; before: string | null }
  | { ok: false; reason: MediaSrcReason | 'reason.mediaSrcBadUrl' };

/**
 * Writes one attribute (`src` by default) on the element that starts at `openStart`. `before` is what
 * was there (null = the attribute did not exist), so the step can be undone. `to === null` removes the
 * attribute — the undo of an insertion.
 */
export function spliceMediaSrc(
  source: string,
  openStart: number,
  to: string | null,
  attribute: string = MEDIA_SRC_ATTRIBUTE,
): MediaSrcSplice {
  if (to !== null && !isWritableMediaValue(attribute, to)) return { ok: false, reason: 'reason.mediaSrcBadUrl' };
  const plan = readMediaSrc(source, openStart, attribute);
  if (!plan.ok) return plan;

  if (plan.kind === 'literal') {
    if (to === null) {
      // Remove the whole ` name="…"`, the separator before it included.
      const found = readAttributes(source, openStart).find((entry) => entry.name === attribute);
      if (!found) return { ok: false, reason: 'reason.mediaSrcNotLocated' };
      let from = found.start;
      while (from > openStart && /\s/u.test(source[from - 1])) from--;
      return { ok: true, source: source.slice(0, from) + source.slice(found.end), before: plan.value };
    }
    return { ok: true, source: source.slice(0, plan.start) + to + source.slice(plan.end), before: plan.value };
  }

  if (to === null) return { ok: true, source, before: null };
  const tagName = /^<\s*[a-zA-Z][\w-]*/u.exec(source.slice(openStart));
  if (!tagName) return { ok: false, reason: 'reason.mediaSrcNotLocated' };
  const at = openStart + tagName[0].length;
  return { ok: true, source: `${source.slice(0, at)} ${attribute}="${to}"${source.slice(at)}`, before: null };
}

/** One attribute of a media write: what it must say now (`from`, when checked) and what it becomes. */
export interface IMediaAttrChange {
  name: string;
  from?: string | null;
  to: string | null;
}

export type MediaAttrsSplice =
  | { ok: true; source: string; before: Array<{ name: string; value: string | null }> }
  | { ok: false; reason: MediaSrcReason | 'reason.mediaSrcBadUrl' | 'reason.mediaSrcStale' };

/**
 * Several attributes of ONE open tag in one write (`src` and `type` of a `<Source>`). The open tag
 * starts at the same offset after each splice — every change lands past it — so they chain. A change
 * whose `from` no longer matches refuses the whole write: nothing is half-applied.
 */
export function spliceMediaAttributes(source: string, openStart: number, changes: readonly IMediaAttrChange[]): MediaAttrsSplice {
  let next = source;
  const before: Array<{ name: string; value: string | null }> = [];
  for (const change of changes) {
    const now = readMediaValue(next, openStart, change.name);
    if (now === undefined) {
      const plan = readMediaSrc(next, openStart, change.name);
      return { ok: false, reason: plan.ok ? 'reason.mediaSrcNotLocated' : plan.reason };
    }
    if (change.from !== undefined && now !== change.from) return { ok: false, reason: 'reason.mediaSrcStale' };
    if (now === change.to) {
      before.push({ name: change.name, value: now });
      continue;
    }
    const spliced = spliceMediaSrc(next, openStart, change.to, change.name);
    if (!spliced.ok) return spliced;
    next = spliced.source;
    before.push({ name: change.name, value: spliced.before });
  }
  return { ok: true, source: next, before };
}

/**
 * What a `<Source>` swap writes: the new url and, when the extension names one, the matching `type` —
 * a `<video>` refuses a source whose declared type does not fit the file. An unknown extension leaves
 * `type` alone.
 */
export function sourceChanges(url: string, currentType: string | null): IMediaAttrChange[] {
  const changes: IMediaAttrChange[] = [{ name: MEDIA_SRC_ATTRIBUTE, to: url }];
  const mime = mimeOfUrl(url);
  if (mime && mime !== currentType) changes.push({ name: MEDIA_TYPE_ATTRIBUTE, to: mime });
  return changes;
}

/** The file name a url shows, for the row's label. */
export function mediaFileLabel(url: string): string {
  const path = url.replace(/[?#].*$/u, '');
  return path.slice(path.lastIndexOf('/') + 1) || url;
}

/** Size of the hover preview of a gallery card, in CSS pixels. */
export const PEEK_WIDTH = 240;
export const PEEK_HEIGHT = 220;
const PEEK_GAP = 10;
const PEEK_MARGIN = 8;

/**
 * Where the hover preview of a gallery card goes, in viewport coordinates.
 *
 * To the LEFT of the card when it fits — the panel sits on the right of the screen, floating or
 * docked, so that side is the page — else to the right, kept inside the viewport. Its top follows
 * the card, clamped so the whole preview stays on screen.
 */
export function peekPosition(
  card: { left: number; right: number; top: number },
  viewportWidth: number,
  viewportHeight: number,
): { left: number; top: number } {
  const before = card.left - PEEK_GAP - PEEK_WIDTH;
  const left = before >= PEEK_MARGIN
    ? before
    : Math.max(PEEK_MARGIN, Math.min(card.right + PEEK_GAP, viewportWidth - PEEK_WIDTH - PEEK_MARGIN));
  const top = Math.max(PEEK_MARGIN, Math.min(card.top, viewportHeight - PEEK_HEIGHT - PEEK_MARGIN));
  return { left: Math.round(left), top: Math.round(top) };
}

/** The step of the media viewer: wraps around both ends, so ‹ on the first file goes to the last. */
export function stepIndex(index: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  return ((index + delta) % length + length) % length;
}
