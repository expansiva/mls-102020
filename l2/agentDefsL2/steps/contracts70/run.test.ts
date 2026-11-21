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
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2BffDesign } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { D2_BFF_VERSION, readUsableD2Bff, type D2BffReceipt } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import type { D2NavDestination } from '/_102020_/l2/agentDefsL2/helpers/d2NavigationIds.js';
import { parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { parseD2SharedV2, renderD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/helpers/sharedV2/format.js';
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
  bindings: { organisms: [{ organism: 'rowList', reads: 'load.rows' }], commands: [{ endpoint: 'saveRow', refreshes: ['load'] }], selections: [], journeys: [], updates: [] },
};

function sharedOf(endpoints: D2BffDesign['endpoints']): D2SharedV2Definition {
  const rules = [...new Set(endpoints.flatMap(item => item.rules))].sort();
  return {
    entry: { params: { rowId: { type: 'string', sources: ['url'], effect: 'select', persist: false, required: false } } },
    requests: Object.fromEntries(endpoints.map(item => [item.id, { kind: item.kind, trigger: item.when, ...(item.writes ? { writes: item.writes } : {}), returns: item.output.map(leaf => leaf.name) }])),
    states: {}, journeys: [], rules, access: { actors: ['clerk'], grants: ['manage'] },
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
  assert.doesNotMatch(source, /\bmeta:/u);
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
  const page = await pageOf({ types: [], endpoints: [], bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] } }, 'hub');
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

/** Recorded agents defs, mls-102047 @ 9e8b640a. The live tree is not read. */
const recordedRoot = join(here, '../../helpers/fixtures/d2_196_9e8b640a');

function recordedDesign(pageId: string): D2BffDesign {
  return JSON.parse(readFileSync(join(recordedRoot, 'pipeline/agentDefsL2/bff', `${pageId}.json`), 'utf8')) as D2BffDesign;
}

function recordedPage11(pageId: string): Record<D2Page11Device, D2Page11Definition> {
  const read = (device: D2Page11Device) => parseD2Page11Definition(readFileSync(join(recordedRoot, 'web', device, 'page11', `${pageId}.defs.ts`), 'utf8')).definition;
  return { desktop: read('desktop'), mobile: read('mobile') };
}

function recordedDestinations(page11: Record<D2Page11Device, D2Page11Definition>): Record<string, D2NavDestination> {
  const destinations: Record<string, D2NavDestination> = {};
  for (const device of ['desktop', 'mobile'] as const) {
    for (const organism of Object.values(page11[device].organisms)) {
      for (const intent of organism.intents) {
        if (intent.kind !== 'navigate' || !intent.to || intent.id.startsWith('backTo') || destinations[intent.to]) continue;
        destinations[intent.to] = {
          shared: parseD2SharedV2(readFileSync(join(recordedRoot, 'web/shared', `${intent.to}.defs.ts`), 'utf8')).definition,
          design: recordedDesign(intent.to),
        };
      }
    }
  }
  return destinations;
}

async function recordedPage(pageId: string): Promise<D2Contracts70Page> {
  const design = recordedDesign(pageId);
  const page11 = recordedPage11(pageId);
  const sharedSource = readFileSync(join(recordedRoot, 'web/shared', `${pageId}.defs.ts`), 'utf8');
  const sharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, project: 102047, module: 'agents', pageId,
    sourceHash: await sha256Text(sharedSource), designHash: await sha256Text(JSON.stringify(design)),
  } as D2SharedReceipt;
  return {
    identity: { project: 102047, module: 'agents' }, pageId, userLanguage: 'en', design,
    access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' }, entities: {},
    sharedSource, sharedReceipt, page11, destinations: recordedDestinations(page11),
  };
}

function projectionBody(source: string, name: string): string {
  const body = parseD2ContractV2(source).projections.find(item => item.name === name)?.body;
  assert.equal(typeof body, 'string', name);
  return body!;
}

void test('d2_196: a navigate to a missing destination still renders the contract, without the id leaf', async () => {
  const page = await pageOf(design);
  const list: D2Page11Definition = {
    template: { category: 'list', experience: 'list' }, intent: 'Open the list.',
    sections: [{ id: 'main', priority: 'main', purpose: 'The list.', organisms: ['rowList'] }],
    organisms: { rowList: { kind: 'list', text: 'Rows.', intents: [{ id: 'openItem', kind: 'navigate', to: 'gone' }] } },
    molecules: {},
  };
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => { warnings.push(String(message)); };
  try {
    const source = await contractSourceFor({ ...page, page11: { desktop: list, mobile: list }, destinations: {} });
    assert.equal(source, await contractSourceFor(page));
    assert.doesNotMatch(source, /\bitemId:/u);
  } finally {
    console.warn = original;
  }
  assert.deepEqual(warnings, ['D2_NAV_ID_DESTINATION_MISSING: rows rowList → gone']);
});

void test('d2_196: recorded agents lists carry the destination id, and a list without that navigation does not change', async () => {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (message?: unknown) => { warnings.push(String(message)); };
  try {
    const agents = await contractSourceFor(await recordedPage('agents'));
    assert.match(projectionBody(agents, 'AgentCard'), /agentId: string;/u);
    for (const name of ['DraftCard', 'DraftInboxItem', 'RequestEvent']) assert.match(projectionBody(agents, name), /draftId: string;/u);
    const conduct = await recordedPage('my_conduct');
    const conductSource = await contractSourceFor(conduct);
    const plain = buildD2ContractFromBff({ module: 'agents', pageId: 'my_conduct', design: conduct.design, access: conduct.access, entities: {}, userLanguage: 'en' });
    assert.equal(projectionBody(conductSource, 'ConductHistoryEntry'), plain.projections.find(item => item.name === 'ConductHistoryEntry')?.body);
    const overview = await recordedPage('agent_overview');
    const overviewSource = await contractSourceFor(overview);
    const overviewPlain = buildD2ContractFromBff({ module: 'agents', pageId: 'agent_overview', design: overview.design, access: overview.access, entities: {}, userLanguage: 'en' });
    assert.equal(parseD2ContractV2(overviewSource).projections.map(item => item.body).join('\n'), overviewPlain.projections.map(item => item.body).join('\n'));
    const catalog = await recordedPage('tool_catalog');
    const catalogSource = await contractSourceFor(catalog);
    const catalogPlain = await renderD2ContractSource(catalog);
    assert.equal(catalogSource, catalogPlain);
  } finally {
    console.warn = original;
  }
  assert.ok(warnings.some(line => line.startsWith('D2_NAV_ID_NO_TYPE: page my_conduct ')));
  assert.equal(warnings.filter(line => line.includes('page agents ')).length, 0);
});

/** The contract of the same page with navigation ids left out, for a byte comparison. */
async function renderD2ContractSource(page: D2Contracts70Page): Promise<string> {
  const { page11: _page11, destinations: _destinations, ...rest } = page;
  return contractSourceFor(rest);
}

void test('hard-code guard keeps fixture names out of the d2_73/d2_75 sources', () => {
  const root = join(here, '../..');
  const files = [
    ...['bff55', 'shared60', 'contracts70'].flatMap(step => readdirSync(join(root, 'steps', step)).map(name => join(root, 'steps', step, name))),
    ...['d2Bff.ts', 'd2SharedV2.ts', 'd2SharedDerive.ts', 'd2ContractV2.ts', 'd2PageSettle.ts'].map(name => join(root, 'helpers', name)),
  ].filter(path => (path.endsWith('.ts') || path.endsWith('.md')) && !path.endsWith('.test.ts'));
  const names = /comanda|cardapio|atendimento|garcom|caixa|mesa\b|controleEstoque|produto|movimenta|estoque|despesa|reembolso/iu;
  assert.deepEqual(files.filter(path => names.test(readFileSync(path, 'utf8'))), []);
  assert.ok(files.length >= 10);
  assert.ok(names.test(readFileSync(join(root, 'helpers/fixtures/e2e/dining/answers/bff55/atendimento.json'), 'utf8')));
});

const versionOrigin = { kind: 'context' as const, paths: [] as string[] };
const versionJsdoc = { purpose: 'p', input: 'i', processing: 'c', output: 'o' };
const versionCatalog = `
export interface CmUpdateAgentInput { agentId: string; }
export interface CmUpdateAgentOutput { version: string; }
export const cm = { "operations": [ { "operationId": "updateAgent", "direction": "call", "inputType": "CmUpdateAgentInput", "outputType": "CmUpdateAgentOutput", "expectsVersion": true } ] };
`;
const versionEntities = {
  Agent: { kind: 'external', connectionId: 'cm', record: { fields: { name: { type: 'string' } } } } as Ns5OntologyAnyEntity,
  Item: { kind: 'entity' } as Ns5OntologyAnyEntity,
};
const versionArtifacts = {
  needs: { pages: [
    { pageId: 'behavior', actors: [], reads: [], writes: [{ entity: 'Agent', operation: 'update' as const }] },
    { pageId: 'plain', actors: [], reads: [], writes: [{ entity: 'Item', operation: 'create' as const }] },
  ] },
  integration: { connections: [{ connectionId: 'cm', operationId: 'updateAgent', direction: 'call', usedBy: ['changeAgentBehavior.requestChange'], effect: 'update' }] },
  journeys: { changeAgentBehavior: { business: { steps: [{ stepId: 'requestChange', kind: 'act', entity: 'Agent', effect: 'update' }] } } },
  catalogs: { cm: versionCatalog },
};

function storedDesign(pageId: 'behavior' | 'plain'): D2BffDesign {
  const external = pageId === 'behavior';
  return {
    types: [{ name: 'Seen', description: 'Seen', fields: [{ name: 'label', type: 'string', origin: versionOrigin }] }],
    endpoints: [
      { id: 'listar', kind: 'qry', when: 'onLoad', input: [], output: [{ name: 'seen', type: 'Seen', origin: versionOrigin }], rules: [], jsdoc: versionJsdoc },
      { id: external ? 'mudar' : 'criar', kind: 'cmd', when: external ? 'requestChange' : 'save', writes: external ? 'Agent.update' : 'Item.create',
        input: external ? [{ name: 'agentId', type: 'string', origin: versionOrigin }, { name: 'expectVersion', type: 'number', origin: versionOrigin }] : [{ name: 'label', type: 'string', origin: versionOrigin }],
        output: [{ name: 'seen', type: 'Seen', origin: versionOrigin }], rules: [], jsdoc: versionJsdoc },
    ],
    bindings: { organisms: [], commands: [], selections: [], journeys: [], updates: [] },
  };
}

async function readStored(pageId: 'behavior' | 'plain', design: D2BffDesign): Promise<D2BffDesign | null> {
  const receipt = { schemaVersion: D2_BFF_VERSION, ...identity, pageId, inputHash: 'in', unitInputHash: 'u', promptHash: 'p', promptChars: 1, repairPromptChars: 0, designHash: await sha256Text(JSON.stringify(design)) } as D2BffReceipt;
  return readUsableD2Bff(identity, pageId, versionArtifacts, versionEntities, {
    readReceipt: async () => receipt,
    readDesign: async () => design,
  });
}

void test('contracts70 reads a saved design: the destination page facts put version on the view, a page without an external command keeps the stored object', async () => {
  const behavior = storedDesign('behavior');
  const plain = storedDesign('plain');
  const withVersion = await readStored('behavior', behavior);
  assert.deepEqual(withVersion?.types.find(item => item.name === 'Seen')?.fields.at(-1), { name: 'version', type: 'number', origin: versionOrigin });
  assert.equal(await readStored('plain', behavior), behavior);
  assert.equal(await readStored('plain', plain), plain);
});
