/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import type { D2MoleculeGroup, D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import type { L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import {
  genomeUxBaseChoice, genomeUxEffectiveTemplate, genomeUxExperience, genomeUxForbidden, genomeUxGenome, genomeUxIsBase, genomeUxReceiptInfo, genomeUxRules,
  genomeUxTemplateInfo, genomeUxUseMolecules, genomeUxVariantInfo, parseGenomeUxEntry,
} from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import {
  genomeUxAllowedInventory, genomeUxDecisionMolecules, genomeUxDecisionPrompt, genomeUxDecisionSchema, genomeUxDecisionTags, genomeUxToolPayload,
} from '/_102020_/l2/aura/agentGenomeUx/genomeUxPrompts.js';

void test('entry: module, layout 1..9 (1 = base mode), pages normalized, materialize and force', () => {
  assert.deepEqual(parseGenomeUxEntry('{"module":"reembolsoDespesas","layout":2}'), { kind: 'run', entry: { module: 'reembolsoDespesas', layout: 2, pages: [], materialize: false, force: false } });
  const run = parseGenomeUxEntry('@@agentGenomeUx {"module":"m","layout":"3","pages":["_102047_/l2/m/web/desktop/page11/a_b.defs.ts","c"],"materialize":true}');
  assert.deepEqual(run, { kind: 'run', entry: { module: 'm', layout: 3, pages: ['a_b', 'c'], materialize: true, force: false } });
  assert.deepEqual(parseGenomeUxEntry('{"module":"m","layout":1,"pages":["p"],"materialize":true}'), { kind: 'run', entry: { module: 'm', layout: 1, pages: ['p'], materialize: true, force: false } });
  for (const bad of ['{"module":"m","layout":0}', '{"module":"m","layout":10}', '{"module":"m","layout":1.5}', '{"module":"M","layout":2}', '{"module":"m","layout":2,"ds":1}', 'not json', '{"module":"m","layout":2,"materialize":"yes"}']) {
    assert.equal(parseGenomeUxEntry(bad).kind, 'refusal', bad);
  }
  assert.equal(genomeUxGenome(2), 'page21');
  assert.equal(genomeUxGenome(1), 'page11');
  assert.equal(genomeUxIsBase(1), true);
  assert.equal(genomeUxIsBase(2), false);
  assert.throws(() => genomeUxGenome(0), /GENOME_UX_LAYOUT/u);
  assert.throws(() => genomeUxGenome(10), /GENOME_UX_LAYOUT/u);
  // base mode: the receipt and the written defs are page11's
  assert.deepEqual(genomeUxReceiptInfo(102047, 'm', genomeUxGenome(1), 'p'), { project: 102047, level: 2, folder: 'm/pipeline/agentGenomeUx/page11', shortName: 'p', extension: '.json' });
  assert.deepEqual(genomeUxVariantInfo(102047, 'm', 'p', 'desktop', genomeUxGenome(1)), { project: 102047, level: 2, folder: 'm/web/desktop/page11', shortName: 'p', extension: '.defs.ts' });
});

void test('base choice: the UX 1 entry only when it differs from the page11 template', () => {
  const page11 = '_102020_/l4/collabux/templates/financialTransactions/page21.md';
  const due = '_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md';
  assert.equal(genomeUxBaseChoice(null, 'm', 'p', page11), null);
  assert.equal(genomeUxBaseChoice({ templates: { pages: { 'm/p': due } } }, 'm', 'p', page11), due);
  assert.equal(genomeUxBaseChoice({ templates: { pages: { 'm/p': due } } }, 'm', 'other', page11), null);
  // already applied: page11 carries the chosen template
  assert.equal(genomeUxBaseChoice({ templates: { pages: { 'm/p': due } } }, 'm', 'p', due), null);
});

void test('paths: variant defs inside page{N}1, receipt in the agent pipeline folder, template file from its path', () => {
  assert.deepEqual(genomeUxVariantInfo(102047, 'm', 'p', 'mobile', 'page21'), { project: 102047, level: 2, folder: 'm/web/mobile/page21', shortName: 'p', extension: '.defs.ts' });
  assert.deepEqual(genomeUxReceiptInfo(102047, 'm', 'page21', 'p'), { project: 102047, level: 2, folder: 'm/pipeline/agentGenomeUx/page21', shortName: 'p', extension: '.json' });
  assert.deepEqual(genomeUxTemplateInfo('_102020_/l4/collabux/templates/approvalWorkflow/decisionFirst.md'), { project: 102020, level: 4, folder: 'collabux/templates/approvalWorkflow', shortName: 'decisionFirst', extension: '.md' });
  assert.equal(genomeUxTemplateInfo('bespoke'), null);
  assert.equal(genomeUxTemplateInfo('_102020_/l4/../x.md'), null);
});

void test('template: the UX entry wins over page11; experience from the index, page11 or the file name; useMolecules defaults to true', () => {
  const page11 = { category: '_102020_/l4/collabux/templates/financialTransactions/page21.md', experience: 'ledgerTable' };
  const layout = { templates: { pages: { 'm/p': '_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md' } } };
  assert.deepEqual(genomeUxEffectiveTemplate(layout, 'm', 'p', page11.category), { path: '_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md', isDefault: false });
  assert.deepEqual(genomeUxEffectiveTemplate(layout, 'm', 'other', page11.category), { path: page11.category, isDefault: true });
  assert.deepEqual(genomeUxEffectiveTemplate(null, 'm', 'p', page11.category), { path: page11.category, isDefault: true });
  const index = { categories: { financialTransactions: [{ experience: 'ledgerTable', file: 'financialTransactions/page21.md' }, { experience: 'dueAgenda', file: 'financialTransactions/dueAgenda.md' }] } };
  assert.equal(genomeUxExperience('_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md', index, page11), 'dueAgenda');
  assert.equal(genomeUxExperience(page11.category, null, page11), 'ledgerTable');
  assert.equal(genomeUxExperience('_102020_/l4/collabux/templates/x/paymentWizard.md', null, page11), 'paymentWizard');
  assert.equal(genomeUxExperience('_102020_/l4/collabux/templates/x/page31.md', null, page11), null);
  assert.equal(genomeUxUseMolecules(undefined), true);
  assert.equal(genomeUxUseMolecules({ useMolecules: true }), true);
  assert.equal(genomeUxUseMolecules({ useMolecules: false }), false);
});

void test('rules: none for a legacy template or bespoke, the block otherwise, error for an unreadable block; forbid ignores case', () => {
  assert.deepEqual(genomeUxRules('# page21\n\nprose'), { kind: 'none' });
  assert.deepEqual(genomeUxRules(null), { kind: 'none' });
  const ruled = genomeUxRules('## Molecule rules\n\n```json\n{ "axes": { "recordsView": "grid" }, "groups": { "prefer": ["groupViewCard"], "forbid": ["groupViewTable"] } }\n```\n', ['groupViewCard', 'groupViewTable']);
  assert.deepEqual(ruled, { kind: 'rules', rules: { axes: { recordsView: 'grid' }, prefer: ['groupViewCard'], forbid: ['groupViewTable'] }, problems: [] });
  assert.equal(genomeUxRules('## Molecule rules\n\n```json\n{ nope\n```\n').kind, 'error');
  assert.equal(genomeUxRules('## Molecule rules\n\n```json\n{ "axes": {}, "groups": { "prefer": "x", "forbid": [] } }\n```\n').kind, 'error');
  assert.equal(genomeUxForbidden('groupviewtable--ml-data-table', ['groupViewTable']), true);
  assert.equal(genomeUxForbidden('groupViewTable', ['GROUPVIEWTABLE']), true);
  assert.equal(genomeUxForbidden('groupviewdata--ml-x', ['groupViewTable']), false);
});

const definition = (organisms: string[], molecules: L2Page11Definition['molecules'] = {}): L2Page11Definition => ({
  template: { category: 't', experience: 'e' }, intent: 'i', sections: [{ id: 's', priority: 'primary', purpose: 'p', organisms }],
  organisms: Object.fromEntries(organisms.map(id => [id, { kind: 'list', text: 't', intents: [] }])), molecules,
});

void test('prompts: forbidden groups leave the inventory, the tags enum and the page11 reference; the decision answer is read per device', () => {
  const inventory = { groups: [{ groupId: 'groupViewTable' }, { groupId: 'groupViewData' }], sourceHash: 'h' } as D2MoleculeInventory;
  assert.deepEqual(genomeUxAllowedInventory(inventory, ['groupviewtable']).groups.map(group => group.groupId), ['groupViewData']);
  const groups = [{ groupId: 'groupViewTable', tags: ['groupviewtable--ml-data-table'] }, { groupId: 'groupViewData', tags: ['groupviewdata--ml-list'] }] as D2MoleculeGroup[];
  assert.deepEqual(genomeUxDecisionTags({ a: ['groupViewTable', 'groupViewData'] }, groups, ['groupViewTable']), ['groupviewdata--ml-list']);

  const page11 = definition(['a'], { a: [{ role: 'tabela', preferred: 'groupviewtable--ml-data-table', alternative: 'groupviewdata--ml-list' }] });
  const prompt = JSON.parse(genomeUxDecisionPrompt({ pageId: 'p', page11: { desktop: page11, mobile: page11 }, selected: { a: ['groupViewData'] }, groups,
    pageData: { states: null, rowTypes: null },
    template: { path: 'x.md', experience: 'e', text: 'never a table', rules: { axes: {}, prefer: [], forbid: ['groupViewTable'] } } }));
  assert.equal(prompt.pageData, null);
  assert.deepEqual(prompt.page11Molecules.desktop, {});
  assert.deepEqual(prompt.template.rules.forbid, ['groupViewTable']);
  assert.deepEqual(prompt.moleculeResearch.groups.map((group: { groupId: string }) => group.groupId), ['groupViewData']);

  const schema = genomeUxDecisionSchema(['a'], ['groupviewdata--ml-list']) as { required: string[] };
  assert.deepEqual(schema.required, ['desktop', 'mobile', 'reason']);

  const answer = { type: 'flexible', result: { toolName: 'submitGenomeUxMolecules', arguments: JSON.stringify({
    desktop: { molecules: [{ id: 'a', recommendations: [{ role: ' lista ', preferred: 'groupviewdata--ml-list', alternative: '' }] }, { id: 'b', recommendations: [] }] },
    mobile: { molecules: [] }, reason: 'r' }) } };
  const molecules = genomeUxDecisionMolecules(genomeUxToolPayload(answer, 'submitGenomeUxMolecules'));
  assert.deepEqual(molecules, { desktop: { a: [{ role: 'lista', preferred: 'groupviewdata--ml-list' }] }, mobile: {} });
  assert.throws(() => genomeUxToolPayload(answer, 'submitGenomeUxGroups'), /GENOME_UX_TOOL_MISMATCH/u);
  assert.throws(() => genomeUxDecisionMolecules({ desktop: { molecules: [] } }), /GENOME_UX_RESPONSE_SHAPE: mobile/u);
  assert.throws(() => genomeUxDecisionMolecules({ desktop: { molecules: [{ id: 'a', recommendations: [] }, { id: 'a', recommendations: [] }] }, mobile: { molecules: [] } }), /GENOME_UX_RESPONSE_DUPLICATE/u);
});
