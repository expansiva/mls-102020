/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxVariant.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseL2Page11, type L2Page11Definition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import type { D2MoleculeGroup } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { defsWithoutHistory } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';
import { genomeUxBaseChoice, genomeUxEffectiveTemplate, genomeUxExperience, genomeUxGenome, genomeUxRules, type GenomeUxDevice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import type { IUxExperienceIndex, IUxLayout } from '/_102020_/l2/aura/helpers/uxTemplates.js';
import { buildGenomeUxReceipt, genomeUxCurrentFromTexts, genomeUxPage11ContractHash, genomeUxStale } from '/_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.js';
import { buildGenomeUxVariant, gateGenomeUxMolecules, renderGenomeUxDefs, sanitizeGenomeUxMolecules, type GenomeUxMolecules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxVariant.js';

// mls-102020/l2/aura/agentGenomeUx → mls-base root
const ROOT = new URL('../../../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8');
const PAGE = 'despesas_aprovadas';
// A real page of 102047, which is also the Studio's defs-history smoke project: a saved edit adds a history block.
const page11Source = (device: GenomeUxDevice) => defsWithoutHistory(read(`mls-102047/l2/reembolsoDespesas/web/${device}/page11/${PAGE}.defs.ts`));
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

// ─── base mode (UX 1, TASK-102020-genome-ux-4) ─────────────────────────────────

const LEDGER = '_102020_/l4/collabux/templates/financialTransactions/page21.md';
const page11Texts = (): Record<GenomeUxDevice, string> => ({ desktop: page11Source('desktop'), mobile: page11Source('mobile') });

/** What agentGenomeUx base mode writes for despesas_aprovadas with dueAgenda chosen for UX 1, and its receipt. */
async function baseRun(layoutEntry: IUxLayout) {
  const original = page11('desktop').template;
  const effective = genomeUxEffectiveTemplate(layoutEntry, 'reembolsoDespesas', PAGE, original.category);
  const text = read('mls-102020/l4/collabux/templates/financialTransactions/dueAgenda.md');
  const rules = genomeUxRules(text);
  const written = {} as Record<GenomeUxDevice, string>;
  for (const device of ['desktop', 'mobile'] as const) {
    const base = page11(device);
    const definition = buildGenomeUxVariant(base, { category: effective.path, experience: 'dueAgenda' }, CHOICE);
    written[device] = renderGenomeUxDefs({ project: 102047, module: 'reembolsoDespesas', pageId: PAGE, device, genome: genomeUxGenome(1) }, definition, base);
  }
  const pageData = { contract: 'contract', shared: 'shared' };
  const receipt = await buildGenomeUxReceipt({
    project: 102047, module: 'reembolsoDespesas', layout: 1, genome: genomeUxGenome(1), pageId: PAGE,
    template: { path: effective.path, experience: 'dueAgenda', isDefault: effective.isDefault, text, rules },
    page11: page11Texts(), pageData, useMolecules: true, catalogHash: null, moleculeHashes: {}, selectedGroups: {}, dropped: [], variants: written,
  });
  /** The base verdict once page11 on disk is `onDisk` (the agent's output by default) and UX 1 is `entry`. */
  const verdict = async (onDisk: Record<GenomeUxDevice, string> = written, entry: IUxLayout | null = layoutEntry) => {
    const current = genomeUxEffectiveTemplate(entry, 'reembolsoDespesas', PAGE, parseL2Page11(onDisk.desktop).definition.template.category).path;
    return genomeUxStale(receipt, await genomeUxCurrentFromTexts({ templatePath: current, templateText: text, rules, page11: onDisk, pageData, variants: onDisk, useMolecules: true }));
  };
  return { written, receipt, verdict, effective };
}

void test('base mode writes page11 itself with the chosen template, re-chosen molecules and the page11 organisms, and passes parseL2Page11', async () => {
  const layoutEntry: IUxLayout = { name: 'Default', templates: { pages: { [`reembolsoDespesas/${PAGE}`]: DUE_AGENDA } } };
  assert.equal(page11('desktop').template.category, LEDGER);
  assert.equal(genomeUxBaseChoice(layoutEntry, 'reembolsoDespesas', PAGE, LEDGER), DUE_AGENDA);
  const { written, receipt, effective } = await baseRun(layoutEntry);
  assert.deepEqual(effective, { path: DUE_AGENDA, isDefault: false });
  for (const device of ['desktop', 'mobile'] as const) {
    const text = written[device];
    assert.match(text, new RegExp(`^/// <mls fileReference="_102047_/l2/reembolsoDespesas/web/${device}/page11/${PAGE}\\.defs\\.ts" enhancement="_blank"/>\\n\\nexport const definition = \\{`, 'u'));
    const parsed = parseL2Page11(text);
    assert.deepEqual(parsed.location, { project: 102047, module: 'reembolsoDespesas', device, genome: 'page11', pageId: PAGE });
    assert.deepEqual(parsed.definition.template, { category: DUE_AGENDA, experience: 'dueAgenda' });
    assert.equal(contractOf(parsed.definition), contractOf(page11(device)));
    assert.deepEqual(parsed.definition.molecules, CHOICE);
    assert.notDeepEqual(parsed.definition.molecules, page11(device).molecules);
  }
  assert.equal(receipt.layout, 1);
  assert.equal(receipt.genome, 'page11');
  assert.equal(receipt.template.path, DUE_AGENDA);
  assert.match(receipt.variantHashes.desktop, /^sha256:[0-9a-f]{64}$/u);
});

void test('base mode stale: fresh while page11 is what was written; stale when page11 is rewritten or another template is chosen', async () => {
  const layoutEntry: IUxLayout = { templates: { pages: { [`reembolsoDespesas/${PAGE}`]: DUE_AGENDA } } };
  const { written, verdict } = await baseRun(layoutEntry);
  assert.deepEqual(await verdict(), { stale: false, reasons: [] });
  // "keep the current template" after applying: no entry, page11 carries the chosen template — still fresh
  assert.deepEqual(await verdict(written, { name: 'Default' }), { stale: false, reasons: [] });
  // agentDefsL2 rewrote page11 afterwards keeping the applied template (part B): accepted, not stale
  const moleculesOnly = { ...written, desktop: written.desktop.replace('groupviewdata--ml-vertical-record-list', 'groupviewdata--ml-list') };
  assert.notEqual(moleculesOnly.desktop, written.desktop);
  assert.deepEqual(await verdict(moleculesOnly), { stale: false, reasons: [] });
  // page11 back to the category default template while the choice stays dueAgenda
  assert.deepEqual((await verdict(page11Texts())).reasons, ['variant']);
  // page11 back to the default and the entry removed: the template in effect is no longer the one applied
  assert.deepEqual((await verdict(page11Texts(), null)).reasons, ['template', 'variant']);
  // another template chosen for UX 1
  assert.deepEqual((await verdict(written, { templates: { pages: { [`reembolsoDespesas/${PAGE}`]: LEDGER } } })).reasons, ['template']);
});

void test('UX >= 2 stale ignores a template/molecules-only change of page11 but sees an organisms change (decision 4)', async () => {
  const texts = page11Texts();
  const variant = { desktop: 'variant desktop', mobile: 'variant mobile' };
  const receipt = await buildGenomeUxReceipt({
    project: 102047, module: 'reembolsoDespesas', layout: 2, genome: 'page21', pageId: PAGE,
    template: { path: DUE_AGENDA, experience: 'dueAgenda', isDefault: false, text: 'tpl', rules: genomeUxRules('tpl') },
    page11: texts, pageData: { contract: null, shared: null }, useMolecules: true, catalogHash: null, moleculeHashes: {}, selectedGroups: {}, dropped: [], variants: variant,
  });
  const verdict = async (page11: Record<GenomeUxDevice, string>) => genomeUxStale(receipt, await genomeUxCurrentFromTexts({
    templatePath: DUE_AGENDA, templateText: 'tpl', rules: genomeUxRules('tpl'), pageData: { contract: null, shared: null }, variants: variant, useMolecules: true, page11,
  }));
  assert.deepEqual(await verdict(texts), { stale: false, reasons: [] });
  // base mode applied dueAgenda to page11: template and molecules changed, the inherited part did not
  const { written } = await baseRun({ templates: { pages: { [`reembolsoDespesas/${PAGE}`]: DUE_AGENDA } } });
  assert.notEqual(written.desktop, texts.desktop);
  assert.deepEqual(await verdict(written), { stale: false, reasons: [] });
  assert.equal(await genomeUxPage11ContractHash(texts.desktop), await genomeUxPage11ContractHash(written.desktop));
  // the same content in another key order and layout hashes the same
  const reordered = (source: string) => {
    const { location, definition } = parseL2Page11(source);
    const ordered = { molecules: definition.molecules, organisms: definition.organisms, template: definition.template, sections: definition.sections, intent: definition.intent };
    return `/// <mls fileReference="_${location.project}_/l2/${location.module}/web/${location.device}/${location.genome}/${location.pageId}.defs.ts" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(ordered)} as const;\n`;
  };
  assert.deepEqual(await verdict({ desktop: reordered(texts.desktop), mobile: texts.mobile }), { stale: false, reasons: [] });
  // an organism changed on mobile: what the variant copies changed
  const organisms = { ...texts, mobile: texts.mobile.replace('"kind": "detail"', '"kind": "summary"') };
  assert.notEqual(organisms.mobile, texts.mobile);
  assert.deepEqual(await verdict(organisms), { stale: true, reasons: ['page11'] });
});
