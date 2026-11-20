/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2SharedDerive.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { D2BffDesign, D2BffLeaf, D2Menu, D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { deriveD2Shared, type D2SharedDeriveInput } from '/_102020_/l2/agentDefsL2/helpers/d2SharedDerive.js';
import type { D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';

const jsdoc = { purpose: 'p', input: 'i', processing: 'c', output: 'o' };
const menu: D2Menu = { tree: [], authorities: {} };
const blank = (): D2Page11Needs['organisms'][string] => ({ reads: [], edits: [], selects: '', submits: [] });

function page(organisms: D2Page11Definition['organisms']): D2Page11Definition {
  return { template: { category: 'c', experience: 'e' }, intent: 'i', sections: [], organisms, molecules: {} };
}

function leaf(name: string, origin: D2BffLeaf['origin'], optional?: boolean): D2BffLeaf {
  return { name, type: 'string', ...(optional ? { optional: true } : {}), origin };
}

function design(pageId: string, input: D2BffLeaf[], selections: Array<{ organism: string; entity: string }> = []): D2BffDesign {
  return {
    types: [],
    endpoints: [
      {
        id: 'load', kind: 'qry', when: 'onLoad', input, output: [{ name: 'row', type: 'string', origin: { kind: 'context', paths: [] } }], rules: [], jsdoc,
      },
      ...selections.map(row => ({
        id: `pick${row.entity}`, kind: 'qry' as const, when: 'interaction',
        input: [leaf('id', { kind: 'field', paths: [`${row.entity}.id`] })],
        output: [], rules: [], jsdoc,
      })),
    ],
    bindings: {
      organisms: [{ organism: 'body', reads: 'load.row' }],
      commands: [],
      selections: selections.map(row => ({ organism: row.organism, via: { query: `pick${row.entity}` } })),
      journeys: [],
      updates: [],
    },
  };
}

/** A sibling list navigates here carrying `Entity.id`. The page reads that entity, so the param is `<entity>Id`. */
function openedFrom(pageId: string, listPage: string, entity: string, input: D2BffLeaf[], selections: Array<{ organism: string; entity: string }> = []): D2SharedDeriveInput {
  const organisms = { body: { kind: 'detail', text: pageId, intents: [] } };
  const needs: D2Page11Needs = { organisms: { body: { ...blank(), reads: [`${entity}.name`] } } };
  return {
    pageId,
    page11: { desktop: page(organisms), mobile: page(organisms) },
    drafts: { desktop: needs, mobile: needs },
    need: { pageId, actors: [], reads: [], writes: [] } satisfies D2NeedPage,
    menu,
    design: design(pageId, input, selections),
    access: { actors: [], grants: [] },
    entities: {},
    siblings: [{
      pageId: listPage,
      page11: page({ list: { kind: 'list', text: listPage, intents: [{ id: 'open', kind: 'navigate', to: pageId }] } }),
      drafts: [{ organisms: { list: { ...blank(), reads: [`${entity}.id`] } } }],
    }],
  };
}

void test('d2_193: an onLoad id leaf is required on the matching entry param; a selection inside the page is not', () => {
  const agentId = leaf('agentId', { kind: 'context', paths: [] });
  const requiredAgent = ['agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_simulation', 'my_conduct'];
  for (const pageId of requiredAgent) {
    const extra = pageId === 'agent_behavior' ? [{ organism: 'behaviors', entity: 'AgentBehavior' }] : [];
    const shared = deriveD2Shared(openedFrom(pageId, 'agents', 'Agent', [agentId], extra));
    assert.equal(shared.entry.params.agentId?.required, true, pageId);
  }
  const behavior = deriveD2Shared(openedFrom('agent_behavior', 'agents', 'Agent', [agentId], [{ organism: 'behaviors', entity: 'AgentBehavior' }]));
  assert.equal(behavior.entry.params.agentBehaviorId?.required, false);

  // The same id, born as a selection rather than a navigation, is still required. Origin stays unread.
  const activity = deriveD2Shared(openedFrom('agent_activity', 'agents', 'Agent', [agentId], [{ organism: 'body', entity: 'Agent' }]));
  assert.equal(activity.entry.params.agentId?.required, true);

  const agents = deriveD2Shared(openedFrom('agents', 'home', 'Agent', [leaf('page', { kind: 'context', paths: [] }), leaf('pageSize', { kind: 'context', paths: [] })], [
    { organism: 'drafts', entity: 'AgentDraft' },
    { organism: 'tools', entity: 'AgentTool' },
  ]));
  assert.equal(agents.entry.params.agentDraftId?.required, false);
  assert.equal(agents.entry.params.agentToolId?.required, false);
  assert.equal(Object.values(agents.entry.params).every(param => param.required === false), true);

  const catalog = deriveD2Shared(openedFrom('tool_catalog', 'agents', 'Tool', [leaf('search', { kind: 'context', paths: [] }, true)], [{ organism: 'body', entity: 'Tool' }]));
  assert.equal(Object.values(catalog.entry.params).every(param => param.required === false), true);

  const draft = deriveD2Shared(openedFrom('draft_review', 'agents', 'AgentDraft', [leaf('draftId', { kind: 'context', paths: [] })], [{ organism: 'body', entity: 'AgentDraft' }]));
  assert.equal(draft.entry.params.draftId?.required, true);
});

void test('d2_193: a backTo navigate does not give the list an agentId', () => {
  const input = openedFrom('agents', 'nowhere', 'Agent', [leaf('page', { kind: 'context', paths: [] }), leaf('pageSize', { kind: 'context', paths: [] })], [
    { organism: 'drafts', entity: 'AgentDraft' },
    { organism: 'tools', entity: 'AgentTool' },
  ]);
  input.siblings = [{
    pageId: 'agent_overview',
    page11: page({ body: { kind: 'detail', text: 'overview', intents: [{ id: 'backToAgents', kind: 'navigate', to: 'agents' }] } }),
    drafts: [{ organisms: { body: { ...blank(), reads: ['Agent.id'] } } }],
  }];
  const shared = deriveD2Shared(input);
  assert.equal(shared.entry.params.agentId, undefined);
  assert.equal(shared.entry.params.agentDraftId?.required, false);
  assert.equal(shared.entry.params.agentToolId?.required, false);
});
