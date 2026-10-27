/// <mls fileReference="_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { GENOME_UX_RECEIPT_VERSION, genomeUxRules } from '/_102020_/l2/aura/agentGenomeUx/genomeUxCore.js';
import { buildGenomeUxReceipt, genomeUxCurrentFromTexts, genomeUxStale, type GenomeUxCurrentTexts } from '/_102020_/l2/aura/agentGenomeUx/genomeUxReceipt.js';

const TEMPLATE_PATH = '_102020_/l4/collabux/templates/financialTransactions/dueAgenda.md';
const rulesBlock = (forbid: string) => `## Molecule rules\n\n\`\`\`json\n{ "axes": { "recordsView": "list" }, "groups": { "prefer": ["groupViewData"], "forbid": ["${forbid}"] } }\n\`\`\`\n`;
const TEMPLATE = `# financialTransactions — dueAgenda\n\nProse.\n\n${rulesBlock('groupViewTable')}`;

async function fixture() {
  const texts: GenomeUxCurrentTexts = {
    templatePath: TEMPLATE_PATH, templateText: TEMPLATE, rules: genomeUxRules(TEMPLATE),
    page11: { desktop: 'page11 desktop', mobile: 'page11 mobile' },
    pageData: { contract: 'contract', shared: 'shared' },
    variants: { desktop: 'variant desktop', mobile: 'variant mobile' },
    useMolecules: true, catalogHash: 'sha256:catalog',
  };
  const receipt = await buildGenomeUxReceipt({
    project: 102047, module: 'reembolsoDespesas', layout: 2, genome: 'page21', pageId: 'despesas_aprovadas',
    template: { path: TEMPLATE_PATH, experience: 'dueAgenda', isDefault: false, text: TEMPLATE, rules: texts.rules },
    page11: { desktop: 'page11 desktop', mobile: 'page11 mobile' }, pageData: { contract: 'contract', shared: 'shared' }, useMolecules: true, catalogHash: 'sha256:catalog',
    moleculeHashes: {}, selectedGroups: {}, dropped: [], variants: { desktop: 'variant desktop', mobile: 'variant mobile' }, now: new Date('2026-10-22T00:00:00Z'),
  });
  return { texts, receipt };
}

void test('a receipt that matches every current input is fresh', async () => {
  const { texts, receipt } = await fixture();
  assert.equal(receipt.schemaVersion, GENOME_UX_RECEIPT_VERSION);
  assert.deepEqual(receipt.template.rules, { axes: { recordsView: 'list' }, prefer: ['groupViewData'], forbid: ['groupViewTable'] });
  assert.match(receipt.page11ContractHashes.desktop, /^sha256:[0-9a-f]{64}$/u);
  assert.equal(Object.hasOwn(receipt, 'page11Hashes'), false);
  assert.deepEqual(genomeUxStale(receipt, await genomeUxCurrentFromTexts(texts)), { stale: false, reasons: [] });
});

void test('stale detection: page11, page data, template, rules, catalog, useMolecules, an edited variant and a missing receipt', async () => {
  const { texts, receipt } = await fixture();
  const verdict = async (patch: Partial<GenomeUxCurrentTexts>) => genomeUxStale(receipt, await genomeUxCurrentFromTexts({ ...texts, ...patch }));

  assert.deepEqual(await verdict({ page11: { desktop: 'page11 desktop', mobile: 'page11 mobile changed' } }), { stale: true, reasons: ['page11'] });
  // the contract or the shared of the page changed: the prompts would see other data
  assert.deepEqual(await verdict({ pageData: { contract: 'contract changed', shared: 'shared' } }), { stale: true, reasons: ['pageData'] });
  assert.deepEqual(await verdict({ pageData: { contract: 'contract', shared: null } }), { stale: true, reasons: ['pageData'] });
  // prose only: the template changed, its rules did not
  const prose = TEMPLATE.replace('Prose.', 'Other prose.');
  assert.deepEqual(await verdict({ templateText: prose, rules: genomeUxRules(prose) }), { stale: true, reasons: ['template'] });
  // the rules changed (inside the template text)
  const ruled = TEMPLATE.replace(rulesBlock('groupViewTable'), rulesBlock('groupNavigateSteps'));
  assert.deepEqual(await verdict({ templateText: ruled, rules: genomeUxRules(ruled) }), { stale: true, reasons: ['template', 'rules'] });
  // another template chosen for the page in the UX
  assert.deepEqual((await verdict({ templatePath: '_102020_/l4/collabux/templates/financialTransactions/page21.md' })).reasons, ['template']);
  assert.deepEqual(await verdict({ catalogHash: 'sha256:other' }), { stale: true, reasons: ['catalog'] });
  // the catalog is compared only when the caller read it
  assert.deepEqual(await verdict({ catalogHash: undefined }), { stale: false, reasons: [] });
  assert.deepEqual(await verdict({ useMolecules: false }), { stale: true, reasons: ['useMolecules'] });
  assert.deepEqual(await verdict({ variants: { desktop: null, mobile: 'variant mobile' } }), { stale: true, reasons: ['variant'] });
  assert.deepEqual(await verdict({ variants: { desktop: 'variant desktop', mobile: 'edited by hand' } }), { stale: true, reasons: ['variant'] });

  const current = await genomeUxCurrentFromTexts(texts);
  assert.deepEqual(genomeUxStale(null, current), { stale: true, reasons: ['receipt'] });
  assert.deepEqual(genomeUxStale({ ...receipt, schemaVersion: 'old' as typeof GENOME_UX_RECEIPT_VERSION }, current), { stale: true, reasons: ['receipt'] });
  // a v2 receipt (whole-page11 hashes) is stale after the v3 bump
  assert.deepEqual(genomeUxStale({ ...receipt, schemaVersion: '2026-10-22-genome-ux-v2' as typeof GENOME_UX_RECEIPT_VERSION }, current), { stale: true, reasons: ['receipt'] });
});

void test('without molecules the receipt keeps no catalog hash and a catalog change does not make the page stale', async () => {
  const { texts } = await fixture();
  const receipt = await buildGenomeUxReceipt({
    project: 102047, module: 'reembolsoDespesas', layout: 3, genome: 'page31', pageId: 'despesas_aprovadas',
    template: { path: TEMPLATE_PATH, experience: 'dueAgenda', isDefault: false, text: TEMPLATE, rules: texts.rules },
    page11: { desktop: 'page11 desktop', mobile: 'page11 mobile' }, pageData: { contract: 'contract', shared: 'shared' }, useMolecules: false, catalogHash: 'sha256:catalog',
    moleculeHashes: {}, selectedGroups: {}, dropped: [], variants: { desktop: 'variant desktop', mobile: 'variant mobile' },
  });
  assert.equal(receipt.catalogHash, null);
  assert.deepEqual(genomeUxStale(receipt, await genomeUxCurrentFromTexts({ ...texts, useMolecules: false, catalogHash: 'sha256:other' })), { stale: false, reasons: [] });
});

void test('a legacy pageNN template has no rules: rulesHash null on both sides', async () => {
  const legacy = '# page21\n\nNo rules here.\n';
  const current = await genomeUxCurrentFromTexts({ templatePath: TEMPLATE_PATH, templateText: legacy, rules: genomeUxRules(legacy), page11: { desktop: 'a', mobile: 'b' }, pageData: { contract: null, shared: null }, variants: { desktop: 'c', mobile: 'd' }, useMolecules: true });
  assert.equal(current.rulesHash, null);
  assert.equal(Object.hasOwn(current, 'catalogHash'), false);
});
