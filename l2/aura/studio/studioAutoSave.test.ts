/// <mls fileReference="_102020_/l2/aura/studio/studioAutoSave.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import {
  autosaveMessage,
  buildAutoSaveStorFile,
  createAutoSaver,
  pendingFiles,
  type IAutoSaveStorFile,
} from '/_102020_/l2/aura/studio/studioAutoSave.js';

function file(over: Partial<IAutoSaveStorFile> = {}): IAutoSaveStorFile {
  return buildAutoSaveStorFile({
    project: 7,
    level: 1,
    shortName: 'order',
    folder: 'usecases',
    extension: '.ts',
    status: 'changed',
    hasError: false,
    ...over,
  });
}

test('pending files are dirty l1–l3 of this project, including defs and tests', () => {
  const keepTs = file();
  const keepDefs = file({ shortName: 'order', extension: '.defs.ts', folder: '' });
  const keepTest = file({ shortName: 'order', extension: '.test.ts', level: 2, folder: 'aura' });
  const keepLess = file({ shortName: 'order', extension: '.less', level: 3, status: 'new' });
  const keepDeleted = file({ shortName: 'gone', status: 'deleted', folder: '' });
  const error = file({ shortName: 'broken', hasError: true });
  const clean = file({ shortName: 'clean', status: 'nochange' });
  const otherProject = file({ shortName: 'other', project: 8 });
  const declaration = file({ shortName: 'types', extension: '.d.ts' });
  const declarationViaShortName = file({ shortName: 'types.d', extension: '.ts' });
  const level4 = file({ shortName: 'page', level: 4, folder: 'app' });

  const pending = pendingFiles([
    keepTs, error, clean, otherProject, declaration, keepDefs, keepTest, keepLess,
    declarationViaShortName, level4, keepDeleted,
  ], 7);

  assert.deepEqual(pending, [keepTs, keepDefs, keepTest, keepLess, keepDeleted]);
});

test('the auto-save comment names every file', () => {
  const files = [
    file({ shortName: 'order' }),
    file({ level: 2, folder: 'aura', shortName: 'panel', extension: '.ts' }),
  ];
  assert.equal(
    autosaveMessage(files),
    'autosave: 2 arquivo(s): l1/usecases/order.ts, l2/aura/panel.ts',
  );
});

test('five notifies in a burst become one send, 3s after the last one', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const sent: number[] = [];
    const saver = createAutoSaver({
      debounceMs: 3000,
      now: () => 0,
      hasDraft: () => true,
      onError: () => {},
      send: async (batch) => {
        sent.push(batch.length);
      },
    });
    const files = [1, 2, 3, 4, 5].map((n) => file({ shortName: `f${n}`, folder: '' }));
    for (const item of files) saver.notify(item);
    mock.timers.tick(2999);
    assert.deepEqual(sent, []);
    saver.notify(files[0]);
    mock.timers.tick(2999);
    assert.deepEqual(sent, []);
    mock.timers.tick(1);
    assert.deepEqual(sent, [5]);
  } finally {
    mock.timers.reset();
  }
});

test('a failed send keeps the files pending and calls onError', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const reasons: unknown[] = [];
    const batches: IAutoSaveStorFile[][] = [];
    let fail = true;
    const saver = createAutoSaver({
      debounceMs: 3000,
      now: () => 0,
      hasDraft: () => true,
      onError: (reason) => {
        reasons.push(reason);
      },
      send: async (batch) => {
        if (fail) throw new Error('save refused');
        batches.push([...batch]);
      },
    });
    const pending = file({ shortName: 'order' });
    saver.notify(pending);
    await saver.flush();
    assert.equal(reasons.length, 1);
    assert.equal((reasons[0] as Error).message, 'save refused');
    assert.deepEqual(batches, []);
    fail = false;
    await saver.flush();
    assert.deepEqual(batches, [[pending]]);
  } finally {
    mock.timers.reset();
  }
});

test('without a draft, notify sends nothing', async () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    let sends = 0;
    const saver = createAutoSaver({
      debounceMs: 3000,
      now: () => 0,
      hasDraft: () => false,
      onError: () => {},
      send: async () => {
        sends += 1;
      },
    });
    for (let n = 0; n < 5; n++) saver.notify(file({ shortName: `f${n}` }));
    mock.timers.tick(3000);
    await saver.flush();
    assert.equal(sends, 0);
  } finally {
    mock.timers.reset();
  }
});
