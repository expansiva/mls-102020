/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxPageData.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { D2MoleculeGroup, D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { genomeUxPageData, genomeUxRowTypes } from '/_102020_/l2/aura/agentGenomeUx/genomeUxPageData.js';
import { GENOME_UX_DECISION_SYSTEM_PROMPT, genomeUxDecisionPrompt, genomeUxGroupsPrompt, genomeUxOrganismSources } from '/_102020_/l2/aura/agentGenomeUx/genomeUxPrompts.js';

// The case that motivated the page data (22/10/2026): tarefas/inicio_membro on trendWall got sparkline molecules
// although its contract returns only totals, no series.
const WEB = new URL('../../../../mls-102047/l2/tarefas/web/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, WEB), 'utf8');

void test('page data of a real page: the shared states per organism and the contract row types', () => {
  const data = genomeUxPageData(read('contracts/inicio_membro.defs.ts'), read('shared/inicio_membro.defs.ts'));
  assert.ok(data.states);
  assert.deepEqual(data.states.find(state => state.id === 'resumo')?.organisms, ['resumoMinhasTarefas']);
  assert.match(data.states.find(state => state.id === 'resumo')?.description ?? '', /totais/u);
  assert.ok(data.rowTypes);
  assert.match(data.rowTypes, /export interface ResumoMinhasTarefas \{[^}]*quantidadeAtrasadas: number;/u);
  assert.match(data.rowTypes, /\/\*\* Carga de trabalho da pessoa/u);
  assert.doesNotMatch(data.rowTypes, /Contracts \{/u);
});

void test('page data: missing or unreadable sources become null instead of failing', () => {
  assert.deepEqual(genomeUxPageData(null, null), { states: null, rowTypes: null });
  assert.deepEqual(genomeUxPageData('not a contract', 'not a shared'), { states: null, rowTypes: null });
  assert.equal(genomeUxRowTypes(read('contracts/inicio_membro.defs.ts').replace(/\n/gu, '\r\n')).includes('ResumoMinhasTarefas'), true);
});

void test('both prompts carry the page data, and the decision rules tie molecules and axes to it', () => {
  const data = genomeUxPageData(read('contracts/inicio_membro.defs.ts'), read('shared/inicio_membro.defs.ts'));
  const page11 = parseL2Page11(read('desktop/page11/inicio_membro.defs.ts')).definition;
  const template = { path: '_102020_/l4/collabux/templates/dashboardCommandCenter/trendWall.md', experience: 'trendWall', text: 'trend cells', rules: { axes: { metric: 'sparkline' }, prefer: ['groupViewMetric'], forbid: [] } };
  const groups = [{ groupId: 'groupViewMetric', tags: ['groupviewmetric--ml-metric-card'] }] as D2MoleculeGroup[];

  const decision = JSON.parse(genomeUxDecisionPrompt({ pageId: 'inicio_membro', page11: { desktop: page11, mobile: page11 }, template, pageData: data, selected: { resumoMinhasTarefas: ['groupViewMetric'] }, groups }));
  assert.match(decision.pageData.rowTypes, /quantidadeAtrasadas/u);
  assert.deepEqual(decision.pageData.states.map((state: { id: string }) => state.id), ['resumo', 'avisoDoDia', 'esperaPorMim']);

  const inventory = { groups: [{ groupId: 'groupViewMetric', purpose: 'metrics' }], sourceHash: 'h' } as unknown as D2MoleculeInventory;
  const groupsPrompt = genomeUxGroupsPrompt(inventory, genomeUxOrganismSources({ desktop: page11, mobile: page11 }), template, data);
  assert.match(groupsPrompt, /\nPageData: \{"states":\[/u);

  assert.match(GENOME_UX_DECISION_SYSTEM_PROMPT, /never choose one\s+that needs data the page does not return/u);
  assert.match(GENOME_UX_DECISION_SYSTEM_PROMPT, /when the data supports it/u);
});
