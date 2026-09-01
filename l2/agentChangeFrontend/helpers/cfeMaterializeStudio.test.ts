/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.test.ts" enhancement="_blank"/>

// T6 (fix_monaco_verify_ns4.md): the verify/preload path CREATES Monaco models and never released them.
// A run of a 34-workspace module verifies 34 shared + 102 pages + 34 tests and preloads a dependency per
// item, so the console filled with "potential listener LEAK detected, having 200 listeners already".
//
// What is asserted here is the ownership rule, because that is the half that can silently do damage:
// a model the STUDIO already has (the file is open in a tab) must never be disposed by this agent.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const PROJECT = 102046;
const FOLDER = 'buildFlowFsm/web/shared';

interface Deleted { project: number; shortName: string; folder: string; release: boolean; level: number; }

/** A Studio stub whose only real behaviour is the registry: getOrCreateModel puts an entry in it. */
function installStub(): { deleted: Deleted[]; models: Record<string, any>; openTab: (shortName: string) => void } {
  const deleted: Deleted[] = [];
  const models: Record<string, any> = {};
  const keyModel = (project: number, shortName: string, folder: string, level: number) => `${project}:${level}:${folder}:${shortName}`;
  const files: Record<string, any> = {};
  for (const shortName of ['itemA', 'itemB', 'openInTab']) {
    const key = `${PROJECT}:2:${FOLDER}:${shortName}:.ts`;
    files[key] = {
      project: PROJECT, level: 2, folder: FOLDER, shortName, extension: '.ts', status: 'changed',
      getOrCreateModel: async () => {
        const model = { model: { getVersionId: () => 1, isDisposed: () => false }, compilerResults: { errors: [], prodDTS: 'declare const x: number;' } };
        models[keyModel(PROJECT, shortName, FOLDER, 2)] = { ts: model };
        return model;
      },
    };
  }
  // libModel.ts runs init() -> mls.events.addEventListener at IMPORT time, so the stub has to carry it
  // before the module graph loads (same note as cfeCreateReadContext.test.ts).
  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files,
      getKeyToFile: (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: {
      models,
      getKeyModel: keyModel,
      deleteModels: (project: number, shortName: string, folder: string, release: boolean, level: number) => {
        deleted.push({ project, shortName, folder, release, level });
        delete models[keyModel(project, shortName, folder, level)];
      },
    },
    l2: { typescript: { compile: async () => true } },
  };
  return {
    deleted,
    models,
    // A file open in the Studio already has a registry entry BEFORE this agent touches it.
    openTab: (shortName: string) => { models[keyModel(PROJECT, shortName, FOLDER, 2)] = { ts: null }; },
  };
}

async function loadModule(): Promise<any> {
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js');
}

/**
 * A stub whose stor answers by mls path, recording which files had a model created — that is what
 * "preloaded" means here, since the preload exists to put the dependency's model in the registry before
 * the dependent file compiles.
 */
function installPathStub(files: Record<string, string>): { loaded: string[] } {
  const loaded: string[] = [];
  const keyModel = (project: number, shortName: string, folder: string, level: number) => `${project}:${level}:${folder}:${shortName}`;
  const models: Record<string, any> = {};
  const storFiles: Record<string, any> = {};
  const parse = (mlsPath: string) => {
    const match = mlsPath.match(/^_(\d+)_\/l(\d+)\/(.+)$/u);
    if (!match) return null;
    const rest = match[3];
    const at = rest.lastIndexOf('/');
    const filename = rest.slice(at + 1);
    const extension = filename.endsWith('.defs.ts') ? '.defs.ts' : '.ts';
    return {
      project: Number(match[1]), level: Number(match[2]), folder: rest.slice(0, at),
      shortName: filename.slice(0, -extension.length), extension,
    };
  };
  for (const [mlsPath, source] of Object.entries(files)) {
    const info = parse(mlsPath)!;
    storFiles[`${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`] = {
      ...info, status: 'changed',
      getContent: async () => source,
      getOrCreateModel: async () => {
        loaded.push(mlsPath);
        const model = { model: { getVersionId: () => 1, isDisposed: () => false }, compilerResults: { errors: [], prodDTS: 'declare const x: number;' } };
        models[keyModel(info.project, info.shortName, info.folder, info.level)] = { ts: model };
        return model;
      },
    };
  }
  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files: storFiles,
      getKeyToFile: (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      convertFileReferenceToFile: (mlsPath: string) => parse(mlsPath),
      localStor: { setContent: async () => undefined },
    },
    editor: { models, getKeyModel: keyModel, deleteModels: () => undefined },
    l2: { typescript: { compile: async () => true } },
  };
  return { loaded };
}

test('verify/preload borrows the models it creates and gives them back at the scope boundary', async () => {
  const stub = installStub();
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();   // a previous test file may have left borrows in the module

  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  await studio.getCompiledDtsByMlsPath(`_${PROJECT}_/l2/${FOLDER}/itemB.ts`);   // mlsPath has no leading slash
  assert.equal(studio.borrowedModelScopeSize(), 2, 'both models were created by this agent');

  // Borrowing the same file twice is queued once — a page preloads the same dependency repeatedly.
  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  assert.equal(studio.borrowedModelScopeSize(), 2);

  assert.equal(studio.releaseBorrowedModelScope(), 2);
  assert.equal(studio.borrowedModelScopeSize(), 0, 'the scope is empty after the release');
  assert.deepEqual(stub.deleted.map(d => d.shortName).sort(), ['itemA', 'itemB']);
  // `true` is the flag that disposes the underlying monaco model — the thing that holds the listeners.
  assert.ok(stub.deleted.every(d => d.release === true && d.level === 2 && d.project === PROJECT));
});

test('compile syncs a resident model from stor (hooks no longer mirror mls.editor)', async () => {
  const shortName = 'itemA';
  const storContent = 'export const fromStor = 1;\n';
  let modelValue = 'export const stale = 1;\n';
  const keyModel = (project: number, name: string, folder: string, level: number) => `${project}:${level}:${folder}:${name}`;
  const editorKey = keyModel(PROJECT, shortName, FOLDER, 2);
  const fileKey = `${PROJECT}:2:${FOLDER}:${shortName}:.ts`;
  const model = {
    getVersionId: () => 1,
    isDisposed: () => false,
    getValue: () => modelValue,
    setValue: (value: string) => { modelValue = value; },
  };
  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files: {
        [fileKey]: {
          project: PROJECT, level: 2, folder: FOLDER, shortName, extension: '.ts', status: 'changed',
          getContent: async () => storContent,
        },
      },
      getKeyToFile: (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: {
      models: { [editorKey]: { ts: { model, compilerResults: { errors: [], prodDTS: '' } } } },
      getKeyModel: keyModel,
      deleteModels: () => undefined,
    },
    l2: { typescript: { compile: async () => true } },
  };
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();
  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, shortName);
  assert.equal(modelValue, storContent);
});

test('a model the Studio already had (file open in a tab) is never released', async () => {
  const stub = installStub();
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();
  stub.openTab('openInTab');

  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'openInTab');
  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  assert.equal(studio.borrowedModelScopeSize(), 1, 'only the model this agent created is borrowed');

  assert.equal(studio.releaseBorrowedModelScope(), 1);
  assert.deepEqual(stub.deleted.map(d => d.shortName), ['itemA']);
  assert.ok(!stub.deleted.some(d => d.shortName === 'openInTab'), 'disposing it would kill the open tab');
});

// T10. The repair hint used to compile WITHOUT this preload while the verify compiled WITH it, so a
// cross-file TS2339 was visible to the verify and invisible to the hint: the model got a repair with no
// error in it, returned the same file, and the round burned — three times on one `project.clientName`.
// Both call the same function now, so what is pinned here is WHICH dependencies that function loads.
const SHARED_DEFS = `_${PROJECT}_/l2/buildFlowFsm/web/shared/projectCatalogue.defs.ts`;
const SHARED_TS = `_${PROJECT}_/l2/buildFlowFsm/web/shared/projectCatalogue.ts`;
const CONTRACT_TS = `_${PROJECT}_/l2/buildFlowFsm/web/contracts/projectCatalogue.ts`;
const PAGE_TS = `_${PROJECT}_/l2/buildFlowFsm/web/desktop/page31/projectCatalogue.ts`;

const sharedDefsSource = [
  '/// <mls fileReference="x" enhancement="_blank"/>',
  'export const projectCatalogueShared = {',
  `  "contractRef": { "tsPath": "${CONTRACT_TS}" }`,
  '} as const;',
].join('\n');

test('a page preloads its shared runtime AND the contract that shared imports', async () => {
  const stub = installPathStub({
    [SHARED_DEFS]: sharedDefsSource,
    [SHARED_TS]: 'export class Base {}',
    [CONTRACT_TS]: 'export interface QryListProjectOutput { clientId: string }',
    [PAGE_TS]: 'export class Page extends Base {}',
  });
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();

  await studio.preloadItemTypecheckDeps('l2_page', PAGE_TS, null);
  assert.deepEqual(stub.loaded.sort(), [CONTRACT_TS, SHARED_TS].sort(),
    'without the contract loaded the page import resolves to any and the cross-file error disappears');
});

test('a shared preloads the contract named in its own defs', async () => {
  const stub = installPathStub({
    [SHARED_DEFS]: sharedDefsSource,
    [CONTRACT_TS]: 'export interface QryListProjectOutput { clientId: string }',
    [SHARED_TS]: 'export class Base {}',
  });
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();

  await studio.preloadItemTypecheckDeps('l2_shared', SHARED_TS, sharedDefsSource);
  assert.deepEqual(stub.loaded, [CONTRACT_TS]);
});

test('a split-page organism preloads the same two models as its page', async () => {
  const organismTs = `_${PROJECT}_/l2/buildFlowFsm/web/desktop/page31/projectCatalogue_O1.ts`;
  const stub = installPathStub({
    [SHARED_DEFS]: sharedDefsSource,
    [SHARED_TS]: 'export class Base {}',
    [CONTRACT_TS]: 'export interface QryListProjectOutput { clientId: string }',
    [organismTs]: 'export function renderList(host: Base) { return null; }',
  });
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();

  await studio.preloadItemTypecheckDeps('l2_page_organism', organismTs, null);
  assert.deepEqual(stub.loaded.sort(), [CONTRACT_TS, SHARED_TS].sort());
});

test('an item type with no cross-file dependency loads nothing', async () => {
  const stub = installPathStub({ [CONTRACT_TS]: 'export interface X {}' });
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();

  await studio.preloadItemTypecheckDeps('l2_contract', CONTRACT_TS, null);
  assert.deepEqual(stub.loaded, []);
});
