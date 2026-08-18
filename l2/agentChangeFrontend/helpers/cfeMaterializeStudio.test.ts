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
