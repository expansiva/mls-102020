/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BackNavigation.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { applyD2BackNavigation, type D2BackMenuNode, type D2BackPage } from '/_102020_/l2/agentDefsL2/helpers/d2BackNavigation.js';
import type { D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';

const HUB: D2BackMenuNode = {
  id: 'agent', kind: 'hub', context: 'Agent', children: [
    'agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_activity', 'agent_simulation', 'my_conduct',
  ].map(id => ({ id, kind: 'page', organisms: [{ kind: 'detail' }] })),
};

function tree(): D2BackMenuNode[] {
  return [
    { id: 'agents', kind: 'page', organisms: [{ kind: 'list' }, { kind: 'form' }] },
    { id: 'draft_review', kind: 'page', organisms: [{ kind: 'list' }, { kind: 'detail' }] },
    { id: 'tool_catalog', kind: 'page', organisms: [{ kind: 'list' }] },
    { id: 'person_restrictions', kind: 'page', organisms: [{ kind: 'detail' }] },
    HUB,
  ];
}

function pages(): D2BackPage[] {
  const children = ['agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_activity', 'agent_simulation', 'my_conduct'];
  return [
    { pageId: 'agents', reads: [{ entity: 'Agent' }, { entity: 'AgentDraft' }] },
    { pageId: 'draft_review', reads: [{ entity: 'AgentDraft' }] },
    { pageId: 'tool_catalog', reads: [{ entity: 'Tool' }] },
    { pageId: 'person_restrictions', reads: [{ entity: 'Person' }] },
    ...children.map(pageId => ({ pageId, reads: [{ entity: 'Agent' }] })),
  ];
}

function definition(intents: D2Page11Definition['organisms'][string]['intents'] = []): D2Page11Definition {
  return {
    template: { category: 'c', experience: 'e' },
    intent: 'see the record',
    sections: [{ id: 'main', priority: 'primary', purpose: 'the record', organisms: ['body'] }],
    organisms: { body: { kind: 'detail', text: 'the record', intents: [...intents] } },
    molecules: {},
  };
}

function pair(intents?: D2Page11Definition['organisms'][string]['intents']) {
  return { desktop: definition(intents), mobile: definition(intents) };
}

const hubPage = { ancestors: [{ id: 'agent', kind: 'hub', context: 'Agent' }] };
const plain = { ancestors: [] as Array<{ kind: string; context?: string }> };

void test('d2_193: hub children navigate back to the list on both devices', () => {
  const children = ['agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_activity', 'agent_simulation', 'my_conduct'];
  for (const pageId of children) {
    const definitions = pair();
    applyD2BackNavigation(hubPage, tree(), pages(), definitions);
    for (const device of ['desktop', 'mobile'] as const) {
      const intents = definitions[device].organisms.body.intents;
      assert.deepEqual(intents, [{ id: 'backToAgents', kind: 'navigate', to: 'agents' }], `${pageId}/${device}`);
    }
  }
});

void test('d2_193: a page outside the hub, and a page that already returns, stay as they are', () => {
  for (const pageId of ['agents', 'draft_review', 'tool_catalog', 'person_restrictions']) {
    const definitions = pair();
    applyD2BackNavigation({ ancestors: pageId === 'draft_review' ? [{ id: 'root', kind: 'group', context: '' }] : plain.ancestors }, tree(), pages(), definitions);
    assert.equal(definitions.desktop.organisms.body.intents.length, 0, pageId);
    assert.equal(definitions.mobile.organisms.body.intents.length, 0, pageId);
  }
  const existing = pair([{ id: 'openList', kind: 'navigate', to: 'agents' }]);
  applyD2BackNavigation(hubPage, tree(), pages(), existing);
  assert.equal(existing.desktop.organisms.body.intents.length, 1);
  assert.equal(existing.desktop.organisms.body.intents[0].id, 'openList');
});

void test('d2_193: several lists, or none, leave the page without a back navigate and warn', () => {
  const none = pair();
  const missing = applyD2BackNavigation({ ...hubPage, pageId: 'agent_overview' }, [{ id: 'agents', kind: 'page', organisms: [{ kind: 'detail' }] }, HUB], pages(), none);
  assert.equal(none.desktop.organisms.body.intents.length, 0);
  assert.deepEqual(missing, [{ code: 'D2_BACK_TARGET_AMBIGUOUS', pageId: 'agent_overview', candidates: [] }]);
  const two = tree();
  two.push({ id: 'other_agents', kind: 'page', organisms: [{ kind: 'list' }] });
  const reads = [...pages(), { pageId: 'other_agents', reads: [{ entity: 'Agent' }] }];
  const several = pair();
  const warned = applyD2BackNavigation(hubPage, two, reads, several);
  assert.equal(several.desktop.organisms.body.intents.length, 0);
  assert.equal(several.mobile.organisms.body.intents.length, 0);
  assert.equal(warned[0]?.code, 'D2_BACK_TARGET_AMBIGUOUS');
  assert.deepEqual(warned[0]?.candidates.sort(), ['agents', 'other_agents']);
});

void test('d2_193: continuesIn that names one candidate is the back target', () => {
  const two = tree();
  two.push({ id: 'other_agents', kind: 'page', organisms: [{ kind: 'list' }] });
  const reads = [...pages(), { pageId: 'other_agents', reads: [{ entity: 'Agent' }] }];
  const definitions = pair();
  const warnings = applyD2BackNavigation(hubPage, two, reads, definitions, {
    refs: ['openAgent'],
    byId: { openAgent: { business: { steps: [{ stepId: 'back', continuesIn: 'agents' }, { stepId: 'stay', continuesIn: 'agent_overview' }] } } },
  });
  assert.deepEqual(warnings, []);
  assert.deepEqual(definitions.desktop.organisms.body.intents, [{ id: 'backToAgents', kind: 'navigate', to: 'agents' }]);
  const both = pair();
  const still = applyD2BackNavigation(hubPage, two, reads, both, {
    refs: ['openAgent', 'other'],
    byId: { openAgent: { continuesIn: 'agents' }, other: { continuesIn: 'other_agents' } },
  });
  assert.equal(both.desktop.organisms.body.intents.length, 0);
  assert.equal(still[0]?.code, 'D2_BACK_TARGET_AMBIGUOUS');
  assert.deepEqual(still[0]?.candidates.sort(), ['agents', 'other_agents']);
  const twoHubs = applyD2BackNavigation({ ancestors: [{ kind: 'hub', context: 'Agent' }, { kind: 'hub', context: 'Person' }] }, two, reads, pair());
  assert.deepEqual(twoHubs, [{ code: 'D2_BACK_TARGET_AMBIGUOUS', pageId: '', candidates: [] }]);
});
