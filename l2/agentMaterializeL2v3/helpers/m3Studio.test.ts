/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Studio.test.ts" enhancement="_blank"/>

// T6 (fix_monaco_verify_ns4.md): the verify/preload path CREATES Monaco models and never released them.
// A run of a 34-workspace module verifies 34 shared + 102 pages + 34 tests and preloads a dependency per
// item, so the console filled with "potential listener LEAK detected, having 200 listeners already".
//
// What is asserted here is the ownership rule, because that is the half that can silently do damage:
// a model the STUDIO already has (the file is open in a tab) must never be disposed by this agent.

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  // before the module graph loads.
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
  return import('/_102020_/l2/agentMaterializeL2v3/helpers/m3Studio.js');
}

test('verify/preload borrows the models it creates and gives them back at the scope boundary', async () => {
  const stub = installStub();
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();   // a previous test file may have left borrows in the module

  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemB');
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

test('compileAndGetErrors returns null when Monaco compile is absent, [] when present and clean', async () => {
  const studio = await loadModule();
  studio.releaseBorrowedModelScope();

  g.mls = {
    actualProject: PROJECT,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: { files: {}, getKeyToFile: () => 'k' },
    editor: {},
    l2: {},
  };
  assert.equal(studio.monacoCompileAvailable(), false);
  assert.equal(await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA'), null);
  assert.equal(await studio.compileMlsPathAndGetErrors(`_${PROJECT}_/l2/${FOLDER}/itemA.ts`), null);

  installStub();
  assert.equal(studio.monacoCompileAvailable(), true);
  const clean = await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  assert.deepEqual(clean, []);
});

test('compiler diagnostics include dependency errors and missing proof never becomes clean', async () => {
  const studio = await loadModule();
  installStub();
  const key = `${PROJECT}:2:${FOLDER}:itemA:.ts`;
  let diskPathCalls = 0;
  g.mls.stor.diskPath = () => { diskPathCalls += 1; throw new Error('host disk must not be consulted'); };
  g.mls.l2.typescript.compile = async (model: any) => {
    model.compilerResults.errors = [{ code: 2307, messageText: "Cannot find module '/_102046_/l2/buildFlowFsm/web/contracts/projectCatalogue.js'." }];
    return false;
  };
  const dependencyErrors = await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA');
  assert.equal(dependencyErrors?.length, 1);
  assert.match(dependencyErrors![0], /TS2307/u);
  assert.match(dependencyErrors![0], /Cannot find module/u);
  assert.equal(diskPathCalls, 0, 'host disk capability cannot influence the Studio result');

  g.mls.l2.typescript.compile = async () => undefined;
  assert.equal(await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA'), null, 'missing compile result is unavailable');

  g.mls.l2.typescript.compile = async (model: any) => { delete model.compilerResults; return true; };
  assert.equal(await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA'), null, 'missing diagnostics are unavailable');

  g.mls.l2.typescript.compile = async () => { throw new Error('Studio compile crashed'); };
  assert.equal(await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA'), null, 'compiler exceptions are unavailable');

  delete g.mls.editor.models[g.mls.editor.getKeyModel(PROJECT, 'itemA', FOLDER, 2)];
  g.mls.stor.files[key].getOrCreateModel = async () => null;
  assert.equal(await studio.compileAndGetErrors(PROJECT, 2, FOLDER, 'itemA'), null, 'missing model is unavailable');
  assert.equal(diskPathCalls, 0);

  const src = await import('node:fs').then(fs => fs.readFileSync(new URL('./m3Studio.ts', import.meta.url), 'utf8'));
  assert.doesNotMatch(src, /node:child_process|compileModuleViaProjectTsc|storDiskPath|runProjectFrontendTsc/u);
});

// cf_format_monaco_dispose (28/ago): the per-call model+editor create/dispose left the TS worker's
// async validation answering a disposed model — run01/102047 flooded the console with one
// "Could not find source file: 'inmemory://model/N'" per generated file. The fix is ONE persistent
// singleton; this wiring test pins the shape so a dispose-per-call cannot come back silently.
test('wiring: the Studio formatter reuses one persistent model+editor (no create/dispose per call)', () => {
  const studio = readFileSync(new URL('./m3Studio.ts', import.meta.url), 'utf8');
  const start = studio.indexOf('export async function formatGeneratedTsInStudio');
  assert.ok(start >= 0, 'formatGeneratedTsInStudio must exist');
  const end = studio.indexOf('\nexport ', start);
  const body = studio.slice(start, end > start ? end : studio.length);
  assert.ok(!body.includes('createModel('), 'no model creation per call — each one fires an async worker validation');
  assert.ok(!body.includes('.dispose('), 'no dispose per call — a disposed model orphans the worker response');
  assert.match(body, /getFormatterSingleton\(\)/u, 'the call must go through the persistent singleton');
  assert.match(body, /setValue\(''\)/u, 'the singleton is emptied after each call (no retained content)');
  // The singleton model has a stable, self-describing URI (never the anonymous inmemory://model/N).
  assert.match(studio, /monaco\.Uri\.parse\('inmemory:\/\/collab-m3-formatter\//u);
});
