/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';
import { pendingFiles } from '/_102020_/l2/aura/studio/studioAutoSave.js';
import { sendAutoSaveBatch } from '/_102020_/l2/aura/studio/studioEditTool.js';

interface IHost {
  mls: {
    editor?: unknown;
    common?: unknown;
    stor: {
      files?: unknown;
      setContents?: (files: readonly mls.stor.IFileInfo[], comment: string) => Promise<{ result: boolean }[]>;
      localStor?: { setContent: (file: mls.stor.IFileInfo, value: { content: null }) => void };
    };
  };
}

function storFile(shortName: string): mls.stor.IFileInfo {
  return {
    project: 7,
    level: 1,
    shortName,
    folder: 'usecases',
    extension: '.ts',
    status: 'changed',
    hasError: false,
    inLocalStorage: true,
  } as mls.stor.IFileInfo;
}

test('text that changes during the send keeps its local copy and stays pending', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  let text = 'sent-body';
  const clears: string[] = [];
  const again: string[] = [];
  const file = storFile('during');
  host.mls.editor = {
    getKeyModel: () => 'during',
    models: { during: { ts: { model: { getValue: () => text } } } },
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: previous.stor.files,
    setContents: async () => {
      text = 'typed-during';
      return [{ result: true }];
    },
    localStor: { setContent: () => { clears.push('cleared'); } },
  };
  try {
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.deepEqual(clears, []);
    assert.equal(file.inLocalStorage, true);
    assert.equal(file.status, 'changed');
    assert.deepEqual(again, ['during']);
    assert.deepEqual(pendingFiles([file], 7), [file]);
    text = 'sent-body';
    assert.deepEqual(pendingFiles([file], 7), []);
  } finally {
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});

test('a send that does not change the text clears the local copy', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  const text = 'steady-body';
  const clears: string[] = [];
  const again: string[] = [];
  const file = storFile('steady');
  host.mls.editor = {
    getKeyModel: () => 'steady',
    models: { steady: { ts: { model: { getValue: () => text } } } },
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: previous.stor.files,
    setContents: async () => [{ result: true }],
    localStor: { setContent: () => { clears.push('cleared'); } },
  };
  try {
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.deepEqual(clears, ['cleared']);
    assert.equal(file.inLocalStorage, false);
    assert.equal(file.status, 'changed');
    assert.deepEqual(again, []);
    assert.deepEqual(pendingFiles([file], 7), []);
  } finally {
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});
