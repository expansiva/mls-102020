/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupTriggerAction/adopt.ts" enhancement="_blank"/>
// Turning a raw control of the page into a molecule of THIS group (TASK-102020-adopt-molecules).
//
// WHY THE FILE IS HERE AND WRITTEN BY HAND
// Next to `usage.ts`, and for the same reason: the slot contract is the GROUP's — `usage.ts` says
// every implementation shares `Label` and `Icon`, and the six molecules of the 102040 confirm it — so
// the conversion table is the group's too. The `.defs.ts` of the 102040 are generated ("Do not
// change") and could not host it, and a generic rule in the editor could not either: that `@click`
// becomes `@action` is not a convention, it is what this group's molecules dispatch.
//
// WHY THE CANDIDACY IS THE GROUP'S AND NOT THE MOLECULE'S
// `groupTriggerAction` is "execute an action" — which is what a `<button>` IS. Choosing between
// `ml-button-standard` and `ml-icon-button` is not candidacy, it is style, and the design system
// already answers it deterministically (matchVariant over the `layoutConfig` axes).
//
// PURE: no DOM, no catalog, no runtime. It is handed the element as the SOURCE writes it and answers
// with markup.

import {
  adoptUnknownAttributes,
  classifyAttributes,
  dataClassAttribute,
  hasBindingInside,
  innerWithout,
  roleInLiteral,
  type AdoptMarkup,
  type IAdoptCandidate,
  type IAdoptTarget,
  type IElementShape,
} from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export const group = 'groupTriggerAction';

/**
 * The tones the group's molecules accept, and the ONLY ones.
 *
 * From the group contract: `data-variant` maps to a class the molecule's own stylesheet defines
 * (`primary` -> `.ml-button-primary`). A tone outside this list would be read as `primary` by the
 * molecule and the page would say something the screen does not do.
 */
const VARIANTS = ['primary', 'secondary', 'danger', 'ghost', 'link'] as const;

/** With no design-system token in the classes there is no tone to read — and none is invented. */
const DEFAULT_VARIANT = 'primary';

/** Children that are an ICON and not a label: they go to the `Icon` slot, everything else to `Label`. */
const ICON_TAGS = new Set(['svg', 'img', 'i']);

/**
 * The conversion table, as a declaration.
 *
 * `@click` -> `@action` is the line that matters: the molecule dispatches `action`, not `click`, so a
 * `@click` left alone would produce a button that looks right and does nothing. `disabled` in its
 * three written forms (`?disabled`, `.disabled`, bare) keeps its name — the molecule declares
 * `disabled` as a boolean property, so all three still reach it.
 *
 * Everything not named here is UNKNOWN and refuses the conversion (see `convert`). `data-variant` and
 * `data-class` are reserved because this converter writes them: a source that already carries one
 * would end up with the attribute twice.
 */
const ATTRIBUTES = {
  rename: { '@click': '@action' },
  keep: ['?disabled', '.disabled', 'disabled', '?loading', 'title', 'id', 'style', 'hidden', 'tabindex', 'role'],
  consumed: ['class', 'type'],
  keepPrefixes: ['aria-'],
  reserved: ['data-variant', 'data-class'],
} as const;

const WHY_BUTTON: IMessageRef = { id: 'adopt.whyTriggerAction' };
const WARN_NO_VARIANT: IMessageRef = { id: 'adopt.warnNoVariant' };
const WARN_APPEARANCE: IMessageRef = { id: 'adopt.warnAppearance' };
const WARN_ICON_GUESS: IMessageRef = { id: 'adopt.warnIconGuess' };
const REFUSE_SLOT_BINDINGS: IMessageRef = { id: 'reason.adoptSlotBindings' };

/**
 * Is this element one of ours, and what would be replaced?
 *
 * `<button>` and nothing else. An `<a>` styled as a button is a NAVIGATION and belongs to another
 * group; a molecule tag already in the page is already adopted (and its tag carries a `--`, which no
 * HTML element has).
 */
export function candidate(shape: IElementShape): IAdoptCandidate | null {
  if (shape.tag !== 'button') return null;

  const warnings: IMessageRef[] = [];
  const variant = roleInLiteral(shape.literal, 'button', VARIANTS);
  if (!variant) warnings.push(WARN_NO_VARIANT);
  // The look stops being the page's and becomes the design system's. It is the POINT of the
  // operation, not a side effect — but it has to be on screen before the click, not after.
  warnings.push(WARN_APPEARANCE);

  const icons = shape.children.filter((child) => ICON_TAGS.has(child.tag));
  const others = shape.children.filter((child) => !ICON_TAGS.has(child.tag));
  // A `<span>` inside a button is an icon as often as it is the label's own wrapper, and nothing in
  // the markup settles it. The whole content goes to `Label` (which loses nothing) and the user is
  // told, instead of a guess that moves the text into the icon slot.
  if (!icons.length && others.some((child) => child.tag === 'span')) warnings.push(WARN_ICON_GUESS);

  return {
    group,
    // A button is its own unit: it carries its own text, and nothing wraps it that the molecule
    // would replace. Only the text field has an ancestor to lift to.
    lift: 0,
    why: WHY_BUTTON,
    parts: {
      label: labelContent(shape, icons).trim() || undefined,
      icon: icons.length ? icons.map((child) => sliceOf(shape, child)).join('') : undefined,
      variant: variant ?? DEFAULT_VARIANT,
      events: eventsOf(shape),
    },
    warnings,
  };
}

/**
 * The markup that replaces the button — or the reason it cannot be written.
 *
 * The tag comes from the catalog VERBATIM (`target.tag`): the molecules register themselves as
 * `grouptriggeraction--ml-button-standard`, with no project suffix, and a tag built by convention
 * would produce an element that never renders and fails silently.
 */
export function convert(shape: IElementShape, cand: IAdoptCandidate, target: IAdoptTarget): AdoptMarkup {
  const { written, unknown } = classifyAttributes(shape.attrs, ATTRIBUTES);
  if (unknown.length) return { ok: false, reason: adoptUnknownAttributes(unknown) };

  const icons = shape.children.filter((child) => ICON_TAGS.has(child.tag));
  const label = labelContent(shape, icons);
  const icon = icons.map((child) => sliceOf(shape, child)).join('');
  // Content with behaviour of its own cannot travel: this group's molecules read their slots through
  // the snapshot path, which serializes the markup and drops every listener with it.
  if (hasBindingInside(label) || hasBindingInside(icon)) return { ok: false, reason: REFUSE_SLOT_BINDINGS };

  // `type` is the one consumed attribute that is written again: the molecule declares it, and a
  // `type="submit"` lost in the conversion turns a form's submit button into an inert one. Written as
  // a BINDING it is unknowable here, so it is refused by name instead of dropped.
  const type = shape.attrs.find((attribute) => attribute.name === 'type');
  if (type && type.value.kind !== 'literal') return { ok: false, reason: adoptUnknownAttributes(['type']) };
  const typeAttribute = type?.value.kind === 'literal' && type.value.value !== 'button'
    ? ` type="${type.value.value}"`
    : '';

  const attributes = [
    ` data-variant="${cand.parts.variant ?? DEFAULT_VARIANT}"`,
    typeAttribute,
    dataClassAttribute(shape.literal),
    written.length ? ` ${written.join(' ')}` : '',
  ].join('');

  const slots = `${icon ? `<Icon>${icon}</Icon>` : ''}${label ? `<Label>${label}</Label>` : ''}`;
  return {
    ok: true,
    markup: `<${target.tag}${attributes}>${slots}</${target.tag}>`,
    imports: [target.importPath],
  };
}

/**
 * Everything inside the button that is not an icon — text, `${msg['x']}` and wrappers, verbatim.
 *
 * The content travels WHOLE, and that is the decision: measured over the real pages, 84 of the 463
 * buttons carry an element inside (`div`, `span`, `strong`, `dl`, `p`) and none of them is an icon.
 * Cutting them would throw away the button's own content; only a real icon tag is moved to its slot.
 */
function labelContent(shape: IElementShape, icons: readonly IElementShape[]): string {
  return icons.length ? innerWithout(shape, icons) : shape.inner;
}

/** A child's markup, exactly as the source writes it. */
function sliceOf(shape: IElementShape, child: IElementShape): string {
  return shape.inner.slice(child.span.start - shape.innerSpan.start, child.span.end - shape.innerSpan.start);
}

/** The event bindings after conversion — what the panel shows and the user checks. */
function eventsOf(shape: IElementShape): Record<string, string> {
  const events: Record<string, string> = {};
  for (const attribute of shape.attrs) {
    if (!attribute.name.startsWith('@')) continue;
    if (attribute.value.kind !== 'expression') continue;
    const name = attribute.name === '@click' ? '@action' : attribute.name;
    events[name] = attribute.value.expression;
  }
  return events;
}
