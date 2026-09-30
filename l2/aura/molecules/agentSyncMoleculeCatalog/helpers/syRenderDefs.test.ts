/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderDefs.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { syRenderIndexDefs, syRenderIndexHtml, SyRenderDefsInput } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderDefs.js';

// Shaped after the real groupEnterNumber seed (the brief §4, mls-102040-temp/l2/molecules/groupenternumber).
const INPUT: SyRenderDefsInput = {
  project: 102040,
  groupCanonical: 'groupEnterNumber',
  groupFolder: 'groupenternumber',
  usageContract: '/_102020_/l2/aura/molecules/skills/groupEnterNumber/usage',
  purpose: 'Allows the user to input numeric values.',
  molecules: [
    {
      tag: 'groupenternumber--ml-floating-number-input',
      shortName: 'floating-number-input',
      layout: { labelPlacement: 'floating', numberInput: 'input' },
      defsRef: '/_102040_/l2/molecules/groupenternumber/ml-floating-number-input.defs',
      objective: 'Permitir ao usuário inserir números.',
    },
    {
      tag: 'groupenternumber--ml-number-input',
      shortName: 'number-input',
      layout: { labelPlacement: 'top', numberInput: 'input' },
      defsRef: '/_102040_/l2/molecules/groupenternumber/ml-number-input.defs',
      objective: 'Allow the user to type a numeric value.',
    },
    {
      tag: 'groupenternumber--ml-table-multi-select',
      shortName: 'table-multi-select',
      defsRef: null,
      objective: null,
    },
  ],
  scenarios: [
    { scenario: 'Simple quantity', recommended: ['groupenternumber--ml-number-input'] },
    { scenario: 'Percentage', recommended: [] },
  ],
  generatedAt: '2026-08-25T12:00:00.000Z',
};

void test('the fileReference line is anchored to the real group folder and project', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.equal(text.split('\n')[0], '/// <mls fileReference="_102040_/l2/molecules/groupenternumber/index.defs.ts" enhancement="_blank"/>');
});

void test('molecule entries: layout present renders in the same order as the layout object, defs quoted', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(
    text,
    /\{ tag: 'groupenternumber--ml-floating-number-input', layout: \{ labelPlacement: 'floating', numberInput: 'input' \}, defs: '\/_102040_\/l2\/molecules\/groupenternumber\/ml-floating-number-input\.defs', module: '\/_102040_\/l2\/molecules\/groupenternumber\/ml-floating-number-input\.js' \},/,
  );
});

void test('a molecule with no varying axis omits the layout key entirely', () => {
  const noLayoutInput: SyRenderDefsInput = { ...INPUT, molecules: [{ ...INPUT.molecules[1], layout: undefined }] };
  const text = syRenderIndexDefs(noLayoutInput);
  assert.match(text, /\{ tag: 'groupenternumber--ml-number-input', defs: '\/_102040_\/l2\/molecules\/groupenternumber\/ml-number-input\.defs', module: '\/_102040_\/l2\/molecules\/groupenternumber\/ml-number-input\.js' \},/);
});

void test('a molecule with no .defs.ts renders defs: null with the out-of-contract comment, no layout key', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(text, /\{ tag: 'groupenternumber--ml-table-multi-select', defs: null \/\* ⚠ no \.defs\.ts — outside the contract \*\/, module: '\/_102040_\/l2\/molecules\/groupenternumber\/ml-table-multi-select\.js' \},/);
});

void test('scenarios render as full prefixed tags', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(text, /\{ scenario: 'Simple quantity', recommended: \['groupenternumber--ml-number-input'\] \},/);
  assert.match(text, /\{ scenario: 'Percentage', recommended: \[\] \},/);
});

void test('the skill markdown table uses SHORT tag names (no group prefix), "—" for an empty recommendation', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(text, /\| Simple quantity \| ml-number-input \|/);
  assert.match(text, /\| Percentage \| — \|/);
});

void test('the "## Molecules (N)" count is the TOTAL molecule count, defs-less ones included', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(text, /## Molecules \(3\)/);
});

void test('a molecule bullet with layout: "**tag** · axis: value, axis2: value2 — objective"', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(
    text,
    /- \*\*groupenternumber--ml-floating-number-input\*\* · labelPlacement: floating, numberInput: input — Permitir ao usuário inserir números\./,
  );
});

void test('a molecule bullet with NO layout skips the "· axes" segment entirely (single space before the dash)', () => {
  const noAxes: SyRenderDefsInput = { ...INPUT, molecules: [{ ...INPUT.molecules[1], layout: undefined }] };
  const text = syRenderIndexDefs(noAxes);
  assert.match(text, /- \*\*groupenternumber--ml-number-input\*\* — Allow the user to type a numeric value\./);
});

void test('a defs-less molecule bullet: the out-of-contract line, no objective, no "·"', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.match(
    text,
    /- \*\*groupenternumber--ml-table-multi-select\*\* — ⚠ outside the contract: no \.defs\.ts \(objective unavailable; read the molecule file before using it\)\.$/m,
  );
});

void test('the file ends with the skill template literal and a single trailing newline', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.ok(text.endsWith('`;\n'));
  assert.ok(!text.endsWith('`;\n\n'));
});

void test('index.html is one line, no trailing newline, group folder + project interpolated both sides', () => {
  const html = syRenderIndexHtml('groupenternumber', 102040);
  assert.equal(html, '<molecules--groupenternumber--index-102040></molecules--groupenternumber--index-102040>');
  assert.ok(!html.includes('\n'));
});

void test('every entry carries a module derived from folder + tag, including the defs: null one', () => {
  const text = syRenderIndexDefs(INPUT);
  for (const short of ['ml-floating-number-input', 'ml-number-input', 'ml-table-multi-select']) {
    assert.ok(text.includes(`tag: 'groupenternumber--${short}'`));
    assert.ok(text.includes(`module: '/_102040_/l2/molecules/groupenternumber/${short}.js' },`));
  }
});

void test('step 4 (import every rendered molecule) appears exactly once', () => {
  const text = syRenderIndexDefs(INPUT);
  assert.equal(text.split('4. Every molecule you render needs its side-effect import').length - 1, 1);
});

void test('one Import: line per molecule, with the right path, including the defs-less one', () => {
  const text = syRenderIndexDefs(INPUT);
  const lines = text.split('\n').filter(l => l.startsWith('  Import: '));
  assert.equal(lines.length, 3);
  assert.equal(lines[2], "  Import: \\`import '/_102040_/l2/molecules/groupenternumber/ml-table-multi-select.js';\\`");
});

void test('the evaluated skill shows plain backticks on the Import: lines', () => {
  const text = syRenderIndexDefs(INPUT);
  const js = ts.transpileModule(text, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const m: { exports: { skill?: string } } = { exports: {} };
  new Function('module', 'exports', js)(m, m.exports);
  const lines = (m.exports.skill ?? '').split('\n').filter(l => l.startsWith('  Import: '));
  assert.equal(lines.length, 3);
  assert.equal(lines[0], "  Import: `import '/_102040_/l2/molecules/groupenternumber/ml-floating-number-input.js';`");
});
