/// <mls fileReference="_102020_/l2/agentDefsL2/entryFlow.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent as createPublicAgent } from '/_102020_/l2/agentDefsL2/agentDefsL2.js';
import { createAgent as createEntryAgent } from '/_102020_/l2/agentDefsL2/steps/entry10/agentD2Entry.js';
import { d2PipelineFile, type D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

const PROJECT = 102047;
const MODULE = 'agendaClinica';

type Stored = {
  project: number; level: number; folder: string; shortName: string; extension: string;
  status: string; versionRef: string; content: string;
  getValueInfo: () => Promise<{ content: string }>;
  getContent: () => Promise<string>;
};

function keyOf(info: { project: number | string; level: number | string; folder: string; shortName: string; extension: string }): string {
  return `${info.project}_${info.level}_${info.folder}/${info.shortName}${info.extension}`;
}

function installHost(project = PROJECT): { files: Record<string, Stored>; writes: string[] } {
  const files: Record<string, Stored> = {};
  const writes: string[] = [];
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: project,
    stor: {
      files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => {
          file.content = value.content;
          writes.push(keyOf(file));
        },
      },
    },
  };
  return { files, writes };
}

function seedPipelineFile(host: ReturnType<typeof installHost>, identity: D2RunIdentity, content = ''): Stored {
  const info = d2PipelineFile(identity);
  const file: Stored = {
    ...info,
    status: 'changed',
    versionRef: '1',
    content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  host.files[keyOf(file)] = file;
  return file;
}

function context(withTask = false): mls.msg.ExecutionContext {
  return {
    message: { orderAt: 'm1', threadId: 'thread1', content: `@@agentDefsL2 ${MODULE}` },
    ...(withTask ? { task: { PK: 'task1', iaCompressed: { longMemory: {}, nextSteps: [] } } } : {}),
  } as unknown as mls.msg.ExecutionContext;
}

function agentStep(agentName: string, prompt: string, planId = ''): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 7, status: 'in_progress', interaction: null, nextSteps: [], agentName,
    prompt, rags: [], stepTitle: agentName,
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

void test('message and existing-task entries plant the same plan; only the message emits add-message-ai', async () => {
  installHost();
  const publicAgent = createPublicAgent();
  const messageIntents = await publicAgent.beforePromptImplicit!(publicAgent, context(), MODULE);
  const messageSteps = messageIntents.filter(intent => intent.type === 'add-step').map(intent => (intent as mls.msg.AgentIntentAddStep).step);
  assert.equal(messageIntents.filter(intent => intent.type === 'add-message-ai').length, 1);

  const ctx = context(true);
  const wrapper = agentStep('caller', '{}', 'caller');
  const bootstrap = agentStep('agentDefsL2', JSON.stringify({ project: PROJECT, module: MODULE }));
  const stepIntents = await publicAgent.beforePromptStep!(publicAgent, ctx, wrapper, bootstrap, 1, bootstrap.prompt);
  const stepSteps = stepIntents.filter(intent => intent.type === 'add-step').map(intent => (intent as mls.msg.AgentIntentAddStep).step);
  assert.equal(stepIntents.some(intent => intent.type === 'add-message-ai'), false);
  assert.deepEqual(
    stepSteps.map(step => ({ agent: (step as mls.msg.AIAgentStep).agentName, prompt: (step as mls.msg.AIAgentStep).prompt, planning: step.planning })),
    messageSteps.map(step => ({ agent: (step as mls.msg.AIAgentStep).agentName, prompt: (step as mls.msg.AIAgentStep).prompt, planning: step.planning })),
  );
});

void test('/help and invalid message entries do not initialize pipeline state', async () => {
  const host = installHost();
  const agent = createPublicAgent();
  const help = await agent.beforePromptImplicit!(agent, context(), '/help');
  const invalid = await agent.beforePromptImplicit!(agent, context(), '../agendaClinica');
  assert.equal(help[0]?.type, 'add-message-ai');
  assert.equal(invalid[0]?.type, 'add-message-ai');
  assert.deepEqual(host.writes, []);
  assert.deepEqual(Object.keys(host.files), []);
});

void test('entry10 writes only the owned pipeline and input20 stops as unavailable', async () => {
  const identity = { project: PROJECT, module: MODULE };
  const host = installHost();
  const stored = seedPipelineFile(host, identity);
  const ctx = context(true);
  const parent = agentStep('agentDefsL2', '{}', 'root');
  const entry = agentStep('agentD2Entry', JSON.stringify(identity), 'entry10');
  const entryAgent = createEntryAgent();
  const entryIntents = await entryAgent.beforePromptStep!(entryAgent, ctx, parent, entry, 1, entry.prompt);
  assert.deepEqual(entryIntents.map(intent => intent.type), ['add-step', 'update-status']);
  assert.equal((entryIntents[1] as mls.msg.AgentIntentUpdateStatus).status, 'completed');
  assert.equal(host.writes.length, 1);
  assert.equal(host.writes[0], keyOf(d2PipelineFile(identity)));
  assert.equal(JSON.parse(stored.content).steps.entry10.status, 'approved');

  const input = agentStep('agentDefsL2', JSON.stringify(identity), 'input20');
  const publicAgent = createPublicAgent();
  const inputIntents = await publicAgent.beforePromptStep!(publicAgent, ctx, parent, input, 2, input.prompt);
  assert.equal(inputIntents.length, 1);
  assert.equal((inputIntents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.match(String((inputIntents[0] as mls.msg.AgentIntentUpdateStatus).traceMsg), /unavailable/);
  const pipeline = JSON.parse(stored.content);
  assert.equal(pipeline.status, 'awaitingStep');
  assert.equal(pipeline.awaitingStep, 'input20');
  assert.equal(pipeline.steps.input20.status, 'unavailable');
});

void test('invalid task-step args emit no message and write nothing', async () => {
  const host = installHost();
  const agent = createPublicAgent();
  const ctx = context(true);
  const parent = agentStep('caller', '{}', 'caller');
  const bootstrap = agentStep('agentDefsL2', '{"project":102048,"module":"agendaClinica"}');
  const intents = await agent.beforePromptStep!(agent, ctx, parent, bootstrap, 1, bootstrap.prompt);
  assert.equal(intents.some(intent => intent.type === 'add-message-ai'), false);
  assert.equal((intents[0] as mls.msg.AgentIntentUpdateStatus).status, 'failed');
  assert.deepEqual(host.writes, []);
  assert.deepEqual(Object.keys(host.files), []);
});
