/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/p2_32.test.ts" enhancement="_blank"/>

/**
 * p2_32: a decide step writes the transitions of its origin-state group that no act of the journey writes and that
 * the journey actor may fire. Fixtures under fixtures/p2_32 are renamed copies of four real modules.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { parseP2Grants, parseP2Processes } from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { parseP2L4Sources, type P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { buildP2NeedsFile } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { branchingTransitions } from '/_102020_/l2/agentPlannerL2/helpers/p2Transitions.js';
import type { PoolMenuFile, PoolNeedsPage } from '/_102035_/l2/solution/poolPlan.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'fixtures/p2_32');
const AT = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));

function defs(dir: string, rel: string): unknown {
  const parsed = parseNs4ClassicDefsSource<unknown>(readFileSync(path.join(ROOT, dir, rel), 'utf8'));
  if (!parsed) throw new Error(`${dir}/${rel}`);
  return parsed;
}
function json<T>(dir: string, rel: string): T { return JSON.parse(readFileSync(path.join(ROOT, dir, rel), 'utf8')) as T; }
function names(dir: string, sub: string): string[] {
  return readdirSync(path.join(ROOT, dir, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
}
function load(dir: string) {
  const access = defs(dir, 'access.defs.ts');
  const module = defs(dir, 'module.defs.ts') as { moduleName?: string; userLanguage?: string };
  const sources = parseP2L4Sources({
    moduleName: module.moduleName, userLanguage: module.userLanguage,
    journeyIndex: defs(dir, 'journeys/index.defs.ts'), journeys: names(dir, 'journeys').map(name => defs(dir, `journeys/${name}`)),
    access, ontologyIndex: defs(dir, 'ontology/index.defs.ts'), ontologyEntities: names(dir, 'ontology').map(name => defs(dir, `ontology/${name}`)),
  });
  const menu = json<PoolMenuFile>(dir, 'pool/menu.json');
  // Menus of these modules predate p2_30; the decide pages do not depend on meta.records.
  const withRecords: PoolMenuFile = { ...menu, meta: { ...menu.meta, records: menu.meta.records ?? {} } };
  return { sources, grants: parseP2Grants(access), processes: parseP2Processes(defs(dir, 'workflows.defs.ts')), menu: withRecords, before: json<{ pages: PoolNeedsPage[] }>(dir, 'pool/needs.json') };
}
const writesOf = (pages: readonly PoolNeedsPage[], pageId: string): string[] => {
  const page = pages.find(item => item.pageId === pageId);
  assert.ok(page, pageId);
  return [...new Set(page.writes.map(item => `${item.entity}.${item.operation}${item.transitionRef ? `:${item.transitionRef}` : ''}`))].sort();
};
const build = (fixture: ReturnType<typeof load>, sources: P2L4Sources = fixture.sources) =>
  buildP2NeedsFile({ menu: fixture.menu, sources, grants: fixture.grants, processes: fixture.processes, now: AT });

void test('p2_32: a decide step writes its group, only what the journey actor may fire', () => {
  // expense: the decision ends the journey; the branching group of the approver is written.
  const expense = load('expense');
  assert.deepEqual(writesOf(expense.before.pages, 'despesas_da_equipe'), []);
  const expenseWrites = writesOf(build(expense).pages, 'despesas_da_equipe');
  assert.deepEqual(expenseWrites, ['Despesa.transition:aprovarDespesa', 'Despesa.transition:rejeitarDespesa']);
  const decided = build(expense).pages.find(item => item.pageId === 'despesas_da_equipe')!;
  assert.ok(decided.writes.every(item => item.from.some(from => from.startsWith('journey:analisarDecidirDespesa/'))));

  // service: both siblings already have their own act on the page: nothing changes.
  const service = load('service');
  assert.deepEqual(writesOf(build(service).pages, 'mis_ordenes'), writesOf(service.before.pages, 'mis_ordenes'));

  // purchase: the decision is "approve or reject" and both are the manager's; the missing rejection is written.
  const purchase = load('purchase');
  assert.deepEqual(writesOf(purchase.before.pages, 'pedidos_de_compra_gerente'), ['PurchaseOrder.transition:decidePurchaseOrder']);
  assert.deepEqual(writesOf(build(purchase).pages, 'pedidos_de_compra_gerente'), ['PurchaseOrder.transition:decidePurchaseOrder', 'PurchaseOrder.transition:rejectPurchaseOrder']);

  // hiring: the sibling of moveToHired (rejectApplication) is fired by another actor in the lifecycle: not written.
  const hiring = load('hiring');
  assert.deepEqual(writesOf(build(hiring).pages, 'hiring_manager_applications'), writesOf(hiring.before.pages, 'hiring_manager_applications'));
  const reject = hiring.sources.entities.find(item => item.entityId === 'Application')!.transitions.find(item => item.transitionId === 'rejectApplication')!;
  assert.deepEqual(reject.by, ['recruiter']);
});

void test('p2_32: empty or ambiguous group and a transition without id are named issues', () => {
  const expense = load('expense');
  const withTransitions = (transform: (entity: P2L4Sources['entities'][number]) => P2L4Sources['entities'][number]): P2L4Sources => ({
    ...expense.sources,
    entities: expense.sources.entities.map(item => item.entityId === 'Despesa' ? transform(structuredClone(item)) : item),
  });
  assert.throws(() => build(expense, withTransitions(entity => ({ ...entity, transitions: [] }))), /P2_NEEDS_DECIDE_GROUP_EMPTY: journey analisarDecidirDespesa/u);
  assert.throws(() => build(expense, withTransitions(entity => ({ ...entity, transitions: [
    ...entity.transitions,
    { transitionId: 'arquivarDespesa', from: ['paid'], to: 'archived', by: [] },
    { transitionId: 'reabrirDespesa', from: ['paid'], to: 'awaitingApproval', by: [] },
  ] }))), /P2_NEEDS_DECIDE_GROUP_AMBIGUOUS/u);
  const blank: P2L4Sources = {
    ...expense.sources,
    journeys: expense.sources.journeys.map(journey => ({ ...journey, steps: journey.steps.map(step => step.kind === 'act' && step.transitionRef ? { ...step, transitionRef: '' } : step) })),
  };
  assert.throws(() => build(expense, blank), /P2_NEEDS_TRANSITION_WITHOUT_REF/u);
});

void test('p2_32: branchingTransitions keeps its contracts30 result after the move', () => {
  const expense = load('expense');
  assert.deepEqual(branchingTransitions('Despesa', expense.sources).map(item => item.transitionId), ['aprovarDespesa', 'rejeitarDespesa']);
  const hiring = load('hiring');
  assert.deepEqual(branchingTransitions('Application', hiring.sources).map(item => item.transitionId).sort(), ['moveToHired', 'moveToInterview', 'moveToOffer', 'rejectApplication']);
});

void test('l4_p4_108: a decide step on an external entity writes nothing and raises no issue; a lifecycle entity without a group still does', () => {
  const expense = load('expense');
  const asEntity = (kind: string, withTransitions: boolean): P2L4Sources => ({
    ...expense.sources,
    entities: expense.sources.entities.map(entity => entity.entityId === 'Despesa'
      ? { ...entity, kind, transitions: withTransitions ? entity.transitions : [] }
      : entity),
  });
  // external: no transitions, no throw, no write on Despesa from the decide step
  const external = build(expense, asEntity('external', false));
  const decided = external.pages.find(item => item.pageId === 'despesas_da_equipe');
  assert.ok(decided);
  assert.deepEqual(decided.writes.filter(item => item.entity === 'Despesa' && item.transitionRef), []);
  // the same entity as a table without a group keeps the error
  assert.throws(() => build(expense, asEntity('entity', false)), /P2_NEEDS_DECIDE_GROUP_EMPTY/);
  // and with its lifecycle it is the p2_32 behaviour
  assert.deepEqual(writesOf(build(expense, asEntity('entity', true)).pages, 'despesas_da_equipe'), ['Despesa.transition:aprovarDespesa', 'Despesa.transition:rejeitarDespesa']);
});

void test('d2_227: a decide whose next act of the entity has an effect and no transition validates only: no transition, no issue; the other forms keep their result', () => {
  const expense = load('expense');
  const journeyId = 'analisarDecidirDespesa';
  const decideIndex = expense.sources.journeys.find(item => item.journeyId === journeyId)!.steps.findIndex(step => step.kind === 'decide');
  const withNext = (act?: { effect: string; transitionRef?: string }): P2L4Sources => ({
    ...expense.sources,
    journeys: expense.sources.journeys.map(journey => journey.journeyId !== journeyId ? journey : {
      ...journey,
      steps: [
        ...journey.steps.slice(0, decideIndex + 1),
        ...(act ? [{ stepId: 'saveAfterDecide', kind: 'act', entity: 'Despesa', ...act }] : []),
        ...journey.steps.slice(decideIndex + 1).filter(step => !(step.kind === 'act' && step.entity === 'Despesa')),
      ],
    }),
  });
  const decideWrites = (sources: P2L4Sources) => build(expense, sources).pages.flatMap(page => page.writes).filter(write => write.from.some(from => from.startsWith(`journey:${journeyId}/`) && write.operation === 'transition'));
  // a) next act with an effect and no transition: nothing from the decide, no issue
  const validated = withNext({ effect: 'update' });
  assert.doesNotThrow(() => build(expense, validated));
  assert.deepEqual(writesOf(build(expense, validated).pages, 'despesas_da_equipe').filter(item => item.includes(':')), []);
  // b) next act that carries its transition: the group is its own (unchanged)
  const own = withNext({ effect: 'transition', transitionRef: 'aprovarDespesa' });
  assert.ok(writesOf(build(expense, own).pages, 'despesas_da_equipe').includes('Despesa.transition:aprovarDespesa'));
  // c) no next act of the entity: the branching group of the actor (unchanged, p2_32)
  assert.deepEqual(writesOf(build(expense, withNext()).pages, 'despesas_da_equipe'), ['Despesa.transition:aprovarDespesa', 'Despesa.transition:rejeitarDespesa']);
  assert.equal(decideWrites(validated).length, 0);
});

void test('d2_227: the telegram change of the access key (decide, then act update) no longer matches three groups', () => {
  const l4 = new URL('../../../../../mls-102047/l4/telegram/', import.meta.url);
  const read = (rel: string): unknown => { const parsed = parseNs4ClassicDefsSource<unknown>(readFileSync(new URL(rel, l4), 'utf8')); if (!parsed) throw new Error(rel); return parsed; };
  const list = (sub: string) => readdirSync(new URL(`${sub}/`, l4)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
  const access = read('access.defs.ts');
  const module = read('module.defs.ts') as { moduleName?: string; userLanguage?: string };
  const sources = parseP2L4Sources({
    moduleName: module.moduleName, userLanguage: module.userLanguage,
    journeyIndex: read('journeys/index.defs.ts'), journeys: list('journeys').map(name => read(`journeys/${name}`)),
    access, ontologyIndex: read('ontology/index.defs.ts'), ontologyEntities: list('ontology').map(name => read(`ontology/${name}`)),
  });
  const journey = sources.journeys.find(item => item.journeyId === 'changeBotAccessKey')!;
  assert.deepEqual(journey.steps.map(step => `${step.kind}:${step.effect ?? ''}:${step.transitionRef ?? ''}`), ['locate::', 'decide::', 'act:update:']);
  const menu = JSON.parse(readFileSync(new URL('pool/l2/web/menu.json', l4), 'utf8')) as PoolMenuFile;
  const withRecords: PoolMenuFile = { ...menu, meta: { ...menu.meta, records: menu.meta.records ?? {} } };
  assert.doesNotThrow(() => buildP2NeedsFile({ menu: withRecords, sources, grants: parseP2Grants(access), processes: parseP2Processes(read('workflows.defs.ts')), now: AT }));
});
