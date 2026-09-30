/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2PageRequestsInput } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { gateD2ContractV2 } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { parseD2SharedV2, renderD2SharedV2, sharedFromDerived } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { skill as sharedSkill } from '/_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.js';
import {
  approveD2SharedUnit, buildD2SharedContext, type D2SharedContext, type D2SharedLlmResponse, type D2SharedReceipt, type D2SharedWriter,
} from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { beforePromptStep } from '/_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.js';
import {
  approveD2Contracts70, builtDefinition, contractSourceFor, executeD2Contracts70, productionContractsPort, renderEmptyD2Contract,
  type D2Contracts70Existing, type D2Contracts70Page, type D2Contracts70Writer,
} from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, '../../helpers/fixtures');
const promptText = readFileSync(join(here, '../shared60/prompt.md'), 'utf8');
const categories = (JSON.parse(readFileSync(new URL('../../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2PageRequestsInput['categories'] }).categories;

function loadPack(folder: string) {
  const root = join(fixtureRoot, folder);
  const menu = JSON.parse(readFileSync(join(root, 'menu.json'), 'utf8')) as D2PageRequestsInput['menu'];
  const needs = JSON.parse(readFileSync(join(root, 'needs.json'), 'utf8')) as { pages: D2PageRequestsInput['needsPages'] };
  const access = JSON.parse(readFileSync(join(root, 'access.json'), 'utf8')) as { grants: D2PageRequestsInput['access']['grants'] };
  const rules = JSON.parse(readFileSync(join(root, 'rules.json'), 'utf8')) as D2PageRequestsInput['rules'];
  const entities: Record<string, Ns5OntologyAnyEntity> = {};
  for (const file of readdirSync(join(root, 'ontology'))) {
    const row = JSON.parse(readFileSync(join(root, 'ontology', file), 'utf8')) as Ns5OntologyAnyEntity;
    entities[(row as { entityId: string }).entityId] = row;
  }
  const pages = readdirSync(join(root, 'page11/desktop')).map(name => name.replace(/\.defs\.ts$/u, ''));
  const siblings = pages.map(pageId => ({
    pageId,
    desktop: parseD2Page11Definition(readFileSync(join(root, 'page11/desktop', `${pageId}.defs.ts`), 'utf8')).definition,
    mobile: parseD2Page11Definition(readFileSync(join(root, 'page11/mobile', `${pageId}.defs.ts`), 'utf8')).definition,
    draftDesktop: buildD2Page11Needs(JSON.parse(readFileSync(join(root, 'page11Needs', `${pageId}Desktop.json`), 'utf8'))),
    draftMobile: buildD2Page11Needs(JSON.parse(readFileSync(join(root, 'page11Needs', `${pageId}Mobile.json`), 'utf8'))),
    desktopText: readFileSync(join(root, 'page11/desktop', `${pageId}.defs.ts`), 'utf8'),
    mobileText: readFileSync(join(root, 'page11/mobile', `${pageId}.defs.ts`), 'utf8'),
    draftDesktopText: readFileSync(join(root, 'page11Needs', `${pageId}Desktop.json`), 'utf8'),
    draftMobileText: readFileSync(join(root, 'page11Needs', `${pageId}Mobile.json`), 'utf8'),
  }));
  return { menu, needs, access, rules, entities, siblings };
}

function renameDeep(value: unknown): unknown {
  const map: Record<string, string> = {
    controleEstoque: 'alphaWarehouse', produtos: 'catalogItems', movimentacoes: 'stockMoves',
    Produto: 'CatalogItem', MovimentacaoEstoque: 'StockMove', produto: 'catalogItem',
    estoquista: 'clerk', gerenciarEstoque: 'manageStock',
  };
  const rewrite = (text: string): string => {
    let next = text;
    for (const [from, to] of Object.entries(map)) next = next.split(from).join(to);
    return next;
  };
  if (typeof value === 'string') return rewrite(value);
  if (Array.isArray(value)) return value.map(renameDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[rewrite(key)] = renameDeep(item);
    return out;
  }
  return value;
}

function contextFrom(pack: ReturnType<typeof loadPack>, pageId: string, moduleName: string): D2SharedContext {
  const sibling = pack.siblings.find(item => item.pageId === pageId);
  if (!sibling) throw new Error(pageId);
  const input: D2PageRequestsInput = {
    module: moduleName, pageId,
    desktop: sibling.desktop, mobile: sibling.mobile,
    draftDesktop: sibling.draftDesktop, draftMobile: sibling.draftMobile,
    siblings: pack.siblings, needsPages: pack.needs.pages, menu: pack.menu,
    entities: pack.entities, access: pack.access, rules: pack.rules, categories,
  };
  return buildD2SharedContext(input, {
    identity: { project: 102047, module: moduleName }, inputHash: 'sha256:fixture',
    page11: { desktop: sibling.desktop, mobile: sibling.mobile },
    page11Text: { desktop: sibling.desktopText, mobile: sibling.mobileText },
    drafts: { desktop: sibling.draftDesktop, mobile: sibling.draftMobile },
    draftText: { desktop: sibling.draftDesktopText, mobile: sibling.draftMobileText },
    skill: sharedSkill, prompt: promptText,
  });
}

function answer(data: D2SharedContext, patch?: Partial<D2SharedLlmResponse>): D2SharedLlmResponse {
  const page = data.page11.desktop;
  const load = data.derived.requests.find(item => item.id === 'load');
  const command = data.derived.requests.find(item => item.kind === 'cmd');
  const navigate = Object.values(page.organisms).flatMap(item => item.intents).find(item => item.kind === 'navigate');
  const steps = data.input.needsPages.find(item => item.pageId === data.input.pageId)?.reads.flatMap(item => item.from.filter(ref => ref.startsWith('journey:')).map(ref => ref.slice('journey:'.length))) ?? [];
  const uniqueSteps = [...new Set(steps)];
  const firstOrganism = Object.keys(page.organisms)[0];
  const returnKey = load?.returns[0] ?? '';
  const selectTargets = [...new Set(Object.values(data.drafts.desktop.organisms).map(row => row.selects).filter(Boolean))];
  const carried = Object.entries(data.derived.entry.params).find(([, param]) => param.effect.startsWith('select:'));
  const functions: D2SharedLlmResponse['functions'] = [
    { id: 'load', description: 'Load the page.' },
    ...data.derived.requests.flatMap(request => request.lists.flatMap(list => [
      { id: list.filter, description: 'Filter the loaded list.' },
      { id: list.loadMore, description: 'Load another page of the list.' },
    ])),
    ...(selectTargets.length ? [{ id: 'chooseRow', sets: 'selected', description: 'Choose a row.' }] : []),
    ...(command ? [{ id: command.id, ...(returnKey ? { updates: ['rows'] } : {}), description: 'Submit the form.' }] : []),
    ...(navigate ? [{ id: navigate.id, navigate: navigate.to, ...(carried ? { carries: { [carried[0]]: 'selected.id' } } : {}), description: 'Open the related page.' }] : []),
  ];
  return {
    states: [
      ...(returnKey ? [
        { id: 'rows', source: `load.${returnKey}`, description: 'Rows loaded for the page.' },
        { id: 'narrowed', source: 'rows', description: 'Rows narrowed from the loaded rows.' },
      ] : []),
      ...(selectTargets.length ? [{ id: 'selected', source: 'chooseRow', description: 'Row chosen on the page.' }] : []),
      ...(command ? [{ id: 'draft', source: `${command.id}.input`, description: 'Values captured by the form.' }] : []),
    ],
    functions,
    journeys: uniqueSteps.map(step => ({ step, organisms: [firstOrganism], functions: ['load'] })),
    commandReturns: command ? [{ requestId: command.id, returns: command.returns }] : [],
    formChoices: (() => {
      const taken = new Set<string>();
      return Object.values(data.derived.forms).filter(item => item.ambiguous).map(item => {
        const organism = Object.entries(data.drafts.desktop.organisms).find(([id, row]) => !taken.has(id) && row.edits.some(path => path.split('.')[0] === item.entity))?.[0] ?? '';
        if (organism) taken.add(organism);
        return { submit: item.submit, organism };
      });
    })(),
    ...patch,
  };
}

function memoryShared(): { writer: D2SharedWriter; writes: Map<string, unknown> } {
  const writes = new Map<string, unknown>();
  return { writes, writer: {
    writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, source); },
    writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, value); },
  } };
}

function memoryContracts(): { writer: D2Contracts70Writer; writes: Map<string, unknown> } {
  const writes = new Map<string, unknown>();
  return { writes, writer: {
    writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, source); },
    writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, value); },
  } };
}

async function approvedPage(data: D2SharedContext): Promise<D2Contracts70Page> {
  const stored = memoryShared();
  const receipt = await approveD2SharedUnit(data, answer(data), 40, 0, stored.writer);
  const source = stored.writes.get(`${data.identity.module}/web/shared/${data.input.pageId}.defs.ts`);
  if (typeof source !== 'string') throw new Error('shared missing');
  return {
    identity: data.identity, pageId: data.input.pageId, derived: data.derived, entities: data.input.entities,
    sharedSource: source, sharedReceipt: receipt,
  };
}

const none: D2Contracts70Existing = { source: null, receipt: null };

void test('fixture contracts match the golden byte for byte and stay inside the projection', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  for (const pageId of ['produtos', 'movimentacoes'] as const) {
    const page = await approvedPage(contextFrom(pack, pageId, moduleName));
    const sink = memoryContracts();
    const result = await approveD2Contracts70(page, none, sink.writer);
    const source = sink.writes.get(`${moduleName}/web/contracts/${pageId}.defs.ts`);
    assert.equal(source, readFileSync(join(fixtureRoot, 'controleEstoque/expected/contracts', `${pageId}.defs.ts`), 'utf8'));
    const parsed = parseD2SharedV2(page.sharedSource);
    assert.deepEqual(gateD2ContractV2(builtDefinition(page), page.derived, parsed.definition, page.entities), []);
    assert.equal(result.receipt.sharedHash, await sha256Text(page.sharedSource));
    assert.equal(result.receipt.schemaVersion.includes('contracts-v2'), true);
    assert.equal(result.wrote, true);
    const again = await approveD2Contracts70(page, { source: source as string, receipt: result.receipt }, sink.writer);
    assert.equal(again.wrote, false);
    assert.equal(sink.writes.size, 2);
  }
});

void test('the contract gate refuses an edited definition for each closed check', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const page = await approvedPage(contextFrom(pack, 'produtos', moduleName));
  const shared = parseD2SharedV2(page.sharedSource).definition;
  const codes = (definition: ReturnType<typeof builtDefinition>, derived = page.derived) =>
    gateD2ContractV2(definition, derived, shared, page.entities).map(item => item.code);
  const base = builtDefinition(page);
  assert.deepEqual(codes(base), []);

  const unknown = structuredClone(base);
  unknown.projections.push({ name: 'UnknownProjection', entityId: 'Missing', requestIds: ['missing'], body: '  id: string;' });
  assert.equal(codes(unknown).includes('D2_CONTRACT_V2_PROJECTION_UNKNOWN'), true);

  const outside = structuredClone(base);
  outside.projections[0].body += '\n  outside: string;';
  assert.equal(codes(outside).includes('D2_CONTRACT_V2_FIELD_OUTSIDE'), true);

  const version = structuredClone(base);
  version.projections[0].body = version.projections[0].body.replace('id: string;', 'id: string;\n  version: number;');
  assert.equal(codes(version).includes('D2_CONTRACT_V2_VERSION'), true);
  const required = structuredClone(page.derived);
  required.projections[0].includeVersion = true;
  assert.equal(codes(base, required).includes('D2_CONTRACT_V2_VERSION'), true);

  const derivedField = structuredClone(base);
  derivedField.projections[0].body = derivedField.projections[0].body.replace('readonly saldoAtual', 'saldoAtual');
  assert.equal(codes(derivedField).includes('D2_CONTRACT_V2_DERIVED'), true);
  const derivedInput = structuredClone(base);
  const create = derivedInput.routes.find(item => item.kind === 'cmd');
  if (!create) throw new Error('create route missing');
  create.input = create.input.replace('quantidadeMinima: number', 'quantidadeMinima: number; saldoAtual: number');
  assert.equal(codes(derivedInput).includes('D2_CONTRACT_V2_DERIVED'), true);

  const input = structuredClone(base);
  const command = input.routes.find(item => item.kind === 'cmd');
  if (!command) throw new Error('create route missing');
  command.input = command.input.replace('{ details:', '{ extra: string; details:');
  const inputCodes = codes(input);
  assert.equal(inputCodes.includes('D2_CONTRACT_V2_INPUT'), true);
  assert.equal(inputCodes.includes('D2_CONTRACT_V2_DERIVED'), false);
});

void test('a changed shared rewrites only that page', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const products = await approvedPage(contextFrom(pack, 'produtos', moduleName));
  const moves = await approvedPage(contextFrom(pack, 'movimentacoes', moduleName));
  const first = memoryContracts();
  const stored = new Map<string, { source: string; receipt: D2Contracts70Page['sharedReceipt'] }>();
  const run = (pages: D2Contracts70Page[]) => executeD2Contracts70({
    pageIds: async () => pages.map(item => item.pageId),
    load: async pageId => pages.find(item => item.pageId === pageId)!,
    readExisting: async pageId => {
      const row = stored.get(pageId);
      return row ? { source: row.source, receipt: row.receipt as D2Contracts70Existing['receipt'] } : none;
    },
    writer: {
      writeSource: async (info, source) => {
        first.writes.set(`${info.shortName}:source`, source);
        const current = stored.get(info.shortName) ?? { source: '', receipt: null };
        stored.set(info.shortName, { ...current, source });
      },
      writeJson: async (info, value) => {
        first.writes.set(`${info.shortName}:receipt`, value);
        const current = stored.get(info.shortName) ?? { source: '', receipt: null };
        stored.set(info.shortName, { ...current, receipt: value as D2Contracts70Page['sharedReceipt'] });
      },
    },
  });
  const opened = await run([products, moves]);
  assert.deepEqual(opened.wrote.sort(), ['movimentacoes', 'produtos']);
  first.writes.clear();
  const changedSource = products.sharedSource.replace('Rows loaded for the page.', 'Rows loaded again for the page.');
  const changed: D2Contracts70Page = {
    ...products,
    sharedSource: changedSource,
    sharedReceipt: { ...products.sharedReceipt!, sourceHash: await sha256Text(changedSource) },
  };
  const second = await run([changed, moves]);
  assert.deepEqual(second.wrote, ['produtos']);
  assert.deepEqual(second.reused, ['movimentacoes']);
  assert.equal([...first.writes.keys()].every(key => key.startsWith('produtos:')), true);
});

void test('renamed and synthetic pages keep the contract shape, including an empty request list', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const original = await approvedPage(contextFrom(pack, 'produtos', moduleName));
  const renamedPack = renameDeep(pack) as ReturnType<typeof loadPack>;
  const renamed = await approvedPage(contextFrom(renamedPack, 'catalogItems', 'alphaWarehouse'));
  const left = contractSourceFor(original);
  const right = contractSourceFor(renamed);
  assert.equal(renameDeep(left), right);
  assert.equal(/controleEstoque|produto|movimenta|estoque/iu.test(right), false);

  const base = contextFrom(pack, 'produtos', moduleName);
  const quiet = structuredClone(base.page11.desktop);
  const quietDraft = structuredClone(base.drafts.desktop);
  for (const row of Object.values(quiet.organisms)) row.intents = [];
  for (const row of Object.values(quietDraft.organisms)) { row.reads = []; row.edits = []; row.submits = []; }
  const staticData = buildD2SharedContext({
    ...base.input, desktop: quiet, mobile: quiet, draftDesktop: quietDraft, draftMobile: quietDraft,
  }, { ...base, page11: { desktop: quiet, mobile: quiet }, drafts: { desktop: quietDraft, mobile: quietDraft } });
  assert.deepEqual(staticData.derived.requests, []);
  const staticShared = renderD2SharedV2({ project: 102047, module: moduleName, pageId: 'produtos' }, sharedFromDerived(staticData.derived));
  const staticPage: D2Contracts70Page = {
    identity: base.identity, pageId: 'produtos', derived: staticData.derived, entities: base.input.entities,
    sharedSource: staticShared,
    sharedReceipt: { ...(original.sharedReceipt as D2SharedReceipt), sourceHash: await sha256Text(staticShared), pageId: 'produtos' },
  };
  const staticSink = memoryContracts();
  await approveD2Contracts70(staticPage, none, staticSink.writer);
  assert.equal(staticSink.writes.get(`${moduleName}/web/contracts/produtos.defs.ts`), renderEmptyD2Contract(base.identity, 'produtos'));

  const plain = contextFrom(pack, 'produtos', moduleName);
  const listEntity = Object.values(plain.input.draftDesktop.organisms).flatMap(row => row.reads).map(path => path.split('.')[0])[0];
  const entities = structuredClone(plain.input.entities);
  const caps = (entities[listEntity] as { capabilities?: Record<string, unknown> }).capabilities ?? {};
  delete caps['locate.byName'];
  delete caps['locate.byColumn'];
  delete caps['listByForeignKey'];
  const desktop = structuredClone(plain.page11.desktop);
  desktop.template = { ...desktop.template, category: 'readOnlyDetailPortal' };
  const unsearched = buildD2SharedContext({
    ...plain.input, entities, desktop, mobile: desktop,
  }, { ...plain, page11: { desktop, mobile: desktop } });
  const load = unsearched.derived.requests.find(item => item.id === 'load');
  assert.deepEqual(load?.lists, []);
  const bare = renderD2SharedV2({ ...plain.identity, pageId: plain.input.pageId }, sharedFromDerived(unsearched.derived));
  const barePage: D2Contracts70Page = {
    identity: plain.identity, pageId: plain.input.pageId, derived: unsearched.derived, entities,
    sharedSource: bare,
    sharedReceipt: { ...(original.sharedReceipt as D2SharedReceipt), sourceHash: await sha256Text(bare) },
  };
  const bareSource = contractSourceFor(barePage);
  assert.equal(bareSource.includes('export {}'), false);
  assert.equal(bareSource.includes(`'${moduleName}.${plain.input.pageId}.load'`), true);
  const outside = builtDefinition(barePage);
  outside.projections[0].body += '\n  outside: string;';
  const issues = gateD2ContractV2(outside, barePage.derived, parseD2SharedV2(bare).definition, entities);
  assert.equal(issues.some(item => item.code === 'D2_CONTRACT_V2_FIELD_OUTSIDE'), true);
});

void test('a missing or divergent shared receipt refuses before any write', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const page = await approvedPage(contextFrom(pack, 'produtos', moduleName));
  const sink = memoryContracts();
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: null }, none, sink.writer), /D2_CONTRACTS_SHARED_RECEIPT_MISSING/u);
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: { ...page.sharedReceipt!, sourceHash: 'sha256:other' } }, none, sink.writer), /D2_CONTRACTS_SHARED_HASH/u);
  await assert.rejects(() => approveD2Contracts70({ ...page, sharedReceipt: { ...page.sharedReceipt!, pageId: 'other' } }, none, sink.writer), /D2_CONTRACTS_SHARED_RECEIPT/u);
  assert.equal(sink.writes.size, 0);
});

void test('the contracts step completes without a prompt', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const page = await approvedPage(contextFrom(pack, 'movimentacoes', moduleName));
  const sink = memoryContracts();
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'contracts', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2Contracts70', prompt: '', rags: [],
    planning: { planId: 'contracts70', dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const parent = { ...step, stepId: 1 } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'message-1', threadId: 'thread-1' }, task: { PK: 'task-1' }, isTest: true } as mls.msg.ExecutionContext;
  const intents = await beforePromptStep({ agentName: 'agentD2Contracts70' } as Parameters<typeof beforePromptStep>[0], execution, parent, step, 1, {
    pageIds: async () => [page.pageId],
    load: async () => page,
    readExisting: async () => none,
    writer: sink.writer,
  });
  assert.equal(intents.some(item => item.type === 'prompt_ready'), false);
  assert.equal(intents.some(item => item.type === 'update-status'), true);
  assert.equal(typeof sink.writes.get(`${moduleName}/web/contracts/${page.pageId}.defs.ts`), 'string');
});

void test('production port treats a missing contract file as absent and writes it on the first run', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const root = join(fixtureRoot, 'controleEstoque');
  const identity = { project: 102047, module: moduleName };
  const pages = await Promise.all(['produtos', 'movimentacoes'].map(async pageId => approvedPage(contextFrom(pack, pageId, moduleName))));
  const files = new Map<string, string>();
  const put = (project: number, level: number, folder: string, shortName: string, extension: string, content: string) => {
    files.set(`${project}:${level}:${folder}:${shortName}${extension}`, content);
  };
  const defs = (value: unknown) => `export const definition = ${JSON.stringify(value)} as const;\n`;
  put(102047, 2, `${moduleName}/pipeline/agentDefsL2`, 'input', '.json', readFileSync(join(root, 'input.json'), 'utf8'));
  put(102047, 4, moduleName, 'module', '.defs.ts', defs({ schemaVersion: 'test' }));
  put(102047, 4, `${moduleName}/journeys`, 'index', '.defs.ts', defs({ journeys: [] }));
  put(102047, 4, `${moduleName}/ontology`, 'index', '.defs.ts', defs({ entities: [{ entityId: 'Produto' }, { entityId: 'MovimentacaoEstoque' }] }));
  for (const name of ['Produto', 'MovimentacaoEstoque']) {
    put(102047, 4, `${moduleName}/ontology`, name, '.defs.ts', defs(JSON.parse(readFileSync(join(root, 'ontology', `${name}.json`), 'utf8'))));
  }
  put(102047, 4, moduleName, 'rules', '.defs.ts', defs(JSON.parse(readFileSync(join(root, 'rules.json'), 'utf8'))));
  put(102047, 4, moduleName, 'workflows', '.defs.ts', defs({ schemaVersion: 'test' }));
  put(102047, 4, moduleName, 'access', '.defs.ts', defs(JSON.parse(readFileSync(join(root, 'access.json'), 'utf8'))));
  put(102047, 4, moduleName, 'integration', '.defs.ts', defs({ schemaVersion: 'test' }));
  put(102047, 4, `${moduleName}/pool/l2/web`, 'menu', '.json', readFileSync(join(root, 'menu.json'), 'utf8'));
  put(102047, 4, `${moduleName}/pool/l1/web`, 'needs', '.json', readFileSync(join(root, 'needs.json'), 'utf8'));
  put(102047, 4, `${moduleName}/pool/l2/web`, 'backend', '.json', '{}\n');
  put(102047, 4, `${moduleName}/pool/l2/web`, 'effort', '.json', '{}\n');
  put(102020, 4, 'collabux/templates', 'categoryList', '.json', readFileSync(new URL('../../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8'));
  for (const page of pages) {
    for (const device of ['desktop', 'mobile'] as const) {
      put(102047, 2, `${moduleName}/web/${device}/page11`, page.pageId, '.defs.ts', readFileSync(join(root, 'page11', device, `${page.pageId}.defs.ts`), 'utf8'));
      const draftName = `${page.pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`;
      put(102047, 2, `${moduleName}/pipeline/agentDefsL2/page11Needs`, draftName, '.json', readFileSync(join(root, 'page11Needs', `${draftName}.json`), 'utf8'));
    }
    put(102047, 2, `${moduleName}/web/shared`, page.pageId, '.defs.ts', page.sharedSource);
    put(102047, 2, `${moduleName}/pipeline/agentDefsL2/shared60`, page.pageId, '.json', `${JSON.stringify(page.sharedReceipt)}\n`);
  }
  const previous = (globalThis as unknown as { mls?: unknown }).mls;
  const storFiles: Record<string, { status: string; content: string; getValueInfo: () => Promise<{ content: string }>; getContent: () => Promise<string> }> = {};
  const keyOf = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `${info.project}:${info.level}:${info.folder}:${info.shortName}${info.extension}`;
  const makeFile = (content: string) => {
    const file = { status: 'nochange', content, getValueInfo: async () => ({ content: file.content }), getContent: async () => file.content };
    return file;
  };
  for (const [key, content] of files) storFiles[key] = makeFile(content);
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: 102047,
    stor: {
      files: storFiles,
      getKeyToFile: keyOf,
      addOrUpdateFile: async (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => {
        const key = keyOf(info);
        const file = storFiles[key] ?? makeFile('');
        storFiles[key] = file;
        return file;
      },
      localStor: { setContent: async (file: { content: string }, value: { content: string }) => { file.content = value.content; } },
    },
  };
  try {
    const port = await productionContractsPort(identity);
    const before = await port.readExisting('produtos');
    assert.equal(before.source, null);
    const result = await executeD2Contracts70(port);
    assert.equal(result.wrote.includes('produtos'), true);
    const after = await port.readExisting('produtos');
    assert.equal(typeof after.source, 'string');
    assert.equal((after.source ?? '').includes('export '), true);
  } finally {
    (globalThis as unknown as { mls?: unknown }).mls = previous;
  }
});

void test('hard-code guard keeps fixture names out of the contracts step', () => {
  const hits: string[] = [];
  for (const name of readdirSync(here)) {
    if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue;
    if (/controleEstoque|produto|movimenta|estoque/iu.test(readFileSync(join(here, name), 'utf8'))) hits.push(name);
  }
  assert.deepEqual(hits, []);
  assert.equal(/controleEstoque|produto|movimenta|estoque/iu.test(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')), true);
});
