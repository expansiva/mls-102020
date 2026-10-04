/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/e2eReplay.test.ts" enhancement="_blank"/>

/**
 * d2_68: the L2 chain replayed end to end without an LLM. menu20 → needs30 → input20 → pages50 → d2PageRequests →
 * shared60 → contracts70 run with real gates and normalizers over three frozen modules (fixtures/e2e, README there);
 * the recorded answers are the ones the real runs had accepted. Every stage result is asserted per module.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts, D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { parseP2Grants, parseP2Processes, parsePreviousMenuTree, type MenuV2 } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { validateP2Menu } from '/_102020_/l2/agentPlannerL2/steps/menu20/gate.js';
import { parseP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { buildP2NeedsFile } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { deriveD2Page11CategoryReference, deriveD2Page11Experience } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, type D2PagesContext, type D2PagesResponse } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { readApprovedPage11, reusableD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { approveD2SharedUnit, buildD2SharedContext, type D2SharedLlmResponse } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { parseD2SharedV2 } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { buildD2ContractV2, gateD2ContractV2 } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import type { D2PageRequestsInput } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { d2NormalizeWriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import type { PoolMenuFile } from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'fixtures/e2e');
const CATALOG_URL = new URL('../../../l4/collabux/templates/categoryList.json', import.meta.url);
const AT = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));

type Outcome = { stage: string; pageId?: string; result: 'ok' | 'refused'; codes: string[] };

const codesOf = (error: unknown): string[] => [...new Set((String(error instanceof Error ? error.message : error).match(/\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/gu) ?? []))].sort();

function readPack(alias: string) {
  const dir = path.join(ROOT, alias);
  const text = (rel: string) => readFileSync(path.join(dir, rel), 'utf8');
  const defs = (rel: string) => parseNs4ClassicDefsSource<Record<string, unknown>>(text(rel)) as Record<string, unknown>;
  const json = <T>(rel: string) => JSON.parse(text(rel)) as T;
  const names = (sub: string) => readdirSync(path.join(dir, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
  const list = (sub: string) => { try { return readdirSync(path.join(dir, sub)).filter(name => name.endsWith('.json')).sort(); } catch { return []; } };
  const module = defs('l4/module.defs.ts') as { moduleName: string; userLanguage?: string };
  return { dir, text, defs, json, names, list, module, moduleName: module.moduleName };
}

async function artifactsOf(pack: ReturnType<typeof readPack>, needs: unknown): Promise<D2InputArtifacts> {
  const { defs, json, names, text, moduleName } = pack;
  const sources: D2InputArtifacts['sources'] = [];
  const digest = async (rel: string) => {
    const source = text(`l4/${rel}`);
    sources.push({ path: `l4/${moduleName}/${rel}`, sha256: await sha256Text(source), bytes: source.length, schemaVersion: String(defs(`l4/${rel}`).schemaVersion ?? '') });
  };
  for (const rel of ['module.defs.ts', 'journeys/index.defs.ts', 'ontology/index.defs.ts', 'rules.defs.ts', 'workflows.defs.ts', 'access.defs.ts', 'integration.defs.ts',
    ...names('l4/journeys').map(name => `journeys/${name}`), ...names('l4/ontology').map(name => `ontology/${name}`)]) await digest(rel);
  return {
    sources, module: defs('l4/module.defs.ts'), journeyIndex: defs('l4/journeys/index.defs.ts'),
    journeys: Object.fromEntries(names('l4/journeys').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`l4/journeys/${name}`)])),
    ontologyIndex: defs('l4/ontology/index.defs.ts'),
    entities: Object.fromEntries(names('l4/ontology').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`l4/ontology/${name}`)])),
    rules: defs('l4/rules.defs.ts'), workflows: defs('l4/workflows.defs.ts'), access: defs('l4/access.defs.ts'), integration: defs('l4/integration.defs.ts'),
    menu: json('pool/menu.json'), needs, backend: json('pool/backend.json'), effort: json('pool/effort.json'),
  };
}

function templateContext(): D2PagesContext['template'] {
  const catalog = readFileSync(CATALOG_URL, 'utf8');
  const categories = (JSON.parse(catalog) as { categories: D2PagesContext['template']['categories'] }).categories;
  const templatePaths = new Set<string>();
  for (const item of categories) {
    const key = item.experiences?.page11 ? 'page11' : item.experiences?.page21 ? 'page21' : '';
    if (key) templatePaths.add(`templates/${item.categoryId}/${key}.md`);
  }
  return {
    categories, catalog, catalogHash: 'sha256:catalog', templatePaths,
    async select(category) {
      const experience = deriveD2Page11Experience(category, categories);
      if (category === 'bespoke') return { experience, reason: 'none', reference: null, content: '', hash: 'sha256:none' };
      return { experience, reason: `Derived ${experience}.`, reference: deriveD2Page11CategoryReference(category, categories), content: 'template', hash: 'sha256:template' };
    },
  };
}

/** The molecule catalog lives outside L2: the recorded groups are the tags the recorded answer chose, one group per organism. */
function groupsOf(answer: D2PagesResponse): { groups: D2MoleculeGroup[]; selectedGroups: Record<string, string[]> } {
  const tags = new Set<string>();
  for (const device of ['desktop', 'mobile'] as const) {
    const molecules = (answer[device].definition as { molecules?: Record<string, Array<{ preferred?: string; alternative?: string }>> }).molecules ?? {};
    for (const choices of Object.values(molecules)) for (const choice of choices) for (const tag of [choice.preferred, choice.alternative]) if (tag) tags.add(tag);
  }
  const group: D2MoleculeGroup = { groupId: 'recorded', purpose: 'recorded', indexReference: '/recorded', usageReference: '/recorded', tags: [...tags], scenarios: [], indexSource: '', indexText: '', usageSource: '', usageText: '' };
  return { groups: [group], selectedGroups: {} };
}

/** The pages50 context of one recorded page answer, as the worker would build it. */
function pageContextOf(pack: ReturnType<typeof readPack>, snapshot: D2InputSnapshot, artifacts: D2InputArtifacts, pageId: string): { context: D2PagesContext; answer: D2PagesResponse } | null {
  const recorded = pack.json<{ answer: D2PagesResponse; groupAssessments?: D2PagesContext['groupAssessments'] }>(`answers/pages50/${pageId}.json`);
  const page = snapshot.selection.pages.find(item => item.pageId === pageId);
  if (!page) return null;
  const { groups } = groupsOf(recorded.answer);
  const selectedGroups = Object.fromEntries(page.organisms.map((_, index) => [`organism${index + 1}`, ['recorded']]));
  return { answer: recorded.answer, context: {
    identity: { project: 102047, module: pack.moduleName }, snapshot, artifacts, page, template: templateContext(),
    inventory: { catalogProject: null, selectedBy: null, directDependencies: [], groups: [], sourceHash: 'sha256:inventory' },
    selectedGroups, groupAssessments: recorded.groupAssessments, groups, moleculeHashes: {}, skill: '', prompt: '',
  } };
}

async function replay(alias: string): Promise<Outcome[]> {
  const pack = readPack(alias);
  const outcomes: Outcome[] = [];
  const access = pack.defs('l4/access.defs.ts');
  const sources = parseP2L4Sources({
    moduleName: pack.moduleName, userLanguage: pack.module.userLanguage,
    journeyIndex: pack.defs('l4/journeys/index.defs.ts'), journeys: pack.names('l4/journeys').map(name => pack.defs(`l4/journeys/${name}`)),
    access, ontologyIndex: pack.defs('l4/ontology/index.defs.ts'), ontologyEntities: pack.names('l4/ontology').map(name => pack.defs(`l4/ontology/${name}`)),
  });
  const grants = parseP2Grants(access);
  const processes = parseP2Processes(pack.defs('l4/workflows.defs.ts'));
  const menu = pack.json<PoolMenuFile>('pool/menu.json');

  // menu20: the recorded menu is the answer; its gate decides.
  if (!menu.meta.records) outcomes.push({ stage: 'menu20', result: 'refused', codes: ['P2_MENU_RECORDS_MISSING'] });
  else {
    const draft: MenuV2 = { tree: parsePreviousMenuTree(menu), authorities: menu.authorities, meta: { journeys: menu.meta.journeys, processes: menu.meta.processes, records: menu.meta.records } };
    const errors = validateP2Menu(draft, { sources, grants, processes }).issues.filter(item => item.severity === 'error').map(item => item.code);
    outcomes.push({ stage: 'menu20', result: errors.length ? 'refused' : 'ok', codes: [...new Set(errors)].sort() });
  }

  // needs30 regenerates from the menu; when it refuses, the chain goes on with the needs the run delivered.
  let needs: unknown = pack.json('pool/needs.json');
  try {
    needs = buildP2NeedsFile({ menu, sources, grants, processes, now: AT });
    outcomes.push({ stage: 'needs30', result: 'ok', codes: [] });
  } catch (error) { outcomes.push({ stage: 'needs30', result: 'refused', codes: codesOf(error) }); }

  let snapshot: D2InputSnapshot;
  const artifacts = await artifactsOf(pack, needs);
  try {
    snapshot = await buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts);
    outcomes.push({ stage: 'input20', result: 'ok', codes: [] });
  } catch (error) {
    outcomes.push({ stage: 'input20', result: 'refused', codes: codesOf(error) });
    return outcomes;
  }

  // pages50: each recorded page answer through the normalizer and the page gate.
  const page11: Record<string, { desktop: string; mobile: string; draftDesktop: unknown; draftMobile: unknown }> = {};
  for (const name of pack.list('answers/pages50')) {
    const pageId = name.replace(/\.json$/u, '');
    const built = pageContextOf(pack, snapshot, artifacts, pageId);
    if (!built) { outcomes.push({ stage: 'pages50', pageId, result: 'refused', codes: ['D2_PAGES_PAGE_NOT_SELECTED'] }); continue; }
    const { context, answer } = built;
    const writes = new Map<string, unknown>();
    try {
      await approveD2PagesUnit(context, answer, 0, 0, {
        writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}`, source); },
        writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}`, value); },
      });
      const at = (folder: string, shortName: string) => writes.get(`${pack.moduleName}/${folder}/${shortName}`);
      page11[pageId] = {
        desktop: at('web/desktop/page11', pageId) as string, mobile: at('web/mobile/page11', pageId) as string,
        draftDesktop: at('pipeline/agentDefsL2/page11Needs', `${pageId}Desktop`), draftMobile: at('pipeline/agentDefsL2/page11Needs', `${pageId}Mobile`),
      };
      outcomes.push({ stage: 'pages50', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'pages50', pageId, result: 'refused', codes: codesOf(error) }); }
  }

  // d2PageRequests + shared60 + contracts70 for the pages whose page11 passed.
  const siblings: D2PageRequestsInput['siblings'] = Object.entries(page11).map(([pageId, row]) => ({
    pageId, desktop: parseD2Page11Definition(row.desktop).definition, mobile: parseD2Page11Definition(row.mobile).definition,
    draftDesktop: buildD2Page11Needs(row.draftDesktop), draftMobile: buildD2Page11Needs(row.draftMobile),
  }));
  const rules = artifacts.rules as D2PageRequestsInput['rules'];
  for (const name of pack.list('answers/shared60')) {
    const pageId = name.replace(/\.json$/u, '');
    const sibling = siblings.find(item => item.pageId === pageId);
    if (!sibling) { outcomes.push({ stage: 'shared60', pageId, result: 'refused', codes: ['D2_SHARED_PAGE11_MISSING'] }); continue; }
    const input: D2PageRequestsInput = {
      module: pack.moduleName, pageId, desktop: sibling.desktop, mobile: sibling.mobile, draftDesktop: sibling.draftDesktop, draftMobile: sibling.draftMobile,
      siblings, needsPages: (needs as { pages: D2PageRequestsInput['needsPages'] }).pages, menu: artifacts.menu as D2PageRequestsInput['menu'],
      entities: artifacts.entities as D2PageRequestsInput['entities'], access: artifacts.access as D2PageRequestsInput['access'], rules,
      categories: templateContext().categories as D2PageRequestsInput['categories'],
    };
    let shared: string;
    try {
      const data = buildD2SharedContext(input, {
        identity: { project: 102047, module: pack.moduleName }, inputHash: snapshot.snapshotHash,
        page11: { desktop: sibling.desktop, mobile: sibling.mobile }, page11Text: { desktop: page11[pageId].desktop, mobile: page11[pageId].mobile },
        drafts: { desktop: sibling.draftDesktop, mobile: sibling.draftMobile }, draftText: { desktop: JSON.stringify(page11[pageId].draftDesktop), mobile: JSON.stringify(page11[pageId].draftMobile) },
        skill: '', prompt: '',
      });
      const writes = new Map<string, unknown>();
      await approveD2SharedUnit(data, pack.json<D2SharedLlmResponse>(`answers/shared60/${name}`), 0, 0, {
        writeSource: async (_info, source) => { writes.set('source', source); }, writeJson: async () => undefined,
      });
      shared = writes.get('source') as string;
      outcomes.push({ stage: 'shared60', pageId, result: 'ok', codes: [] });
      const definition = parseD2SharedV2(shared).definition;
      const contract = buildD2ContractV2(data.derived, definition, data.input.entities);
      const issues = gateD2ContractV2(contract, data.derived, definition, data.input.entities).map(item => item.code);
      outcomes.push({ stage: 'contracts70', pageId, result: issues.length ? 'refused' : 'ok', codes: [...new Set(issues)].sort() });
    } catch (error) { outcomes.push({ stage: 'shared60', pageId, result: 'refused', codes: codesOf(error) }); }
  }
  return outcomes;
}

void test('d2_68: three modules replay end to end with the state expected after the fixes, deterministically', async () => {
  const first = { stock: await replay('stock'), clinic: await replay('clinic'), expense: await replay('expense') };
  const second = { stock: await replay('stock'), clinic: await replay('clinic'), expense: await replay('expense') };
  assert.deepEqual(second, first);
  const at = (rows: Outcome[], stage: string, pageId?: string) => rows.find(item => item.stage === stage && item.pageId === pageId);

  // stock: menu planned before p2_30 (no meta.records) is refused by name; the run's needs carry the chain on.
  assert.deepEqual(at(first.stock, 'menu20'), { stage: 'menu20', result: 'refused', codes: ['P2_MENU_RECORDS_MISSING'] });
  assert.deepEqual(at(first.stock, 'needs30')?.codes, ['P2_NEEDS_MENU_RECORDS_MISSING']);
  assert.equal(at(first.stock, 'input20')?.result, 'ok');
  for (const pageId of ['produtos', 'movimentacoes']) assert.equal(at(first.stock, 'pages50', pageId)?.result, 'ok');
  assert.equal(at(first.stock, 'shared60', 'produtos')?.result, 'ok');
  assert.equal(at(first.stock, 'contracts70', 'produtos')?.result, 'ok');
  // The recorded movimentacoes shared predates the fixed list state (d2_65): it is redone, not reused.
  assert.deepEqual(at(first.stock, 'shared60', 'movimentacoes')?.codes, ['D2_SHARED_V2_DESCRIPTION_EMPTY', 'D2_SHARED_V2_STATE_DUPLICATE']);

  // clinic: three actors, own-registration pages and snake_case page ids pass every stage (p2_30, d2_63, d2_65).
  assert.ok(first.clinic.every(item => item.result === 'ok'), JSON.stringify(first.clinic.filter(item => item.result !== 'ok')));
  assert.equal(first.clinic.filter(item => item.stage === 'contracts70').length, 6);

  // expense: the decide page now writes approve/reject (p2_32), so the page11 recorded without those submits is redone.
  assert.equal(at(first.expense, 'needs30')?.result, 'ok');
  assert.deepEqual(at(first.expense, 'pages50', 'despesas_da_equipe')?.codes, ['D2_PAGE11_WRITE_UNCOVERED']);
  for (const pageId of ['despesas_aprovadas', 'inicio']) assert.equal(at(first.expense, 'pages50', pageId)?.result, 'ok');
  // expense inicio (hub: no read, no write): the recorded answer was refused for a load the code derived without its
  // request (d2_70); now the shared has no load, is approved, and the page has no contract route.
  assert.equal(at(first.expense, 'shared60', 'inicio')?.result, 'ok');
  assert.deepEqual(at(first.expense, 'contracts70', 'inicio'), { stage: 'contracts70', pageId: 'inicio', result: 'ok', codes: [] });
});

void test('d2_68: measured defects without a recorded answer are cases too', async () => {
  // clinic before p2_30: the receptionist's own page maintained another entity; input20 stops it before any LLM.
  const pack = readPack('clinic');
  const before = JSON.parse(readFileSync(path.join(HERE, '../../agentPlannerL2/steps/needs30/fixtures/p2_30/clinic/pool/needs.json'), 'utf8'));
  const artifacts = await artifactsOf(pack, before);
  await assert.rejects(() => buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts), /PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD/u);

  // expense minhas_despesas: the run wrote Despesa.transition for two transitions; the normalizer refuses naming the keys.
  const expense = readPack('expense');
  const needs = buildP2NeedsFile({
    menu: expense.json<PoolMenuFile>('pool/menu.json'),
    sources: parseP2L4Sources({ moduleName: expense.moduleName, userLanguage: expense.module.userLanguage, journeyIndex: expense.defs('l4/journeys/index.defs.ts'),
      journeys: expense.names('l4/journeys').map(name => expense.defs(`l4/journeys/${name}`)), access: expense.defs('l4/access.defs.ts'),
      ontologyIndex: expense.defs('l4/ontology/index.defs.ts'), ontologyEntities: expense.names('l4/ontology').map(name => expense.defs(`l4/ontology/${name}`)) }),
    grants: parseP2Grants(expense.defs('l4/access.defs.ts')), processes: parseP2Processes(expense.defs('l4/workflows.defs.ts')), now: AT,
  });
  const mine = needs.pages.find(item => item.pageId === 'minhas_despesas')!;
  assert.throws(() => d2NormalizeWriteKey('Despesa.transition', mine.writes), /D2_PAGE11_TRANSITION_AMBIGUOUS: .*Despesa\.enviarParaAprovacao/u);
});

void test('d2_71: a real approved page11 survives catalog text changes and regenerates from itself', async () => {
  const pack = readPack('stock');
  const artifacts = await artifactsOf(pack, pack.json('pool/needs.json'));
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts);
  const built = pageContextOf(pack, snapshot, artifacts, 'produtos')!;
  const { context, answer } = built;
  const writes = new Map<string, unknown>();
  const key = (info: { folder: string; shortName: string; extension: string }) => `${info.folder}/${info.shortName}${info.extension}`;
  const receipt = await approveD2PagesUnit(context, answer, 0, 0, {
    writeSource: async (info, source) => { writes.set(key(info), source); }, writeJson: async (info, value) => { writes.set(key(info), value); },
  });
  const port = { readReceipt: async () => receipt, context: async () => context, readSource: async (info: { folder: string; shortName: string; extension: string }) => writes.get(key(info)) as string, readNeeds: async (info: { folder: string; shortName: string; extension: string }) => writes.get(key(info)) };
  context.inventory = { ...context.inventory, sourceHash: 'sha256:edited-index' };
  context.moleculeHashes = { '/recorded': 'sha256:edited-text' };
  assert.equal(await reusableD2Page(context.identity, 'produtos', port), true);
  const approved = await readApprovedPage11(context.identity, 'produtos', port);
  const extra = { entity: 'Produto', operation: 'update', transitionRef: '', from: [] };
  context.page = { ...context.page, writes: [...context.page.writes, extra] };
  const payload = JSON.parse(buildD2PagesDecisionPrompt(context, undefined, approved).prompt) as { approved: unknown; regeneration: { reason: string[] } };
  assert.ok(payload.approved);
  assert.ok(payload.regeneration.reason.some(item => item.startsWith('the page now writes Produto.update')), payload.regeneration.reason.join(' | '));
});
