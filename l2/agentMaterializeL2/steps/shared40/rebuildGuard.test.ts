/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/rebuildGuard.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { wasRebuiltByStudio } from '/_102033_/l2/shared/elementSwapRegistry.js';
import { gateM4Input } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';
import { gateM4SharedSource, m4SharedClassName, type M4SharedTarget } from '/_102020_/l2/agentMaterializeL2/steps/shared40/gate.js';
import { m4GuardRebuiltConnected } from '/_102020_/l2/agentMaterializeL2/steps/shared40/rebuildGuard.js';

interface InputFixture {
  project: number; module: string; defsPipelineStatus: string;
  pages: Record<string, { contract: string; shared: string; desktop: string; mobile: string }>;
}
const inputFixture = JSON.parse(readFileSync(new URL('../input20/fixtures/controleEstoque.json', import.meta.url), 'utf8')) as InputFixture;
const reference = (JSON.parse(readFileSync(new URL('./fixtures/produtosShared.json', import.meta.url), 'utf8')) as { source: string }).source;

function target(): M4SharedTarget {
  const gate = gateM4Input({
    project: inputFixture.project, module: inputFixture.module, defsPipelineStatus: inputFixture.defsPipelineStatus,
    pages: Object.entries(inputFixture.pages).map(([id, sources]) => ({ pageId: id, sources })),
    templateExists: () => true, moleculeExists: () => true,
  });
  const parsed = gate.parsed.produtos;
  return {
    project: inputFixture.project, module: inputFixture.module, pageId: 'produtos',
    className: m4SharedClassName(inputFixture.module, 'produtos'),
    shared: parsed.shared, contract: parsed.contract,
    rules: gate.problems.filter(item => item.page === 'produtos'),
    methods: parsed.methods,
    navigations: parsed.navigations,
  };
}

test('the reference shared guards resetVisit and applyEntryParams and leaves the initial load', () => {
  const guarded = m4GuardRebuiltConnected(reference, target());
  assert.deepEqual(guarded.findings, []);
  assert.match(guarded.text, /import \{ wasRebuiltByStudio \} from '\/_102033_\/l2\/shared\/elementSwapRegistry\.js';/u);
  assert.match(guarded.text, /if \(!wasRebuiltByStudio\(this\)\) this\.resetVisit\(\);/u);
  assert.match(guarded.text, /if \(!wasRebuiltByStudio\(this\)\) this\.applyEntryParams\(\);/u);
  assert.match(guarded.text, /void this\.runInitialLoad\(\);/u);
  assert.equal(guarded.text.includes('if (!wasRebuiltByStudio(this)) void this.runInitialLoad();'), false);
  assert.equal(typeof wasRebuiltByStudio, 'function');
});

test('a reset or an entry method is guarded by what it does, not by its name', () => {
  const renamed = reference.replace(/\bresetVisit\b/gu, 'startVisit').replace(/\bapplyEntryParams\b/gu, 'beginVisit');
  const guarded = m4GuardRebuiltConnected(renamed, target());
  assert.match(guarded.text, /if \(!wasRebuiltByStudio\(this\)\) this\.startVisit\(\);/u);
  assert.match(guarded.text, /if \(!wasRebuiltByStudio\(this\)\) this\.beginVisit\(\);/u);
  assert.deepEqual(guarded.findings, []);
});

test('a call that is already guarded is left as it is', () => {
  const once = m4GuardRebuiltConnected(reference, target()).text;
  const twice = m4GuardRebuiltConnected(once, target());
  assert.equal(twice.text, once);
  assert.deepEqual(twice.findings, []);
});

test('a call that is not one statement line is left unchanged and reported', () => {
  const folded = reference.replace(
    '    this.resetVisit();\n    subscribe([...STATE_KEYS], this);',
    '    if (ready) {\n      this.resetVisit();\n    }\n    subscribe([...STATE_KEYS], this);',
  );
  const guarded = m4GuardRebuiltConnected(folded, target());
  assert.match(guarded.text, /if \(ready\) \{\n {6}this\.resetVisit\(\);/u);
  assert.equal(guarded.text.includes('if (!wasRebuiltByStudio(this)) this.resetVisit();'), false);
  assert.match(guarded.text, /if \(!wasRebuiltByStudio\(this\)\) this\.applyEntryParams\(\);/u);
  assert.deepEqual(guarded.findings.map(item => item.code), ['GUARD_NOT_APPLIED']);
  assert.match(guarded.findings[0].message, /resetVisit/u);
});

test('the gate accepts the guarded shared and still refuses a visit without a reset', () => {
  const guarded = m4GuardRebuiltConnected(reference, target()).text;
  assert.deepEqual(gateM4SharedSource(guarded, target()), []);
  const stale = guarded.replace(/if \(!wasRebuiltByStudio\(this\)\) this\.resetVisit\(\);\n/u, '');
  assert.ok(gateM4SharedSource(stale, target()).some(item => item.code === 'M4_SHARED_VISIT_RESET'));
});
