/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterText/adopt.ts" enhancement="_blank"/>
// Turning a raw text field of the page into a molecule of THIS group (TASK-102020-adopt-molecules).
//
// THE ONE THING THAT MAKES THIS GROUP DIFFERENT FROM THE BUTTON'S
// The unit replaced is NOT the element that was clicked. Measured over the real pages, 257 of the 260
// `<input>`s live inside a `<label>` that carries their text — and the molecule has a `Label` slot of
// its own, so swapping the `<input>` alone would leave the sentence outside the field, orphaned and
// then duplicated by whoever fills the slot. That is what `lift` is for: the predicate answers "the
// unit is one level up", and the panel highlights it before the gesture.
//
// AND THE ONE THAT MAKES IT EASY
// The generated handler is agnostic of the control's shape — `const value = target && 'value' in
// target ? String(target.value) : ''` — and the molecule exposes `value`. So `.value=${…}` and
// `@input=${…}` keep working on the new tag with the same names, and nothing has to be rewritten.
// The button's `@click` had to become `@action`; here the wiring survives for free.
//
// PURE: no DOM, no catalog, no runtime.

import {
  adoptUnknownAttributes,
  classifyAttributes,
  dataClassAttribute,
  hasBindingInside,
  innerWithout,
  type AdoptMarkup,
  type IAdoptCandidate,
  type IAdoptTarget,
  type IElementShape,
} from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export const group = 'groupEnterText';

/**
 * The `type` values that are FREE-FORM TEXT, and no others.
 *
 * `date`, `number`, `email`, `datetime-local` are `groupEnterDate`, `groupEnterNumber` and their
 * siblings — 100 of the 260 real inputs — and offering them this group would put a text field where a
 * date picker was. An absent `type` is text (139 of the real inputs write none).
 *
 * A `type` that is a BINDING (`type=${…}`, 7 cases) is unknowable statically: the control is whatever
 * the expression says at runtime, so it does not candidate either.
 */
const TEXT_TYPES = new Set(['text', 'search']);

/** Controls: a `<label>` is the unit only when exactly ONE of these sits inside it. */
const CONTROL_TAGS = new Set(['input', 'textarea', 'select', 'button']);

/**
 * The conversion table, as a declaration.
 *
 * Almost every name survives, and that is not luck: the group contract was written from the same
 * HTML vocabulary. The two renames are the molecule's own attribute names (`maxLength` is declared
 * with `attribute: 'max-length'`), and `type` is consumed because it becomes `inputType`.
 *
 * Everything not named here refuses the conversion. `step`, `min`, `max` and `pattern` are absent on
 * purpose: they belong to the number and date groups, and an input carrying them is refused before
 * this table is ever reached.
 */
const ATTRIBUTES = {
  rename: { maxlength: 'max-length', minlength: 'min-length' },
  keep: [
    '.value', 'value', '@input', '@change', '@blur', '@focus',
    'placeholder', 'name', 'id', 'autocomplete', 'title', 'style', 'tabindex',
    '?disabled', 'disabled', '?required', 'required', '?readonly', 'readonly',
  ],
  consumed: ['class', 'type', 'rows'],
  keepPrefixes: ['aria-'],
  reserved: ['data-variant', 'data-class'],
} as const;

const WHY_INPUT: IMessageRef = { id: 'adopt.whyEnterText' };
const WHY_LABEL: IMessageRef = { id: 'adopt.whyEnterTextLabel' };
const WARN_APPEARANCE: IMessageRef = { id: 'adopt.warnAppearance' };
const REFUSE_SHARED_LABEL: IMessageRef = { id: 'reason.adoptSharedLabel' };
const REFUSE_SLOT_BINDINGS: IMessageRef = { id: 'reason.adoptSlotBindings' };

/** How many visible rows a `<textarea>` becomes when it does not say — `rows > 1` is what makes one. */
const DEFAULT_ROWS = 3;

/**
 * Is this element a free-form text field, and what would be replaced?
 *
 * `<input>` of a text type and `<textarea>`. A `<select>` is `groupSelectOne` and an
 * `<input type="date">` is `groupEnterDate`: neither candidates here, which is the negative control
 * of the whole design — a predicate that says yes to everything proves nothing.
 */
export function candidate(shape: IElementShape): IAdoptCandidate | null {
  if (shape.tag !== 'input' && shape.tag !== 'textarea') return null;
  if (shape.tag === 'input') {
    const type = shape.attrs.find((attribute) => attribute.name === 'type' || attribute.name === '.type');
    if (type && (type.value.kind !== 'literal' || !TEXT_TYPES.has(type.value.value))) return null;
  }

  const wrapper = labelWrapper(shape);
  return {
    group,
    lift: wrapper ? 1 : 0,
    why: wrapper ? WHY_LABEL : WHY_INPUT,
    parts: {
      label: wrapper ? innerWithout(wrapper, [shape]).trim() || undefined : undefined,
      variant: undefined,
      events: eventsOf(shape),
    },
    warnings: [WARN_APPEARANCE],
  };
}

/**
 * The markup that replaces the field (or its `<label>`) — or the reason it cannot be written.
 *
 * Called BEFORE the gesture, like every other planner of this editor: what it refuses has to be on
 * screen while the button is still unclicked.
 */
export function convert(shape: IElementShape, cand: IAdoptCandidate, target: IAdoptTarget): AdoptMarkup {
  // A `<label>` holding two controls has no single unit: replacing it would swallow the other
  // control, and replacing only the input would leave the label's text pointing at a molecule that
  // now owns a `Label` of its own. One real page does exactly this (`span + textarea + input`).
  if (cand.lift === 0 && shape.parent?.tag === 'label') return { ok: false, reason: REFUSE_SHARED_LABEL };

  const wrapper = cand.lift === 1 ? labelWrapper(shape) : null;
  if (cand.lift === 1 && !wrapper) return { ok: false, reason: REFUSE_SHARED_LABEL };

  const { written, unknown } = classifyAttributes(shape.attrs, ATTRIBUTES);
  if (unknown.length) return { ok: false, reason: adoptUnknownAttributes(unknown) };

  const label = wrapper ? innerWithout(wrapper, [shape]) : '';
  // The label may hold a `<span>` with its own classes — that travels whole. What it may NOT hold is
  // a binding: this group's molecules read their slots through the snapshot path, which serializes
  // the markup and drops every listener with it.
  if (hasBindingInside(label)) return { ok: false, reason: REFUSE_SLOT_BINDINGS };

  const attributes = [
    inputTypeAttribute(shape),
    rowsAttribute(shape),
    // The classes that travel are the WRAPPER's when the wrapper is what disappears: its width and
    // its margins are what held the field's place in the form. The input's own are the field's look,
    // which is now the molecule's.
    dataClassAttribute((wrapper ?? shape).literal),
    written.length ? ` ${written.join(' ')}` : '',
  ].join('');

  const slots = label.trim() ? `<Label>${label}</Label>` : '';
  return {
    ok: true,
    markup: `<${target.tag}${attributes}>${slots}</${target.tag}>`,
    imports: [target.importPath],
  };
}

/**
 * The `<label>` this control is the single control of — or null.
 *
 * "Single CONTROL", not "single child": 104 of the 257 real pairs write the text inside a `<span>`,
 * so a child count would reject exactly the shape this exists for. What may not happen is a second
 * control in the same label.
 */
function labelWrapper(shape: IElementShape): IElementShape | null {
  const parent = shape.parent;
  if (!parent || parent.tag !== 'label') return null;
  const controls = parent.children.filter((child) => CONTROL_TAGS.has(child.tag));
  if (controls.length !== 1) return null;
  return controls[0].span.start === shape.span.start ? parent : null;
}

/** `type="search"` becomes the molecule's own `inputType`; `text` is its default and is not written. */
function inputTypeAttribute(shape: IElementShape): string {
  const type = shape.attrs.find((attribute) => attribute.name === 'type');
  if (type?.value.kind !== 'literal' || type.value.value === 'text') return '';
  return ` inputType="${type.value.value}"`;
}

/** A `<textarea>` is the same molecule with more than one row — that is the whole difference. */
function rowsAttribute(shape: IElementShape): string {
  if (shape.tag !== 'textarea') return '';
  const rows = shape.attrs.find((attribute) => attribute.name === 'rows');
  const value = rows?.value.kind === 'literal' ? Number(rows.value.value) : NaN;
  return ` rows="${Number.isFinite(value) && value > 1 ? value : DEFAULT_ROWS}"`;
}

/** The event bindings the molecule will carry — same names, which is the point. */
function eventsOf(shape: IElementShape): Record<string, string> {
  const events: Record<string, string> = {};
  for (const attribute of shape.attrs) {
    if (!attribute.name.startsWith('@')) continue;
    if (attribute.value.kind !== 'expression') continue;
    events[attribute.name] = attribute.value.expression;
  }
  return events;
}
