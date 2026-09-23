/// <mls fileReference="_102020_/l2/molecules/ml-scenary.test.ts" enhancement="_blank"/>

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { build } from 'esbuild';
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
} from '/_102020_/l2/molecules/mlScenaryLogic.js';

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

const browserDomTest = process.env.D2_BROWSER_DOM_TEST === '1' ? test : test.skip;
browserDomTest('real ml-scenary mounts in Chrome and preserves inactive Scene DOM while switching', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  assert.ok(existsSync(chrome), 'Chrome is required by the mounted DOM gate');
  const folder = mkdtempSync(path.join(tmpdir(), 'ml-scenary-browser-'));
  try {
    const entry = `globalThis.mls={actualProject:102020};
(async()=>{try{const mod=await import('/_102020_/l2/molecules/ml-scenary.js');const host=document.createElement(mod.ML_SCENARY_TAG);host.mode='scenary';host.value='list';const scene=(value,title,id)=>{const node=document.createElement('Scene');node.setAttribute('value',value);node.setAttribute('title',title);const input=document.createElement('input');input.id=id;input.value='preserved';node.append(input);return node};host.append(scene('list','List','list-control'),scene('form','Form','form-control'));document.body.append(host);await host.updateComplete;const panels=()=>[...host.querySelectorAll('.ml-scenary-panel')];const first=panels();const listInput=host.querySelector('#list-control');if(first.length!==2||first[0].hidden||first[0].inert||!first[1].hidden||!first[1].inert)throw Error('initial visibility');listInput.focus();host.value='form';await host.updateComplete;const second=panels();if(!second[0].hidden||!second[0].inert||second[1].hidden||second[1].inert||second[0].contains(document.activeElement))throw Error('switched visibility/focus');host.value='list';await host.updateComplete;const third=panels();if(third[0].hidden||!third[1].hidden||host.querySelector('#list-control')!==listInput||listInput.value!=='preserved')throw Error('descendant identity');document.body.setAttribute('data-d2-dom','pass')}catch(error){document.body.setAttribute('data-d2-dom','fail');document.body.textContent=String(error)}})();`;
    await build({ stdin: { contents: entry, resolveDir: root, sourcefile: 'mlScenaryBrowserEntry.ts', loader: 'ts' }, outfile: path.join(folder, 'bundle.js'), bundle: true, platform: 'browser', format: 'iife', target: 'chrome120', tsconfigRaw: { compilerOptions: { experimentalDecorators: true, useDefineForClassFields: false } }, plugins: [{ name: 'mls-paths', setup(build) { build.onResolve({ filter: /^\/_\d+_\// }, args => { const match = /^\/_([0-9]+)_\/(.+)$/.exec(args.path)!; const raw = path.join(root, `mls-${match[1]}`, match[2]); const source = raw.endsWith('.js') && existsSync(raw.slice(0, -3) + '.ts') ? raw.slice(0, -3) + '.ts' : raw; return { path: source }; }); } }] });
    writeFileSync(path.join(folder, 'index.html'), '<!doctype html><html><body><script src="./bundle.js"></script></body></html>');
    const result = spawnSync(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--allow-file-access-from-files', '--dump-dom', `file://${path.join(folder, 'index.html')}`], { encoding: 'utf8', timeout: 15000 });
    assert.equal(result.status, 0, JSON.stringify({ signal: result.signal, error: result.error?.message, stderr: result.stderr }));
    assert.match(result.stdout, /data-d2-dom="pass"/u, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
