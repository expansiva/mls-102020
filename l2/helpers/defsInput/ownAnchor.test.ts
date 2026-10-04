/// <mls fileReference="_102020_/l2/helpers/defsInput/ownAnchor.test.ts" enhancement="_blank"/>

/**
 * d2_67: an own grant anchored outside its entityRefs is valid when every entityRef reaches the anchor through
 * ontology relationships; without a path it is a named error. Fixtures are frozen copies under agentPlannerL2.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts } from '/_102020_/l2/helpers/defsInput/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const NEEDS_FIXTURES = path.join(HERE, '../../agentPlannerL2/steps/needs30/fixtures');

function artifactsOf(root: string): D2InputArtifacts {
  const defs = (rel: string): unknown => parseNs4ClassicDefsSource<unknown>(readFileSync(path.join(root, rel), 'utf8'));
  const json = (rel: string): unknown => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  const names = (sub: string) => readdirSync(path.join(root, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
  return {
    sources: [], module: defs('module.defs.ts'), journeyIndex: defs('journeys/index.defs.ts'),
    journeys: Object.fromEntries(names('journeys').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`journeys/${name}`)])),
    ontologyIndex: defs('ontology/index.defs.ts'),
    entities: Object.fromEntries(names('ontology').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`ontology/${name}`)])),
    rules: defs('rules.defs.ts'), workflows: defs('workflows.defs.ts'), access: defs('access.defs.ts'), integration: defs('integration.defs.ts'),
    menu: json('pool/menu.json'), needs: json('pool/needs.json'), backend: json('pool/backend.json'), effort: json('pool/effort.json'),
  };
}

/** Validation errors of the input gate; the copies carry no source digests, so a run without errors stops there. */
async function errorCodes(artifacts: D2InputArtifacts): Promise<string[]> {
  const module = (artifacts.module as { moduleName: string }).moduleName;
  try {
    await buildD2InputSnapshot({ project: 102047, module }, artifacts);
    return [];
  } catch (error) {
    const problems = (error as { problems?: Array<{ code: string; message: string }> }).problems;
    if (!problems) { assert.match(String(error), /source digest missing/u); return []; }
    return problems.map(item => `${item.code}: ${item.message}`);
  }
}

const COPIES = ['p2_32/expense', 'p2_32/purchase', 'p2_32/hiring', 'p2_32/service', 'p2_30/fleet'];

void test('d2_67: own anchors reached through relationships give no finding; a missing path is a named error', async () => {
  for (const copy of COPIES) {
    const codes = await errorCodes(artifactsOf(path.join(NEEDS_FIXTURES, copy)));
    assert.equal(codes.some(code => code.startsWith('OWN_ANCHOR')), false, `${copy}: ${codes.join(' | ')}`);
  }
  // With no relationship touching the owned entity there is no path to the anchor.
  const expense = artifactsOf(path.join(NEEDS_FIXTURES, 'p2_32/expense'));
  const others = Object.fromEntries(Object.entries(expense.entities).map(([id, raw]) => {
    const entity = structuredClone(raw) as { relationships?: Record<string, { to?: string }> };
    for (const [key, relationship] of Object.entries(entity.relationships ?? {})) {
      if (id === 'Despesa' || relationship.to === 'Despesa') delete entity.relationships![key];
    }
    return [id, entity];
  }));
  const codes = await errorCodes({ ...expense, entities: others });
  const unreachable = codes.filter(code => code.startsWith('OWN_ANCHOR_UNREACHABLE'));
  assert.equal(unreachable.length, 1, codes.join(' | '));
  assert.match(unreachable[0], /'Despesa' has no relationship path to it within 3 links/u);
});

void test('d2_67: refusals decidable from the inputs stop at input20, before any LLM call', async () => {
  for (const copy of COPIES) {
    const codes = await errorCodes(artifactsOf(path.join(NEEDS_FIXTURES, copy)));
    assert.equal(codes.some(code => code.includes('_INPUT20')), false, `${copy}: ${codes.join(' | ')}`);
  }
  const expense = artifactsOf(path.join(NEEDS_FIXTURES, 'p2_32/expense'));
  const needs = structuredClone(expense.needs) as { pages: Array<{ pageId: string; reads: Array<{ from: string[] }>; writes: Array<{ operation: string; transitionRef?: string }> }> };
  const page = needs.pages.find(item => item.writes.some(write => write.operation === 'transition'))!;
  page.writes = page.writes.map(write => write.operation === 'transition' ? { ...write, transitionRef: '' } : write);
  const linkedJourneys = new Set(Object.entries((expense.menu as { meta: { journeys: Record<string, string[]> } }).meta.journeys).filter(([, pages]) => pages.includes(page.pageId)).map(([id]) => id));
  const outside = Object.keys(expense.journeys).find(id => !linkedJourneys.has(id))!;
  page.reads[0].from = [...page.reads[0].from, `journey:${outside}/anyStep`];
  const codes = await errorCodes({ ...expense, needs });
  assert.ok(codes.some(code => code.startsWith('D2_PAGE11_TRANSITION_WITHOUT_REF_INPUT20')), codes.join(' | '));
  assert.ok(codes.some(code => code.startsWith('D2_SHARED_V2_JOURNEY_OUTSIDE_INPUT20') && code.includes(outside)), codes.join(' | '));
});

void test('p2_34: a toRemove page is found among the menu nodes of meta.removed', async () => {
  const expense = artifactsOf(path.join(NEEDS_FIXTURES, 'p2_32/expense'));
  const removedNode = { id: 'pagina_antiga', kind: 'page', label: 'Antiga', organisms: [{ kind: 'list', text: 'Antiga.' }], action: 'remove' };
  const menu = structuredClone(expense.menu) as { meta: Record<string, unknown> };
  menu.meta.removed = [removedNode];
  const effort = structuredClone(expense.effort) as { screens: Array<Record<string, unknown>> };
  effort.screens = [...effort.screens, { pageId: 'pagina_antiga', label: 'Antiga', actors: [], status: 'toRemove', endpoints: [] }];
  const codes = await errorCodes({ ...expense, menu, effort });
  assert.equal(codes.some(code => code.startsWith('REMOVED_PAGE_NOT_IN_MENU_META') || code.startsWith('MENU_REMOVED_WITHOUT_EFFORT')), false, codes.join(' | '));
  // Without the node, the same page is refused by name.
  menu.meta.removed = [];
  const missing = await errorCodes({ ...expense, menu, effort });
  assert.ok(missing.some(code => code.startsWith('REMOVED_PAGE_NOT_IN_MENU_META')), missing.join(' | '));
});
