/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';

const MASTER = '102020';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

test('R1 materializes the named page and ignores the other master', () => {
  assert.deepEqual(planNewReleaseL2(fixture('r1'), MASTER), { ok: true, pages: ['minhas_tarefas'] });
});

test('pages stay in first-seen order without repetition', () => {
  assert.deepEqual(planNewReleaseL2(fixture('order'), MASTER), { ok: true, pages: ['segunda', 'primeira'] });
});

test('R3 regenerateDefs is not this release step', () => {
  assert.deepEqual(planNewReleaseL2(fixture('r3'), MASTER), {
    ok: false,
    reason: "not in this release step: field:prioridade regenerateDefs",
  });
});

test("R4 contract change is not this release step", () => {
  assert.deepEqual(planNewReleaseL2(fixture('r4'), MASTER), {
    ok: false,
    reason: "not in this release step: field:prioridade contract: 'change'",
  });
});

test('abend refuses with the master reason', () => {
  assert.deepEqual(planNewReleaseL2(fixture('abend'), MASTER), {
    ok: false,
    reason: 'not in this release step: field:prioridade abend: module has no declared languages',
  });
});

test('nothing to apply when this master has no page', () => {
  assert.deepEqual(planNewReleaseL2(fixture('nothing'), MASTER), { ok: false, reason: 'nothing to apply' });
});

test('invalid file refuses with the gate reason', () => {
  const plan = planNewReleaseL2(fixture('invalid'), MASTER);
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.match(plan.reason, /^changeEffort rejected by gate: /);
  assert.match(plan.reason, /schema:schemaVersion/);
});
