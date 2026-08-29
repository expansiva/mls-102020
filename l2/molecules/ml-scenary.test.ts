/// <mls fileReference="_102020_/l2/molecules/ml-scenary.test.ts" enhancement="_blank"/>

import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  changeDetail,
  isDirectRender,
  normalizeMode,
  parseScenes,
  readSceneElements,
  resolveActive,
  resolveBackTarget,
  sceneHidden,
  showBack,
  showTabs,
  shouldEmitChange,
  stepEnabled,
  type SceneHostChild,
  type SceneInput,
} from '/_102020_/l2/molecules/ml-scenary.logic.js';

const THREE: SceneInput[] = [
  { value: 'list', title: 'List', nav: null, backTo: null, disabled: false },
  { value: 'detail', title: 'Detail', nav: 'back', backTo: 'list', disabled: false },
  { value: 'edit', title: 'Edit', nav: null, backTo: null, disabled: false },
];

function fake(tag: string, attrs: Record<string, string | true>): SceneHostChild {
  return {
    tagName: tag,
    getAttribute(name: string) {
      const value = attrs[name];
      if (value === true) return '';
      return value ?? null;
    },
    hasAttribute(name: string) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
  };
}

test('ml-scenary.less uses DS role tokens, not undefined --ml-*', () => {
  const less = readFileSync(new URL('./ml-scenary.less', import.meta.url), 'utf8');
  assert.equal(less.includes('var(--ml-'), false);
  assert.match(less, /var\(--text-default,/u);
  assert.match(less, /var\(--surface-bg,/u);
});

test('parseScenes keeps unique required values in authored order', () => {
  const scenes = parseScenes([
    { value: '', title: 'skip', nav: null, backTo: null, disabled: false },
    { value: 'list', title: 'List', nav: null, backTo: null, disabled: false },
    { value: 'list', title: 'Dup', nav: null, backTo: null, disabled: false },
    { value: ' detail ', title: 'Detail', nav: 'back', backTo: 'list', disabled: false },
  ]);
  assert.deepEqual(scenes.map(s => s.value), ['list', 'detail']);
  assert.equal(scenes[1].navBack, true);
  assert.equal(scenes[1].backTo, 'list');
});

test('external value selects a scene and does not emit change', () => {
  const scenes = parseScenes(THREE);
  assert.equal(resolveActive(scenes, 'detail'), 'detail');
  assert.equal(resolveActive(scenes, 'missing'), 'list');
  assert.equal(
    shouldEmitChange({
      internal: false,
      revealall: false,
      disabled: false,
      loading: false,
      previous: 'list',
      next: 'detail',
    }),
    false,
  );
});

test('change fires only on internal navigation', () => {
  const scenes = parseScenes(THREE);
  assert.equal(
    shouldEmitChange({
      internal: true,
      revealall: false,
      disabled: false,
      loading: false,
      previous: 'list',
      next: 'detail',
    }),
    true,
  );
  assert.deepEqual(changeDetail(scenes, 'list', 'detail'), {
    value: 'detail',
    previous: 'list',
    title: 'Detail',
  });
  assert.equal(
    shouldEmitChange({
      internal: true,
      revealall: false,
      disabled: false,
      loading: false,
      previous: 'list',
      next: 'list',
    }),
    false,
  );
  assert.equal(
    shouldEmitChange({
      internal: true,
      revealall: true,
      disabled: false,
      loading: false,
      previous: 'list',
      next: 'detail',
    }),
    false,
  );
});

test('hidden keeps every scene in the list (same records before and after a switch)', () => {
  const scenes = parseScenes(THREE);
  const before = scenes;
  const afterList = scenes.map(scene => ({ value: scene.value, hidden: sceneHidden(scene, 'list', false) }));
  const afterDetail = scenes.map(scene => ({ value: scene.value, hidden: sceneHidden(scene, 'detail', false) }));
  assert.equal(before.length, 3);
  assert.equal(afterList.length, 3);
  assert.equal(afterDetail.length, 3);
  assert.ok(before[0] === scenes[0]);
  assert.ok(before[2] === scenes[2]);
  assert.deepEqual(afterList.map(s => s.hidden), [false, true, true]);
  assert.deepEqual(afterDetail.map(s => s.hidden), [true, false, true]);
});

test('one scene is direct render: no tabs, no back, no chrome', () => {
  const one = parseScenes([{ value: 'only', title: 'Only', nav: 'back', backTo: null, disabled: false }]);
  assert.equal(isDirectRender(one, false), true);
  assert.equal(showTabs('tabs', one, false), false);
  assert.equal(showBack('scenary', one[0], one, false), false);
  const three = parseScenes(THREE);
  assert.equal(isDirectRender(three, false), false);
  assert.equal(showTabs('tabs', three, false), true);
  assert.equal(showBack('scenary', three[1], three, false), true);
  assert.equal(showBack('tabs', three[1], three, false), false);
});

test('revealall ignores value and never emits', () => {
  const scenes = parseScenes(THREE);
  assert.deepEqual(scenes.map(s => sceneHidden(s, 'list', true)), [false, false, false]);
  assert.equal(showTabs('tabs', scenes, true), false);
  assert.equal(isDirectRender(scenes, true), false);
  assert.equal(
    shouldEmitChange({
      internal: true,
      revealall: true,
      disabled: false,
      loading: false,
      previous: 'list',
      next: 'edit',
    }),
    false,
  );
});

test('back goes to backTo when enabled, else the first enabled scene', () => {
  const scenes = parseScenes(THREE);
  assert.equal(resolveBackTarget(scenes, scenes[1]), 'list');
  const noBackTo = parseScenes([
    { value: 'list', title: 'List', nav: null, backTo: null, disabled: false },
    { value: 'edit', title: 'Edit', nav: 'back', backTo: null, disabled: false },
  ]);
  assert.equal(resolveBackTarget(noBackTo, noBackTo[1]), 'list');
});

test('keyboard step skips disabled scenes', () => {
  const scenes = parseScenes([
    { value: 'a', title: 'A', nav: null, backTo: null, disabled: false },
    { value: 'b', title: 'B', nav: null, backTo: null, disabled: true },
    { value: 'c', title: 'C', nav: null, backTo: null, disabled: false },
  ]);
  assert.equal(stepEnabled(scenes, 'a', 1), 'c');
  assert.equal(stepEnabled(scenes, 'c', 1), 'a');
  assert.equal(stepEnabled(scenes, 'c', -1), 'a');
  assert.equal(resolveActive(scenes, 'b'), 'a');
});

test('normalizeMode defaults to scenary', () => {
  assert.equal(normalizeMode('tabs'), 'tabs');
  assert.equal(normalizeMode('scenary'), 'scenary');
  assert.equal(normalizeMode('other'), 'scenary');
});

test('readSceneElements only takes direct Scene children and reads backTo', () => {
  const inputs = readSceneElements({
    children: [
      fake('DIV', { value: 'nope' }),
      fake('SCENE', { value: 'list', title: 'List' }),
      fake('SCENE', { value: 'detail', title: 'Detail', nav: 'back', backTo: 'list' }),
    ],
  });
  assert.equal(inputs.length, 2);
  assert.equal(inputs[1].backTo, 'list');
  assert.equal(inputs[1].nav, 'back');
});
