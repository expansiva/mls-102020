/// <mls fileReference="_102020_/l2/aura/helpers/draftRenameSave.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { forgetDraftPaths } from '/_102033_/l2/cbe/studioDraftFiles.js';
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
