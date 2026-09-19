/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { normalizePoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P2_FLOW_STEP_IDS,
  P2_STEP_DEPENDS_ON,
  P2_WEB_DIR_EMPTY_LEFT,
  P2_WEB_DIR_REMOVED,
  buildP2PlannedSteps,
  executeP2Entry,
  isP2PoolMessageFile,
  loadP2Entry,
  markP2Complete,
  moduleTokenOk,
  ownerStepId,
  parseP2Invocation,
  parseP2StepPrompt,
  p2DifferentRequestsRefusal,
  p2InvocationRefusal,
  p2PipelineFile,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(
  path.join(HERE, '../steps/entry10/fixtures/pool-l2-mensalidadesAcademia.json'),
  'utf8',
)) as Record<string, unknown>;

const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const AT = new Date(Date.UTC(2026, 8, 18, 10, 30, 0));
const SHORT = '20260918103000_mensalidadesAcademia-20260918103000_1';
const DISPLAY = `l4/${MODULE}/pool/l2/${SHORT}.json`;

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

type Host = { files: Record<string, Stored>; deleted: string[] };

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function seed(host: Host, folder: string, shortName: string, content = '', level = 4): Stored {
  const file: Stored = {
    project: PROJECT, level, folder, shortName, extension: '.json',
    status: 'changed', versionRef: '1', content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function installHost(): Host {
  const host: Host = { files: {}, deleted: [] };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
        deleteFile: (file: Stored) => {
          host.deleted.push(`${file.folder}/${file.shortName}`);
          const stored = host.files[keyOf(file)];
          if (stored) stored.status = 'deleted';
        },
      },
    },
  };
  return host;
}

const L4_COMPLETE = JSON.stringify({
  schemaVersion: '2026-09-10-ns5-pipeline-v1',
  flowId: 'agentNewSolution5',
  moduleName: MODULE,
  status: 'complete',
  steps: {},
  sourcePrompt: '',
  invocation: { fast: false, module: MODULE, rebuildAll: false },
  updatedAt: AT.toISOString(),
});

function seedReady(host: Host, message: unknown = FIXTURE, extraShort?: string): void {
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l2`, SHORT, `${JSON.stringify(message, null, 2)}\n`);
  if (extraShort) seed(host, `${MODULE}/pool/l2`, extraShort, `${JSON.stringify(message, null, 2)}\n`);
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 2);
}

void test('parseP2Invocation reads the module token and strips the agent prefix', () => {
  assert.equal(parseP2Invocation('@@agentPlannerL2 mensalidadesAcademia').module, MODULE);
  assert.equal(parseP2Invocation('mensalidadesAcademia').module, MODULE);
  assert.equal(parseP2Invocation('@@_102020_/l2/agentPlannerL2 mensalidadesAcademia').module, MODULE);
  assert.equal(parseP2Invocation('').module, '');
});

void test('p2InvocationRefusal refuses a missing or non-lowerCamel module', () => {
  assert.equal(p2InvocationRefusal({ module: MODULE }), '');
  assert.match(p2InvocationRefusal({ module: '' }), /Pass @@agentPlannerL2/);
  assert.match(p2InvocationRefusal({ module: 'MensalidadesAcademia' }), /lowerCamel/);
  assert.match(p2InvocationRefusal({ module: 'mensalidades-academia' }), /lowerCamel/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk(MODULE), true);
  assert.equal(moduleTokenOk('stockControl'), true);
  assert.equal(moduleTokenOk('MensalidadesAcademia'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is two sequential steps with entry10 first', () => {
  const steps = buildP2PlannedSteps(MODULE, { thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY });
  assert.equal(steps.length, 2);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...P2_FLOW_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.deepEqual(steps[0].planning?.dependsOn, []);
  for (const step of steps.slice(1)) {
    assert.equal(step.status, 'waiting_dependency');
    assert.equal(step.agentName, 'agentPlannerL2');
  }
  assert.deepEqual(steps.find(step => step.planning?.planId === 'menu20')?.planning?.dependsOn, [...P2_STEP_DEPENDS_ON.menu20]);
});

void test('ownerStepId maps L4 dispatch prompt to entry10 and ignores done-anchors', () => {
  const l4Prompt = JSON.stringify({ moduleName: MODULE, thread: 't-20260918103000', file: DISPLAY });
  assert.equal(ownerStepId('entry10'), 'entry10');
  assert.equal(ownerStepId('entry10-done'), '');
  assert.equal(ownerStepId('entry10-done', l4Prompt), '');
  assert.equal(ownerStepId('menu20-repair-1'), 'menu20');
  assert.equal(ownerStepId('workspaces20-repair-1'), 'workspaces20');
  assert.equal(ownerStepId('', l4Prompt), 'entry10');
  assert.equal(ownerStepId('', JSON.stringify({ moduleName: MODULE })), '');
});

void test('parseP2StepPrompt distinguishes L4 dispatch from a planned entry10', () => {
  assert.deepEqual(
    parseP2StepPrompt(JSON.stringify({ moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY })),
    { kind: 'step', moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY },
  );
  assert.deepEqual(parseP2StepPrompt(JSON.stringify({ planId: 'entry10', moduleName: MODULE })), { kind: 'entry', moduleName: MODULE });
  assert.equal(parseP2StepPrompt('not-json').kind, 'refusal');
});

void test('fixture of the pool/l2 message is a valid PoolMessage', () => {
  const message = normalizePoolMessage(FIXTURE);
  assert.equal(message.from, 'l4');
  assert.equal(message.to, 'l2');
  assert.equal(message.thread, 'mensalidadesAcademia-20260918103000');
  assert.equal(message.round, 1);
  assert.equal(message.mode, 'implement');
});

void test('loadP2Entry refuses when l4 is missing, not complete, or pool/l2 is empty', async () => {
  installHost();
  const missing = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in missing && missing.refusal, `Module "${MODULE}" has no complete l4.`);

  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE.replace('"complete"', '"inProgress"'));
  const incomplete = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in incomplete && incomplete.refusal, `Module "${MODULE}" has no complete l4.`);

  const empty = installHost();
  seed(empty, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  const pending = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in pending && pending.refusal, `nothing pending for ${MODULE} in pool/l2`);
});

void test('hand entry picks the oldest pool/l2 message by name', async () => {
  const host = installHost();
  seedReady(host, FIXTURE, '20260918120000_mensalidadesAcademia-20260918103000_1');
  const loaded = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded, false);
  if ('refusal' in loaded) return;
  assert.equal(loaded.file.shortName, SHORT);
  assert.equal(loaded.message.thread, 'mensalidadesAcademia-20260918103000');
});

void test('hand entry and L4 step entry converge on the same pipeline.json', async () => {
  const host = installHost();
  seedReady(host);
  const hand = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in hand, false);
  if ('refusal' in hand) return;

  const l2Key = keyOf(p2PipelineFile(MODULE));
  delete host.files[l2Key];
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 2);

  const step = await executeP2Entry({
    kind: 'step',
    moduleName: MODULE,
    thread: 'mensalidadesAcademia-20260918103000',
    file: DISPLAY,
  }, AT);
  assert.equal('refusal' in step, false);
  if ('refusal' in step) return;

  assert.deepEqual(step.pipeline, hand.pipeline);
  assert.equal(step.pipeline.thread, 'mensalidadesAcademia-20260918103000');
  assert.equal(step.pipeline.round, 1);
  assert.equal(step.pipeline.messageFile, DISPLAY);
  assert.equal(step.pipeline.steps.entry10?.status, 'approved');
  assert.equal(step.pipeline.flowId, 'agentPlannerL2');
  assert.equal(JSON.parse(host.files[l2Key].content).thread, 'mensalidadesAcademia-20260918103000');
});

void test('identical pool/l2 messages are one request and sourceMessages lists both', async () => {
  const host = installHost();
  seedReady(host, FIXTURE, '20260918120000_mensalidadesAcademia-20260918103000_1');
  const loaded = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded, false);
  if ('refusal' in loaded) return;
  assert.deepEqual(loaded.sourceMessages, [
    `${SHORT}.json`,
    '20260918120000_mensalidadesAcademia-20260918103000_1.json',
  ]);
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, false);
  if ('refusal' in written) return;
  assert.deepEqual(written.pipeline.sourceMessages, loaded.sourceMessages);
});

void test('two different pool/l2 requests refuse with a clear message', async () => {
  const host = installHost();
  seedReady(host);
  const other = { ...FIXTURE, mode: 'estimate', artifacts: ['module.defs.ts'] };
  seed(host, `${MODULE}/pool/l2`, '20260918120000_mensalidadesAcademia-20260918103000_1', `${JSON.stringify(other, null, 2)}\n`);
  const loaded = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded && loaded.refusal, p2DifferentRequestsRefusal(2));
  assert.match(String('refusal' in loaded ? loaded.refusal : ''), /pool\/l2 has 2 different requests; resolve with the l4 supervisor/);
});

void test('menu.json is not a pool message and does not count as pending', async () => {
  assert.equal(isP2PoolMessageFile('menu'), false);
  assert.equal(isP2PoolMessageFile(SHORT), true);
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l2`, 'menu', '{"schemaVersion":"x"}\n');
  const pending = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in pending && pending.refusal, `nothing pending for ${MODULE} in pool/l2`);
});

void test('re-execution wipes l2 pipeline drafts and web, keeps pool messages, rewrites pipeline.json', async () => {
  const host = installHost();
  seedReady(host);
  seed(host, `${MODULE}/web/contracts`, 'matriculas', 'old contract\n', 2);
  seed(host, `${MODULE}/pipeline`, 'workspaces20-draft', '{}\n', 2);
  const poolKey = keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json' });
  const beforePool = host.files[poolKey].content;
  const first = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in first, false);
  if ('refusal' in first) return;
  const webKey = keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'matriculas', extension: '.json' });
  assert.equal(host.files[webKey].status, 'deleted');
  const draftKey = keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/pipeline`, shortName: 'workspaces20-draft', extension: '.json' });
  assert.equal(host.files[draftKey].status, 'deleted');
  assert.equal(host.files[poolKey].content, beforePool);
  assert.equal(host.files[poolKey].status, 'changed');

  const later = new Date(Date.UTC(2026, 8, 19, 10, 0, 0));
  const second = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, later);
  assert.equal('refusal' in second, false);
  if ('refusal' in second) return;
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { updatedAt: string; sourceMessages: string[]; steps: { entry10: { status: string } }; webDir: string; status: string };
  assert.equal(pipeline.updatedAt, later.toISOString());
  assert.deepEqual(pipeline.sourceMessages, [`${SHORT}.json`]);
  assert.equal(pipeline.steps.entry10.status, 'approved');
  assert.equal(pipeline.status, 'inProgress');
  assert.equal(pipeline.webDir, P2_WEB_DIR_EMPTY_LEFT);
  assert.equal(host.files[poolKey].content, beforePool);
});

void test('entry10 records webDir empty-left when host cannot remove directories', async () => {
  const host = installHost();
  seedReady(host);
  seed(host, `${MODULE}/web/contracts`, 'stale', '', 2);
  seed(host, `${MODULE}/web/shared`, 'stale', '', 2);
  assert.equal(typeof (mls.stor.localStor as { removeDir?: unknown }).removeDir, 'undefined');
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, false);
  if ('refusal' in written) return;
  assert.equal(written.pipeline.webDir, P2_WEB_DIR_EMPTY_LEFT);
  assert.equal(written.pipeline.status, 'inProgress');
  const contractsKey = keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'stale', extension: '.json' });
  const sharedKey = keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/web/shared`, shortName: 'stale', extension: '.json' });
  assert.equal(host.files[contractsKey].status, 'deleted');
  assert.equal(host.files[sharedKey].status, 'deleted');
  assert.equal(JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content).webDir, P2_WEB_DIR_EMPTY_LEFT);
});

void test('entry10 sets webDir removed when the host exposes removeDir', async () => {
  const host = installHost();
  const removed: string[] = [];
  (mls.stor.localStor as unknown as { removeDir: (project: number, level: number, folder: string) => void }).removeDir = (project, level, folder) => {
    removed.push(`${project}:${level}:${folder}`);
  };
  seedReady(host);
  seed(host, `${MODULE}/web/contracts`, 'stale', '', 2);
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, false);
  if ('refusal' in written) return;
  assert.equal(written.pipeline.webDir, P2_WEB_DIR_REMOVED);
  assert.deepEqual(removed, [`${PROJECT}:2:${MODULE}/web`]);
});

function samplePipeline(extra: Partial<P2PipelineState> = {}): P2PipelineState {
  return {
    schemaVersion: '2026-09-18-p2-pipeline-v2',
    flowId: 'agentPlannerL2',
    moduleName: MODULE,
    status: 'inProgress',
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
    },
    thread: 'mensalidadesAcademia-20260918103000',
    round: 1,
    messageFile: DISPLAY,
    sourceMessages: [`${SHORT}.json`],
    webDir: P2_WEB_DIR_EMPTY_LEFT,
    updatedAt: AT.toISOString(),
    ...extra,
  };
}

void test('markP2Complete sets complete only when every flow.json step is approved', () => {
  const now = '2026-09-19T12:00:00.000Z';
  const onlyEntry = markP2Complete(samplePipeline(), now);
  assert.equal(onlyEntry.status, 'inProgress');
  assert.equal(onlyEntry.updatedAt, AT.toISOString());

  const both = markP2Complete(samplePipeline({
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(both.status, 'complete');
  assert.equal(both.awaitingStep, undefined);
  assert.equal(both.updatedAt, now);

  const failed = markP2Complete(samplePipeline({
    status: 'failed',
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(failed.status, 'failed');
});

void test('L4 step entry refuses a thread that does not match the file', async () => {
  const host = installHost();
  seedReady(host);
  const result = await loadP2Entry({
    kind: 'step',
    moduleName: MODULE,
    thread: 'mensalidadesAcademia-19990101000000',
    file: DISPLAY,
  });
  assert.equal('refusal' in result && /thread does not match/.test(result.refusal), true);
});
