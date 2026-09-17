/// <mls fileReference="_102020_/l2/aura/studio/studioAdoptEdit.ts" enhancement="_blank" />
// Swapping a raw control for a molecule of the catalog (TASK-102020-adopt-molecules).
//
// WHAT THIS IS, NEXT TO THE OTHER EDITS
// The editor swaps text, swaps classes, moves, duplicates and removes. All of those keep the page's
// VOCABULARY: a `<button>` stays a `<button>`. This is the operation that changes it — the slice of a
// raw control is replaced by the molecule the design system resolves for its group, with the
// behaviour carried across. Written as a slice replacement, so it is the same primitive
// studioMoveEdit already proved: one write, one undo, byte for byte.
//
// WHAT LIVES HERE AND WHAT DOES NOT
// Here: the SHAPE of an element as the source writes it (`describeElement`), and the assembly of the
// new source (`planAdopt` / `composeAdopt` / `planUnadopt`). Neither knows what a button is.
//
// Not here: the knowledge of each GROUP — which elements candidate, what `@click` becomes, which
// slot the text goes into. That is one hand-written file per group, next to the group's `usage.ts`
// (`_102020_/l2/aura/molecules/skills/<group>/adopt.ts`), because the slot contract is the group's
// and the `.defs.ts` of the 102040 are generated ("Do not change") and cannot host it. A new group is
// a new file there and nothing here.
//
// Pure, like every core of this editor: no DOM, no stor, no model, and no prose — what the user reads
// is decided by message ids (studioMessages).

import {
  readAttributes,
  splitUtilities,
  styleCategory,
  utilityLabel,
  type IOpenTagAttribute,
  type ITemplateTree,
} from '/_102020_/l2/aura/studio/studioClassEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export const ADOPT_NO_TARGET: IMessageRef = { id: 'reason.adoptNoTarget' };
export const ADOPT_UNCLOSED: IMessageRef = { id: 'reason.adoptUnclosed' };
export const ADOPT_STALE: IMessageRef = { id: 'reason.adoptStale' };
export const ADOPT_NO_MOLECULE: IMessageRef = { id: 'reason.adoptNoMolecule' };

/** An attribute the converter does not know: the conversion is refused NAMING it (risk 1). */
export function adoptUnknownAttributes(names: readonly string[]): IMessageRef {
  return { id: 'reason.adoptUnknownAttr', params: { attrs: names.join(', ') } };
}

// ── The element, as the SOURCE writes it ────────────────────────────────────

/**
 * What a group's predicate decides on.
 *
 * The SOURCE and not the DOM, deliberately: the DOM has the rendered result (a `<button>` inside a
 * shadow root, a value already interpolated) while the conversion rewrites markup, and the two
 * disagree about exactly the things that matter — a binding, an `${...}`, a slot.
 *
 * ONE LEVEL EACH WAY. `children` because a button may carry an icon and a `<label>` a control, and
 * `parent` because the unit replaced is often an ancestor of what was clicked (see `lift`): measured
 * on the real pages, 98,8% of the `<input>`s live inside a `<label>` that carries their text. Deeper
 * than that nothing needs, and every extra level is source held twice.
 */
export interface IElementShape {
  /** Index in `tree.elements` — the handle the caller resolves back to an element. */
  index: number;
  tag: string;
  /** The class literal, as written; null when absent or computed (`class=${classMap(…)}`). */
  literal: string | null;
  attrs: IOpenTagAttribute[];
  /** `[openStart, end)` — the whole element, children and `${...}` included. */
  span: { start: number; end: number };
  /** Between the open tag and the close tag. Empty for a void element. */
  innerSpan: { start: number; end: number };
  inner: string;
  /** Element children, in source order. Their own `children` are empty and their `parent` is null. */
  children: IElementShape[];
  /** The element that contains this one, with ITS children — null at a template root. */
  parent: IElementShape | null;
}

/**
 * Where a group's candidacy points and why.
 *
 * `lift` is the field the measurement forced: a predicate that answered yes/no could only ever
 * replace the element that was clicked, and for a text field that is the `<input>` inside a
 * `<label>` — swapping it alone would leave the label's text orphaned next to a molecule that has a
 * `Label` slot of its own. So the answer is "how many levels up the unit is": 0 is the element
 * itself, 1 its parent.
 */
export interface IAdoptCandidate {
  group: string;
  lift: number;
  /** One line: why this element is this group. Shown before the gesture. */
  why: IMessageRef;
  /** What the converter RECOGNISED — this is what the panel shows, and what the preview mounts. */
  parts: IAdoptParts;
  /** What the user has to know before confirming (a defaulted variant, a discarded look). */
  warnings: IMessageRef[];
  /** How the preview fills the molecule's slots. Absent = one slot, filled with what is replaced. */
  previewSlots?: IAdoptPreviewSlot[];
}

export interface IAdoptParts {
  /** The label's markup, as the source writes it (`${msg['common.refresh']}`). */
  label?: string;
  /** Icon markup found inside the control. */
  icon?: string;
  /** The design-system tone that became `data-variant`. */
  variant?: string;
  /**
   * How many repeated slots the conversion found — the `<Item>`s of a list.
   *
   * A group whose content is ONE slot has nothing to say here and leaves it out. A list does: the
   * options of a `<select>` are usually built by a `${…map(…)}`, so the panel showing "12 items"
   * is the only place the user sees that the whole list was read and not just the first row.
   */
  items?: number;
  /** Event bindings after conversion: `@action` -> the expression it binds. */
  events: Record<string, string>;
}

/**
 * Where the PREVIEW takes the content of one slot from — declared by the group, filled by the editor.
 *
 * The preview mounts the real molecule, and its slots have to be filled with words: the source has a
 * binding where the text is, so the only place the text exists is the screen. A group whose content
 * is one slot needs nothing here (the editor's default is exactly that case). A list does: `Item`
 * has one holder per live child of the control, with that child's own attributes — which is how
 * `<option value="open">Open</option>` becomes `<Item value="open">Open</Item>` without the editor
 * knowing what an option is.
 */
export interface IAdoptPreviewSlot {
  /** The slot tag, as the molecule declares it (`Label`, `Item`). */
  slot: string;
  /** `replaced`: the nodes of what disappears, minus the controls. `children`: one per live child. */
  from: 'replaced' | 'children';
}

/** The molecule the write uses — `tag` is `catalog.tag` VERBATIM (risk 2), never derived. */
export interface IAdoptTarget {
  tag: string;
  /** Module path of the molecule, as a side-effect import: `/_102040_/l2/molecules/<folder>/<name>.js`. */
  importPath: string;
}

export type AdoptMarkup =
  | { ok: true; markup: string; imports: string[] }
  | { ok: false; reason: IMessageRef };

/**
 * What one group's hand-written file exports.
 *
 * Two pure functions and the group's own name. The studio loads the file by group and never knows
 * which group it got — that is what makes "a new group is one new file" true.
 */
export interface IAdoptGroupRules {
  group: string;
  candidate(shape: IElementShape): IAdoptCandidate | null;
  convert(shape: IElementShape, candidate: IAdoptCandidate, target: IAdoptTarget): AdoptMarkup;
}

/**
 * Whether a tag is a CORE html element — the only thing an adoption can start from.
 *
 * The hyphen is the html spec's own rule: a custom element name must contain one, and no built-in
 * element does. So this answers "is this the page's own markup or a component" without a list to
 * keep up to date, and it is the same test the genome's molecule knob makes on the other side.
 *
 * A molecule is not adoptable because swapping one for another is a different question — WHICH
 * variant of the group — and that one is the knob's, not this editor's.
 */
export function isCoreElementTag(tag: string): boolean {
  return Boolean(tag) && !tag.includes('-');
}

// ── Reading the element ─────────────────────────────────────────────────────

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);

/** Offset just past the `>` of the open tag — where the element's own content starts. */
function innerStartOf(source: string, openStart: number): number {
  // The scan already delimited the tag; finding the `>` again here would have to repeat
  // `findOpenTagEnd`'s quote and `${...}` skipping, so it is done by the same walk instead.
  let i = openStart + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '"' || ch === "'") {
      i += 1;
      while (i < source.length && source[i] !== ch) i += 1;
      i += 1;
      continue;
    }
    if (ch === '$' && source[i + 1] === '{') { i = skipTemplateExpression(source, i); continue; }
    if (ch === '>') return i + 1;
    i += 1;
  }
  return source.length;
}

/** Local copy of the scanner's `${...}` walk — brace-, string- and template-aware. */
function skipTemplateExpression(source: string, at: number): number {
  let i = at + 2;
  let braces = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === '\\') { i += 2; continue; }
    if (ch === '"' || ch === "'") {
      i += 1;
      while (i < source.length && source[i] !== ch) i += source[i] === '\\' ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch === '`') {
      i += 1;
      let nested = 0;
      while (i < source.length) {
        if (source[i] === '\\') { i += 2; continue; }
        if (source[i] === '$' && source[i + 1] === '{') { nested += 1; i += 2; continue; }
        if (source[i] === '}' && nested > 0) { nested -= 1; i += 1; continue; }
        if (source[i] === '`' && nested === 0) { i += 1; break; }
        i += 1;
      }
      continue;
    }
    if (ch === '{') { braces += 1; i += 1; continue; }
    if (ch === '}') {
      if (braces === 0) return i + 1;
      braces -= 1;
      i += 1;
      continue;
    }
    i += 1;
  }
  return source.length;
}

/** One element, without walking further than `depth` levels of children. */
function shapeOf(source: string, tree: ITemplateTree, index: number, depth: number): IElementShape | null {
  const element = tree.elements[index];
  if (!element) return null;

  const innerStart = innerStartOf(source, element.openStart);
  // A void element has no content and no close tag; anything else ends at its own `</tag>`, which is
  // the LAST `</` before the element's end — its children's close tags all come before it.
  //
  // `end - 1` and not `end`: `end` is the offset just PAST the close tag, and a sibling's close tag
  // can start exactly there (`</button></div>`) — searching from `end` would find that one and the
  // content would swallow the element's own closing tag.
  const closeAt = VOID_TAGS.has(element.tag) || element.end <= innerStart
    ? innerStart
    : source.lastIndexOf('</', element.end - 1);
  const innerEnd = closeAt >= innerStart ? closeAt : innerStart;

  const children: IElementShape[] = [];
  if (depth > 0) {
    for (const [i, candidate] of tree.elements.entries()) {
      if (candidate.parent !== index) continue;
      const child = shapeOf(source, tree, i, depth - 1);
      if (child) children.push(child);
    }
    children.sort((a, b) => a.span.start - b.span.start);
  }

  return {
    index,
    tag: element.tag,
    literal: element.literal,
    attrs: readAttributes(source, element.openStart),
    span: { start: element.openStart, end: element.end },
    innerSpan: { start: innerStart, end: innerEnd },
    inner: source.slice(innerStart, innerEnd),
    children,
    parent: null,
  };
}

/**
 * The element at `index`, with its children and its parent — everything a predicate may ask.
 *
 * The parent comes with ITS children (one level) because that is the question `lift` answers: a
 * `<label>` is the unit only when the control is its single element child, and counting those needs
 * the siblings.
 */
export function describeElement(source: string, tree: ITemplateTree, index: number): IElementShape | null {
  const shape = shapeOf(source, tree, index, 1);
  if (!shape) return null;
  const parentIndex = tree.elements[index].parent;
  if (parentIndex >= 0) shape.parent = shapeOf(source, tree, parentIndex, 1);
  return shape;
}

/**
 * The element's OWN text: its inner markup with the children's slices cut out.
 *
 * It is how a `<label>`'s text is separated from the control it wraps — the same cut
 * `fillI18nKeys` makes in the scanner, and for the same reason: inherited upwards, a child's markup
 * would be read as the parent's text and land in a `Label` slot twice.
 */
export function ownText(shape: IElementShape): string {
  return innerWithout(shape, shape.children);
}

/**
 * The classes that TRAVEL to the molecule's `data-class`.
 *
 * Where the element sits and how big it is (`place`) plus its outer margins — what belongs to the
 * PARENT's layout and would be lost with the tag. Everything else (colour, padding, border, radius)
 * is what the molecule now decides, and the group contract is explicit that `data-class` does not
 * beat the variant: both are single-class selectors on the same element, so the one emitted later in
 * the css wins. Carrying a background here would promise a look that silently does not happen.
 */
export function carriedClasses(literal: string | null): string[] {
  if (!literal) return [];
  return splitUtilities(literal)
    .filter((token) => {
      const category = styleCategory(token);
      if (category === 'place') return true;
      if (category !== 'spacing') return false;
      return (utilityLabel(token).property ?? '').startsWith('prop.margin');
    })
    .map((token) => token.raw);
}

// ── Writing it ──────────────────────────────────────────────────────────────

/** Where the new markup goes, and the import that has to go with it. */
export interface IAdoptPlan {
  ok: true;
  /** The slice replaced — the whole element, children included. */
  slice: { start: number; end: number };
  markup: string;
  /** The import line and where it goes, or null when the file already has it. */
  importLine: { at: number; text: string } | null;
}

export type AdoptPlan = IAdoptPlan | { ok: false; reason: IMessageRef };

export type AdoptResult =
  | {
    ok: true;
    source: string;
    /** Where the markup ended up in the NEW source — the address the undo revalidates on. */
    landed: { start: number; end: number };
    /** Where the import line ended up, or null when none was inserted. */
    importSpan: { start: number; end: number } | null;
  }
  | { ok: false; reason: IMessageRef };

/**
 * Same delimitation discipline as the move: a slice starts at `<`, finishes at `>`, and does not run
 * to the end of the file — `end === source.length` is the scanner's sentinel for an element it never
 * saw closed, and replacing THAT would take the rest of the file with it.
 */
function sliceIsWhole(source: string, start: number, end: number): boolean {
  if (start < 0 || end <= start || end >= source.length) return false;
  return source[start] === '<' && source[end - 1] === '>';
}

/** `import '<path>';` — the shape the whole library writes, and the one the page will get. */
export function importLineFor(path: string): string {
  return `import '${path}';`;
}

/** True when the file already imports that exact module — inserting a second one is risk 3. */
export function hasImport(source: string, path: string): boolean {
  const quoted = path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`^\\s*import\\s+['"]${quoted}['"]\\s*;?\\s*$`, 'mu').test(source);
}

/**
 * Where a new import goes: right after the last one.
 *
 * Not at the top of the file — the first line is the `/// <mls …>` header the toolchain reads. With
 * no import at all (which a generated page never is) it goes after that header, so the header stays
 * the first line either way.
 */
export function importAnchor(source: string): number {
  let at = -1;
  for (const match of source.matchAll(/^[ \t]*import\s[^\n]*$/gmu)) {
    at = (match.index ?? 0) + match[0].length;
  }
  if (at >= 0) return at + 1 <= source.length ? at + 1 : at;
  const firstBreak = source.indexOf('\n');
  return firstBreak >= 0 ? firstBreak + 1 : 0;
}

/**
 * The adoption, as offsets — or the reason it cannot happen.
 *
 * ONE plan for both halves (the slice and the import) because they are ONE write: inserting the
 * import separately would leave an undo that puts the element back and forgets the import, or the
 * other way round (risk 3).
 */
export function planAdopt(
  source: string,
  tree: ITemplateTree,
  index: number,
  markup: string,
  imports: readonly string[],
): AdoptPlan {
  const element = tree.elements[index];
  if (!element) return { ok: false, reason: ADOPT_NO_TARGET };
  if (!markup) return { ok: false, reason: ADOPT_NO_MOLECULE };
  if (!sliceIsWhole(source, element.openStart, element.end)) return { ok: false, reason: ADOPT_UNCLOSED };

  const missing = [...new Set(imports)].filter((path) => path && !hasImport(source, path));
  const at = missing.length ? importAnchor(source) : 0;
  // An import landing inside the slice would be written into the markup being replaced.
  if (missing.length && at > element.openStart) return { ok: false, reason: ADOPT_NO_TARGET };

  return {
    ok: true,
    slice: { start: element.openStart, end: element.end },
    markup,
    importLine: missing.length
      ? { at, text: `${missing.map(importLineFor).join('\n')}\n` }
      : null,
  };
}

/**
 * The new source: the slice replaced and the import in, in one string.
 *
 * The slice is spliced FIRST and the import after it, so neither offset has to be corrected — the
 * import always sits before the markup (guarded in `planAdopt`), and splicing from the end leaves
 * everything to its left where it was.
 */
export function composeAdopt(source: string, plan: IAdoptPlan): AdoptResult {
  const { start, end } = plan.slice;
  if (!sliceIsWhole(source, start, end)) return { ok: false, reason: ADOPT_UNCLOSED };
  if (plan.importLine && (plan.importLine.at < 0 || plan.importLine.at > start)) {
    return { ok: false, reason: ADOPT_NO_TARGET };
  }

  const withMarkup = source.slice(0, start) + plan.markup + source.slice(end);
  if (!plan.importLine) {
    return { ok: true, source: withMarkup, landed: { start, end: start + plan.markup.length }, importSpan: null };
  }

  const { at, text } = plan.importLine;
  return {
    ok: true,
    source: withMarkup.slice(0, at) + text + withMarkup.slice(at),
    landed: { start: start + text.length, end: start + text.length + plan.markup.length },
    importSpan: { start: at, end: at + text.length },
  };
}

/** What an adoption has to remember to be undone byte for byte. */
export interface IAdoptStep {
  /** Where the markup is now, and what it says. */
  landed: { start: number; end: number };
  markup: string;
  /** The element that was there — put back verbatim, whitespace included. */
  original: string;
  /** The import line that was inserted, or null when the file already had it. */
  importSpan: { start: number; end: number } | null;
  importText: string;
}

export type UnadoptResult =
  | { ok: true; source: string; restored: { start: number; end: number } }
  | { ok: false; reason: IMessageRef };

/**
 * The undo: the original element back, the import out, byte for byte.
 *
 * Revalidated on the TEXT and never on the offsets alone — an agent (or the user, in the code
 * editor) can rewrite the file between the edit and the undo, and a stale offset would cut something
 * else. The markup has to still be where the step says, and so does the import line; if either is
 * not, the step is refused and the stack goes with it (the same discipline as `planReverse`).
 *
 * The markup is spliced out FIRST: it sits after the import, so removing it does not move the
 * import's offsets, while doing it the other way round would move everything.
 */
export function planUnadopt(source: string, step: IAdoptStep): UnadoptResult {
  const { landed, markup, original, importSpan, importText } = step;
  if (landed.start < 0 || landed.end > source.length || landed.end <= landed.start) {
    return { ok: false, reason: ADOPT_STALE };
  }
  if (source.slice(landed.start, landed.end) !== markup) return { ok: false, reason: ADOPT_STALE };
  if (importSpan) {
    if (importSpan.end > landed.start) return { ok: false, reason: ADOPT_STALE };
    if (source.slice(importSpan.start, importSpan.end) !== importText) {
      return { ok: false, reason: ADOPT_STALE };
    }
  }

  const withOriginal = source.slice(0, landed.start) + original + source.slice(landed.end);
  if (!importSpan) {
    return { ok: true, source: withOriginal, restored: { start: landed.start, end: landed.start + original.length } };
  }
  return {
    ok: true,
    source: withOriginal.slice(0, importSpan.start) + withOriginal.slice(importSpan.end),
    restored: {
      start: landed.start - importText.length,
      end: landed.start - importText.length + original.length,
    },
  };
}

// ── What the converters share ───────────────────────────────────────────────

/**
 * An attribute written as `name="…"`, `name=${…}` or bare, ready to be printed again.
 *
 * The rewriting is verbatim: an expression goes back inside `${}` exactly as it was read, which is
 * what keeps an arrow function with a `>` in it intact.
 */
export function writeAttribute(attribute: IOpenTagAttribute, name = attribute.name): string {
  if (attribute.value.kind === 'bare') return name;
  if (attribute.value.kind === 'expression') return `${name}=\${${attribute.value.expression}}`;
  return `${name}="${attribute.value.value}"`;
}

/**
 * The design-system role a control's classes name, if any.
 *
 * The generator writes colour as `bg-[var(--button-secondary-bg,#ffffff)]`, so the role is in the
 * token and the token is in the class. Measured over the real pages, 81% of the buttons carry one —
 * which is what makes a FAITHFUL `data-variant` possible instead of a guess. The other 19% get the
 * default and a warning, never an invented tone.
 */
export function roleInLiteral(literal: string | null, prefix: string, roles: readonly string[]): string | null {
  if (!literal) return null;
  for (const role of roles) {
    if (literal.includes(`--${prefix}-${role}-`)) return role;
  }
  return null;
}

/** The `data-class="…"` attribute for the classes that travel, or '' when none do. */
export function dataClassAttribute(literal: string | null): string {
  const carried = carriedClasses(literal);
  return carried.length ? ` data-class="${carried.join(' ')}"` : '';
}

/**
 * The element's inner markup with a few children cut out of it.
 *
 * `ownText` is this with every child cut; a converter usually needs the middle ground — a `<label>`
 * minus its control is the text AND the `<span>` that wraps it, which is exactly what the `Label`
 * slot has to receive (measured: 104 of the 257 real label/control pairs write the text inside a
 * `<span>`, the rest write it bare).
 */
export function innerWithout(shape: IElementShape, exclude: readonly IElementShape[]): string {
  const cuts = [...exclude].sort((a, b) => a.span.start - b.span.start);
  let text = '';
  let at = shape.innerSpan.start;
  for (const cut of cuts) {
    if (cut.span.start > at) text += shape.inner.slice(at - shape.innerSpan.start, cut.span.start - shape.innerSpan.start);
    at = Math.max(at, cut.span.end);
  }
  if (at < shape.innerSpan.end) text += shape.inner.slice(at - shape.innerSpan.start);
  return text;
}

/**
 * Whether a markup slice carries a Lit BINDING on some element of its own.
 *
 * It decides whether content may travel into a slot. Most molecules of the catalog read their slots
 * through the SNAPSHOT path (`getSlotContent` + `unsafeHTML`): the consumer's markup is serialized
 * with `outerHTML` and re-parsed, and serializing destroys listeners and property values. Text and
 * `${msg['x']}` survive that (Lit has already turned them into text by the time the molecule reads
 * them); a `@click` on a nested element does not — it would be silently dead on the screen.
 *
 * So a control whose content has behaviour of its own is refused instead of half-converted.
 */
export function hasBindingInside(markup: string): boolean {
  return /<[a-zA-Z][\w-]*[^>]*?\s[@.?][\w-]+\s*=\s*\$\{/u.test(markup);
}

/** How one group maps the attributes it knows — the whole table, declared and not coded. */
export interface IAttributeRules {
  /** Written again under a NEW name: `@click` -> `@action`. */
  rename?: Record<string, string>;
  /** Written again unchanged — the molecule has a property by that name, or the host carries it. */
  keep?: readonly string[];
  /** Read by the converter itself; the generic pass must not write them again (`class`, `type`). */
  consumed?: readonly string[];
  /** Name prefixes that always travel (`aria-`), minus whatever `reserved` takes back. */
  keepPrefixes?: readonly string[];
  /** Names the molecule writes itself — a source that already has one is refused, not overwritten. */
  reserved?: readonly string[];
}

/**
 * Every attribute of the element, classified: written (with its final name) or UNKNOWN.
 *
 * The unknown list is the whole of risk 1: an attribute the converter does not know would otherwise
 * disappear with the tag, in silence. Naming it and refusing is the only honest answer — the user can
 * then decide whether to remove it first or leave the control as it is.
 */
export function classifyAttributes(
  attrs: readonly IOpenTagAttribute[],
  rules: IAttributeRules,
): { written: string[]; unknown: string[] } {
  const written: string[] = [];
  const unknown: string[] = [];

  for (const attribute of attrs) {
    if (rules.consumed?.includes(attribute.name)) continue;
    if (rules.reserved?.includes(attribute.name)) { unknown.push(attribute.name); continue; }
    const renamed = rules.rename?.[attribute.name];
    if (renamed) { written.push(writeAttribute(attribute, renamed)); continue; }
    if (rules.keep?.includes(attribute.name)) { written.push(writeAttribute(attribute)); continue; }
    if (rules.keepPrefixes?.some((prefix) => attribute.name.startsWith(prefix))) {
      written.push(writeAttribute(attribute));
      continue;
    }
    unknown.push(attribute.name);
  }

  return { written, unknown };
}
