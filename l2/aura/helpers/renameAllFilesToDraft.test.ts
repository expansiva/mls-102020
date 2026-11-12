/// <mls fileReference="_102020_/l2/aura/helpers/renameAllFilesToDraft.test.ts" enhancement="_blank" />
// st71 s0 — measure only. Real renameAllFiles → collectEditedFiles → saveToDraft
// → DriverVm.setContents (fetch stands in for execAction) → afterDraftSave → applyDraftFiles.
import assert from 'node:assert/strict';
import test from 'node:test';
import { applyDraftFiles, draftPathIsSaved, forgetDraftPaths, rememberDraftPaths, type DraftDiffFile, type DraftDiffResult, type DraftFilesDeps } from '/_102033_/l2/cbe/studioDraftFiles.js';
import { renameAllFiles } from '/_102027_/l2/libStor.js';
import { afterDraftSave, collectEditedFiles, saveToDraft, type IPanelStorFile } from '/_102020_/l2/aura/helpers/draftPanelCore.js';

const PROJECT = 102071;
const LEVEL = 1;
const FOLDER = 'st71';
const OLD_NAME = 'oldpage';
const NEW_NAME = 'newpage';
const EXTENSIONS = ['.ts', '.defs.ts', '.less', '.test.ts'] as const;

interface IStoredValue {
  content: string | null;
  contentType: 'string';
  originalFolder?: string;
  originalProject?: number;
  originalShortName?: string;
  originalCRC?: string;
}

interface IPageFile extends IPanelStorFile {
  versionRef?: string;
  getContent: () => Promise<string | null>;
  getValueInfo?: () => Promise<IStoredValue | undefined>;
}

interface ITraceFile {
  extension: string;
  shortName?: string;
  status?: string;
  inLocalStorage?: boolean;
  originalCRC?: string;
  origin?: string;
  content: 'text' | 'null' | 'missing';
  keyPresent: boolean;
}

function fileKey(file: { project: number; level?: number; folder?: string; shortName?: string; extension?: string }): string {
  return [file.project, file.level, file.folder, file.shortName, file.extension].join('|');
}

function crc32(value: string): number {
  let hash = 0;
  for (const ch of value) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

function sourceFor(extension: string, shortName: string): string {
  return `export const pageFile = ${JSON.stringify(`${shortName}${extension}`)};\n`;
}

function shortPath(shortName: string, extension: string): string {
  return `l${LEVEL}/${FOLDER}/${shortName}${extension}`;
}

function parsePath(path: string): { level: number; folder: string; shortName: string; extension: string } | undefined {
  const layer = path.startsWith('l1/') ? 1 : path.startsWith('l2/') ? 2 : path.startsWith('l3/') ? 3 : 0;
  if (layer === 0) return undefined;
  const rest = path.slice(3);
  const slash = rest.lastIndexOf('/');
  const folder = slash === -1 ? '' : rest.slice(0, slash);
  const filename = slash === -1 ? rest : rest.slice(slash + 1);
  const dot = filename.indexOf('.');
  if (dot <= 0) return undefined;
  return { level: layer, folder, shortName: filename.slice(0, dot), extension: filename.slice(dot) };
}

test('st71 s0: rename every extension, save, then reapply the draft diff', async () => {
  const host = globalThis as { mls?: unknown };
  const previousMls = host.mls;
  const previousFetch = globalThis.fetch;
  const files: Record<string, IPageFile> = {};
  const stored = new Map<IPageFile, IStoredValue>();
  const models: Record<string, { ts?: { model: { getValue: () => string; dispose: () => void }; originalCRC?: string } }> = {};
  const bodies: string[] = [];
  const reads: { extension?: string; shortName?: string; flag: boolean | undefined; content: 'text' | 'null' | 'missing' }[] = [];
  class DriverIOBase {}

  const attachContent = (file: IPageFile): void => {
    file.getValueInfo = async () => {
      const value = file.inLocalStorage ? stored.get(file) : undefined;
      const content = value?.content ?? null;
      reads.push({
        extension: file.extension,
        shortName: file.shortName,
        flag: file.inLocalStorage,
        content: value ? (content === null ? 'null' : 'text') : 'missing',
      });
      if (!file.inLocalStorage) return { content: null, contentType: 'string' };
      return value ?? { content: null, contentType: 'string' };
    };
    file.getContent = async () => (file.inLocalStorage ? stored.get(file)?.content ?? null : null);
  };

  for (const extension of EXTENSIONS) {
    const file: IPageFile = {
      project: PROJECT,
      level: LEVEL,
      folder: FOLDER,
      shortName: OLD_NAME,
      extension,
      status: 'new',
      inLocalStorage: true,
      versionRef: '0',
      getContent: async () => null,
    };
    stored.set(file, { content: sourceFor(extension, OLD_NAME), contentType: 'string', originalCRC: crc32(sourceFor(extension, OLD_NAME)).toString(16) });
    attachContent(file);
    files[fileKey(file)] = file;
  }

  const modelKey = (shortName: string): string => [PROJECT, LEVEL, FOLDER, shortName].join('|');

  host.mls = {
    istrace: false,
    events: { fireFileAction: () => {} },
    editor: {
      models,
      getKeyModel: (_project: number, shortName: string, folder: string, level: number) => [PROJECT, level, folder, shortName].join('|'),
      getModels: (_project: number, shortName: string, folder: string) => models[[PROJECT, LEVEL, folder, shortName].join('|')],
      deleteModels: () => {},
    },
    common: { crc: { crc32 } },
    stor: {
      files,
      others: {
        DriverIOBase,
        getDefaultDriver: async () => ({
          getContents: async (_project: number, infos: { shortName?: string; extension?: string }[]) => infos.map((info) => ({
            fileInfo: info,
            content: sourceFor(info.extension ?? '', info.shortName ?? ''),
          })),
        }),
      },
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => fileKey(info),
      getKeyToFiles: (project: number, level: number, name: string, folder: string, extension: string) =>
        [project, level, folder, name, extension].join('|'),
      addOrUpdateFile: async (params: IPageFile) => {
        const created: IPageFile = {
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
        attachContent(created);
        files[fileKey(created)] = created;
        return created;
      },
      localStor: {
        setContent: async (file: IPageFile, value: IStoredValue) => {
          if (value.content == null) {
            stored.delete(file);
            file.inLocalStorage = false;
            return true;
          }
          stored.set(file, value);
          file.inLocalStorage = true;
          return true;
        },
      },
      cache: { setContent: async () => true },
    },
  };

  const snap = async (which: string): Promise<ITraceFile[]> => {
    const rows: ITraceFile[] = [];
    for (const extension of EXTENSIONS) {
      for (const shortName of [OLD_NAME, NEW_NAME]) {
        const key = [PROJECT, LEVEL, FOLDER, shortName, extension].join('|');
        const file = files[key];
        if (!file) {
          rows.push({ extension, shortName, content: 'missing', keyPresent: false });
          continue;
        }
        const value = stored.get(file);
        rows.push({
          extension,
          shortName,
          status: file.status,
          inLocalStorage: file.inLocalStorage,
          originalCRC: value?.originalCRC,
          origin: value?.originalShortName,
          content: value ? (value.content === null ? 'null' : 'text') : 'missing',
          keyPresent: true,
        });
      }
    }
    console.log(`ST71-MEASURE ${which} ${JSON.stringify(rows)}`);
    return rows;
  };

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ''));
    return { ok: true, status: 200, json: async () => ({ statusCode: 200 }) } as Response;
  }) as typeof fetch;

  const save = async (comment: string): Promise<void> => {
    const { DriverVm } = await import('/_102033_/l2/cbe/driverVm.js');
    const edited = collectEditedFiles(files, PROJECT);
    console.log(`ST71-MEASURE collect ${comment} ${JSON.stringify(edited.map((file) => shortPath(file.shortName ?? '', file.extension ?? '')))}`);
    const before = bodies.length;
    await saveToDraft(
      edited,
      comment,
      async (clean) => {
        const wrote = await new DriverVm().setContents(PROJECT, clean as mls.stor.IFileInfo[], comment);
        return [{ result: wrote }];
      },
      (file) => afterDraftSave(file),
    );
    const sent = bodies.slice(before).map((body) => {
      const payload = JSON.parse(body) as { files?: { shortPath: string }[]; deletes?: string[] };
      return {
        files: (payload.files ?? []).map((file) => file.shortPath),
        deletes: payload.deletes ?? [],
      };
    });
    console.log(`ST71-MEASURE setContents ${comment} ${JSON.stringify(sent)}`);
  };

  try {
    await snap('seed');
    await save('first-save');
    await snap('after-first-save');

    const ts = files[[PROJECT, LEVEL, FOLDER, OLD_NAME, '.ts'].join('|')];
    assert.ok(ts, 'the .ts row is still the old name before rename');
    const renamed = await renameAllFiles(ts as mls.stor.IFileInfo, PROJECT, NEW_NAME, FOLDER, false);
    const renameReport: Record<string, string> = {};
    for (const [prop, value] of Object.entries(renamed)) {
      renameReport[prop] = value instanceof Error
        ? `Error: ${value.message}`
        : `${value.shortName}${value.extension} status=${value.status} local=${value.inLocalStorage}`;
    }
    console.log(`ST71-MEASURE renameAllFiles ${JSON.stringify(renameReport)}`);

    const newTsSource = stored.get(files[[PROJECT, LEVEL, FOLDER, NEW_NAME, '.ts'].join('|')])?.content ?? sourceFor('.ts', NEW_NAME);
    models[modelKey(NEW_NAME)] = {
      ts: {
        model: { getValue: () => newTsSource, dispose: () => {} },
        originalCRC: crc32(newTsSource).toString(16),
      },
    };
    await snap('after-rename');
    reads.length = 0;
    await save('rename-save');
    console.log(`ST71-MEASURE reads ${JSON.stringify(reads)}`);
    await snap('after-rename-save');
    console.log(`ST71-MEASURE draftPaths-before-apply ${JSON.stringify(EXTENSIONS.flatMap((extension) => [OLD_NAME, NEW_NAME].map((shortName) => ({
      path: shortPath(shortName, extension),
      saved: draftPathIsSaved(PROJECT, shortPath(shortName, extension)),
    }))))}`);

    const last = JSON.parse(bodies[bodies.length - 1] ?? '{}') as { files?: { shortPath: string }[]; deletes?: string[] };
    const written = new Set((last.files ?? []).map((file) => file.shortPath));
    const removed = new Set(last.deletes ?? []);
    const diffFiles: DraftDiffFile[] = [];
    for (const extension of EXTENSIONS) {
      const next = shortPath(NEW_NAME, extension);
      const prev = shortPath(OLD_NAME, extension);
      if (written.has(next) && removed.has(prev)) diffFiles.push({ status: 'R', path: next, sha: 'sha-st71', from: prev });
      else if (written.has(next)) diffFiles.push({ status: 'A', path: next, sha: 'sha-st71' });
      else if (removed.has(prev)) diffFiles.push({ status: 'D', path: prev, sha: null });
    }
    const diff: DraftDiffResult = { head: 'head-st71', files: diffFiles };
    const deps: DraftFilesDeps = {
      draftDiff: async () => diff,
      hasLocalEdit: (_project, path) => {
        const loc = parsePath(path);
        if (!loc) return false;
        return files[fileKey({ project: PROJECT, ...loc })]?.inLocalStorage === true;
      },
      addOrUpdateFile: (info) => (host.mls as { stor: { addOrUpdateFile: (row: typeof info) => Promise<unknown> } }).stor.addOrUpdateFile(info),
      fileKey: (info) => fileKey(info),
      files: () => files as { [key: string]: { versionRef: string } },
    };
    let applyNote = '';
    try {
      const counts = await applyDraftFiles(PROJECT, 'user-st71', deps, diff);
      applyNote = JSON.stringify(counts);
    } catch (err) {
      applyNote = err instanceof Error ? `Error: ${err.message}` : String(err);
    }
    console.log(`ST71-MEASURE applyDraftFiles ${applyNote} diff=${JSON.stringify(diffFiles)}`);
    await snap('after-apply');

    const draft = EXTENSIONS.flatMap((extension) => [OLD_NAME, NEW_NAME].map((shortName) => ({
      path: shortPath(shortName, extension),
      saved: draftPathIsSaved(PROJECT, shortPath(shortName, extension)),
    })));
    console.log(`ST71-MEASURE draftPaths ${JSON.stringify(draft)}`);
    assert.equal(bodies.length >= 2, true);
  } finally {
    globalThis.fetch = previousFetch;
    host.mls = previousMls;
    forgetDraftPaths(PROJECT, EXTENSIONS.flatMap((extension) => [shortPath(OLD_NAME, extension), shortPath(NEW_NAME, extension)]));
  }
});

const S1E_PROJECT = 102171;
const S1E_LEVEL = 1;
const S1E_FOLDER = 'st71e';
const S1E_OLD = 'oldpage';
const S1E_NEW = 'newpage';
const PAGE_EXTENSIONS = ['.ts', '.html', '.less', '.test.ts', '.defs.ts'] as const;
const PUBLISHED_REF = 'pub-st71e';

interface ISaveWire {
  files?: { shortPath: string }[];
  deletes?: string[];
}

interface IPageHost {
  files: Record<string, IPageFile>;
  stored: Map<IPageFile, IStoredValue>;
  bodies: string[];
  restore: () => void;
}

function s1ePath(shortName: string, extension: string): string {
  return `l${S1E_LEVEL}/${S1E_FOLDER}/${shortName}${extension}`;
}

function sorted(paths: readonly string[]): string[] {
  return [...paths].sort();
}

function parseSave(body: string): { files: string[]; deletes: string[] } {
  const payload = JSON.parse(body) as ISaveWire;
  return {
    files: (payload.files ?? []).map((file) => file.shortPath),
    deletes: payload.deletes ?? [],
  };
}

function installPageHost(): IPageHost {
  const host = globalThis as { mls?: unknown };
  const previousMls = host.mls;
  const previousFetch = globalThis.fetch;
  const files: Record<string, IPageFile> = {};
  const stored = new Map<IPageFile, IStoredValue>();
  const bodies: string[] = [];
  class DriverIOBase {}

  const attachContent = (file: IPageFile): void => {
    file.getValueInfo = async () => {
      if (!file.inLocalStorage) return { content: null, contentType: 'string' };
      return stored.get(file) ?? { content: null, contentType: 'string' };
    };
    file.getContent = async () => (file.inLocalStorage ? stored.get(file)?.content ?? null : null);
  };

  host.mls = {
    istrace: false,
    events: { fireFileAction: () => {} },
    editor: {
      models: {},
      getKeyModel: () => 'st71e',
      getModels: () => undefined,
      deleteModels: () => {},
    },
    common: { crc: { crc32 } },
    stor: {
      files,
      others: { DriverIOBase },
      getKeyToFiles: (project: number, level: number, name: string, folder: string, extension: string) =>
        [project, level, folder, name, extension].join('|'),
      addOrUpdateFile: async (params: IPageFile) => {
        const created: IPageFile = {
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
        attachContent(created);
        files[fileKey(created)] = created;
        return created;
      },
      localStor: {
        setContent: async (file: IPageFile, value: IStoredValue) => {
          if (value.content == null) {
            stored.delete(file);
            file.inLocalStorage = false;
            return true;
          }
          stored.set(file, value);
          file.inLocalStorage = true;
          return true;
        },
      },
      cache: { setContent: async () => true },
    },
  };
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    bodies.push(String(init?.body ?? ''));
    return { ok: true, status: 200, json: async () => ({ statusCode: 200 }) } as Response;
  }) as typeof fetch;

  return {
    files,
    stored,
    bodies,
    restore: () => {
      globalThis.fetch = previousFetch;
      host.mls = previousMls;
    },
  };
}

function seedPageFile(host: IPageHost, project: number, shortName: string, extension: string, status: 'new' | 'changed' | 'nochange', content: string, originalCRC: string): IPageFile {
  const file: IPageFile = {
    project,
    level: S1E_LEVEL,
    folder: S1E_FOLDER,
    shortName,
    extension,
    status,
    inLocalStorage: status !== 'nochange',
    versionRef: status === 'new' ? '0' : PUBLISHED_REF,
    getContent: async () => content,
  };
  if (file.inLocalStorage) {
    host.stored.set(file, { content, contentType: 'string', originalCRC });
    file.getValueInfo = async () => {
      if (!file.inLocalStorage) return { content: null, contentType: 'string' };
      return host.stored.get(file) ?? { content: null, contentType: 'string' };
    };
    file.getContent = async () => (file.inLocalStorage ? host.stored.get(file)?.content ?? null : null);
  } else {
    file.getValueInfo = async () => ({ content, contentType: 'string', originalCRC });
  }
  host.files[fileKey(file)] = file;
  return file;
}

async function saveCollected(host: IPageHost, project: number, comment: string): Promise<{ files: string[]; deletes: string[] }> {
  const { DriverVm } = await import('/_102033_/l2/cbe/driverVm.js');
  const before = host.bodies.length;
  const edited = collectEditedFiles(host.files, project);
  await saveToDraft(
    edited,
    comment,
    async (clean) => {
      const wrote = await new DriverVm().setContents(project, clean as mls.stor.IFileInfo[], comment);
      return [{ result: wrote }];
    },
    (file) => afterDraftSave(file),
  );
  const sent = host.bodies.slice(before).map(parseSave);
  assert.equal(sent.length, 1, `${comment}: one setContents`);
  return sent[0];
}

test('st71 s1e b: a saved new page renames all five files in one setContents and the draft keeps only the new names', async () => {
  const host = installPageHost();
  const oldPaths = PAGE_EXTENSIONS.map((extension) => s1ePath(S1E_OLD, extension));
  const newPaths = PAGE_EXTENSIONS.map((extension) => s1ePath(S1E_NEW, extension));
  try {
    for (const extension of PAGE_EXTENSIONS) {
      const content = sourceFor(extension, S1E_OLD);
      seedPageFile(host, S1E_PROJECT, S1E_OLD, extension, 'new', content, crc32(content).toString(16));
    }
    const first = await saveCollected(host, S1E_PROJECT, 's1e-b-save');
    assert.deepEqual(sorted(first.files), sorted(oldPaths));
    assert.deepEqual(first.deletes, []);
    for (const path of oldPaths) assert.equal(draftPathIsSaved(S1E_PROJECT, path), true);

    const ts = host.files[fileKey({ project: S1E_PROJECT, level: S1E_LEVEL, folder: S1E_FOLDER, shortName: S1E_OLD, extension: '.ts' })];
    assert.ok(ts);
    const renamed = await renameAllFiles(ts as mls.stor.IFileInfo, S1E_PROJECT, S1E_NEW, S1E_FOLDER, false);
    for (const value of Object.values(renamed)) assert.equal(value instanceof Error, false);

    const second = await saveCollected(host, S1E_PROJECT, 's1e-b-rename');
    assert.deepEqual(sorted(second.files), sorted(newPaths));
    assert.deepEqual(sorted(second.deletes), sorted(oldPaths));
    for (const path of oldPaths) assert.equal(draftPathIsSaved(S1E_PROJECT, path), false);
    for (const path of newPaths) assert.equal(draftPathIsSaved(S1E_PROJECT, path), true);
  } finally {
    host.restore();
    forgetDraftPaths(S1E_PROJECT, [...oldPaths, ...newPaths]);
  }
});

test('st71 s1e c: a published page rename drops every old extension from the draft and writes every new one', async () => {
  const project = 102172;
  const oldName = 'pubpage';
  const newName = 'renpage';
  const host = installPageHost();
  const oldPaths = PAGE_EXTENSIONS.map((extension) => s1ePath(oldName, extension));
  const newPaths = PAGE_EXTENSIONS.map((extension) => s1ePath(newName, extension));
  const changed = new Set<string>(['.ts', '.html', '.defs.ts']);
  try {
    for (const extension of PAGE_EXTENSIONS) {
      const published = sourceFor(extension, `${oldName}-published`);
      const originalCRC = crc32(published).toString(16);
      const status = changed.has(extension) ? 'changed' : 'nochange';
      const content = status === 'changed' ? sourceFor(extension, `${oldName}-edited`) : published;
      const file = seedPageFile(host, project, oldName, extension, status, content, originalCRC);
      assert.equal(file.versionRef, PUBLISHED_REF);
      assert.notEqual(originalCRC, '');
      if (status === 'changed') {
        assert.equal(host.stored.get(file)?.originalCRC, originalCRC);
        assert.notEqual(originalCRC, crc32(content).toString(16));
      }
    }
    rememberDraftPaths(project, oldPaths);
    for (const path of oldPaths) assert.equal(draftPathIsSaved(project, path), true);

    const ts = host.files[fileKey({ project, level: S1E_LEVEL, folder: S1E_FOLDER, shortName: oldName, extension: '.ts' })];
    assert.ok(ts);
    const renamed = await renameAllFiles(ts as mls.stor.IFileInfo, project, newName, S1E_FOLDER, false);
    for (const value of Object.values(renamed)) assert.equal(value instanceof Error, false);

    const saved = await saveCollected(host, project, 's1e-c-rename');
    assert.deepEqual(sorted(saved.files), sorted(newPaths));
    assert.deepEqual(sorted(saved.deletes), sorted(oldPaths));
    // A published rename leaves the old name in the draft as the removed side of an R entry (the request above deletes
    // it on the server), so the local list keeps it. Only a `new` rename forgets the old name (`savedOriginToDrop`).
    for (const path of oldPaths) assert.equal(draftPathIsSaved(project, path), true);
    for (const path of newPaths) assert.equal(draftPathIsSaved(project, path), true);
  } finally {
    host.restore();
    forgetDraftPaths(project, [...oldPaths, ...newPaths]);
  }
});
