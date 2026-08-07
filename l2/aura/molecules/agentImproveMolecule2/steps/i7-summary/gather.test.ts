/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i7-summary/gather.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyRunFacts,
  findingsCarried,
  renderFindings,
  renderRunFacts,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i7-summary/gather.js';
import { ImCoherenceFinding } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const FINDINGS: ImCoherenceFinding[] = [
  { gate: 'declared-x-used', severity: 'preexisting', reference: 'ml-address-field.ts', message: "the slot 'Label' is declared and never read" },
  { gate: 'defs-x-slottags-x-contract', severity: 'introduced', reference: 'ml-x.ts', message: "the code declares the slot 'Detail' and the .defs.ts never mentions it" },
];

test('a run that changed nothing SAYS so, instead of rendering an empty list', () => {
  // An absent section reads to the model as "not shown to you", which is a different claim.
  const md = renderRunFacts({ ...emptyRunFacts(), tag: 'g--ml-x' });
  assert.match(md, /\*\*Files changed\*\*\n- none/);
  assert.match(md, /the molecule's public surface did not change/);
  assert.match(md, /the playground did not change/);
});

test('a no-op playground is explained, not just reported as false', () => {
  const md = renderRunFacts({ ...emptyRunFacts(), touched: ['less'], playgroundChanged: false });
  assert.match(md, /the demo was already correct/);
});

test('added slots are named next to the playground update', () => {
  const md = renderRunFacts({ ...emptyRunFacts(), playgroundChanged: true, addedSlots: ['Detail'], indexUpdated: true });
  assert.match(md, /updated, covering the new slot\(s\): Detail/);
  assert.match(md, /updated to match the playground/);
});

test('the route C choice is spelled out with its consequence', () => {
  const asLess = renderRunFacts({ ...emptyRunFacts(), inheritWhere: 'less' });
  assert.match(asLess, /keeps inheriting everything else/);

  const asOverride = renderRunFacts({ ...emptyRunFacts(), inheritWhere: 'override', inheritMember: 'getTriggerTemplate' });
  assert.match(asOverride, /no longer inherits that member/);
  assert.match(asOverride, /getTriggerTemplate/);
});

test('findings are numbered and separate what this run CAUSED from what it noticed', () => {
  const md = renderFindings(FINDINGS);
  assert.match(md, /^1\. \[ALREADY THERE\]/m);
  assert.match(md, /^2\. \[CAUSED BY THIS RUN\]/m);
});

test('no findings is stated as agreement, not as an empty section', () => {
  assert.match(renderFindings([]), /the contract, the code and the group agree/);
});

test('THE ONE CHECK: a summary that drops findings is caught', () => {
  // A model asked to write "a short summary" of ten problems writes about three. This agent exists
  // because 13 defects of exactly this shape were found by accident rather than by verification.
  assert.deepEqual(findingsCarried(['a', 'b'], FINDINGS), { ok: true, missing: 0 });
  assert.deepEqual(findingsCarried(['a'], FINDINGS), { ok: false, missing: 1 });
  assert.deepEqual(findingsCarried([], FINDINGS), { ok: false, missing: 2 });
  assert.deepEqual(findingsCarried([], []), { ok: true, missing: 0 });
});

test('blank lines do not count as carried findings', () => {
  assert.equal(findingsCarried(['a', '   ', ''], FINDINGS).ok, false);
});
