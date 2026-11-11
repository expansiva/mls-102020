/// <mls fileReference="_102020_/l2/aura/helpers/draftRenameSave.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { draftPathIsSaved, forgetDraftPaths, rememberDraftPaths } from '/_102033_/l2/cbe/studioDraftFiles.js';
import { renameFile } from '/_102027_/l2/libStor.js';
import { afterDraftSave, draftSaveTotals, saveToDraft, type IPanelStorFile } from '/_102020_/l2/aura/helpers/draftPanelCore.js';

const PROJECT = 102067;
const LEVEL = 1;
const FOLDER = 'st67';
const EXTENSION = '.ts';
const SOURCE = 'export const card = 1;\n';
const NEW_PATH = 'l1/st67/next.ts';
const OLD_PATH = 'l1/st67/old.ts';

interface IStoredValue {
  content: string | null;
  contentType: 'string';
  originalFolder?: string;
  originalProject?: number;
  originalShortName?: string;
}

interface IRenameFile extends IPanelStorFile {
  versionRef?: string;
  getContent: () => Promise<string | null>;
  getValueInfo?: () => Promise<IStoredValue | undefined>;
}

function fileKey(file: { project: number; level?: number; folder?: string; shortName?: string; extension?: string }): string {
  return [file.project, file.level, file.folder, file.shortName, file.extension].join('|');
}

function crc32(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

const MID_PATH = 'l1/st67/mid.ts';

interface ISavePayload {
  files?: { shortPath: string; content?: string }[];
  deletes?: string[];
}

interface IRenameHost {
  files: Record<string, IRenameFile>;
  bodies: string[];
  fetchImpl: typeof fetch;
  restore: () => void;
}

function seedFile(shortName: string, status: string, extension = EXTENSION): IRenameFile {
  return {
    project: PROJECT,
    level: LEVEL,
    folder: FOLDER,
    shortName,
    extension,
    status,
    inLocalStorage: status === 'new',
    getContent: async () => SOURCE,
  };
}

function installRenameHost(seeds: IRenameFile[]): IRenameHost {
  const host = globalThis as { mls?: unknown };
  const previousMls = host.mls;
  const previousFetch = globalThis.fetch;
  const files: Record<string, IRenameFile> = {};
  const stored = new Map<IRenameFile, IStoredValue>();
  class DriverIOBase {}
  for (const seed of seeds) files[fileKey(seed)] = seed;
  const bodies: string[] = [];
  const fetchImpl = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ''));
    return { ok: true, status: 200, json: async () => ({ statusCode: 200 }) } as Response;
  }) as typeof fetch;
  host.mls = {
    istrace: false,
    events: { fireFileAction: () => {} },
    editor: { models: {}, getKeyModel: () => 'k', getModels: () => undefined, deleteModels: () => {} },
    common: { crc: { crc32 } },
    stor: {
      files,
      others: { DriverIOBase },
      getKeyToFiles: (project: number, level: number, name: string, folder: string, extension: string) =>
        [project, level, folder, name, extension].join('|'),
      addOrUpdateFile: async (params: IRenameFile) => {
        const created: IRenameFile = {
          project: params.project,
          level: params.level,
          shortName: params.shortName,
          extension: params.extension,
          folder: params.folder,
          versionRef: params.versionRef,
          status: 'nochange',
          inLocalStorage: false,
          getContent: async () => null,
        };
        files[fileKey(created)] = created;
        return created;
      },
      localStor: {
        setContent: async (file: IRenameFile, value: IStoredValue) => {
          if (value.content == null) {
            stored.delete(file);
            file.inLocalStorage = false;
            file.getValueInfo = async () => ({ content: null, contentType: 'string' });
            file.getContent = async () => null;
            return true;
          }
          stored.set(file, value);
          file.inLocalStorage = true;
          file.getValueInfo = async () => {
            if (!file.inLocalStorage) return { content: null, contentType: 'string' };
            return stored.get(file);
          };
          file.getContent = async () => stored.get(file)?.content ?? null;
          return true;
        },
      },
    },
  };
  globalThis.fetch = fetchImpl;
  return {
    files,
    bodies,
    fetchImpl,
    restore: () => {
      globalThis.fetch = previousFetch;
      host.mls = previousMls;
    },
  };
}

function clearAfter(file: IPanelStorFile): Promise<void> {
  return afterDraftSave(file, {
    setLocal: async () => {},
    setCache: async () => {},
    deleteModels: () => {},
    removeFromFiles: () => {},
    resetRenameOrigin: () => {},
  });
}

async function saveWithVm(files: IRenameFile[], comment: string): Promise<{ blocked: IRenameFile[] }> {
  const { DriverVm } = await import('/_102033_/l2/cbe/driverVm.js');
  return saveToDraft(
    files,
    comment,
    async (clean) => {
      const wrote = await new DriverVm().setContents(PROJECT, clean as mls.stor.IFileInfo[], comment);
      return [{ result: wrote }];
    },
    (file) => clearAfter(file),
  );
}

function payloadOf(body: string): ISavePayload {
  return JSON.parse(body) as ISavePayload;
}

test('rename raises the unsaved count and Save writes the new path without the old one', async () => {
  const host = globalThis as { mls?: unknown };
  const previousMls = host.mls;
  const previousFetch = globalThis.fetch;
  const files: Record<string, IRenameFile> = {};
  const stored = new Map<IRenameFile, IStoredValue>();
  class DriverIOBase {}

  const original: IRenameFile = {
    project: PROJECT,
    level: LEVEL,
    folder: FOLDER,
    shortName: 'old',
    extension: EXTENSION,
    status: 'nochange',
    inLocalStorage: false,
    getContent: async () => SOURCE,
  };
  files[fileKey(original)] = original;

  host.mls = {
    istrace: false,
    events: { fireFileAction: () => {} },
    editor: { models: {}, getKeyModel: () => 'k', getModels: () => undefined, deleteModels: () => {} },
    common: { crc: { crc32 } },
    stor: {
      files,
      others: { DriverIOBase },
      getKeyToFiles: (project: number, level: number, name: string, folder: string, extension: string) =>
        [project, level, folder, name, extension].join('|'),
      addOrUpdateFile: async (params: IRenameFile) => {
        const created: IRenameFile = {
          project: params.project,
          level: params.level,
          shortName: params.shortName,
          extension: params.extension,
          folder: params.folder,
          versionRef: params.versionRef,
          status: 'nochange',
          inLocalStorage: false,
          getContent: async () => null,
        };
        files[fileKey(created)] = created;
        return created;
      },
      localStor: {
        setContent: async (file: IRenameFile, value: IStoredValue) => {
          if (value.content == null) {
            stored.delete(file);
            file.inLocalStorage = false;
            file.getValueInfo = async () => ({ content: null, contentType: 'string' });
            file.getContent = async () => null;
            return true;
          }
          stored.set(file, value);
          file.inLocalStorage = true;
          file.getValueInfo = async () => {
            if (!file.inLocalStorage) return { content: null, contentType: 'string' };
            return stored.get(file);
          };
          file.getContent = async () => stored.get(file)?.content ?? null;
          return true;
        },
      },
    },
  };

  const bodies: string[] = [];
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ''));
    return { ok: true, status: 200, json: async () => ({ statusCode: 200 }) } as Response;
  }) as typeof fetch;

  try {
    assert.equal(draftSaveTotals(files, PROJECT).count, 0);
    const renamed = await renameFile(original as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile;
    assert.equal(renamed.status, 'renamed');
    assert.equal(fileKey(original) in files, false);
    assert.equal(draftSaveTotals(files, PROJECT).count, 1);

    const { DriverVm } = await import('/_102033_/l2/cbe/driverVm.js');
    const saved = await saveToDraft(
      [renamed],
      'rename',
      async (clean) => {
        const wrote = await new DriverVm().setContents(PROJECT, clean as mls.stor.IFileInfo[], 'rename');
        return [{ result: wrote }];
      },
      (file) => afterDraftSave(file, {
        setLocal: async () => {},
        setCache: async () => {},
        deleteModels: () => {},
        removeFromFiles: () => {},
        resetRenameOrigin: () => {},
      }),
    );

    assert.deepEqual(saved.blocked, []);
    assert.equal(bodies.length, 1);
    const payload = JSON.parse(bodies[0]) as { files?: { shortPath: string; content?: string }[]; deletes?: string[] };
    assert.deepEqual(payload.files?.map((file) => file.shortPath), [NEW_PATH]);
    assert.equal(payload.files?.[0]?.content, SOURCE);
    assert.deepEqual(payload.deletes, [OLD_PATH]);
    assert.equal(draftSaveTotals(files, PROJECT).count, 0);
  } finally {
    globalThis.fetch = previousFetch;
    host.mls = previousMls;
    forgetDraftPaths(PROJECT, [NEW_PATH]);
  }
});

test('st69 a: saved new file renamed then Save drops the old draft path in the same send', async () => {
  const original = seedFile('old', 'new');
  const host = installRenameHost([original]);
  rememberDraftPaths(PROJECT, [OLD_PATH]);
  try {
    const renamed = await renameFile(original as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile;
    assert.equal(renamed.status, 'new');
    const saved = await saveWithVm([renamed], 'rename-new');
    assert.deepEqual(saved.blocked, []);
    assert.equal(host.bodies.length, 1);
    const payload = payloadOf(host.bodies[0]);
    assert.deepEqual(payload.files?.map((file) => file.shortPath), [NEW_PATH]);
    assert.deepEqual(payload.deletes, [OLD_PATH]);
    assert.equal(draftPathIsSaved(PROJECT, OLD_PATH), false);
    assert.equal(draftPathIsSaved(PROJECT, NEW_PATH), true);
  } finally {
    host.restore();
    forgetDraftPaths(PROJECT, [OLD_PATH, NEW_PATH]);
  }
});

test('st69 b: unsaved new file renamed then Save does not delete a draft path', async () => {
  const original = seedFile('old', 'new');
  const host = installRenameHost([original]);
  try {
    const renamed = await renameFile(original as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile;
    const saved = await saveWithVm([renamed], 'rename-unsaved');
    assert.deepEqual(saved.blocked, []);
    assert.equal(host.bodies.length, 1);
    const payload = payloadOf(host.bodies[0]);
    assert.deepEqual(payload.files?.map((file) => file.shortPath), [NEW_PATH]);
    assert.deepEqual(payload.deletes ?? [], []);
    assert.equal(draftPathIsSaved(PROJECT, OLD_PATH), false);
    assert.equal(draftPathIsSaved(PROJECT, NEW_PATH), true);
  } finally {
    host.restore();
    forgetDraftPaths(PROJECT, [OLD_PATH, NEW_PATH]);
  }
});

test('st69 c: A saved then B then C without a save in the middle drops A and writes C', async () => {
  const original = seedFile('old', 'new');
  const host = installRenameHost([original]);
  rememberDraftPaths(PROJECT, [OLD_PATH]);
  try {
    const mid = await renameFile(original as mls.stor.IFileInfo, PROJECT, 'mid', FOLDER, false) as IRenameFile;
    const renamed = await renameFile(mid as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile;
    assert.equal(renamed.status, 'new');
    const saved = await saveWithVm([renamed], 'rename-chain');
    assert.deepEqual(saved.blocked, []);
    assert.equal(host.bodies.length, 1);
    const payload = payloadOf(host.bodies[0]);
    assert.deepEqual(payload.files?.map((file) => file.shortPath), [NEW_PATH]);
    assert.deepEqual(payload.deletes, [OLD_PATH]);
    assert.equal(draftPathIsSaved(PROJECT, OLD_PATH), false);
    assert.equal(draftPathIsSaved(PROJECT, MID_PATH), false);
    assert.equal(draftPathIsSaved(PROJECT, NEW_PATH), true);
  } finally {
    host.restore();
    forgetDraftPaths(PROJECT, [OLD_PATH, MID_PATH, NEW_PATH]);
  }
});

test('st69 d: every extension of the page is dropped and written in one request', async () => {
  const extensions = ['.ts', '.html', '.less'] as const;
  const seeds = extensions.map((extension) => seedFile('old', 'new', extension));
  const host = installRenameHost(seeds);
  const oldPaths = extensions.map((extension) => `l1/st67/old${extension}`);
  const newPaths = extensions.map((extension) => `l1/st67/next${extension}`);
  rememberDraftPaths(PROJECT, oldPaths);
  try {
    const renamed: IRenameFile[] = [];
    for (const seed of seeds) {
      renamed.push(await renameFile(seed as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile);
    }
    const saved = await saveWithVm(renamed, 'rename-page');
    assert.deepEqual(saved.blocked, []);
    assert.equal(host.bodies.length, 1);
    const payload = payloadOf(host.bodies[0]);
    assert.deepEqual(payload.files?.map((file) => file.shortPath), newPaths);
    assert.deepEqual(payload.deletes, oldPaths);
    for (const path of oldPaths) assert.equal(draftPathIsSaved(PROJECT, path), false);
    for (const path of newPaths) assert.equal(draftPathIsSaved(PROJECT, path), true);
  } finally {
    host.restore();
    forgetDraftPaths(PROJECT, [...oldPaths, ...newPaths]);
  }
});

test('st69 h: a refused Save leaves the browser and the draft paths as they were', async () => {
  const original = seedFile('old', 'new');
  const host = installRenameHost([original]);
  rememberDraftPaths(PROJECT, [OLD_PATH]);
  const errors: string[] = [];
  const previousError = console.error;
  console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); };
  try {
    const renamed = await renameFile(original as mls.stor.IFileInfo, PROJECT, 'next', FOLDER, false) as IRenameFile;
    const inLocal = renamed.inLocalStorage;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      host.bodies.push(String(init?.body ?? ''));
      return { ok: true, status: 200, json: async () => ({ statusCode: 500, msg: 'draft.not_owner' }) } as Response;
    }) as typeof fetch;
    await assert.rejects(
      () => saveWithVm([renamed], 'rename-fail'),
      /setContents refused the draft save/,
    );
    assert.equal(renamed.inLocalStorage, inLocal);
    assert.equal(draftPathIsSaved(PROJECT, OLD_PATH), true);
    assert.equal(draftPathIsSaved(PROJECT, NEW_PATH), false);
    assert.equal(fileKey(renamed) in host.files, true);
    assert.ok(errors.some((line) => line.includes('setContents') || line.includes('refused')));
  } finally {
    console.error = previousError;
    host.restore();
    forgetDraftPaths(PROJECT, [OLD_PATH, NEW_PATH]);
  }
});
