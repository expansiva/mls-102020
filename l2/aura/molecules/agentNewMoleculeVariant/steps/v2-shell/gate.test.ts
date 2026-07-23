/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runShellGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v2-shell/gate.js';
import { renderShellDefs, renderShellTs } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

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
  assert.deepEqual(runShellGate(renderShellTs(ctx), renderShellDefs(ctx), ctx), []);
});

test('rendered portal shell passes the gate and carries portalWidgetName', () => {
  const ctx = buildCtx(true);
  const ts = renderShellTs(ctx);
  assert.ok(ts.includes(`portalWidgetName = '${ctx.variant.tag}'`));
  assert.deepEqual(runShellGate(ts, renderShellDefs(ctx), ctx), []);
});

test('render() override is rejected', () => {
  const ctx = buildCtx(false);
  const bad = renderShellTs(ctx).replace('{}', '{ render() { return null; } }');
  assert.ok(runShellGate(bad, renderShellDefs(ctx), ctx).some(issue => issue.code === 'shell_render'));
});

test('portalClassName is rejected', () => {
  const ctx = buildCtx(true);
  const bad = renderShellTs(ctx).replace('portalWidgetName', 'portalClassName');
  assert.ok(runShellGate(bad, renderShellDefs(ctx), ctx).some(issue => issue.code === 'shell_portal_class'));
});
