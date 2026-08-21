/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chEntry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { chChooseCatalog, chParseEntry } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chEntry.js';

// ---- the mention ----

void test('prose alone is the normal case and asks for no project', () => {
  const entry = chParseEntry('Cadastro de cliente: nome completo, CPF e telefone');
  assert.equal(entry.catalogProject, null);
  assert.equal(entry.definition, 'Cadastro de cliente: nome completo, CPF e telefone');
  assert.equal(entry.error, '');
});

void test('the project can be named before the definition', () => {
  for (const raw of [
    '{ catalogProject: 102054 } Tela de checkout com seleção de país',
    '{catalogProject:102054} Tela de checkout com seleção de país',
    '{ "catalogProject": "102054" }  Tela de checkout com seleção de país',
  ]) {
    const entry = chParseEntry(raw);
    assert.equal(entry.catalogProject, 102054, raw);
    assert.equal(entry.definition, 'Tela de checkout com seleção de país', raw);
    assert.equal(entry.error, '', raw);
  }
});

void test('a brace inside the definition does not end the argument early', () => {
  const entry = chParseEntry('{ catalogProject: 102040 } Campo com máscara {000} para o código');
  assert.equal(entry.catalogProject, 102040);
  assert.equal(entry.definition, 'Campo com máscara {000} para o código');
});

void test('an unknown argument is refused with the accepted one named', () => {
  const entry = chParseEntry('{ project: 102040 } Cadastro de cliente');
  assert.equal(entry.catalogProject, null);
  assert.match(entry.error, /catalogProject/);
  // The definition still comes back, so the message can be about the argument alone.
  assert.equal(entry.definition, 'Cadastro de cliente');
});

void test('an argument that never closes is refused', () => {
  const entry = chParseEntry('{ catalogProject: 102040 Cadastro de cliente');
  assert.match(entry.error, /never closes/);
});

// ---- which catalog answers ----

const BASE = { activeProject: 102053, argProject: null, candidates: [] as number[], directDeps: [102040, 102054, 102055] };

void test('one catalog in a dependency is used with no question asked', () => {
  const choice = chChooseCatalog({ ...BASE, candidates: [102040] });
  assert.equal(choice.project, 102040);
  assert.equal(choice.selectedBy, 'dependency');
  assert.deepEqual(choice.warnings, []);
});

void test('a catalog in the active project reads as local — the copy scenario', () => {
  const choice = chChooseCatalog({ ...BASE, candidates: [102053] });
  assert.equal(choice.project, 102053);
  assert.equal(choice.selectedBy, 'local');
});

void test('two reachable catalogs refuse, and the message carries the argument that resolves it', () => {
  const choice = chChooseCatalog({ ...BASE, candidates: [102040, 102054] });
  assert.equal(choice.project, null);
  assert.match(choice.error, /more than one catalog/);
  assert.match(choice.error, /102040, 102054/);
  assert.match(choice.error, /catalogProject: 102040/);
});

void test('no catalog anywhere says where it looked', () => {
  const choice = chChooseCatalog({ ...BASE, candidates: [] });
  assert.equal(choice.project, null);
  assert.match(choice.error, /102053/);
  assert.match(choice.error, /102040, 102054, 102055/);
});

void test('the argument wins over the search', () => {
  const choice = chChooseCatalog({ ...BASE, argProject: 102054, candidates: [102040, 102054] });
  assert.equal(choice.project, 102054);
  assert.equal(choice.selectedBy, 'arg');
  assert.deepEqual(choice.warnings, []);
});

void test('an argument naming a project with no catalog is refused, with the ones that have it listed', () => {
  const choice = chChooseCatalog({ ...BASE, argProject: 102055, candidates: [102040] });
  assert.equal(choice.project, null);
  assert.match(choice.error, /102055 has no molecule catalog/);
  assert.match(choice.error, /102040/);
});

void test('a catalog outside the direct dependencies is allowed and warned about', () => {
  const choice = chChooseCatalog({ activeProject: 102040, argProject: 102054, candidates: [102040, 102054], directDeps: [102029] });
  assert.equal(choice.project, 102054);
  assert.equal(choice.warnings.length, 1);
  assert.match(choice.warnings[0], /cannot import/);
});
