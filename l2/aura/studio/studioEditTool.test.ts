/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';
import { pendingFiles, recordSentContent } from '/_102020_/l2/aura/studio/studioAutoSave.js';
import { readFileSync } from 'node:fs';
import { deliverSharedEdit, listedOwner, noteSharedFile, type IOtherDraftTouch, type ISharedEditSession, sendAutoSaveBatch } from '/_102020_/l2/aura/studio/studioEditTool.js';

const TOOL = readFileSync(new URL('studioEditTool.ts', import.meta.url), 'utf8');

interface ILocalWrite {
  contentType?: 'string' | 'blob' | 'base64';
  content: string | null;
}

interface IHost {
  mls: {
    editor?: unknown;
    common?: unknown;
    stor: {
      files?: unknown;
      getKeyToFiles?: () => string;
      setContents?: (files: readonly mls.stor.IFileInfo[], comment: string) => Promise<{ result: boolean }[]>;
      localStor?: {
        setContent: (file: mls.stor.IFileInfo, value: ILocalWrite) => Promise<boolean>;
      };
      cache?: { setContent: (file: mls.stor.IFileInfo, content: null) => Promise<boolean> };
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
      clears.push('setContents');
      return [{ result: true }];
    },
    localStor: {
      setContent: async (_file, value) => {
        clears.push(value.content === null ? 'clear' : `store:${value.content}`);
        return true;
      },
    },
  };
  try {
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.deepEqual(clears, ['store:sent-body', 'setContents']);
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
    setContents: async () => {
      clears.push('setContents');
      return [{ result: true }];
    },
    localStor: {
      setContent: async (_file, value) => {
        clears.push(value.content === null ? 'clear' : `store:${value.content}`);
        return true;
      },
    },
  };
  try {
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.deepEqual(clears, ['store:steady-body', 'setContents', 'clear']);
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

test('nochange with a different send CRC stores the published text before setContents', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  const published = 'published';
  const records = new Map<mls.stor.IFileInfo, string>();
  const trace: string[] = [];
  const again: string[] = [];
  const file = storFile('rollback');
  file.status = 'nochange';
  const readObject = async (item: mls.stor.IFileInfo): Promise<string> => {
    const body = records.get(item);
    if (body === undefined) {
      throw new Error(`Object not found in IndexedDB, key: File_${item.project}_${item.level}_${item.shortName}`);
    }
    return body;
  };
  host.mls.editor = {
    getKeyModel: () => 'rollback',
    models: { rollback: { ts: { model: { getValue: () => published } } } },
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: previous.stor.files,
    setContents: async (files) => {
      const body = await readObject(files[0]);
      trace.push(`setContents:${body}`);
      assert.equal(files[0].inLocalStorage, false);
      return [{ result: true }];
    },
    localStor: {
      setContent: async (item, value) => {
        if (value.content === null) {
          records.delete(item);
          trace.push('clear');
          return true;
        }
        assert.equal(value.contentType, 'string');
        records.set(item, value.content);
        trace.push(`store:${value.content}`);
        return true;
      },
    },
  };
  try {
    recordSentContent(file, 'edited-body');
    assert.deepEqual(pendingFiles([file], 7), [file]);
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.deepEqual(trace, [`store:${published}`, `setContents:${published}`, 'clear']);
    assert.equal(file.status, 'nochange');
    assert.equal(file.inLocalStorage, false);
    assert.deepEqual(again, []);
    assert.deepEqual(pendingFiles([file], 7), []);
  } finally {
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});

test('a local store error leaves the nochange file pending and does not send it', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  const logged: unknown[][] = [];
  const previousError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  const again: string[] = [];
  const file = storFile('rollback-fail');
  file.status = 'nochange';
  let sent = false;
  host.mls.editor = {
    getKeyModel: () => 'rollback-fail',
    models: { 'rollback-fail': { ts: { model: { getValue: () => 'published' } } } },
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: previous.stor.files,
    setContents: async () => {
      sent = true;
      return [{ result: true }];
    },
    localStor: {
      setContent: async () => {
        throw new Error('Object not found in IndexedDB');
      },
    },
  };
  try {
    recordSentContent(file, 'edited-body');
    await sendAutoSaveBatch([file], 7, (item) => { again.push(item.shortName); });
    assert.equal(sent, false);
    assert.equal(file.status, 'nochange');
    assert.deepEqual(again, ['rollback-fail']);
    assert.deepEqual(pendingFiles([file], 7), [file]);
    assert.ok(logged.some((args) => args[1] === 'rollback-fail'));
  } finally {
    console.error = previousError;
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});

test('a deleted file is sent without writing the captured text', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  const trace: string[] = [];
  const file = storFile('gone');
  file.status = 'deleted';
  host.mls.editor = {
    getKeyModel: () => 'gone',
    models: { gone: { ts: { model: { getValue: () => 'gone-text' } } } },
    deleteModels: () => { trace.push('deleteModels'); },
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: { gone: file },
    getKeyToFiles: () => 'gone',
    setContents: async () => {
      trace.push('setContents');
      return [{ result: true }];
    },
    localStor: {
      setContent: async (_file, value) => {
        trace.push(value.content === null ? 'clear' : `store:${value.content}`);
        return true;
      },
    },
    cache: { setContent: async () => { trace.push('cache'); return true; } },
  };
  try {
    await sendAutoSaveBatch([file], 7, () => {});
    assert.deepEqual(trace, ['setContents', 'clear', 'cache', 'deleteModels']);
    assert.equal(file.status, 'deleted');
  } finally {
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});

test('a file in another draft warns once with the name and the edit is still sent', () => {
  const warned = new Set<string>();
  const others: IOtherDraftTouch[] = [{ owner: 'Ana Silva', files: ['l1/usecases/shared.ts'] }];
  const notices: string[] = [];
  const sent: string[] = [];
  const shared = storFile('shared');
  const free = storFile('free');
  const show = (text: string) => { notices.push(text); };
  const send = (file: mls.stor.IFileInfo) => { sent.push(file.shortName); };
  const doc = (globalThis as { document?: { documentElement?: { lang: string } } }).document;
  const previousLang = doc?.documentElement?.lang;
  if (doc?.documentElement) doc.documentElement.lang = 'en';
  try {
    noteSharedFile(shared, others, warned, show, send);
    noteSharedFile(shared, others, warned, show, send);
    noteSharedFile(free, others, warned, show, send);
    assert.deepEqual(notices, ['Ana Silva is also changing this file']);
    assert.deepEqual(sent, ['shared', 'shared', 'free']);
    assert.equal(listedOwner({ owner: 'Ana Silva', branch: 'user/abcdef0123456789' }), 'Ana Silva');
    assert.equal(listedOwner({ branch: 'user/abcdef0123456789' }), null);
    assert.equal(listedOwner({ owner: '  ', branch: 'user/abcdef0123456789' }), null);
  } finally {
    if (doc?.documentElement && previousLang !== undefined) doc.documentElement.lang = previousLang;
  }
});

test('the other-draft list is read on enter and on open; the edit goes through deliverSharedEdit', () => {
  const start = TOOL.slice(TOOL.indexOf('public start(): void'), TOOL.indexOf('public stop(): void'));
  assert.match(start, /refreshOthers\(\)/);
  const onFile = TOOL.slice(TOOL.indexOf('private readonly onFileAction'), TOOL.indexOf('private readonly onStyleChanged'));
  const openAt = onFile.indexOf("action === 'open'");
  const editAt = onFile.indexOf("action !== 'editorChanged'");
  assert.ok(openAt !== -1 && editAt > openAt, 'open is handled before the edit');
  assert.match(onFile.slice(openAt, editAt), /refreshOthers\(\)/);
  const deliverAt = TOOL.indexOf('private deliver(');
  const deliver = TOOL.slice(deliverAt, TOOL.indexOf('private note(', deliverAt));
  assert.match(deliver, /deliverSharedEdit\(/);
  const noteAt = TOOL.indexOf('export function noteSharedFile');
  const noteEnd = TOOL.indexOf('export interface ISharedEditSession', noteAt);
  const note = TOOL.slice(noteAt, noteEnd);
  assert.doesNotMatch(note, /loadPanel|fetchImpl/);
});

test('the first edit re-reads an empty open list once and warns; the second edit does not query', async () => {
  const file = storFile('shared');
  const session: ISharedEditSession = { refreshed: new Set(), others: [], warned: new Set() };
  let queries = 0;
  const notices: string[] = [];
  const sent: string[] = [];
  const doc = (globalThis as { document?: { documentElement?: { lang: string } } }).document;
  const previousLang = doc?.documentElement?.lang;
  if (doc?.documentElement) doc.documentElement.lang = 'en';
  const refresh = async (): Promise<readonly IOtherDraftTouch[] | null> => {
    queries += 1;
    return [{ owner: 'Ana Silva', files: ['l1/usecases/shared.ts'] }];
  };
  const show = (text: string) => { notices.push(text); };
  const send = (item: mls.stor.IFileInfo) => { sent.push(item.shortName); };
  try {
    await deliverSharedEdit(file, session, refresh, show, send);
    await deliverSharedEdit(file, session, refresh, show, send);
    assert.equal(queries, 1);
    assert.deepEqual(notices, ['Ana Silva is also changing this file']);
    assert.deepEqual(sent, ['shared', 'shared']);
  } finally {
    if (doc?.documentElement && previousLang !== undefined) doc.documentElement.lang = previousLang;
  }
});

test('a failed list read on the first edit logs, sends the edit, and does not warn or query again', async () => {
  const file = storFile('shared');
  const session: ISharedEditSession = { refreshed: new Set(), others: [], warned: new Set() };
  let queries = 0;
  const notices: string[] = [];
  const sent: string[] = [];
  const errors: unknown[][] = [];
  const previous = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    await deliverSharedEdit(
      file,
      session,
      async () => {
        queries += 1;
        throw new Error('list down');
      },
      (text) => { notices.push(text); },
      (item) => { sent.push(item.shortName); },
    );
    await deliverSharedEdit(
      file,
      session,
      async () => {
        queries += 1;
        return [{ owner: 'Ana Silva', files: ['l1/usecases/shared.ts'] }];
      },
      (text) => { notices.push(text); },
      (item) => { sent.push(item.shortName); },
    );
  } finally {
    console.error = previous;
  }
  assert.equal(queries, 1);
  assert.deepEqual(notices, []);
  assert.deepEqual(sent, ['shared', 'shared']);
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]?.[0]), /listDrafts for shared files failed/);
});
