/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { parseD2Page11Definition, renderD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11WithExperience, d2Page11WriteDuplicates } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { beforePromptStep, reusableD2Page, withPageEnums, withWriteEnum, type D2PagesReusePort } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { d2NormalizeWriteKey, d2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import { gateD2Page11 } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, d2PageChoiceEnums, d2PageWriteKeys, pageUnitInputHash, D2_PAGES_VERSION, type D2PagesContext, type D2PagesResponse, type D2PagesWriter } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

const fixture = <T>(module: string, name: string): T => JSON.parse(readFileSync(new URL(`../../helpers/fixtures/${module}/${name}.json`, import.meta.url), 'utf8')) as T;
const categories = (JSON.parse(readFileSync(new URL('../../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2PagesContext['template']['categories'] }).categories;

function context(module: string, pageId: string): D2PagesContext {
  const menu = fixture<{ tree: Array<{ id: string; kind: string; organisms?: Array<{ kind: string; text: string }>; children?: Array<{ id: string; kind: string; organisms?: Array<{ kind: string; text: string }> }> }>; authorities: Record<string, string[]> }>(module, 'menu');
  const needs = fixture<{ pages: Array<{ pageId: string; actors: string[]; writes: unknown[]; reads: unknown[] }> }>(module, 'needs');
  const found = menu.tree.find(item => item.id === pageId) ?? menu.tree.flatMap(item => item.children ?? []).find(item => item.id === pageId);
  const need = needs.pages.find(item => item.pageId === pageId);
  assert.ok(found?.organisms && need);
  const page = { pageId, label: pageId, actors: need.actors, authorityRefs: [], ancestors: [], journeyRefs: [], organisms: found.organisms, reads: need.reads, writes: need.writes,
    endpoints: [], usecases: [], destinations: [], status: 'toCreate' as const };
  return { identity: { project: 102047, module }, snapshot: { snapshotHash: 'sha256:fixture' } as D2PagesContext['snapshot'],
    artifacts: { menu, needs, entities: {}, access: { grants: [] }, journeys: {}, module: {} } as unknown as D2PagesContext['artifacts'], page,
    template: { categories, catalog: JSON.stringify({ categories }), catalogHash: 'sha256:catalog', templatePaths: new Set(['templates/inventoryControl/page21.md', 'templates/financialTransactions/page21.md']),
      select: async category => ({ experience: category === 'inventoryControl' ? 'splitViewOperations' : 'ledgerTable', reason: 'Derived from page21.', reference: `_102020_/l4/collabux/templates/${category}/page21.md`, content: 'orientation', hash: 'sha256:template' }) },
    inventory: { catalogProject: null, selectedBy: null, directDependencies: [], groups: [], sourceHash: 'sha256:inventory' },
    selectedGroups: Object.fromEntries(found.organisms.map((_, index) => [`organism${index + 1}`, []])), groups: [], moleculeHashes: {}, skill: 'skill', prompt: 'prompt' };
}
function product(): D2PagesResponse {
  const organisms = {
    resumo: { kind: 'summary', text: 'Saldos atuais.', intents: [] },
    alertas: { kind: 'highlights', text: 'Abaixo do mínimo.', intents: [] },
    lista: { kind: 'list', text: 'Produtos.', intents: [] },
    detalhe: { kind: 'detail', text: 'Produto selecionado.', intents: [{ id: 'registrarMovimentacao', kind: 'navigate', to: 'movimentacoes' }] },
    formProduto: { kind: 'form', text: 'Novo produto.', intents: [] },
    acoesCadastro: { kind: 'actions', text: 'Cadastrar.', intents: [{ id: 'cadastrarProduto', kind: 'submit', to: '' }] },
  };
  const definition = { template: { category: 'inventoryControl' }, intent: 'Acompanhar e cadastrar produtos.',
    sections: [{ id: 'principal', priority: 'main', purpose: 'Acompanhar estoque.', organisms: Object.keys(organisms) }], organisms, molecules: {} };
  const draft = { organisms: Object.fromEntries(Object.keys(organisms).map(id => [id, { reads: [], edits: [], selects: '', submits: id === 'acoesCadastro' ? [{ intentId: 'cadastrarProduto', write: 'Produto.create' }] : [] }])) };
  return { desktop: { definition, needs: draft }, mobile: { definition: structuredClone(definition), needs: structuredClone(draft) }, categoryReason: 'Inventory operations.' };
}

void test('groups beforePrompt declares the reasoning model and preserves its strict tool contract', async () => {
  const data = context('controleEstoque', 'produtos');
  const port = { reusable: async () => false, context: async () => data };
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'groups', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentDefsL2PagesPage', prompt: JSON.stringify({ project: 102047, module: 'controleEstoque', pageId: 'produtos', stage: 'groups', attempt: 1 }), rags: [],
    planning: { planId: 'pages50-produtos-groups-1', dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const parent = { ...step, stepId: 1, nextSteps: [step] } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'message-1', threadId: 'thread-1' }, task: { PK: 'task-1' }, isTest: true } as mls.msg.ExecutionContext;
  const agent = { agentName: 'agentDefsL2PagesPage' } as Parameters<typeof beforePromptStep>[0];
  const intents = await beforePromptStep(agent, execution, parent, step, 1, port);
  assert.equal(intents.length, 1);
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.equal(ready.type, 'prompt_ready');
  const systemPrompt = ready.systemPrompt ?? '';
  assert.equal(systemPrompt.startsWith('<!-- modelType: reasoning -->'), true);
  assert.match(systemPrompt, /<!-- reasoningEffort: high -->/u);
  assert.match(systemPrompt, /<!-- x-tool-strict: true -->/u);
  assert.match(systemPrompt, /Select relevant molecular groups by purpose for every organism\. Return exact catalog group IDs\./u);
  assert.equal(ready.tools?.[0]?.function.name, 'submitD2MoleculeGroups');
  assert.equal((ready.toolChoice as { function?: { name?: string } })?.function?.name, 'submitD2MoleculeGroups');
  const schema = ready.tools?.[0]?.function.parameters as { additionalProperties?: boolean; required?: string[]; properties?: { organisms?: { items?: { required?: string[] } } } };
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(schema.required, ['organisms']);
  assert.deepEqual(schema.properties?.organisms?.items?.required, ['organismId', 'groups']);
});

void test('controleEstoque/produtos simulated LLM response writes only page11 v2, drafts and receipt', async () => {
  const writes = new Map<string, unknown>();
  const writer: D2PagesWriter = { writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, source); }, writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, value); } };
  const data = context('controleEstoque', 'produtos');
  const receipt = await approveD2PagesUnit(data, product(), 1400, 0, writer);
  assert.equal(writes.size, 5);
  assert.equal(receipt.menuOrigins.length, 6);
  assert.deepEqual(receipt.menuOrigins.map(item => item.organismId), ['resumo', 'alertas', 'lista', 'detalhe', 'formProduto', 'acoesCadastro']);
  const source = writes.get('controleEstoque/web/desktop/page11/produtos.defs.ts');
  assert.equal(typeof source, 'string');
  const definition = parseD2Page11Definition(source as string).definition;
  assert.equal(definition.template.category, '_102020_/l4/collabux/templates/inventoryControl/page21.md');
  assert.equal(definition.template.experience, 'splitViewOperations');
  assert.deepEqual(Object.keys(definition), ['template', 'intent', 'sections', 'organisms', 'molecules']);
  assert.equal(writes.has('controleEstoque/pipeline/agentDefsL2/page11Needs/produtosDesktop.json'), true);
});

void test('writer replaces the complete existing page11 source without merging old keys', async () => {
  const data = context('controleEstoque', 'produtos');
  const oldSource = 'export const definition = { forbiddenSentinel: true } as const;';
  const writes = new Map<string, string>([
    ['desktop', oldSource], ['mobile', oldSource],
  ]);
  const writer: D2PagesWriter = {
    writeSource: async (info, source) => { writes.set(info.folder.includes('/desktop/') ? 'desktop' : 'mobile', source); },
    writeJson: async () => undefined,
  };
  await approveD2PagesUnit(data, product(), 1400, 0, writer);
  for (const device of ['desktop', 'mobile'] as const) {
    const source = writes.get(device);
    const expected = renderD2Page11Definition({ ...data.identity, pageId: 'produtos', device }, buildD2Page11WithExperience(product()[device].definition, categories));
    assert.equal(source, expected);
    assert.equal(source!.includes('forbiddenSentinel'), false);
  }
});

void test('run gate refuses missing write, unknown field and unknown molecule without writing', async () => {
  const writes: unknown[] = [];
  const writer: D2PagesWriter = { writeSource: async () => { writes.push('source'); }, writeJson: async () => { writes.push('json'); } };
  const data = context('controleEstoque', 'produtos');
  const noWrite = product();
  (noWrite.desktop.needs as { organisms: Record<string, { submits: unknown[] }> }).organisms.acoesCadastro.submits = [];
  await assert.rejects(() => approveD2PagesUnit(data, noWrite, 1400, 0, writer), /D2_PAGE11_SUBMIT_WRITE/u);
  const badField = product();
  (badField.desktop.needs as { organisms: Record<string, { reads: string[] }> }).organisms.lista.reads = ['Produto.unknown'];
  await assert.rejects(() => approveD2PagesUnit(data, badField, 1400, 0, writer), /D2_PAGE11_FIELD_UNKNOWN/u);
  const badMolecule = product();
  (badMolecule.desktop.definition as { molecules: Record<string, unknown> }).molecules.lista = [{ role: 'list', preferred: 'groupviewtable--ml-responsive-data-table' }];
  await assert.rejects(() => approveD2PagesUnit(data, badMolecule, 1400, 0, writer), /D2_PAGE11_MOLECULE_UNKNOWN/u);
  const missingOrganism = product();
  delete (missingOrganism.desktop.definition as { organisms: Record<string, unknown> }).organisms.resumo;
  await assert.rejects(() => approveD2PagesUnit(data, missingOrganism, 1400, 0, writer), /D2_PAGE11_ORGANISMS_MENU|D2_PAGE11_DEVICE_ORGANISMS/u);
  const missingSection = product();
  (missingSection.desktop.definition as { sections: Array<{ organisms: string[] }> }).sections[0].organisms = ['alertas'];
  await assert.rejects(() => approveD2PagesUnit(data, missingSection, 1400, 0, writer), /D2_PAGE11_SECTION_COVERAGE/u);
  const inventedCategory = product();
  (inventedCategory.desktop.definition as { template: { category: string } }).template.category = 'invented';
  (inventedCategory.mobile.definition as { template: { category: string } }).template.category = 'invented';
  await assert.rejects(() => approveD2PagesUnit(data, inventedCategory, 1400, 0, writer), /D2_PAGE11_CATEGORY_UNKNOWN/u);
  assert.deepEqual(writes, []);
});

void test('receipt hashes change with template catalog and design system while input stays fixed', async () => {
  const writer: D2PagesWriter = { writeSource: async () => undefined, writeJson: async () => undefined };
  const original = context('controleEstoque', 'produtos');
  const base = await approveD2PagesUnit(original, product(), 1400, 0, writer);
  const catalogChanged = context('controleEstoque', 'produtos');
  catalogChanged.template.categories = [...catalogChanged.template.categories, { categoryId: 'fixtureExtra' }];
  catalogChanged.template.catalog = JSON.stringify({ categories: catalogChanged.template.categories });
  const afterCatalog = await approveD2PagesUnit(catalogChanged, product(), 1400, 0, writer);
  assert.equal(afterCatalog.inputHash, base.inputHash);
  assert.notEqual(afterCatalog.template.catalogHash, base.template.catalogHash);
  // Page11 records no design-system value, so the design system is neither prompt nor receipt input.
  assert.equal('designSystemHash' in afterCatalog, false);
});

void test('page unit input hash ignores another menu page but tracks its own menu, ontology and needs', async () => {
  const data = context('controleEstoque', 'produtos');
  const base = await pageUnitInputHash(data);
  const unrelated = context('controleEstoque', 'produtos');
  (unrelated.artifacts.menu as { tree: Array<{ label?: string }> }).tree.push({ label: 'Another page' });
  assert.equal(await pageUnitInputHash(unrelated), base);
  const ownMenu = context('controleEstoque', 'produtos');
  ownMenu.page.label = 'Products, revised';
  assert.notEqual(await pageUnitInputHash(ownMenu), base);
  const ownNeeds = context('controleEstoque', 'produtos');
  (ownNeeds.artifacts.needs as { pages: Array<{ pageId: string; reads: string[] }> }).pages.find(page => page.pageId === 'produtos')!.reads.push('Produto.status');
  assert.notEqual(await pageUnitInputHash(ownNeeds), base);
  const ontology = context('controleEstoque', 'produtos');
  ontology.artifacts.entities.Produto = { description: 'Changed product semantics' };
  assert.notEqual(await pageUnitInputHash(ontology), base);
});

void test('language invalidates all pages; applicable grants are isolated by actor and entity', async () => {
  const mine = context('reembolsoDespesas', 'minhas_despesas');
  const team = context('reembolsoDespesas', 'avaliar_despesas_equipe');
  const grants = [
    { grantId: 'mine', actorRef: 'colaborador', entityRefs: ['Despesa'], disclosure: { mode: 'fieldsOnly', allowedFields: ['Despesa.id'] } },
    { grantId: 'team', actorRef: 'gestorEquipe', entityRefs: ['Despesa'], disclosure: { mode: 'fullRecord' } },
    { grantId: 'otherEntity', actorRef: 'gestorEquipe', entityRefs: ['GestorEquipe'], disclosure: { mode: 'fullRecord' } },
  ];
  mine.artifacts.access = { grants };
  team.artifacts.access = { grants };
  const mineLanguage = (mine.artifacts.menu as { userLanguage?: string }).userLanguage;
  const teamLanguage = (team.artifacts.menu as { userLanguage?: string }).userLanguage;
  const mineBase = await pageUnitInputHash(mine);
  const teamBase = await pageUnitInputHash(team);
  (mine.artifacts.menu as { userLanguage?: string }).userLanguage = 'es';
  (team.artifacts.menu as { userLanguage?: string }).userLanguage = 'es';
  assert.notEqual(await pageUnitInputHash(mine), mineBase);
  assert.notEqual(await pageUnitInputHash(team), teamBase);
  (mine.artifacts.menu as { userLanguage?: string }).userLanguage = mineLanguage;
  (team.artifacts.menu as { userLanguage?: string }).userLanguage = teamLanguage;
  assert.equal(await pageUnitInputHash(mine), mineBase);
  assert.equal(await pageUnitInputHash(team), teamBase);
  const mineGrants = (mine.artifacts.access as { grants: typeof grants }).grants;
  mineGrants[0].disclosure.allowedFields!.push('Despesa.details.amount');
  assert.notEqual(await pageUnitInputHash(mine), mineBase);
  assert.equal(await pageUnitInputHash(team), teamBase);
  mineGrants[0].disclosure.allowedFields!.pop();
  mineGrants[2].disclosure.mode = 'fieldsOnly';
  assert.equal(await pageUnitInputHash(mine), mineBase);
  assert.equal(await pageUnitInputHash(team), teamBase);
  mineGrants.reverse();
  assert.equal(await pageUnitInputHash(mine), mineBase);
});

void test('a complete receipt reuses one page with zero writes; draft, context and source drift invalidate it', async () => {
  const data = context('controleEstoque', 'produtos');
  data.groupAssessments = data.page.organisms.map((_, index) => ({ organismId: `organism${index + 1}`, groups: [] }));
  const writes = new Map<string, unknown>();
  const key = (info: { folder: string; shortName: string; extension: string }) => `${info.folder}/${info.shortName}${info.extension}`;
  const writer: D2PagesWriter = { writeSource: async (info, source) => { writes.set(key(info), source); }, writeJson: async (info, value) => { writes.set(key(info), value); } };
  const receipt = await approveD2PagesUnit(data, product(), 1400, 0, writer);
  let reads = 0;
  const port: D2PagesReusePort = {
    readReceipt: async () => receipt,
    context: async () => data,
    readSource: async info => { reads += 1; return writes.get(key(info)) as string; },
    readNeeds: async info => writes.get(key(info)),
  };
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, port), true);
  assert.equal(reads, 2);
  assert.equal(writes.size, 5);
  const previousVersion = { ...receipt, schemaVersion: '2026-09-30-agent-defs-l2-pages-v2' as typeof D2_PAGES_VERSION };
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, { ...port, readReceipt: async () => previousVersion }), false);
  assert.equal(reads, 2);
  const draftKey = 'controleEstoque/pipeline/agentDefsL2/page11Needs/produtosDesktop.json';
  const originalDraft = writes.get(draftKey);
  writes.set(draftKey, { organisms: {} });
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, port), false);
  writes.set(draftKey, originalDraft);
  data.page.label = 'Changed label';
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, port), false);
  data.page.label = 'produtos';
  const sourceKey = 'controleEstoque/web/desktop/page11/produtos.defs.ts';
  writes.set(sourceKey, `${writes.get(sourceKey)}\n// local edit`);
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, port), false);
  writes.set(sourceKey, (writes.get(sourceKey) as string).replace('\n// local edit', ''));
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, port), true);

  // d2_65: a stored page11 with the same write in two organisms is redone, even with a matching receipt.
  const repeated = structuredClone(originalDraft) as { organisms: Record<string, { submits: Array<{ intentId: string; write: string }> }> };
  const owner = Object.values(repeated.organisms).find(row => row.submits.length);
  assert.ok(owner);
  const other = Object.values(repeated.organisms).find(row => row !== owner);
  assert.ok(other);
  other.submits = [...other.submits, { intentId: 'repeatSubmit', write: owner.submits[0].write }];
  writes.set(draftKey, repeated);
  const repeatedReceipt = { ...receipt, needsHashes: { ...receipt.needsHashes, desktop: await sha256Text(JSON.stringify(repeated)) } };
  assert.equal(await reusableD2Page(data.identity, data.page.pageId, { ...port, readReceipt: async () => repeatedReceipt }), false);
});

void test('d2_66: a transition is matched by its id; the schema limits write to the page keys', () => {
  const data = context('reembolsoDespesas', 'minhas_despesas');
  data.page.writes = [...data.page.writes, { entity: 'Despesa', operation: 'transition', transitionRef: 'enviarParaAprovacao', from: [] }];
  const keys = d2PageWriteKeys(data.page);
  assert.deepEqual(keys.filter(key => key.startsWith('Despesa.')).sort(), ['Despesa.create', 'Despesa.enviarParaAprovacao', 'Despesa.reenviarParaAprovacao', 'Despesa.update']);
  const payload = JSON.parse(buildD2PagesDecisionPrompt(data).prompt) as { page: { writeKeys: string[] } };
  assert.deepEqual(payload.page.writeKeys, keys);
  const needsSchema = JSON.parse(readFileSync(new URL('../../schemas/page11NeedsV1.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const limited = withWriteEnum(needsSchema, keys) as { properties: { organisms: { additionalProperties: { properties: { submits: { items: { properties: { write: { enum?: string[] } } } } } } } } };
  assert.deepEqual(limited.properties.organisms.additionalProperties.properties.submits.items.properties.write.enum, keys);
  assert.equal('enum' in ((needsSchema as typeof limited).properties.organisms.additionalProperties.properties.submits.items.properties.write), false);

  // Entity.transition: resolved with one transition of that entity on the page, refused with the keys when there are two.
  const writes = data.page.writes as Array<{ entity: string; operation: string; transitionRef?: string }>;
  const one = writes.filter(write => write.transitionRef !== 'enviarParaAprovacao');
  assert.equal(d2NormalizeWriteKey('Despesa.transition', one), 'Despesa.reenviarParaAprovacao');
  assert.throws(() => d2NormalizeWriteKey('Despesa.transition', writes), /D2_PAGE11_TRANSITION_AMBIGUOUS: .*Despesa\.reenviarParaAprovacao, Despesa\.enviarParaAprovacao|D2_PAGE11_TRANSITION_AMBIGUOUS: .*Despesa\.enviarParaAprovacao/u);
  assert.equal(d2NormalizeWriteKey('Despesa.create', writes), 'Despesa.create');

  // A transition without its id is a named refusal, never Entity.transition.
  assert.throws(() => d2WriteKey({ entity: 'Despesa', operation: 'transition', transitionRef: '' }), /D2_WRITE_TRANSITION_WITHOUT_REF/u);
  const blank = context('reembolsoDespesas', 'minhas_despesas');
  blank.page.writes = blank.page.writes.map(write => (write as { operation: string }).operation === 'transition' ? { ...(write as object), transitionRef: '' } : write);
  assert.throws(() => d2PageWriteKeys(blank.page), /D2_WRITE_TRANSITION_WITHOUT_REF/u);
  const menu = fixture<Parameters<typeof gateD2Page11>[2]['menu']>('reembolsoDespesas', 'menu');
  const needs = fixture<{ pages: Parameters<typeof gateD2Page11>[2]['needsPages'] }>('reembolsoDespesas', 'needs');
  const blankNeeds = needs.pages.map(page => page.pageId === 'minhas_despesas' ? { ...page, writes: page.writes.map(write => write.operation === 'transition' ? { ...write, transitionRef: '' } : write) } : page);
  const anyPage = parseD2Page11Definition(readFileSync(new URL('../../helpers/fixtures/controleEstoque/page11/desktop/produtos.defs.ts', import.meta.url), 'utf8')).definition;
  const anyDraft = JSON.parse(readFileSync(new URL('../../helpers/fixtures/controleEstoque/page11Needs/produtosDesktop.json', import.meta.url), 'utf8'));
  const issues = gateD2Page11(anyPage, anyDraft,
    { pageId: 'minhas_despesas', actor: 'colaborador', menu, needsPages: blankNeeds, entities: {}, access: { grants: [] }, categories, templatePaths: new Set(), moleculeTags: new Set() } as Parameters<typeof gateD2Page11>[2]);
  assert.equal(issues.some(item => item.code === 'D2_PAGE11_TRANSITION_WITHOUT_REF'), true, JSON.stringify(issues.map(item => item.code)));
  assert.equal(issues.filter(item => item.code !== 'D2_PAGE11_TRANSITION_WITHOUT_REF').some(item => item.message.includes('Despesa.transition')), false);
});

void test('d2_67: category, organism kind, navigate target and molecule tags are enums of the page schema', () => {
  const data = context('controleEstoque', 'produtos');
  data.groups = [{ groupId: 'groupViewTable', purpose: 'p', indexReference: '/i', usageReference: '/u', tags: ['groupviewtable--a', 'groupviewtable--b'], scenarios: [], indexSource: '', indexText: '', usageSource: '', usageText: '' }];
  const enums = d2PageChoiceEnums(data);
  assert.ok(enums.categories.includes('inventoryControl') && enums.categories.includes('bespoke'));
  assert.deepEqual(enums.kinds.slice().sort(), [...new Set(data.page.organisms.map(item => (item as { kind: string }).kind))].sort());
  assert.equal(enums.targets[0], '');
  assert.ok(enums.targets.includes('movimentacoes'));
  assert.deepEqual(enums.tags, ['groupviewtable--a', 'groupviewtable--b']);
  const page = JSON.parse(readFileSync(new URL('../../schemas/page11V2.json', import.meta.url), 'utf8')) as Record<string, unknown>;
  const limited = withPageEnums(page, enums) as { properties: { template: { properties: { category: { enum: string[] } } }; organisms: { additionalProperties: { properties: { kind: { enum: string[] }; intents: { items: { properties: { to: { enum: string[] } } } } } } }; molecules: { additionalProperties: { items: { properties: { preferred: { enum: string[] }; alternative: { enum: string[] } } } } } } };
  assert.deepEqual(limited.properties.template.properties.category.enum, enums.categories);
  assert.deepEqual(limited.properties.organisms.additionalProperties.properties.kind.enum, enums.kinds);
  assert.deepEqual(limited.properties.organisms.additionalProperties.properties.intents.items.properties.to.enum, enums.targets);
  assert.deepEqual(limited.properties.molecules.additionalProperties.items.properties.alternative.enum, ['', ...enums.tags]);
  // The enums add no lint finding to the base schema (whose map fields the lint already reports).
  const strip = ({ $schema: _dialect, $id: _id, ...shape }: Record<string, unknown>) => shape;
  assert.deepEqual(lintToolSchema(JSON.stringify(strip(limited as Record<string, unknown>))), lintToolSchema(JSON.stringify(strip(page))));
});

void test('d2_65: the same write in a form and in actions is refused with the place of the submit', () => {
  const real = JSON.parse(readFileSync(new URL('../../helpers/fixtures/clinic/page11Needs/agenda_profissionalDesktop.json', import.meta.url), 'utf8'));
  const issues = d2Page11WriteDuplicates(buildD2Page11Needs(real));
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'D2_PAGE11_WRITE_DUPLICATE');
  assert.match(issues[0].message, /registroAtendimento/u);
  assert.match(issues[0].message, /the actions organism does not repeat it/u);
});

void test('four real reembolsoDespesas pages include the nine minhas_despesas organisms below the prompt ceiling', () => {
  const needs = fixture<{ pages: Array<{ pageId: string }> }>('reembolsoDespesas', 'needs');
  assert.equal(needs.pages.length, 4);
  let maximum = 0;
  for (const page of needs.pages) {
    const data = context('reembolsoDespesas', page.pageId);
    if (page.pageId === 'minhas_despesas') assert.equal(data.page.organisms.length, 9);
    // Frozen copy of the runtime l4 module (see helpers/fixtures/reembolsoDespesas/l4/README.md).
    const frozenL4 = (subpath: string): string => readFileSync(new URL(`../../helpers/fixtures/reembolsoDespesas/${subpath.replace('l4/reembolsoDespesas/', 'l4/')}`, import.meta.url), 'utf8');
    const entityIds = ['Colaborador', 'Despesa', 'GestorEquipe'];
    data.artifacts.entities = Object.fromEntries(entityIds.map(id => [id, parseNs4ClassicDefsSource(frozenL4(`l4/reembolsoDespesas/ontology/${id}.defs.ts`))]));
    data.artifacts.access = parseNs4ClassicDefsSource(frozenL4('l4/reembolsoDespesas/access.defs.ts'));
    const journeyIds = ['avaliarDespesaDaEquipe', 'consultarPropriasDespesas', 'corrigirEreenviarDespesa', 'registrarEenviarDespesa', 'registrarPagamentoDeDespesa'];
    data.artifacts.journeys = Object.fromEntries(journeyIds.map(id => [id, parseNs4ClassicDefsSource(frozenL4(`l4/reembolsoDespesas/journeys/${id}.defs.ts`))]));
    data.page.journeyRefs = journeyIds;
    const prompt = buildD2PagesDecisionPrompt(data);
    const payload = JSON.parse(prompt.prompt) as { designSystem?: unknown; needs: { pages: Array<Record<string, unknown>> }; access: { grants: Array<{ actorRef: string }> } };
    assert.equal('designSystem' in payload, false);
    for (const row of payload.needs.pages) {
      if (row.pageId === page.pageId) assert.deepEqual(row, needs.pages.find(item => item.pageId === page.pageId));
      else assert.deepEqual(Object.keys(row).sort(), ['pageId', 'writes']);
    }
    assert.equal(payload.needs.pages.length, needs.pages.length);
    assert.equal(payload.access.grants.every(grant => data.page.actors.includes(grant.actorRef)), true);
    assert.ok(prompt.chars < 160_000);
    maximum = Math.max(maximum, prompt.chars);
  }
  assert.ok(maximum > 0);
  console.log(`reembolsoDespesas fixture maximum decision prompt: ${maximum} chars`);
});

void test('controleEstoque/produtos molecular context omits repeated indexes with margin below the prompt ceiling', () => {
  const data = context('controleEstoque', 'produtos');
  const groupIds = ['groupNotifyUser', 'groupSearchContent', 'groupShowProgress', 'groupViewCard',
    'groupViewData', 'groupViewTable', 'groupEnterText', 'groupTriggerAction'];
  data.groups = groupIds.map((groupId, index): D2MoleculeGroup => ({
    groupId, purpose: `Published purpose ${index}`, indexReference: `/${groupId}/index`, usageReference: `/${groupId}/usage`,
    tags: [`${groupId.toLowerCase()}--fixture`], scenarios: [{ scenario: `Scenario ${index}`, recommended: [`${groupId.toLowerCase()}--fixture`] }],
    indexSource: `index source ${index}`, indexText: 'repeated-index-content'.repeat(500),
    usageSource: `usage source ${index}`, usageText: 'usage-contract-content'.repeat(350),
  }));
  data.selectedGroups = Object.fromEntries(data.page.organisms.map((_, index) => [`organism${index + 1}`, groupIds]));
  const prompt = buildD2PagesDecisionPrompt(data);
  const payload = JSON.parse(prompt.prompt) as { moleculeResearch: { groups: Array<Record<string, unknown>> } };
  assert.equal(payload.moleculeResearch.groups.length, groupIds.length);
  assert.equal(payload.moleculeResearch.groups.every(group => !Object.hasOwn(group, 'index')), true);
  assert.ok(prompt.chars < 160_000);
  const duplicatedIndexChars = prompt.chars + data.groups.reduce((total, group) => total + group.indexText.length, 0);
  assert.ok(duplicatedIndexChars > 160_000);
  assert.ok(160_000 - prompt.chars > 50_000);
});
