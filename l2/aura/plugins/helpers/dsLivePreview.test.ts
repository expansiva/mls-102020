/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsLivePreview.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { canPreview, createLivePreview } from './dsLivePreview.js';

function fakeDoc(active?: string, css = 'boot css') {
  const style = active ? { textContent: css as string | null, dataset: { designSystem: active } as Record<string, string | undefined> } : null;
  return { style, doc: { getElementById: (id: string) => (id === 'ds-tokens' ? style : null) } };
}

test('apply swaps the css and keeps the active DS', () => {
  const { style, doc } = fakeDoc('Default');
  const live = createLivePreview(doc);
  live.apply('live 1');
  assert.equal(style!.textContent, 'live 1');
  assert.equal(style!.dataset.designSystem, 'Default');
  assert.equal(live.active, true);
});

test('snapshot is taken on the first apply only — restore returns the boot css', () => {
  const { style, doc } = fakeDoc('Default');
  const live = createLivePreview(doc);
  live.apply('live 1');
  live.apply('live 2');
  live.apply('live 3');
  live.restore();
  assert.equal(style!.textContent, 'boot css');
  assert.equal(live.active, false);
});

test('restore never undoes a DS switched in the meantime', () => {
  const { style, doc } = fakeDoc('Default');
  const live = createLivePreview(doc);
  live.apply('live 1');
  style!.dataset.designSystem = 'Natal';
  style!.textContent = 'natal css';
  live.restore();
  assert.equal(style!.textContent, 'natal css');
  assert.equal(live.active, false);
});

test('commit drops the snapshot and follows a rename', () => {
  const { style, doc } = fakeDoc('Default');
  const live = createLivePreview(doc);
  live.apply('saved css');
  live.commit('Sunset');
  assert.equal(style!.dataset.designSystem, 'Sunset');
  live.restore();
  assert.equal(style!.textContent, 'saved css');
});

test('commit without a prior apply is a no-op', () => {
  const { style, doc } = fakeDoc('Default');
  createLivePreview(doc).commit('Sunset');
  assert.equal(style!.dataset.designSystem, 'Default');
});

test('apply without #ds-tokens does nothing', () => {
  const { doc } = fakeDoc();
  const live = createLivePreview(doc);
  live.apply('live');
  assert.equal(live.active, false);
});

test('canPreview: same project + active DS only', () => {
  const { doc } = fakeDoc('Default');
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: 102047, entryName: 'Default', doc }), true);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: '102047', entryName: ' default ', doc }), true);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: 102048, entryName: 'Default', doc }), false);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: 102047, entryName: 'Natal', doc }), false);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: undefined, entryName: 'Default', doc }), false);
  assert.equal(canPreview({ editorProjectId: null, bootProjectId: 102047, entryName: 'Default', doc }), false);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: 102047, entryName: 'Default', doc: fakeDoc().doc }), false);
  assert.equal(canPreview({ editorProjectId: 102047, bootProjectId: 102047, entryName: undefined, doc }), false);
});
