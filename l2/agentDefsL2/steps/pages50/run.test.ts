/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, type D2PagesContext, type D2PagesResponse, type D2PagesWriter } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';

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
    selectedGroups: Object.fromEntries(found.organisms.map((_, index) => [`organism${index + 1}`, []])), groups: [], moleculeHashes: {}, skill: 'skill', prompt: 'prompt', designSystem: 'tokens' };
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
  assert.equal(definition.template.experience, 'splitViewOperations');
  assert.deepEqual(Object.keys(definition), ['template', 'intent', 'sections', 'organisms', 'molecules']);
  assert.equal(writes.has('controleEstoque/pipeline/agentDefsL2/page11Needs/produtosDesktop.json'), true);
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
  assert.equal(afterCatalog.designSystemHash, base.designSystemHash);
  const designChanged = context('controleEstoque', 'produtos');
  designChanged.designSystem = 'tokens with a new palette';
  const afterDesign = await approveD2PagesUnit(designChanged, product(), 1400, 0, writer);
  assert.equal(afterDesign.inputHash, base.inputHash);
  assert.notEqual(afterDesign.designSystemHash, base.designSystemHash);
  assert.equal(afterDesign.template.catalogHash, base.template.catalogHash);
});

void test('four real reembolsoDespesas pages include the nine minhas_despesas organisms below the prompt ceiling', () => {
  const needs = fixture<{ pages: Array<{ pageId: string }> }>('reembolsoDespesas', 'needs');
  assert.equal(needs.pages.length, 4);
  let maximum = 0;
  for (const page of needs.pages) {
    const data = context('reembolsoDespesas', page.pageId);
    if (page.pageId === 'minhas_despesas') assert.equal(data.page.organisms.length, 9);
    const liveFixture = (subpath: string): string => readFileSync(new URL(`../../../../../mls-102047/${subpath}`, import.meta.url), 'utf8');
    const entityIds = ['Colaborador', 'Despesa', 'GestorEquipe'];
    data.artifacts.entities = Object.fromEntries(entityIds.map(id => [id, parseNs4ClassicDefsSource(liveFixture(`l4/reembolsoDespesas/ontology/${id}.defs.ts`))]));
    data.artifacts.access = parseNs4ClassicDefsSource(liveFixture('l4/reembolsoDespesas/access.defs.ts'));
    const journeyIds = ['avaliarDespesaDaEquipe', 'consultarPropriasDespesas', 'corrigirEreenviarDespesa', 'registrarEenviarDespesa', 'registrarPagamentoDeDespesa'];
    data.artifacts.journeys = Object.fromEntries(journeyIds.map(id => [id, parseNs4ClassicDefsSource(liveFixture(`l4/reembolsoDespesas/journeys/${id}.defs.ts`))]));
    data.page.journeyRefs = journeyIds;
    data.designSystem = liveFixture('l2/designSystem.ts');
    const prompt = buildD2PagesDecisionPrompt(data);
    assert.ok(prompt.chars < 160_000);
    maximum = Math.max(maximum, prompt.chars);
  }
  assert.ok(maximum > 0);
  console.log(`reembolsoDespesas fixture maximum decision prompt: ${maximum} chars`);
});
