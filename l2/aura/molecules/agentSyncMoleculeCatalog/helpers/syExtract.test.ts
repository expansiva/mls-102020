/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  syExtractTag,
  syExtractMoleculeDefs,
  syVaryingAxes,
  syPublishedLayout,
  syHarvestScenarios,
  syExtractExistingScenarios,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.js';

// ---- syExtractTag ----

void test('reads the real @customElement tag, never derives it from a file name', () => {
  const ts = `
@customElement('groupenternumber--ml-number-input')
export class MlNumberInputMolecule extends MoleculeAuraElement {`;
  assert.equal(syExtractTag(ts), 'groupenternumber--ml-number-input');
});

void test('no @customElement means no tag', () => {
  assert.equal(syExtractTag('export class Foo {}'), null);
});

// ---- syExtractMoleculeDefs ----

const NUMBER_INPUT_DEFS = `/// <mls fileReference="_102040_/l2/molecules/groupenternumber/ml-number-input.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code.

export const group = 'groupEnterNumber';
export const layoutConfig = {
  numberInput: "input",
  labelPlacement: "top",
  validation: "inline-below"
};

export const skill = \`# Metadata
- TagName: groupenternumber--ml-number-input

# Objective
Allow the user to type a numeric value into a text field. On blur the component rounds the value.

# Responsibilities
- Render a text input.
- Parse the typed text on each input event.

# Constraints
- Input must be blocked when readonly.\`;
`;

void test('the Objective is read COMPLETE, never truncated by position', () => {
  const result = syExtractMoleculeDefs(NUMBER_INPUT_DEFS);
  assert.ok(result);
  assert.equal(result?.objective, 'Allow the user to type a numeric value into a text field. On blur the component rounds the value.');
});

void test('layoutConfig is read as a flat string map', () => {
  const result = syExtractMoleculeDefs(NUMBER_INPUT_DEFS);
  assert.deepEqual(result?.layoutConfig, { numberInput: 'input', labelPlacement: 'top', validation: 'inline-below' });
});

void test('an empty or defs-less source returns null, not a fake objective', () => {
  assert.equal(syExtractMoleculeDefs(''), null);
  assert.equal(syExtractMoleculeDefs('export const group = 1;'), null);
});

void test('a multi-paragraph Objective collapses to one line, like the generated files use', () => {
  const source = NUMBER_INPUT_DEFS.replace(
    'Allow the user to type a numeric value into a text field. On blur the component rounds the value.',
    'First line of the objective.\nSecond line, still part of it.',
  );
  const result = syExtractMoleculeDefs(source);
  assert.equal(result?.objective, 'First line of the objective. Second line, still part of it.');
});

// ---- syVaryingAxes / syPublishedLayout ----

void test('an axis with two distinct values across siblings VARIES and is published', () => {
  const configs = [
    { numberInput: 'input', labelPlacement: 'floating', validation: 'inline-below' },
    { numberInput: 'input', labelPlacement: 'top', validation: 'inline-below' },
    { numberInput: 'stepper', labelPlacement: 'top', validation: 'inline-below' },
  ];
  const axes = syVaryingAxes(configs);
  // sorted alphabetically — labelPlacement before numberInput — matches the seeded files (§6.2)
  assert.deepEqual(axes, ['labelPlacement', 'numberInput']);
});

void test('an axis with the same value everywhere does NOT vary and costs nothing in the .defs.ts', () => {
  const configs = [
    { validation: 'inline-below', numberInput: 'input' },
    { validation: 'inline-below', numberInput: 'stepper' },
  ];
  assert.deepEqual(syVaryingAxes(configs), ['numberInput']);
});

void test('an axis only SOME siblings define does not count absence as a distinct value', () => {
  // density: comfortable / compact / compact — 2 distinct values among those who define it -> varies
  const configs: Record<string, string>[] = [{ density: 'comfortable' }, { density: 'compact' }, {}, {}];
  assert.deepEqual(syVaryingAxes(configs), ['density']);
});

void test('publishedLayout keeps only the varying axes THIS molecule itself defines', () => {
  const varying = ['density', 'numberInput'];
  assert.deepEqual(syPublishedLayout({ density: 'compact' }, varying), { density: 'compact' });
  // this molecule never defines 'density' or 'numberInput' at all -> no layout published
  assert.equal(syPublishedLayout({ validation: 'inline-below' }, varying), undefined);
});

// ---- syHarvestScenarios ----

const GROUP_ENTER_TEXT_INDEX_TS = `
@customElement('molecules--groupentertext--index-102040')
export class GroupEnterTextIndex extends StateLitElement {
  private renderReferenceTable(): TemplateResult {
    const headers = [
      { label: 'Address Field', cls: 'text-violet-600' },
      { label: 'CPF Input', cls: 'text-emerald-600' },
    ];

    const rows: Array<{ scenario: string; addressField: boolean; cpfInput: boolean; tagInput: boolean }> = [
      {
        scenario: 'Single‑line address entry',
        addressField: true,
        cpfInput: false,
        tagInput: false,
      },
      {
        scenario: 'Brazilian CPF number',
        addressField: false,
        cpfInput: true,
        tagInput: false,
      },
    ];
    return html\`\`;
  }
}
`;

const MOLECULES = [
  { tag: 'groupentertext--ml-address-field' },
  { tag: 'groupentertext--ml-cpf-input' },
  { tag: 'groupentertext--ml-tag-input' },
];

void test('harvests scenarios from the current index.ts, matching row fields to tags by camelCase', () => {
  const scenarios = syHarvestScenarios(GROUP_ENTER_TEXT_INDEX_TS, MOLECULES);
  assert.ok(scenarios);
  assert.deepEqual(scenarios, [
    { scenario: 'Single‑line address entry', recommended: ['groupentertext--ml-address-field'] },
    { scenario: 'Brazilian CPF number', recommended: ['groupentertext--ml-cpf-input'] },
  ]);
});

void test('the non-ASCII hyphen (U+2011) in a scenario label survives untouched', () => {
  const scenarios = syHarvestScenarios(GROUP_ENTER_TEXT_INDEX_TS, MOLECULES);
  assert.ok(scenarios?.[0].scenario.includes('‑'));
});

void test('a true field matching no molecule of this group is dropped, not guessed', () => {
  const ts = `
    const rows = [
      { scenario: 'Percentage', numberInput: false, numberRangeSlider: true },
    ];
  `;
  const scenarios = syHarvestScenarios(ts, [{ tag: 'groupenternumber--ml-number-input' }]);
  assert.deepEqual(scenarios, [{ scenario: 'Percentage', recommended: [] }]);
});

void test('a brand-new group with no index.ts at all has nothing to harvest', () => {
  assert.equal(syHarvestScenarios('', MOLECULES), null);
  assert.equal(syHarvestScenarios('export class Empty {}', MOLECULES), null);
});

void test('an already-migrated index.ts (no `const rows` left) has nothing to harvest', () => {
  const ts = `
    import { scenarios, molecules } from './index.defs';
    private renderReferenceTable() { return this.genericTable(scenarios, molecules); }
  `;
  assert.equal(syHarvestScenarios(ts, MOLECULES), null);
});

// ---- syExtractExistingScenarios ----

void test('reads scenarios back from a previously generated index.defs.ts, one row per line', () => {
  const defs = `export const scenarios = [
    { scenario: 'Simple quantity', recommended: ['groupenternumber--ml-number-input', 'groupenternumber--ml-number-stepper'] },
    { scenario: 'Percentage', recommended: [] },
];`;
  assert.deepEqual(syExtractExistingScenarios(defs), [
    { scenario: 'Simple quantity', recommended: ['groupenternumber--ml-number-input', 'groupenternumber--ml-number-stepper'] },
    { scenario: 'Percentage', recommended: [] },
  ]);
});

void test('a stub file (no scenarios export) returns null — nothing to preserve, try harvesting', () => {
  assert.equal(syExtractExistingScenarios('/// <mls fileReference="..." />\n'), null);
  assert.equal(syExtractExistingScenarios(''), null);
});

void test('an intentionally empty scenarios array comes back as [], not null — the two are different', () => {
  const defs = `export const scenarios = [
];`;
  assert.deepEqual(syExtractExistingScenarios(defs), []);
});
