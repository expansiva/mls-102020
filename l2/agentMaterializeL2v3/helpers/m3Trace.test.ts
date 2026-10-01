/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  latestM3RunDir, listM3RunDirs, m3NewRunDir, m3RunDirName, m3RunFolder, m3TraceFileInfo, m3TraceMlsPath,
  recordM3Degradation, saveM3RunSummary, takeM3Degradations,
  type M3RunSummary,
} from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

const PROJECT = 102047;
const MODULE = 'controleEstoque';
const RUN = 'run_20261001143205';
const ROOT = `${MODULE}/pipeline/trace/agentMaterializeL2v3`;

/** Minimal stor: addOrUpdateFile (used by the real createStorFile) registers a file that keeps what setContent receives. */
function installStorStub(): { files: Record<string, any>; writes: string[] } {
  const files: Record<string, any> = {};
  const writes: string[] = [];
  const keyOf = (info: any) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`;
  g.mls = {
    actualProject: 1,
    events: { addEventListener() { /* noop */ }, removeEventListener() { /* noop */ }, dispatch() { /* noop */ } },
    stor: {
      files,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (params: any) => {
        const file: any = { ...params, status: 'new', content: '', getContent: async () => file.content };
        files[keyOf(params)] = file;
        return file;
      },
      localStor: {
        setContent: async (file: any, payload: { content: string }) => {
          file.content = payload.content;
          writes.push(keyOf(file));
        },
      },
    },
  };
  return { files, writes };
}

const summary: M3RunSummary = {
  moduleName: MODULE, agent: 'agentMaterializeL2v3', runDir: RUN, command: '', startedAt: null,
  finishedAt: '2026-10-01T14:40:00.000Z', verdict: 'completed', reason: 'ok', counts: {}, degradations: [],
};

test('m3RunDirName is UTC, never local time', () => {
  assert.equal(m3RunDirName(new Date(Date.UTC(2026, 9, 1, 14, 32, 5))), RUN);
});

test('m3NewRunDir throws M3_RUN_DIR_TAKEN when the name exists and returns it otherwise', () => {
  const now = new Date(Date.UTC(2026, 9, 1, 14, 32, 5));
  assert.throws(() => m3NewRunDir(now, ['run_20260101000000', RUN]), /M3_RUN_DIR_TAKEN: run_20261001143205/u);
  assert.equal(m3NewRunDir(now, ['run_20260101000000']), RUN);
});

test('folders and file info live at level 2 under the agent trace root', () => {
  assert.equal(m3RunFolder(MODULE, RUN, 'verify'), `${ROOT}/${RUN}/verify`);
  assert.equal(m3RunFolder(MODULE, RUN), `${ROOT}/${RUN}`);
  const info = m3TraceFileInfo(PROJECT, MODULE, RUN, 'summary', 'verify');
  assert.equal(info.level, 2);
  assert.equal(info.extension, '.json');
  assert.equal(info.folder, `${ROOT}/${RUN}/verify`);
  assert.equal(m3TraceMlsPath(PROJECT, MODULE, RUN, 'verify', 'x.json'), `_${PROJECT}_/l2/${ROOT}/${RUN}/verify/x.json`);
});

test('listM3RunDirs keeps only live run folders of this project, level and module, ascending and distinct', () => {
  const f = (over: Record<string, unknown>) => ({ project: PROJECT, level: 2, status: 'changed', folder: `${ROOT}/run_20260101000000`, ...over });
  const files = {
    a: f({ folder: `${ROOT}/run_20260301000000/verify` }),
    b: f({ folder: `${ROOT}/run_20260101000000` }),
    c: f({ folder: `${ROOT}/run_20260301000000` }),
    deleted: f({ status: 'deleted', folder: `${ROOT}/run_20260401000000` }),
    otherProject: f({ project: 1, folder: `${ROOT}/run_20260501000000` }),
    otherLevel: f({ level: 4, folder: `${ROOT}/run_20260601000000` }),
    otherModule: f({ folder: `outroModulo/pipeline/trace/agentMaterializeL2v3/run_20260701000000` }),
    badPattern: f({ folder: `${ROOT}/run_2026` }),
    badPattern2: f({ folder: `${ROOT}/latest` }),
    nothing: null,
  };
  const dirs = listM3RunDirs(files, PROJECT, MODULE);
  assert.deepEqual(dirs, ['run_20260101000000', 'run_20260301000000']);
  assert.equal(latestM3RunDir(dirs), 'run_20260301000000');
  assert.equal(latestM3RunDir([]), null);
});

test('saveM3RunSummary writes exactly one key, inside the run folder, shortName summary', async () => {
  const stub = installStorStub();
  const path = await saveM3RunSummary(PROJECT, summary);
  assert.equal(path, `_${PROJECT}_/l2/${ROOT}/${RUN}/summary.json`);
  const keys = Object.keys(stub.files);
  assert.deepEqual(keys, [`${PROJECT}:2:${ROOT}/${RUN}:summary:.json`]);
  const saved = JSON.parse(stub.files[keys[0]].content);
  assert.equal(saved.runDir, RUN);
  assert.equal(typeof saved.savedAt, 'string');
});

test('recordM3Degradation twice, then take returns both in order and a second take is empty', async () => {
  installStorStub();
  await recordM3Degradation(PROJECT, MODULE, RUN, 'first', 'one');
  await recordM3Degradation(PROJECT, MODULE, RUN, 'second', 'two', '_1_/l2/x.ts');
  const taken = await takeM3Degradations(PROJECT, MODULE, RUN);
  assert.deepEqual(taken.map(item => item.kind), ['first', 'second']);
  assert.equal(taken[1].path, '_1_/l2/x.ts');
  assert.deepEqual(await takeM3Degradations(PROJECT, MODULE, RUN), []);
});

test('degradations of two modules sharing the same runDir do not mix (memory fallback)', async () => {
  g.mls = undefined; // no stor: only the in-memory copy is available
  await recordM3Degradation(PROJECT, 'moduleA', RUN, 'a', 'from A');
  await recordM3Degradation(PROJECT, 'moduleB', RUN, 'b', 'from B');
  assert.deepEqual((await takeM3Degradations(PROJECT, 'moduleA', RUN)).map(item => item.kind), ['a']);
  assert.deepEqual((await takeM3Degradations(PROJECT, 'moduleB', RUN)).map(item => item.kind), ['b']);
});

test('the trace source never deletes and never points at the v1 trace', () => {
  const src = readFileSync(new URL('./m3Trace.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /deleteFile/u);
  assert.doesNotMatch(src, /pipeline\/trace\/l2/u);
  assert.doesNotMatch(src, /changefrontend/u);
});
