/// <mls fileReference="_102020_/l2/aura/studio/studioEditTool.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';
import { installStudioModuleLock } from '/_102020_/l2/aura/studio/studioModuleLock.js';
import { rememberCollabMode, modeState } from '/_102033_/l2/cbe/studioDraft.js';
import { publishEditHost, type IStudioEditHost } from '/_102033_/l2/cbe/studioEditSlot.js';
import { AuraInitState, getAuraState, setAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { COLLAB_DRAFT_SAVED } from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import {
  COLLAB_DRAFT_PENDING,
  COLLAB_DRAFT_SAVE_REQUEST,
  COLLAB_DRAFT_SAVE_RESULT,
  deliverSharedEdit,
  listedOwner,
  noteSharedFile,
  subscribeDraftFiles,
  syncSharedEditNotice,
  type ICollabDraftPendingDetail,
  type ICollabDraftSaveResultDetail,
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
  assert.doesNotMatch(TOOL, /sendAutoSaveBatch|DraftAutoSave|syncDraftAutoSave/);
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

test('editing the front publishes the unsaved count, Save with the panel closed clears it, and the preview is not swapped', async () => {
  const watcherBody = TOOL.slice(TOOL.indexOf('async function syncWatcher'), TOOL.indexOf('async function syncEditor'));
  assert.doesNotMatch(watcherBody, /watcher\.start\(/);
  assert.doesNotMatch(watcherBody, /applyLiveUpdate\(/);
  assert.doesNotMatch(TOOL, /applyChangedOnMounted/);
  const watcher = readFileSync(new URL('studioLiveUpdateWatcher.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(watcher, /applyLiveUpdate\(/);

  const host = globalThis as unknown as {
    mls: {
      actualProject?: number;
      stor?: {
        files?: Record<string, unknown>;
        others?: { getDefaultDriver?: (project: number) => Promise<{ driverVersion: string }> };
        setContents?: (files: unknown[], comment: string) => Promise<{ result: boolean }[]>;
      };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
      sites?: { getMode?: () => string };
      common?: { crc?: { crc32: (value: string) => number } };
      editor?: unknown;
    };
    window?: EventTarget;
    prompt?: (message?: string) => string | null;
  };
  const previous = {
    actualProject: host.mls.actualProject,
    stor: host.mls.stor,
    events: host.mls.events,
    sites: host.mls.sites,
    common: host.mls.common,
    editor: host.mls.editor,
    window: host.window,
    prompt: host.prompt,
  };
  const listeners: IFileListener[] = [];
  const counts: number[] = [];
  const written: string[] = [];
  const windowEvents = new EventTarget();
  windowEvents.addEventListener(COLLAB_DRAFT_PENDING, (ev) => {
    const detail = (ev as CustomEvent<ICollabDraftPendingDetail>).detail;
    counts.push(detail.count);
    assert.equal(detail.project, 102047);
  });
  const page = {
    project: 102047,
    level: 2,
    folder: 'aura',
    shortName: 'page',
    extension: '.ts',
    status: 'changed',
    hasError: false,
    inLocalStorage: true,
    getContent: async () => 'edited-body',
  };
  const files: Record<string, unknown> = {};
  host.mls.actualProject = 102047;
  host.mls.stor = {
    files,
    others: { getDefaultDriver: async () => ({ driverVersion: '1.0.0-vm' }) },
    setContents: async (_clean, comment) => {
      written.push(comment);
      return [{ result: true }];
    },
  };
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
  host.mls.sites = { getMode: () => 'production' };
  host.mls.common = {
    crc: {
      crc32: (value: string) => {
        let hash = 0;
        for (const ch of value) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
        return hash;
      },
    },
  };
  host.mls.editor = { getKeyModel: () => 'none', models: {} };
  host.window = windowEvents;
  host.prompt = () => 'ship it';
  const studioHost: IStudioEditHost = {
    host: { children: [] } as unknown as HTMLElement,
    chromeHost: { children: [] } as unknown as HTMLElement,
    studioMode: true,
    editLevel: false,
    level: 2,
    panelVisible: false,
  };
  try {
    publishEditHost(studioHost);
    assert.deepEqual(counts, [0]);
    files.page = page;
    const fileEvent = listeners.find((item) => item.type === 'FileAction');
    assert.ok(fileEvent, 'studio mode listens for a file edit');
    fileEvent.fn({ level: fileEvent.level, type: 'FileAction', desc: '{}' });
    assert.deepEqual(counts, [0, 1]);
    windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVE_REQUEST, { detail: { project: 102047 } }));
    for (let i = 0; i < 30 && written.length === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    assert.deepEqual(written, ['ship it']);
    assert.deepEqual(counts, [0, 1, 0]);
  } finally {
    publishEditHost(null);
    host.mls.actualProject = previous.actualProject;
    host.mls.stor = previous.stor;
    host.mls.events = previous.events;
    host.mls.sites = previous.sites;
    host.mls.common = previous.common;
    host.mls.editor = previous.editor;
    host.window = previous.window;
    host.prompt = previous.prompt;
  }
});

test('a compile error is blocked on the pending event, and Save with the panel closed reports it', async () => {
  const host = globalThis as unknown as {
    mls: {
      actualProject?: number;
      stor?: {
        files?: Record<string, unknown>;
        others?: { getDefaultDriver?: (project: number) => Promise<{ driverVersion: string }> };
        setContents?: (files: unknown[], comment: string) => Promise<{ result: boolean }[]>;
      };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
      sites?: { getMode?: () => string };
      common?: { crc?: { crc32: (value: string) => number } };
      editor?: unknown;
    };
    window?: EventTarget;
    prompt?: (message?: string) => string | null;
  };
  const previous = {
    actualProject: host.mls.actualProject,
    stor: host.mls.stor,
    events: host.mls.events,
    sites: host.mls.sites,
    common: host.mls.common,
    editor: host.mls.editor,
    window: host.window,
    prompt: host.prompt,
  };
  const listeners: IFileListener[] = [];
  const pending: ICollabDraftPendingDetail[] = [];
  const results: ICollabDraftSaveResultDetail[] = [];
  const windowEvents = new EventTarget();
  windowEvents.addEventListener(COLLAB_DRAFT_PENDING, (ev) => {
    pending.push((ev as CustomEvent<ICollabDraftPendingDetail>).detail);
  });
  windowEvents.addEventListener(COLLAB_DRAFT_SAVE_RESULT, (ev) => {
    results.push((ev as CustomEvent<ICollabDraftSaveResultDetail>).detail);
  });
  const file = (shortName: string, hasError: boolean): Record<string, unknown> => ({
    project: 102047,
    level: 2,
    folder: 'aura',
    shortName,
    extension: '.ts',
    status: 'changed',
    hasError,
    inLocalStorage: true,
    getContent: async () => 'body',
  });
  const valid = file('keep', false);
  const broken = file('broken', true);
  const files: Record<string, unknown> = {};
  host.mls.actualProject = 102047;
  host.mls.stor = {
    files,
    others: { getDefaultDriver: async () => ({ driverVersion: '1.0.0-vm' }) },
    setContents: async () => [{ result: true }],
  };
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
  host.mls.sites = { getMode: () => 'production' };
  host.mls.common = {
    crc: {
      crc32: (value: string) => {
        let hash = 0;
        for (const ch of value) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
        return hash;
      },
    },
  };
  host.mls.editor = { getKeyModel: () => 'none', models: {} };
  host.window = windowEvents;
  host.prompt = () => 'ship it';
  const doc = (globalThis as { document?: { documentElement?: { lang: string } } }).document;
  const previousLang = doc?.documentElement?.lang;
  if (doc?.documentElement) doc.documentElement.lang = 'en';
  const studioHost: IStudioEditHost = {
    host: { children: [] } as unknown as HTMLElement,
    chromeHost: { children: [] } as unknown as HTMLElement,
    studioMode: true,
    editLevel: false,
    level: 2,
    panelVisible: false,
  };
  const fire = (): void => {
    const fileEvent = listeners.find((item) => item.type === 'FileAction');
    assert.ok(fileEvent, 'studio mode listens for a file edit');
    fileEvent.fn({ level: fileEvent.level, type: 'FileAction', desc: '{}' });
  };
  try {
    publishEditHost(studioHost);
    files.page = valid;
    files.broken = broken;
    fire();
    const withError = pending[pending.length - 1];
    assert.equal(withError?.project, 102047);
    assert.equal(withError?.count, 2);
    assert.equal(withError?.blocked, 1);
    broken.hasError = false;
    fire();
    const fixed = pending[pending.length - 1];
    assert.equal(fixed?.count, 2);
    assert.equal(fixed?.blocked, 0);
    broken.hasError = true;
    fire();
    assert.equal(pending[pending.length - 1]?.blocked, 1);
    windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVE_REQUEST, { detail: { project: 102047 } }));
    for (let i = 0; i < 30 && results.length === 0; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    assert.equal(results.length, 1);
    assert.equal(results[0]?.project, 102047);
    assert.equal(results[0]?.blocked, 1);
    assert.equal(results[0]?.saved, true);
    assert.equal(results[0]?.message, '1 file(s) with errors were not saved. Fix them.');
  } finally {
    publishEditHost(null);
    host.mls.actualProject = previous.actualProject;
    host.mls.stor = previous.stor;
    host.mls.events = previous.events;
    host.mls.sites = previous.sites;
    host.mls.common = previous.common;
    host.mls.editor = previous.editor;
    host.window = previous.window;
    host.prompt = previous.prompt;
    if (doc?.documentElement && previousLang !== undefined) doc.documentElement.lang = previousLang;
  }
});

test('the unsaved count refreshes on a 1s timer without a file event, one timer only, cleared on stop', () => {
  const host = globalThis as unknown as {
    mls: {
      actualProject?: number;
      stor?: { files?: Record<string, unknown> };
      events?: {
        addListener: (level: number, type: string, fn: (ev: mls.events.IEvent) => void) => void;
        removeEventListener: (levels: number[] | undefined, types: string[] | undefined, fn: (ev: mls.events.IEvent) => void) => void;
      };
      sites?: { getMode?: () => string };
      editor?: unknown;
    };
    window?: EventTarget;
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
  };
  const previous = {
    actualProject: host.mls.actualProject,
    stor: host.mls.stor,
    events: host.mls.events,
    sites: host.mls.sites,
    editor: host.mls.editor,
    window: host.window,
    setInterval: host.setInterval,
    clearInterval: host.clearInterval,
  };
  const pending: ICollabDraftPendingDetail[] = [];
  const windowEvents = new EventTarget();
  windowEvents.addEventListener(COLLAB_DRAFT_PENDING, (ev) => {
    pending.push((ev as CustomEvent<ICollabDraftPendingDetail>).detail);
  });
  const listeners: IFileListener[] = [];
  const timers = new Map<number, { fn: () => void; ms: number }>();
  let nextTimer = 1;
  const page = {
    project: 102047,
    level: 2,
    folder: 'aura',
    shortName: 'page',
    extension: '.ts',
    status: 'changed',
    hasError: false,
    inLocalStorage: true,
  };
  const files: Record<string, unknown> = {};
  host.mls.actualProject = 102047;
  host.mls.stor = { files };
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
  host.mls.sites = { getMode: () => 'production' };
  host.mls.editor = { getKeyModel: () => 'none', models: {} };
  host.window = windowEvents;
  host.setInterval = ((fn: TimerHandler, ms?: number, ...args: unknown[]) => {
    if (ms === 1000 && typeof fn === 'function') {
      const id = nextTimer;
      nextTimer += 1;
      timers.set(id, { fn, ms });
      return id as unknown as ReturnType<typeof setInterval>;
    }
    return previous.setInterval(fn, ms as number, ...args);
  }) as typeof setInterval;
  host.clearInterval = ((id?: ReturnType<typeof setInterval>) => {
    if (typeof id === 'number' && timers.has(id)) {
      timers.delete(id);
      return;
    }
    previous.clearInterval(id as ReturnType<typeof setInterval>);
  }) as typeof clearInterval;
  const studioHost: IStudioEditHost = {
    host: { children: [] } as unknown as HTMLElement,
    chromeHost: { children: [] } as unknown as HTMLElement,
    studioMode: true,
    editLevel: false,
    level: 2,
    panelVisible: false,
  };
  const tick = (): void => {
    const batch = [...timers.values()];
    assert.equal(batch.length, 1);
    assert.equal(batch[0]?.ms, 1000);
    batch[0]?.fn();
  };
  try {
    publishEditHost(studioHost);
    publishEditHost(studioHost);
    assert.equal(timers.size, 1);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.count, 0);
    files.page = page;
    tick();
    assert.equal(pending[pending.length - 1]?.count, 1);
    assert.equal(pending[pending.length - 1]?.project, 102047);
    page.inLocalStorage = false;
    tick();
    assert.equal(pending[pending.length - 1]?.count, 0);
    assert.equal(listeners.some((item) => item.type === 'FileAction'), true);
    page.inLocalStorage = true;
    windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVED, { detail: { project: 102047, paths: [] } }));
    assert.equal(pending[pending.length - 1]?.count, 1);
    page.inLocalStorage = false;
    windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVE_RESULT, {
      detail: { project: 102047, saved: true, blocked: 0 },
    }));
    assert.equal(pending[pending.length - 1]?.count, 0);
    const beforeStop = pending.length;
    publishEditHost(null);
    assert.equal(timers.size, 0);
    page.inLocalStorage = true;
    assert.equal(pending.length, beforeStop);
    publishEditHost(studioHost);
    assert.equal(timers.size, 1);
  } finally {
    publishEditHost(null);
    host.mls.actualProject = previous.actualProject;
    host.mls.stor = previous.stor;
    host.mls.events = previous.events;
    host.mls.sites = previous.sites;
    host.mls.editor = previous.editor;
    host.window = previous.window;
    host.setInterval = previous.setInterval;
    host.clearInterval = previous.clearInterval;
  }
});
