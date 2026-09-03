/// <mls fileReference="_102020_/l2/aura/agentManagePage2/trace.test.ts" enhancement="_blank" />

// Tests for the trace helper: it must never be the reason a run fails, must respect the runtime
// off-switch, and must survive a console without grouping (node, workers).

import test from 'node:test';
import assert from 'node:assert/strict';
import { traceStep, traceSources, traceSent, traceReceived, traceVerdict, traceFail, tracePlan, setTrace, isTraceOn } from '/_102020_/l2/aura/agentManagePage2/trace.js';

const META = { agent: 'agentPatchPage', page: 'approveChangeOrder', taskId: 'abc123456789', attempt: 2 };

/** Collects everything the helper prints — group headers included, since that is where the summary is. */
function capture(run: () => void): string[] {
  const lines: string[] = [];
  const console_ = console as unknown as Record<string, unknown>;
  const keys = ['info', 'warn', 'error', 'groupCollapsed', 'group', 'groupEnd'];
  const original = Object.fromEntries(keys.map(key => [key, console_[key]]));
  const collect = (...args: unknown[]) => { lines.push(args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')); };
  for (const key of keys) console_[key] = key === 'groupEnd' ? () => { } : collect;
  try { run(); } finally { Object.assign(console_, original); }
  return lines;
}

test('trace: the prefix names the agent, the page, the attempt and the run', () => {
  const lines = capture(() => traceStep(META, 'patching', { target: 'x.ts' }));
  assert.equal(lines.length, 1);
  assert.ok(lines[0].includes('[amp2 agentPatchPage · approveChangeOrder · attempt 2 · #456789]'));
  assert.ok(lines[0].includes('patching'));
  assert.ok(lines[0].includes('target=x.ts'));
});

test('trace: a minimal meta produces a clean prefix', () => {
  const lines = capture(() => traceStep({ agent: 'agentManagePage2' }, 'entry'));
  assert.ok(lines[0].startsWith('[amp2 agentManagePage2] ▶ entry'));
});

test('trace: sources report found/missing and the resolution tier', () => {
  const lines = capture(() => traceSources(META, {
    'page .ts': { ref: 'a.ts', found: true, size: 2048 },
    'l4 workspace': { ref: 'b.defs.ts', found: false },
    'shared surface': { ref: 'c.txt', found: true, size: 100, via: 'persisted .d.ts artifact' },
  })).join('\n');
  assert.ok(lines.includes('✓ page .ts 2.0KB: a.ts'));
  assert.ok(lines.includes('✗ l4 workspace: b.defs.ts'));
  assert.ok(lines.includes('(persisted .d.ts artifact)'));
});

test('trace: sent logs sizes and the full prompts', () => {
  const lines = capture(() => traceSent(META, 'page patch', { system: 'SYS', human: 'HUMAN', tool: 'submitPagePatch' })).join('\n');
  assert.ok(lines.includes('⇧ SENT · page patch'));
  assert.ok(lines.includes('system 3B'));
  assert.ok(lines.includes('tool submitPagePatch'));
  assert.ok(lines.includes('--- system prompt ---'));
  assert.ok(lines.includes('HUMAN'));
});

test('trace: received summarizes and keeps the raw payload', () => {
  const lines = capture(() => traceReceived(META, 'page patch', { type: 'flexible' }, { methods: ['renderApproval'] })).join('\n');
  assert.ok(lines.includes('⇩ RECEIVED · page patch'));
  assert.ok(lines.includes('methods=[renderApproval]'));
  assert.ok(lines.includes('--- raw ---'));
});

test('trace: a huge payload is truncated, not dropped', () => {
  const huge = 'x'.repeat(30_000);
  const lines = capture(() => traceSent(META, 'big', { human: huge })).join('\n');
  assert.ok(lines.includes('[truncated, 6000 more chars]'));
});

test('trace: verdicts and plans read as one line each', () => {
  const ok = capture(() => traceVerdict(META, 'guards passed', true, '100B -> 120B')).join('');
  assert.ok(ok.includes('✓ guards passed: 100B -> 120B'));
  const bad = capture(() => traceVerdict(META, 'guards refused', false, 'unknown member')).join('');
  assert.ok(bad.includes('✗ guards refused: unknown member'));
  const plan = capture(() => tracePlan(META, [
    { planId: 'patch:p', agent: 'agentPatchPage' },
    { planId: 'record:p', agent: 'agentRecordUserChanges', dependsOn: ['patch:p'] },
  ])).join('');
  assert.ok(plan.includes('patch:p→agentPatchPage'));
  assert.ok(plan.includes('record:p→agentRecordUserChanges (after patch:p)'));
});

test('trace: the off-switch silences everything except failures', () => {
  setTrace(false);
  try {
    assert.equal(isTraceOn(), false);
    assert.equal(capture(() => traceStep(META, 'quiet')).length, 0);
    assert.equal(capture(() => traceSent(META, 'quiet', { human: 'x' })).length, 0);
    assert.equal(capture(() => traceReceived(META, 'quiet', {})).length, 0);
    assert.equal(capture(() => traceVerdict(META, 'quiet', true)).length, 0);
    // a failure is never noise
    assert.equal(capture(() => traceFail(META, 'boom')).length, 1);
  } finally {
    setTrace(true);
  }
});

test('trace: the global flag overrides the module default', () => {
  const globals = globalThis as Record<string, unknown>;
  globals['__amp2Trace'] = false;
  try {
    assert.equal(isTraceOn(), false);
  } finally {
    delete globals['__amp2Trace'];
  }
  assert.equal(isTraceOn(), true);
});

test('trace: works on a console with no grouping', () => {
  const console_ = console as unknown as Record<string, unknown>;
  const saved = { groupCollapsed: console_['groupCollapsed'], group: console_['group'], groupEnd: console_['groupEnd'] };
  delete console_['groupCollapsed'];
  delete console_['group'];
  try {
    const lines = capture(() => traceSent(META, 'no groups', { human: 'BODY' }));
    assert.ok(lines.length >= 2);
    assert.ok(lines.join('\n').includes('BODY'));
  } finally {
    Object.assign(console_, saved);
  }
});
