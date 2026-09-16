/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectOne/adopt.ts" enhancement="_blank"/>
// Turning a raw `<select>` of the page into a molecule of THIS group (TASK-102020-adopt-select-one).
//
// THE ONE THING THAT MAKES THIS GROUP DIFFERENT FROM THE FIRST TWO
// The content is not ONE slot. A button carries a label and a text field carries a label; a select
// carries a label AND a list, and the list is usually not even written in place: measured over the
// real pages, 82 of the 101 selects of the generated projects build their options inside a
// `${items.map(…)}`. So the conversion cannot rewrite "the inner content" as a unit — it rewrites
// each `<option>` BY ITS OWN SPAN and copies everything between them byte for byte, which is what
// lets the map's code (its types, its arrow, its nested `html`) cross untouched.
//
// AND THE ONE THAT MAKES IT THE EASIEST OF THE THREE
// Nothing is renamed. The button had to turn `@click` into `@action`; here every molecule of the
// group assigns `this.value` BEFORE dispatching `change`, and the generated handler reads
// `'value' in target` — so `.value=${…}` and `@change=${…}` keep working with the same names.
//
// PURE: no DOM, no catalog, no runtime. It is handed the element as the SOURCE writes it and answers
// with markup.

import {
  ADOPT_UNCLOSED,
  adoptUnknownAttributes,
  carriedClasses,
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

export const group = 'groupSelectOne';

/** A piece of markup the conversion assembles, or the reason it stopped. */
type Written = { ok: true; markup: string } | { ok: false; reason: IMessageRef };

/** Controls: a `<label>` is the unit only when exactly ONE of these sits inside it. */
const CONTROL_TAGS = new Set(['input', 'textarea', 'select', 'button']);

/**
 * The conversion table of the host, as a declaration.
 *
 * Every name survives — that is the measurement, not luck: the 120 real selects write `class`,
 * `@change`, `.value`, `required`, `id`, `aria-label` and `disabled`, and the group contract declares
 * `value`, `required`, `disabled`, `name` and the three events under those same names.
 *
 * `@input` is absent ON PURPOSE. A native select fires it; the molecules do not dispatch it, so a
 * `@input` carried over would be a handler that never runs. It is refused by name instead.
 */
const ATTRIBUTES = {
  keep: [
    '.value', 'value', '@change', '@blur', '@focus',
    'name', 'id', 'title', 'style', 'tabindex', 'placeholder',
    '?disabled', 'disabled', '?required', 'required', '?readonly', 'readonly', '?loading',
  ],
  consumed: ['class'],
  keepPrefixes: ['aria-'],
  reserved: ['data-variant', 'data-class'],
} as const;

/**
 * And of each item.
 *
 * `label` and `selected` are NOT here. The molecule reads an item's text from its content and its
 * selection from the host's `value`, so both would be silently ignored on the new tag — `label`
 * changes what the user reads and `?selected` decides what is chosen, and losing either is losing
 * behaviour. They are refused by name (19 of them exist, all in hand-written code).
 */
const ITEM_ATTRIBUTES = {
  keep: ['value', '.value', '?disabled', 'disabled', 'title', 'id'],
  consumed: ['class'],
  keepPrefixes: ['aria-'],
  reserved: ['data-class'],
} as const;

const WHY_SELECT: IMessageRef = { id: 'adopt.whySelectOne' };
const WHY_LABEL: IMessageRef = { id: 'adopt.whySelectOneLabel' };
const WARN_APPEARANCE: IMessageRef = { id: 'adopt.warnAppearance' };
const WARN_SHAPE: IMessageRef = { id: 'adopt.warnSelectShape' };
const REFUSE_SHARED_LABEL: IMessageRef = { id: 'reason.adoptSharedLabel' };
const REFUSE_SLOT_BINDINGS: IMessageRef = { id: 'reason.adoptSlotBindings' };
const REFUSE_GROUPS: IMessageRef = { id: 'reason.adoptSelectGroups' };
const REFUSE_CHILDREN: IMessageRef = { id: 'reason.adoptSelectChildren' };
const REFUSE_NO_ITEMS: IMessageRef = { id: 'reason.adoptSelectNoItems' };
const REFUSE_ITEM_VALUE: IMessageRef = { id: 'reason.adoptSelectItemValue' };

/**
 * Is this element a "choose exactly one", and what would be replaced?
 *
 * `<select>` and nothing else. A `multiple` one is `groupSelectMany` and a `size` one is a listbox
 * that this group's contract does not describe: both are refused here, before any markup exists —
 * and that is the negative control of the predicate, the same role `<select>` itself plays for
 * `groupEnterText`.
 *
 * A set of `<input type="radio">` is also "choose exactly one", and is deliberately NOT claimed: its
 * unit is a GROUP of elements tied only by a shared `name`, which is another measurement.
 */
export function candidate(shape: IElementShape): IAdoptCandidate | null {
  if (shape.tag !== 'select') return null;
  if (shape.attrs.some((attribute) => attribute.name === 'multiple' || attribute.name === 'size')) return null;

  const wrapper = labelWrapper(shape);
  const items = shape.children.filter((child) => child.tag === 'option');

  return {
    group,
    lift: wrapper ? 1 : 0,
    why: wrapper ? WHY_LABEL : WHY_SELECT,
    parts: {
      label: wrapper ? innerWithout(wrapper, [shape]).trim() || undefined : undefined,
      variant: undefined,
      items: items.length,
      events: eventsOf(shape),
    },
    // The look is the molecule's from now on, and here so is the SHAPE: this group renders as a
    // dropdown, but also as radio, segmented, cards or a table, and which one is the design
    // system's answer. A dropdown that comes back as a radio list is not a surprise the user should
    // have after the write.
    warnings: [WARN_APPEARANCE, WARN_SHAPE],
    // What the preview mounts. `Label` is what the wrapper holds minus the control; `Item` is one
    // holder per live `<option>` — the only place the option's TEXT exists, since the source has a
    // binding where the words are.
    previewSlots: wrapper
      ? [{ slot: 'Label', from: 'replaced' }, { slot: 'Item', from: 'children' }]
      : [{ slot: 'Item', from: 'children' }],
  };
}

/**
 * The markup that replaces the select (or its `<label>`) — or the reason it cannot be written.
 *
 * Called BEFORE the gesture, like every other planner of this editor: what it refuses has to be on
 * screen while the button is still unclicked.
 */
export function convert(shape: IElementShape, cand: IAdoptCandidate, target: IAdoptTarget): AdoptMarkup {
  // A `<label>` holding two controls has no single unit — the same refusal, and for the same reason,
  // as the text field's.
  if (cand.lift === 0 && shape.parent?.tag === 'label') return { ok: false, reason: REFUSE_SHARED_LABEL };
  const wrapper = cand.lift === 1 ? labelWrapper(shape) : null;
  if (cand.lift === 1 && !wrapper) return { ok: false, reason: REFUSE_SHARED_LABEL };

  const { written, unknown } = classifyAttributes(shape.attrs, ATTRIBUTES);
  if (unknown.length) return { ok: false, reason: adoptUnknownAttributes(unknown) };

  const label = wrapper ? innerWithout(wrapper, [shape]) : '';
  // The label may hold a `<span>` with its own classes — that travels whole. What it may NOT hold is
  // a binding: the molecules of this group read their slots through the snapshot path, which
  // serializes the markup and drops every listener with it.
  if (hasBindingInside(label)) return { ok: false, reason: REFUSE_SLOT_BINDINGS };

  const items = itemsMarkup(shape);
  if (!items.ok) return items;

  const attributes = [
    placeClasses(shape, wrapper),
    written.length ? ` ${written.join(' ')}` : '',
  ].join('');

  const slot = label.trim() ? `<Label>${label}</Label>` : '';
  return {
    ok: true,
    markup: `<${target.tag}${attributes}>${slot}${items.markup}</${target.tag}>`,
    imports: [target.importPath],
  };
}

/**
 * The list, with every `<option>` turned into an `<Item>` and everything else left alone.
 *
 * THIS IS THE WHOLE TRICK OF THE GROUP. The options are children of the select even when they are
 * written inside a `${…map(…)}` — the scanner reports them with `inExpression`, parented to the
 * select — so each one has a span of its own. Rewriting them BY SPAN and copying the gaps verbatim
 * means the map's own code is never read as markup and never rewritten: what goes in between comes
 * out identical, byte for byte, which is what the test asserts.
 */
function itemsMarkup(shape: IElementShape): Written {
  const items = shape.children.filter((child) => child.tag === 'option');
  // An `<optgroup>` is a `<Group label="…">` in the contract, and the conversion is real — but the
  // descriptor hands ONE level of children, so the options inside it have no span here. Refusing is
  // the honest answer while the corpus has zero of them; the day one appears, it is this function
  // that grows.
  if (shape.children.some((child) => child.tag === 'optgroup')) return { ok: false, reason: REFUSE_GROUPS };
  // A `<select>` holds options and nothing else. Anything else here means the list is built
  // somewhere this file cannot see (a `${this.renderOptions()}`, a wrapper element), and a conversion
  // that dropped it would lose the whole list.
  if (shape.children.length !== items.length) return { ok: false, reason: REFUSE_CHILDREN };
  if (!items.length) return { ok: false, reason: REFUSE_NO_ITEMS };

  let markup = '';
  let at = shape.innerSpan.start;
  for (const item of items) {
    markup += sliceOf(shape, at, item.span.start);
    const written = itemMarkup(shape, item);
    if (!written.ok) return written;
    markup += written.markup;
    at = item.span.end;
  }
  return { ok: true, markup: markup + sliceOf(shape, at, shape.innerSpan.end) };
}

/** One `<option>` as an `<Item>` — or the reason it cannot travel. */
function itemMarkup(shape: IElementShape, item: IElementShape): Written {
  // An option the scanner could not close ends at the end of the file, and its span would swallow
  // everything after it. The same refusal the core makes for the element being adopted.
  if (item.span.end > shape.innerSpan.end) return { ok: false, reason: ADOPT_UNCLOSED };

  // `parseItems` skips an item with no `value` attribute — it would be an invisible row. In html the
  // option's text is its own value when the attribute is absent, so this is a real (if rare) shape,
  // and inventing the value from the content would be inventing behaviour.
  if (!item.attrs.some((attribute) => attribute.name === 'value' || attribute.name === '.value')) {
    return { ok: false, reason: REFUSE_ITEM_VALUE };
  }

  const { written, unknown } = classifyAttributes(item.attrs, ITEM_ATTRIBUTES);
  if (unknown.length) return { ok: false, reason: adoptUnknownAttributes(unknown) };
  if (hasBindingInside(item.inner)) return { ok: false, reason: REFUSE_SLOT_BINDINGS };

  // `value` leads because it is the item's identity; `data-class` comes last, like every other slot
  // tag of the catalog.
  const attributes = `${written.length ? ` ${written.join(' ')}` : ''}${dataClassAttribute(item.literal)}`;
  return { ok: true, markup: `<Item${attributes}>${item.inner}</Item>` };
}

/**
 * The `data-class` of the new tag: what PLACED the field, from both elements that disappear.
 *
 * The text field reads the wrapper only, and for its corpus that was the whole story. Here it is
 * not: 93 of the 120 real selects carry placing classes on the `<select>` itself (`w-full`, `mt-1`)
 * and only 13 wrappers carry any, so the wrapper-only rule would drop them in 68 cases — handing the
 * molecule to a form row it no longer fills. The rule is unchanged, only applied to both:
 * `carriedClasses` already keeps just what places and spaces the element and drops the colour, the
 * border and the padding, which are the molecule's from now on.
 */
function placeClasses(shape: IElementShape, wrapper: IElementShape | null): string {
  if (!wrapper) return dataClassAttribute(shape.literal);
  const carried = [...new Set([...carriedClasses(wrapper.literal), ...carriedClasses(shape.literal)])];
  return carried.length ? ` data-class="${carried.join(' ')}"` : '';
}

/** A slice of the element's inner content, by absolute offsets of the source. */
function sliceOf(shape: IElementShape, start: number, end: number): string {
  if (end <= start) return '';
  return shape.inner.slice(start - shape.innerSpan.start, end - shape.innerSpan.start);
}

/**
 * The `<label>` this control is the single control of — or null.
 *
 * Same rule as the text field's, and for the same measured reason: 84 of the 101 real selects of the
 * generated pages live inside a `<label>` that carries their text, and the molecule has a `Label`
 * slot of its own. "Single CONTROL", not "single child": the text is often inside a `<span>`.
 */
function labelWrapper(shape: IElementShape): IElementShape | null {
  const parent = shape.parent;
  if (!parent || parent.tag !== 'label') return null;
  const controls = parent.children.filter((child) => CONTROL_TAGS.has(child.tag));
  if (controls.length !== 1) return null;
  return controls[0].span.start === shape.span.start ? parent : null;
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
