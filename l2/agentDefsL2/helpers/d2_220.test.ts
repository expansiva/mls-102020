/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_220.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { D2_FLOW_ID, D2_PIPELINE_VERSION, buildD2PlannedSteps, d2PipelineFile, initializeD2Pipeline, markD2StepApproved, parseD2MessageInvocation, parseD2StepInvocation, type D2PipelineState } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { renderD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/helpers/sharedV2/format.js';
import { D2_SHARED_VERSION, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { beforePromptStep } from '/_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.js';
import { contractSourceFor, d2ContractRederiveLines, executeD2Contracts70, type D2Contracts70Existing, type D2Contracts70Page, type D2Contracts70Port, type D2Contracts70Writer } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures/d2_219');
const TELEGRAM_REPO = path.resolve(HERE, '../../../../mls-102047');
const identity = { project: 102047, module: 'telegram' };

function oldContract(pageId: string): string {
  return execFileSync('git', ['-C', TELEGRAM_REPO, 'show', `aa145ef7:l2/telegram/web/contracts/${pageId}.defs.ts`], { encoding: 'utf8' });
}

function accessOf(source: string): { actors: string[]; grants: string[]; scope: string } {
  const match = source.match(/access: \{ actors: \[([^\]]*)\]; grants: \[([^\]]*)\]; scope: '([^']*)'/u);
  assert.ok(match, 'old contract has an access line');
  const list = (raw: string) => [...raw.matchAll(/'([^']+)'/gu)].map(item => item[1]);
  return { actors: list(match[1]), grants: list(match[2]), scope: match[3] };
}

function sharedOf(endpoints: D2BffDesign['endpoints'], access: { actors: string[]; grants: string[] }): D2SharedV2Definition {
  const rules = [...new Set(endpoints.flatMap(item => item.rules))].sort();
  return {
    entry: { params: {} },
    requests: Object.fromEntries(endpoints.map(item => [item.id, { kind: item.kind, trigger: item.when, ...(item.writes ? { writes: item.writes } : {}), returns: item.output.map(leaf => leaf.name) }])),
    states: {}, journeys: [], rules, access,
  };
}

async function pageOf(pageId: string): Promise<D2Contracts70Page> {
  const design = JSON.parse(readFileSync(path.join(FIXTURE, `${pageId}.json`), 'utf8')) as D2BffDesign;
  const access = accessOf(oldContract(pageId));
  const sharedSource = renderD2SharedV2({ ...identity, pageId }, sharedOf(design.endpoints, { actors: access.actors, grants: access.grants }));
  const sharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, ...identity, pageId,
    sourceHash: await sha256Text(sharedSource), designHash: await sha256Text(JSON.stringify(design)),
  } as D2SharedReceipt;
  return { identity, pageId, userLanguage: 'en', design, access, entities: {}, sharedSource, sharedReceipt };
}

function memory(): D2Contracts70Writer {
  return { writeSource: async () => {}, writeJson: async () => {} };
}

void test('d2_220: /rederive plans entry10, input20 and contracts70, and refuses /pages beside it', () => {
  assert.deepEqual(parseD2MessageInvocation('@@agentDefsL2 sampleModule /rederive', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'contracts' });
  assert.equal(parseD2MessageInvocation('@@agentDefsL2 sampleModule /pages /rederive', 102047).kind, 'refusal');
  assert.equal(parseD2MessageInvocation('@@agentDefsL2 sampleModule /rederive /pages', 102047).kind, 'refusal');
  assert.deepEqual(parseD2StepInvocation('{"project":102047,"module":"sampleModule","scope":"contracts"}', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'contracts' });
  const planned = buildD2PlannedSteps({ project: 102047, module: 'sampleModule', scope: 'contracts' });
  assert.deepEqual(planned.map(step => step.planning?.planId), ['entry10', 'input20', 'contracts70']);
  assert.deepEqual(planned.map(step => step.planning?.dependsOn), [[], ['entry10-done'], ['input20-done']]);
  assert.deepEqual(planned.map(step => step.agentName), ['agentD2Entry', 'agentD2Input', 'agentD2Contracts70']);
  assert.ok(planned.every(step => JSON.parse(step.prompt || '{}').scope === 'contracts'));
});

void test('d2_220: an old contract the current emitter changes is wrote, and the printed lines are only those pages', async () => {
  const pageIds = ['audit', 'bots', 'conversations'] as const;
  const pages = new Map<string, D2Contracts70Page>();
  const existing = new Map<string, D2Contracts70Existing>();
  for (const pageId of pageIds) {
    const page = await pageOf(pageId);
    pages.set(pageId, page);
    existing.set(pageId, { source: oldContract(pageId), receipt: null });
  }
  const steady = await pageOf('bots');
  steady.pageId = 'steady';
  steady.sharedSource = renderD2SharedV2({ ...identity, pageId: 'steady' }, sharedOf(steady.design.endpoints, { actors: steady.access.actors, grants: steady.access.grants }));
  steady.sharedReceipt = { ...steady.sharedReceipt!, pageId: 'steady', sourceHash: await sha256Text(steady.sharedSource) };
  const steadySource = await contractSourceFor(steady);
  pages.set('steady', steady);
  await executeD2Contracts70({
    pageIds: async () => ['steady'],
    load: async () => steady,
    readExisting: async () => ({ source: null, receipt: null }),
    writer: {
      writeSource: async () => {},
      writeJson: async (_info, value) => { existing.set('steady', { source: steadySource, receipt: value as D2Contracts70Existing['receipt'] }); },
    },
  });
  assert.equal(existing.get('steady')?.source, steadySource);

  const result = await executeD2Contracts70({
    pageIds: async () => ['conversations', 'steady', 'audit', 'bots'],
    load: async pageId => pages.get(pageId)!,
    readExisting: async pageId => existing.get(pageId)!,
    writer: memory(),
  });
  assert.deepEqual(result.wrote, ['conversations', 'audit', 'bots']);
  assert.deepEqual(result.reused, ['steady']);
  assert.equal(d2ContractRederiveLines('telegram', result.wrote), [
    '@@agentMaterializeL2 telegram --page audit',
    '@@agentMaterializeL2 telegram --page bots',
    '@@agentMaterializeL2 telegram --page conversations',
    'The existing screen is verified and repaired only if it does not compile. --force rebuilds it from scratch.',
  ].join('\n'));
});

void test('d2_220: an unchanged contract is reused and prints nothing to regenerate', async () => {
  const page = await pageOf('audit');
  const source = await contractSourceFor(page);
  let receipt: D2Contracts70Existing['receipt'] = null;
  const writer: D2Contracts70Writer = {
    writeSource: async () => {},
    writeJson: async (_info, value) => { receipt = value as D2Contracts70Existing['receipt']; },
  };
  await executeD2Contracts70({ pageIds: async () => [page.pageId], load: async () => page, readExisting: async () => ({ source: null, receipt: null }), writer });
  const again = await executeD2Contracts70({ pageIds: async () => [page.pageId], load: async () => page, readExisting: async () => ({ source, receipt }), writer: memory() });
  assert.deepEqual(again.wrote, []);
  assert.deepEqual(again.reused, ['audit']);
  assert.equal(d2ContractRederiveLines('telegram', again.wrote), 'no contract changed; nothing to regenerate');
});

void test('d2_220: a complete pipeline stays complete in contracts scope and is reopened otherwise', async () => {
  const moduleName = 'd2220keep';
  const run = { project: 102047, module: moduleName };
  const base: D2PipelineState = {
    schemaVersion: D2_PIPELINE_VERSION,
    flowId: D2_FLOW_ID,
    project: run.project,
    module: moduleName,
    status: 'complete',
    steps: { entry10: { status: 'approved', updatedAt: '2026-11-26T00:00:00.000Z' } },
    createdAt: '2026-11-26T00:00:00.000Z',
    updatedAt: '2026-11-26T00:00:00.000Z',
  };
  const previousGet = mls.stor.getKeyToFile;
  mls.stor.getKeyToFile = (info) => [info.project, info.level, info.folder, info.shortName, info.extension].join('|');
  const key = mls.stor.getKeyToFile(d2PipelineFile(run));
  const previousFiles = mls.stor.files;
  const previousLocal = mls.stor.localStor;
  mls.stor.localStor = { setContent: async () => {} } as typeof mls.stor.localStor;
  let stored = `${JSON.stringify(base, null, 2)}\n`;
  const file = {
    project: run.project, level: 2, status: 'active', folder: `${moduleName}/pipeline/agentDefsL2`, extension: '.json', shortName: 'pipeline',
    getContent: async () => stored,
    getValueInfo: async () => ({ content: stored }),
  };
  mls.stor.files = { ...previousFiles, [key]: file } as unknown as typeof mls.stor.files;
  mls.stor.localStor.setContent = async (_file, value) => { stored = String((value as { content?: unknown }).content ?? ''); };
  try {
    const kept = await initializeD2Pipeline(run);
    assert.equal(kept.status, 'complete');
    await markD2StepApproved(run, 'input20', [`l2/${moduleName}/pipeline/agentDefsL2/input.json`], 'snap-a', true);
    await markD2StepApproved(run, 'contracts70', [`l2/${moduleName}/web/contracts/audit.defs.ts`], 'snap-a', true);
    const afterContracts = JSON.parse(stored) as D2PipelineState;
    assert.equal(afterContracts.status, 'complete');
    assert.equal(afterContracts.awaitingStep, undefined);
    assert.equal(afterContracts.steps.input20?.status, 'approved');
    assert.equal(afterContracts.steps.contracts70?.status, 'approved');
    await markD2StepApproved(run, 'input20', [`l2/${moduleName}/pipeline/agentDefsL2/input.json`], 'snap-b');
    const reopened = JSON.parse(stored) as D2PipelineState;
    assert.equal(reopened.status, 'inProgress');
    assert.equal(reopened.awaitingStep, undefined);
    assert.equal(reopened.steps.input20?.snapshotHash, 'snap-b');
  } finally {
    mls.stor.files = previousFiles;
    mls.stor.localStor = previousLocal;
    mls.stor.getKeyToFile = previousGet;
  }
});

void test('d2_220: the contracts port fails if bff55, shared60 or a model is called', async () => {
  const page = await pageOf('audit');
  const source = await contractSourceFor(page);
  const forbidden = (name: string) => () => { throw new Error(`D2_REDERIVE_FORBIDDEN: ${name}`); };
  const port = {
    pageIds: async () => [page.pageId],
    load: async () => page,
    readExisting: async () => ({ source, receipt: null }),
    writer: memory(),
    bff55: forbidden('bff55'),
    shared60: forbidden('shared60'),
    model: forbidden('model'),
  };
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'contracts', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2Contracts70', prompt: '', rags: [], planning: { planId: 'contracts70', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const intents = await beforePromptStep({ agentName: 'agentD2Contracts70' } as Parameters<typeof beforePromptStep>[0], { message: { orderAt: 'm', threadId: 't' }, task: { PK: 'task' }, isTest: true } as mls.msg.ExecutionContext, { ...step, stepId: 1 }, step, 1, port);
  assert.equal(intents.some(item => item.type === 'update-status' && item.status === 'completed'), true);
  const result = await executeD2Contracts70({
    pageIds: async () => ['bare', 'noshared', page.pageId],
    skipUnapproved: true,
    load: async pageId => {
      if (pageId === 'bare') throw new Error('D2_CONTRACTS_BFF_MISSING: bare');
      if (pageId === 'noshared') throw new Error('D2_CONTRACTS_SHARED_RECEIPT_MISSING');
      return page;
    },
    readExisting: async () => ({ source: null, receipt: null }),
    writer: memory(),
    bff55: forbidden('bff55'),
    shared60: forbidden('shared60'),
    model: forbidden('model'),
  } as D2Contracts70Port);
  assert.deepEqual(result.skipped, ['bare', 'noshared']);
  assert.deepEqual(result.refused, []);
});
