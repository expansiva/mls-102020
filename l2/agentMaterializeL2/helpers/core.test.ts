/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildM4PlannedSteps, m4ScopeDevices, m4ScopeLabel, m4ScopePages, parseM4MessageInvocation, parseM4StepInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';

const run = (message: string) => parseM4MessageInvocation(message, 102047);

test('the module alone runs the whole module', () => {
  assert.deepEqual(run('@@agentMaterializeL2 comandaRestaurante'), { kind: 'run', project: 102047, module: 'comandaRestaurante', scope: {} });
  assert.deepEqual(run('@@agentMaterializeL2 --help'), { kind: 'help' });
  assert.deepEqual(run('@@agentMaterializeL2 /help'), { kind: 'help' });
});

test('--page, --device and --force combine, in any order, with a space or an equals sign', () => {
  assert.deepEqual(run('@@agentMaterializeL2 comandaRestaurante --device desktop'), { kind: 'run', project: 102047, module: 'comandaRestaurante', scope: { device: 'desktop' } });
  assert.deepEqual(run('@@agentMaterializeL2 comandaRestaurante --page mesas'), { kind: 'run', project: 102047, module: 'comandaRestaurante', scope: { pages: ['mesas'] } });
  assert.deepEqual(
    run('@@agentMaterializeL2 --force comandaRestaurante --page=mesas,fechamento --device mobile --page mesas'),
    { kind: 'run', project: 102047, module: 'comandaRestaurante', scope: { force: true, pages: ['mesas', 'fechamento'], device: 'mobile' } },
  );
  assert.deepEqual(run('@@agentMaterializeL2 agendaClinica --page agenda_profissional'), { kind: 'run', project: 102047, module: 'agendaClinica', scope: { pages: ['agenda_profissional'] } }, 'snake_case page ids');
});

test('a bad option is refused with the usage', () => {
  for (const message of [
    '@@agentMaterializeL2 comandaRestaurante --only-desktop',
    '@@agentMaterializeL2 comandaRestaurante --device tablet',
    '@@agentMaterializeL2 comandaRestaurante --page',
    '@@agentMaterializeL2 comandaRestaurante --page ../x',
    '@@agentMaterializeL2 comandaRestaurante extra',
  ]) {
    const result = run(message);
    assert.equal(result.kind, 'refusal', message);
    if (result.kind === 'refusal') assert.match(result.diagnostic, /Usage: @@agentMaterializeL2 <lowerCamel module> \[--page/u, message);
  }
});

test('the scope travels in every planned step and is read back', () => {
  const scope = { pages: ['mesas'], device: 'mobile' as const, force: true };
  const steps = buildM4PlannedSteps({ project: 102047, module: 'comandaRestaurante' }, scope);
  for (const step of steps) {
    const parsed = parseM4StepInvocation(step.prompt ?? '', 102047);
    assert.deepEqual(parsed, { kind: 'run', project: 102047, module: 'comandaRestaurante', scope });
  }
  assert.equal(JSON.parse(buildM4PlannedSteps({ project: 102047, module: 'm' })[0].prompt ?? '{}').scope, undefined, 'no scope key for a whole-module run');
  assert.equal(parseM4StepInvocation(JSON.stringify({ project: 102047, module: 'm', scope: { device: 'tablet' } }), 102047).kind, 'refusal');
});

test('scope helpers', () => {
  const accepted = ['atendimento', 'cardapio', 'fechamento', 'inicio', 'mesas'];
  assert.deepEqual(m4ScopePages(accepted, {}), accepted);
  assert.deepEqual(m4ScopePages(accepted, { pages: ['mesas', 'fechamento'] }), ['fechamento', 'mesas'], 'in accepted order');
  assert.deepEqual(m4ScopeDevices({}), ['desktop', 'mobile']);
  assert.deepEqual(m4ScopeDevices({ device: 'mobile' }), ['mobile']);
  assert.equal(m4ScopeLabel({}), 'whole module');
  assert.equal(m4ScopeLabel({ pages: ['mesas'], device: 'mobile', force: true }), 'pages mesas; device mobile; force');
});
