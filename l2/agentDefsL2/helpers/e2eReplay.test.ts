/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/e2eReplay.test.ts" enhancement="_blank"/>

/**
 * d2_68: the L2 chain replayed end to end without an LLM. menu20 → needs30 → input20 → pages50 → bff55 → shared60 →
 * contracts70 run with real gates and normalizers over frozen modules (fixtures/e2e, README there). pages50 replays the
 * answers the real runs accepted; bff55 and shared60 replay answers written by hand from the l4 exercise (d2_73).
 * Every stage result is asserted per module.
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
import { approveD2PagesUnit, buildD2PagesDecisionPrompt, type D2PagesContext, type D2PagesResponse } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { readApprovedPage11, reusableD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { approveD2SharedPage, d2SharedPageFrom, d2SharedSourceFor, executeD2Shared, receiptInfo as sharedReceiptInfo, sharedInfo, type D2SharedPage, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { contractInfo, contractReceiptInfo, executeD2Contracts70 } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { finalizeD2Pages } from '/_102020_/l2/agentDefsL2/steps/finalize80/run.js';
import { sourceInfo as pagesSourceInfo, type D2PagesReceipt } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { beforePromptStep as sharedStep } from '/_102020_/l2/agentDefsL2/steps/shared60/agentD2Shared.js';
import { buildD2SharedV2, gateD2SharedV2, parseD2SharedV2, type D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { deriveD2Shared } from '/_102020_/l2/agentDefsL2/helpers/d2SharedDerive.js';
import { approveD2BffUnit, bffDesignInfo, bffReceiptInfo, bffSchemaFor, buildD2BffPrompt, d2BffApproved, d2BffContextFrom, readApprovedD2Bff, D2_BFF_PROMPT_LIMIT_CHARS, type D2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { buildD2BffDesign, normalizeD2BffDesign, type D2BffDesign, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { parseD2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { d2ToolPayload } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
import { d2BffAccess } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { contractSourceFor } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';
import { parseD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import ts from 'typescript';
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

const BFF_PROMPT = readFileSync(path.join(HERE, '../steps/bff55/prompt.md'), 'utf8');

interface ReplayPage { page11Text: { desktop: string; mobile: string }; drafts: { desktop: unknown; mobile: unknown } }
interface ReplayOut { bff: Record<string, D2BffContext>; designs: Record<string, D2BffDesign>; shared: Record<string, D2SharedPage>; sharedDefs: Record<string, D2SharedV2Definition>; contracts: Record<string, string> }
const emptyOut = (): ReplayOut => ({ bff: {}, designs: {}, shared: {}, sharedDefs: {}, contracts: {} });

/** The bff55 context of one replayed page, as the worker builds it. */
function bffContextOf(pack: ReturnType<typeof readPack>, artifacts: D2InputArtifacts, needs: unknown, pageId: string, page: ReplayPage): D2BffContext {
  const need = (needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId)!;
  return {
    ...d2BffContextFrom({
      pageId, page11Text: page.page11Text, drafts: page.drafts, need, menu: artifacts.menu as D2Menu, module: artifacts.module,
      entities: artifacts.entities as D2BffContext['entities'], access: artifacts.access, rules: artifacts.rules, journeys: artifacts.journeys,
    }),
    identity: { project: 102047, module: pack.moduleName }, inputHash: 'sha256:input', prompt: BFF_PROMPT, approved: null,
  };
}

/** The shared60 page of one replayed page: its approved design and the other pages that passed pages50. */
function sharedPageOf(bff: D2BffContext, design: D2BffDesign, page11: Record<string, ReplayPage>): D2SharedPage {
  const siblings = Object.entries(page11).filter(([id]) => id !== bff.pageId).map(([id, row]) => ({
    pageId: id, page11: parseD2Page11Definition(row.page11Text.desktop).definition, drafts: [buildD2Page11Needs(row.drafts.desktop), buildD2Page11Needs(row.drafts.mobile)],
  }));
  const own = page11[bff.pageId];
  return d2SharedPageFrom({
    identity: bff.identity, inputHash: bff.inputHash, pageId: bff.pageId, page11Text: own.page11Text, drafts: own.drafts, need: bff.need, menu: bff.menu,
    grants: bff.grants, entities: bff.entities, design, siblings,
  });
}

async function replay(alias: string, out?: ReplayOut): Promise<Outcome[]> {
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
  const page11: Record<string, ReplayPage> = {};
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
        page11Text: { desktop: at('web/desktop/page11', pageId) as string, mobile: at('web/mobile/page11', pageId) as string },
        drafts: { desktop: at('pipeline/agentDefsL2/page11Needs', `${pageId}Desktop`), mobile: at('pipeline/agentDefsL2/page11Needs', `${pageId}Mobile`) },
      };
      outcomes.push({ stage: 'pages50', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'pages50', pageId, result: 'refused', codes: codesOf(error) }); }
  }

  // bff55 (A answer + B, with D over the shared the code derives), shared60 and contracts70 (code only).
  const approved: Array<{ bff: D2BffContext; design: D2BffDesign }> = [];
  for (const name of pack.list('answers/bff55')) {
    const pageId = name.replace(/\.json$/u, '');
    const page = page11[pageId];
    if (!page) { outcomes.push({ stage: 'bff55', pageId, result: 'refused', codes: ['D2_BFF_PAGE11_MISSING'] }); continue; }
    const bff = bffContextOf(pack, artifacts, needs, pageId, page);
    try {
      approved.push({ bff, design: d2BffApproved(bff, pack.json(`answers/bff55/${name}`)) });
      outcomes.push({ stage: 'bff55', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'bff55', pageId, result: 'refused', codes: codesOf(error) }); }
  }
  for (const { bff, design } of approved) {
    const pageId = bff.pageId;
    const shared = sharedPageOf(bff, design, page11);
    const writes = new Map<string, unknown>();
    let receipt;
    try {
      receipt = (await approveD2SharedPage(shared, { source: null, receipt: null }, {
        writeSource: async (_info, source) => { writes.set('source', source); }, writeJson: async () => undefined,
      })).receipt;
      outcomes.push({ stage: 'shared60', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'shared60', pageId, result: 'refused', codes: codesOf(error) }); continue; }
    if (out) { out.bff[pageId] = bff; out.designs[pageId] = design; out.shared[pageId] = shared; out.sharedDefs[pageId] = parseD2SharedV2(writes.get('source') as string).definition; }
    try {
      const contract = await contractSourceFor({
        identity: bff.identity, pageId, userLanguage: bff.userLanguage, design, access: d2BffAccess(design, bff.need, bff.grants),
        entities: bff.entities, sharedSource: writes.get('source') as string, sharedReceipt: receipt,
      });
      if (out) out.contracts[pageId] = contract;
      outcomes.push({ stage: 'contracts70', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'contracts70', pageId, result: 'refused', codes: codesOf(error) }); }
  }
  return outcomes;
}

void test('d2_68: modules replay end to end with the state expected after the fixes, deterministically', async () => {
  const first = { stock: await replay('stock'), clinic: await replay('clinic'), expense: await replay('expense') };
  const second = { stock: await replay('stock'), clinic: await replay('clinic'), expense: await replay('expense') };
  assert.deepEqual(second, first);
  const at = (rows: Outcome[], stage: string, pageId?: string) => rows.find(item => item.stage === stage && item.pageId === pageId);

  // stock: menu planned before p2_30 (no meta.records) is refused by name; the run's needs carry the chain on.
  assert.deepEqual(at(first.stock, 'menu20'), { stage: 'menu20', result: 'refused', codes: ['P2_MENU_RECORDS_MISSING'] });
  assert.deepEqual(at(first.stock, 'needs30')?.codes, ['P2_NEEDS_MENU_RECORDS_MISSING']);
  assert.equal(at(first.stock, 'input20')?.result, 'ok');
  for (const pageId of ['produtos', 'movimentacoes']) assert.equal(at(first.stock, 'pages50', pageId)?.result, 'ok');

  // clinic: three actors, own-registration pages and snake_case page ids pass every stage up to page11 (p2_30, d2_63).
  assert.ok(first.clinic.every(item => item.result === 'ok'), JSON.stringify(first.clinic.filter(item => item.result !== 'ok')));
  assert.equal(first.clinic.filter(item => item.stage === 'pages50').length, 6);

  // expense: the decide page now writes approve/reject (p2_32), so the page11 recorded without those submits is redone.
  assert.equal(at(first.expense, 'needs30')?.result, 'ok');
  assert.deepEqual(at(first.expense, 'pages50', 'despesas_da_equipe')?.codes, ['D2_PAGE11_WRITE_UNCOVERED']);
  for (const pageId of ['despesas_aprovadas', 'inicio']) assert.equal(at(first.expense, 'pages50', pageId)?.result, 'ok');

  // d2_75: the same code, unchanged, takes a recorded design of each module through bff55, shared60 and contracts70.
  // expense inicio is the hub: no endpoint, a shared with only its navigation, an empty contract.
  for (const [rows, pageId] of [[first.stock, 'produtos'], [first.expense, 'despesas_aprovadas'], [first.expense, 'inicio']] as const) {
    for (const stage of ['bff55', 'shared60', 'contracts70']) assert.deepEqual(at(rows, stage, pageId), { stage, pageId, result: 'ok', codes: [] }, `${pageId} ${stage}`);
  }
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

void test('d2_72: an input the L4 asks for and no organism edits is refused at the page gate, naming the field', async () => {
  const pack = readPack('expenseR2');
  const artifacts = await artifactsOf(pack, pack.json('pool/needs.json'));
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts);
  const built = pageContextOf(pack, snapshot, artifacts, 'despesas_da_equipe')!;
  await approveD2PagesUnit(built.context, built.answer, 0, 0, { writeSource: async () => undefined, writeJson: async () => undefined });
  const answer = structuredClone(built.answer);
  for (const device of ['desktop', 'mobile'] as const) {
    for (const unit of Object.values((answer[device].needs as { organisms: Record<string, { edits: string[] }> }).organisms)) unit.edits = unit.edits.filter(path => path !== 'Despesa.details.motivoRejeicao');
  }
  await assert.rejects(() => approveD2PagesUnit(built.context, answer, 0, 0, { writeSource: async () => undefined, writeJson: async () => undefined }),
    /D2_PAGE11_INPUT_NOT_EDITED: Submit rejectExpense \(Despesa\.rejeitarDespesa\) asks for Despesa\.details\.motivoRejeicao/u);
});

async function dining(): Promise<{ outcomes: Outcome[]; out: ReplayOut; pack: ReturnType<typeof readPack> }> {
  const out = emptyOut();
  return { outcomes: await replay('dining', out), out, pack: readPack('dining') };
}

/** Diagnostics of the TypeScript in node_modules over one standalone source (the Studio compiles with 5.0.2 in finalize80). */
function compileErrors(source: string): string[] {
  const fileName = '/contract.ts';
  const options: ts.CompilerOptions = { strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, types: [] };
  const host = ts.createCompilerHost(options);
  const original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, language, ...rest) => (name === fileName ? ts.createSourceFile(name, source, language) : original(name, language, ...rest));
  return ts.getPreEmitDiagnostics(ts.createProgram([fileName], options, host)).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'));
}

/** The bff55 context of any dining page, whether or not it has a recorded design. */
async function diningBffContext(pageId: string): Promise<D2BffContext> {
  const pack = readPack('dining');
  const artifacts = await artifactsOf(pack, pack.json('pool/needs.json'));
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts);
  const built = pageContextOf(pack, snapshot, artifacts, pageId)!;
  const writes = new Map<string, unknown>();
  await approveD2PagesUnit(built.context, built.answer, 0, 0, { writeSource: async (info, source) => { writes.set(info.shortName + info.folder, source); }, writeJson: async (info, value) => { writes.set(info.shortName + info.folder, value); } });
  const at = (folder: string, shortName: string) => writes.get(shortName + `${pack.moduleName}/${folder}`);
  return bffContextOf(pack, artifacts, pack.json('pool/needs.json'), pageId, {
    page11Text: { desktop: at('web/desktop/page11', pageId) as string, mobile: at('web/mobile/page11', pageId) as string },
    drafts: { desktop: at('pipeline/agentDefsL2/page11Needs', `${pageId}Desktop`), mobile: at('pipeline/agentDefsL2/page11Needs', `${pageId}Mobile`) },
  });
}

/** A recorded answer of a live round, with the bindings.updates added by hand (it predates them, d2_78). */
function recordedAnswer(rel: string): unknown {
  const pack = readPack('dining');
  const raw = structuredClone(pack.json<{ raw: unknown }>(`recorded/${rel}`).raw) as { result?: { arguments: { bindings?: Record<string, unknown> } } };
  const args = (raw.result?.arguments ?? raw) as { bindings?: Record<string, unknown> };
  if (args.bindings && !Array.isArray(args.bindings.updates)) args.bindings.updates = pack.json<Record<string, unknown>>('recorded/updates-added.json')[rel] ?? [];
  return raw;
}

type RawDesign = { types: Array<{ name: string; fields: Array<Record<string, unknown>> }>; endpoints: Array<Record<string, unknown> & { output: Array<Record<string, unknown>> }>; bindings: { organisms: Array<{ organism: string; reads: string }>; commands: Array<{ endpoint: string; refreshes: string[] }>; selections: unknown[]; journeys: unknown[] } };
const atendimentoAnswer = (): RawDesign => readPack('dining').json<RawDesign>('answers/bff55/atendimento.json');
const refusalOf = (run: () => unknown): string => { try { run(); return ''; } catch (error) { return String(error); } };

void test('d2_74: the schema says what the parser requires; a query write the host filled in is dropped, not refused', async () => {
  // The answer p4_29 recorded for mesas (refused then with "a query writes nothing"), plus the bindings A now writes.
  const recorded = d2ToolPayload(readPack('dining').json<{ raw: unknown }>('recorded/bff55/mesas-2.json').raw, 'submitD2Bff', 'D2_BFF') as Record<string, unknown>;
  const withBindings = () => ({ ...structuredClone(recorded), bindings: {
    organisms: [{ organism: 'mesasList', reads: 'listarMesas.pagina' }, { organism: 'mesaForm', reads: 'listarMesas.pagina' }],
    commands: [{ endpoint: 'criarMesa', refreshes: ['listarMesas'] }], selections: [{ organism: 'mesasList', via: { kind: 'list', ref: 'listarMesas.pagina' } }], journeys: [],
    updates: [{ endpoint: 'listarMaisMesas', state: 'listarMesas.pagina', mode: 'append' }, { endpoint: 'atualizarMesa', state: 'listarMesas.pagina', mode: 'upsert' }],
  } }) as unknown as RawDesign;
  const mesas = await diningBffContext('mesas');
  const design = d2BffApproved(mesas, withBindings());
  assert.ok(design.endpoints.filter(item => item.kind === 'qry').length >= 2);
  assert.ok(design.endpoints.every(item => item.kind === 'cmd' ? item.writes : item.writes === undefined));

  // A command without a write of the plan is still refused.
  const raw = withBindings();
  raw.endpoints.find(item => item.kind === 'cmd')!.writes = '';
  assert.match(refusalOf(() => d2BffApproved(mesas, raw)), /D2_BFF_FORMAT: endpoints\.\w+\.writes: a command names its write/u);

  // origin is required on every leaf; on a leaf that names a type it is ignored, whatever its shape.
  const schema = bffSchemaFor(mesas) as { required: string[]; properties: { endpoints: { items: { properties: { writes: { enum: string[] }; output: { items: { required: string[] } } } } } } };
  assert.deepEqual(schema.properties.endpoints.items.properties.output.items.required, ['name', 'type', 'origin']);
  assert.deepEqual(schema.required, ['types', 'endpoints', 'bindings']);
  assert.equal(schema.properties.endpoints.items.properties.writes.enum[0], '');
  const odd = withBindings();
  for (const endpoint of odd.endpoints) for (const leaf of endpoint.output) if (/^[A-Z]/u.test(String(leaf.type))) leaf.origin = { kind: 'field', paths: [] };
  assert.doesNotThrow(() => d2BffApproved(mesas, odd));

  // A page without writes gets the neutral enum [''], never a free string.
  const inicioSchema = bffSchemaFor(await diningBffContext('inicio')) as typeof schema;
  assert.deepEqual(inicioSchema.properties.endpoints.items.properties.writes.enum, ['']);
});

void test('d2_75: the shared comes from the design by code: entry params, refreshes, selection, no function as source, JSDoc text', async () => {
  const { outcomes, out } = await dining();
  assert.ok(outcomes.every(item => item.result === 'ok'), JSON.stringify(outcomes.filter(item => item.result !== 'ok')));
  const shared = out.sharedDefs.atendimento;
  const design = out.designs.atendimento;
  // rule 8: the selected record survives a reload, from the URL then local storage.
  assert.deepEqual(shared.entry.params.comandaId, { type: 'string', sources: ['url', 'localStorage'], effect: 'select:detalheComanda', persist: true });
  assert.deepEqual(shared.states.selectedComanda, { source: 'entry.params.comandaId', description: 'Comanda pronta para a tela do garçom: cabeçalho, itens e subtotal.', organisms: ['acoesAtendimento', 'detalheComanda', 'lookupAtendimento'] });
  // One function per endpoint, same id; a command redraws with its output and reloads what A declared.
  assert.deepEqual(Object.keys(shared.functions).sort(), design.endpoints.map(item => item.id).sort());
  assert.deepEqual(shared.functions.abrirComanda, { calls: 'abrirComanda', description: 'Abrir uma comanda para a mesa escolhida.', sets: 'comanda', updates: ['mesas'] });
  // The selection calls the detail query A declared, which sets the detail state.
  assert.deepEqual([shared.functions.carregarComanda.calls, shared.functions.carregarComanda.sets], ['carregarComanda', 'comanda']);
  // No state takes a function as source; no description is an identifier.
  for (const [id, state] of Object.entries(shared.states)) {
    assert.ok(state.source.startsWith('entry.params.') || design.endpoints.some(item => state.source.startsWith(`${item.id}.`)), id);
    assert.doesNotMatch(state.description, /^[a-z][A-Za-z0-9]*$/u, id);
  }
  for (const [id, fn] of Object.entries(shared.functions)) assert.equal(fn.description, design.endpoints.find(item => item.id === id)?.jsdoc.purpose, id);
  // Form from the input of the write (d2_72): only the create that asks for typed input has one.
  assert.deepEqual(shared.forms, { lancarItem: { organism: 'formularioLancamento', submit: 'lancarItem' } });
  // requests, rules and access are A's.
  assert.deepEqual(shared.requests.lancarItem, { kind: 'cmd', trigger: 'lancarItem', writes: 'ItemComanda.create', returns: ['comanda'] });
  assert.deepEqual(shared.access, { actors: ['garcom'], grants: ['garcomAtendimentoComandas'] });
  assert.equal(shared.journeys.length, 8);
});

void test('d2_75/d2_78: the contract takes names and types from the ontology, has no meta, and its JSDoc is parsed back', async () => {
  const { out } = await dining();
  const atendimento = out.contracts.atendimento;
  // d2_79: a field leaf keeps its path in the ontology; a field of another entity sits under that entity's name.
  assert.match(atendimento, /export interface ComandaComItens \{\n {2}id: string;\n {2}number: number;\n {2}mesaId: string;\n {2}mesa: \{\n {4}code: string;\n {2}\};\n {2}status: 'open' \| 'closed';\n {2}details: \{\n {4}readonly subtotal: string;\n {2}\};\n {2}itens: ItemDaComanda\[\];\n\}/u);
  assert.match(atendimento, /export interface MesaDoSalao \{\n {2}id: string;\n {2}code: string;\n {2}details: \{\n {4}readonly disponivel: boolean;\n {2}\};\n {2}comanda: \{\n {4}id\?: string;/u);
  assert.match(atendimento, /input: \{ comandaId: string; itemCardapioId: string; details: \{ quantidade: number; observacao\?: string \} \};/u);
  assert.match(atendimento, /'comandaRestaurante\.atendimento\.cancelarItem': \{\n {4}kind: 'cmd';\n {4}writes: 'ItemComanda\.cancelarItemComanda';\n {4}input: \{ id: string; version: number \};/u);
  for (const endpointId of ['carregarAtendimento', 'carregarComanda', 'buscarItemCardapio', 'abrirComanda', 'lancarItem', 'cancelarItem']) {
    assert.match(atendimento, new RegExp(`/\\*\\*\\n {3}\\* Finalidade: [^\\n]+\\n {3}\\* Entrada: [^\\n]+\\n {3}\\* Processamento: [^\\n]+\\n {3}\\* Saída: [^\\n]+\\n {3}\\*/\\n {2}'comandaRestaurante\\.atendimento\\.${endpointId}'`, 'u'));
  }
  // d2_78: no meta; the parser exposes the JSDoc of each route and interface, and the readonly fields.
  const parsed = parseD2ContractV2(atendimento);
  assert.doesNotMatch(atendimento, /\bmeta:/u);
  const lancar = parsed.routes.find(item => item.route.endsWith('.lancarItem'))!;
  assert.deepEqual(lancar.meta, { output: {}, lists: {}, params: {} });
  assert.equal(lancar.jsdoc?.purpose, 'Lançar um item do cardápio na comanda aberta.');
  assert.match(lancar.jsdoc?.processing ?? '', /^Recusa se a comanda não estiver open \(itensSomenteEmComandaAberta\)/u);
  const comanda = parsed.projections.find(item => item.name === 'ComandaComItens')!;
  assert.equal(comanda.jsdoc, 'Comanda pronta para a tela do garçom: cabeçalho, itens e subtotal.');
  assert.deepEqual(comanda.fields?.find(field => field.name === 'details.subtotal'), { name: 'details.subtotal', type: 'string', optional: false, readonly: true });
  assert.deepEqual(comanda.fields?.find(field => field.name === 'mesa.code'), { name: 'mesa.code', type: 'string', optional: false, readonly: false });
  assert.deepEqual(comanda.fields?.find(field => field.name === 'id'), { name: 'id', type: 'string', optional: false, readonly: false });
  for (const contract of Object.values(out.contracts)) assert.doesNotMatch(contract, /origin|aggregate/u);
  for (const [pageId, contract] of Object.entries(out.contracts)) assert.deepEqual(compileErrors(contract), [], pageId);
  assert.ok(compileErrors(atendimento.replace('itens: ItemDaComanda[];', 'itens: ItemSemTipo[];')).some(item => item.includes('ItemSemTipo')));
});

void test('d2_75: a field leaf takes the ontology name and type, without refusal', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const answer = atendimentoAnswer();
  const mesa = answer.types.find(item => item.name === 'MesaDoSalao')!;
  mesa.fields.find(field => field.name === 'code')!.name = 'codigo';
  mesa.fields.find(field => field.name === 'subtotal')!.type = 'number';
  const design = d2BffApproved(bff, answer);
  const fields = design.types.find(item => item.name === 'MesaDoSalao')!.fields;
  assert.deepEqual(fields.find(field => field.origin?.paths[0] === 'Mesa.code'), { name: 'code', type: 'string', origin: { kind: 'field', paths: ['Mesa.code'] } });
  assert.equal(fields.find(field => field.origin?.paths[0] === 'Comanda.details.subtotal')?.type, 'string');
  // Bindings follow a renamed output key.
  const renamed = atendimentoAnswer();
  renamed.endpoints.find(item => item.id === 'buscarItemCardapio')!.output.push({ name: 'nomeBuscado', type: 'string', origin: { kind: 'field', paths: ['ItemCardapio.name'] } });
  renamed.bindings.organisms = renamed.bindings.organisms.map(row => row.organism === 'formularioLancamento' ? { ...row, reads: 'buscarItemCardapio.nomeBuscado' } : row);
  assert.equal(normalizeD2BffDesign(buildD2BffDesign(renamed), bff.entities).bindings.organisms.find(row => row.organism === 'formularioLancamento')?.reads, 'buscarItemCardapio.name');
});

void test('d2_75: B refuses by fact, naming the exact path; D goes back to A', async () => {
  const bff = (await dining()).out.bff.atendimento;

  // B.1: a field an organism reads that no output carries.
  const noObservation = atendimentoAnswer();
  const line = noObservation.types.find(item => item.name === 'ItemDaComanda')!;
  line.fields = line.fields.filter(field => field.name !== 'observacao');
  assert.match(refusalOf(() => d2BffApproved(bff, noObservation)), /D2_BFF_COVERAGE: organisms\.detalheComanda\.reads\.ItemComanda\.details\.observacao/u);

  // B.2: the transition asks for a payload the command does not carry.
  const entities = structuredClone(bff.entities) as unknown as Record<string, { transitions: Array<{ transitionId: string; payload: string[] }> }>;
  entities.ItemComanda.transitions.find(item => item.transitionId === 'cancelarItemComanda')!.payload = ['details.observacao'];
  assert.match(refusalOf(() => d2BffApproved({ ...bff, entities: entities as unknown as D2BffContext['entities'] }, atendimentoAnswer())),
    /D2_BFF_COMMAND_INPUT: endpoints\.cancelarItem\.input: command cancelarItem \(ItemComanda\.cancelarItemComanda\) asks for ItemComanda\.details\.observacao/u);

  // B.3: an origin no actor of the page sees, an unknown rule, an unknown field.
  const facts = atendimentoAnswer();
  facts.types.find(item => item.name === 'MesaDoSalao')!.fields.push({ name: 'paymentMethod', type: 'string', origin: { kind: 'field', paths: ['Comanda.details.paymentMethod'] } }, { name: 'lugares', type: 'number', origin: { kind: 'field', paths: ['Mesa.details.lugares'] } });
  facts.endpoints.find(item => item.id === 'carregarAtendimento')!.rules = ['regraQueNaoExiste'];
  const codes = refusalOf(() => d2BffApproved(bff, facts));
  assert.match(codes, /D2_BFF_ORIGIN_GRANT: types\.MesaDoSalao\.comanda\.details\.paymentMethod: origin Comanda\.details\.paymentMethod is not visible to any actor of the page \(garcom\)/u);
  assert.match(codes, /D2_BFF_RULE_UNKNOWN: endpoints\.carregarAtendimento\.rules: rule regraQueNaoExiste/u);
  assert.match(codes, /D2_BFF_ORIGIN_UNKNOWN: types\.MesaDoSalao\.details\.lugares: origin Mesa\.details\.lugares/u);

  // bindings: an organism that reads without a source, a reload of a query that does not exist.
  const links = atendimentoAnswer();
  links.bindings.organisms = links.bindings.organisms.filter(row => row.organism !== 'formularioLancamento');
  links.bindings.commands[0].refreshes = ['consultaQueNaoExiste'];
  const linkCodes = refusalOf(() => d2BffApproved(bff, links));
  assert.match(linkCodes, /D2_BFF_BINDING_ORGANISM: bindings\.organisms\.formularioLancamento: organism formularioLancamento reads and has no source in bindings\.organisms/u);
  assert.match(linkCodes, /D2_BFF_BINDING_QUERY: bindings\.commands\.0\.refreshes\.0: consultaQueNaoExiste is not a query of the page/u);

  // D over the derived shared goes back to A: a source that leaves a read field unheld.
  const unfed = atendimentoAnswer();
  unfed.bindings.organisms = unfed.bindings.organisms.map(row => row.organism === 'formularioLancamento' ? { ...row, reads: 'carregarComanda.comanda' } : row);
  (unfed.bindings as unknown as { updates: unknown[] }).updates.push({ endpoint: 'buscarItemCardapio', state: 'carregarComanda.comanda', mode: 'replace' });
  assert.match(refusalOf(() => d2BffApproved(bff, unfed)), /D2_SHARED_V2_ORGANISM_UNFED: Organism \w+ reads ItemCardapio\.details\.precoVigente, and no state holds it/u);
});

void test('d2_80 s1: an organism with two sources passes B', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const answer = atendimentoAnswer();
  answer.bindings.organisms.push({ organism: 'lookupAtendimento', reads: 'carregarComanda.comanda' }, { organism: 'lookupAtendimento', reads: 'carregarComanda.comanda' });
  const design = d2BffApproved(bff, answer);
  assert.deepEqual(design.bindings.organisms.filter(row => row.organism === 'lookupAtendimento').map(row => row.reads).sort(), ['carregarAtendimento.mesas', 'carregarComanda.comanda', 'carregarComanda.comanda']);
});

void test('d2_80 s1: an organism that reads and has no source is refused with D2_BFF_BINDING_ORGANISM', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const answer = atendimentoAnswer();
  answer.bindings.organisms = answer.bindings.organisms.filter(row => row.organism !== 'lookupAtendimento');
  assert.match(refusalOf(() => d2BffApproved(bff, answer)), /D2_BFF_BINDING_ORGANISM: bindings\.organisms\.lookupAtendimento: organism lookupAtendimento reads and has no source in bindings\.organisms/u);
});

void test('d2_80 s2: every state of the shared lists the organisms it feeds, each one an organism of the page', async () => {
  for (const alias of ['dining', 'expense', 'stock']) {
    const out = emptyOut();
    await replay(alias, out);
    const pages = Object.entries(out.sharedDefs);
    assert.ok(pages.length > 0, `${alias}: no shared reached`);
    let listed = 0;
    for (const [pageId, shared] of pages) {
      const page11 = out.shared[pageId].derive.page11;
      const onPage = new Set([...Object.keys(page11.desktop.organisms), ...Object.keys(page11.mobile.organisms)]);
      for (const [id, state] of Object.entries(shared.states)) {
        assert.deepEqual(Object.keys(state), ['source', 'description', 'organisms'], `${alias} ${pageId} ${id}`);
        assert.deepEqual(state.organisms, [...new Set(state.organisms)].sort(), `${alias} ${pageId} ${id}: sorted, no repeats`);
        for (const organism of state.organisms) assert.ok(onPage.has(organism), `${alias} ${pageId} ${id}: ${organism} is not on the page`);
        if (state.organisms.length) listed += 1;
      }
    }
    assert.ok(listed > 0, `${alias}: no state lists an organism`);
  }
  // A source state lists every organism that reads it; a parse without organisms is refused.
  const { out } = await dining();
  const design = out.designs.atendimento;
  for (const state of Object.values(out.sharedDefs.atendimento.states).filter(item => !item.source.startsWith('entry.params.'))) {
    assert.deepEqual(state.organisms, [...new Set(design.bindings.organisms.filter(row => row.reads === state.source).map(row => row.organism))].sort(), state.source);
  }
  const shared = structuredClone(out.sharedDefs.atendimento) as unknown as { states: Record<string, Record<string, unknown>> };
  delete Object.values(shared.states)[0].organisms;
  assert.throws(() => buildD2SharedV2(shared), /D2_SHARED_V2_STATE: \w+: missing field organisms/u);
});

void test('d2_80 s3: gate D reads the map: every organism that reads is listed by a state; two sources, two states; an unlisted one is refused', async () => {
  // The class: for every page of the e2e fixtures, every organism that reads is in the organisms of some state.
  for (const alias of ['dining', 'expense', 'stock']) {
    const out = emptyOut();
    await replay(alias, out);
    let readers = 0;
    for (const [pageId, shared] of Object.entries(out.sharedDefs)) {
      const { page11, drafts } = out.shared[pageId].derive;
      const listed = new Set(Object.values(shared.states).flatMap(state => state.organisms));
      for (const device of ['desktop', 'mobile'] as const) {
        for (const id of Object.keys(page11[device].organisms)) {
          if (!drafts[device].organisms[id]?.reads.length) continue;
          readers += 1;
          assert.ok(listed.has(id), `${alias} ${pageId} ${device}: ${id} reads and no state lists it`);
        }
      }
    }
    assert.ok(readers > 0, `${alias}: no organism reads`);
  }

  // An organism with two sources appears in the two source states.
  const { out } = await dining();
  const derive = out.shared.atendimento.derive;
  const sourceListing = (definition: D2SharedV2Definition, organism: string) => Object.values(definition.states).filter(state => !state.source.startsWith('entry.params.') && state.organisms.includes(organism)).map(state => state.source).sort();
  assert.deepEqual(sourceListing(out.sharedDefs.atendimento, 'lookupAtendimento'), ['carregarAtendimento.mesas']);
  const answer = atendimentoAnswer();
  answer.bindings.organisms.push({ organism: 'lookupAtendimento', reads: 'carregarComanda.comanda' });
  const design = d2BffApproved(out.bff.atendimento, answer);
  assert.deepEqual(sourceListing(deriveD2Shared({ ...derive, design }), 'lookupAtendimento'), ['carregarAtendimento.mesas', 'carregarComanda.comanda']);

  // Removing an organism from every organisms list is refused, naming it; the sources stay, so only the map check speaks.
  const context = { page11: derive.page11, drafts: derive.drafts, need: derive.need, menu: derive.menu, design: derive.design };
  assert.deepEqual(gateD2SharedV2(out.sharedDefs.atendimento, context).filter(issue => issue.code === 'D2_SHARED_V2_ORGANISM_UNFED'), []);
  const unlisted = structuredClone(out.sharedDefs.atendimento) as D2SharedV2Definition;
  for (const state of Object.values(unlisted.states)) state.organisms = state.organisms.filter(id => id !== 'lookupAtendimento');
  const unfed = gateD2SharedV2(unlisted, context).filter(issue => issue.code === 'D2_SHARED_V2_ORGANISM_UNFED');
  assert.deepEqual(unfed.map(issue => [issue.path, issue.message]), [['organisms.lookupAtendimento', 'Organism lookupAtendimento reads, and no state lists it in organisms.']]);
});

void test('d2_75: B does not judge the design: other reloads and other names pass', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const other = JSON.parse(JSON.stringify(atendimentoAnswer()).replace(/buscarItemCardapio/gu, 'procurarPrato')) as RawDesign;
  other.bindings.commands = [];
  assert.doesNotThrow(() => d2BffApproved(bff, other));
});

void test('d2_75: one LLM call per page; the prompt of A stays inside the limit, carries the rule texts and the schema passes the tool lint', async (t) => {
  const pack = readPack('dining');
  const sizes: string[] = [];
  for (const name of pack.list('answers/pages50')) {
    const pageId = name.replace(/\.json$/u, '');
    const bff = await diningBffContext(pageId);
    const prompt = buildD2BffPrompt(bff);
    assert.ok(prompt.chars < D2_BFF_PROMPT_LIMIT_CHARS);
    assert.deepEqual(lintToolSchema(JSON.stringify(bffSchemaFor(bff))), null, pageId);
    sizes.push(`${pageId}: A=${prompt.chars}`);
  }
  t.diagnostic(`prompt chars: ${sizes.join('; ')}`);
  const atendimento = await diningBffContext('atendimento');
  assert.match(buildD2BffPrompt(atendimento).humanPrompt, /precoUnitarioRegistradoNoLancamento/u);
  assert.match(buildD2BffPrompt(atendimento).humanPrompt, /"journeySteps":\["abrirComanda\/criarComanda"/u);
});

void test('d2_75: no id of a fixture module, entity, page or endpoint in the agent sources or prompts', () => {
  const terms = new Set<string>();
  for (const alias of readdirSync(ROOT).filter(name => !name.includes('.'))) {
    const pack = readPack(alias);
    terms.add(pack.moduleName);
    for (const name of pack.names('l4/ontology')) terms.add(name.replace(/\.defs\.ts$/u, ''));
    for (const name of pack.list('answers/pages50')) terms.add(name.replace(/\.json$/u, ''));
    for (const name of pack.list('answers/bff55')) for (const endpoint of pack.json<RawDesign>(`answers/bff55/${name}`).endpoints) terms.add(String(endpoint.id));
  }
  const pattern = new RegExp(`\\b(${[...terms].join('|')})\\b`, 'u');
  const files: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) { if (name.name !== 'fixtures') walk(full); continue; }
      if ((name.name.endsWith('.ts') && !name.name.endsWith('.test.ts')) || name.name === 'prompt.md') files.push(full);
    }
  };
  walk(path.join(HERE, '..'));
  const hits = files.flatMap(file => { const found = pattern.exec(readFileSync(file, 'utf8')); return found ? [`${path.relative(path.join(HERE, '..'), file)}: ${found[1]}`] : []; });
  assert.deepEqual(hits, []);
  // Positive control: the same pattern finds the terms where they live.
  assert.ok(terms.size > 20);
  assert.ok(pattern.test(readFileSync(path.join(ROOT, 'dining/answers/bff55/atendimento.json'), 'utf8')));
});


void test('d2_75: shared60 runs without a prompt; a refused page does not stop the others; the same inputs write nothing', async () => {
  const { out } = await dining();
  const writes = new Map<string, unknown>();
  const writer = { writeSource: async (info: { folder: string; shortName: string }, source: string) => { writes.set(`${info.folder}/${info.shortName}`, source); }, writeJson: async (info: { folder: string; shortName: string }, value: unknown) => { writes.set(`${info.folder}/${info.shortName}.json`, value); } };
  const broken = { ...out.shared.inicio, derive: { ...out.shared.inicio.derive, design: { ...out.shared.inicio.derive.design, bindings: { ...out.shared.inicio.derive.design.bindings, organisms: [] } } } };
  const existing = new Map<string, { source: string | null; receipt: D2SharedReceipt | null }>();
  const port = {
    pageIds: async () => ['atendimento', 'inicio'],
    upstreamRefusal: async () => null,
    load: async (pageId: string) => (pageId === 'inicio' ? broken : out.shared[pageId]),
    readExisting: async (pageId: string) => existing.get(pageId) ?? { source: null, receipt: null },
    writer,
  };
  const step = { type: 'agent', stepId: 2, interaction: null, stepTitle: 'shared', status: 'waiting_human_input', nextSteps: [], agentName: 'agentD2Shared', prompt: '', rags: [],
    planning: { planId: 'shared60', dependsOn: [], executionMode: 'sequential', executionHost: 'client' } } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'm', threadId: 't' }, task: { PK: 'task' }, isTest: true } as mls.msg.ExecutionContext;
  const failed = await sharedStep({ agentName: 'agentD2Shared' } as Parameters<typeof sharedStep>[0], execution, { ...step, stepId: 1 } as mls.msg.AIAgentStep, step, 1, port);
  assert.equal(failed.some(item => item.type === 'prompt_ready'), false);
  // d2_76: the stage completes with the refusal named; the pipeline fails once, in finalize80.
  const status = failed.find(item => item.type === 'update-status') as { status: string; traceMsg: string };
  assert.equal(status.status, 'completed');
  assert.match(status.traceMsg, /D2_SHARED_PAGES_REFUSED: inicio: D2_SHARED_SELF_CHECK: D2_SHARED_V2_ORGANISM_UNFED/u);
  assert.equal(typeof writes.get('comandaRestaurante/web/shared/atendimento'), 'string');

  // Fixed, it passes; a second run over the same inputs writes nothing.
  port.load = async (pageId: string) => out.shared[pageId];
  const first = await executeD2Shared(port);
  assert.deepEqual(first, { wrote: ['atendimento', 'inicio'], reused: [], skipped: [], refused: [] });
  for (const pageId of ['atendimento', 'inicio']) existing.set(pageId, { source: writes.get(`comandaRestaurante/web/shared/${pageId}`) as string, receipt: writes.get(`comandaRestaurante/pipeline/agentDefsL2/shared60/${pageId}.json`) as D2SharedReceipt });
  writes.clear();
  assert.deepEqual(await executeD2Shared(port), { wrote: [], reused: ['atendimento', 'inicio'], skipped: [], refused: [] });
  assert.equal(writes.size, 0);
  assert.equal(d2SharedSourceFor(out.shared.atendimento), existing.get('atendimento')?.source);
});

/**
 * The whole stage over recorded answers in place of the LLM (d2_77): bff55 as the worker runs it (attempt 1, then the
 * recorded repair; an internal assertion has no repair), then shared60, contracts70 and finalize80 with in-memory ports.
 */
async function runDiningStage(answers: Record<string, unknown[]>): Promise<{
  refusals: Map<string, string>; designs: Record<string, D2BffDesign>; shared: Awaited<ReturnType<typeof executeD2Shared>>;
  contracts: Awaited<ReturnType<typeof executeD2Contracts70>>; report: Awaited<ReturnType<typeof finalizeD2Pages>>['report']; compiled: string[]; blocked: string;
  sources: Record<string, { shared: string; contract?: string }>;
}> {
  const pack = readPack('dining');
  const ids = Object.keys(answers).sort();
  const contexts: Record<string, D2BffContext> = {};
  const designs: Record<string, D2BffDesign> = {};
  const refusals = new Map<string, string>();
  const identity = { project: 102047, module: pack.moduleName };
  const files = new Map<string, unknown>();
  // Written as JSON and read back, as the store does; the later stages read the design from here, never from memory.
  const writer = { writeSource: async (info: Ns5FileInfo, source: string) => { files.set(displayPath(info), source); }, writeJson: async (info: Ns5FileInfo, value: unknown) => { files.set(displayPath(info), JSON.parse(JSON.stringify(value))); return displayPath(info); } };
  const stored = { readReceipt: async (_identity: unknown, pageId: string) => (files.get(displayPath(bffReceiptInfo(identity, pageId))) ?? null) as never, readDesign: async (info: Ns5FileInfo) => files.get(displayPath(info)) ?? null };
  for (const pageId of ids) {
    contexts[pageId] = await diningBffContext(pageId);
    let diagnostic = '';
    for (const [attempt, raw] of answers[pageId].entries()) {
      try { await approveD2BffUnit(contexts[pageId], d2ToolPayload(raw, 'submitD2Bff', 'D2_BFF'), 0, 0, writer); diagnostic = ''; break; }
      catch (error) {
        diagnostic = attempt ? `D2_BFF_REPAIR_LIMIT: ${error instanceof Error ? error.message : String(error)}` : (error instanceof Error ? error.message : String(error));
        if (diagnostic.startsWith('D2_BFF_ASSERT')) break;
      }
    }
    if (diagnostic) refusals.set(pageId, diagnostic);
    else designs[pageId] = (await readApprovedD2Bff(identity, pageId, stored))!;
  }
  const replayPages: Record<string, ReplayPage> = Object.fromEntries(ids.map(pageId => [pageId, { page11Text: contexts[pageId].page11Text, drafts: { desktop: JSON.parse(contexts[pageId].draftText.desktop), mobile: JSON.parse(contexts[pageId].draftText.mobile) } }]));
  const upstreamRefusal = async (pageId: string) => refusals.get(pageId) ?? null;
  const shared = await executeD2Shared({
    pageIds: async () => ids, upstreamRefusal, load: async pageId => sharedPageOf(contexts[pageId], designs[pageId], replayPages),
    readExisting: async () => ({ source: null, receipt: null }), writer,
  }, identity);
  const contracts = await executeD2Contracts70({
    pageIds: async () => ids, upstreamRefusal,
    load: async pageId => ({
      identity, pageId, userLanguage: contexts[pageId].userLanguage, design: designs[pageId], access: d2BffAccess(designs[pageId], contexts[pageId].need, contexts[pageId].grants),
      entities: contexts[pageId].entities, sharedSource: files.get(displayPath(sharedInfo(identity, pageId))) as string,
      sharedReceipt: files.get(displayPath(sharedReceiptInfo(identity, pageId))) as D2SharedReceipt,
    }),
    readExisting: async () => ({ source: null, receipt: null }), writer,
  }, identity);
  const pageReceipt = async (pageId: string) => ({ sourceHashes: { desktop: await sha256Text(contexts[pageId].page11Text.desktop), mobile: await sha256Text(contexts[pageId].page11Text.mobile) } }) as D2PagesReceipt;
  const page11Source = new Map(ids.flatMap(pageId => (['desktop', 'mobile'] as const).map(device => [displayPath(pagesSourceInfo(identity, pageId, device)), contexts[pageId].page11Text[device]] as const)));
  const compiled: string[] = [];
  let blocked = '';
  const { report } = await finalizeD2Pages({ ...identity, scope: 'all' }, {
    readInput: async () => ({ ...identity, snapshotHash: 'sha256:input', selection: { writePageIds: ids } }) as unknown as D2InputSnapshot,
    readBundle: async () => ({ artifacts: {} as never, files: [] }), assertStable: async () => undefined,
    readPipeline: async () => ({ ...identity, steps: Object.fromEntries(['entry10', 'input20', 'pages50', 'bff55', 'shared60', 'contracts70'].map(step => [step, { status: 'approved', snapshotHash: 'sha256:input' }])) }) as never,
    reusable: async () => true, readReceipt: (_identity, pageId) => pageReceipt(pageId), indexed: () => true,
    readSource: async info => (page11Source.get(displayPath(info)) ?? files.get(displayPath(info)) ?? '') as string,
    readJson: async <T>(info: Ns5FileInfo) => (files.get(displayPath(info)) ?? null) as T | null,
    readDraftText: async (_identity, pageId, device) => contexts[pageId].draftText[device],
    readSharedReceipt: async (_identity, pageId) => (files.get(displayPath(sharedReceiptInfo(identity, pageId))) ?? null) as D2SharedReceipt | null,
    readContractReceipt: async (_identity, pageId) => (files.get(displayPath(contractReceiptInfo(identity, pageId))) ?? null) as never,
    readRefusal: async (_identity, pageId) => (refusals.has(pageId) ? { stage: 'bff55', diagnostic: refusals.get(pageId)! } : null),
    writeJson: async (info, value) => { files.set(displayPath(info), value); return displayPath(info); },
    compile: async (_identity, sources, hashes) => {
      compiled.push(...sources.map(item => `${item.pageId}:${item.kind}`));
      return sources.map(item => ({ path: item.path, sha256: hashes.get(item.path)!, status: item.kind === 'contract' && compileErrors(item.source).length ? 'failed' as const : 'passed' as const, diagnostics: item.kind === 'contract' ? compileErrors(item.source) : [] }));
    },
    markComplete: async () => undefined,
    markBlocked: async (_identity, diagnostic) => { blocked = diagnostic; },
  });
  const sources = Object.fromEntries(ids.filter(pageId => !refusals.has(pageId)).map(pageId => [pageId, {
    shared: files.get(displayPath(sharedInfo(identity, pageId))) as string, contract: files.get(displayPath(contractInfo(identity, pageId))) as string | undefined,
  }]));
  return { refusals, designs, shared, contracts, report, compiled, blocked, sources };
}

void test('d2_76: the recorded r3 answers pass B without repair; a page refused on purpose leaves the other four whole', async () => {
  const recorded = { atendimento: 'atendimento-2', cardapio: 'cardapio-1', fechamento: 'fechamento-1', inicio: 'inicio-1', mesas: 'mesas-2' } as const;
  const answers: Record<string, unknown[]> = {};
  for (const [pageId, name] of Object.entries(recorded)) answers[pageId] = [recordedAnswer(`bff55-r3/${name}.json`)];
  // atendimento-2 was refused in r3 for "MesaCode" (case of a name): it now passes as it is. cardapio is refused on purpose.
  const cardapio = structuredClone(d2ToolPayload(answers.cardapio[0], 'submitD2Bff', 'D2_BFF')) as RawDesign;
  cardapio.bindings.organisms = [];
  answers.cardapio = [cardapio];
  const run = await runDiningStage(answers);
  assert.deepEqual([...run.refusals.keys()], ['cardapio']);
  assert.match(run.refusals.get('cardapio') ?? '', /^D2_BFF_BINDING_ORGANISM/u);
  assert.deepEqual(run.shared, { wrote: ['atendimento', 'fechamento', 'inicio', 'mesas'], reused: [], skipped: ['cardapio'], refused: [] });
  assert.deepEqual({ ...run.contracts }, { wrote: ['atendimento', 'fechamento', 'inicio', 'mesas'], reused: [], skipped: ['cardapio'], refused: [] });
  // finalize80 compiles what was generated and fails the pipeline once, listing the refused page.
  assert.equal(run.report.status, 'blocked');
  assert.deepEqual(run.report.pending, ['cardapio: bff55: D2_BFF_BINDING_ORGANISM']);
  assert.equal(run.blocked, 'cardapio: bff55: D2_BFF_BINDING_ORGANISM');
  assert.deepEqual(run.compiled.filter(item => item.endsWith(':shared')).sort(), ['atendimento:shared', 'fechamento:shared', 'inicio:shared', 'mesas:shared']);
  assert.deepEqual(run.compiled.filter(item => item.endsWith(':contract')).sort(), ['atendimento:contract', 'fechamento:contract', 'inicio:contract', 'mesas:contract']);
  assert.equal(run.compiled.filter(item => item.endsWith('Page')).length, 10);
});

void test('d2_77: offline replay of r4 — the whole stage with the recorded answers in place of the LLM', async (t) => {
  const pack = readPack('dining');
  const answers: Record<string, unknown[]> = {};
  for (const name of pack.list('recorded/bff55-r4')) {
    const [pageId, attempt] = name.replace(/\.json$/u, '').split('-');
    (answers[pageId] = answers[pageId] ?? [])[Number(attempt) - 1] = recordedAnswer(`bff55-r4/${name}`);
  }
  const run = await runDiningStage(answers);
  t.diagnostic(`refused: ${[...run.refusals].map(([pageId, diagnostic]) => `${pageId}: ${diagnostic.slice(0, 400)}`).join(' || ')}`);
  t.diagnostic(`shared: ${JSON.stringify(run.shared)} contracts: ${JSON.stringify(run.contracts)} pending: ${JSON.stringify(run.report.pending)}`);
  // atendimento is refused by coverage, naming the fields; the other four reach the contract and compile.
  assert.deepEqual([...run.refusals.keys()], ['atendimento']);
  assert.match(run.refusals.get('atendimento') ?? '', /^D2_BFF_REPAIR_LIMIT: D2_BFF_COVERAGE: organisms\.\w+\.reads\.[A-Z]\w*\.[\w.]+: organism \w+ reads /u);
  assert.deepEqual(run.contracts.wrote, ['cardapio', 'fechamento', 'inicio', 'mesas']);
  assert.deepEqual(run.report.pending, [`atendimento: bff55: D2_BFF_COVERAGE`]);
  assert.equal(run.report.compilation.filter(item => item.status !== 'passed').length, 0);
  assert.equal(run.compiled.filter(item => item.endsWith(':contract')).length, 4);
});

void test('d2_76: case of names and ids, identical duplicates and the reserved type name are normalized, never refused', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const answer = atendimentoAnswer();
  // A type declared as 'item do cardapio' is the type its references name in PascalCase.
  answer.types.find(item => item.name === 'ItemDoCardapio')!.name = 'item do cardapio';
  answer.types.find(item => item.name === 'ComandaComItens')!.name = 'AtendimentoContracts';
  for (const endpoint of answer.endpoints) for (const leaf of endpoint.output) if (leaf.type === 'ComandaComItens') leaf.type = 'AtendimentoContracts';
  const search = answer.endpoints.find(item => item.id === 'buscarItemCardapio')!;
  search.id = 'BuscarItemCardapio';
  answer.endpoints.push(structuredClone(search));
  search.output[0].name = 'Itens';
  answer.types[0].fields.push(structuredClone(answer.types[0].fields[0]));
  const design = d2BffApproved(bff, answer);
  assert.ok(design.types.some(item => item.name === 'ItemDoCardapio'));
  assert.ok(design.types.some(item => item.name === 'AtendimentoContractsShape'));
  assert.equal(design.endpoints.filter(item => item.id === 'buscarItemCardapio').length, 1);
  assert.equal(design.bindings.organisms.find(row => row.organism === 'formularioLancamento')?.reads, 'buscarItemCardapio.itens');
  // What the strict schema guarantees is an internal assertion, without a repair cycle; content the code cannot derive is refused.
  assert.match(refusalOf(() => buildD2BffDesign({ types: 'x', endpoints: [] })), /D2_BFF_ASSERT: design: types and endpoints are lists/u);
  const different = atendimentoAnswer();
  different.types.push({ ...structuredClone(different.types[0]), fields: different.types[0].fields.slice(0, 2) });
  assert.match(refusalOf(() => buildD2BffDesign(different)), /D2_BFF_FORMAT: types\.MesaDoSalao: declared twice with different fields/u);
});

void test('d2_77: the approved design is reread as written: normalizing twice changes nothing, write then read is identical, a changed file names the cause', async () => {
  const bff = (await dining()).out.bff.atendimento;
  const once = normalizeD2BffDesign(buildD2BffDesign(atendimentoAnswer()), bff.entities, 'AtendimentoContracts');
  assert.deepEqual(normalizeD2BffDesign(once, bff.entities, 'AtendimentoContracts'), once);
  const files = new Map<string, unknown>();
  const writer = { writeJson: async (info: Ns5FileInfo, value: unknown) => { files.set(displayPath(info), JSON.parse(JSON.stringify(value))); return displayPath(info); } };
  await approveD2BffUnit(bff, atendimentoAnswer(), 0, 0, writer);
  const port = { readReceipt: async () => files.get(displayPath(bffReceiptInfo(bff.identity, 'atendimento'))) as never, readDesign: async (info: Ns5FileInfo) => files.get(displayPath(info)) ?? null };
  const read = await readApprovedD2Bff(bff.identity, 'atendimento', port);
  assert.deepEqual(read, d2BffApproved(bff, atendimentoAnswer()));
  // The saved design has selections as { query } / { list }: it is not the tool answer and is never parsed again.
  assert.ok(read!.bindings.selections.some(row => 'query' in row.via));
  const designPath = displayPath(bffDesignInfo(bff.identity, 'atendimento'));
  files.set(designPath, { ...(files.get(designPath) as object), types: [] });
  await assert.rejects(() => readApprovedD2Bff(bff.identity, 'atendimento', port), /D2_BFF_APPROVED_CHANGED: l2\/comandaRestaurante\/pipeline\/agentDefsL2\/bff\/atendimento\.json hashes to sha256:/u);
  files.delete(designPath);
  await assert.rejects(() => readApprovedD2Bff(bff.identity, 'atendimento', port), /D2_BFF_APPROVED_MISSING/u);
  assert.equal(await readApprovedD2Bff(bff.identity, 'atendimento', { ...port, readReceipt: async () => null }), null);
});

void test('d2_77: the prompt of A carries the coverage the page owes, with the derived fields marked', async () => {
  const prompt = JSON.parse(buildD2BffPrompt(await diningBffContext('atendimento')).humanPrompt) as { coverage: Array<{ path: string; derived: boolean; organisms: string[] }> };
  assert.deepEqual(prompt.coverage.find(row => row.path === 'ItemComanda.details.valorTotal'), { path: 'ItemComanda.details.valorTotal', derived: true, organisms: ['detalheComanda'] });
  assert.equal(prompt.coverage.find(row => row.path === 'Comanda.details.subtotal')?.derived, true);
  assert.equal(prompt.coverage.find(row => row.path === 'ItemComanda.details.quantidade')?.derived, false);
  assert.ok(prompt.coverage.length >= 15);
});

void test('d2_78: every endpoint has the destination A declared, transcribed by code; select wins over filter; no filter without reader', async () => {
  const stock = emptyOut();
  await replay('stock', stock);
  const shared = stock.sharedDefs.produtos;
  // search replaces the list, load more appends to it, saving upserts it and replaces the detail.
  assert.deepEqual(shared.functions.buscarProdutos, { calls: 'buscarProdutos', description: 'Buscar produtos pelo nome digitado.', sets: 'produtos' });
  // d2_79: produtos is a paged list (its hasMore sibling folds into the one form), so load more appends to its items.
  assert.deepEqual(shared.functions.carregarMaisProdutos, { calls: 'carregarMaisProdutos', description: 'Trazer a página seguinte da lista de produtos. (produtos.items: append)', updates: ['produtos'] });
  assert.deepEqual(shared.functions.cadastrarProduto, { calls: 'cadastrarProduto', description: 'Cadastrar um produto para acompanhar o estoque. (produtos.items: upsert)', sets: 'produto', updates: ['produtos'] });
  for (const fn of Object.values(shared.functions)) if (fn.calls) assert.ok(fn.sets || fn.updates?.length, JSON.stringify(fn));
  // The selected record keeps select: even with a filter of the same page; filters come only from queries an organism reads.
  assert.equal(shared.entry.params.produtoId.effect, 'select:detalheProduto');
  assert.deepEqual(Object.entries(shared.entry.params).filter(([, param]) => param.effect.startsWith('filter:')).map(([name, param]) => `${name}=${param.effect}`), ['name=filter:saldosResumo', 'page=filter:saldosResumo']);

  // A command without a declared destination is refused in B, with the path.
  const answer = readPack('stock').json<RawDesign & { bindings: { updates: Array<{ endpoint: string }> } }>('answers/bff55/produtos.json');
  answer.bindings.updates = answer.bindings.updates.filter(row => row.endpoint !== 'cadastrarProduto');
  const bff = stock.bff.produtos;
  assert.match(refusalOf(() => d2BffApproved(bff, answer)), /D2_BFF_DESTINATION: endpoints\.cadastrarProduto: command cadastrarProduto has no destination/u);
  // An update must land in a state an organism reads.
  const outside = readPack('stock').json<RawDesign & { bindings: { updates: Array<{ endpoint: string; state: string; mode: string }> } }>('answers/bff55/produtos.json');
  outside.bindings.updates.push({ endpoint: 'buscarProdutos', state: 'buscarProdutos.produtos', mode: 'replace' });
  assert.match(refusalOf(() => d2BffApproved(bff, outside)), /D2_BFF_BINDING_UPDATE: bindings\.updates\.4\.state: buscarProdutos\.produtos is not a source in bindings\.organisms/u);
  // A query nobody reads gives no filter: an onLoad count with a status input, bound to no organism.
  const silent = readPack('stock').json<RawDesign>('answers/bff55/produtos.json');
  silent.endpoints.push({ id: 'contarProdutos', kind: 'qry', when: 'onLoad', writes: '', rules: [],
    input: [{ name: 'status', type: 'string', origin: { kind: 'field', paths: ['Produto.details.identification.status'] } }],
    output: [{ name: 'total', type: 'number', origin: { kind: 'aggregate', paths: ['Produto.id'] } }],
    jsdoc: { purpose: 'Contar produtos.', input: 'status.', processing: 'Conta os produtos na situação.', output: 'total.' } });
  const design = d2BffApproved(bff, silent);
  const page = sharedPageOf(bff, design, { produtos: { page11Text: bff.page11Text, drafts: { desktop: JSON.parse(bff.draftText.desktop), mobile: JSON.parse(bff.draftText.mobile) } } });
  assert.equal(parseD2SharedV2(d2SharedSourceFor(page)).definition.entry.params.status, undefined);
});

void test('d2_78: offline replay of r5 — five pages reach the contract without meta, compile, and every function that calls has a destination', async (t) => {
  const pack = readPack('dining');
  const answers: Record<string, unknown[]> = {};
  for (const name of pack.list('recorded/bff55-r5')) answers[name.split('-')[0]] = [recordedAnswer(`bff55-r5/${name}`)];
  const run = await runDiningStage(answers);
  t.diagnostic(`refused: ${[...run.refusals].map(([pageId, diagnostic]) => `${pageId}: ${diagnostic.slice(0, 300)}`).join(' || ') || 'none'}; contracts: ${JSON.stringify(run.contracts)}; pending: ${JSON.stringify(run.report.pending)}`);
  assert.deepEqual([...run.refusals.keys()], []);
  assert.deepEqual(run.contracts.wrote, ['atendimento', 'cardapio', 'fechamento', 'inicio', 'mesas']);
  assert.deepEqual(run.report.pending, []);
  assert.equal(run.report.status, 'complete');
  assert.equal(run.report.compilation.filter(item => item.status !== 'passed').length, 0);
  for (const [pageId, source] of Object.entries(run.sources)) {
    if (source.contract) assert.doesNotMatch(source.contract, /\bmeta:/u, pageId);
    const shared = parseD2SharedV2(source.shared).definition;
    for (const [id, fn] of Object.entries(shared.functions)) if (fn.calls) assert.ok(fn.sets || fn.updates?.length, `${pageId}.${id}`);
  }
});

const deepFieldLeaves = (design: D2BffDesign): Array<{ type: string; name: string; path: string }> => design.types.flatMap(type => type.fields
  .filter(leaf => leaf.origin?.kind === 'field' && leaf.origin.paths[0].split('.').length > 2)
  .map(leaf => ({ type: type.name, name: leaf.name, path: leaf.origin!.paths[0] })));

void test('d2_79: field leaves keep their ontology path (recorded r6); every paging variant of r5 becomes the one form', async (t) => {
  const pack = readPack('dining');
  // r6: the round the L1 measured (T0); its five accepted designs, through the whole stage.
  const r6: Record<string, unknown[]> = {};
  for (const name of pack.list('recorded/bff55-r6')) {
    const [pageId, attempt] = name.replace(/\.json$/u, '').split('-');
    (r6[pageId] = r6[pageId] ?? [])[Number(attempt) - 1] = recordedAnswer(`bff55-r6/${name}`);
  }
  const six = await runDiningStage(r6);
  assert.deepEqual([...six.refusals.keys()], []);
  const deep = Object.values(six.designs).flatMap(deepFieldLeaves);
  t.diagnostic(`r6 field leaves under details: ${deep.map(row => `${row.type}.${row.name} <- ${row.path}`).join('; ')}`);
  assert.ok(deep.length >= 14);
  for (const row of deep) {
    const [entity, ...rest] = row.path.split('.');
    assert.ok(row.name === rest.join('.') || row.name === `${entity[0].toLowerCase()}${entity.slice(1)}.${rest.join('.')}`, `${row.type}.${row.name} <- ${row.path}`);
  }
  for (const [pageId, design] of Object.entries(six.designs)) if (deepFieldLeaves(design).length) assert.match(six.sources[pageId].contract ?? '', /details: \{\n/u, pageId);

  // r5: { items, total, page, pageSize }, totalItems, the <x>Page inputs and the cursor { itens, hasMore }.
  const r5: Record<string, unknown[]> = {};
  for (const name of pack.list('recorded/bff55-r5')) r5[name.split('-')[0]] = [recordedAnswer(`bff55-r5/${name}`)];
  const five = await runDiningStage(r5);
  assert.deepEqual([...five.refusals.keys()], []);
  for (const [pageId, source] of Object.entries(five.sources)) {
    const contract = source.contract ?? '';
    assert.doesNotMatch(contract, /\b(total|totalItems|totalItens|cursor)\??: /u, pageId);
    assert.doesNotMatch(contract, /\b\w+Page\??: number/u, pageId);
    for (const found of contract.matchAll(/\{ items: [A-Z]\w*\[\]; ([^}]*) \}/gu)) assert.equal(found[1], 'page: number; pageSize: number; hasMore: boolean', pageId);
  }
  assert.match(five.sources.atendimento.contract ?? '', /\{ items: MesaDisponivel\[\]; page: number; pageSize: number; hasMore: boolean \}/u);
  assert.match(five.sources.fechamento.contract ?? '', /openComandas: \{ items: OpenComanda\[\]; page: number; pageSize: number; hasMore: boolean \}/u);
  assert.match(five.sources.cardapio.contract ?? '', /pagina: \{ items: ItemCardapioResumo\[\]; page: number; pageSize: number; hasMore: boolean \}/u);
  // Every query that pages takes page and pageSize; the envelope types are gone.
  for (const design of Object.values(five.designs)) {
    for (const type of design.types) assert.ok(!type.fields.some(leaf => /^(total|totalItems)$/u.test(leaf.name)), type.name);
    for (const endpoint of design.endpoints) {
      const paged = JSON.stringify(endpoint.output).includes('"paginated":true') || endpoint.output.some(leaf => design.types.some(type => leaf.type.startsWith(type.name) && type.fields.some(field => field.paginated)));
      if (paged) assert.deepEqual(endpoint.input.filter(leaf => /^page(Size)?$/u.test(leaf.name)).map(leaf => leaf.name), ['page', 'pageSize'], endpoint.id);
    }
  }
  // "Load more" appends to the items of the paged list.
  assert.match(parseD2SharedV2(five.sources.cardapio.shared).definition.functions.carregarMaisItensCardapio.description, /\.items: append\)$/u);
});

/** bff55 context of one clinicR2 page, from the accepted pages50 answer of the p4_32 run. */
async function clinicR2Bff(pageId: string): Promise<D2BffContext> {
  const pack = readPack('clinicR2');
  const needs = pack.json('pool/needs.json');
  const artifacts = await artifactsOf(pack, needs);
  const snapshot = await buildD2InputSnapshot({ project: 102047, module: pack.moduleName }, artifacts);
  const built = pageContextOf(pack, snapshot, artifacts, pageId)!;
  const writes = new Map<string, unknown>();
  await approveD2PagesUnit(built.context, built.answer, 0, 0, {
    writeSource: async (info, source) => { writes.set(info.shortName + info.folder, source); },
    writeJson: async (info, value) => { writes.set(info.shortName + info.folder, value); },
  });
  const at = (folder: string, shortName: string) => writes.get(shortName + `${pack.moduleName}/${folder}`);
  return bffContextOf(pack, artifacts, needs, pageId, {
    page11Text: { desktop: at('web/desktop/page11', pageId) as string, mobile: at('web/mobile/page11', pageId) as string },
    drafts: { desktop: at('pipeline/agentDefsL2/page11Needs', `${pageId}Desktop`), mobile: at('pipeline/agentDefsL2/page11Needs', `${pageId}Mobile`) },
  });
}

const clinicR2Answer = (name: string): RawDesign => d2ToolPayload(readPack('clinicR2').json<{ raw: unknown }>(`recorded/bff55/${name}`).raw, 'submitD2Bff', 'D2_BFF') as RawDesign;

void test('d2_82: agenda_diaria approves; pacientes-1 refuses format and bindings together; pacientes-2 refuses only the binding update', async () => {
  const agenda = await clinicR2Bff('agenda_diaria');
  assert.doesNotThrow(() => d2BffApproved(agenda, clinicR2Answer('agenda_diaria-1.json')));
  assert.doesNotThrow(() => d2BffApproved(agenda, clinicR2Answer('agenda_diaria-2.json')));

  const pacientes = await clinicR2Bff('pacientes');
  const first = refusalOf(() => d2BffApproved(pacientes, clinicR2Answer('pacientes-1.json')));
  assert.match(first, /D2_BFF_FORMAT: types\.PatientContacts\.fields/u);
  assert.match(first, /D2_BFF_BINDING_UPDATE/u);

  const second = refusalOf(() => d2BffApproved(pacientes, clinicR2Answer('pacientes-2.json')));
  assert.match(second, /D2_BFF_BINDING_UPDATE/u);
  assert.doesNotMatch(second, /D2_BFF_BINDING_ORGANISM: bindings\.organisms\.patientForm/u);
});
