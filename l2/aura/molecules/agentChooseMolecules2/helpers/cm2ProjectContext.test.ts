/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2ProjectContext.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProjectContext } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2ProjectContext.js';

void test('empty declared languages yields no section at all — never padded with a guess', () => {
  assert.equal(formatProjectContext([]), '');
});

void test('declared languages produce a short, factual section', () => {
  const section = formatProjectContext(['en']);
  assert.match(section, /## Project context/);
  assert.match(section, /declares language\(s\): en/);
});

void test('multiple declared languages are all listed', () => {
  assert.match(formatProjectContext(['pt-BR', 'en', 'es']), /pt-BR, en, es/);
});
