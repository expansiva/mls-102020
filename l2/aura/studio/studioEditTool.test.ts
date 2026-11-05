/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';
import { setAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { pendingFiles, recordSentContent } from '/_102020_/l2/aura/studio/studioAutoSave.js';
import { readFileSync } from 'node:fs';
import { rememberCollabMode } from '/_102033_/l2/cbe/studioDraft.js';
import { deliverSharedEdit, listedOwner, noteSharedFile, subscribeAutoSave, syncDraftAutoSave, type IAutoSavePanelState, type IOtherDraftTouch, type ISharedEditSession, sendAutoSaveBatch } from '/_102020_/l2/aura/studio/studioEditTool.js';

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

interface IChainWindow {
  addEventListener?: EventTarget['addEventListener'];
  removeEventListener?: EventTarget['removeEventListener'];
  dispatchEvent?: EventTarget['dispatchEvent'];
}

interface IChainListener {
  level: number;
  type: string;
  fn: (ev: mls.events.IEvent) => void;
}

function chainFile(shortName: string, status: string, inLocalStorage: boolean): mls.stor.IFileInfo {
  return {
    project: 7,
    level: 1,
    shortName,
    folder: 'mod',
    extension: '.ts',
    status,
    hasError: false,
    inLocalStorage,
  } as mls.stor.IFileInfo;
}

function chainKey(file: mls.stor.IFileInfo): string {
  return `${file.level}/${file.folder}/${file.shortName}${file.extension}`;
}

async function drain(): Promise<void> {
  for (let i = 0; i < 30; i++) await Promise.resolve();
}

function postChain(running: number): void {
  const target = globalThis as unknown as EventTarget;
  target.dispatchEvent(new CustomEvent('collabAgentChain', { detail: { running } }));
}

/**
 * Silent local file plus a deletion that only arrives by FileAction while the chain is open.
 * `duringChain` runs after the hold has already refused a send. The 1→0 flush is one batch.
 */
async function proveChainFlush(tag: string, duringChain: () => void): Promise<unknown> {
  const host = globalThis as unknown as IHost & {
    mls: IHost['mls'] & {
      sites?: { getMode?: () => string };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
    };
  };
  const win = globalThis as unknown as IChainWindow;
  const previous = {
    editor: host.mls.editor,
    common: host.mls.common,
    stor: host.mls.stor,
    sites: host.mls.sites,
    events: host.mls.events,
    fetch: globalThis.fetch,
    addEventListener: win.addEventListener,
    removeEventListener: win.removeEventListener,
    dispatchEvent: win.dispatchEvent,
  };
  const bus = new EventTarget();
  win.addEventListener = bus.addEventListener.bind(bus);
  win.removeEventListener = bus.removeEventListener.bind(bus);
  win.dispatchEvent = bus.dispatchEvent.bind(bus);
  const listeners: IChainListener[] = [];
  host.mls.events = {
    addListener(level, type, fn) { listeners.push({ level, type, fn }); },
    removeEventListener(levels, types, fn) {
      for (let i = listeners.length - 1; i >= 0; i--) {
        const item = listeners[i];
        if (!item || item.fn !== fn) continue;
        if (levels && !levels.includes(item.level)) continue;
        if (types && !types.includes(item.type)) continue;
        listeners.splice(i, 1);
      }
    },
  };
  const copied = chainFile(`copied-${tag}`, 'new', true);
  const removed = chainFile(`removed-${tag}`, 'deleted', false);
  const files: Record<string, mls.stor.IFileInfo> = {};
  const batches: mls.stor.IFileInfo[][] = [];
  host.mls.sites = { getMode: () => 'studio' };
  host.mls.editor = {
    getKeyModel: (_project: number, shortName: string) => shortName,
    models: {
      [copied.shortName]: { ts: { model: { getValue: () => `copied-body-${tag}` } } },
      [removed.shortName]: { ts: { model: { getValue: () => `removed-body-${tag}` } } },
    },
    deleteModels: () => undefined,
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files,
    getKeyToFile: (file: mls.stor.IFileInfo) => chainKey(file),
    getKeyToFiles: (_project: number, level: number, shortName: string, folder: string, extension: string) => (
      `${level}/${folder}/${shortName}${extension}`
    ),
    setContents: async (batch: readonly mls.stor.IFileInfo[]) => {
      batches.push([...batch]);
      return batch.map(() => ({ result: true }));
    },
    localStor: { setContent: async () => true },
    cache: { setContent: async () => true },
  } as IHost['mls']['stor'];
  globalThis.fetch = (async () => ({
    status: 200,
    json: async () => ({ status: 'listed', drafts: [] }),
  })) as typeof fetch;
  rememberCollabMode({ mode: 'studio', project: 7, draft: 'user-chain' });
  setAuraState('actualProject', 7);
  const seen: IAutoSavePanelState[] = [];
  const unsub = subscribeAutoSave((state) => { seen.push(state); });
  mock.timers.enable({ apis: ['setTimeout'] });
  let thrown: unknown;
  try {
    syncDraftAutoSave(true, true);
    postChain(1);
    assert.equal(seen.at(-1)?.agentWorking, true);
    assert.equal(copied.inLocalStorage, true);
    files[chainKey(copied)] = copied;
    files[chainKey(removed)] = removed;
    const desc = JSON.stringify({
      action: 'editorChanged',
      project: 7,
      level: 1,
      shortName: removed.shortName,
      folder: 'mod',
      extension: '.ts',
    });
    for (const item of listeners) {
      if (item.level === 1 && item.type === 'FileAction') item.fn({ level: 1, type: 'FileAction', desc });
    }
    await drain();
    assert.equal(seen.at(-1)?.agentWorking, true);
    assert.equal(seen.at(-1)?.pending, 2);
    mock.timers.tick(3000);
    await drain();
    assert.equal(batches.length, 0);
    try {
      duringChain();
    } catch (err) {
      thrown = err;
    }
    assert.equal(seen.at(-1)?.agentWorking, true);
    postChain(0);
    assert.equal(seen.at(-1)?.agentWorking, false);
    mock.timers.tick(3000);
    await drain();
    assert.equal(batches.length, 1);
    const names = batches[0]?.map((file) => file.shortName).sort();
    assert.deepEqual(names, [`copied-${tag}`, `removed-${tag}`]);
    assert.equal(batches[0]?.find((file) => file.shortName === removed.shortName)?.status, 'deleted');
    assert.equal(batches[0]?.find((file) => file.shortName === copied.shortName), copied);
  } finally {
    postChain(0);
    mock.timers.tick(3000);
    await drain();
    syncDraftAutoSave(false, false);
    unsub();
    rememberCollabMode({ mode: 'production' });
    mock.timers.reset();
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
    host.mls.sites = previous.sites;
    host.mls.events = previous.events;
    globalThis.fetch = previous.fetch;
    win.addEventListener = previous.addEventListener;
    win.removeEventListener = previous.removeEventListener;
    win.dispatchEvent = previous.dispatchEvent;
  }
  return thrown;
}

test('agent chain 0→1 sends nothing; 1→0 sends one batch, including after an exception in the chain', async () => {
  const quiet = await proveChainFlush('quiet', () => {});
  assert.equal(quiet, undefined);
  const thrown = await proveChainFlush('threw', () => {
    throw new Error('agent chain failed');
  });
  assert.ok(thrown instanceof Error);
  assert.equal(thrown.message, 'agent chain failed');
});

function applyFile(level: number, folder: string, shortName: string, extension: string): mls.stor.IFileInfo {
  return {
    project: 7,
    level,
    shortName,
    folder,
    extension,
    status: 'changed',
    hasError: false,
    inLocalStorage: true,
  } as mls.stor.IFileInfo;
}

function applyPath(file: mls.stor.IFileInfo): string {
  const folder = file.folder.length > 0 ? `${file.folder}/` : '';
  return `l${file.level}/${folder}${file.shortName}${file.extension}`;
}

test('Apply on tarefas holds that module; agendaClinica still sends', async () => {
  const host = globalThis as unknown as IHost & {
    mls: IHost['mls'] & {
      sites?: { getMode?: () => string };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
    };
  };
  const win = globalThis as unknown as IChainWindow;
  const previous = {
    editor: host.mls.editor,
    common: host.mls.common,
    stor: host.mls.stor,
    sites: host.mls.sites,
    events: host.mls.events,
    fetch: globalThis.fetch,
    addEventListener: win.addEventListener,
    removeEventListener: win.removeEventListener,
    dispatchEvent: win.dispatchEvent,
  };
  const bus = new EventTarget();
  win.addEventListener = bus.addEventListener.bind(bus);
  win.removeEventListener = bus.removeEventListener.bind(bus);
  win.dispatchEvent = bus.dispatchEvent.bind(bus);
  const tarefas = applyFile(1, 'tarefas', 'repo', '.ts');
  const agenda = applyFile(2, 'agendaClinica', 'page', '.ts');
  const files: Record<string, mls.stor.IFileInfo> = {
    [applyPath(tarefas)]: tarefas,
    [applyPath(agenda)]: agenda,
  };
  const batches: string[][] = [];
  host.mls.sites = { getMode: () => 'studio' };
  host.mls.events = {
    addListener() {},
    removeEventListener() {},
  };
  host.mls.editor = {
    getKeyModel: (_project: number, shortName: string) => shortName,
    models: {
      repo: { ts: { model: { getValue: () => 'tarefas-body' } } },
      page: { ts: { model: { getValue: () => 'agenda-body' } } },
    },
    deleteModels: () => undefined,
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files,
    getKeyToFile: (file: mls.stor.IFileInfo) => applyPath(file),
    getKeyToFiles: (_project: number, level: number, shortName: string, folder: string, extension: string) => (
      `${level}/${folder}/${shortName}${extension}`
    ),
    setContents: async (batch: readonly mls.stor.IFileInfo[]) => {
      batches.push(batch.map(applyPath).sort());
      return batch.map(() => ({ result: true }));
    },
    localStor: { setContent: async () => true },
    cache: { setContent: async () => true },
  } as IHost['mls']['stor'];
  globalThis.fetch = (async () => ({
    status: 200,
    json: async () => ({ status: 'listed', drafts: [] }),
  })) as typeof fetch;
  rememberCollabMode({ mode: 'studio', project: 7, draft: 'user-apply' });
  setAuraState('actualProject', 7);
  const postApply = (active: boolean): void => {
    (globalThis as unknown as EventTarget).dispatchEvent(new CustomEvent('nr-implementation-state', {
      detail: { project: 7, moduleName: 'tarefas', active },
    }));
  };
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    syncDraftAutoSave(true, true);
    postApply(true);
    mock.timers.tick(3000);
    await drain();
    assert.deepEqual(batches, [['l2/agendaClinica/page.ts']]);
    assert.equal(tarefas.inLocalStorage, true, applyPath(tarefas));
    postApply(false);
    await drain();
    mock.timers.tick(3000);
    await drain();
    assert.equal(batches.length, 2);
    assert.deepEqual(batches[1], ['l1/tarefas/repo.ts']);
  } finally {
    postApply(false);
    await drain();
    mock.timers.tick(3000);
    await drain();
    syncDraftAutoSave(false, false);
    rememberCollabMode({ mode: 'production' });
    mock.timers.reset();
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
    host.mls.sites = previous.sites;
    host.mls.events = previous.events;
    globalThis.fetch = previous.fetch;
    win.addEventListener = previous.addEventListener;
    win.removeEventListener = previous.removeEventListener;
    win.dispatchEvent = previous.dispatchEvent;
  }
});

test('l5/config.json edited outside Apply is sent', { concurrency: false }, async () => {
  await withLevel5(async ({ files, batches }) => {
    const config = applyFile(5, '', 'config', '.json');
    files[applyPath(config)] = config;
    syncDraftAutoSave(true, true);
    mock.timers.tick(3000);
    await drain();
    assert.deepEqual(batches, [['l5/config.json']]);
    assert.equal(config.inLocalStorage, false);
  });
});

test('a level-5 FileAction is sent when no Apply is active', { concurrency: false }, async () => {
  await withLevel5(async ({ files, batches, fire }) => {
    syncDraftAutoSave(true, true);
    mock.timers.tick(3000);
    await drain();
    assert.deepEqual(batches, []);
    const config = applyFile(5, '', 'config', '.json');
    files[applyPath(config)] = config;
    fire(config);
    await drain();
    mock.timers.tick(3000);
    await drain();
    assert.deepEqual(batches, [['l5/config.json']]);
  });
});

test('Apply holds every l5; active false sends them with the module in one batch', { concurrency: false }, async () => {
  await withLevel5(async ({ files, batches, postApply }) => {
    const tarefas = applyFile(1, 'tarefas', 'repoHold', '.ts');
    const agenda = applyFile(2, 'agendaClinica', 'pageHold', '.ts');
    const config = applyFile(5, '', 'configHold', '.json');
    const projectJson = applyFile(5, '', 'projectHold', '.json');
    files[applyPath(tarefas)] = tarefas;
    files[applyPath(agenda)] = agenda;
    files[applyPath(config)] = config;
    files[applyPath(projectJson)] = projectJson;
    syncDraftAutoSave(true, true);
    postApply(true);
    mock.timers.tick(3000);
    await drain();
    assert.deepEqual(batches, [['l2/agendaClinica/pageHold.ts']]);
    assert.equal(config.inLocalStorage, true);
    assert.equal(projectJson.inLocalStorage, true);
    assert.equal(tarefas.inLocalStorage, true);
    postApply(false);
    await drain();
    mock.timers.tick(3000);
    await drain();
    assert.equal(batches.length, 2);
    assert.deepEqual(batches[1], ['l1/tarefas/repoHold.ts', 'l5/configHold.json', 'l5/projectHold.json']);
  });
});

async function withLevel5(run: (host: {
  files: Record<string, mls.stor.IFileInfo>;
  batches: string[][];
  postApply: (active: boolean) => void;
  fire: (file: mls.stor.IFileInfo) => void;
}) => Promise<void>): Promise<void> {
  const host = globalThis as unknown as IHost & {
    mls: IHost['mls'] & {
      sites?: { getMode?: () => string };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
    };
  };
  const win = globalThis as unknown as IChainWindow;
  const previous = {
    editor: host.mls.editor,
    common: host.mls.common,
    stor: host.mls.stor,
    sites: host.mls.sites,
    events: host.mls.events,
    fetch: globalThis.fetch,
    addEventListener: win.addEventListener,
    removeEventListener: win.removeEventListener,
    dispatchEvent: win.dispatchEvent,
  };
  const bus = new EventTarget();
  win.addEventListener = bus.addEventListener.bind(bus);
  win.removeEventListener = bus.removeEventListener.bind(bus);
  win.dispatchEvent = bus.dispatchEvent.bind(bus);
  const listeners: IChainListener[] = [];
  const files: Record<string, mls.stor.IFileInfo> = {};
  const batches: string[][] = [];
  host.mls.sites = { getMode: () => 'studio' };
  host.mls.events = {
    addListener(level, type, fn) { listeners.push({ level, type, fn }); },
    removeEventListener() {},
  };
  host.mls.editor = {
    getKeyModel: (_project: number, shortName: string) => shortName,
    models: {
      repoHold: { ts: { model: { getValue: () => 'tarefas-hold' } } },
      pageHold: { ts: { model: { getValue: () => 'agenda-hold' } } },
    },
    deleteModels: () => undefined,
  };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files,
    getKeyToFile: (file: mls.stor.IFileInfo) => applyPath(file),
    getKeyToFiles: (_project: number, level: number, shortName: string, folder: string, extension: string) => (
      `${level}/${folder}/${shortName}${extension}`
    ),
    setContents: async (batch: readonly mls.stor.IFileInfo[]) => {
      batches.push(batch.map(applyPath).sort());
      return batch.map(() => ({ result: true }));
    },
    localStor: { setContent: async () => true },
    cache: { setContent: async () => true },
  } as IHost['mls']['stor'];
  globalThis.fetch = (async () => ({
    status: 200,
    json: async () => ({ status: 'listed', drafts: [] }),
  })) as typeof fetch;
  rememberCollabMode({ mode: 'studio', project: 7, draft: 'user-l5' });
  setAuraState('actualProject', 7);
  const postApply = (active: boolean): void => {
    (globalThis as unknown as EventTarget).dispatchEvent(new CustomEvent('nr-implementation-state', {
      detail: { project: 7, moduleName: 'tarefas', active },
    }));
  };
  const fire = (file: mls.stor.IFileInfo): void => {
    const desc = JSON.stringify({
      action: 'editorChanged',
      project: file.project,
      level: file.level,
      shortName: file.shortName,
      folder: file.folder,
      extension: file.extension,
    });
    for (const item of listeners) {
      if (item.level === file.level && item.type === 'FileAction') item.fn({ level: file.level, type: 'FileAction', desc });
    }
  };
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    await run({ files, batches, postApply, fire });
  } finally {
    postApply(false);
    await drain();
    mock.timers.tick(3000);
    await drain();
    syncDraftAutoSave(false, false);
    rememberCollabMode({ mode: 'production' });
    mock.timers.reset();
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
    host.mls.sites = previous.sites;
    host.mls.events = previous.events;
    globalThis.fetch = previous.fetch;
    win.addEventListener = previous.addEventListener;
    win.removeEventListener = previous.removeEventListener;
    win.dispatchEvent = previous.dispatchEvent;
  }
}

test('a file with no open model (an agent wrote it) is sent without a console.error', async () => {
  const host = globalThis as unknown as IHost;
  const previous = { editor: host.mls.editor, common: host.mls.common, stor: host.mls.stor };
  const sent: string[] = [];
  const errors: unknown[][] = [];
  const file = storFile('agentWrote');
  host.mls.editor = { getKeyModel: () => 'agentWrote', models: {} };
  host.mls.common = { crc: { crc32: (value: string) => value.length } };
  host.mls.stor = {
    files: previous.stor.files,
    setContents: async (files: unknown) => {
      sent.push(...(files as { shortName: string }[]).map((item) => item.shortName));
      return [{ result: true }];
    },
    localStor: { setContent: async () => true },
  };
  const original = console.error;
  console.error = (...args: unknown[]) => { errors.push(args); };
  try {
    await sendAutoSaveBatch([file], 7, () => {});
    assert.deepEqual(sent, ['agentWrote'], 'the file still goes to the draft');
    assert.deepEqual(errors, [], 'no console.error for a file without a model');
  } finally {
    console.error = original;
    host.mls.editor = previous.editor;
    host.mls.common = previous.common;
    host.mls.stor = previous.stor;
  }
});
