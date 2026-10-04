/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/run.test.ts" enhancement="_blank"/>

/**
 * d2_73: contracts70 renders the contract of the approved BFF (E). Synthetic page; the fixture modules are replayed in
 * helpers/e2eReplay.test.ts.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { renderD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { D2_SHARED_VERSION, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { beforePromptStep } from '/_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.js';
import { approveD2Contracts70, contractSourceFor, renderEmptyD2Contract, type D2Contracts70Existing, type D2Contracts70Page, type D2Contracts70Writer } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';

const here = dirname(fileURLToPath(import.meta.url));
const identity = { project: 102047, module: 'alphaModule' };
const none: D2Contracts70Existing = { source: null, receipt: null };

const design: D2BffDesign = {
  types: [{ name: 'Row', description: 'One row of the list.', fields: [
    { name: 'id', type: 'string', origin: { kind: 'field', paths: ['Item.id'] } },
    { name: 'label', type: 'string', origin: { kind: 'field', paths: ['Item.label'] } },
  ] }],
  endpoints: [
    { id: 'load', kind: 'qry', when: 'onLoad', input: [], output: [{ name: 'rows', type: 'Row[]' }], rules: [],
      jsdoc: { purpose: 'Open the list.', input: 'None.', processing: 'Every row of the organization.', output: 'rows.' } },
    { id: 'saveRow', kind: 'cmd', when: 'saveRow', writes: 'Item.create', input: [{ name: 'label', type: 'string', origin: { kind: 'field', paths: ['Item.label'] } }],
      output: [{ name: 'row', type: 'Row' }], rules: ['labelRequired'], jsdoc: { purpose: 'Add a row.', input: 'label.', processing: 'Refuses an empty label (labelRequired).', output: 'the new row.' } },
  ],
};

function sharedOf(endpoints: D2BffDesign['endpoints']): D2SharedV2Definition {
  return {
    entry: { params: {} }, forms: {},
    requests: Object.fromEntries(endpoints.map(item => [item.id, { kind: item.kind, trigger: item.when, ...(item.writes ? { writes: item.writes } : {}), returns: item.output.map(leaf => leaf.name) }])),
    states: {}, functions: {}, journeys: [], rules: Object.fromEntries(endpoints.map(item => [item.id, item.rules])), access: { actors: ['clerk'], grants: ['manage'] },
  };
}

async function pageOf(value: D2BffDesign, pageId = 'rows'): Promise<D2Contracts70Page> {
  const sharedSource = renderD2SharedV2({ ...identity, pageId }, sharedOf(value.endpoints));
  const sharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, ...identity, pageId, sourceHash: await sha256Text(sharedSource), designHash: await sha256Text(JSON.stringify(value)),
  } as D2SharedReceipt;
  return { identity, pageId, userLanguage: 'en', design: value, access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' }, entities: {}, sharedSource, sharedReceipt };
}

function memory(): { writer: D2Contracts70Writer; writes: Map<string, unknown> } {
  const writes = new Map<string, unknown>();
  return { writes, writer: {
    writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, source); },
    writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, value); },
  } };
}

void test('d2_73: the contract has one route per endpoint with the JSDoc of A, and a second run with the same inputs writes nothing', async () => {
  const page = await pageOf(design);
  const source = await contractSourceFor(page);
  assert.match(source, /\/\*\* One row of the list\. \*\/\nexport interface Row \{\n {2}id: string;\n {2}label: string;\n\}/u);
  assert.match(source, / {2}\/\*\*\n {3}\* Purpose: Add a row\.\n {3}\* Input: label\.\n {3}\* Processing: Refuses an empty label \(labelRequired\)\.\n {3}\* Output: the new row\.\n {3}\*\/\n {2}'alphaModule\.rows\.saveRow': \{/u);
  assert.match(source, /meta: \{ output: \{ rows: \{ entity: 'Item'; many: true \} \}; lists: \{\}; params: \{\} \};/u);
  const sink = memory();
  const first = await approveD2Contracts70(page, none, sink.writer);
  assert.equal(first.wrote, true);
  const again = await approveD2Contracts70(page, { source, receipt: first.receipt }, sink.writer);
  assert.equal(again.wrote, false);
  assert.equal(sink.writes.size, 2);
});

void test('d2_73: a shared approved over another design, other requests or no receipt is refused before any write', async () => {
  const page = await pageOf(design);
  const sink = memory();
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: null }, none, sink.writer), /D2_CONTRACTS_SHARED_RECEIPT_MISSING/u);
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: { ...page.sharedReceipt!, designHash: 'sha256:other' } }, none, sink.writer), /D2_CONTRACTS_BFF_CHANGED/u);
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: { ...page.sharedReceipt!, sourceHash: 'sha256:other' } }, none, sink.writer), /D2_CONTRACTS_SHARED_HASH/u);
  const fewer = await pageOf({ ...design, endpoints: design.endpoints.slice(0, 1) });
  const fewerHash = await sha256Text(fewer.sharedSource);
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedSource: fewer.sharedSource, sharedReceipt: { ...page.sharedReceipt!, sourceHash: fewerHash } }, none, sink.writer), /D2_CONTRACTS_SHARED_REQUESTS/u);
  assert.equal(sink.writes.size, 0);
});

void test('d2_73: a page without endpoints has the empty contract', async () => {
  const page = await pageOf({ types: [], endpoints: [] }, 'hub');
  assert.equal(await contractSourceFor(page), renderEmptyD2Contract(identity, 'hub'));
});

void test('the contracts step completes without a prompt', async () => {
  const page = await pageOf(design);
  const sink = memory();
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'contracts', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2Contracts70', prompt: '', rags: [], planning: { planId: 'contracts70', dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const parent = { ...step, stepId: 1 } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'message-1', threadId: 'thread-1' }, task: { PK: 'task-1' }, isTest: true } as mls.msg.ExecutionContext;
  const intents = await beforePromptStep({ agentName: 'agentD2Contracts70' } as Parameters<typeof beforePromptStep>[0], execution, parent, step, 1, {
    pageIds: async () => [page.pageId], load: async () => page, readExisting: async () => none, writer: sink.writer,
  });
  assert.equal(intents.some(item => item.type === 'prompt_ready'), false);
  assert.equal(intents.some(item => item.type === 'update-status' && item.status === 'completed'), true);
  assert.equal(typeof sink.writes.get(`${identity.module}/web/contracts/${page.pageId}.defs.ts`), 'string');
});

void test('hard-code guard keeps fixture names out of the d2_73 sources', () => {
  const root = join(here, '../..');
  const files = [
    ...['bff55', 'shared60', 'contracts70'].flatMap(step => readdirSync(join(root, 'steps', step)).map(name => join(root, 'steps', step, name))),
    ...['d2Bff.ts', 'd2SharedV2.ts', 'd2ContractV2.ts', 'd2PageSettle.ts'].map(name => join(root, 'helpers', name)),
    join(root, 'skills/genD2SharedDefinition.ts'),
  ].filter(path => (path.endsWith('.ts') || path.endsWith('.md')) && !path.endsWith('.test.ts'));
  const names = /comanda|cardapio|atendimento|garcom|caixa|mesa\b|controleEstoque|produto|movimenta|estoque|despesa|reembolso/iu;
  assert.deepEqual(files.filter(path => names.test(readFileSync(path, 'utf8'))), []);
  assert.ok(files.length >= 12);
  assert.ok(names.test(readFileSync(join(root, 'helpers/fixtures/e2e/dining/answers/bff55/atendimento.json'), 'utf8')));
});
