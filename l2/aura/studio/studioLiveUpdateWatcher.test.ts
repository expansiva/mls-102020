/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateWatcher.test.ts" enhancement="_blank" />
// The file-editor watcher used to be the only path from a compile to the running preview.
// That swap is off until Save. Level 3 still reports through the in-place editor.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const WATCHER = readFileSync(new URL('studioLiveUpdateWatcher.ts', import.meta.url), 'utf8');
const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');

/** Code lines only: a mention inside a comment is documentation, not a call. */
function codeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));
}

test('the watcher does not call applyLiveUpdate', () => {
  const code = codeLines(WATCHER);
  assert.equal(code.some((line) => line.includes('applyLiveUpdate(')), false);
});

test('a file change does not swap the preview', async () => {
  (globalThis as { window?: unknown }).window = {
    localStorage: { getItem: () => null, setItem: () => undefined },
  };
  (globalThis as { mls?: unknown }).mls = {
    events: { addListener: () => undefined, removeEventListener: () => undefined },
  };
  const mod = await import('/_102020_/l2/aura/studio/studioLiveUpdateWatcher.js');
  const watcher = new mod.StudioLiveUpdateWatcher();
  watcher.start({} as HTMLElement);
  await watcher.applyChanged({ project: 102047, shortName: 'page11', folder: 'app/web/desktop/page11' });
  await mod.applyChangedOnMounted({ project: 102047, shortName: 'page11', folder: 'app/web/desktop/page11' });
  assert.equal(codeLines(WATCHER).some((line) => line.includes('applyLiveUpdate(')), false);
});

test('the editor still shows the message on its strip — level 3 keeps its own live update', () => {
  assert.equal(
    codeLines(EDITOR).some((line) => line.includes('compileAndApplyLiveUpdate(')),
    true,
    'studioEditor must keep compiling onto the page it is editing',
  );
  assert.equal(
    codeLines(EDITOR).some((line) => line.includes('live.message')),
    true,
    'studioEditor must keep putting the live-update message on the status strip',
  );
});
