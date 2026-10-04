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
import { approveD2SharedUnit, buildD2SharedPrompt, d2SharedApproved, d2SharedContextFrom, sharedInfo, D2_SHARED_PROMPT_LIMIT_CHARS, type D2SharedContext, type D2SharedLlmResponse, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { sharedSchemaFor } from '/_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.js';
import { skill as sharedSkill } from '/_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.js';
import { bffSchemaFor, buildD2BffPrompt, d2BffApproved, d2BffContextFrom, D2_BFF_PROMPT_LIMIT_CHARS, type D2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import type { D2BffDesign, D2Menu, D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { d2ToolPayload } from '/_102020_/l2/agentDefsL2/helpers/d2PageSettle.js';
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
const SHARED_PROMPT = readFileSync(path.join(HERE, '../steps/shared60/prompt.md'), 'utf8');

interface ReplayPage { page11Text: { desktop: string; mobile: string }; drafts: { desktop: unknown; mobile: unknown } }
interface ReplayOut { bff: Record<string, D2BffContext>; designs: Record<string, D2BffDesign>; shared: Record<string, D2SharedContext>; contracts: Record<string, string> }

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

function sharedContextOf(bff: D2BffContext, artifacts: D2InputArtifacts, design: D2BffDesign): D2SharedContext {
  return {
    ...d2SharedContextFrom({
      pageId: bff.pageId, page11Text: bff.page11Text, drafts: { desktop: JSON.parse(bff.draftText.desktop), mobile: JSON.parse(bff.draftText.mobile) },
      need: bff.need, menu: artifacts.menu as D2Menu, module: artifacts.module, grants: bff.grants, design,
    }),
    identity: bff.identity, inputHash: bff.inputHash, skill: sharedSkill, prompt: SHARED_PROMPT, approved: null,
  };
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

  // bff55 (A answer + B), shared60 (C answer + D) and contracts70 (E) for the pages with a recorded design.
  for (const name of pack.list('answers/bff55')) {
    const pageId = name.replace(/\.json$/u, '');
    const page = page11[pageId];
    if (!page) { outcomes.push({ stage: 'bff55', pageId, result: 'refused', codes: ['D2_BFF_PAGE11_MISSING'] }); continue; }
    const bff = bffContextOf(pack, artifacts, needs, pageId, page);
    let design: D2BffDesign;
    try {
      design = d2BffApproved(bff, pack.json(`answers/bff55/${name}`));
      outcomes.push({ stage: 'bff55', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'bff55', pageId, result: 'refused', codes: codesOf(error) }); continue; }
    if (out) { out.bff[pageId] = bff; out.designs[pageId] = design; }
    const shared = sharedContextOf(bff, artifacts, design);
    if (out) out.shared[pageId] = shared;
    const writes = new Map<string, unknown>();
    let receipt: D2SharedReceipt;
    try {
      receipt = await approveD2SharedUnit(shared, pack.json<D2SharedLlmResponse>(`answers/shared60/${name}`), 0, 0, {
        writeSource: async (_info, source) => { writes.set('source', source); }, writeJson: async () => undefined,
      });
      outcomes.push({ stage: 'shared60', pageId, result: 'ok', codes: [] });
    } catch (error) { outcomes.push({ stage: 'shared60', pageId, result: 'refused', codes: codesOf(error) }); continue; }
    try {
      const contract = await contractSourceFor({
        identity: bff.identity, pageId, userLanguage: bff.userLanguage, design, access: shared.access,
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
  // expense inicio (hub: no read, no write, one navigation): no endpoint, a shared with only its navigation, an empty contract.
  for (const stage of ['bff55', 'shared60', 'contracts70']) assert.deepEqual(at(first.expense, stage, 'inicio'), { stage, pageId: 'inicio', result: 'ok', codes: [] });
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
  const out: ReplayOut = { bff: {}, designs: {}, shared: {}, contracts: {} };
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

void test('d2_74: the schema says what the parser requires; a query write the host filled in is dropped, not refused', async () => {
  // The answer p4_29 recorded for mesas (refused then with "a query writes nothing"): every property filled by the host.
  const recorded = readPack('dining').json<{ raw: unknown }>('recorded/bff55/mesas-2.json').raw;
  const mesas = await diningBffContext('mesas');
  const design = d2BffApproved(mesas, d2ToolPayload(recorded, 'submitD2Bff', 'D2_BFF'));
  assert.ok(design.endpoints.filter(item => item.kind === 'qry').length >= 2);
  assert.ok(design.endpoints.every(item => item.kind === 'cmd' ? item.writes : item.writes === undefined));

  // A command without a write of the plan is still refused.
  const raw = structuredClone(d2ToolPayload(recorded, 'submitD2Bff', 'D2_BFF')) as { endpoints: Array<{ kind: string; writes?: string }> };
  raw.endpoints.find(item => item.kind === 'cmd')!.writes = '';
  assert.throws(() => d2BffApproved(mesas, raw), /D2_BFF_FORMAT: endpoints\.\w+\.writes: a command names its write/u);

  // origin is required on every leaf; on a leaf that names a type it is ignored, whatever its shape.
  const schema = bffSchemaFor(mesas) as { properties: { endpoints: { items: { properties: { writes: { enum: string[] }; output: { items: { required: string[] } } } } } } };
  assert.deepEqual(schema.properties.endpoints.items.properties.output.items.required, ['name', 'type', 'origin']);
  assert.equal(schema.properties.endpoints.items.properties.writes.enum[0], '');
  const odd = structuredClone(d2ToolPayload(recorded, 'submitD2Bff', 'D2_BFF')) as { endpoints: Array<{ output: Array<{ type: string; origin?: unknown }> }> };
  for (const endpoint of odd.endpoints) for (const leaf of endpoint.output) if (/^[A-Z]/u.test(leaf.type)) leaf.origin = { kind: 'field', paths: [] };
  assert.doesNotThrow(() => d2BffApproved(mesas, odd));

  // A page without writes gets the neutral enum [''], never a free string.
  const inicio = await diningBffContext('inicio');
  const inicioSchema = bffSchemaFor(inicio) as typeof schema;
  assert.deepEqual(inicioSchema.properties.endpoints.items.properties.writes.enum, ['']);
});

void test('d2_73: the hand-written A and C of atendimento and inicio pass B and D; the contract carries the JSDoc and compiles', async () => {
  const { outcomes, out } = await dining();
  assert.ok(outcomes.every(item => item.result === 'ok'), JSON.stringify(outcomes.filter(item => item.result !== 'ok')));
  assert.deepEqual(outcomes.filter(item => item.stage === 'contracts70').map(item => item.pageId), ['atendimento', 'inicio']);

  const atendimento = out.contracts.atendimento;
  assert.match(atendimento, /export interface ComandaComItens \{\n[\s\S]*itens: ItemDaComanda\[\];/u);
  assert.match(atendimento, /'comandaRestaurante\.atendimento\.abrirComanda': \{\n {4}kind: 'cmd';\n {4}writes: 'Comanda\.create';\n {4}input: \{ mesaId: string \};/u);
  assert.match(atendimento, /input: \{ itemComandaId: string; version: number \};/u);
  assert.match(atendimento, /input: \{ comandaId: string; itemCardapioId: string; quantidade: number; observacao\?: string \};/u);
  // The JSDoc of A, with the labels of the module language, sits above every route.
  for (const endpointId of ['load', 'carregarComanda', 'buscarItemCardapio', 'abrirComanda', 'lancarItem', 'cancelarItem']) {
    assert.match(atendimento, new RegExp(`/\\*\\*\\n {3}\\* Finalidade: [^\\n]+\\n {3}\\* Entrada: [^\\n]+\\n {3}\\* Processamento: [^\\n]+\\n {3}\\* Saída: [^\\n]+\\n {3}\\*/\\n {2}'comandaRestaurante\\.atendimento\\.${endpointId}'`, 'u'));
  }
  assert.match(atendimento, /rules: \['itensSomenteEmComandaAberta', 'precoUnitarioRegistradoNoLancamento', 'valorTotalItemComandaCalculado', 'subtotalComandaCalculado'\]/u);
  // Derived fields and aggregates are readonly.
  assert.match(atendimento, /readonly subtotal: string;/u);
  assert.match(out.contracts.inicio, /readonly totalEmAberto: string;/u);

  // meta: an entity only for a key whose type carries one entity's fields; composite and aggregated keys are left out.
  const parsed = parseD2ContractV2(atendimento);
  const metaOf = (contract: string, id: string) => parseD2ContractV2(contract).routes.find(item => item.route.endsWith(`.${id}`))!.meta;
  assert.deepEqual(metaOf(atendimento, 'load').output, { mesas: { entity: 'Mesa', many: true } });
  assert.deepEqual(metaOf(atendimento, 'buscarItemCardapio').output, { itens: { entity: 'ItemCardapio', many: true } });
  assert.deepEqual(metaOf(atendimento, 'lancarItem').output, {});
  assert.deepEqual(metaOf(out.contracts.inicio, 'load').output, {});
  assert.equal(parsed.routes.length, 6);
  assert.equal(parsed.routes.find(item => item.route.endsWith('.load'))?.writes, undefined);

  // The origins stay in the pipeline: none reaches the contract.
  for (const contract of Object.values(out.contracts)) assert.doesNotMatch(contract, /origin|aggregate/u);
  for (const [pageId, contract] of Object.entries(out.contracts)) assert.deepEqual(compileErrors(contract), [], pageId);
  // The checker sees a broken contract (positive control).
  assert.ok(compileErrors(out.contracts.atendimento.replace('itens: ItemDaComanda[];', 'itens: ItemSemTipo[];')).some(item => item.includes('ItemSemTipo')));
});

void test('d2_73: B refuses by fact, naming the exact path', async () => {
  const { out } = await dining();
  const bff = out.bff.atendimento;
  const answer = () => readPack('dining').json<{ types: Array<{ name: string; fields: Array<Record<string, unknown>> }>; endpoints: Array<Record<string, unknown>> }>('answers/bff55/atendimento.json');

  // B.1: a field an organism reads that no output carries.
  const noObservation = answer();
  const line = noObservation.types.find(item => item.name === 'ItemDaComanda')!;
  line.fields = line.fields.filter(field => field.name !== 'observacao');
  assert.throws(() => d2BffApproved(bff, noObservation), /D2_BFF_COVERAGE: organisms\.detalheComanda\.reads\.ItemComanda\.details\.observacao: organism detalheComanda reads ItemComanda\.details\.observacao/u);

  // B.2: the transition asks for a payload the command does not carry.
  const entities = structuredClone(bff.entities) as unknown as Record<string, { transitions: Array<{ transitionId: string; payload: string[] }> }>;
  entities.ItemComanda.transitions.find(item => item.transitionId === 'cancelarItemComanda')!.payload = ['details.observacao'];
  assert.throws(() => d2BffApproved({ ...bff, entities: entities as unknown as D2BffContext['entities'] }, answer()),
    /D2_BFF_COMMAND_INPUT: endpoints\.cancelarItem\.input: command cancelarItem \(ItemComanda\.cancelarItemComanda\) asks for ItemComanda\.details\.observacao/u);

  // B.3: an origin no actor of the page sees (the waiter does not see the payment method).
  const payment = answer();
  payment.types.find(item => item.name === 'ComandaAberta')!.fields.push({ name: 'formaPagamento', type: "'cash' | 'pix'", origin: { kind: 'field', paths: ['Comanda.details.paymentMethod'] } });
  assert.throws(() => d2BffApproved(bff, payment), /D2_BFF_ORIGIN_GRANT: types\.ComandaAberta\.formaPagamento: origin Comanda\.details\.paymentMethod is not visible to any actor of the page \(garcom\)/u);

  // B.3: an enum literal outside L4, an unknown rule, an unknown field.
  const facts = answer();
  facts.types.find(item => item.name === 'ComandaAberta')!.fields.find(field => field.name === 'status')!.type = "'aberta'";
  facts.endpoints.find(item => item.id === 'load')!.rules = ['regraQueNaoExiste'];
  facts.types.find(item => item.name === 'MesaDoSalao')!.fields.push({ name: 'lugares', type: 'number', origin: { kind: 'field', paths: ['Mesa.details.lugares'] } });
  const codes = (() => { try { d2BffApproved(bff, facts); return ''; } catch (error) { return String(error); } })();
  assert.match(codes, /D2_BFF_ENUM: types\.ComandaAberta\.status: 'aberta' is not a value of Comanda\.status/u);
  assert.match(codes, /D2_BFF_RULE_UNKNOWN: endpoints\.load\.rules: rule regraQueNaoExiste/u);
  assert.match(codes, /D2_BFF_ORIGIN_UNKNOWN: types\.MesaDoSalao\.lugares: origin Mesa\.details\.lugares/u);

  // B.2 and B.4: a submit without its command, and a command that writes outside the plan.
  const commands = answer();
  commands.endpoints = commands.endpoints.filter(item => item.id !== 'abrirComanda');
  commands.endpoints.find(item => item.id === 'cancelarItem')!.writes = 'Comanda.fecharComanda';
  const plan = (() => { try { d2BffApproved(bff, commands); return ''; } catch (error) { return String(error); } })();
  assert.match(plan, /D2_BFF_SUBMIT_COMMAND: submits\.abrirComanda: submit abrirComanda has 0 commands/u);
  assert.match(plan, /D2_BFF_SUBMIT_WRITE: endpoints\.cancelarItem\.writes/u);
  assert.match(plan, /D2_BFF_WRITE_OUTSIDE: endpoints\.cancelarItem\.writes: Comanda\.fecharComanda is not a write of this page/u);

  // The tool format is not a design gate, but a leaf without origin cannot be checked.
  const noOrigin = answer();
  delete noOrigin.types[0].fields[0].origin;
  assert.throws(() => d2BffApproved(bff, noOrigin), /D2_BFF_FORMAT: types\.ComandaComItens\.fields\.id\.origin: a value leaf names its origin/u);
});

void test('d2_73: B does not judge the design: another number of endpoints and other names pass', async () => {
  const { out } = await dining();
  const bff = out.bff.atendimento;
  const design = structuredClone(out.designs.atendimento);
  // One query fewer: the selected record comes in the opening call, under other names.
  design.endpoints = design.endpoints.filter(item => item.id !== 'carregarComanda').map(item => item.id === 'load' ? { ...item, id: 'abrirTela', output: [...item.output, { name: 'comandaEmFoco', type: 'ComandaComItens' }] } : item);
  assert.doesNotThrow(() => d2BffApproved(bff, design));
});

void test('d2_73: D refuses an unfed organism, a call to a missing endpoint and a submit without function', async () => {
  const { out, pack } = await dining();
  const shared = out.shared.atendimento;
  const answer = () => pack.json<D2SharedLlmResponse>('answers/shared60/atendimento.json');
  assert.doesNotThrow(() => d2SharedApproved(shared, answer()));

  const unfed = answer();
  unfed.states = unfed.states.filter(item => item.id !== 'itensEncontrados');
  unfed.functions = unfed.functions.map(item => item.id === 'buscarItem' ? { ...item, sets: undefined } : item);
  assert.throws(() => d2SharedApproved(shared, unfed), /D2_SHARED_V2_ORGANISM_UNFED: Organism (lookupAtendimento|formularioLancamento) reads ItemCardapio\.details\.precoVigente, and no state holds it/u);

  const broken = answer();
  broken.functions = broken.functions.filter(item => item.id !== 'cancelarItem').map(item => item.id === 'buscarItem' ? { ...item, calls: 'buscarPrato' } : item);
  broken.journeys = broken.journeys.map(item => ({ ...item, functions: item.functions.filter(fn => fn !== 'cancelarItem') }));
  broken.states.push({ id: 'emprestado', source: 'fechamento.comanda', description: 'state of another page' });
  const codes = (() => { try { d2SharedApproved(shared, broken); return ''; } catch (error) { return String(error); } })();
  assert.match(codes, /D2_SHARED_V2_FUNCTION_CALL: Function buscarItem calls buscarPrato, which is not an endpoint of the page/u);
  assert.match(codes, /D2_SHARED_V2_SUBMIT_FUNCTION: Submit cancelarItem has no function that calls its command cancelarItem/u);
  assert.match(codes, /D2_SHARED_V2_STATE_SOURCE: State emprestado source "fechamento\.comanda"/u);

  // requests, rules and access are copied from A, never chosen by C.
  const definition = d2SharedApproved(shared, answer());
  assert.deepEqual(Object.keys(definition.requests), out.designs.atendimento.endpoints.map(item => item.id));
  assert.deepEqual(definition.requests.lancarItem, { kind: 'cmd', trigger: 'lancarItem', writes: 'ItemComanda.create', returns: ['comanda'] });
  assert.deepEqual(definition.requests.buscarItemCardapio.trigger, 'buscarItemCardapio');
  assert.deepEqual(definition.rules.cancelarItem, ['itemComandaOperacaoSomenteComandaAberta', 'subtotalComandaCalculado']);
  assert.deepEqual(definition.access, { actors: ['garcom'], grants: ['garcomAtendimentoComandas'] });
  assert.equal(sharedInfo(shared.identity, 'atendimento').folder, 'comandaRestaurante/web/shared');
});

void test('d2_73: prompts of A and C stay inside the limit, carry the rule texts and the schemas pass the tool lint', async (t) => {
  const { out } = await dining();
  const pack = readPack('dining');
  const sizes: string[] = [];
  for (const name of pack.list('answers/pages50')) {
    const pageId = name.replace(/\.json$/u, '');
    const bff = await diningBffContext(pageId);
    const prompt = buildD2BffPrompt(bff);
    assert.ok(prompt.chars < D2_BFF_PROMPT_LIMIT_CHARS);
    assert.deepEqual(lintToolSchema(JSON.stringify(bffSchemaFor(bff))), null, pageId);
    const c = out.shared[pageId] ? buildD2SharedPrompt(out.shared[pageId]).chars : 0;
    if (out.shared[pageId]) {
      assert.ok(c < D2_SHARED_PROMPT_LIMIT_CHARS);
      assert.deepEqual(lintToolSchema(JSON.stringify(sharedSchemaFor(out.shared[pageId]))), null, pageId);
      assert.doesNotMatch(buildD2SharedPrompt(out.shared[pageId]).humanPrompt, /"origin"/u);
    }
    sizes.push(`${pageId}: A=${prompt.chars}${c ? ` C=${c}` : ''}`);
  }
  t.diagnostic(`prompt chars: ${sizes.join('; ')}`);
  // A rule no entity links (a calculation) still reaches the prompt of the page that shows the value.
  assert.match(buildD2BffPrompt(out.bff.atendimento).humanPrompt, /precoUnitarioRegistradoNoLancamento/u);
});
