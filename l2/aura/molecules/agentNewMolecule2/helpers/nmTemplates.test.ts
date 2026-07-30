/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nmDefsHeader,
  nmGroupIndexTag,
  nmIdentityFromPlan,
  nmLessHeader,
  nmSwapTagNameLine,
  nmTsHeader,
  normalizeLessContent,
  renderLayoutConfigBody,
  normalizeMoleculeTs,
  renderDefsTs,
  renderGroupIndexHtml,
  type NmIdentity,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';

const ID: NmIdentity = {
  project: 102053,
  groupFolder: 'groupviewmetric',
  groupCanonical: 'groupViewMetric',
  shortName: 'ml-kpi-card-glass',
  tag: 'groupviewmetric--ml-kpi-card-glass',
};

const SKILL = `# Metadata
- TagName: WRONG--tag

# Objective
Present a KPI.

# Responsibilities
- Show a label.

# Constraints
- Must not emit events.

# Notes
- Presentational only.`;

test('headers carry the destination path and the right enhancement per extension', () => {
  assert.equal(nmDefsHeader(ID), '/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card-glass.defs.ts" enhancement="_blank" />');
  assert.equal(nmTsHeader(ID), '/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card-glass.ts" enhancement="_102020_/l2/enhancementAura"/>');
  assert.equal(nmLessHeader(ID), '/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card-glass.less" enhancement="_102020_/l2/enhancementStyleAura"/>');
});

test('the TagName line is REPLACED by the derived tag, never trusted', () => {
  assert.ok(nmSwapTagNameLine(SKILL, ID.tag).includes('- TagName: groupviewmetric--ml-kpi-card-glass'));
  assert.ok(!nmSwapTagNameLine(SKILL, ID.tag).includes('WRONG--tag'));
});

test('a missing Metadata section is prepended, and a bodyless one is filled', () => {
  const noMeta = nmSwapTagNameLine('# Objective\nDo something.', ID.tag);
  assert.ok(noMeta.startsWith('# Metadata\n- TagName: groupviewmetric--ml-kpi-card-glass\n'));
  assert.ok(noMeta.includes('# Objective'));

  const emptyMeta = nmSwapTagNameLine('# Metadata\n\n# Objective\nDo something.', ID.tag);
  assert.ok(emptyMeta.startsWith('# Metadata\n- TagName: groupviewmetric--ml-kpi-card-glass'));
});

test('.defs.ts carries the canonical group, the layoutConfig and the escaped skill', () => {
  const defs = renderDefsTs(ID, SKILL, { metric: 'big-number' });
  assert.ok(defs.startsWith(nmDefsHeader(ID)));
  assert.ok(defs.includes("export const group = 'groupViewMetric';"));
  assert.ok(defs.includes('export const layoutConfig = {\n  metric: "big-number"\n};'), 'D7: the confirmed axes');
  assert.ok(defs.includes('// Do not change – automatically generated code.'));
  assert.ok(defs.includes('- TagName: groupviewmetric--ml-kpi-card-glass'));
});

test('the layoutConfig body matches the byte shape of the real mls-102040 files', () => {
  assert.equal(renderLayoutConfigBody({ metric: 'big-number' }), '{\n  metric: "big-number"\n}');
  assert.equal(
    renderLayoutConfigBody({ recordsView: 'table', density: 'compact' }),
    '{\n  recordsView: "table",\n  density: "compact"\n}',
  );
});

// The 18 axis-less molecules of mls-102040 carry exactly this.
test('an empty layoutConfig stays on one line', () => {
  assert.equal(renderLayoutConfigBody({}), '{}');
  assert.ok(renderDefsTs(ID, SKILL).includes('export const layoutConfig = {};'));
  assert.ok(renderDefsTs(ID, SKILL, { metric: '' }).includes('export const layoutConfig = {};'), 'a blank value is not an axis');
});

test('.defs.ts escapes what would break the template literal', () => {
  const defs = renderDefsTs(ID, '# Metadata\n- TagName: x\n\n# Objective\nUse `cn()` with ${value}.');
  assert.ok(defs.includes('Use \\`cn()\\` with \\${value}.'));
  // The skill literal must be the only backtick pair in the file after the header line.
  const body = defs.slice(defs.indexOf('export const skill'));
  assert.equal((body.match(/(^|[^\\])`/g) || []).length, 2, 'exactly the opening and closing backticks');
});

test('normalize* strips the header the model wrote and prepends ours', () => {
  const modelTs = '/// <mls fileReference="_999_/l2/wrong/path.ts" enhancement="_blank"/>\n\nimport { html } from \'lit\';\n';
  const ts = normalizeMoleculeTs(modelTs, ID);
  assert.ok(ts.startsWith(nmTsHeader(ID)));
  assert.ok(!ts.includes('_999_'), 'the wrong destination is gone');
  assert.ok(ts.includes("import { html } from 'lit';"));

  const less = normalizeLessContent('groupviewmetric--ml-kpi-card-glass {\n  color: red;\n}\n', ID);
  assert.ok(less.startsWith(nmLessHeader(ID)));
  assert.ok(less.includes('color: red;'));
});

test('the group index tag and html are deterministic', () => {
  assert.equal(nmGroupIndexTag(ID), 'molecules--groupviewmetric--index-102053');
  assert.equal(renderGroupIndexHtml(ID), '<molecules--groupviewmetric--index-102053></molecules--groupviewmetric--index-102053>');
});

test('nmIdentityFromPlan reads the project from the fileReference', () => {
  const plan: MoleculePlan = {
    schemaVersion: 1,
    confirmedAt: '2026-07-29T00:00:00.000Z',
    fileReference: '_102053_/l2/molecules/groupviewmetric/ml-kpi-card-glass.ts',
    shortName: 'ml-kpi-card-glass',
    tag: 'groupviewmetric--ml-kpi-card-glass',
    group: 'groupviewmetric',
    groupCanonical: 'groupViewMetric',
    description: 'A KPI card.',
    prompt: 'Create a KPI card.',
    functionalRequirements: ['Show a label'],
    visualRequirements: [],
    layoutConfig: { metric: 'big-number' },
  };
  assert.deepEqual(nmIdentityFromPlan(plan), ID);
});
