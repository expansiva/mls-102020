/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { M3_HELP, parseM3MessageInvocation, parseM3StepInvocation } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';

const P = 102047;
const refusal = (text: string, pattern: RegExp) => {
  const result = parseM3MessageInvocation(text, P);
  assert.equal(result.kind, 'refusal', text);
  assert.match((result as { diagnostic: string }).diagnostic, pattern);
};

test('message: module only runs every page on both devices', () => {
  assert.deepEqual(parseM3MessageInvocation('@@agentMaterializeL2v3 controleEstoque', P),
    { kind: 'run', project: P, module: 'controleEstoque', pages: null, devices: ['desktop', 'mobile'] });
});

test('message: /pages and /devices, devices sorted and without repetition', () => {
  assert.deepEqual(parseM3MessageInvocation('@@agentMaterializeL2v3 controleEstoque /pages produtos,movimentacoes /devices mobile,desktop,mobile', P),
    { kind: 'run', project: P, module: 'controleEstoque', pages: ['produtos', 'movimentacoes'], devices: ['desktop', 'mobile'] });
  assert.deepEqual(parseM3MessageInvocation('@@agentMaterializeL2v3 controleEstoque /devices mobile /pages produtos', P),
    { kind: 'run', project: P, module: 'controleEstoque', pages: ['produtos'], devices: ['mobile'] });
});

test('message: /help', () => {
  assert.deepEqual(parseM3MessageInvocation('@@agentMaterializeL2v3 /help', P), { kind: 'help' });
  assert.match(M3_HELP, /Usage: @@agentMaterializeL2v3/u);
});

test('message: refusals carry the reason', () => {
  refusal('@@agentMaterializeL2v3 controleEstoque /candidate', /Unknown flag: \/candidate/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages', /Empty value for \/pages/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages /devices mobile', /Empty value for \/pages/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /devices tablet', /Invalid device: tablet/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages produtos,produtos', /Repeated page: produtos/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages Produtos', /Invalid page name: Produtos/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages produtos,,x', /Empty page name/u);
  refusal('@@agentMaterializeL2v3 ../x', /lowerCamel/u);
  refusal('@@agentMaterializeL2v3 Controle', /lowerCamel/u);
  refusal('@@agentMaterializeL2v3', /Missing module/u);
  refusal('@@agentMaterializeL2v3 controleEstoque extra', /Unexpected argument: extra/u);
  refusal('@@agentMaterializeL2v3 controleEstoque /pages a /pages b', /Repeated flag/u);
  assert.equal(parseM3MessageInvocation('@@agentMaterializeL2v3 controleEstoque', 0).kind, 'refusal');
});

const stepArgs = { project: P, module: 'controleEstoque', pages: null, devices: ['desktop', 'mobile'], runDir: 'run_20261001143205' };

test('step: valid args, with pages null and with a list', () => {
  assert.deepEqual(parseM3StepInvocation(JSON.stringify(stepArgs), P), { kind: 'run', ...stepArgs });
  const withPages = { ...stepArgs, pages: ['produtos'], devices: ['mobile'] };
  assert.deepEqual(parseM3StepInvocation(JSON.stringify(withPages), P), { kind: 'run', ...withPages });
});

test('step: refusals (unknown key, project, runDir, devices, pages, JSON)', () => {
  const bad = (value: unknown, pattern: RegExp) => {
    const result = parseM3StepInvocation(typeof value === 'string' ? value : JSON.stringify(value), P);
    assert.equal(result.kind, 'refusal');
    assert.match((result as { diagnostic: string }).diagnostic, pattern);
  };
  bad({ ...stepArgs, scope: 'all' }, /Unknown step arg: scope/u);
  bad({ ...stepArgs, project: 1 }, /does not match/u);
  bad({ ...stepArgs, runDir: 'run_2026' }, /runDir/u);
  bad({ ...stepArgs, devices: ['tablet'] }, /Invalid device/u);
  bad({ ...stepArgs, devices: 'desktop' }, /devices must be a list/u);
  bad({ ...stepArgs, pages: [] }, /Empty page name/u);
  bad({ ...stepArgs, module: '../x' }, /lowerCamel/u);
  bad('not json', /must be JSON/u);
  bad('[]', /must be an object/u);
});
