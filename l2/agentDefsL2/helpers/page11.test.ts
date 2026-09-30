/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/page11.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2Page11Definition, d2Page11Path, parseD2Page11Definition, renderD2Page11Definition, type D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, d2Page11NeedsPath, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { buildD2Page11WithExperience, deriveD2Page11CategoryReference, deriveD2Page11Experience, gateD2Page11, gateD2Page11Pair, type D2Page11GateSources, type D2Page11Menu, type D2Page11NeedPage } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';

const fixture = <T>(module: string, name: string): T => JSON.parse(readFileSync(new URL(`./fixtures/${module}/${name}.json`, import.meta.url), 'utf8')) as T;
const categories = (JSON.parse(readFileSync(new URL('../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2Page11GateSources['categories'] }).categories;
const tags = new Set(['groupviewtable--ml-responsive-data-table', 'groupentertext--ml-enter-text']);
const templatePaths = new Set(['templates/inventoryControl/page21.md', 'templates/financialTransactions/page21.md']);
const productMenu = fixture<D2Page11Menu>('controleEstoque', 'menu');
const productNeeds = fixture<{ pages: D2Page11NeedPage[] }>('controleEstoque', 'needs');
const expenseMenu = fixture<D2Page11Menu>('reembolsoDespesas', 'menu');
const expenseNeeds = fixture<{ pages: D2Page11NeedPage[] }>('reembolsoDespesas', 'needs');

function product(): D2Page11Definition {
  return buildD2Page11Definition({
    template: { category: '_102020_/l4/collabux/templates/inventoryControl/page21.md', experience: 'splitViewOperations' },
    intent: 'Ler "saldo", crase `x` e ${literal} sem executar texto.',
    sections: [
      { id: 'situacao', priority: 'primary', purpose: 'Saldos e avisos.', organisms: ['resumo', 'alertas'] },
      { id: 'catalogo', priority: 'main', purpose: 'Escolher e consultar.', organisms: ['lista', 'detalhe'] },
      { id: 'cadastro', priority: 'secondary', purpose: 'Cadastrar.', organisms: ['formProduto', 'acoesCadastro'] },
    ],
    organisms: {
      resumo: { kind: 'summary', text: 'Saldo.', intents: [] },
      alertas: { kind: 'highlights', text: 'Avisos.', intents: [] },
      lista: { kind: 'list', text: 'Produtos.', intents: [] },
      detalhe: { kind: 'detail', text: 'Produto e movimento.', intents: [{ id: 'registrarMovimentacao', kind: 'navigate', to: 'movimentacoes' }] },
      formProduto: { kind: 'form', text: 'Campos do produto.', intents: [] },
      acoesCadastro: { kind: 'actions', text: 'Cadastrar.', intents: [{ id: 'cadastrarProduto', kind: 'submit', to: '' }] },
    },
    molecules: { lista: [{ role: 'lista', preferred: 'groupviewtable--ml-responsive-data-table', alternative: '' }] },
  });
}
function productDraft(): D2Page11Needs {
  const organisms: D2Page11Needs['organisms'] = Object.fromEntries(Object.keys(product().organisms).map(id => [id, { reads: [], edits: [], selects: '', submits: [] }]));
  organisms.acoesCadastro.submits = [{ intentId: 'cadastrarProduto', write: 'Produto.create' }];
  return buildD2Page11Needs({ organisms });
}
function sources(): D2Page11GateSources {
  return {
    pageId: 'produtos', actor: 'estoquista', menu: productMenu, needsPages: productNeeds.pages,
    entities: { Produto: { schemaVersion: '2026-09-17-ns5-ontology-v3.1', entityId: 'Produto', record: { fields: { details: { fields: { identification: { fields: { name: { type: 'string' } } } } } } } } as unknown as Ns5OntologyAnyEntity },
    access: { grants: [{ actorRef: 'estoquista', entityRefs: ['Produto'], disclosure: { mode: 'fullRecord' } }] },
    categories, templatePaths, moleculeTags: tags, promptTokens: 1200,
  };
}
function issues(definition: unknown = product(), draft: unknown = productDraft(), context: D2Page11GateSources = sources()): string[] {
  return gateD2Page11(definition, draft, context).map(item => item.code);
}
const clone = <T>(value: T): T => structuredClone(value);

void test('HEAD a4de463 product fixture has six organisms and passes all pure gates', () => {
  assert.equal(productMenu.tree[0].organisms?.length, 6);
  assert.deepEqual(issues(), []);
  assert.equal(d2Page11NeedsPath({ project: 102047, module: 'controleEstoque', pageId: 'produtos', device: 'desktop' }), 'l2/controleEstoque/pipeline/agentDefsL2/page11Needs/produtosDesktop.json');
});

void test('render and parse retain literal quotes, backticks and ${} for both devices', () => {
  for (const device of ['desktop', 'mobile'] as const) {
    const location = { project: 102047, module: 'controleEstoque', pageId: 'produtos', device };
    const source = renderD2Page11Definition(location, product());
    assert.equal(source.includes('export const definition = '), true);
    assert.equal(source.includes(' as const;'), true);
    assert.deepEqual(parseD2Page11Definition(source), { location, definition: product() });
    assert.equal(source.includes('${literal}'), true);
    assert.equal(d2Page11Path(location), `_102047_/l2/controleEstoque/web/${device}/page11/produtos.defs.ts`);
  }
  assert.deepEqual(gateD2Page11Pair(product(), product()), []);
  assert.throws(() => parseD2Page11Definition(renderD2Page11Definition({ project: 102047, module: 'controleEstoque', pageId: 'produtos', device: 'desktop' }, product()).replace(' as const;', '); evil();')), /D2_PAGE11_SOURCE_SHAPE/u);
});

void test('experience is derived from category, with bespoke and absent experience mapped to none', () => {
  assert.equal(deriveD2Page11Experience('inventoryControl', categories), 'splitViewOperations');
  assert.equal(deriveD2Page11Experience('bespoke', categories), 'none');
  assert.equal(deriveD2Page11Experience('empty', [{ categoryId: 'empty' }]), 'none');
  const tool = { ...product(), template: { category: 'inventoryControl' } };
  assert.deepEqual(buildD2Page11WithExperience(tool, categories).template, {
    category: '_102020_/l4/collabux/templates/inventoryControl/page21.md', experience: 'splitViewOperations',
  });
  assert.equal(deriveD2Page11CategoryReference('bespoke', categories), 'bespoke');
  assert.deepEqual(buildD2Page11WithExperience({ ...tool, template: { category: 'bespoke' } }, categories).template, { category: 'bespoke', experience: 'none' });
  assert.throws(() => deriveD2Page11CategoryReference('empty', [{ categoryId: 'empty' }]), /D2_PAGE11_CATEGORY_UNPUBLISHED/u);
  assert.throws(() => buildD2Page11WithExperience({ ...tool, template: { category: 'notReal' } }, categories), /D2_PAGE11_CATEGORY_UNKNOWN/u);
  assert.throws(() => buildD2Page11WithExperience(product(), categories), /D2_PAGE11_TOOL_CATEGORY_ONLY/u);
});

void test('HEAD a4de463 expenses hub/process fixture has nine real organisms and full 1:1 coverage', () => {
  const page = expenseMenu.tree[0].children?.[0];
  assert.equal(page?.id, 'minhas_despesas');
  assert.equal(page.organisms?.length, 9);
  const ids = (page.organisms ?? []).map(item => item.kind);
  const organisms = Object.fromEntries(ids.map(kind => [kind, { kind, text: kind, intents: [] as Array<{ id: string; kind: 'submit'; to: string }> }]));
  organisms.actions.intents = [
    { id: 'registrarDespesa', kind: 'submit', to: '' },
    { id: 'corrigirDespesa', kind: 'submit', to: '' },
    { id: 'reenviarDespesa', kind: 'submit', to: '' },
  ];
  const definition = buildD2Page11Definition({ template: { category: '_102020_/l4/collabux/templates/financialTransactions/page21.md', experience: 'ledgerTable' }, intent: 'Minhas despesas e o processo de aprovação.', sections: [{ id: 'principal', priority: 'main', purpose: 'Acompanhar o processo.', organisms: ids }], organisms, molecules: {} });
  const units: D2Page11Needs['organisms'] = Object.fromEntries(ids.map(id => [id, { reads: [], edits: [], selects: '', submits: [] }]));
  units.actions.submits = [
    { intentId: 'registrarDespesa', write: 'Despesa.create' },
    { intentId: 'corrigirDespesa', write: 'Despesa.update' },
    { intentId: 'reenviarDespesa', write: 'Despesa.reenviarParaAprovacao' },
  ];
  const draft = buildD2Page11Needs({ organisms: units });
  const context: D2Page11GateSources = { ...sources(), pageId: 'minhas_despesas', actor: 'colaborador', menu: expenseMenu, needsPages: expenseNeeds.pages };
  assert.deepEqual(issues(definition, draft, context), []);
  const rendered = renderD2Page11Definition({ project: 102047, module: 'reembolsoDespesas', pageId: 'minhas_despesas', device: 'mobile' }, definition);
  assert.deepEqual(parseD2Page11Definition(rendered).definition, definition);
});

void test('menu, section and device mismatches are refused', () => {
  const fewer = clone(product()); delete fewer.organisms.resumo;
  assert.ok(issues(fewer).includes('D2_PAGE11_ORGANISMS_MENU'));
  const extra = clone(product()); extra.organisms.extra = { kind: 'alerts', text: 'Extra.', intents: [] };
  assert.ok(issues(extra).includes('D2_PAGE11_ORGANISMS_MENU'));
  const wrongKind = clone(product()); wrongKind.organisms.resumo.kind = 'alerts';
  assert.ok(issues(wrongKind).includes('D2_PAGE11_ORGANISMS_MENU'));
  const missingSection = clone(product()); missingSection.sections[0].organisms = ['alertas'];
  assert.ok(issues(missingSection).includes('D2_PAGE11_SECTION_COVERAGE'));
  const duplicate = clone(product()); duplicate.sections[1].organisms.push('resumo');
  assert.ok(issues(duplicate).includes('D2_PAGE11_SECTION_COVERAGE'));
  const mobile = clone(product()); mobile.organisms.outro = mobile.organisms.resumo; delete mobile.organisms.resumo;
  assert.equal(gateD2Page11Pair(product(), mobile)[0]?.code, 'D2_PAGE11_DEVICE_ORGANISMS');
});

void test('submit and delegated write coverage are checked against needs.json', () => {
  const noBinding = clone(productDraft()); noBinding.organisms.acoesCadastro.submits = [];
  assert.ok(issues(product(), noBinding).includes('D2_PAGE11_SUBMIT_WRITE'));
  const noNavigate = clone(product()); noNavigate.organisms.detalhe.intents = [];
  assert.ok(issues(noNavigate).includes('D2_PAGE11_WRITE_UNCOVERED'));
  const noTargetWrite = clone(sources()); noTargetWrite.needsPages = noTargetWrite.needsPages.map(page => page.pageId === 'movimentacoes' ? { ...page, writes: [] } : page);
  assert.ok(issues(product(), productDraft(), noTargetWrite).includes('D2_PAGE11_WRITE_UNCOVERED'));
  const missingTarget = clone(product()); missingTarget.organisms.detalhe.intents[0].to = 'ausente';
  assert.ok(issues(missingTarget).includes('D2_PAGE11_NAVIGATE_PAGE'));
  const otherActor = clone(sources()); otherActor.menu.authorities = { 'actor:estoquista': ['produtos'], 'actor:outro': ['movimentacoes'] };
  assert.ok(issues(product(), productDraft(), otherActor).includes('D2_PAGE11_NAVIGATE_ACTOR'));
});

void test('ontology, grants, category, experience, molecules and forbidden fields are refused', () => {
  const unknownPath = clone(productDraft()); unknownPath.organisms.lista.reads = ['Produto.inexistente'];
  assert.ok(issues(product(), unknownPath).includes('D2_PAGE11_FIELD_UNKNOWN'));
  const denied = clone(productDraft()); denied.organisms.lista.reads = ['Produto.details.identification.name'];
  const deniedSource = clone(sources()); deniedSource.access.grants[0].disclosure = { mode: 'fieldsOnly', allowedFields: ['Produto.id'] };
  assert.ok(issues(product(), denied, deniedSource).includes('D2_PAGE11_FIELD_GRANT'));
  const unknownCategory = clone(product()); unknownCategory.template.category = 'notReal';
  assert.ok(issues(unknownCategory).includes('D2_PAGE11_CATEGORY_UNKNOWN'));
  const oldShortCategory = clone(product()); oldShortCategory.template.category = 'inventoryControl';
  assert.ok(issues(oldShortCategory).includes('D2_PAGE11_CATEGORY_UNKNOWN'));
  const inventedReference = clone(product()); inventedReference.template.category = '_102020_/l4/collabux/templates/inventoryControl/page11.md';
  assert.ok(issues(inventedReference).includes('D2_PAGE11_CATEGORY_UNKNOWN'));
  const wrongExperience = clone(product()); wrongExperience.template.experience = 'alertFirstReplenishment';
  assert.ok(issues(wrongExperience).includes('D2_PAGE11_EXPERIENCE_DERIVATION'));
  const missingTemplate = clone(sources()); missingTemplate.templatePaths = new Set();
  assert.ok(issues(product(), productDraft(), missingTemplate).includes('D2_PAGE11_TEMPLATE_MISSING'));
  const composedTag = clone(product()); composedTag.molecules.lista[0].preferred = 'a + b';
  assert.ok(issues(composedTag).includes('D2_PAGE11_FORMAT'));
  assert.throws(() => buildD2Page11Definition({ ...product(), pageId: 'produtos' }), /D2_PAGE11_KEYS.*pageId/u);
  const tooLong = clone(sources()); tooLong.promptTokens = 160001;
  assert.ok(issues(product(), productDraft(), tooLong).includes('D2_PAGE11_PROMPT_LIMIT'));
});
