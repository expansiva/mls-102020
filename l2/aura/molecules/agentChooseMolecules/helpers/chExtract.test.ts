/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { chExtractCatalogModule } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.js';

// The fixtures reproduce the shape the seeding generates, character for character where it matters:
// single quotes, one entry per line, a trailing block comment on the entry with no contract, comment
// lines between scenario entries, and an empty `recommended`.
const LEVEL1 = [
  "/// <mls fileReference=\"_102040_/l2/molecules/skill.ts\" enhancement=\"_blank\"/>",
  '',
  "export const project = '102040';",
  '',
  'export const theme = null;',
  '',
  'export const groups = [',
  "    { name: 'groupSelectOne', molecules: 12, indexDefs: '/_102040_/l2/molecules/groupselectone/index.defs' },",
  "    { name: 'groupEnterDate', molecules: 4, indexDefs: '/_102040_/l2/molecules/groupenterdate/index.defs' },",
  '];',
  '',
  'export const skill = `# Molecules — catálogo do projeto mls-102040 (PILOTO: 6 grupos)',
  '',
  '## Grupos disponíveis (piloto)',
  '',
  '| grupo | objetivo | moléculas |',
  '`;',
].join('\n');

const LEVEL2 = [
  "/// <mls fileReference=\"_102040_/l2/molecules/groupselectmany/index.defs.ts\" enhancement=\"_blank\"/>",
  '',
  "export const group = 'groupSelectMany';",
  '',
  "export const usageContract = '/_102020_/l2/aura/molecules/skills/groupSelectMany/usage';",
  '',
  'export const molecules = [',
  "    { tag: 'groupselectmany--ml-dual-list-select', layout: { selectMany: 'dual-list' }, defs: '/_102040_/l2/molecules/groupselectmany/ml-dual-list-select.defs' },",
  "    { tag: 'groupselectmany--ml-table-multi-select', defs: null /* ⚠ sem .defs.ts — fora de contrato */ },",
  "    { tag: 'groupselectmany--ml-tree-multi-select', layout: { selectMany: 'tree' }, defs: '/_102040_/l2/molecules/groupselectmany/ml-tree-multi-select.defs' },",
  '];',
  '',
  'export const scenarios = [',
  "    { scenario: 'All options should stay visible without opening a panel.', recommended: ['groupselectmany--ml-multi-checkbox-list', 'groupselectmany--ml-table-multi-select'] },",
  '    // ⚠ A linha abaixo recomenda, na tabela original, molécula de OUTRO grupo.',
  "    { scenario: 'Percentage', recommended: [] },",
  '];',
  '',
  'export const skill = `# groupSelectMany — moléculas disponíveis (mls-102040)',
  '',
  '- **groupselectmany--ml-table-multi-select** — ⚠ fora de contrato: sem .defs.ts.',
  '`;',
].join('\n');

void test('level 1: the groups and their index.defs references come out', () => {
  const { module, error } = chExtractCatalogModule(LEVEL1);
  assert.equal(error, '');
  assert.deepEqual(module?.groups, [
    { name: 'groupSelectOne', molecules: 12, indexDefs: '/_102040_/l2/molecules/groupselectone/index.defs' },
    { name: 'groupEnterDate', molecules: 4, indexDefs: '/_102040_/l2/molecules/groupenterdate/index.defs' },
  ]);
  assert.equal(module?.theme, null);
});

void test('level 1: the skill markdown comes out whole, and only the markdown', () => {
  const { module } = chExtractCatalogModule(LEVEL1);
  assert.ok(module?.skill?.startsWith('# Molecules — catálogo'));
  assert.ok(module?.skill?.includes('| grupo | objetivo | moléculas |'));
  assert.equal(module?.skill?.includes('export const'), false);
});

void test('level 2: every tag comes out in full, with the group prefix', () => {
  const { module } = chExtractCatalogModule(LEVEL2);
  assert.deepEqual(module?.molecules?.map(item => item.tag), [
    'groupselectmany--ml-dual-list-select',
    'groupselectmany--ml-table-multi-select',
    'groupselectmany--ml-tree-multi-select',
  ]);
});

void test('level 2: the molecule with no contract keeps its mark (defs null)', () => {
  const { module } = chExtractCatalogModule(LEVEL2);
  const marked = module?.molecules?.find(item => item.tag.endsWith('ml-table-multi-select'));
  assert.equal(marked?.defs, null);
  const normal = module?.molecules?.find(item => item.tag.endsWith('ml-tree-multi-select'));
  assert.equal(normal?.defs, '/_102040_/l2/molecules/groupselectmany/ml-tree-multi-select.defs');
});

void test('level 2: scenarios survive the comment lines and the empty recommendation', () => {
  const { module } = chExtractCatalogModule(LEVEL2);
  assert.deepEqual(module?.scenarios?.map(item => item.scenario), [
    'All options should stay visible without opening a panel.',
    'Percentage',
  ]);
  assert.deepEqual(module?.scenarios?.[1].recommended, []);
  assert.equal(module?.scenarios?.[0].recommended.length, 2);
});

void test('level 2: the group name and the usage contract reference come out', () => {
  const { module } = chExtractCatalogModule(LEVEL2);
  assert.equal(module?.group, 'groupSelectMany');
  assert.equal(module?.usageContract, '/_102020_/l2/aura/molecules/skills/groupSelectMany/usage');
});

void test('a one-line stub reads as "nothing here", not as a broken file', () => {
  const stub = '/// <mls fileReference="_102040_/l2/molecules/groupviewcard/index.defs.ts" enhancement="_blank"/>\n';
  const { module, error } = chExtractCatalogModule(stub);
  assert.equal(module, null);
  assert.match(error, /no catalog export found/);
});

void test('an empty file says so', () => {
  assert.match(chExtractCatalogModule('   ').error, /empty/);
});
