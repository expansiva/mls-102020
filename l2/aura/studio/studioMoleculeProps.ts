/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculeProps.ts" enhancement="_blank" />
// The "Properties" tab of the picker: a molecule's configuration attributes, read from the source and
// written back (TASK-102020-picker-molecule-properties).
//
// PURE, like studioClassEdit: text in, text out. The editor resolves the element and the group, this
// module decides what the tab shows and what a gesture writes, and both panels only render and emit.
// That split is what keeps the floating and the docked panel from answering the same click two ways.
//
// TWO SOURCES, NO HEURISTIC
// What is editable — and how — comes from the group's hand-written `configuration.ts` (filtered by the
// tag's `only`). The molecule's own class confirms it at runtime (`elementProperties`): an entry the
// registered class does not declare is hidden, unless it is a `data-*`, which is read with
// `getAttribute` and is never a Lit property.

import {
  configurationFor,
  type IMoleculeConfigProp,
} from '/_102020_/l2/aura/molecules/shared/configuration.js';
import { readAttributes, type IOpenTagAttribute } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export type PropValue = string | number | boolean;

/** How the source writes one property — the whole degradation of the tab. */
export type PropSource = 'literal' | 'absent' | 'expression';

/** One line of the tab. */
export interface IMoleculePropRow {
  property: string;
  /** The HTML attribute the write uses: `icon-position`, `data-variant`, or the property itself. */
  attribute: string;
  type: IMoleculeConfigProp['type'];
  values?: readonly string[];
  examples?: readonly string[];
  min?: number;
  max?: number;
  default: PropValue | null;
  source: PropSource;
  /** What is in effect: the literal when written, the default when absent, null when neither. */
  value: PropValue | null;
  /** The name for a human (`Icon position`); the technical one goes in the tooltip. */
  label: string;
  /** Set when the row is read-only: a binding is an expression of the page, never rewritten here. */
  reason?: IMessageRef;
}

/** What a gesture does to the attribute in the source. */
export type PropWrite =
  | { kind: 'set'; text: string }
  /** A boolean `true`: the attribute with no value, the way the generator writes one. */
  | { kind: 'bare' }
  /** Back to the default: the attribute leaves the source. */
  | { kind: 'remove' };

export const PROPS_NO_GROUP: IMessageRef = { id: 'reason.propsNoGroup' };

/** The attribute a property is written as. */
export function propAttribute(prop: IMoleculeConfigProp): string {
  return prop.attribute ?? prop.property;
}

/**
 * `iconPosition` → `Icon position`, `data-variant` → `Variant`.
 *
 * Humanized, like the class chips: the panel is for someone designing a page, and the technical name
 * travels in the tooltip so nothing has to be guessed.
 */
export function propLabel(prop: IMoleculeConfigProp): string {
  const words = prop.property
    .replace(/^data-/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replace(/[-_]+/gu, ' ')
    .trim()
    .toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : prop.property;
}

/**
 * The attribute of the open tag that writes this property, in any of its forms.
 *
 * Lit binds a property three ways besides the plain attribute — `.size=${…}`, `?disabled=${…}`, and
 * the attribute holding a `${…}` — and all three are the page deciding the value in code. HTML names
 * are case-insensitive, so `iconPosition` and `iconposition` are the same attribute.
 */
export function findPropAttribute(
  attributes: readonly IOpenTagAttribute[],
  prop: IMoleculeConfigProp,
): IOpenTagAttribute | null {
  const attribute = propAttribute(prop).toLowerCase();
  const property = prop.property.toLowerCase();
  const names = new Set([attribute, property, `.${property}`, `?${attribute}`, `?${property}`]);
  return attributes.find((entry) => names.has(entry.name.toLowerCase())) ?? null;
}

/** Whether the attribute found is a binding (the prefixes are bindings whatever their value). */
function isBinding(found: IOpenTagAttribute): boolean {
  return found.value.kind === 'expression' || /^[.?@]/u.test(found.name);
}

/**
 * The value a written attribute means, read the way the molecule reads it (`propertyDataSource`).
 *
 * A boolean is true when present — bare, `""` or `"true"` — and false only for the literal `"false"`,
 * which is the decorator's own convenience (and what item 6 of the task writes for a `true` default).
 */
export function parsePropValue(prop: IMoleculeConfigProp, found: IOpenTagAttribute): PropValue | null {
  if (found.value.kind === 'expression') return null;
  if (prop.type === 'boolean') return !(found.value.kind === 'literal' && found.value.value === 'false');
  const raw = found.value.kind === 'literal' ? found.value.value : '';
  if (prop.type === 'number') {
    const number = Number(raw);
    return raw.trim() && Number.isFinite(number) ? number : null;
  }
  return raw;
}

/**
 * The attribute each property of the registered class observes, from its `elementProperties`.
 *
 * Lit's rule: the `attribute` option when it is a string, the property name lowercased when it is
 * absent, and no attribute at all for `attribute: false`.
 */
export function declaredAttributes(
  elementProperties: ReadonlyMap<PropertyKey, { attribute?: unknown } | undefined>,
): Map<string, string | false> {
  const declared = new Map<string, string | false>();
  elementProperties.forEach((options, key) => {
    const property = String(key);
    const attribute = options?.attribute;
    declared.set(property, attribute === false ? false : typeof attribute === 'string' ? attribute : property.toLowerCase());
  });
  return declared;
}

/**
 * The group's configuration, as THIS molecule reads it.
 *
 * The configuration is the group's; the molecule is what runs. An entry the registered class does not
 * declare is dropped (a molecule loaded from another version), and one it reads under ANOTHER
 * attribute is written under the molecule's: the `ml-enter-text` declares `inputType` with no
 * `attribute`, so it reads `inputtype` while its group says `input-type` — writing the group's name
 * there would change nothing on screen. A `data-*` is not a Lit property and passes as it is.
 *
 * `declared` null means the tag is not defined yet: the configuration is trusted as it is.
 */
export function reconcileWithRuntime(
  configuration: readonly IMoleculeConfigProp[],
  declared: ReadonlyMap<string, string | false> | null,
): IMoleculeConfigProp[] {
  if (!declared) return [...configuration];
  return configuration.flatMap((prop): IMoleculeConfigProp[] => {
    if (prop.property.startsWith('data-')) return [prop];
    const runtime = declared.get(prop.property);
    if (runtime === undefined || runtime === false) return [];
    if (runtime.toLowerCase() === propAttribute(prop).toLowerCase()) return [prop];
    // Lit's default (the property lowercased) is written in the property's own spelling — HTML folds
    // the case anyway, and `inputType="email"` reads better than `inputtype="email"`.
    const reconciled: IMoleculeConfigProp = { ...prop, attribute: runtime };
    if (runtime === prop.property.toLowerCase()) delete reconciled.attribute;
    return [reconciled];
  });
}

/**
 * The tab, for one molecule.
 *
 * `configuration` is already the molecule's (reconcileWithRuntime); `attributes` is the element's open
 * tag as the source writes it.
 */
export function moleculePropsSchema(input: {
  tag: string;
  configuration: readonly IMoleculeConfigProp[];
  attributes: readonly IOpenTagAttribute[];
}): IMoleculePropRow[] {
  const { tag, configuration, attributes } = input;
  return configurationFor(tag, configuration)
    .map((prop) => {
      const found = findPropAttribute(attributes, prop);
      const row: IMoleculePropRow = {
        property: prop.property,
        attribute: propAttribute(prop),
        type: prop.type,
        values: prop.values,
        examples: prop.examples,
        min: prop.min,
        max: prop.max,
        default: prop.default,
        source: 'absent',
        value: prop.default,
        label: propLabel(prop),
      };
      if (!found) return row;
      if (isBinding(found)) {
        const expression = found.value.kind === 'expression' ? found.value.expression : found.name;
        return {
          ...row,
          source: 'expression',
          value: null,
          reason: { id: 'reason.propComputed', params: { expression: ellipsis(expression) } },
        };
      }
      return { ...row, source: 'literal', value: parsePropValue(prop, found) };
    });
}

/** An expression shown in a sentence: long ones are cut, the whole thing is in the source. */
function ellipsis(text: string): string {
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

/**
 * What choosing `next` writes — or the reason it cannot.
 *
 * Going back to the default REMOVES the attribute: the source then says nothing, which is exactly
 * what the molecule does when nothing is said. Booleans follow the decorator (item 6 of the task):
 * `true` is the bare attribute, `false` is no attribute — unless the default is `true`, and then the
 * only way to say false is `="false"`.
 */
export function planPropWrite(
  row: Pick<IMoleculePropRow, 'type' | 'values' | 'default' | 'min' | 'max'>,
  next: PropValue | null,
): { ok: true; write: PropWrite } | { ok: false; reason: IMessageRef } {
  if (next === null) return { ok: true, write: { kind: 'remove' } };

  if (row.type === 'boolean') {
    const on = next === true || next === 'true';
    if (on) return { ok: true, write: row.default === true ? { kind: 'remove' } : { kind: 'bare' } };
    return { ok: true, write: row.default === true ? { kind: 'set', text: 'false' } : { kind: 'remove' } };
  }

  if (row.type === 'number') {
    if (String(next).trim() === '') return { ok: true, write: { kind: 'remove' } };
    const number = typeof next === 'number' ? next : Number(String(next).trim());
    if (!Number.isFinite(number)) return { ok: false, reason: { id: 'reason.propNotNumber' } };
    if ((row.min !== undefined && number < row.min) || (row.max !== undefined && number > row.max)) {
      return {
        ok: false,
        reason: { id: 'reason.propOutOfRange', params: { min: row.min ?? '−∞', max: row.max ?? '∞' } },
      };
    }
    if (number === row.default) return { ok: true, write: { kind: 'remove' } };
    return { ok: true, write: { kind: 'set', text: String(number) } };
  }

  const text = String(next);
  if (row.type === 'enum' && !(row.values ?? []).includes(text)) {
    return { ok: false, reason: { id: 'reason.propNotInList' } };
  }
  // A quote would close the attribute and `${` would open a binding: both turn a value into markup.
  if (/["]|\$\{/u.test(text)) return { ok: false, reason: { id: 'reason.propBadChars' } };
  if (text === '' || text === String(row.default ?? '')) return { ok: true, write: { kind: 'remove' } };
  return { ok: true, write: { kind: 'set', text } };
}

/** The value the screen shows after a write — what the default is when the attribute left. */
export function valueAfter(row: Pick<IMoleculePropRow, 'default'>, write: PropWrite): PropValue | null {
  if (write.kind === 'remove') return row.default;
  if (write.kind === 'bare') return true;
  return write.text;
}

/**
 * The source after the write, for the element whose open tag starts at `openStart`.
 *
 * Revalidated here and not trusted from the panel: the attribute is read off the open tag again, and
 * a binding that appeared since the panel opened refuses the write. `insertAt` is where a new
 * attribute goes (just past the tag name, ITemplateElement.insertAt). The name keeps the spelling the
 * source already uses; a new one is the configuration's.
 */
export function splicePropAttribute(
  source: string,
  element: { openStart: number; insertAt: number },
  prop: IMoleculeConfigProp,
  write: PropWrite,
): { ok: true; source: string } | { ok: false; reason: IMessageRef } {
  const attributes = readAttributes(source, element.openStart);
  const found = findPropAttribute(attributes, prop);

  if (found && isBinding(found)) {
    const expression = found.value.kind === 'expression' ? found.value.expression : found.name;
    return { ok: false, reason: { id: 'reason.propComputed', params: { expression: ellipsis(expression) } } };
  }

  if (write.kind === 'remove') {
    if (!found) return { ok: true, source };
    // The separator before the attribute goes too — spaces and tabs only, so the next attribute is
    // never pulled up from its own line.
    let start = found.start;
    while (start > 0 && /[^\S\n]/u.test(source[start - 1])) start -= 1;
    return { ok: true, source: source.slice(0, start) + source.slice(found.end) };
  }

  const name = found?.name ?? propAttribute(prop);
  const text = write.kind === 'bare' ? name : `${name}="${write.text}"`;
  if (found) return { ok: true, source: source.slice(0, found.start) + text + source.slice(found.end) };
  return { ok: true, source: `${source.slice(0, element.insertAt)} ${text}${source.slice(element.insertAt)}` };
}

/**
 * The write that puts an attribute back the way it was — the undo of a step.
 *
 * Read from the open tag BEFORE the write: absent is a removal, bare is bare, a literal is itself.
 */
export function writeOfCurrent(found: IOpenTagAttribute | null): PropWrite | null {
  if (!found) return { kind: 'remove' };
  if (found.value.kind === 'bare') return { kind: 'bare' };
  if (found.value.kind === 'literal') return { kind: 'set', text: found.value.value };
  return null;
}
