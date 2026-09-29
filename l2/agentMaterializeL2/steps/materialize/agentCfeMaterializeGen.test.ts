/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/materialize/agentCfeMaterializeGen.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;

test('page worker carries the mechanical reference from prompt preparation into normalization before saving', () => {
  const source = readFileSync(path.join(HERE, 'agentCfeMaterializeGen.ts'), 'utf8');
  assert.match(source, /pendingMechanicalReferences\.set\(genContext\.pipelineItem\.outputPath, \{ skeleton, sharedTemplate: sharedTemplate\?\.code \}/u);
  assert.match(source, /normalizeGeneratedCode\(pipelineItem, parsedDefs\?\.data, output\.code, mechanical\?\.skeleton, currentSharedReference\?\.code \?\? mechanical\?\.sharedTemplate\)/u);
  assert.match(source, /pendingMechanicalReferences\.delete\(pipelineItem\.outputPath\)/u);
});

test('renamed page public reference includes full shared source even when skeleton omits an encoded state', async () => {
  const { pageSharedPublicReference } = await import('/_102020_/l2/agentMaterializeL2/steps/materialize/agentCfeMaterializeGen.js');
  const { normalizeGeneratedCode, buildHumanPrompt } = await loadMaterializeCore();
  const name = 'stateFilterStatusX00007300007400006100007400006500003a00006900006e000070000075000074';
  const typo = name.replace('00006e', '0006e');
  const item = { id: 'ledger', type: 'l2_page', outputPath: '_102045_/l2/ledger/web/mobile/page11/records.ts', dependsFiles: ['l2/ledger/web/shared/recordsDts.txt'] };
  const seen: string[] = [];
  const sharedTemplate = await pageSharedPublicReference(item, async ref => { seen.push(ref); return `export class RecordsShared { public ${name}:string|null=null; }`; });
  assert.deepEqual(seen, ['_102045_/l2/ledger/web/shared/records.ts']);
  assert.ok(sharedTemplate);
  const skeleton = 'class Ledger extends RecordsShared {}';
  const code = `this.${typo}`;
  assert.equal(normalizeGeneratedCode(item, 'prose', code, skeleton), code);
  assert.equal(normalizeGeneratedCode(item, 'prose', code, skeleton, sharedTemplate.code), `this.${name}`);
  assert.equal(normalizeGeneratedCode(item, 'prose', code, `${skeleton} ${typo}`, sharedTemplate.code), code);
  assert.match(buildHumanPrompt('prose', [], item.outputPath, undefined, skeleton, sharedTemplate), /Inherited shared public API reference/u);
});

test('page11 monitor cases come only from the current page bindings and contract oracle', async () => {
  const { buildMaterializePageTestsFile } = await import('/_102020_/l2/agentMaterializeL2/helpers/cfeCreateShared.js');
  const savedRoot = path.resolve(MLS_BASE, '../todo/gerarApp/l4/certificacao/runs/p4_16/final_state/l2/web');
  const savedShared = readFileSync(path.join(savedRoot, 'shared/movimentacoes.defs.ts'), 'utf8');
  const marker = 'export const definition = ';
  const start = savedShared.indexOf(marker);
  const end = savedShared.indexOf('\n} as const;', start);
  assert.ok(start >= 0 && end > start);
  const sharedFromP4 = JSON.parse(savedShared.slice(start + marker.length, end + 2));
  const contractFromP4 = readFileSync(path.join(savedRoot, 'contracts/movimentacoes.defs.ts'), 'utf8');
  const savedOutput = buildMaterializePageTestsFile({
    project: 817263, moduleName: 'controleEstoque', pageId: 'movimentacoes', variant: 'page11',
    definition: 'current page prose', shared: sharedFromP4, contract: contractFromP4,
  });
  assert.ok(savedOutput, 'saved current-format shared defs and TS contract must emit cases');
  const savedCases = JSON.parse(savedOutput.match(/export const pageTests = ([\s\S]*?) as const;/u)![1]);
  assert.equal(savedCases.actor, 'estoquista');
  assert.deepEqual(savedCases.cases.map((item: any) => item.id), ['listProduct.ok', 'listStockMovement.ok']);
  assert.equal(savedCases.cases[0].routine, 'controleEstoque.movimentacoes.qryListProduct');
  assert.deepEqual(savedCases.cases[0].expect, { ok: true, shape: 'array' });
  assert.match(savedOutput, /untested: createStockMovement\.input — required DTO input is not representable/u);

  // Copied current shared-v4 envelope, renamed to keep every case independent of a client module.
  const shared = structuredClone(sharedFromP4);
  shared.contractRef.calls = [
    { actionId: 'listPacket', routeConst: 'listPacketRoute', inputType: 'ListPacketInput', outputType: 'ListPacketOutput' },
    { actionId: 'createPacket', routeConst: 'createPacketRoute', inputType: 'CreatePacketInput', outputType: 'CreatePacketOutput' },
  ];
  shared.dataBindings = [
    { actionId: 'listPacket', kind: 'query', routeRef: 'listPacketRoute', inputTypeRef: 'ListPacketInput', outputTypeRef: 'ListPacketOutput', inputStateKeys: [] },
    { actionId: 'createPacket', kind: 'command', routeRef: 'createPacketRoute', inputTypeRef: 'CreatePacketInput', outputTypeRef: 'CreatePacketOutput', inputStateKeys: ['ui.packet.create.input.label'] },
  ];
  shared.states = [
    { stateKey: 'ui.packet.create.input.label', kind: 'input', name: 'label', actionRef: 'createPacket', contractRef: 'CreatePacketInput.label', dtoPath: 'label', source: 'userInput', presentation: 'form', required: true },
    { stateKey: 'ui.packet.list.result', kind: 'queryResult', actionRef: 'listPacket', contractRef: 'ListPacketOutput', outputShape: 'array' },
  ];
  shared.actions = [
    { actionId: 'listPacket', operationBinding: { actorRef: 'packetClerk' } },
    { actionId: 'createPacket', operationBinding: { actorRef: 'packetClerk' } },
  ];
  const contract = `
export const listPacketRoute = 'inventory.packet.list' as const;
export interface ListPacketInput {}
export interface ListPacketItem { id: string; label: string; }
export type ListPacketOutput = ListPacketItem[];
export const createPacketRoute = 'inventory.packet.create' as const;
export interface CreatePacketInput { label: string; }
export interface CreatePacketOutput { id: string; }
`;
  const input = {
    project: 817263, moduleName: 'inventory', pageId: 'packetDesk', variant: 'page11',
    definition: 'page prose', shared, contract,
  };
  const generated = buildMaterializePageTestsFile(input)!;
  const parsed = JSON.parse(generated.match(/export const pageTests = ([\s\S]*?) as const;/u)![1]);
  assert.equal(parsed.moduleName, 'inventory');
  assert.equal(parsed.page, 'packetDesk');
  assert.equal(parsed.variant, 'page11');
  assert.equal(parsed.actor, 'packetClerk');
  assert.deepEqual(parsed.cases[0], {
    id: 'listPacket.ok', routine: 'inventory.packet.list', params: {},
    expect: { ok: true, shape: 'array' },
  });
  assert.deepEqual(parsed.cases.map((item: any) => item.id), ['listPacket.ok', 'createPacket.ok', 'createPacket.label.required']);
  assert.equal(parsed.cases[1].routine, 'inventory.packet.create');
  assert.equal(parsed.cases[1].params.label, 'teste');
  assert.equal(parsed.cases[1].mutating, true);
  const noBindings = buildMaterializePageTestsFile({ ...input, shared: {}, contract: '' });
  assert.equal(noBindings, null, 'no executable case must not create an empty passing monitor suite');
  const noRoute = buildMaterializePageTestsFile({
    ...input,
    contract: contract.replace("export const listPacketRoute = 'inventory.packet.list' as const;", ''),
    shared: { ...shared, dataBindings: [shared.dataBindings[0]] },
  });
  assert.equal(noRoute, null, 'a binding without a literal route remains inconclusive, not an empty suite');
  const resumed = buildMaterializePageTestsFile({ ...input, contract: contract.replace('inventory.packet.create', 'inventory.packet.createV2') })!;
  assert.match(resumed, /inventory\.packet\.createV2/u);
  assert.doesNotMatch(resumed, /inventory\.packet\.create"/u);
  const divergent = structuredClone(shared);
  divergent.dataBindings[1].routeRef = 'otherRoute';
  const partial = buildMaterializePageTestsFile({ ...input, shared: divergent })!;
  assert.doesNotMatch(partial, /createPacket\.ok/u);
  assert.match(partial, /untested: createPacket\.oracle — dataBinding differs/u);
  const otherVariant = buildMaterializePageTestsFile({ ...input, variant: 'page21' })!;
  assert.match(otherVariant, /web\/desktop\/page21\/packetDesk\.test\.ts/u);
  const genSource = readFileSync(path.join(HERE, 'agentCfeMaterializeGen.ts'), 'utf8');
  assert.match(genSource, /if \(genome !== 'page11'\) return null/u);
  assert.match(genSource, /contract: contractSource/u);

  const composer = readFileSync(path.join(MLS_BASE, 'mls-102020/l2/agentMaterializeL2/helpers/cfeCreateShared.ts'), 'utf8');
  assert.match(composer, /frontendPageTestPaths\(project, context, doneModulePages\)/u);
  assert.match(composer, /if \(file && file\.status !== 'deleted'\) return genome/u);
  assert.match(composer, /\{\s*pageTests\s*\}/u);
});

void test('agentCfeMaterializeGen tool schema is provider-clean', async () => {
  const mod = await loadMaterializeCore();
  const errs = lintToolSchema(JSON.stringify(mod.GEN_TOOL.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentCfeMaterializeGen live @ ${modelType}: schema accepted + returns code`, { skip: !liveTestsEnabled() }, async () => {
    const mod = await loadMaterializeCore();
    const r = await callToolProvider(config(), {
      modelType,
      system: mod.buildSystemPrompt([], '/_102020_/l2/mockPage.ts', modelType),
      human: [
        '## Definition',
        '```json',
        JSON.stringify({ componentName: 'mock-page-102020', purpose: 'Render a tiny mock page.' }, null, 2),
        '```',
        '',
        '## Output',
        'Generate only a minimal TypeScript file exporting an empty class. Call the tool with complete code.',
      ].join('\n'),
      tool: mod.GEN_TOOL,
    });
    assertLiveResponse(r);
    assert.ok(isRecord(r.args) && typeof r.args.code === 'string' && r.args.code.includes('class'), `${modelType}: code missing`);
  });
}

async function loadMaterializeCore(): Promise<{ GEN_TOOL: any; buildSystemPrompt: (skills: string[], outputPath: string, modelType: string) => string }> {
  const loaded = await import('/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeCore.js') as Record<string, any>;
  return loaded.default || loaded['module.exports'] || loaded;
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
