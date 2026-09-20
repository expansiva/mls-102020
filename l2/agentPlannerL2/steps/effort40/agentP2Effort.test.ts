/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/effort40/agentP2Effort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { p2EffortFile, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  beforeP2EffortPromptStep,
  executeP2Effort,
} from '/_102020_/l2/agentPlannerL2/steps/effort40/agentP2Effort.js';
import type { P2EffortFile } from '/_102020_/l2/agentPlannerL2/steps/effort40/contracts.js';
import { poolStamp, readPoolTraceAt, type PoolMessage } from '/_102035_/l2/solution/pool.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MENU_PATH = path.join(HERE, '../needs30/fixtures/menu.json');
const BACKEND_PATH = path.join(HERE, 'fixtures/backend.mensalidadesAcademia.json');
const RECEIVED_PATH = path.join(HERE, 'fixtures/pool-l2-backend-mensalidadesAcademia.json');
const L4_PATH = path.join(HERE, '../entry10/fixtures/pool-l2-mensalidadesAcademia.json');
const PROJECT = 102047;
const MODULE = 'mensalidadesAcademia';
const AT = new Date(Date.UTC(2026, 8, 21, 12, 0, 0));
const L1_SHORT = '20260921120000_mensalidadesAcademia-20260918103000_1';
const L4_SHORT = '20260918103000_mensalidadesAcademia-20260918103000_1';
const DISPLAY = `l4/${MODULE}/pool/l2/${L1_SHORT}.json`;

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

function seedReady(host: Host): void {
  seed(host, {
    folder: `${MODULE}/pipeline`,
    shortName: 'pipeline',
    content: `${JSON.stringify({ status: 'complete', moduleName: MODULE })}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: L4_SHORT,
    content: `${readFileSync(L4_PATH, 'utf8')}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2`,
    shortName: L1_SHORT,
    content: `${readFileSync(RECEIVED_PATH, 'utf8')}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2/web`,
    shortName: 'menu',
    content: `${readFileSync(MENU_PATH, 'utf8')}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2/web`,
    shortName: 'backend',
    content: `${readFileSync(BACKEND_PATH, 'utf8')}\n`,
  });
  seed(host, {
    folder: `${MODULE}/pool/l2/web`,
    shortName: 'effort',
    content: '',
  });
  const stamp = poolStamp(AT);
  seed(host, {
    folder: `${MODULE}/pool/l4`,
    shortName: `${stamp}_mensalidadesAcademia-20260918103000_1`,
    content: '',
  });
  seed(host, {
    level: 2,
    folder: `${MODULE}/pipeline`,
    shortName: 'pipeline',
    content: `${JSON.stringify({
      schemaVersion: '2026-09-18-p2-pipeline-v2',
      flowId: 'agentPlannerL2',
      moduleName: MODULE,
      status: 'inProgress',
      steps: {
        entry10: { status: 'approved', updatedAt: AT.toISOString() },
        menu20: { status: 'approved', updatedAt: AT.toISOString() },
        needs30: { status: 'approved', updatedAt: AT.toISOString() },
      },
      thread: 'mensalidadesAcademia-20260918103000',
      round: 1,
      messageFile: DISPLAY,
      sourceMessages: [`${L1_SHORT}.json`],
      webDir: 'empty-left: deleteFile does not remove directories',
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

void test('effort40 is deterministic and has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('createAgent registers effort40 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.effort40?.beforePromptStep, beforeP2EffortPromptStep);
});

void test('execute writes effort.json, one l2→l4 message, delivered trace, and does not delete the pool', async () => {
  const host = installHost();
  seedReady(host);
  const result = await executeP2Effort(MODULE, AT);
  const written = JSON.parse(host.files[keyOf(p2EffortFile(MODULE))].content) as P2EffortFile;
  assert.equal(written.schemaVersion, '2026-09-21-p2-effort-v1');
  assert.equal(result.effortPath, `l4/${MODULE}/pool/l2/web/effort.json`);
  assert.equal(written.totals.screens.toCreate, 6);
  assert.equal(written.totals.endpoints.done, 1);

  const message = JSON.parse(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l4`,
    shortName: `${poolStamp(AT)}_mensalidadesAcademia-20260918103000_1`, extension: '.json',
  })].content) as PoolMessage;
  assert.equal(message.from, 'l2');
  assert.equal(message.to, 'l4');
  assert.equal(message.subject, 'effort of mensalidadesAcademia (web) ready');
  assert.deepEqual(message.artifacts, ['pool/l2/web/effort.json']);

  const trace = await readPoolTraceAt(p2PipelineFile(MODULE));
  assert.equal(trace.length, 1);
  assert.equal(trace[0].outcome, 'delivered');
  assert.equal(trace[0].to, 'l4');
  assert.deepEqual(host.deleted, []);
  assert.ok(host.files[keyOf({
    project: PROJECT, level: 4, folder: `${MODULE}/pool/l2`, shortName: L1_SHORT, extension: '.json',
  })].content.includes('"from": "l1"'));
});

void test('beforePromptStep approves effort40 and closes the pipeline', async () => {
  const host = installHost();
  seedReady(host);
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 40,
    interaction: null,
    stepTitle: 'Effort',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'effort40', moduleName: MODULE }),
    rags: [],
    planning: { planId: 'effort40', dependsOn: ['entry10-done'], executionMode: 'sequential', executionHost: 'client' },
  };
  const intents = await beforeP2EffortPromptStep(agentMeta(), contextWith([step]), step, step, 1);
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.equal(status?.status, 'completed', status?.traceMsg);
  assert.ok(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'effort40-done'));
  const pipeline = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as {
    status: string;
    steps: { effort40: { status: string } };
  };
  assert.equal(pipeline.steps.effort40.status, 'approved');
  assert.equal(pipeline.status, 'complete');
});
