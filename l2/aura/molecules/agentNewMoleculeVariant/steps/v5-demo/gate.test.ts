/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v5-demo/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runDemoGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v5-demo/gate.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

function buildCtx(): VariantContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-23T00:00:00.000Z',
    userNotes: '',
    origin: {
      ref: '_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented',
      project: 102040, group: 'groupenterboolean', groupCanonical: 'groupEnterBoolean',
      shortName: 'ml-boolean-segmented', tag: 'groupenterboolean--ml-boolean-segmented',
      className: 'BooleanSegmentedMolecule',
      importPath: '/_102040_/l2/molecules/groupenterboolean/ml-boolean-segmented.js',
      portal: false, mlClassInventory: ['ml-boolean-segmented'],
    },
    theme: {
      project: 102053, ref: '_102053_/l2/skills/theme',
      info: {
        name: 'glass', suffix: '-glass', displayName: 'Glassmorphism', description: 'x',
        background: { kind: 'dark', css: 'background: linear-gradient(135deg, #0f172a 0%, #312e81 45%, #7e22ce 100%);', note: 'dark backdrop' },
      },
    },
    variant: {
      shortName: 'ml-boolean-segmented-glass', tag: 'groupenterboolean--ml-boolean-segmented-glass',
      className: 'BooleanSegmentedMoleculeGlass', group: 'groupenterboolean',
      files: { ts: 'x.ts', defs: 'x.defs.ts', less: 'x.less', html: 'x.html' },
    },
    example: { pattern: 'simple', ref: null, coldStart: false },
    userLanguage: 'pt',
  };
}

const T = 'groupenterboolean--ml-boolean-segmented-glass';

function validFragment(): string {
  const demo = (id: string) => `<demo id="${id}"><${T} value="{{playground.${id}.value}}"></${T}></demo>`;
  return `<div style="min-height:100vh; background: linear-gradient(135deg, #0f172a 0%, #312e81 45%, #7e22ce 100%);">
  <div class="mx-auto p-8 font-sans">
    <header class="text-center mb-12"><h1>Boolean Segmented</h1></header>
    <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'></aura--molecules--playground--widget-playground-state-102020>
    <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
      ${demo('basic')} ${demo('helper')} ${demo('disabled')}
    </section>
  </div>
</div>`;
}

test('a valid playground fragment passes', () => {
  assert.deepEqual(runDemoGate(validFragment(), buildCtx()), []);
});

test('a full HTML document is rejected', () => {
  const doc = `<!DOCTYPE html><html><head><style>body{}</style></head><body>${validFragment()}</body></html>`;
  const issues = runDemoGate(doc, buildCtx());
  assert.ok(issues.some(i => i.code === 'document'));
});

test('external <link> (google fonts) is rejected', () => {
  const withLink = validFragment().replace('<div', '<link href="https://fonts.googleapis.com/x" rel="stylesheet" />\n<div');
  assert.ok(runDemoGate(withLink, buildCtx()).some(i => i.code === 'document'));
});

test('missing state widget is rejected', () => {
  const noWidget = validFragment().replace(/<aura--molecules--playground--widget-playground-state-102020[^>]*>.*?<\/aura--molecules--playground--widget-playground-state-102020>/, '');
  assert.ok(runDemoGate(noWidget, buildCtx()).some(i => i.code === 'state_widget'));
});

test('bindings without the substitution placeholder are rejected (dead bindings)', () => {
  const noPlaceholder = validFragment().replace("state='playgroundDinamicState'", "state='{}'");
  assert.ok(runDemoGate(noPlaceholder, buildCtx()).some(i => i.code === 'state_placeholder'));
});

test('missing theme background is rejected', () => {
  const noBg = validFragment().replace(/background: linear-gradient\([^;]*\);/, '');
  assert.ok(runDemoGate(noBg, buildCtx()).some(i => i.code === 'background'));
});

test('too few variant tag uses is rejected', () => {
  const ctx = buildCtx();
  const oneUse = `<div style="min-height:100vh; ${ctx.theme.info.background.css}">
    <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'></aura--molecules--playground--widget-playground-state-102020>
    <${T}></${T}></div>`;
  assert.ok(runDemoGate(oneUse, ctx).some(i => i.code === 'tag_uses'));
});
