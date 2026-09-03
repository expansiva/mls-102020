/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.ts" enhancement="_blank"/>

// The PUBLIC SURFACE of a molecule, extracted deterministically from its .ts.
//
// This is what the triage call actually needs, and it is the reason the step does not ship the
// whole file: the routing question is "does the change alter what a consumer writes or observes",
// and a consumer only ever sees slots, attributes and events. ml-data-table is 300+ lines and its
// surface is 20 — sending the file would spend the tokens on the part that cannot answer the
// question.
//
// In helpers/ because TWO steps read it: i2-triage renders it into the routing prompt, and
// i5-playground diffs it before and after the edit to decide whether the playground is affected.
// agentsBestPractices §2 makes helpers/ mandatory at exactly that point.

import { readSlotTags } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imCoherence.js';

export interface ImProperty {
  name: string;
  /** What a consumer writes in the markup. */
  attribute: string;
  type: string;
}

export interface ImSurface {
  className: string;
  slots: string[];
  properties: ImProperty[];
  events: string[];
}

/**
 * Lit's default attribute for a property is the property name LOWERCASED, not kebab-cased — which
 * is why molecules that want a dash declare `attribute:'is-editing'` explicitly. Getting this
 * wrong in the prompt would have the model propose markup that silently does nothing.
 */
function defaultAttribute(propertyName: string): string {
  return propertyName.toLowerCase();
}

/** `@propertyDataSource({ type: Boolean, attribute:'is-editing' })` + the declaration under it. */
export function readProperties(tsSource: string): ImProperty[] {
  const out: ImProperty[] = [];
  const seen = new Set<string>();
  const re = /@property(?:DataSource)?\s*\(([^)]*)\)\s*\r?\n\s*(?:accessor\s+)?([A-Za-z_$][\w$]*)/g;
  for (const m of tsSource.matchAll(re)) {
    const options = m[1];
    const name = m[2];
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({
      name,
      attribute: options.match(/attribute\s*:\s*'([^']+)'/)?.[1] || defaultAttribute(name),
      type: options.match(/type\s*:\s*([A-Za-z]+)/)?.[1] || 'String',
    });
  }
  return out;
}

/** Every `new CustomEvent('name'` — the molecule's observable output. */
export function readEvents(tsSource: string): string[] {
  const events = new Set<string>();
  for (const m of tsSource.matchAll(/new CustomEvent\s*\(\s*'([^']+)'/g)) events.add(m[1]);
  return [...events];
}

/**
 * Every identifier the GROUP contract names between backticks — its declared vocabulary.
 *
 * ⚠️ WHY THIS EXISTS, measured 2026-08-14. The group contract (`skills/<group>/creation.ts`) is what
 * enumerates a molecule's public surface: slots in a table, properties in a table, events in a table.
 * A route B fix that DECLARES one the molecule was missing is legitimate. Note the group contract is a UNION
 * across the group's variants, so it says what MAY be declared, never what must be. A route B fix that INVENTS one is a definition change made on the wrong
 * route, and on `ml-currency-input` that is exactly what happened: asked for a label and help text,
 * which the group defines as the slots `Label` and `Helper`, the run added public properties named
 * `label` and `helper` instead.
 *
 * Case matters, and it is what separates the two: the group names `Label` and `Helper`, never `label`
 * or `helper`. Deliberately loose in the admitting direction — it also picks up type names like
 * `boolean` — because the cost of admitting one extra name is nothing, and the cost of refusing a
 * legitimate fix is a failed run.
 */
export function groupVocabulary(groupSkill: string): Set<string> {
  // The skill is a template literal, so the backticks arrive escaped: \`Label\`.
  return new Set([...groupSkill.matchAll(/\\?`([A-Za-z_$][\w$]*)\\?`/g)].map(m => m[1]));
}

export function readSurface(tsSource: string): ImSurface {
  return {
    className: tsSource.match(/export\s+class\s+(\w+)/)?.[1] || '',
    slots: readSlotTags(tsSource),
    properties: readProperties(tsSource),
    events: readEvents(tsSource),
  };
}

export interface ImSurfaceDiff {
  addedSlots: string[];
  removedSlots: string[];
  addedProperties: string[];
  removedProperties: string[];
  addedEvents: string[];
  removedEvents: string[];
  /** True when anything a consumer can see moved. */
  changed: boolean;
}

/**
 * What moved in the public surface between two versions of the same molecule.
 *
 * This is what decides, DETERMINISTICALLY, whether i5-playground has work to do: the playground
 * demonstrates the surface, so a change that leaves the surface alone leaves the playground
 * correct. A `.less`-only edit produces `changed: false` and the step is a no-op — which is the
 * common case of an improve run and must not cost an LLM call.
 */
export function diffSurface(before: ImSurface, after: ImSurface): ImSurfaceDiff {
  const missing = (from: string[], into: string[]) => from.filter(item => !into.includes(item));
  const beforeProps = before.properties.map(p => p.name);
  const afterProps = after.properties.map(p => p.name);

  const diff: ImSurfaceDiff = {
    addedSlots: missing(after.slots, before.slots),
    removedSlots: missing(before.slots, after.slots),
    addedProperties: missing(afterProps, beforeProps),
    removedProperties: missing(beforeProps, afterProps),
    addedEvents: missing(after.events, before.events),
    removedEvents: missing(before.events, after.events),
    changed: false,
  };
  diff.changed = Object.values(diff).some(value => Array.isArray(value) && value.length > 0);
  return diff;
}

/** One line per movement, for the prompt and for the summary. */
export function renderSurfaceDiff(diff: ImSurfaceDiff): string {
  const lines = [
    ...diff.addedSlots.map(s => `- slot \`${s}\` was ADDED`),
    ...diff.removedSlots.map(s => `- slot \`${s}\` was REMOVED`),
    ...diff.addedProperties.map(p => `- property \`${p}\` was ADDED`),
    ...diff.removedProperties.map(p => `- property \`${p}\` was REMOVED`),
    ...diff.addedEvents.map(e => `- event \`${e}\` was ADDED`),
    ...diff.removedEvents.map(e => `- event \`${e}\` was REMOVED`),
  ];
  return lines.length ? lines.join('\n') : '- (the public surface did not change)';
}

/** The markdown block the prompt embeds. Empty lists are stated, never omitted: "no events" is */
/** information the model needs, and an absent section reads as "not shown to you". */
export function renderSurface(surface: ImSurface): string {
  const properties = surface.properties.length
    ? surface.properties.map(p => `- \`${p.name}\` (${p.type}) — attribute \`${p.attribute}\``).join('\n')
    : '- (none)';
  return [
    `**Class**: ${surface.className || '(not found)'}`,
    '',
    '**Slots the code declares**',
    surface.slots.length ? surface.slots.map(s => `- ${s}`).join('\n') : '- (none)',
    '',
    '**Properties**',
    properties,
    '',
    '**Events it dispatches**',
    surface.events.length ? surface.events.map(e => `- ${e}`).join('\n') : '- (none)',
  ].join('\n');
}

/**
 * Is a slot really USED in a page — as the `<X>` NAMED TAG this library actually reads?
 *
 * In helpers/ because i5-playground and i6-index both ask it — of the playground page and of the
 * group index card. The two must agree: 2026-08-05 was the playground being fixed and the index
 * being left behind, and a second, subtly different reading of "exercised" is how that recurs.
 *
 * A mere mention in a comment does not count.
 *
 * ⚠️ IT USED TO ACCEPT `slot="X"` TOO, and that was the reason no gate could ever catch the defect of
 * 2026-08-17: this project has NO Shadow DOM, `moleculeBase.getSlotContent(tag)` is
 * `querySelector(tag)`, and `<div slot="X">` matches nothing. So the attribute form renders empty —
 * and this function, which decides whether a page exercises a slot, called it exercised. The wrong
 * convention was instructed by a prompt, blessed by this function, and pinned by the fixtures of three
 * gates: anyone fixing the prompt would break the tests and conclude the prompt was right.
 *
 * Measured before narrowing it: across the 671 index and playground files of the six projects, the
 * attribute form appears in exactly TWO — the two molecules the generator had just produced — against
 * 22.903 named-tag uses. So this is strictly a defect detector, not a behaviour change for anything
 * that exists.
 */
export function slotIsExercised(html: string, slot: string): boolean {
  return new RegExp(`<${slot}[\\s>/]`, 'i').test(html);
}
