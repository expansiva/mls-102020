/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxVariant.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseL2Page11, type L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { genomeUxEffectiveTemplate, genomeUxExperience, genomeUxRules, type GenomeUxDevice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import type { IUxExperienceIndex } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import { buildGenomeUxVariant, gateGenomeUxMolecules, renderGenomeUxDefs, sanitizeGenomeUxMolecules, type GenomeUxMolecules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxVariant.js';

// mls-102020/l2/aura/agentGenomeUx → mls-base root
const ROOT = new URL('../../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8');
const PAGE = 'despesas_aprovadas';
const page11Source = (device: GenomeUxDevice) => read(`mls-102047/l2/reembolsoDespesas/web/${device}/page11/${PAGE}.defs.ts`);
const page11 = (device: GenomeUxDevice) => parseL2Page11(page11Source(device)).definition;
const DUE_AGENDA = '_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md';

/** A fixed molecule choice for dueAgenda (no table: the template forbids groupViewTable). */
const CHOICE: GenomeUxMolecules = {
  despesasAprovadasLista: [
    { role: 'agenda de vencimentos', preferred: 'groupviewdata--ml-vertical-record-list' },
    { role: 'pagar', preferred: 'grouptriggeraction--ml-button-standard' },
  ],
  registroPagamentoForm: [{ role: 'data de pagamento', preferred: 'groupenterdate--ml-date-picker', alternative: 'groupenterdate--ml-date-shortcut-picker' }],
};

const contractOf = (definition: Pick<L2Page11Definition, 'intent' | 'sections' | 'organisms'>) => JSON.stringify({ intent: definition.intent, sections: definition.sections, organisms: definition.organisms });

void test('the variant keeps the page11 organisms, intents and sections with the template swapped, and passes parseL2Page11 on both devices (mls-102047 despesas_aprovadas → dueAgenda)', () => {
  const index = JSON.parse(read('mls-102020/l4/collabux/templates/experienceIndex.json')) as IUxExperienceIndex;
  const layout = { name: 'Ux 2', templates: { pages: { [`reembolsoDespesas/${PAGE}`]: DUE_AGENDA } } };
  const original = page11('desktop').template;
  const effective = genomeUxEffectiveTemplate(layout, 'reembolsoDespesas', PAGE, original.category);
  assert.deepEqual(effective, { path: DUE_AGENDA, isDefault: false });
  const experience = genomeUxExperience(effective.path, index, original);
  assert.equal(experience, 'dueAgenda');
  const rules = genomeUxRules(read('mls-102020/l4/collabux/templates/financialTransactions/dueAgenda.md'));
  assert.equal(rules.kind, 'rules');

  for (const device of ['desktop', 'mobile'] as const) {
    const base = page11(device);
    const variant = buildGenomeUxVariant(base, { category: effective.path, experience: experience! }, CHOICE);
    const text = renderGenomeUxDefs({ project: 102047, module: 'reembolsoDespesas', pageId: PAGE, device, genome: 'page21' }, variant, base);
    assert.match(text, new RegExp(`^/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/${device}/page21/${PAGE}\\.defs\\.ts" enhancement="_blank"/>\\n\\nexport const definition = \\{`, 'u'));
    assert.ok(text.endsWith('} as const;\n'));
    const parsed = parseL2Page11(text);
    assert.deepEqual(parsed.location, { project: 102047, module: 'reembolsoDespesas', device, genome: 'page21', pageId: PAGE });
    assert.deepEqual(parsed.definition.template, { category: DUE_AGENDA, experience: 'dueAgenda' });
    assert.equal(contractOf(parsed.definition), contractOf(base));
    assert.deepEqual(parsed.definition.molecules, CHOICE);
    // the template forbids groupViewTable, and the gate accepts this choice
    const forbid: string[] = rules.kind === 'rules' ? rules.rules.forbid : [];
    assert.ok(forbid.includes('groupViewTable'));
    const groups = [{ groupId: 'groupViewData', tags: ['groupviewdata--ml-vertical-record-list'] }, { groupId: 'groupTriggerAction', tags: ['grouptriggeraction--ml-button-standard'] },
      { groupId: 'groupEnterDate', tags: ['groupenterdate--ml-date-picker', 'groupenterdate--ml-date-shortcut-picker'] }] as D2MoleculeGroup[];
    const selected = { despesasAprovadasLista: ['groupViewData', 'groupTriggerAction'], registroPagamentoForm: ['groupEnterDate'] };
    assert.deepEqual(gateGenomeUxMolecules(CHOICE, { organismIds: Object.keys(base.organisms), selected, groups, forbid }), []);
  }
});

void test('a molecule of a forbidden group is refused by the variant gate (case-insensitive) and dropped by the last-resort sanitize', () => {
  const base = page11('desktop');
  const groups = [
    { groupId: 'groupViewTable', tags: ['groupviewtable--ml-data-table'] },
    { groupId: 'groupViewData', tags: ['groupviewdata--ml-vertical-record-list'] },
  ] as D2MoleculeGroup[];
  const selected = { despesasAprovadasLista: ['groupViewTable', 'groupViewData'] };
  const molecules: GenomeUxMolecules = { despesasAprovadasLista: [
    { role: 'tabela', preferred: 'groupviewtable--ml-data-table', alternative: 'groupviewdata--ml-vertical-record-list' },
    { role: 'só tabela', preferred: 'groupviewtable--ml-data-table' },
  ] };
  const input = { organismIds: Object.keys(base.organisms), selected, groups, forbid: ['GROUPVIEWTABLE'] };
  const errors = gateGenomeUxMolecules(molecules, input);
  assert.equal(errors.filter(error => error.startsWith('GENOME_UX_MOLECULE_FORBIDDEN')).length, 2);
  assert.ok(errors.every(error => error.includes('groupviewtable--ml-data-table')));

  const clean = sanitizeGenomeUxMolecules(molecules, input);
  assert.deepEqual(clean.molecules, { despesasAprovadasLista: [{ role: 'tabela', preferred: 'groupviewdata--ml-vertical-record-list' }] });
  assert.deepEqual(clean.dropped, ['despesasAprovadasLista/groupviewtable--ml-data-table', 'despesasAprovadasLista/groupviewtable--ml-data-table']);
  assert.deepEqual(gateGenomeUxMolecules(clean.molecules, input), []);

  // A tag outside the organism's chosen groups and an organism that is not in page11 are refused too.
  const stray = gateGenomeUxMolecules({ registroPagamentoForm: [{ role: 'x', preferred: 'groupviewdata--ml-vertical-record-list' }], ghost: [{ role: 'y', preferred: 'groupviewdata--ml-vertical-record-list' }] }, { ...input, forbid: [] });
  assert.ok(stray.some(error => error.startsWith('GENOME_UX_MOLECULE_ORGANISM: ghost')));
  assert.ok(stray.some(error => error.includes('D2_MOLECULE_ROLE_UNSELECTED: registroPagamentoForm/')));
  // Everything refused leaves the organism without molecules instead of breaking the template.
  assert.deepEqual(sanitizeGenomeUxMolecules({ despesasAprovadasLista: [{ role: 'só tabela', preferred: 'groupviewtable--ml-data-table' }] }, input).molecules, {});
});

void test('with useMolecules off the variant has no molecules key, and the text still passes parseL2Page11', () => {
  for (const device of ['desktop', 'mobile'] as const) {
    const base = page11(device);
    const variant = buildGenomeUxVariant(base, { category: DUE_AGENDA, experience: 'dueAgenda' }, null);
    assert.equal(Object.hasOwn(variant, 'molecules'), false);
    const text = renderGenomeUxDefs({ project: 102047, module: 'reembolsoDespesas', pageId: PAGE, device, genome: 'page31' }, variant, base);
    assert.doesNotMatch(text, /"molecules"/u);
    const parsed = parseL2Page11(text);
    assert.deepEqual(parsed.definition.molecules, {});
    assert.equal(parsed.location.genome, 'page31');
  }
});

void test('the render refuses a variant that does not keep the page11 contract or names a molecule organism page11 lacks', () => {
  const base = page11('desktop');
  const changed = { ...buildGenomeUxVariant(base, { category: DUE_AGENDA, experience: 'dueAgenda' }, {}), intent: 'outra' };
  assert.throws(() => renderGenomeUxDefs({ project: 102047, module: 'reembolsoDespesas', pageId: PAGE, device: 'desktop', genome: 'page21' }, changed, base), /GENOME_UX_RENDER_CONTRACT/u);
  assert.throws(() => buildGenomeUxVariant(base, { category: DUE_AGENDA, experience: 'dueAgenda' }, { ghost: [{ role: 'r', preferred: 'groupviewdata--ml-x' }] }), /GENOME_UX_MOLECULE_ORGANISM/u);
  assert.throws(() => renderGenomeUxDefs({ project: 102047, module: 'reembolsoDespesas', pageId: PAGE, device: 'desktop', genome: 'page21' },
    buildGenomeUxVariant(base, { category: DUE_AGENDA, experience: 'dueAgenda' }, { despesasAprovadasLista: [{ role: 'r', preferred: 'NotATag' }] }), base), /GENOME_UX_RENDER_GRAMMAR/u);
});
