/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/requests50/agentP2Requests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { p2PipelineFile } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  collectP2FieldCatalog,
  fieldByPath,
  type P2ContractsDraft,
} from '/_102020_/l2/agentPlannerL2/steps/contracts30/contracts.js';
import {
  parseP2L4Sources,
  type P2L4Sources,
  type P2WorkspacesDraft,
} from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import {
  beforeP2RequestsPromptStep,
  deliverP2Requests,
} from '/_102020_/l2/agentPlannerL2/steps/requests50/agentP2Requests.js';
import {
  buildP2L1Requests,
  collectP2RequestCalls,
  extractP2CallBlock,
  p2RequestNow,
  p2RequestSubject,
} from '/_102020_/l2/agentPlannerL2/steps/requests50/contracts.js';
import { validateP2Requests } from '/_102020_/l2/agentPlannerL2/steps/requests50/gate.js';
import { poolStamp, readPoolTrace, readPoolTraceAt, type PoolMessage } from '/_102035_/l2/solution/pool.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const L4_FIXTURE = path.join(HERE, '../workspaces20/fixtures/mensalidadesAcademia');
const WORKSPACES_DRAFT_PATH = path.join(HERE, '../workspaces20/fixtures/workspaces20-draft.json');
const CONTRACTS_DRAFT_PATH = path.join(HERE, '../contracts30/fixtures/contracts30-draft.json');
const CONTRACTS_DIR = path.join(HERE, '../contracts30/fixtures/contracts');
const RECEIVED_PATH = path.join(HERE, '../entry10/fixtures/pool-l2-mensalidadesAcademia.json');
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

function installHost(failL1After = 0): Host {
  const host: Host = { files: {}, deleted: [] };
  let l1Writes = 0;
  (globalThis as unknown as Record<string, unknown>).mls = {
    actualProject: PROJECT,
    events: { addEventListener() {}, removeEventListener() {}, dispatch() {} },
    stor: {
      files: host.files,
      getKeyToFile: keyOf,
      localStor: {
        setContent: async (file: Stored, value: { content: string }) => {
          if (String(file.folder || '').includes('/pool/l1')) {
            l1Writes += 1;
            if (failL1After > 0 && l1Writes > failL1After) {
              throw new Error(`injected failure after ${failL1After} pool/l1 writes`);
            }
          }
          file.content = value.content;
        },
        listFolder: () => [],
        deleteFile: (file: { folder: string; shortName: string }) => {
          host.deleted.push(`${file.folder}/${file.shortName}`);
        },
      },
    },
  };
  return host;
}

function extractDefsJson(source: string): unknown {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) throw new Error('no json object in defs');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, index + 1));
    }
  }
  throw new Error('unbalanced defs json');
}

function readDefs(root: string, rel: string): unknown {
  return extractDefsJson(readFileSync(path.join(root, rel), 'utf8'));
}

function loadSources(root: string): P2L4Sources {
  const journeyDir = path.join(root, 'journeys');
  const ontologyDir = path.join(root, 'ontology');
  const journeys = readdirSync(journeyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(root, `journeys/${name}`));
  const ontologyEntities = readdirSync(ontologyDir)
    .filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts')
    .sort()
    .map(name => readDefs(root, `ontology/${name}`));
  const moduleArtifact = readDefs(root, 'module.defs.ts') as { userLanguage?: string; moduleName?: string };
  return parseP2L4Sources({
    moduleName: moduleArtifact.moduleName,
    userLanguage: moduleArtifact.userLanguage,
    journeyIndex: readDefs(root, 'journeys/index.defs.ts'),
    journeys,
    access: readDefs(root, 'access.defs.ts'),
    ontologyIndex: readDefs(root, 'ontology/index.defs.ts'),
    ontologyEntities,
  });
}

function loadWorkspaces(): P2WorkspacesDraft {
  return JSON.parse(readFileSync(WORKSPACES_DRAFT_PATH, 'utf8')) as P2WorkspacesDraft;
}

function loadContracts(): P2ContractsDraft {
  return JSON.parse(readFileSync(CONTRACTS_DRAFT_PATH, 'utf8')) as P2ContractsDraft;
}

function loadReceived(): PoolMessage {
  return JSON.parse(readFileSync(RECEIVED_PATH, 'utf8')) as PoolMessage;
}

function buildAll(): PoolMessage[] {
  const sources = loadSources(L4_FIXTURE);
  return buildP2L1Requests({
    project: PROJECT,
    moduleName: MODULE,
    received: loadReceived(),
    contracts: loadContracts(),
    workspaces: loadWorkspaces(),
    sources,
    catalog: fieldByPath(collectP2FieldCatalog(sources)),
  });
}

function l2PipelineJson(): string {
  return `${JSON.stringify({
    schemaVersion: '2026-09-18-p2-pipeline-v1',
    flowId: 'agentPlannerL2',
    moduleName: MODULE,
    status: 'inProgress',
    steps: { shared40: { status: 'approved', updatedAt: AT.toISOString() } },
    thread: 'mensalidadesAcademia-20260918103000',
    round: 1,
    messageFile: DISPLAY,
    updatedAt: AT.toISOString(),
  }, null, 2)}\n`;
}

function l4PipelineJson(): string {
  return `${JSON.stringify({
    schemaVersion: '2026-09-10-ns5-pipeline-v1',
    flowId: 'agentNewSolution5',
    moduleName: MODULE,
    status: 'complete',
    steps: {},
    sourcePrompt: '',
    invocation: { fast: false, module: MODULE, rebuildAll: false },
    updatedAt: AT.toISOString(),
  }, null, 2)}\n`;
}

function seedDeliver(host: Host, count: number): { l2: Stored; l4: Stored; received: Stored } {
  const l4 = seed(host, `${MODULE}/pipeline`, 'pipeline', l4PipelineJson());
  const l2 = seed(host, `${MODULE}/pipeline`, 'pipeline', l2PipelineJson(), 2);
  const received = seed(host, `${MODULE}/pool/l2`, SHORT, `${JSON.stringify(loadReceived(), null, 2)}\n`);
  for (let index = 0; index < count; index += 1) {
    const stamp = poolStamp(p2RequestNow(AT, index));
    seed(host, `${MODULE}/pool/l1`, `${stamp}_mensalidadesAcademia-20260918103000_1`);
  }
  return { l2, l4, received };
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

void test('requests50 is deterministic and has no prompt.md', () => {
  assert.equal(existsSync(path.join(HERE, 'prompt.md')), false);
});

void test('createAgent registers requests50 on the dispatch table', () => {
  createAgent();
  assert.equal(P2_STEP_HOOKS.requests50?.beforePromptStep, beforeP2RequestsPromptStep);
});

void test('one pool/l1 request per p2_03 call, body matches the contract fixture byte for byte', () => {
  const contracts = loadContracts();
  const received = loadReceived();
  const requests = buildAll();
  const calls = collectP2RequestCalls(contracts);
  assert.equal(requests.length, 11);
  assert.equal(requests.length, calls.length);
  const gate = validateP2Requests(requests, contracts, received);
  assert.equal(gate.ok, true, gate.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));

  requests.forEach((request, index) => {
    const entry = calls[index];
    assert.equal(request.from, 'l2');
    assert.equal(request.to, 'l1');
    assert.equal(request.thread, received.thread);
    assert.equal(request.round, received.round);
    assert.equal(request.mode, received.mode);
    assert.equal(request.subject, p2RequestSubject(MODULE, entry.workspaceId, entry.call.callName));
    assert.deepEqual(request.artifacts, [`web/contracts/${entry.workspaceId}.defs.ts`]);
    const fixture = readFileSync(path.join(CONTRACTS_DIR, `${entry.workspaceId}.defs.ts`), 'utf8');
    const block = extractP2CallBlock(fixture, entry.call.callName);
    assert.ok(block, `fixture missing bffCall ${entry.call.callName}`);
    assert.ok(request.body.includes(block), `body does not contain the p2_03 contract of ${entry.call.callName}`);
    assert.match(request.body, /Journey step [A-Za-z0-9]+\/[A-Za-z0-9]+ motivates this BFF call\./);
    assert.match(request.body, /l4 entity: /);
    assert.match(request.body, /l4 fields: /);
    assert.equal(request.body.includes('implement the'), false);
  });

  const first = requests[0];
  assert.equal(first.subject, 'mensalidadesAcademia.matriculaCatalogue.qryListAluno');
  assert.match(first.body, /Journey step matricularAluno\/localizarAluno/);
  const cancel = requests.find(item => item.subject.endsWith('.cmdCancelarMatricula'));
  assert.ok(cancel);
  assert.match(cancel.body, /Journey step cancelarPropriaMatricula\/cancelarMatricula/);
  assert.match(cancel.body, /l4 transition: cancelarMatricula/);
});

void test('gate rejects a count mismatch and an orphan subject', () => {
  const contracts = loadContracts();
  const received = loadReceived();
  const requests = buildAll();
  const short = validateP2Requests(requests.slice(0, 3), contracts, received);
  assert.equal(short.ok, false);
  assert.ok(short.issues.some(issue => issue.code === 'P2_REQUEST_COUNT'));
  assert.ok(short.issues.some(issue => issue.code === 'P2_REQUEST_MISSING'));

  const orphan: PoolMessage = { ...requests[0], subject: 'mensalidadesAcademia.noSuch.qryNope' };
  const extra = validateP2Requests([...requests, orphan], contracts, received);
  assert.equal(extra.ok, false);
  assert.ok(extra.issues.some(issue => issue.code === 'P2_REQUEST_ORPHAN'));
  assert.ok(extra.issues.some(issue => issue.code === 'P2_REQUEST_COUNT'));
});

void test('deliver writes every request, traces on the l2 pipeline, then deletes pool/l2', async () => {
  const host = installHost();
  const requests = buildAll();
  const { l2, l4, received } = seedDeliver(host, requests.length);
  const receivedFile = {
    project: PROJECT, level: 4 as const,
    folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json',
  };
  const l2Info = p2PipelineFile(MODULE);

  const result = await deliverP2Requests({
    moduleName: MODULE,
    receivedFile,
    received: loadReceived(),
    requests,
    now: AT,
  });

  assert.equal(result.written.length, 11);
  const names = result.written.map(item => item.file.shortName);
  assert.equal(new Set(names).size, 11);
  assert.equal(names[0], '20260918103000_mensalidadesAcademia-20260918103000_1');
  assert.equal(names[10], '20260918103010_mensalidadesAcademia-20260918103000_1');

  for (const item of result.written) {
    const stored = JSON.parse(host.files[keyOf(item.file)].content) as PoolMessage;
    assert.deepEqual(stored, item.message);
  }

  const trace = await readPoolTraceAt(l2Info);
  assert.equal(trace.length, 12);
  assert.equal(trace[0].outcome, 'processed');
  assert.equal(trace[0].file, DISPLAY);
  assert.equal(trace.filter(line => line.outcome === 'delivered').length, 11);
  assert.deepEqual(JSON.parse(l2.content).pool.length, 12);

  assert.equal((await readPoolTrace(MODULE)).length, 0);
  assert.equal(JSON.parse(l4.content).pool, undefined);
  assert.deepEqual(host.deleted, [`${MODULE}/pool/l2/${SHORT}`]);
  assert.equal(received.content.includes('"to": "l2"'), true);
});

void test('failure in the middle leaves the pool/l2 message in place', async () => {
  const host = installHost(2);
  const requests = buildAll();
  const { l2, l4, received } = seedDeliver(host, requests.length);
  const receivedFile = {
    project: PROJECT, level: 4 as const,
    folder: `${MODULE}/pool/l2`, shortName: SHORT, extension: '.json',
  };

  await assert.rejects(
    deliverP2Requests({
      moduleName: MODULE,
      receivedFile,
      received: loadReceived(),
      requests,
      now: AT,
    }),
    /injected failure after 2 pool\/l1 writes/,
  );

  const written = Object.values(host.files).filter(file => (
    file.level === 4 && file.folder === `${MODULE}/pool/l1` && file.content.includes('"from": "l2"')
  ));
  assert.equal(written.length, 2);
  assert.deepEqual(host.deleted, []);
  assert.equal(received.status, 'changed');
  assert.ok(received.content.includes('"to": "l2"'));
  assert.equal(JSON.parse(l2.content).pool, undefined);
  assert.equal(JSON.parse(l4.content).pool, undefined);
  assert.equal((await readPoolTrace(MODULE)).length, 0);
});

void test('requests50 hook without a pipeline fails and does not delete', async () => {
  const host = installHost();
  seed(host, `${MODULE}/pool/l2`, SHORT, `${JSON.stringify(loadReceived(), null, 2)}\n`);
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 50,
    interaction: null,
    stepTitle: 'Requests',
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: 'agentPlannerL2',
    prompt: JSON.stringify({ planId: 'requests50', moduleName: MODULE }),
    rags: [],
    planning: { planId: 'requests50', dependsOn: ['shared40-done'], executionMode: 'sequential', executionHost: 'client' },
  };
  const ctx = contextWith([step]);
  const intents = await beforeP2RequestsPromptStep(agentMeta(), ctx, ctx.task!.iaCompressed!.nextSteps[0] as mls.msg.AIAgentStep, step, 1);
  const status = intents.find(intent => intent.type === 'update-status') as mls.msg.AgentIntentUpdateStatus | undefined;
  assert.equal(status?.status, 'failed');
  assert.match(String(status?.traceMsg), /l2 pipeline\.json is missing/);
  assert.deepEqual(host.deleted, []);
});
