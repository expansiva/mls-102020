/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/tplCore.test.ts" enhancement="_blank" />

// Tests for the pure helpers of the templates-render core, focused on the molecule mode (useMolecules):
// args default, the "## Molecules" gate, the two artifact parsers (plan lists vs template table), tag →
// refs resolution, the molecule-defs condenser and the skill unwrapper. Uses node:test so the suite
// runner (scripts/run-tests.mjs) picks it up.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseTplArgs, hasMoleculesSection, moleculeGroupFolder, parseMoleculePlan, extractTemplateMolecules,
  moleculeRefsFromTag, summarizeMoleculeDefs, unwrapSkillSource, findMoleculeGroup, moleculeGroupIndex,
  renderGroupCatalog, MOLECULES_PROJECT,
} from '/_102020_/l2/aura/agentTemplatesRender/tplCore.js';

const baseArgs = { module: 'cafeFlow', styleModel: 'oracleStyle', layout: 4, ds: 1 };

test('parseTplArgs: useMolecules defaults to false and is opt-in', () => {
  assert.equal(parseTplArgs(JSON.stringify(baseArgs)).useMolecules, false);
  assert.equal(parseTplArgs(JSON.stringify({ ...baseArgs, useMolecules: false })).useMolecules, false);
  assert.equal(parseTplArgs(JSON.stringify({ ...baseArgs, useMolecules: 'yes' })).useMolecules, false);
  assert.equal(parseTplArgs(JSON.stringify({ ...baseArgs, useMolecules: true })).useMolecules, true);
  assert.equal(parseTplArgs(JSON.stringify(baseArgs)).genome, 'page41');
});

test('hasMoleculesSection: only a guide carrying the section switches the mode on', () => {
  assert.equal(hasMoleculesSection('# T\n\n## Page structure\n\n## Molecules\n\n| a |'), true);
  assert.equal(hasMoleculesSection('# T\n\n### Molecules\n'), true);
  assert.equal(hasMoleculesSection('# T\n\n## Page structure\n\nno molecules here\n'), false);
  assert.equal(hasMoleculesSection(''), false);
  assert.equal(hasMoleculesSection(undefined), false);
});

test('moleculeGroupFolder: index camelCase maps to the lowercase library folder', () => {
  assert.equal(moleculeGroupFolder('groupSelectOne'), 'molecules/groupselectone');
  assert.equal(moleculeGroupFolder(' groupEnterDatetime '), 'molecules/groupenterdatetime');
});

test('parseMoleculePlan: reads the plan/groups machine-read lists', () => {
  const plan = [
    '# Molecules — recordCatalog (oracleStyle)',
    '',
    '| element | region | intent | group | molecule (TagName) | why |',
    '| --- | --- | --- | --- | --- | --- |',
    '| status filter | toolbar | pick 1 of N | groupSelectOne | groupselectone--ml-combobox | many options |',
    '| notes | panel | type text | — | NONE | no molecule fits |',
    '',
    '## Groups',
    '- groupSelectOne',
    '- groupViewTable',
    '- notAGroup',
    '',
    '## TagNames',
    '- groupselectone--ml-combobox',
    '- groupviewtable--ml-data-table',
    '',
  ].join('\n');
  const { groups, tags } = parseMoleculePlan(plan);
  assert.deepEqual(groups, ['groupSelectOne', 'groupViewTable']);   // unknown group dropped
  assert.deepEqual(tags, ['groupselectone--ml-combobox', 'groupviewtable--ml-data-table']);

  // The groups trace (agentTplGroups output) is read back by the same parser.
  const groupsMd = '# Molecule groups — t (s)\n\n| a |\n\n## Groups\n\n- groupTriggerAction\n- groupViewMetric\n';
  assert.deepEqual(parseMoleculePlan(groupsMd).groups, ['groupTriggerAction', 'groupViewMetric']);
  assert.deepEqual(parseMoleculePlan(groupsMd).tags, []);

  // An empty plan (nothing fits) yields nothing — the guide then stays hand-drawn.
  assert.deepEqual(parseMoleculePlan('# Molecules\n\n## Groups\n\n## TagNames\n'), { groups: [], tags: [] });
  assert.deepEqual(parseMoleculePlan(undefined), { groups: [], tags: [] });
});

test('parseMoleculePlan: survives a sloppily formatted plan', () => {
  // Verbose list items still resolve.
  const verbose = [
    '# Molecules — t (s)', '',
    '## Groups', '- `groupSelectOne` — used by the toolbar filter', '* groupViewTable (the main grid)', '',
    '## TagNames', '- `groupselectone--ml-combobox` (filter)', '- groupviewtable--ml-data-table — rows', '',
  ].join('\n');
  assert.deepEqual(parseMoleculePlan(verbose).groups, ['groupSelectOne', 'groupViewTable']);
  assert.deepEqual(parseMoleculePlan(verbose).tags, ['groupselectone--ml-combobox', 'groupviewtable--ml-data-table']);

  // No closing lists at all: the table alone still yields the contract.
  const tableOnly = [
    '# Molecules — t (s)', '',
    '| element | intent | group | molecule (TagName) | why |',
    '| --- | --- | --- | --- | --- |',
    '| filter | pick 1 of N | groupSelectOne | groupselectone--ml-combobox | many options |',
    '| notes | type text | — | NONE | nothing fits |', '',
  ].join('\n');
  assert.deepEqual(parseMoleculePlan(tableOnly).tags, ['groupselectone--ml-combobox']);
  assert.deepEqual(parseMoleculePlan(tableOnly).groups, ['groupSelectOne']);

  // "NONE" is never mistaken for a molecule.
  assert.deepEqual(parseMoleculePlan('## TagNames\n- NONE\n').tags, []);
});

test('extractTemplateMolecules: harvests the guide table (tags carry their own group)', () => {
  const template = [
    '# Record Catalog Template',
    '',
    '## Page structure',
    'Object header, list card, record panel.',
    '',
    '## Molecules',
    '| region | element | group | molecule (TagName) or "hand-drawn" |',
    '| --- | --- | --- | --- |',
    '| toolbar | status filter | groupSelectOne | `groupselectone--ml-combobox` |',
    '| list card | rows | groupViewTable | groupviewtable--ml-data-table |',
    '| panel | notes | — | hand-drawn |',
    '| header | primary action | groupTriggerAction | grouptriggeraction--ml-button |',
    '',
    '## Acceptance criteria',
    '- each element is implemented by its molecule or hand-drawn as declared.',
  ].join('\n');

  const { groups, tags } = extractTemplateMolecules(template);
  assert.deepEqual(tags, [
    'groupselectone--ml-combobox', 'groupviewtable--ml-data-table', 'grouptriggeraction--ml-button',
  ]);
  assert.deepEqual(groups, ['groupSelectOne', 'groupViewTable', 'groupTriggerAction']);

  // Nothing is harvested outside the Molecules section, and a v1 guide yields nothing.
  const v1 = '# T\n\n## Page structure\nregions only\n';
  assert.deepEqual(extractTemplateMolecules(v1), { groups: [], tags: [] });
});

test('moleculeRefsFromTag: TagName resolves to library defs + module refs', () => {
  assert.deepEqual(moleculeRefsFromTag('groupselectone--ml-combobox'), {
    defs: `_${MOLECULES_PROJECT}_/l2/molecules/groupselectone/ml-combobox.defs.ts`,
    module: `/_${MOLECULES_PROJECT}_/l2/molecules/groupselectone/ml-combobox.js`,
  });
  assert.equal(moleculeRefsFromTag('not-a-tag'), null);
  assert.equal(moleculeRefsFromTag('groupselectone--combobox'), null);
});

test('summarizeMoleculeDefs: keeps what decides the fit, drops the bulk', () => {
  const defs = [
    "/// <mls fileReference=\"_102040_/l2/molecules/groupselectone/ml-combobox.defs.ts\" enhancement=\"_blank\" />",
    '',
    "export const group = 'groupSelectOne';",
    '',
    'export const layoutConfig = {',
    '  selectOne: "dropdown",',
    '  labelPlacement: "top"',
    '};',
    '',
    'export const skill = `# Metadata',
    '- TagName: groupselectone--ml-combobox',
    '',
    '# Objective',
    'Allow the user to choose exactly one option by typing to filter.',
    'A dropdown of matching options appears as the user types.',
    '',
    '# Responsibilities',
    '- Open the dropdown on focus.',
    '',
    '# Constraints',
    '- Blocked while disabled.`;',
  ].join('\n');

  const out = summarizeMoleculeDefs('_102040_/l2/molecules/groupselectone/ml-combobox.defs.ts', defs);
  assert.match(out, /TagName: groupselectone--ml-combobox/);
  assert.match(out, /layoutConfig: \{ selectOne: "dropdown", labelPlacement: "top" \}/);
  assert.match(out, /Objective: Allow the user to choose exactly one option by typing to filter\./);
  assert.doesNotMatch(out, /Responsibilities/);
  assert.doesNotMatch(out, /Constraints/);
  assert.ok(out.length < defs.length);
});

test('unwrapSkillSource: a skill module becomes its markdown', () => {
  const mod = [
    '/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterBoolean/usage.ts" enhancement="_blank"/>',
    '',
    'export const skill = `',
    '# enter + boolean — Usage',
    '',
    '| `value` | `boolean` | Current value |',
    '',
    'Interpolation stays literal: \\${notAnExpression}',
    '`;',
    '',
  ].join('\n');

  const md = unwrapSkillSource(mod);
  assert.match(md, /^# enter \+ boolean — Usage/);
  assert.match(md, /\| `value` \| `boolean` \| Current value \|/);
  assert.match(md, /\$\{notAnExpression\}/);
  assert.doesNotMatch(md, /export const skill/);
  assert.doesNotMatch(md, /fileReference/);

  // Plain markdown passes through unchanged (minus the header).
  assert.equal(unwrapSkillSource('# Already markdown\n'), '# Already markdown');
});

test('group index: every catalog entry resolves and is usable by the cascade', () => {
  const index = moleculeGroupIndex();
  assert.ok(index.length >= 20, `expected a populated catalog, got ${index.length}`);
  for (const g of index) {
    assert.ok(g.description && g.description.length > 20, `group ${g.name} needs an intent description`);
    assert.ok(g.skillUsageReference, `group ${g.name} needs a usage reference (the render loads it)`);
    // The tag prefix the render sees must map back to this group.
    assert.equal(findMoleculeGroup(g.name.toLowerCase())?.name, g.name);
  }
  const catalog = renderGroupCatalog();
  assert.equal(catalog.split('\n').length, index.length);
  assert.match(catalog, /^\- \*\*group/);
  assert.equal(findMoleculeGroup('groupThatDoesNotExist'), undefined);
});
