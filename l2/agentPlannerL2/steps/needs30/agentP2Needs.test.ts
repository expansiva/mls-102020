/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/agentP2Needs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { p2NeedsFile, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  beforeP2NeedsPromptStep,
  executeP2Needs,
} from '/_102020_/l2/agentPlannerL2/steps/needs30/agentP2Needs.js';
import type { P2NeedsFile } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { poolStamp, readPoolTraceAt, type PoolMessage } from '/_102035_/l2/solution/pool.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKFLOWS_FIXTURE = path.join(HERE, '../menu20/fixtures/workflows.defs.ts');
const MENU_PATH = path.join(HERE, 'fixtures/menu.json');
const RECEIVED_PATH = path.join(HERE, '../entry10/fixtures/pool-l2-mensalidadesAcademia.json');
const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));
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

function seed(host: Host, opts: { project?: number; level?: number; folder: string; shortName: string; extension?: string; content?: string }): Stored {
  const file: Stored = {
    project: opts.project ?? PROJECT,
    level: opts.level ?? 4,
    folder: opts.folder,
    shortName: opts.shortName,
    extension: opts.extension ?? '.json',
    status: 'changed',
    versionRef: '1',
    content: opts.content ?? '',
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
      addOrUpdateFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string; source?: string }) => {
        return seed(host, {
          project: info.project,
          level: info.level,
          folder: info.folder,
          shortName: info.shortName,
          extension: info.extension,
          content: info.source || '',
        });
      },
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

function seedL4(host: Host): void {
  const put = (folder: string, shortName: string, rel: string, extension = '.defs.ts', root = L4_FIXTURE) => {
    seed(host, { folder, shortName, extension, content: readFileSync(path.join(root, rel), 'utf8') });
  };
  put(MODULE, 'module', 'module.defs.ts');
  put(MODULE, 'access', 'access.defs.ts');
  put(MODULE, 'workflows', 'workflows.defs.ts', '.defs.ts', path.dirname(WORKFLOWS_FIXTURE));
  put(`${MODULE}/journeys`, 'index', 'journeys/index.defs.ts');
  for (const name of readdirSync(path.join(L4_FIXTURE, 'journeys')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/journeys`, name.replace(/\.defs\.ts$/, ''), `journeys/${name}`);
  }
  put(`${MODULE}/ontology`, 'index', 'ontology/index.defs.ts');
  for (const name of readdirSync(path.join(L4_FIXTURE, 'ontology')).filter(item => item.endsWith('.defs.ts') && item !== 'index.defs.ts')) {
    put(`${MODULE}/ontology`, name.replace(/\.defs\.ts$/, ''), `ontology/${name}`);
  }
}

function seedReady(host: Host): void {
  seedL4(host);
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: SHORT,
    content: `${JSON.stringify({ ...JSON.parse(readFileSync(RECEIVED_PATH, 'utf8')) as Record<string, unknown>, mode: 'estimate' }, null, 2)}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2/web`,
    shortName: 'menu',
    content: `${readFileSync(MENU_PATH, 'utf8')}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l1/web`,
    shortName: 'needs',
    content: '',
  });
  const stamp = poolStamp(AT);
  seed(host, {
    folder: `${MODULE}/pool/l1`,
    shortName: `${stamp}_mensalidadesAcademia-20260918103000_1`,
    content: '',
  });
  seed(host, {
    level: 4,
    folder: `${MODULE}/pool/l2`,
    shortName: 'pipeline',
    content: `${JSON.stringify({
      schemaVersion: '2026-09-18-p2-pipeline-v2',
      flowId: 'agentPlannerL2',
      moduleName: MODULE,
      status: 'inProgress',
      steps: {
        entry10: { status: 'approved', updatedAt: AT.toISOString() },
        menu20: { status: 'approved', updatedAt: AT.toISOString() },
      },
      thread: 'mensalidadesAcademia-20260918103000',
      round: 1,
      messageFile: DISPLAY,
      sourceMessages: [`${SHORT}.json`],
      webDir: 'preserved',
      device: 'web',
      updatedAt: AT.toISOString(),
    }, null, 2)}\n`,
  });
}

function agentMeta(): IAgentMeta {
  return {
    agentName: 'agentPlannerL2',
    agentProject: 102020,
    agentFolder: 'agentPlannerL2',
    agentDescription: 'test',
    visibility: 'public',
  };
}

function contextWith(steps: mls.msg.AIPayload[] = []): mls.msg.ExecutionContext {
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: `plan l2 ${MODULE}`,
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentPlannerL2',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  return {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '', senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: { moduleName: MODULE } } },
  } as unknown as mls.msg.ExecutionContext;
}

void test('needs30 is deterministic and has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('createAgent registers needs30 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.needs30?.beforePromptStep, beforeP2NeedsPromptStep);
});

void test('execute writes needs.json and response, traces processed+delivered, then deletes its input', async () => {
  const host = installHost();
  seedReady(host);
  const result = await executeP2Needs(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p2NeedsFile(MODULE))].content) as P2NeedsFile;
  assert.equal(written.schemaVersion, '2026-09-21-p2-needs-v1');
  assert.equal(result.needsPath, `l4/${MODULE}/pool/l1/web/needs.json`);
  const payments = written.pages.find(page => page.pageId === 'mensalidades_pagamentos');
  assert.ok(payments);
  assert.deepEqual(payments.reads.map(item => item.entity), ['Matricula', 'Mensalidade', 'Pagamento']);
  assert.deepEqual(payments.writes.map(item => `${item.entity}:${item.operation}`), ['Pagamento:create']);

  const message = JSON.parse(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`,
    shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260918103000_1`, extension: '.json',
  })].content) as PoolMessage;
  assert.equal(message.from, 'l2');
  assert.equal(message.to, 'l1');
  assert.equal(message.subject, 'needs of mensalidadesAcademia (web)');
  assert.deepEqual(message.artifacts, ['pool/l1/web/needs.json']);

  const trace = await readPoolTraceAt(p2PipelineFile(MODULE));
  assert.deepEqual(trace.map(line => [line.file, line.outcome, line.to]), [
    [DISPLAY, 'processed', 'l2'],
    [`l4/${MODULE}/pool/l1/${poolStamp(AT)}_mensalidadesAcademia-20260918103000_1.json`, 'delivered', 'l1'],
  ]);
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l2/${SHORT}`]);
  assert.equal(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json',
  })].status, 'deleted');
});

void test('retry after trace reuses the accepted needs result and response before deleting input', async () => {
  const host = installHost();
  seedReady(host);
  const local = (mls.stor.localStor as unknown as { deleteFile: (file: Stored) => void });
  const deleteFile = local.deleteFile;
  let failOnce = true;
  local.deleteFile = (file) => {
    if (failOnce) {
      failOnce = false;
      throw new Error('injected delete failure');
    }
    deleteFile(file);
  };

  await assert.rejects(() => executeP2Needs(MODULE, AT), /injected delete failure/);
  const responseInfo = {
    project: PROJECT,
    level: 4,
    folder: `${MODULE}/pool/l1`,
    shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260918103000_1`,
    extension: '.json',
  };
  const responsePath = `l4/${MODULE}/pool/l1/${responseInfo.shortName}.json`;
  assert.ok(host.files[keyOf(responseInfo)].content.includes('"to": "l1"'));
  const firstNeeds = host.files[keyOf(p2NeedsFile(MODULE))].content;
  assert.equal(host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json' })].status, 'changed');

  const later = new Date(AT.getTime() + 60_000);
  const resumed = await executeP2Needs(MODULE, later);
  assert.equal(resumed.messagePath, responsePath);
  assert.equal(host.files[keyOf(p2NeedsFile(MODULE))].content, firstNeeds);
  assert.equal(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l1`,
    shortName: `${poolStamp(later)}_mensalidadesAcademia-20260918103000_1`, extension: '.json',
  })], undefined);
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l2/${SHORT}`]);
  assert.deepEqual((await readPoolTraceAt(p2PipelineFile(MODULE))).map(line => line.outcome), ['processed', 'delivered']);
});

void test('retry before response reuses the pool checkpoint instead of rebuilding needs', async () => {
  const host = installHost();
  seedReady(host);
  const local = mls.stor.localStor as unknown as {
    setContent: (file: Stored, value: { content: string }) => Promise<void>;
  };
  const setContent = local.setContent;
  let failResponseOnce = true;
  local.setContent = async (file, value) => {
    if (failResponseOnce && file.folder === `${MODULE}/pool/l1`
      && file.shortName === `${poolStamp(AT)}_mensalidadesAcademia-20260918103000_1`) {
      failResponseOnce = false;
      throw new Error('injected response failure');
    }
    await setContent(file, value);
  };

  await assert.rejects(() => executeP2Needs(MODULE, AT), /injected response failure/);
  const needsInfo = p2NeedsFile(MODULE);
  const firstNeeds = host.files[keyOf(needsInfo)].content;
  const checkpoint = host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: 'needs30-draft', extension: '.json',
  })];
  assert.ok(checkpoint.content.includes('mensalidadesAcademia-20260918103000'));
  assert.deepEqual(host.deleted, []);

  const later = new Date(AT.getTime() + 60_000);
  const resumed = await executeP2Needs(MODULE, later);
  assert.equal(host.files[keyOf(needsInfo)].content, firstNeeds);
  assert.equal(resumed.needs.meta.generatedAt, AT.toISOString());
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l2/${SHORT}`]);
  assert.deepEqual((await readPoolTraceAt(p2PipelineFile(MODULE))).map(line => line.outcome), ['processed', 'delivered']);
});

void test('needs30 leaves implement input pending without writing result or response', async () => {
  const host = installHost();
  seedReady(host);
  const input = host.files[keyOf({ project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json' })];
  const message = JSON.parse(input.content) as PoolMessage;
  input.content = `${JSON.stringify({ ...message, mode: 'implement' })}\n`;

  await assert.rejects(() => executeP2Needs(MODULE, AT), /only processes estimate/);

  assert.equal(input.status, 'changed');
  assert.equal(host.files[keyOf(p2NeedsFile(MODULE))].content, '');
  assert.deepEqual(host.deleted, []);
  assert.deepEqual((await readPoolTraceAt(p2PipelineFile(MODULE))), []);
});

void test('beforePromptStep approves needs30 and does not close the pipeline', async () => {
  const host = installHost();
  seedReady(host);
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 30,
    interaction: null,
    stepTitle: 'Needs',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'needs30', moduleName: MODULE }),
    rags: [],
    planning: { planId: 'needs30', dependsOn: ['menu20-done'], executionMode: 'sequential', executionHost: 'client' },
  };
  const intents = await beforeP2NeedsPromptStep(agentMeta(), contextWith([step]), step, step, 1);
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.equal(status?.status, 'completed', status?.traceMsg);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'needs30-done'));
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as {
    status: string;
    steps: { needs30: { status: string } };
  };
  assert.equal(pipeline.steps.needs30.status, 'approved');
  assert.equal(pipeline.status, 'inProgress');
});
