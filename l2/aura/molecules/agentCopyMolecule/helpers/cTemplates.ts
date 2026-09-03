/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.ts" enhancement="_blank"/>

// Pure string surgery on the copied artifacts. THE RULE OF THIS FILE: the body is never
// rewritten. Only three things may change, and every function here does exactly one of them:
//
//  1. the mls header fileReference  — the M2 lesson: a wrong project in the header breaks
//     the file's identity;
//  2. the copiedFrom provenance line — inserted right after the header;
//  3. the IDENTITY (tag + class name) — used ONLY on the two paths that need it: the
//     flattened shell (parent body under the shell's identity) and the rename after a
//     collision. On the default path nothing here touches identity, because the copy keeps
//     the origin's name.
//
// Why this is not vTemplates.renderShellDefs promoted to shared/: that function swaps the
// TagName line ALWAYS, and the default path here must NOT (same tag). A shared helper with
// a flag is what agentsBestPractices §2 forbids ("policy-frozen … must not know about any
// specific step").

import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { copyClassName, copyShortName, copyTag } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';

// A tag is [a-z0-9-]+, so one tag can be the PREFIX of another — and that is the RULE, not the
// exception, in the shells: 'grouptriggeraction--ml-button-standard-brutal' contains
// 'grouptriggeraction--ml-button-standard'. Substring replacement would turn the parent tag
// inside the shell tag into 'ml-button-standard-brutal-brutal'. Every tag substitution here goes
// through this function, which only matches a tag that is not glued to more tag characters.
export function replaceTag(source: string, fromTag: string, toTag: string): string {
  if (!fromTag || !toTag || fromTag === toTag) return source;
  return source.replace(new RegExp(`(?<![a-z0-9-])${escapeRegExp(fromTag)}(?![a-z0-9-])`, 'g'), toTag);
}

// Whether a tag appears on its own (not as a prefix of a longer tag). The c3 gate uses it to
// catch a parent tag surviving a flatten.
export function containsTag(source: string, tag: string): boolean {
  if (!tag) return false;
  return new RegExp(`(?<![a-z0-9-])${escapeRegExp(tag)}(?![a-z0-9-])`).test(source);
}

export interface CopyIdentity {
  tag: string;
  className: string;
}

// The identity the copy is written with (default = the origin's own).
export function targetIdentity(item: CopyItem): CopyIdentity {
  return { tag: copyTag(item), className: copyClassName(item) };
}

// The identity present in the SOURCE of the .ts body: the parent's when flattening (the
// body comes from the parent), the origin's otherwise.
export function sourceIdentity(item: CopyItem): CopyIdentity {
  if (item.origin.chain.isShell) {
    return {
      tag: `${item.origin.chain.parentGroup}--${item.origin.chain.parentShortName}`,
      className: item.origin.chain.parentClassName || '',
    };
  }
  return { tag: item.origin.tag, className: item.origin.className };
}

// ---- headers -----------------------------------------------------------------

const ENHANCEMENT_BY_EXTENSION: Record<string, string> = {
  '.ts': '_102020_/l2/enhancementAura',
  '.defs.ts': '_blank',
  '.less': '_102020_/l2/enhancementStyleAura',
};

export function renderHeader(project: number, group: string, shortName: string, extension: '.ts' | '.defs.ts' | '.less'): string {
  const enhancement = ENHANCEMENT_BY_EXTENSION[extension];
  return `/// <mls fileReference="_${project}_/l2/molecules/${group}/${shortName}${extension}" enhancement="${enhancement}"/>`;
}

export function hasMlsHeader(source: string): boolean {
  return /^\s*\/\/\/\s*<mls\b/.test(source.split('\n')[0] || '');
}

// Replace the source header with the destination's; prepend one when the file has none.
export function swapHeader(source: string, header: string): string {
  const clean = source.replace(/^﻿/, '');
  const lines = clean.split('\n');
  if (hasMlsHeader(clean)) {
    lines[0] = header;
    return lines.join('\n');
  }
  return `${header}\n${clean}`;
}

// ---- provenance --------------------------------------------------------------

// Freezing without a record becomes a mystery in six months (analysis §8.6). In the
// flattened path the line names BOTH: what was asked for, and where the body came from.
export function renderCopiedFrom(item: CopyItem, date: string): string {
  const base = `// copiedFrom: ${item.origin.ref} @ ${date}`;
  if (!item.origin.chain.isShell) return base;
  return `${base} (casca achatada; corpo de ${item.origin.chain.parentRef})`;
}

export function insertCopiedFrom(source: string, copiedFromLine: string): string {
  const lines = source.split('\n');
  if (hasMlsHeader(source)) {
    lines.splice(1, 0, copiedFromLine);
    return lines.join('\n');
  }
  return `${copiedFromLine}\n${source}`;
}

export function extractCopiedFrom(source: string): string | null {
  const match = source.match(/^\/\/\s*copiedFrom:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// ---- identity ----------------------------------------------------------------

// Swap tag + class name. Used on the flattened path (parent -> shell identity) and on the
// renamed path (origin -> new name). A no-op when the two identities are equal, which is
// the DEFAULT path: the copy keeps the origin's name and this function must not touch a
// single byte there.
export function swapIdentity(source: string, from: CopyIdentity, to: CopyIdentity): string {
  let out = replaceTag(source, from.tag, to.tag);
  if (from.className && to.className && from.className !== to.className) {
    out = out.replace(new RegExp(`\\b${escapeRegExp(from.className)}\\b`, 'g'), to.className);
  }
  return out;
}

// The `- TagName: <tag>` line of a .defs.ts skill. Left ALONE on the default path; swapped
// when the defs came from the parent (flattened, shell without its own defs) or on a rename.
export function swapDefsTagName(defs: string, tag: string): string {
  return defs.replace(/^(\s*-\s*TagName:\s*).*$/m, `$1${tag}`);
}

export function extractDefsTagName(defs: string): string | null {
  const match = defs.match(/^\s*-\s*TagName:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

// The root selector of a molecule sheet IS its tag. On the default path the sheet already
// carries the right one (same name); on a rename it is re-scoped.
export function swapLessRootSelector(less: string, fromTag: string, toTag: string): string {
  return replaceTag(less, fromTag, toTag);
}

// The root selectors of a sheet, ONE PER COMMA PART. The comma split is not cosmetic: a portal
// molecule scopes itself twice — `tag,\ndiv[data-widget="tag"] { … }` — and returning that whole
// text as a single selector is what made the c4 gate reject a perfectly good copy of
// ml-datetime-picker in the Studio (2026-08-20). Every portal molecule would have failed.
export function extractLessRootSelectors(less: string): string[] {
  const scrubbed = less.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/[^\n]*$/gm, '');
  const selectors: string[] = [];
  const pattern = /^([^{}@\s][^{}]*)\{/gm;
  for (const match of scrubbed.matchAll(pattern)) {
    for (const part of match[1].split(',')) {
      const selector = part.trim().replace(/\s+/g, ' ');
      if (selector) selectors.push(selector);
    }
  }
  return selectors;
}

// Is this root selector scoped to the copy's tag? Either the tag itself (possibly with a pseudo,
// class or descendant) or the PORTAL form: the panel a portal molecule renders into document.body
// carries data-widget=<tag>, so `div[data-widget="<tag>"]` is the same scope by another route.
export function isTagScopedSelector(selector: string, tag: string): boolean {
  if (selector === tag) return true;
  if (selector.startsWith(`${tag} `) || selector.startsWith(`${tag}.`) || selector.startsWith(`${tag}:`)) return true;
  return new RegExp(`\\[data-widget\\s*=\\s*["']${escapeRegExp(tag)}["']\\]`).test(selector);
}

// ---- the i18n block ----------------------------------------------------------

// The whole point of the agent: this block must cross the copy untouched. Returned as a
// raw slice so the c3 gate can compare source and copy byte for byte.
export function extractI18nBlock(source: string): string | null {
  const match = source.match(/\/\/\/\s*\*\*collab_i18n_start\*\*[\s\S]*?\/\/\/\s*\*\*collab_i18n_end\*\*/);
  return match ? match[0] : null;
}

// ---- composition -------------------------------------------------------------

// The .ts of a copy: body (origin's, or the parent's when flattening) + destination header
// + copiedFrom + identity applied. Nothing else is rewritten.
export function renderCopiedTs(item: CopyItem, bodySource: string, destProject: number, date: string): string {
  const shortName = copyShortName(item);
  const header = renderHeader(destProject, item.destination.group, shortName, '.ts');
  const identity = swapIdentity(bodySource, sourceIdentity(item), targetIdentity(item));
  return insertCopiedFrom(swapHeader(identity, header), renderCopiedFrom(item, date));
}

// The .defs.ts of a copy. `fromParent` is true when the shell had no .defs.ts of its own
// (41 of the 42 shells of 102054): then the TagName line has to be swapped, because it
// carries the parent's tag. With the shell's own defs — every shell of 102055 — the line is
// already right and stays untouched.
export function renderCopiedDefs(item: CopyItem, defsSource: string, destProject: number, date: string, fromParent: boolean): string {
  const shortName = copyShortName(item);
  const header = renderHeader(destProject, item.destination.group, shortName, '.defs.ts');
  const tag = copyTag(item);
  let out = swapHeader(defsSource, header);
  if (fromParent || item.rename) out = swapDefsTagName(out, tag);
  return insertCopiedFrom(out, renderCopiedFrom(item, date));
}

// The .less of a copy: verbatim + header, re-scoped only on a rename. The source is ALWAYS
// the sheet of the molecule that was asked for (the shell's when flattening — it is the
// appearance the client chose), never the parent's.
export function renderCopiedLess(item: CopyItem, lessSource: string, destProject: number): string {
  const shortName = copyShortName(item);
  const header = renderHeader(destProject, item.destination.group, shortName, '.less');
  const rescoped = swapLessRootSelector(lessSource, item.origin.tag, copyTag(item));
  return swapHeader(rescoped, header);
}

// The .html demo: verbatim, and with NO header — measured 2026-08-19: 0 of 153 molecule
// .html files carry an mls header. Only a rename touches it (every tag occurrence).
export function renderCopiedHtml(item: CopyItem, htmlSource: string): string {
  return replaceTag(htmlSource, item.origin.tag, copyTag(item));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
