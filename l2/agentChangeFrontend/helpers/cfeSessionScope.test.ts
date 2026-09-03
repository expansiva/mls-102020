/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeSessionScope.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionScope } from '/_102020_/l2/agentChangeFrontend/helpers/cfeSessionScope.js';

const UX_KEY = '__agentChangeFrontendUxVariants';
const g = globalThis as unknown as Record<string, any>;

async function loadShared(): Promise<{
  rememberCreateUxVariants: (mode: 'all' | 'default') => void;
  rememberedUxVariants: () => 'all' | 'default';
}> {
  if (!g.document) g.document = { documentElement: { lang: 'en' }, addEventListener() {}, removeEventListener() {}, createElement: () => ({ style: {} }) };
  if (!g.mls) g.mls = { actualProject: 0, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js');
}

function restoreWindow(prior: unknown): void {
  if (prior) g.window = prior;
  else delete g.window;
}

test('sessionScope uses the window object when present and globalThis when it is not', () => {
  const prior = g.window;
  const bag = { marker: 1 };
  g.window = bag;
  try {
    assert.equal(sessionScope(), bag);
    delete g.window;
    assert.equal(sessionScope(), globalThis);
  } finally {
    restoreWindow(prior);
  }
});

test('memo of CF works without window', async () => {
  const prior = g.window;
  if (!g.window) {
    g.window = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) };
  }
  const { rememberCreateUxVariants, rememberedUxVariants } = await loadShared();
  delete g.window;
  try {
    rememberCreateUxVariants('all');
    assert.equal(rememberedUxVariants(), 'all');
    assert.equal((globalThis as Record<string, unknown>)[UX_KEY], 'all');
  } finally {
    delete (globalThis as Record<string, unknown>)[UX_KEY];
    restoreWindow(prior);
  }
});

test('memo of CF works with window on the same key as today', async () => {
  const prior = g.window;
  const bag: Record<string, unknown> = {
    addEventListener() {},
    removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  };
  g.window = bag;
  const { rememberCreateUxVariants, rememberedUxVariants } = await loadShared();
  try {
    rememberCreateUxVariants('all');
    assert.equal(bag[UX_KEY], 'all');
    assert.equal(rememberedUxVariants(), 'all');
    rememberCreateUxVariants('default');
    assert.equal(bag[UX_KEY], 'default');
    assert.equal(rememberedUxVariants(), 'default');
  } finally {
    delete bag[UX_KEY];
    restoreWindow(prior);
  }
});
