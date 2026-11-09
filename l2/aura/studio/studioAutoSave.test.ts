/// <mls fileReference="_102020_/l2/aura/studio/studioAutoSave.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { modelTextDiffers } from '/_102020_/l2/aura/studio/studioAutoSave.js';

const file = {
  project: 7,
  level: 1,
  shortName: 'order',
  folder: 'usecases',
  extension: '.ts',
};

test('modelTextDiffers is true only when the open model moved off the captured text', () => {
  const host = globalThis as { mls?: { editor?: unknown } };
  const previous = host.mls?.editor;
  let text = 'captured';
  if (!host.mls) host.mls = {};
  host.mls.editor = {
    getKeyModel: () => '7/1/usecases/order',
    models: { '7/1/usecases/order': { ts: { model: { getValue: () => text } } } },
  };
  try {
    assert.equal(modelTextDiffers(file, 'captured'), false);
    text = 'edited-after';
    assert.equal(modelTextDiffers(file, 'captured'), true);
  } finally {
    if (host.mls) host.mls.editor = previous;
  }
});
