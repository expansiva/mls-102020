/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';
import { installStudioModuleLock } from '/_102020_/l2/aura/studio/studioModuleLock.js';
import { rememberCollabMode, modeState } from '/_102033_/l2/cbe/studioDraft.js';
import { AuraInitState, getAuraState, setAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import {
  deliverSharedEdit,
  listedOwner,
  noteSharedFile,
  subscribeDraftFiles,
  syncSharedEditNotice,
  type IOtherDraftTouch,
  type ISharedEditSession,
} from '/_102020_/l2/aura/studio/studioEditTool.js';

const TOOL = readFileSync(new URL('studioEditTool.ts', import.meta.url), 'utf8');

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

interface IFileListener {
  level: number;
  type: string;
  fn: (ev: mls.events.IEvent) => void;
}

interface IEventHost {
  mls: {
    events?: {
      addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
      removeEventListener: (
        levels: number[] | undefined,
        types: string[] | undefined,
        fn: (ev: mls.events.IEvent) => void,
      ) => void;
    };
    stor?: { setContents?: (...args: unknown[]) => Promise<unknown> };
  };
  window?: EventTarget;
}

test('FileAction, the end of an agent chain and the end of Apply do not call setContents', () => {
  assert.doesNotMatch(TOOL, /setContents|saveToDraft|sendAutoSaveBatch|DraftAutoSave|syncDraftAutoSave/);
  const host = globalThis as unknown as IEventHost;
  const previous = { events: host.mls.events, stor: host.mls.stor, window: host.window };
  const listeners: IFileListener[] = [];
  const sends: unknown[][] = [];
  host.mls.events = {
    addListener(level, type, fn) { listeners.push({ level, type, fn }); },
    removeEventListener(levels, types, fn) {
      for (let index = listeners.length - 1; index >= 0; index -= 1) {
        const item = listeners[index];
        if (!item || item.fn !== fn) continue;
        if (levels && !levels.includes(item.level)) continue;
        if (types && !types.includes(item.type)) continue;
        listeners.splice(index, 1);
      }
    },
  };
  const stor = previous.stor ?? {};
  host.mls.stor = {
    ...stor,
    setContents: async (...args: unknown[]) => {
      sends.push(args);
      return [];
    },
  };
  const windowEvents = new EventTarget();
  host.window = windowEvents;
  const recounts: number[] = [];
  let unsub: (() => void) | undefined;
  try {
    unsub = subscribeDraftFiles(() => { recounts.push(recounts.length + 1); });
    assert.equal(recounts.length, 1);
    const desc = JSON.stringify({
      action: 'editorChanged',
      project: 7,
      level: 1,
      shortName: 'order',
      folder: 'usecases',
      extension: '.ts',
    });
    for (const item of [...listeners]) {
      if (item.type === 'FileAction') item.fn({ level: item.level, type: 'FileAction', desc });
    }
    assert.equal(recounts.length, 5);
    installStudioModuleLock();
    windowEvents.dispatchEvent(new CustomEvent('collabAgentChain', { detail: { running: 0 } }));
    windowEvents.dispatchEvent(new CustomEvent('nr-implementation-state', {
      detail: { project: 7, moduleName: 'tarefas', active: false },
    }));
    assert.equal(recounts.length, 5);
    assert.deepEqual(sends, []);
  } finally {
    unsub?.();
    host.mls.events = previous.events;
    host.mls.stor = previous.stor;
    host.window = previous.window;
  }
});

test('an edit of a file another draft also touches warns once and does not call setContents', async () => {
  assert.match(TOOL, /syncSharedEditNotice\(true, studioDraftOn\(\)\)/);
  assert.match(TOOL, /syncSharedEditNotice\(false, false\)/);
  const sendFn = TOOL.slice(TOOL.indexOf('function emptySend'), TOOL.indexOf('function showSharedNotice'));
  assert.match(sendFn, /\{}/);
  assert.doesNotMatch(sendFn, /setContents|saveToDraft|loadPanel/);
  const host = globalThis as unknown as IEventHost;
  const previous = {
    events: host.mls.events,
    stor: host.mls.stor,
    fetch: globalThis.fetch,
    warn: console.warn,
    mode: modeState(),
    project: getAuraState()?.actualProject ?? null,
  };
  const listeners: IFileListener[] = [];
  const sends: unknown[][] = [];
  const warnings: unknown[][] = [];
  let fetches = 0;
  host.mls.events = {
    addListener(level, type, fn) { listeners.push({ level, type, fn }); },
    removeEventListener(levels, types, fn) {
      for (let index = listeners.length - 1; index >= 0; index -= 1) {
        const item = listeners[index];
        if (!item || item.fn !== fn) continue;
        if (levels && !levels.includes(item.level)) continue;
        if (types && !types.includes(item.type)) continue;
        listeners.splice(index, 1);
      }
    },
  };
  const file = storFile('shared');
  host.mls.stor = {
    files: { shared: file },
    getKeyToFile: () => 'shared',
    setContents: async (...args: unknown[]) => {
      sends.push(args);
      return [];
    },
  } as unknown as typeof host.mls.stor;
  globalThis.fetch = (async (_input: unknown, init?: { body?: string }) => {
    fetches += 1;
    const body = JSON.parse(init?.body ?? '{}') as { action?: string; project?: number };
    assert.equal(body.action, 'listDrafts');
    assert.equal(body.project, 7);
    return {
      status: 200,
      json: async () => ({
        status: 'listed',
        drafts: [{ branch: 'user/ana@example.com', owner: 'Ana Silva', files: ['l1/usecases/shared.ts'] }],
      }),
    };
  }) as typeof fetch;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  const doc = (globalThis as { document?: { documentElement?: { lang: string } } }).document;
  const previousLang = doc?.documentElement?.lang;
  if (doc?.documentElement) doc.documentElement.lang = 'en';
  AuraInitState();
  setAuraState('actualProject', 7);
  rememberCollabMode({ mode: 'studio', draft: 'team-mine' });
  const desc = JSON.stringify({
    action: 'editorChanged',
    project: 7,
    level: 1,
    position: 'right',
    shortName: 'shared',
    folder: 'usecases',
    extension: '.ts',
  });
  const fire = (): void => {
    const level1 = listeners.filter((item) => item.type === 'FileAction' && item.level === 1);
    assert.equal(level1.length, 1);
    level1[0]?.fn({ level: 1, type: 'FileAction', desc });
  };
  try {
    syncSharedEditNotice(true, false);
    syncSharedEditNotice(false, true);
    assert.equal(listeners.length, 0);
    syncSharedEditNotice(true, true);
    assert.deepEqual(listeners.map((item) => item.level), [1, 2, 3, 5]);
    assert.deepEqual(listeners.map((item) => item.type), ['FileAction', 'FileAction', 'FileAction', 'FileAction']);
    fire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fire();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(fetches, 1);
    assert.deepEqual(warnings, [['[studio]', 'Ana Silva is also changing this file']]);
    assert.deepEqual(sends, []);
  } finally {
    syncSharedEditNotice(false, false);
    host.mls.events = previous.events;
    host.mls.stor = previous.stor;
    globalThis.fetch = previous.fetch;
    console.warn = previous.warn;
    rememberCollabMode(previous.mode);
    setAuraState('actualProject', previous.project);
    if (doc?.documentElement && previousLang !== undefined) doc.documentElement.lang = previousLang;
  }
});
