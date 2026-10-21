/// <mls fileReference="_102020_/l2/aura/studio/studioMoleculeProps.test.ts" enhancement="_blank" />
// The Properties tab of the picker (TASK-102020-picker-molecule-properties), against the REAL group
// configurations and the REAL molecule sources of the 102040.
//
// The molecules are read as text, the same way configuration.test.ts reads them: their modules need
// the browser and the store, and what the tab needs from them is only what `elementProperties` would
// say — each property and the attribute it observes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { configuration as triggerAction } from '/_102020_/l2/aura/molecules/skills/groupTriggerAction/configuration.js';
import { configuration as enterText } from '/_102020_/l2/aura/molecules/skills/groupEnterText/configuration.js';
import { configuration as enterMoney } from '/_102020_/l2/aura/molecules/skills/groupEnterMoney/configuration.js';
import { readAttributes } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import {
  declaredAttributes,
  moleculePropsSchema,
  planPropWrite,
  propLabel,
  reconcileWithRuntime,
  splicePropAttribute,
  writeOfCurrent,
  findPropAttribute,
  type IMoleculePropRow,
} from '/_102020_/l2/aura/studio/studioMoleculeProps.js';
import type { IMoleculeConfigProp } from '/_102020_/l2/aura/molecules/shared/configuration.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOLECULES = path.join(HERE, '..', '..', '..', '..', 'mls-102040', 'l2', 'molecules');

const BUTTON = 'grouptriggeraction--ml-button-standard';
const ICON_BUTTON = 'grouptriggeraction--ml-icon-button';
const ENTER_TEXT = 'groupentertext--ml-enter-text';

/**
 * What `elementProperties` would hold for a molecule, read off its source: every
 * `@propertyDataSource({…}) name` with the `attribute` option when it has one.
 */
function declaredOf(tag: string): Map<string, string | false> {
  const [folder, name] = tag.split('--');
  const source = readFileSync(path.join(MOLECULES, folder, `${name}.ts`), 'utf8');
  const properties = new Map<string, { attribute?: unknown }>();
  for (const match of source.matchAll(/@propertyDataSource\((\{[^}]*\})?\)\s*(?:(?:public|private|protected|declare|override)\s+)*(\w+)/gu)) {
    const attribute = /attribute:\s*['"]([^'"]+)['"]/u.exec(match[1] ?? '')?.[1];
    properties.set(match[2], attribute ? { attribute } : {});
  }
  return declaredAttributes(properties);
}

/** The tab for a tag, over an open tag written as the page would write it. */
function rowsFor(tag: string, config: readonly IMoleculeConfigProp[], openTag: string): IMoleculePropRow[] {
  return moleculePropsSchema({
    tag,
    configuration: reconcileWithRuntime(config, declaredOf(tag)),
    attributes: readAttributes(openTag, 0),
  });
}

function row(rows: IMoleculePropRow[], property: string): IMoleculePropRow {
  const found = rows.find((entry) => entry.property === property);
  assert.ok(found, `no row for ${property}`);
  return found;
}

// ── What the tab shows ──────────────────────────────────────────────────────

test('ml-button-standard: size, type, icon position and variant — and nothing of the page state', () => {
  const rows = rowsFor(BUTTON, triggerAction, `<${BUTTON}>`);
  assert.deepEqual(rows.map((entry) => entry.property), ['size', 'type', 'iconPosition', 'data-variant']);

  assert.deepEqual(row(rows, 'size').values, ['xs', 'sm', 'md', 'lg']);
  assert.equal(row(rows, 'size').default, 'md');
  assert.equal(row(rows, 'type').default, 'button');
  assert.equal(row(rows, 'iconPosition').attribute, 'icon-position');
  assert.equal(row(rows, 'data-variant').values?.length, 5);
  assert.equal(row(rows, 'data-variant').default, 'primary');
  // `disabled` and `loading` are declared by the molecule and are STATE: the configuration leaves them out.
  assert.ok(declaredOf(BUTTON).has('disabled') && declaredOf(BUTTON).has('loading'));
  assert.ok(!rows.some((entry) => entry.property === 'disabled' || entry.property === 'loading'));
});

test('ml-icon-button: the same group, without data-variant (the `only` of the configuration)', () => {
  const rows = rowsFor(ICON_BUTTON, triggerAction, `<${ICON_BUTTON}>`);
  assert.ok(rows.length > 0);
  assert.ok(!rows.some((entry) => entry.property === 'data-variant'));
});

test('an absent attribute shows the default; a written one shows what it says', () => {
  const rows = rowsFor(BUTTON, triggerAction, `<${BUTTON} size="sm" icon-position="end">`);
  assert.deepEqual([row(rows, 'size').source, row(rows, 'size').value], ['literal', 'sm']);
  assert.deepEqual([row(rows, 'iconPosition').source, row(rows, 'iconPosition').value], ['literal', 'end']);
  assert.deepEqual([row(rows, 'type').source, row(rows, 'type').value], ['absent', 'button']);
});

test('a binding is read-only, in all three of Lit\'s forms, with the reason', () => {
  const rows = rowsFor(BUTTON, triggerAction,
    `<${BUTTON} size=\${this.size} .type=\${this.kind} data-variant="\${this.tone}">`);
  for (const property of ['size', 'type', 'data-variant']) {
    const entry = row(rows, property);
    assert.equal(entry.source, 'expression', property);
    assert.equal(entry.reason?.id, 'reason.propComputed', property);
  }
  // And the write refuses it too, even if a stale panel asked.
  const prop = triggerAction.find((entry) => entry.property === 'size') as IMoleculeConfigProp;
  const spliced = splicePropAttribute(`<${BUTTON} size=\${this.size}>`, { openStart: 0, insertAt: BUTTON.length + 1 }, prop, { kind: 'set', text: 'sm' });
  assert.equal(spliced.ok, false);
});

test('labels are humanized; the technical name stays on the row', () => {
  const rows = rowsFor(BUTTON, triggerAction, `<${BUTTON}>`);
  assert.equal(row(rows, 'iconPosition').label, 'Icon position');
  assert.equal(row(rows, 'data-variant').label, 'Variant');
  assert.equal(propLabel({ property: 'size', type: 'enum', default: 'md' }), 'Size');
});

test('a molecule with a default of its own shows THAT default, and going back to it removes the attribute', () => {
  const br = 'groupentermoney--ml-enter-money-br';
  const rows = rowsFor(br, enterMoney, `<${br}>`);
  assert.deepEqual([row(rows, 'currency').source, row(rows, 'currency').value], ['absent', 'BRL']);
  assert.equal(row(rows, 'showSymbol').default, false);
  assert.deepEqual(planPropWrite(row(rows, 'currency'), 'BRL'), { ok: true, write: { kind: 'remove' } });
  // Its sibling keeps the group's.
  const plain = 'groupentermoney--ml-currency-input';
  assert.equal(row(rowsFor(plain, enterMoney, `<${plain}>`), 'currency').default, 'USD');
});

// ── The runtime confirms the configuration ──────────────────────────────────

test('an entry the registered class does not declare is hidden; a data-* passes as it is', () => {
  const declared = new Map<string, string | false>([['size', 'size']]);
  const reconciled = reconcileWithRuntime(triggerAction, declared);
  assert.deepEqual(reconciled.map((entry) => entry.property), ['size', 'data-variant']);
  // Not upgraded yet: nothing to confirm with, the configuration is trusted.
  assert.equal(reconcileWithRuntime(triggerAction, null).length, triggerAction.length);
});

test('ml-enter-text reads inputType under its own name, not the group\'s input-type', () => {
  // The group says `input-type`; this molecule declares `inputType` with no `attribute`, so Lit
  // observes `inputtype`. Writing the group's name would change nothing on screen.
  const group = enterText.find((entry) => entry.property === 'inputType');
  assert.equal(group?.attribute, 'input-type');
  const rows = rowsFor(ENTER_TEXT, enterText, `<${ENTER_TEXT} inputType="email">`);
  const inputType = row(rows, 'inputType');
  assert.equal(inputType.attribute, 'inputType');
  assert.deepEqual([inputType.source, inputType.value], ['literal', 'email']);
});

// ── What a gesture writes ───────────────────────────────────────────────────

const SIZE: IMoleculeConfigProp = { property: 'size', type: 'enum', values: ['xs', 'sm', 'md', 'lg'], default: 'md' };
const FLAG_OFF: IMoleculeConfigProp = { property: 'striped', type: 'boolean', default: false };
const FLAG_ON: IMoleculeConfigProp = { property: 'clearable', type: 'boolean', default: true };

test('booleans: true is bare, false is no attribute — unless the default is true, then ="false"', () => {
  assert.deepEqual(planPropWrite(FLAG_OFF, true), { ok: true, write: { kind: 'bare' } });
  assert.deepEqual(planPropWrite(FLAG_OFF, false), { ok: true, write: { kind: 'remove' } });
  assert.deepEqual(planPropWrite(FLAG_ON, false), { ok: true, write: { kind: 'set', text: 'false' } });
  assert.deepEqual(planPropWrite(FLAG_ON, true), { ok: true, write: { kind: 'remove' } });

  // And the source reads them back the way the decorator does.
  const rows = moleculePropsSchema({
    tag: 'x--y',
    configuration: [FLAG_OFF, FLAG_ON],
    attributes: readAttributes('<x--y striped clearable="false">', 0),
  });
  assert.deepEqual(rows.map((entry) => entry.value), [true, false]);
});

test('going back to the default removes the attribute from the source', () => {
  assert.deepEqual(planPropWrite(SIZE, 'md'), { ok: true, write: { kind: 'remove' } });
  const source = `<${BUTTON} size="sm" class="w-full">`;
  const spliced = splicePropAttribute(source, { openStart: 0, insertAt: BUTTON.length + 1 }, SIZE, { kind: 'remove' });
  assert.deepEqual(spliced, { ok: true, source: `<${BUTTON} class="w-full">` });
});

test('a write replaces in place, inserts when absent, and keeps the spelling the source uses', () => {
  const at = { openStart: 0, insertAt: BUTTON.length + 1 };
  assert.deepEqual(
    splicePropAttribute(`<${BUTTON} class="a" size="sm">`, at, SIZE, { kind: 'set', text: 'lg' }),
    { ok: true, source: `<${BUTTON} class="a" size="lg">` },
  );
  assert.deepEqual(
    splicePropAttribute(`<${BUTTON} class="a">`, at, SIZE, { kind: 'set', text: 'lg' }),
    { ok: true, source: `<${BUTTON} size="lg" class="a">` },
  );
  assert.deepEqual(
    splicePropAttribute(`<${BUTTON} Size='sm'>`, at, SIZE, { kind: 'set', text: 'xs' }),
    { ok: true, source: `<${BUTTON} Size="xs">` },
  );
  assert.deepEqual(
    splicePropAttribute(`<${BUTTON}>`, at, FLAG_OFF, { kind: 'bare' }),
    { ok: true, source: `<${BUTTON} striped>` },
  );
});

test('the undo of a write is read off the open tag before it', () => {
  const tag = `<${BUTTON} size="sm" striped>`;
  const attributes = readAttributes(tag, 0);
  assert.deepEqual(writeOfCurrent(findPropAttribute(attributes, SIZE)), { kind: 'set', text: 'sm' });
  assert.deepEqual(writeOfCurrent(findPropAttribute(attributes, FLAG_OFF)), { kind: 'bare' });
  assert.deepEqual(writeOfCurrent(findPropAttribute(attributes, FLAG_ON)), { kind: 'remove' });
});

test('a value the molecule does not understand is refused before anything is written', () => {
  assert.equal(planPropWrite(SIZE, 'huge').ok, false);
  const number: IMoleculeConfigProp = { property: 'firstDayOfWeek', type: 'number', default: 0, min: 0, max: 1 };
  assert.equal(planPropWrite(number, '7').ok, false);
  assert.equal(planPropWrite(number, 'abc').ok, false);
  assert.deepEqual(planPropWrite(number, '1'), { ok: true, write: { kind: 'set', text: '1' } });
  const text: IMoleculeConfigProp = { property: 'mask', type: 'text', default: '' };
  assert.equal(planPropWrite(text, 'a"b').ok, false);
  assert.equal(planPropWrite(text, '${x}').ok, false);
  assert.deepEqual(planPropWrite(text, ''), { ok: true, write: { kind: 'remove' } });
});

test('readAttributes gives each attribute its span in the source', () => {
  const source = 'xx<a title="t" required .v=${x} k=v>';
  const attributes = readAttributes(source, 2);
  assert.deepEqual(attributes.map((entry) => source.slice(entry.start, entry.end)), [
    'title="t"', 'required', '.v=${x}', 'k=v',
  ]);
});
