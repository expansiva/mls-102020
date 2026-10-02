/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2PageRequests.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { deriveD2PageRequests, type D2PageRequestsInput } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { buildD2SharedV2, gateD2SharedV2, parseD2SharedV2, renderD2SharedV2, sharedFromDerived } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { buildD2ContractV2, gateD2ContractV2 } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { parseD2ContractV2, renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { readContractAst, symbolFields } from '/_102021_/l2/agentDefsL1/steps/usecases50/contractsAst.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, 'fixtures');
const categories = (JSON.parse(readFileSync(new URL('../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2PageRequestsInput['categories'] }).categories;

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
  }));
  return { menu, needs, access, rules, entities, siblings };
}

function inputFor(pack: ReturnType<typeof loadPack>, pageId: string, moduleName: string): D2PageRequestsInput {
  const sibling = pack.siblings.find(item => item.pageId === pageId);
  if (!sibling) throw new Error(pageId);
  return {
    module: moduleName, pageId,
    desktop: sibling.desktop, mobile: sibling.mobile,
    draftDesktop: sibling.draftDesktop, draftMobile: sibling.draftMobile,
    siblings: pack.siblings, needsPages: pack.needs.pages, menu: pack.menu,
    entities: pack.entities, access: pack.access, rules: pack.rules, categories,
  };
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

void test('real fixture derives load, command, form, entry and list commands', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = pack.menu.tree[0] ? JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')).moduleName as string : '';
  const first = pack.siblings.find(item => item.pageId === 'produtos')!.pageId;
  const second = pack.siblings.find(item => item.pageId === 'movimentacoes')!.pageId;
  const a = deriveD2PageRequests(inputFor(pack, first, moduleName));
  const b = deriveD2PageRequests(inputFor(pack, second, moduleName));
  assert.equal(a.issues.filter(item => item.code.startsWith('D2_REQUESTS_')).length, 0);
  const loadA = a.requests.find(item => item.id === 'load');
  assert.ok(loadA);
  assert.deepEqual(loadA?.returns.slice().sort(), ['produtos']);
  const create = a.requests.find(item => item.id === 'cadastrarProduto');
  assert.ok(create && create.kind === 'cmd' && create.writes === 'Produto.create');
  assert.deepEqual(create?.inputPaths, [
    'Produto.details.identification.name',
    'Produto.details.product.unitOfMeasure',
    'Produto.details.controleEstoque.quantidadeMinima',
  ]);
  const pageLoads = a.requests.filter(item => item.id.startsWith('load') && item.id !== 'load');
  assert.deepEqual(pageLoads.map(item => item.id), ['loadProdutos']);
  assert.deepEqual(pageLoads[0]?.returnEntities, { produtos: 'Produto' });
  assert.deepEqual(pageLoads[0]?.lists.map(item => item.key), ['produtos']);
  assert.equal(loadA?.lists.length, 1);
  assert.equal(loadA?.lists[0]?.filter, 'filterListaProdutos');
  assert.equal(loadA?.lists[0]?.loadMore, 'loadMoreListaProdutos');
  assert.deepEqual(loadA?.returnEntities, { produtos: 'Produto' });
  assert.ok(loadA?.params.includes('search'));
  const form = Object.values(a.forms).find(item => item.submit === 'cadastrarProduto');
  assert.ok(form);
  assert.equal(form?.organism, 'formularioProduto');
  assert.ok(a.entry.params.produtoId);
  assert.ok(a.entry.params.search);
  const loadPaths = a.projections.filter(item => item.requestId === 'load' && item.entityId === 'Produto').flatMap(item => item.paths);
  assert.ok(loadPaths.includes('id'));
  assert.ok(loadPaths.includes('details.identification.name'));
  assert.equal(loadPaths.includes('version'), false);
  const loadB = b.requests.find(item => item.id === 'load');
  assert.equal(loadB?.returns.join(','), 'movimentacoes,produtos');
  assert.deepEqual(loadB?.returnEntities, { movimentacoes: 'MovimentacaoEstoque', produtos: 'Produto' });
  assert.equal(loadB?.lists.length, 1);
  assert.equal(loadB?.lists[0]?.organismId, 'historicoMovimentacoes');
  const cmd = b.requests.find(item => item.kind === 'cmd');
  assert.ok(cmd);
  assert.deepEqual(cmd?.inputPaths, [
    'MovimentacaoEstoque.produtoId',
    'MovimentacaoEstoque.movimentadoEm',
    'MovimentacaoEstoque.details.tipo',
    'MovimentacaoEstoque.details.quantidade',
  ]);
  assert.ok(loadB?.params.includes('produtoId'));
  assert.ok(b.entry.params.produtoId);
  const moreB = b.requests.find(item => item.id === 'loadMovimentacoes');
  assert.deepEqual(moreB && { returns: moreB.returns, returnEntities: moreB.returnEntities, params: moreB.params, organisms: moreB.organisms },
    { returns: ['movimentacoes'], returnEntities: { movimentacoes: 'MovimentacaoEstoque' }, params: loadB?.lists[0]?.params, organisms: ['historicoMovimentacoes'] });
  const pathsOf = (requestId: string) => b.projections.filter(item => item.requestId === requestId && item.entityId === 'MovimentacaoEstoque').map(item => item.paths);
  assert.deepEqual(pathsOf('loadMovimentacoes'), pathsOf('load'));
  assert.equal(b.projections.some(item => item.requestId === 'loadMovimentacoes' && item.entityId !== 'MovimentacaoEstoque'), false);
  assert.deepEqual(b.rules.loadMovimentacoes, b.entityRules.MovimentacaoEstoque);
});

void test('renamed fixture keeps the same request structure', () => {
  const pack = loadPack('controleEstoque');
  const renamed = renameDeep(pack) as ReturnType<typeof loadPack>;
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const original = deriveD2PageRequests(inputFor(pack, 'produtos', moduleName));
  const clone = deriveD2PageRequests(inputFor(renamed, 'catalogItems', 'alphaWarehouse'));
  assert.deepEqual(renameDeep(original), clone);
  const location = { project: 102047, module: moduleName, pageId: 'produtos' };
  const shared = sharedFromDerived(original);
  const left = renderD2ContractV2(location, buildD2ContractV2(original, shared, pack.entities));
  const right = renderD2ContractV2(
    { project: 102047, module: 'alphaWarehouse', pageId: 'catalogItems' },
    buildD2ContractV2(clone, sharedFromDerived(clone), renamed.entities),
  );
  assert.equal(renameDeep(left), right);
});

function organism(kind: string, intents: Array<{ id: string; kind: 'submit' | 'navigate'; to?: string }> = []) {
  return { kind, text: kind, intents };
}
function needsUnit(reads: string[] = [], edits: string[] = [], submits: Array<{ intentId: string; write: string }> = []) {
  return { reads, edits, selects: '', submits };
}

void test('synthetic fixture covers version, unbound submit and grant refusal', () => {
  const pack = loadPack('controleEstoque');
  const base = inputFor(pack, 'produtos', 'mod');
  const desktop = structuredClone(base.desktop) as { organisms: Record<string, { intents: Array<{ id: string; kind: string }> }>; sections: Array<{ id: string; organisms: string[] }> };
  const draft = structuredClone(base.draftDesktop) as { organisms: Record<string, { reads: string[]; edits: string[]; selects: string; submits: Array<{ intentId: string; write: string }> }> };
  const syntheticNeeds = structuredClone(base.needsPages);
  const versionEntity = pack.needs.pages.find(item => item.pageId === 'produtos')?.reads.find(item => item.family === 'mdm')?.entity ?? Object.keys(base.entities)[0];
  syntheticNeeds[0] = { ...syntheticNeeds[0], pageId: 'produtos', writes: [{ entity: versionEntity, operation: 'update' }] };
  const withVersion = deriveD2PageRequests({ ...base, needsPages: syntheticNeeds });
  assert.equal(withVersion.projections.some(item => item.includeVersion), true);
  draft.organisms[Object.keys(draft.organisms)[0]].submits = [{ intentId: 'orphanSubmit', write: `${Object.keys(base.entities)[0]}.create` }];
  desktop.organisms[Object.keys(desktop.organisms)[0]].intents = [{ id: 'orphanSubmit', kind: 'submit' }];
  const unbound = deriveD2PageRequests({ ...base, desktop, draftDesktop: draft });
  assert.ok(unbound.issues.some(item => item.code === 'D2_REQUESTS_SUBMIT_UNBOUND'));
  const denied = deriveD2PageRequests({ ...base, access: { grants: [] } });
  assert.ok(denied.issues.some(item => item.code === 'D2_REQUESTS_PATH_GRANT'));
  const derivedField = Object.values(pack.needs.pages[0].reads.find(item => item.derived.length)?.derived ?? [])[0];
  if (derivedField) {
    const entity = pack.needs.pages[0].reads.find(item => item.derived.length)?.entity;
    const draft2 = structuredClone(base.draftDesktop) as { organisms: Record<string, { edits: string[] }> };
    const formId = Object.keys(draft2.organisms).find(id => draft2.organisms[id].edits.length);
    if (formId && entity) {
      draft2.organisms[formId].edits = [`${entity}.${derivedField}`];
      const edited = deriveD2PageRequests({ ...base, draftDesktop: draft2, draftMobile: draft2 });
      assert.ok(edited.issues.some(item => item.code === 'D2_REQUESTS_DERIVED_EDIT'));
    }
  }

  const draftOrganisms = (base.draftDesktop as { organisms: Record<string, { reads: string[]; edits: string[] }> }).organisms;
  const sample = Object.values(draftOrganisms).flatMap(item => item.edits);
  const written = sample[0]?.split('.')[0] ?? Object.keys(base.entities)[0];
  const other = Object.keys(base.entities).find(id => id !== written) ?? written;
  const leftEdit = sample[0];
  const rightEdit = sample[1] ?? sample[0];
  const molecule = Object.values(base.desktop.molecules)[0];
  const sectioned = structuredClone(base.desktop);
  sectioned.sections = [
    { id: 'secLeft', priority: 'primary', purpose: 'left', organisms: ['formLeft', 'sendLeft'] },
    { id: 'secRight', priority: 'main', purpose: 'right', organisms: ['formRight', 'sendRight'] },
  ];
  sectioned.organisms = {
    formLeft: organism('form'), sendLeft: organism('actions', [{ id: 'sendLeft', kind: 'submit' }]),
    formRight: organism('form'), sendRight: organism('actions', [{ id: 'sendRight', kind: 'submit' }]),
  };
  sectioned.molecules = { formLeft: molecule, formRight: molecule };
  const sectionedDraft = {
    organisms: {
      formLeft: needsUnit([], [leftEdit]),
      sendLeft: needsUnit([], [], [{ intentId: 'sendLeft', write: `${written}.create` }]),
      formRight: needsUnit([], [rightEdit]),
      sendRight: needsUnit([], [], [{ intentId: 'sendRight', write: `${written}.create` }]),
    },
  };
  const bound = deriveD2PageRequests({ ...base, desktop: sectioned, mobile: sectioned, draftDesktop: sectionedDraft, draftMobile: sectionedDraft });
  assert.equal(bound.forms.sendLeft?.organism, 'formLeft');
  assert.equal(bound.forms.sendLeft?.ambiguous, false);
  assert.equal(bound.forms.sendRight?.organism, 'formRight');
  assert.equal(bound.forms.sendRight?.ambiguous, false);

  // One form, two submits (create and update of the same record): both commands survive.
  const twoSubmits = structuredClone(sectioned);
  twoSubmits.organisms.sendLeft = organism('actions', [{ id: 'sendLeft', kind: 'submit' }, { id: 'reviseLeft', kind: 'submit' }]);
  const twoDraft = structuredClone(sectionedDraft);
  twoDraft.organisms.sendLeft.submits = [{ intentId: 'sendLeft', write: `${written}.create` }, { intentId: 'reviseLeft', write: `${written}.update` }];
  const both = deriveD2PageRequests({ ...base, desktop: twoSubmits, mobile: twoSubmits, draftDesktop: twoDraft, draftMobile: twoDraft });
  assert.equal(both.forms.sendLeft?.organism, 'formLeft');
  assert.equal(both.forms.reviseLeft?.organism, 'formLeft');
  assert.deepEqual(both.requests.filter(item => item.kind === 'cmd').map(item => `${item.id}:${item.writes}`).sort(),
    [`reviseLeft:${written}.update`, `sendLeft:${written}.create`, `sendRight:${written}.create`]);
  assert.equal(both.issues.length, 0, JSON.stringify(both.issues));
  assert.equal(bound.issues.some(item => item.code === 'D2_REQUESTS_SUBMIT_UNBOUND'), false);

  const loose = structuredClone(sectioned);
  loose.sections = [{ id: 'banner', priority: 'primary', purpose: 'banner', organisms: ['banner'] }];
  loose.organisms = { ...sectioned.organisms, banner: organism('summary') };
  const looseDraft = { organisms: { ...sectionedDraft.organisms, banner: needsUnit() } };
  const ambiguous = deriveD2PageRequests({ ...base, desktop: loose, mobile: loose, draftDesktop: looseDraft, draftMobile: looseDraft });
  assert.equal(ambiguous.forms.sendLeft?.ambiguous, true);
  assert.equal(ambiguous.forms.sendRight?.ambiguous, true);

  const readOnly = structuredClone(base.desktop);
  const readDraft = structuredClone(base.draftDesktop) as { organisms: Record<string, { reads: string[]; edits: string[]; submits: unknown[] }> };
  for (const row of Object.values(readDraft.organisms)) row.submits = [];
  for (const row of Object.values(readOnly.organisms)) row.intents = [];
  const noWrite = deriveD2PageRequests({ ...base, desktop: readOnly, mobile: readOnly, draftDesktop: readDraft, draftMobile: readDraft });
  assert.equal(noWrite.requests.some(item => item.kind === 'cmd'), false);
  assert.ok(noWrite.requests.some(item => item.id === 'load'));

  const quiet = structuredClone(readOnly);
  const quietDraft = structuredClone(readDraft) as typeof readDraft;
  for (const row of Object.values(quietDraft.organisms)) { row.reads = []; row.edits = []; }
  const staticPage = deriveD2PageRequests({ ...base, desktop: quiet, mobile: quiet, draftDesktop: quietDraft, draftMobile: quietDraft });
  assert.deepEqual(staticPage.requests, []);

  const plain = structuredClone(base);
  const desktopOrganisms = (base.desktop as { organisms: Record<string, { kind: string }> }).organisms;
  const listId = Object.entries(desktopOrganisms).find(([, row]) => row.kind === 'list')?.[0] ?? '';
  const listEntity = draftOrganisms[listId]?.reads[0]?.split('.')[0] ?? written;
  const caps = (plain.entities[listEntity] as { capabilities?: Record<string, string> }).capabilities ?? {};
  delete caps['locate.byName'];
  delete caps['locate.byColumn'];
  delete caps['listByForeignKey'];
  const plainDesktop = structuredClone(base.desktop);
  plainDesktop.template = { ...plainDesktop.template, category: 'readOnlyDetailPortal' };
  const unsearched = deriveD2PageRequests({ ...base, entities: plain.entities, desktop: plainDesktop, mobile: plainDesktop });
  const plainLoad = unsearched.requests.find(item => item.id === 'load');
  assert.deepEqual(plainLoad?.lists, []);
  assert.equal(plainLoad?.params.includes('search'), false);

  const hubDesktop = structuredClone(base.desktop);
  hubDesktop.sections = [...hubDesktop.sections, { id: 'other', priority: 'secondary', purpose: 'other', organisms: ['otherRows'] }];
  hubDesktop.organisms = { ...hubDesktop.organisms, otherRows: organism('list') };
  hubDesktop.molecules = { ...hubDesktop.molecules, otherRows: molecule };
  const hubDraft = structuredClone(base.draftDesktop) as { organisms: Record<string, ReturnType<typeof needsUnit>> };
  hubDraft.organisms.otherRows = needsUnit([`${other}.id`]);
  const hub = deriveD2PageRequests({ ...base, desktop: hubDesktop, mobile: hubDesktop, draftDesktop: hubDraft, draftMobile: hubDraft });
  const hubLoad = hub.requests.find(item => item.id === 'load');
  assert.equal(hubLoad?.lists.length, 2);
  assert.deepEqual(hubLoad?.lists.map(item => item.params.includes('search')), [true, false]);
  for (const entityId of Object.values(hubLoad?.returnEntities ?? {})) assert.ok(base.entities[entityId]);
  assert.equal(new Set(Object.values(hubLoad?.returnEntities ?? {})).size, 2);
  const columnEntityId = other;
  const columnEntities = structuredClone(base.entities);
  const columnEntity = columnEntities[columnEntityId] as { capabilities?: Record<string, string>; record?: { fields?: Record<string, { type?: string; indexed?: boolean }> } };
  columnEntity.capabilities = { ...(columnEntity.capabilities ?? {}), 'locate.byColumn': 'column' };
  columnEntity.record = columnEntity.record ?? { fields: {} };
  columnEntity.record.fields = { ...(columnEntity.record.fields ?? {}), sku: { type: 'string', indexed: true } };
  const columnDerived = structuredClone(hub);
  const columnLoad = columnDerived.requests.find(item => item.id === 'load');
  if (!columnLoad) throw new Error('hub load missing');
  const columnList = columnLoad.lists.find(item => item.organismId === 'otherRows');
  if (!columnList) throw new Error('column list missing');
  columnList.params = [...columnList.params.filter(item => item !== 'page' && item !== 'pageSize'), 'sku', 'page', 'pageSize'];
  columnLoad.params = [...new Set([...columnLoad.params, 'sku'])];
  const detailId = `load${columnEntityId}`;
  columnDerived.requests.push({
    id: detailId, kind: 'qry', trigger: detailId, returns: ['picked'], returnEntities: { picked: columnEntityId },
    inputPaths: [`${columnEntityId}.id`], organisms: ['widgetDetail'], params: ['id'], lists: [],
  });
  const columnContract = buildD2ContractV2(columnDerived, sharedFromDerived(columnDerived), columnEntities);
  const columnRoutes = new Map(columnContract.routes.map(item => [item.route.split('.').slice(2).join('.'), item]));
  const columnMeta = columnRoutes.get('load')?.meta;
  assert.equal(Object.keys(columnMeta?.lists ?? {}).length, 2);
  for (const row of Object.values(columnMeta?.lists ?? {})) assert.ok(row.key in columnLoad.returnEntities);
  assert.deepEqual(columnMeta?.lists.otherRows && { key: columnMeta.lists.otherRows.key, page: columnMeta.lists.otherRows.page }, { key: Object.entries(columnLoad.returnEntities).find(([, id]) => id === columnEntityId)?.[0], page: 'pageOtherRows' });
  assert.deepEqual(columnMeta?.params.sku, { filters: columnMeta?.lists.otherRows?.key, field: 'sku' });
  assert.deepEqual(columnRoutes.get(detailId)?.meta, {
    output: { picked: { entity: columnEntityId, many: false } },
    lists: {},
    params: { id: { filters: 'picked', field: 'id' } },
  });

  const english = deriveD2PageRequests({ ...base, menu: { ...base.menu, userLanguage: 'en' } });
  const home = deriveD2PageRequests(base);
  assert.deepEqual(english.requests.map(item => item.id), home.requests.map(item => item.id));
  assert.deepEqual(english.requests.flatMap(item => item.lists.map(list => [list.filter, list.loadMore])), home.requests.flatMap(item => item.lists.map(list => [list.filter, list.loadMore])));

  const updating = structuredClone(sectionedDraft);
  updating.organisms.sendLeft.submits = [{ intentId: 'sendLeft', write: `${written}.update` }];
  const versionNeeds = structuredClone(base.needsPages);
  versionNeeds[0] = { ...versionNeeds[0], writes: [{ entity: written, operation: 'update' }] };
  const updated = deriveD2PageRequests({ ...base, desktop: sectioned, mobile: sectioned, draftDesktop: updating, draftMobile: updating, needsPages: versionNeeds });
  const updateCmd = updated.requests.find(item => item.id === 'sendLeft');
  assert.ok(updateCmd?.inputPaths.includes(`${written}.version`));
  assert.ok(updateCmd?.inputPaths.includes(`${written}.id`));
  assert.equal(updated.projections.some(item => item.entityId === written && item.includeVersion), true);
  const updateContract = buildD2ContractV2(updated, sharedFromDerived(updated), base.entities);
  assert.match(updateContract.routes.find(item => item.route.endsWith('.sendLeft'))?.input ?? '', /version: number/);
  assert.doesNotMatch(bound.requests.find(item => item.id === 'sendLeft')?.inputPaths.join(' ') ?? '', /\.id\b|\.version\b/);
});

void test('shared and contract roundtrip plus gates and contractsAst measurement', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const pageId = 'produtos';
  const derived = deriveD2PageRequests(inputFor(pack, pageId, moduleName));
  const need = pack.needs.pages.find(item => item.pageId === pageId)!;
  const steps = [...new Set(need.reads.flatMap(item => item.from).filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length)))];
  const shared = sharedFromDerived(derived, {
    states: { items: { source: 'load.produtos', description: 'x' } },
    journeys: steps.map(step => ({ step, organisms: [Object.keys(pack.siblings[0].desktop.organisms)[0]], functions: ['load'] })),
  });
  const built = buildD2SharedV2(shared);
  const location = { project: 102047, module: moduleName, pageId };
  const source = renderD2SharedV2(location, built);
  assert.deepEqual(parseD2SharedV2(source).definition, built);
  const draft = pack.siblings[0].draftDesktop;
  const issues = gateD2SharedV2(built, { page11: pack.siblings[0].desktop, draft, needs: pack.needs.pages.find(item => item.pageId === pageId)!, menu: pack.menu, derived });
  assert.equal(issues.filter(item => item.code === 'D2_SHARED_V2_RETURNS').length, 0);
  const contract = buildD2ContractV2(derived, built, pack.entities);
  const rendered = renderD2ContractV2(location, contract);
  assert.equal(rendered.includes('Pick<') || rendered.includes('Partial<'), false);
  const parsed = parseD2ContractV2(rendered);
  assert.deepEqual(parsed.routes.map(item => ({ route: item.route, input: item.input, output: item.output })), contract.routes.map(item => ({ route: item.route, input: item.input, output: item.output })));
  assert.deepEqual(gateD2ContractV2(contract, derived, built, pack.entities), []);
  const routes = new Map(contract.routes.map(item => [item.route.split('.').slice(2).join('.'), item]));
  assert.equal(routes.get('load')?.output, '{ produtos: ProdutoLoad[]; pageListaProdutos: number; pageSizeListaProdutos: number; hasMoreListaProdutos: boolean }');
  assert.equal(routes.get('cadastrarProduto')?.input, '{ details: { identification: { name: string }; product: { unitOfMeasure: string }; controleEstoque: { quantidadeMinima: number } } }');
  assert.equal(routes.get('cadastrarProduto')?.output, '{ produto: ProdutoCadastrarProduto }');
  assert.deepEqual(routes.get('load')?.meta, {
    output: { produtos: { entity: 'Produto', many: true } },
    lists: { listaProdutos: { key: 'produtos', page: 'pageListaProdutos', pageSize: 'pageSizeListaProdutos', hasMore: 'hasMoreListaProdutos' } },
    params: {
      search: { filters: 'produtos', field: 'details.identification.name' },
      page: { pages: 'listaProdutos' },
      pageSize: { pages: 'listaProdutos' },
    },
  });
  assert.deepEqual(routes.get('cadastrarProduto')?.meta.output, { produto: { entity: 'Produto', many: false } });
  for (const proj of contract.projections) {
    assert.ok(pack.entities[proj.entityId], proj.name);
    assert.equal(proj.name.startsWith(proj.entityId), true);
  }
  const moves = deriveD2PageRequests(inputFor(pack, 'movimentacoes', moduleName));
  const moveContract = buildD2ContractV2(moves, sharedFromDerived(moves), pack.entities);
  const moveRoutes = new Map(moveContract.routes.map(item => [item.route.split('.').slice(2).join('.'), item]));
  assert.equal(moveRoutes.get('load')?.output, '{ movimentacoes: MovimentacaoEstoqueLoad[]; produtos: ProdutoLoad[]; pageHistoricoMovimentacoes: number; pageSizeHistoricoMovimentacoes: number; hasMoreHistoricoMovimentacoes: boolean }');
  assert.equal(moveRoutes.get('registrarMovimentacao')?.input, '{ produtoId: string; movimentadoEm: string; details: { tipo: \'entrada\' | \'saida\'; quantidade: number } }');
  assert.equal(moveRoutes.get('registrarMovimentacao')?.output, '{ movimentacaoEstoque: MovimentacaoEstoqueLoad }');
  assert.deepEqual(moveRoutes.get('load')?.meta, {
    output: {
      movimentacoes: { entity: 'MovimentacaoEstoque', many: true },
      produtos: { entity: 'Produto', many: true },
    },
    lists: { historicoMovimentacoes: { key: 'movimentacoes', page: 'pageHistoricoMovimentacoes', pageSize: 'pageSizeHistoricoMovimentacoes', hasMore: 'hasMoreHistoricoMovimentacoes' } },
    params: {
      produtoId: { filters: 'movimentacoes', field: 'produtoId' },
      page: { pages: 'historicoMovimentacoes' },
      pageSize: { pages: 'historicoMovimentacoes' },
    },
  });
  for (const proj of moveContract.projections) assert.ok(pack.entities[proj.entityId], proj.name);
  const ast = readContractAst(rendered, 'contracts.defs.ts');
  const names = ast.symbols.map(item => item.name);
  assert.ok(names.includes(`${pageId[0].toUpperCase()}${pageId.slice(1)}Contracts`) || names.length >= 1);
  assert.deepEqual(ast.unparsed, []);
  assert.deepEqual(parsed.routes.map(item => item.meta), contract.routes.map(item => item.meta));
  assert.deepEqual(parsed.projections.map(item => item.entityId), contract.projections.map(item => item.entityId));
  const measurement = {
    symbols: ast.symbols.map(item => item.name),
    unparsed: ast.unparsed,
    firstFields: symbolFields(ast, ast.symbols[0]?.name ?? ''),
  };
  console.log('D2_54_CONTRACTS_AST ' + JSON.stringify(measurement));
});

void test('hard-code guard: fixture names stay out of non-test agent files', () => {
  const agentRoot = join(here);
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name === 'fixtures' || name.name === 'node_modules') continue;
        walk(path);
        continue;
      }
      if (!name.name.endsWith('.ts') || name.name.endsWith('.test.ts')) continue;
      const text = readFileSync(path, 'utf8');
      if (/controleEstoque|produto|movimenta|estoque/iu.test(text)) hits.push(path);
    }
  };
  walk(join(here, '..'));
  assert.deepEqual(hits, []);
  const listed = readdirSync(join(fixtureRoot, 'controleEstoque/page11Needs'));
  assert.ok(listed.some(name => /produto|movimenta/u.test(name)));
});
