/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/entry10/agentP2Entry.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { P2_STEP_IDS, p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import { beforeP2EntryPromptStep } from '/_102020_/l2/agentPlannerL2/steps/entry10/agentP2Entry.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(readFileSync(path.join(HERE, 'fixtures/pool-l2-mensalidadesAcademia.json'), 'utf8')) as Record<string, unknown>;

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

type Host = { files: Record<string, Stored> };

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
  const host: Host = { files: {} };
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => { file.content = value.content; },
        listFolder: () => [],
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

function seedReady(host: Host): void {
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  seed(host, `${MODULE}/pool/l2`, SHORT, `${JSON.stringify(FIXTURE, null, 2)}\n`);
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 2);
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

function contextWith(content: string, steps: mls.msg.AIPayload[] = []): mls.msg.ExecutionContext {
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
    message: { orderAt: 'msg-1', threadId: 'thread-1', content, senderId: 'u' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;
}

void test('entry10 is deterministic and has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('createAgent registers entry10 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.entry10?.beforePromptStep, beforeP2EntryPromptStep);
});

void test('hand invocation refuses nothing pending without opening the step tree', async () => {
  const host = installHost();
  seed(host, `${MODULE}/pipeline`, 'pipeline', L4_COMPLETE);
  const agent = createAgent();
  const ctx = contextWith(`@@agentPlannerL2 ${MODULE}`);
  const intents = await agent.beforePromptImplicit!(agentMeta(), ctx, MODULE);
  assert.equal(intents[0]?.type, 'add-message-ai');
  const message = intents[0] as mls.msg.AgentIntentAddMessageAI;
  assert.equal(message.skipRootLLM, true);
  assert.match(String(message.request.inputAI[1]?.content), /nothing pending/);
  assert.equal(intents.some(intent => intent.type === 'add-step' && (intent as mls.msg.AgentIntentAddStep).step.planning?.planId === 'entry10'), false);
});

void test('hand invocation and L4 step write the same pipeline.json', async () => {
  const host = installHost();
  seedReady(host);
  const agent = createAgent();
  const handCtx = contextWith(`@@agentPlannerL2 ${MODULE}`);
  const hand = await agent.beforePromptImplicit!(agentMeta(), handCtx, MODULE);
  assert.equal(hand[0]?.type, 'add-message-ai');
  const added = hand.filter((intent): intent is mls.msg.AgentIntentAddStep => intent.type === 'add-step');
  assert.deepEqual(added.map(intent => intent.step.planning?.planId), [...P2_STEP_IDS]);

  const entryStep = added[0].step as mls.msg.AIAgentStep;
  entryStep.stepId = 10;
  const afterHand = await beforeP2EntryPromptStep(agentMeta(), handCtx, handCtx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep, entryStep, 1);
  assert.ok(afterHand.some(intent => intent.type === 'update-status'));
  const writtenHand = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { thread: string; round: number; messageFile: string };

  delete host.files[keyOf(p2PipelineFile(MODULE))];
  seed(host, `${MODULE}/pipeline`, 'pipeline', '{}\n', 2);

  const l4Step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 20,
    interaction: null,
    stepTitle: 'Entry',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ moduleName: MODULE, thread: 'mensalidadesAcademia-20260918103000', file: DISPLAY }),
    rags: [],
    planning: { planId: '', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const l4Ctx = contextWith('from L4', [l4Step]);
  const fromL4 = await agent.beforePromptStep!(agentMeta(), l4Ctx, l4Ctx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep, l4Step, 1);
  assert.ok(fromL4.some(intent => intent.type === 'update-status'));
  const writtenL4 = JSON.parse(host.files[keyOf(p2PipelineFile(MODULE))].content) as { thread: string; round: number; messageFile: string };
  assert.equal(writtenL4.thread, writtenHand.thread);
  assert.equal(writtenL4.round, writtenHand.round);
  assert.equal(writtenL4.messageFile, writtenHand.messageFile);
  assert.equal(writtenL4.thread, 'mensalidadesAcademia-20260918103000');
});
