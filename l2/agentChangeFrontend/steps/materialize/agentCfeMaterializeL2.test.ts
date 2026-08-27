/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeL2.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

void test('agentCfeMaterializeL2 declares the materialize planner step agent contract', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializeL2.ts'), 'utf8');
  const flow = readFileSync(path.join(HERE, '..', '..', 'flow.json'), 'utf8');
  assert.match(src, /agentCfeMaterializeL2/);
  assert.match(src, /export function createAgent/);
  assert.match(src, /beforePromptStep/);
  assert.match(flow, /"agentName": "agentCfeMaterializeL2"/);
});

// ── the barrier is the PHASE, never its fan-out (run cf3) ────────────────────
// A fan-out completes when the FIRST pass of its items ends; the phase step only completes when
// fan-out + verify + repair rounds + verify-v2 are done. Depending on the fan-out let register and
// finalize run the module compile gate while 32 pages were still being repaired — the task failed on
// errors of files nobody had finished writing, and killed the repair mid-flight.
void test('phases and register depend on the phase step, never on its fan-out', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializeL2.ts'), 'utf8');
  // What the next phase inherits, and what register/finalize wait for.
  assert.match(src, /priorPhasePlanIds = \[phasePlanId\];/);
  assert.match(src, /terminalPlanIds = \[phasePlanId\];/);
  assert.doesNotMatch(src, /(?:priorPhasePlanIds|priorFanoutPlanIds|terminalPlanIds)\s*=\s*\[fanoutPlanId\]/);
  // The fan-out plan id still travels INSIDE the phase args (the phase agent creates that child).
  assert.match(src, /\{ planId: phasePlanId, fanoutPlanId,/);
  // register waits for the terminal phase; finalize waits for register.
  assert.match(src, /const registerDeps = phasePlan\.terminalPlanIds;/);
  assert.match(src, /'finalize-create',[\s\S]{0,200}\['register-frontend'\]/);
});

// ── a broken leftover must not be "up to date" forever (T5) ──────────────────
// The planner is a freshness check, so a file materialized BROKEN stays broken: its defs never
// changes again and only the finalize compile gate ever sees it. The last verify verdict of each
// phase is already persisted, so the plan believes it.
void test('the plan re-schedules whatever the last verify verdict still calls broken', () => {
  const src = readFileSync(path.join(HERE, 'agentCfeMaterializeL2.ts'), 'utf8');
  const shared = readFileSync(path.join(HERE, '..', '..', 'helpers', 'cfeCreateShared.ts'), 'utf8');
  assert.match(shared, /export async function readBlockedMaterializePlanIds\(project: number\): Promise<Set<string>>/);
  // Only a verdict that is NOT clear schedules work, and it is read from the stable summary file.
  assert.match(shared, /verdict\.allClear !== false/);
  assert.match(shared, /endsWith\('\/trace\/frontend-materialize-verify'\)/);
  assert.match(shared, /endsWith\('-summary'\)/);
  // It reaches the planner and shows up as its own reason (never hidden inside 'up to date').
  assert.match(src, /planMaterialization\(candidates, args\.force === true, await readBlockedMaterializePlanIds\(generated\.project\)\)/);
  assert.match(src, /const verdictBroken = brokenPlanIds\.has\(materializePlanId\(item\)\)/);
  assert.match(src, /force \|\| scheduledDep \|\| verdictBroken \|\|/);
  assert.match(src, /\? 'last verify verdict: broken'/);
  // An unreadable verdict schedules nothing.
  assert.match(shared, /catch \{ \/\* an unreadable verdict schedules nothing \*\/ \}/);
});
