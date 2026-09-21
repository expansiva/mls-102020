/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { moduleFolder, setModuleRoot } from '/_102035_/l2/solution/fs.js';
import { normalizePoolMessage } from '/_102035_/l2/solution/pool.js';
import {
  P2_DEFAULT_CANDIDATE_REL,
  P2_EFFORT_FLOW_STEP_IDS,
  P2_FLOW_STEP_IDS,
  P2_MENU_FLOW_STEP_IDS,
  P2_STEP_DEPENDS_ON,
  P2_WEB_DIR_EMPTY_LEFT,
  P2_WEB_DIR_REMOVED,
  buildP2PlannedSteps,
  executeP2Entry,
  isP2EffortMessage,
  isP2MenuDevice,
  isP2PoolMessageFile,
  loadP2Entry,
  markP2Complete,
  moduleTokenOk,
  ownerStepId,
  parseP2Invocation,
  parseP2StepPrompt,
  p2BackendFile,
  p2DifferentRequestsRefusal,
  p2EffortFile,
  p2InvocationRefusal,
  p2MenuFile,
  p2NeedsFile,
  p2PipelineFile,
  P2_MENU_DEVICE,
  plannedP2StepIds,
  readReadyL2Manifest,
  resolveCandidateFolder,
  type P2PipelineState,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  changedOutside,
  diffTrees,
  snapshotEntries,
} from '/_102020_/l2/agentPlannerL2/helpers/treeFingerprint.js';

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

function seed(host: Host, folder: string, shortName: string, content = '', level = 4, extension = '.json'): Stored {
  const file: Stored = {
    project: PROJECT, level, folder, shortName, extension,
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
  const parsed = parseP2Invocation('@@agentPlannerL2 mensalidadesAcademia');
  assert.equal(parsed.module, MODULE);
  assert.equal(parsed.candidate, '');
  assert.equal(parsed.hasCandidate, false);
  assert.equal(parseP2Invocation('mensalidadesAcademia').module, MODULE);
  assert.equal(parseP2Invocation('@@_102020_/l2/agentPlannerL2 mensalidadesAcademia').module, MODULE);
  assert.equal(parseP2Invocation('').module, '');
});

void test('p2InvocationRefusal refuses a missing or non-lowerCamel module', () => {
  assert.equal(p2InvocationRefusal({ module: MODULE, candidate: '', hasCandidate: false }), '');
  assert.match(p2InvocationRefusal({ module: '', candidate: '', hasCandidate: false }), /Pass @@agentPlannerL2/);
  assert.match(p2InvocationRefusal({ module: 'MensalidadesAcademia', candidate: '', hasCandidate: false }), /lowerCamel/);
  assert.match(p2InvocationRefusal({ module: 'mensalidades-academia', candidate: '', hasCandidate: false }), /lowerCamel/);
});

void test('parseP2Invocation /candidate alone points at <mod>/tobe/plan', () => {
  const parsed = parseP2Invocation('@@agentPlannerL2 mensalidadesAcademia /candidate');
  assert.equal(parsed.module, MODULE);
  assert.equal(parsed.hasCandidate, true);
  assert.equal(parsed.candidate, `${MODULE}/${P2_DEFAULT_CANDIDATE_REL}`);
  assert.equal(resolveCandidateFolder(MODULE, ''), `${MODULE}/tobe/plan`);
});

void test('parseP2Invocation /candidate with a relative root keeps the module token', () => {
  const parsed = parseP2Invocation('mensalidadesAcademia /candidate pipeline/changes/c1/revisions/r1/l4');
  assert.equal(parsed.module, MODULE);
  assert.equal(parsed.hasCandidate, true);
  assert.equal(parsed.candidate, `${MODULE}/pipeline/changes/c1/revisions/r1/l4`);
});

void test('p2InvocationRefusal refuses a candidate path with ..', () => {
  const parsed = parseP2Invocation(`${MODULE} /candidate ../evil`);
  assert.equal(parsed.hasCandidate, true);
  assert.equal(parsed.candidate, '');
  assert.match(p2InvocationRefusal(parsed), /must not contain '\.\.'/);
});

void test('moduleTokenOk accepts lowerCamel only', () => {
  assert.equal(moduleTokenOk(MODULE), true);
  assert.equal(moduleTokenOk('stockControl'), true);
  assert.equal(moduleTokenOk('MensalidadesAcademia'), false);
  assert.equal(moduleTokenOk(''), false);
});

void test('planned tree is the menu conversation unless the message is l1 backend.json', () => {
  const steps = buildP2PlannedSteps(MODULE, { thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY });
  assert.equal(steps.length, 3);
  assert.deepEqual(steps.map(step => step.planning?.planId), [...P2_MENU_FLOW_STEP_IDS]);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.deepEqual(steps[0].planning?.dependsOn, []);
  for (const step of steps.slice(1)) {
    assert.equal(step.status, 'waiting_dependency');
    assert.equal(step.agentName, 'agentPlannerL2');
  }
  assert.deepEqual(steps.find(step => step.planning?.planId === 'menu20')?.planning?.dependsOn, [...P2_STEP_DEPENDS_ON.menu20]);
  assert.deepEqual(steps.find(step => step.planning?.planId === 'needs30')?.planning?.dependsOn, [...P2_STEP_DEPENDS_ON.needs30]);
  assert.deepEqual([...P2_FLOW_STEP_IDS], ['entry10', 'menu20', 'needs30', 'effort40']);
  assert.equal(
    steps[0].prompt,
    JSON.stringify({ planId: 'entry10', moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY }),
  );
  const withFlag = buildP2PlannedSteps(MODULE, {
    thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY, candidate: `${MODULE}/tobe/plan`,
  });
  assert.equal(
    withFlag[0].prompt,
    JSON.stringify({
      planId: 'entry10', moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY,
      candidate: `${MODULE}/tobe/plan`,
    }),
  );
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
    { kind: 'step', moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY, candidate: '' },
  );
  assert.deepEqual(
    parseP2StepPrompt(JSON.stringify({ planId: 'entry10', moduleName: MODULE })),
    { kind: 'entry', moduleName: MODULE, candidate: '' },
  );
  assert.deepEqual(
    parseP2StepPrompt(JSON.stringify({
      moduleName: MODULE, thread: 't-20260918103000', file: DISPLAY, candidate: `${MODULE}/tobe/plan`,
    })),
    { kind: 'step', moduleName: MODULE, thread: 't-20260918103000', file: DISPLAY, candidate: `${MODULE}/tobe/plan` },
  );
  assert.equal(parseP2StepPrompt('not-json').kind, 'refusal');
  const dotdot = parseP2StepPrompt(JSON.stringify({
    moduleName: MODULE, thread: 't-20260918103000', file: DISPLAY, candidate: '../evil',
  }));
  assert.equal(dotdot.kind, 'refusal');
  if (dotdot.kind === 'refusal') assert.match(dotdot.refusal, /must not contain '\.\.'/);
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

void test('p2MenuFile is pool/l2/<device>/menu.json', () => {
  installHost();
  assert.equal(isP2MenuDevice('web'), true);
  assert.equal(isP2MenuDevice('ios'), false);
  assert.deepEqual(p2MenuFile(MODULE), {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l2/${P2_MENU_DEVICE}`,
    shortName: 'menu',
    extension: '.json',
  });
});

void test('p2NeedsFile is pool/l1/<device>/needs.json', () => {
  installHost();
  assert.deepEqual(p2NeedsFile(MODULE), {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l1/${P2_MENU_DEVICE}`,
    shortName: 'needs',
    extension: '.json',
  });
});

void test('p2BackendFile and p2EffortFile live under pool/l2/<device>/', () => {
  installHost();
  assert.deepEqual(p2BackendFile(MODULE), {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l2/${P2_MENU_DEVICE}`,
    shortName: 'backend',
    extension: '.json',
  });
  assert.deepEqual(p2EffortFile(MODULE), {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l2/${P2_MENU_DEVICE}`,
    shortName: 'effort',
    extension: '.json',
  });
});

void test('readReadyL2Manifest returns null while the built manifesto does not exist', () => {
  assert.equal(readReadyL2Manifest(MODULE), null);
  assert.equal(readReadyL2Manifest(MODULE, P2_MENU_DEVICE), null);
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

  const menuOnly = markP2Complete(samplePipeline({
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(menuOnly.status, 'inProgress');

  const withoutEffort = markP2Complete(samplePipeline({
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
      needs30: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(withoutEffort.status, 'inProgress');

  const all = markP2Complete(samplePipeline({
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
      needs30: { status: 'approved', updatedAt: now },
      effort40: { status: 'approved', updatedAt: now },
    },
  }), now);
  assert.equal(all.status, 'complete');
  assert.equal(all.awaitingStep, undefined);
  assert.equal(all.updatedAt, now);

  const failed = markP2Complete(samplePipeline({
    status: 'failed',
    steps: {
      entry10: { status: 'approved', updatedAt: AT.toISOString() },
      menu20: { status: 'approved', updatedAt: now },
      needs30: { status: 'approved', updatedAt: now },
      effort40: { status: 'approved', updatedAt: now },
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

const L1_FIXTURE = JSON.parse(readFileSync(
  path.join(HERE, '../steps/effort40/fixtures/pool-l2-backend-mensalidadesAcademia.json'),
  'utf8',
)) as Record<string, unknown>;
const L1_SHORT = '20260921120000_mensalidadesAcademia-20260918103000_1';
const L1_DISPLAY = `l4/${MODULE}/pool/l2/${L1_SHORT}.json`;
const MENU_FIXTURE = readFileSync(path.join(HERE, '../steps/needs30/fixtures/menu.json'), 'utf8');

function seedEffort(host: Host, opts?: { pipeline?: boolean; menu?: boolean; draft?: boolean }): void {
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l2`, SHORT, `${JSON.stringify(FIXTURE, null, 2)}\n`);
  seed(host, `${MODULE}/pool/l2`, L1_SHORT, `${JSON.stringify(L1_FIXTURE, null, 2)}\n`);
  if (opts?.menu !== false) {
    seed(host, `${MODULE}/pool/l2/web`, 'menu', `${MENU_FIXTURE}\n`);
  }
  if (opts?.pipeline !== false) {
    seed(host, `${MODULE}/pipeline`, 'pipeline', `${JSON.stringify({
      schemaVersion: '2026-09-18-p2-pipeline-v2',
      flowId: 'agentPlannerL2',
      moduleName: MODULE,
      status: 'complete',
      steps: {
        entry10: { status: 'approved', updatedAt: AT.toISOString() },
        menu20: { status: 'approved', updatedAt: AT.toISOString() },
        needs30: { status: 'approved', updatedAt: AT.toISOString() },
      },
      thread: 'mensalidadesAcademia-20260918103000',
      round: 1,
      messageFile: DISPLAY,
      sourceMessages: [`${SHORT}.json`],
      webDir: P2_WEB_DIR_EMPTY_LEFT,
      device: 'web',
      updatedAt: AT.toISOString(),
    }, null, 2)}\n`, 2);
  } else {
    seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 2);
  }
  if (opts?.draft) {
    seed(host, `${MODULE}/pipeline`, 'workspaces20-draft', '{}\n', 2);
  }
}

void test('l1 backend.json is an effort message and plans entry10 plus effort40', () => {
  const message = normalizePoolMessage(L1_FIXTURE);
  assert.equal(isP2EffortMessage(message), true);
  assert.equal(isP2EffortMessage(normalizePoolMessage(FIXTURE)), false);
  assert.deepEqual([...plannedP2StepIds(message)], [...P2_EFFORT_FLOW_STEP_IDS]);
  assert.deepEqual(
    buildP2PlannedSteps(MODULE, { thread: message.thread, file: L1_DISPLAY }, message).map(step => step.planning?.planId),
    [...P2_EFFORT_FLOW_STEP_IDS],
  );
});

void test('l4 request plus l1 backend.json is one effort partition, not two different requests', async () => {
  const host = installHost();
  seedEffort(host);
  const loaded = await loadP2Entry({ kind: 'hand', moduleName: MODULE });
  assert.equal('refusal' in loaded, false);
  if ('refusal' in loaded) return;
  assert.equal(loaded.branch, 'effort');
  assert.equal(loaded.message.from, 'l1');
  assert.equal(loaded.file.shortName, L1_SHORT);
  assert.deepEqual(loaded.sourceMessages, [`${L1_SHORT}.json`]);
});

void test('effort entry does not wipe pipeline scratch and keeps menu20/needs30', async () => {
  const host = installHost();
  seedEffort(host, { draft: true });
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, false);
  if ('refusal' in written) return;
  const draftKey = keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/pipeline`, shortName: 'workspaces20-draft', extension: '.json' });
  assert.equal(host.files[draftKey].status, 'changed');
  assert.equal(written.pipeline.steps.menu20?.status, 'approved');
  assert.equal(written.pipeline.steps.needs30?.status, 'approved');
  assert.equal(written.pipeline.steps.entry10?.status, 'approved');
  assert.equal(written.pipeline.status, 'inProgress');
  assert.equal(written.pipeline.messageFile, L1_DISPLAY);
});

void test('effort entry refuses without an l2 pipeline from the menu flow', async () => {
  const host = installHost();
  seedEffort(host, { pipeline: false });
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, true);
  if (!('refusal' in written)) return;
  assert.match(written.refusal, /pipeline.json is missing/);
});

void test('effort entry refuses without menu.json', async () => {
  const host = installHost();
  seedEffort(host, { menu: false });
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in written, true);
  if (!('refusal' in written)) return;
  assert.match(written.refusal, /menu.json is missing/);
});

const CANDIDATE = `${MODULE}/tobe/plan`;
const CANONICAL_MARKER = 'CANONICAL-must-not-move';

function hostSnapshot(host: Host) {
  return snapshotEntries(
    Object.values(host.files)
      .filter(file => file.status !== 'deleted')
      .map(file => ({
        rel: `l${file.level}/${file.folder}/${file.shortName}${file.extension}`,
        fingerprint: `${file.status}\0${file.content}`,
      })),
  );
}

function seedCandidate(host: Host): void {
  seed(host, `${CANDIDATE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${CANDIDATE}/pool/l2`, SHORT, `${JSON.stringify(FIXTURE, null, 2)}\n`);
  seed(host, `${CANDIDATE}/pipeline`, 'pipeline', '{}\n', 2);
}

void test('without /candidate moduleFolder is the canonical name and the pipeline lands there', async () => {
  const host = installHost();
  seedReady(host);
  const result = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in result, false);
  if ('refusal' in result) return;
  assert.equal(moduleFolder(MODULE), MODULE);
  assert.deepEqual(p2PipelineFile(MODULE).folder, `${MODULE}/pipeline`);
  assert.equal(p2PipelineFile(MODULE).level, 2);
  assert.ok(host.files[keyOf(p2PipelineFile(MODULE))].content.includes('"flowId": "agentPlannerL2"'));
  assert.deepEqual(result.pipeline.steps.entry10?.artifactPaths, [`l2/${MODULE}/pipeline/pipeline.json`]);
});

void test('with /candidate pipeline and scratch wipe stay in the override; canonical l2/l4/l1 are untouched', async () => {
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, MODULE, 'module', CANONICAL_MARKER, 4, '.defs.ts');
  seed(host, `${MODULE}/pipeline`, 'pipeline', '"canonical-l2-pipeline"\n', 2);
  seed(host, `${MODULE}/pipeline`, 'menu20-draft', '"canonical-draft"\n', 2);
  seed(host, `${MODULE}/web/contracts`, 'matriculas', '"canonical-web"\n', 2);
  seed(host, `${MODULE}/pipeline`, 'pipeline', '"canonical-l1-pipeline"\n', 1);
  seedCandidate(host);
  seed(host, `${CANDIDATE}/pipeline`, 'menu20-draft', '"candidate-draft"\n', 2);
  seed(host, `${CANDIDATE}/web/contracts`, 'matriculas', '"candidate-web"\n', 2);
  const before = hostSnapshot(host);

  const result = await executeP2Entry({ kind: 'hand', moduleName: MODULE, candidate: CANDIDATE }, AT);
  assert.equal('refusal' in result, false);
  if ('refusal' in result) return;
  assert.equal(moduleFolder(MODULE), CANDIDATE);
  assert.equal(p2PipelineFile(MODULE).folder, `${CANDIDATE}/pipeline`);
  assert.ok(host.files[keyOf(p2PipelineFile(MODULE))].content.includes('"flowId": "agentPlannerL2"'));
  assert.deepEqual(result.pipeline.steps.entry10?.artifactPaths, [`l2/${CANDIDATE}/pipeline/pipeline.json`]);

  assert.equal(host.files[keyOf({ project: PROJECT, level: 4, folder: MODULE, shortName: 'module', extension: '.defs.ts' })].content, CANONICAL_MARKER);
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/pipeline`, shortName: 'pipeline', extension: '.json' })].content, '"canonical-l2-pipeline"\n');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/pipeline`, shortName: 'pipeline', extension: '.json' })].status, 'changed');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/pipeline`, shortName: 'menu20-draft', extension: '.json' })].status, 'changed');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'matriculas', extension: '.json' })].status, 'changed');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 1, folder: `${MODULE}/pipeline`, shortName: 'pipeline', extension: '.json' })].content, '"canonical-l1-pipeline"\n');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${CANDIDATE}/pipeline`, shortName: 'menu20-draft', extension: '.json' })].status, 'deleted');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${CANDIDATE}/web/contracts`, shortName: 'matriculas', extension: '.json' })].status, 'deleted');

  const after = hostSnapshot(host);
  const diff = diffTrees(before, after);
  assert.deepEqual(
    changedOutside(diff, [`l4/${CANDIDATE}`, `l2/${CANDIDATE}`, `l1/${CANDIDATE}`]),
    [],
  );
});

void test('candidate path with .. refuses and does not set the module root', async () => {
  const host = installHost();
  seedReady(host);
  setModuleRoot(MODULE, CANDIDATE);
  const result = await loadP2Entry({ kind: 'hand', moduleName: MODULE, candidate: '../evil' });
  assert.equal('refusal' in result && /must not contain '\.\.'/.test(result.refusal), true);
  assert.equal(moduleFolder(MODULE), MODULE);
});

void test('a later task without /candidate does not inherit the previous module root', async () => {
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seedCandidate(host);
  const first = await executeP2Entry({ kind: 'hand', moduleName: MODULE, candidate: CANDIDATE }, AT);
  assert.equal('refusal' in first, false);
  if ('refusal' in first) return;
  assert.equal(moduleFolder(MODULE), CANDIDATE);

  seedReady(host);
  const second = await executeP2Entry({ kind: 'hand', moduleName: MODULE }, AT);
  assert.equal('refusal' in second, false);
  if ('refusal' in second) return;
  assert.equal(moduleFolder(MODULE), MODULE);
  assert.equal(p2PipelineFile(MODULE).folder, `${MODULE}/pipeline`);
  assert.ok(host.files[keyOf(p2PipelineFile(MODULE))].content.includes('"flowId": "agentPlannerL2"'));
});

void test('with /candidate removeDir targets the override web folder, not the canonical one', async () => {
  const host = installHost();
  const removed: string[] = [];
  (mls.stor.localStor as unknown as { removeDir: (project: number, level: number, folder: string) => void }).removeDir = (_project, _level, folder) => {
    removed.push(folder);
  };
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/web/contracts`, 'stale', '', 2);
  seedCandidate(host);
  seed(host, `${CANDIDATE}/web/contracts`, 'stale', '', 2);
  const written = await executeP2Entry({ kind: 'hand', moduleName: MODULE, candidate: CANDIDATE }, AT);
  assert.equal('refusal' in written, false);
  if ('refusal' in written) return;
  assert.equal(written.pipeline.webDir, P2_WEB_DIR_REMOVED);
  assert.deepEqual(removed, [`${CANDIDATE}/web`]);
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'stale', extension: '.json' })].status, 'changed');
  assert.equal(host.files[keyOf({ project: PROJECT, level: 2, folder: `${CANDIDATE}/web/contracts`, shortName: 'stale', extension: '.json' })].status, 'deleted');
});
