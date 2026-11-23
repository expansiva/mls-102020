/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2_212.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { checkD2Bff, type D2BffDesign, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { gateD2Page11, type D2Page11GateSources, type D2Page11Menu, type D2Page11NeedPage, type D2Page11Write } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { collectP2NeedsPages } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import type { P2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { declarationObjectOf } from '/_102020_/l2/helpers/connections/declarationObject.js';
import type { D2CallConnection } from '/_102020_/l2/helpers/defsInput/writeCalls.js';
import { d2WriteKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import type { PoolMenuFile, PoolNeedsWrite } from '/_102035_/l2/solution/poolPlan.js';

const read = (name: string): string => readFileSync(new URL(`./fixtures/d2_212/${name}`, import.meta.url), 'utf8');
const json = <T>(name: string): T => JSON.parse(read(name)) as T;
const connectionsOf = (name: string): D2CallConnection[] => {
  const parsed = declarationObjectOf(read(name)) as { connections?: D2CallConnection[] } | null;
  if (!parsed) throw new Error(`no declaration in ${name}`);
  return parsed.connections ?? [];
};

type ProducedWrite = PoolNeedsWrite & { calls?: string[] };

/** Writes as needs30 builds them. `calls` is absent unless the line was split from another of the same operation. */
function producedWrites(menuName: string, sourcesName: string, integrationName: string): Record<string, ProducedWrite[]> {
  const pages = collectP2NeedsPages({
    menu: json<PoolMenuFile>(menuName),
    sources: json<P2L4Sources>(sourcesName),
    grants: [],
    processes: [],
    now: new Date(0),
    connections: connectionsOf(integrationName),
  });
  return Object.fromEntries(pages.map(page => [page.pageId, page.writes]));
}

const splitAgents = producedWrites('menu.json', 'agents-sources.json', 'integration.defs.ts');

function definitionFor(needs: D2Page11Needs, menu: D2Page11Menu, pageId: string): unknown {
  const organisms = new Map<string, { kind: string; text: string }>();
  const walk = (nodes: D2Page11Menu['tree']): void => {
    for (const node of nodes) {
      if (node.id === pageId && node.kind === 'page') for (const item of node.organisms ?? []) organisms.set(`${organisms.size}`, item);
      walk(node.children ?? []);
    }
  };
  walk(menu.tree);
  const kinds = [...organisms.values()];
  const ids = Object.keys(needs.organisms);
  const built: Record<string, unknown> = {};
  ids.forEach((id, index) => {
    const kind = kinds[index];
    built[id] = {
      kind: kind?.kind ?? 'detail',
      text: kind?.text || id,
      intents: needs.organisms[id].submits.map(submit => ({ id: submit.intentId, kind: 'submit', to: '' })),
    };
  });
  return {
    template: { category: 'bespoke', experience: 'none' },
    intent: 'd2_212',
    sections: [{ id: 'main', priority: 'main', purpose: 'd2_212', organisms: ids }],
    organisms: built,
    molecules: {},
  };
}

function writeIssues(pageId: string, needs: D2Page11Needs, writes: readonly D2Page11Write[]): string[] {
  const menu = json<D2Page11Menu>('menu.json');
  const sources: D2Page11GateSources = {
    pageId,
    actor: 'companyAdmin',
    menu,
    needsPages: [{ pageId, actors: ['companyAdmin'], writes }],
    entities: {},
    access: { grants: [] },
    categories: [],
    templatePaths: new Set(),
    moleculeTags: new Set(),
  };
  return gateD2Page11(definitionFor(needs, menu, pageId), needs, sources)
    .filter(issue => issue.code === 'D2_PAGE11_WRITE_UNCOVERED' || issue.code === 'D2_PAGE11_WRITE_DUPLICATE' || issue.code === 'D2_PAGE11_SUBMIT_WRITE')
    .map(issue => `${issue.code} ${issue.message}`);
}

test('d2_212 agent_tools refuses the current page11Needs and names suggestTools', () => {
  const needs = json<D2Page11Needs>('agent_toolsDesktop.json');
  const issues = writeIssues('agent_tools', needs, splitAgents.agent_tools);
  assert.equal(issues.some(issue => issue.includes('suggestTools')), true, issues.join('\n'));
  const passing = structuredClone(needs);
  const suggest = splitAgents.agent_tools.find(write => (write.from ?? []).some(item => item.endsWith('/suggestTools')));
  if (!suggest) throw new Error('suggestTools line missing');
  passing.organisms.agentToolTree.submits.push({ intentId: 'suggestTools', write: d2WriteKey(suggest) });
  assert.deepEqual(writeIssues('agent_tools', passing, splitAgents.agent_tools), []);
});

test('d2_212 agent_behavior refuses the current page11Needs and names undoBehaviorChange', () => {
  const needs = json<D2Page11Needs>('agent_behaviorDesktop.json');
  const issues = writeIssues('agent_behavior', needs, splitAgents.agent_behavior);
  assert.equal(issues.some(issue => issue.includes('undoBehaviorChange')), true, issues.join('\n'));
  const passing = structuredClone(needs);
  const line = (step: string) => {
    const found = splitAgents.agent_behavior.find(write => (write.from ?? []).some(item => item.endsWith(`/${step}`)));
    if (!found) throw new Error(`${step} line missing`);
    return d2WriteKey(found);
  };
  // Both steps have a call, so neither line keeps the bare AgentBehavior.update key.
  for (const unit of Object.values(passing.organisms)) {
    for (const submit of unit.submits) if (submit.intentId === 'requestBehaviorChange') submit.write = line('requestBehaviorChange');
  }
  passing.organisms.behaviorHistory.submits.push({ intentId: 'undoBehaviorChange', write: line('undoBehaviorChange') });
  assert.deepEqual(writeIssues('agent_behavior', passing, splitAgents.agent_behavior), []);
});

test('d2_212 tarefas writes stay byte for byte when every joined step shares its call set', () => {
  const tarefas = json<Record<string, ProducedWrite[]>>('tarefas-writes.json');
  const produced = producedWrites('tarefas-menu.json', 'tarefas-sources.json', 'tarefas-integration.defs.ts');
  const after: Record<string, ProducedWrite[]> = {};
  for (const pageId of Object.keys(tarefas)) after[pageId] = produced[pageId];
  assert.equal(JSON.stringify(after), JSON.stringify(tarefas));
  for (const writes of Object.values(after)) {
    for (const write of writes) assert.equal(Object.hasOwn(write, 'calls'), false);
  }
});

test('d2_212 a split call line must bind its step to its command', () => {
  const suggest = splitAgents.agent_tools.find(write => (write.calls ?? []).includes('runAiPrompt'));
  if (!suggest) throw new Error('suggestTools calls missing');
  const need: D2NeedPage = {
    pageId: 'agent_tools',
    actors: ['companyAdmin'],
    reads: [{ entity: 'AgentTool', derived: [], from: ['journey:adjustAgentTools/suggestTools'] }],
    writes: [suggest],
  };
  const blank = { template: { category: 'bespoke', experience: 'none' }, intent: 'd2_212', sections: [], organisms: {}, molecules: {} };
  const context = {
    page11: { desktop: blank, mobile: blank },
    drafts: { desktop: { organisms: {} }, mobile: { organisms: {} } },
    need,
    menu: { tree: [], authorities: {}, meta: { journeys: { adjustAgentTools: ['agent_tools'] } } },
    entities: {},
    grants: [],
    rules: {},
  };
  const design = {
    types: [],
    endpoints: [],
    bindings: { organisms: [], commands: [], selections: [], journeys: [{ step: 'adjustAgentTools/suggestTools', organisms: [], endpoints: [] }], updates: [] },
  } as D2BffDesign;
  const stepIssues = (issues: { code: string; message: string }[]) => issues.filter(issue => issue.code === 'D2_BFF_BINDING_STEP' && issue.message.includes('must list its command'));
  const refused = stepIssues(checkD2Bff(design, context));
  assert.equal(refused.some(issue => issue.message.includes('suggestTools')), true, refused.map(issue => issue.message).join('\n'));
  const key = d2WriteKey(suggest);
  const accepted: D2BffDesign = {
    ...design,
    endpoints: [{ id: 'suggestTools', kind: 'cmd', when: 'suggestTools', writes: key, input: [], output: [], rules: [], jsdoc: { purpose: '', input: '', processing: '', output: '' } }],
    bindings: { ...design.bindings, journeys: [{ step: 'adjustAgentTools/suggestTools', organisms: [], endpoints: ['suggestTools'] }] },
  };
  const drafted = {
    ...context,
    page11: {
      desktop: { ...blank, organisms: { tools: { kind: 'list', text: 'tools', intents: [{ id: 'suggestTools', kind: 'submit' as const }] } } },
      mobile: blank,
    },
    drafts: {
      desktop: { organisms: { tools: { reads: [], edits: [], selects: '', submits: [{ intentId: 'suggestTools', write: key }] } } },
      mobile: { organisms: {} },
    },
  };
  assert.deepEqual(stepIssues(checkD2Bff(accepted, drafted)), []);
});

type JourneyRow = { step: string; organisms: string[]; endpoints: string[]; continuesIn?: string };

/** The gate only needs the journey rows and the menu. The rest of the bff stays out of the fixture. */
function pageIssues(pageId: string, journeys: JourneyRow[], menuName: string): string[] {
  const blank = { template: { category: 'bespoke', experience: 'none' }, intent: 'd2_212', sections: [], organisms: {}, molecules: {} };
  const design = {
    types: [],
    endpoints: [],
    bindings: { organisms: [], commands: [], selections: [], journeys, updates: [] },
  } as D2BffDesign;
  const context = {
    page11: { desktop: blank, mobile: blank },
    drafts: { desktop: { organisms: {} }, mobile: { organisms: {} } },
    need: { pageId, actors: [], reads: [], writes: [] },
    menu: json<D2Menu>(menuName),
    entities: {},
    grants: [],
    rules: {},
  };
  return checkD2Bff(design, context)
    .filter(issue => issue.code === 'D2_BFF_BINDING_PAGE')
    .map(issue => issue.message);
}

test('d2_212 continuesIn of suggestTools must be a page of adjustAgentTools', () => {
  const journeys = json<Record<string, JourneyRow[]>>('agents-bff-journeys.json');
  const refused = pageIssues('agent_tools', journeys.agent_tools, 'menu.json');
  assert.equal(refused.some(message => message.includes('suggestTools') && message.includes('agent_configuration') && message.includes('agents, agent_tools')), true, refused.join('\n'));
  const others = Object.entries(journeys).filter(([pageId]) => pageId !== 'agent_tools');
  assert.equal(others.length, 10);
  for (const [pageId, rows] of others) assert.deepEqual(pageIssues(pageId, rows, 'menu.json'), [], pageId);
  assert.deepEqual(pageIssues('inicio', json<JourneyRow[]>('tarefas-inicio-journeys.json'), 'tarefas-menu.json'), []);
});
