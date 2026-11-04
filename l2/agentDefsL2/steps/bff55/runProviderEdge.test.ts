/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/runProviderEdge.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { providerEdgeCases } from '/_102035_/l2/solution/testing/providerEdgeCases.js';
import { bffSchemaFor, d2BffApproved, type D2BffContext } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

// Strict mode does not enforce `pattern`: the leaf type, the update state and the organism read can come in any text.
// The same context as the d2_155 test in run.test.ts (the `inicio` page of the `inicioOriginNull` answer).
const blank = { template: { category: 'list', experience: 'consultar' }, intent: 'consultar', sections: [{ id: 's', priority: 1, purpose: 'x'.repeat(4000), organisms: [] }], organisms: {} };

type Answer = {
  types: Array<{ fields: Array<Record<string, unknown>> }>;
  endpoints: Array<{ when: string; writes?: string; input: Array<Record<string, unknown>>; output: Array<Record<string, unknown>>; rules: string[] }>;
  bindings: { organisms: Array<{ organism: string }>; journeys: Array<{ step: string; continuesIn?: string }> };
};

function contextOf(answer: Answer): D2BffContext {
  const organisms = [...new Set(answer.bindings.organisms.map(row => row.organism))];
  const submits = [...new Set(answer.endpoints.map(row => row.when).filter(when => when !== 'onLoad' && when !== 'interaction'))];
  const steps = [...new Set(answer.bindings.journeys.map(row => row.step))];
  const pages = [...new Set(answer.bindings.journeys.flatMap(row => row.continuesIn ? [row.continuesIn] : []))];
  const organism = { intents: submits.map(id => ({ id, kind: 'submit' })) };
  return {
    identity: { project: 102020, module: 'mod' }, inputHash: 'h', pageId: 'inicio', userLanguage: 'en',
    page11: {
      desktop: { ...blank, organisms: Object.fromEntries(organisms.map(id => [id, organism])) },
      mobile: { ...blank, organisms: Object.fromEntries(organisms.map(id => [id, organism])) },
    },
    page11Text: { desktop: '', mobile: '' },
    drafts: { desktop: { organisms: {} }, mobile: { organisms: {} } }, draftText: { desktop: '{}', mobile: '{}' },
    need: {
      pageId: 'inicio', actors: [], reads: steps.map(step => ({ entity: 'Tarefa', from: [`journey:${step}`] })),
      writes: [...new Set(answer.endpoints.flatMap(row => row.writes ? [row.writes] : []))].map(key => {
        const [entity, transitionRef] = key.split('.');
        return { entity, operation: 'transition', transitionRef };
      }),
    },
    menu: { tree: pages.map(id => ({ id, kind: 'page' })), authorities: {}, meta: { journeys: Object.fromEntries([...new Set(steps.map(step => step.split('/')[0]))].map(id => [id, ['inicio']])) } },
    entities: {}, grants: [], rules: {}, journeys: [], prompt: 'prompt', approved: null,
  } as unknown as D2BffContext;
}

void test('bff55: a value outside the pattern is refused by the parser, naming the field', () => {
  const answer = JSON.parse(readFileSync(new URL('./fixtures/inicioOriginNull.json', import.meta.url), 'utf8')) as Answer;
  const context = contextOf(answer);
  const schema = bffSchemaFor(context);
  const cases = providerEdgeCases(schema, answer);
  assert.ok(cases.some(item => item.rule === 'pattern'), 'the schema has pattern cases');
  const leaks: string[] = [];
  for (const item of cases) {
    const label = `${item.path} ${item.rule} ${item.variant}`;
    const field = item.path.replace(/\[\d+\]/g, '').split('.').at(-1) ?? item.path;
    try {
      d2BffApproved(context, item.value);
    } catch (error) {
      assert.ok(error instanceof Error && error.message.length > 10, `${label}: the refusal says why`);
      if (item.rule === 'pattern') assert.ok(error instanceof Error && error.message.includes(field), `${label}: the issue names the field`);
      continue;
    }
    if (item.rule === 'pattern') leaks.push(label);
  }
  assert.deepEqual(leaks, [], 'values outside the pattern that the parser accepted without an issue');
});
