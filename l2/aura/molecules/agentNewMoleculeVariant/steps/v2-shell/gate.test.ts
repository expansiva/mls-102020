/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runShellGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.js';
import { renderShellDefs, renderShellTs } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

// A realistic origin .defs.ts (mirrors mls-102040 shape: header + do-not-change
// note + group + layoutConfig + a rich skill with TagName/Objective/…).
const ORIGIN_DEFS = `/// <mls fileReference="_102040_/l2/molecules/groupselectone/ml-select-dropdown.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code.

export const group = 'groupSelectOne';

export const layoutConfig = {
  select: "dropdown",
  labelPlacement: "top"
};

export const skill = \`# Metadata
- TagName: groupselectone--ml-select-dropdown

# Objective
Let the user pick exactly one option from a dropdown.

# Responsibilities
- Show the selected option.

# Constraints
- Only one value at a time.\`;
`;

function buildCtx(portal: boolean): VariantContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-23T00:00:00.000Z',
    userNotes: '',
    origin: {
      ref: '_102040_/l2/molecules/groupselectone/ml-select-dropdown',
      project: 102040,
      group: 'groupselectone',
      groupCanonical: 'groupSelectOne',
      shortName: 'ml-select-dropdown',
      tag: 'groupselectone--ml-select-dropdown',
      className: 'MlSelectDropdownMolecule',
      importPath: '/_102040_/l2/molecules/groupselectone/ml-select-dropdown.js',
      portal,
      mlClassInventory: ['ml-select-trigger', 'ml-select-panel'],
    },
    theme: {
      project: 102055,
      ref: '_102055_/l2/skills/theme',
      info: {
        name: 'glass',
        suffix: '-glass',
        displayName: 'Glassmorphism',
        description: 'x',
        background: { kind: 'dark', css: 'background: #000;', note: 'dark backdrop required.' },
      },
    },
    variant: {
      shortName: 'ml-select-dropdown-glass',
      tag: 'groupselectone--ml-select-dropdown-glass',
      className: 'MlSelectDropdownMoleculeGlass',
      group: 'groupselectone',
      files: {
        ts: 'l2/molecules/groupselectone/ml-select-dropdown-glass.ts',
        defs: 'l2/molecules/groupselectone/ml-select-dropdown-glass.defs.ts',
        less: 'l2/molecules/groupselectone/ml-select-dropdown-glass.less',
        html: 'l2/molecules/groupselectone/ml-select-dropdown-glass.html',
      },
    },
    example: { pattern: portal ? 'portal' : 'simple', ref: null, coldStart: true },
    userLanguage: 'pt',
  };
}

test('rendered simple shell passes the gate', () => {
  const ctx = buildCtx(false);
  assert.deepEqual(runShellGate(renderShellTs(ctx), renderShellDefs(ctx, ORIGIN_DEFS), ctx), []);
});

test('rendered portal shell passes the gate and carries portalWidgetName', () => {
  const ctx = buildCtx(true);
  const ts = renderShellTs(ctx);
  assert.ok(ts.includes(`portalWidgetName = '${ctx.variant.tag}'`));
  assert.deepEqual(runShellGate(ts, renderShellDefs(ctx, ORIGIN_DEFS), ctx), []);
});

test('render() override is rejected', () => {
  const ctx = buildCtx(false);
  const bad = renderShellTs(ctx).replace('{}', '{ render() { return null; } }');
  assert.ok(runShellGate(bad, renderShellDefs(ctx, ORIGIN_DEFS), ctx).some(issue => issue.code === 'shell_render'));
});

test('portalClassName is rejected', () => {
  const ctx = buildCtx(true);
  const bad = renderShellTs(ctx).replace('portalWidgetName', 'portalClassName');
  assert.ok(runShellGate(bad, renderShellDefs(ctx, ORIGIN_DEFS), ctx).some(issue => issue.code === 'shell_portal_class'));
});

test('defs replicates the contract verbatim, swapping ONLY header + TagName', () => {
  const ctx = buildCtx(false);
  const defs = renderShellDefs(ctx, ORIGIN_DEFS);
  // identity swapped to the variant
  assert.ok(defs.includes(`_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.defs.ts`));
  assert.ok(new RegExp(`^\\s*-\\s*TagName:\\s*${ctx.variant.tag}\\s*$`, 'm').test(defs));
  // origin identity gone
  assert.ok(!defs.includes('_102040_/l2/molecules/groupselectone/ml-select-dropdown.defs.ts'));
  assert.ok(!/^\s*-\s*TagName:\s*groupselectone--ml-select-dropdown\s*$/m.test(defs));
  // contract preserved verbatim
  assert.ok(defs.includes(`export const group = 'groupSelectOne';`));
  assert.ok(defs.includes('export const layoutConfig = {'));
  assert.ok(defs.includes('select: "dropdown"'));
  assert.ok(defs.includes('# Responsibilities'));
  assert.ok(defs.includes('# Constraints'));
});

test('empty origin defs is rejected (contract cannot be fabricated)', () => {
  const ctx = buildCtx(false);
  assert.throws(() => renderShellDefs(ctx, '   '));
});
