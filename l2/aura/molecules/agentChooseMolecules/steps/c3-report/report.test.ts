/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/steps/c3-report/report.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ChGroupArtifact, ChPromptSize, ChRegion } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { ChRunFacts, buildChRunReport, renderChRunSummary } from '/_102020_/l2/aura/molecules/agentChooseMolecules/steps/c3-report/report.js';

const SAVED_AT = '2026-08-19T12:00:00.000Z';

function size(planId: string, catalogTokensEst: number, totalTokensEst: number, attempt = 1): ChPromptSize {
  return {
    planId,
    attempt,
    modelType: 'reasoning',
    instructionChars: 0,
    catalogChars: catalogTokensEst * 4,
    inputChars: 0,
    totalChars: totalTokensEst * 4,
    instructionTokensEst: 0,
    catalogTokensEst,
    inputTokensEst: 0,
    totalTokensEst,
  };
}

function groupArtifact(over: Partial<ChGroupArtifact>): ChGroupArtifact {
  return {
    schemaVersion: 1,
    savedAt: SAVED_AT,
    runKey: 'cadastro',
    group: 'groupEnterText',
    indexDefsReference: '/_102040_/l2/molecules/groupentertext/index.defs',
    catalogVia: 'published',
    choices: [],
    ok: true,
    gateHits: 0,
    chosenWithoutDefs: [],
    errors: [],
    ...over,
  };
}

function facts(over: Partial<ChRunFacts>): ChRunFacts {
  return {
    savedAt: SAVED_AT,
    runKey: 'cadastro',
    definition: 'Cadastro de cliente: nome e CPF',
    userLanguage: 'pt',
    level1Reference: '/_102040_/l2/molecules/skill',
    level1Via: 'published',
    publishedGroups: ['groupEnterText'],
    regions: [],
    groups: [],
    sizes: [],
    tagIssues: { invented: 0, short: 0, case: 0 },
    attemptsRefused: 0,
    ...over,
  };
}

const REGIONS: ChRegion[] = [
  { region: 'nome', need: 'nome completo', group: 'groupEnterText', reason: 'texto livre' },
  { region: 'grafico', need: 'gráfico de vendas', group: null, reason: 'nenhum grupo publicado tem gráfico' },
];

void test('joins each region to the molecule chosen for it', () => {
  const report = buildChRunReport(facts({
    regions: REGIONS,
    groups: [groupArtifact({
      choices: [{ region: 'nome', group: 'groupEnterText', tag: 'groupentertext--ml-enter-text', scenarioUsed: null, reason: 'texto simples' }],
    })],
  }), 4);

  assert.equal(report.rows.length, 2);
  assert.equal(report.rows[0].tag, 'groupentertext--ml-enter-text');
  assert.equal(report.rows[1].group, null);
  assert.equal(report.rows[1].tag, null);
  assert.equal(report.totals.regionsWithoutGroup, 1);
  assert.equal(report.totals.regionsWithoutMolecule, 0);
});

void test('a region whose group answered "none" is counted apart from one with no group', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    groups: [groupArtifact({
      choices: [{ region: 'nome', group: 'groupEnterText', tag: null, scenarioUsed: null, reason: 'nada neste grupo serve' }],
    })],
  }), 4);
  assert.equal(report.totals.regionsWithoutGroup, 0);
  assert.equal(report.totals.regionsWithoutMolecule, 1);
  assert.match(report.notes.join('\n'), /não tem molécula para ela/);
});

void test('a group with no accepted answer is reported, never dropped', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    groups: [groupArtifact({ ok: false, errors: ['tag_invented: ...'] })],
  }), 4);
  assert.deepEqual(report.totals.groupsNotAnswered, ['groupEnterText']);
  assert.match(report.notes.join('\n'), /nenhuma resposta aceita/);
});

void test('choosing a molecule marked as outside the contract is noted', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    groups: [groupArtifact({
      choices: [{ region: 'nome', group: 'groupEnterText', tag: 'groupselectmany--ml-table-multi-select', scenarioUsed: null, reason: 'r' }],
      chosenWithoutDefs: ['groupselectmany--ml-table-multi-select'],
    })],
  }), 4);
  assert.match(report.notes.join('\n'), /fora de contrato/);
});

void test('the gate history is carried, and no invented tag ever reaches an artifact', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    groups: [groupArtifact({ gateHits: 1 })],
    tagIssues: { invented: 2, short: 1, case: 0 },
    attemptsRefused: 3,
  }), 4);
  assert.equal(report.gates.inventedTagsInArtifacts, 0);
  assert.equal(report.gates.attemptsRefused, 3);
  assert.equal(report.gates.tagIssues.invented, 2);
});

void test('the prompt sizes are summed per catalog and per total', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    sizes: [size('c1-groups', 387, 900), size('c2-groupentertext', 928, 1500)],
  }), 4);
  assert.equal(report.sizes.catalogTokensEstTotal, 1315);
  assert.equal(report.sizes.totalTokensEstTotal, 2400);
  assert.equal(report.sizes.charsPerTokenAssumed, 4);
});

void test('the summary shows the joined table, the zero and the estimate caveat', () => {
  const report = buildChRunReport(facts({
    regions: REGIONS,
    groups: [groupArtifact({
      choices: [{ region: 'nome', group: 'groupEnterText', tag: 'groupentertext--ml-enter-text', scenarioUsed: 'Simple text', reason: 'r' }],
    })],
    sizes: [size('c1-groups', 387, 900)],
  }), 4);
  const text = renderChRunSummary(report);
  assert.match(text, /\| nome \| groupEnterText \| groupentertext--ml-enter-text \| Simple text \|/);
  assert.match(text, /\| grafico \| — \(nenhum\) \| — \(nenhuma\) \| — \|/);
  assert.match(text, /tags inventadas que chegaram ao artefato: \*\*0\*\*/);
  assert.match(text, /4 chars\/token/);
  assert.match(text, /pontuação contra o gabarito é manual/);
});

void test('a catalog read from the local cache is reported as a finding', () => {
  const report = buildChRunReport(facts({
    regions: [REGIONS[0]],
    groups: [groupArtifact({ catalogVia: 'local-cache' })],
  }), 4);
  assert.deepEqual(report.catalog.groupsViaLocalCache, ['groupEnterText']);
  assert.match(report.notes.join('\n'), /CACHE LOCAL/);
  assert.match(renderChRunSummary(report), /CACHE LOCAL/);
});

void test('a catalog served by the published project leaves no such note', () => {
  const report = buildChRunReport(facts({ regions: [REGIONS[0]], groups: [groupArtifact({})] }), 4);
  assert.deepEqual(report.catalog.groupsViaLocalCache, []);
  assert.equal(report.notes.some(note => note.includes('CACHE LOCAL')), false);
});
