/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/createGate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runSyCreateIndexTsGate } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s3-indexts/createGate.js';

const OPTIONS = {
  indexTag: 'molecules--groupenterdatetime--index-102040',
  headerRef: '_102040_/l2/molecules/groupenterdatetime/index.ts',
  indexDefsReference: '/_102040_/l2/molecules/groupenterdatetime/index.defs.js',
  sharedTableReference: '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js',
  groupMoleculeShortNames: ['ml-datetime-picker', 'ml-enter-datetime-masked-input'],
  groupFolder: 'groupenterdatetime',
};

const GOOD = `/// <mls fileReference="_102040_/l2/molecules/groupenterdatetime/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import '/_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker';
import '/_102040_/l2/molecules/groupenterdatetime/ml-enter-datetime-masked-input';

import { molecules, scenarios } from '/_102040_/l2/molecules/groupenterdatetime/index.defs.js';
import { renderCatalogReferenceTable } from '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js';

@customElement('molecules--groupenterdatetime--index-102040')
export class GroupEnterDatetimeIndex extends StateLitElement {
  private renderHero(): TemplateResult { return html\`<header></header>\`; }
  private renderShowcaseCards(): TemplateResult {
    return html\`<groupenterdatetime--ml-datetime-picker></groupenterdatetime--ml-datetime-picker><groupenterdatetime--ml-enter-datetime-masked-input></groupenterdatetime--ml-enter-datetime-masked-input>\`;
  }
  private renderReferenceTable(): TemplateResult {
    return renderCatalogReferenceTable(molecules, scenarios);
  }
  render(): TemplateResult { return html\`\${this.renderHero()}\${this.renderShowcaseCards()}\${this.renderReferenceTable()}\`; }
}
`;

void test('a well-formed, born-migrated page passes with no issues', () => {
  assert.deepEqual(runSyCreateIndexTsGate(GOOD, OPTIONS), []);
});

void test('empty output is a single issue, not a cascade', () => {
  assert.deepEqual(runSyCreateIndexTsGate('', OPTIONS), [{ code: 'empty', message: 'index.ts came out empty' }]);
});

void test('rejects a hand-written <table> even if the delegate call is also present', () => {
  const withTable = GOOD.replace(
    'return renderCatalogReferenceTable(molecules, scenarios);',
    'return renderCatalogReferenceTable(molecules, scenarios); /* <table class="x"> */',
  );
  const issues = runSyCreateIndexTsGate(withTable, OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'reference_table_handwritten'));
});

void test('rejects hand-written headers.map(...) — the page must not almost migrate itself', () => {
  const withHeaders = GOOD.replace(
    'private renderReferenceTable(): TemplateResult {\n    return renderCatalogReferenceTable(molecules, scenarios);\n  }',
    'private renderReferenceTable(): TemplateResult {\n    return html`${headers.map(h => html`<th>${h.label}</th>`)}`;\n  }',
  );
  const issues = runSyCreateIndexTsGate(withHeaders, OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'reference_table_not_delegated'));
  assert.ok(issues.some(issue => issue.code === 'reference_table_handwritten'));
});

void test('flags a molecule missing from the showcase', () => {
  const missing = GOOD.replace("import '/_102040_/l2/molecules/groupenterdatetime/ml-enter-datetime-masked-input';\n", '')
    .replace('<ml-enter-datetime-masked-input></ml-enter-datetime-masked-input>', '');
  const issues = runSyCreateIndexTsGate(missing, OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'molecule_missing' && issue.message.includes('ml-enter-datetime-masked-input')));
});

void test('flags a wrong or missing index.defs/shared import specifier', () => {
  const wrongSpecifier = GOOD.replace(
    "from '/_102040_/l2/molecules/groupenterdatetime/index.defs.js'",
    "from './index.defs'",
  );
  const issues = runSyCreateIndexTsGate(wrongSpecifier, OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'defs_import'));
});

void test('flags a missing/wrong custom element tag', () => {
  const wrongTag = GOOD.replace("@customElement('molecules--groupenterdatetime--index-102040')", "@customElement('molecules--groupenterdatetime--index-999')");
  const issues = runSyCreateIndexTsGate(wrongTag, OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'custom_element'));
});

void test('flags markdown fences', () => {
  const issues = runSyCreateIndexTsGate('```ts\n' + GOOD + '\n```', OPTIONS);
  assert.ok(issues.some(issue => issue.code === 'fence'));
});

// ⚠️ A REGRESSÃO DE 2026-08-27, e ela é o defeito de 2026-08-05 passando pelo gate que existe para pegá-lo.
// O check antigo era `content.includes(shortName)` — e a LINHA DE IMPORT sozinha já satisfazia isso. Medido
// contra fixture: uma página que importava `ml-enter-datetime-masked-input` e nunca o instanciava voltava
// com ZERO issues. Importado e nunca mostrado é lacuna silenciosa: em 05/08 um playground foi corrigido, a
// página do grupo ficou com a área de detalhe vazia, e ninguém notou por dias.
void test('molécula importada e NUNCA instanciada é reprovada', () => {
  const semInstancia = GOOD.replace(
    '<groupenterdatetime--ml-enter-datetime-masked-input></groupenterdatetime--ml-enter-datetime-masked-input>',
    '',
  );
  const codes = runSyCreateIndexTsGate(semInstancia, OPTIONS).map(issue => issue.code);
  assert.ok(codes.includes('molecule_not_shown'), `esperava molecule_not_shown, veio: ${codes.join(', ') || 'nada'}`);
  // segue importada — o problema é só a instância
  assert.equal(codes.includes('molecule_missing'), false);
});

void test('molécula importada DUAS vezes é reprovada', () => {
  const duplicado = GOOD.replace(
    "import '/_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker';",
    "import '/_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker';\nimport '/_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker';",
  );
  const codes = runSyCreateIndexTsGate(duplicado, OPTIONS).map(issue => issue.code);
  assert.ok(codes.includes('molecule_imported_twice'), `esperava molecule_imported_twice, veio: ${codes.join(', ') || 'nada'}`);
});

// O import é casado pelo FIM DO CAMINHO: sem isso, o import de `ml-datetime-picker` contaria como se
// fosse o de um irmão cujo nome o contém, e um grupo com `ml-data-table` + `ml-data-table-select` daria
// falso verde. Não é hipotético — é a forma dos nomes no groupViewTable.
void test('nome que é prefixo de outro não conta como import do irmão', () => {
  const options = { ...OPTIONS, groupMoleculeShortNames: ['ml-datetime-picker', 'ml-datetime-picker-range'] };
  const codes = runSyCreateIndexTsGate(GOOD, options).map(issue => issue.code);
  assert.ok(codes.includes('molecule_missing'), 'o irmão de nome mais longo não foi importado e tem de ser cobrado');
});

// A showcase that only carries the mold's envelope (name/value/isEditing/@change) demonstrates nothing
// about the molecule's own contract (decision of 2026-09-04).
const USAGE_SKILL = `
## Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| \`data-variant\` | \`string\` | \`'primary'\` | Visual tone |

## Events

| Event | Detail | Description |
|-------|--------|-------------|
| \`action\` | \`{}\` | Fired when the button is clicked |
`;

void test('a showcase using only the mold envelope fails contract_not_demonstrated when a usage skill exists', () => {
  const codes = runSyCreateIndexTsGate(GOOD, { ...OPTIONS, groupUsageSkill: USAGE_SKILL }).map(issue => issue.code);
  assert.ok(codes.includes('contract_not_demonstrated'));
});

// ⚠️ THE THRESHOLD CHANGED ON 2026-09-14, and this pair of tests is where it shows. The check used to
// fire only at ZERO items, so ONE item beyond the envelope cleared it — which is how a showcase of 13
// identical cards passed while demonstrating 2 of its group's 34 items. The floor is now
// min(4, contract.size): a two-item contract like this fixture has to demonstrate BOTH.
void test('one item out of a two-item contract is no longer enough', () => {
  const withVariant = GOOD.replace(
    '<groupenterdatetime--ml-datetime-picker></groupenterdatetime--ml-datetime-picker>',
    '<groupenterdatetime--ml-datetime-picker data-variant="secondary"></groupenterdatetime--ml-datetime-picker>',
  );
  const codes = runSyCreateIndexTsGate(withVariant, { ...OPTIONS, groupUsageSkill: USAGE_SKILL }).map(issue => issue.code);
  assert.ok(codes.includes('contract_not_demonstrated'));
});

void test('a small contract is held to ITS size, not to 4 — demonstrating both items passes', () => {
  const withBoth = GOOD.replace(
    '<groupenterdatetime--ml-datetime-picker></groupenterdatetime--ml-datetime-picker>',
    '<groupenterdatetime--ml-datetime-picker data-variant="secondary" @action=${this.go}></groupenterdatetime--ml-datetime-picker>',
  );
  const codes = runSyCreateIndexTsGate(withBoth, { ...OPTIONS, groupUsageSkill: USAGE_SKILL }).map(issue => issue.code);
  assert.ok(!codes.includes('contract_not_demonstrated'), codes.join());
});

void test('sem skill de uso (ou placeholder degradado) o check nunca dispara', () => {
  assert.ok(!runSyCreateIndexTsGate(GOOD, { ...OPTIONS, groupUsageSkill: '' }).map(i => i.code).includes('contract_not_demonstrated'));
  assert.ok(!runSyCreateIndexTsGate(GOOD, { ...OPTIONS, groupUsageSkill: '(this group has no usage skill)' }).map(i => i.code).includes('contract_not_demonstrated'));
});

// ============================================================================
// THE DIFFERENTIATOR CHECKS (2026-09-14)
// ============================================================================
// Every case below is a real defect of the showcase this gate failed to catch: 13 identical cards that
// demonstrated 2 of the group's 34 contract items and 1 of the library's 39 events, and where three
// molecules rendered as plain tables because a single attribute was never set.

const DIFFS = {
  molecules: [
    { shortName: 'ml-datetime-picker', tag: '', slots: [], props: [], events: ['change', 'sort'], switches: [], actions: [], liveSlots: false, reactsTo: 'none' as const, objective: '', exclusive: [], ownSwitches: [] },
    { shortName: 'ml-enter-datetime-masked-input', tag: '', slots: [], props: [], events: ['change', 'rowClick', 'groupChange'], switches: ['groupable'], actions: ['open'], liveSlots: false, reactsTo: 'none' as const, objective: '', exclusive: ['@groupChange'], ownSwitches: ['groupable'] },
  ],
  allEvents: ['change', 'groupChange', 'rowClick', 'sort'],
  distinguishingSwitches: ['groupable'],
  distinguishingActions: ['open'],
  withoutExclusiveApi: ['ml-datetime-picker'],
};

/** GOOD plus everything the differentiator checks ask for — the shape a real showcase has. */
const WIRED = GOOD.replace(
  '<groupenterdatetime--ml-datetime-picker></groupenterdatetime--ml-datetime-picker>',
  `<groupenterdatetime--ml-datetime-picker @change=\${this.a} @sort=\${this.b} @rowClick=\${this.c} @groupChange=\${this.d} loading error>
     <TableHead groupable></TableHead><RowAction action="open">Abrir</RowAction>
   </groupenterdatetime--ml-datetime-picker>`,
);

void test('the checks stay silent when the caller has no differentiators — never guessed', () => {
  assert.deepEqual(runSyCreateIndexTsGate(GOOD, OPTIONS), []);
});

void test('a page that binds only @change is rejected — the envelope is not a demonstration', () => {
  const onlyChange = GOOD.replace('></groupenterdatetime--ml-datetime-picker>', ' @change=${this.a}></groupenterdatetime--ml-datetime-picker>');
  const codes = runSyCreateIndexTsGate(onlyChange, { ...OPTIONS, differentiators: DIFFS }).map(i => i.code);
  assert.ok(codes.includes('events_not_wired'));
});

void test('an on-switch only one molecule reads must be set, or that card is a plain sibling', () => {
  const codes = runSyCreateIndexTsGate(GOOD, { ...OPTIONS, differentiators: DIFFS }).map(i => i.code);
  assert.ok(codes.includes('feature_switch_unset'));
  const message = runSyCreateIndexTsGate(GOOD, { ...OPTIONS, differentiators: DIFFS }).find(i => i.code === 'feature_switch_unset')!.message;
  assert.match(message, /groupable/);
});

void test('an action verb only one molecule answers to must appear as action="…"', () => {
  const codes = runSyCreateIndexTsGate(GOOD, { ...OPTIONS, differentiators: DIFFS }).map(i => i.code);
  assert.ok(codes.includes('action_verb_unused'));
});

void test('mentioning the verb in prose does not count — it has to be the attribute', () => {
  const prose = GOOD.replace('<header></header>', '<header>open the record</header>');
  const codes = runSyCreateIndexTsGate(prose, { ...OPTIONS, differentiators: DIFFS }).map(i => i.code);
  assert.ok(codes.includes('action_verb_unused'));
});

void test('a page that wires events, the switch and the verb clears all three checks', () => {
  const codes = runSyCreateIndexTsGate(WIRED, { ...OPTIONS, differentiators: DIFFS }).map(i => i.code);
  assert.ok(!codes.includes('events_not_wired'), codes.join());
  assert.ok(!codes.includes('feature_switch_unset'), codes.join());
  assert.ok(!codes.includes('action_verb_unused'), codes.join());
});

void test('a group that emits fewer events than the floor is held to what it emits, not to 3', () => {
  const oneEvent = { ...DIFFS, allEvents: ['change'], distinguishingSwitches: [], distinguishingActions: [] };
  const withChange = GOOD.replace('></groupenterdatetime--ml-datetime-picker>', ' @change=${this.a}></groupenterdatetime--ml-datetime-picker>');
  assert.deepEqual(runSyCreateIndexTsGate(withChange, { ...OPTIONS, differentiators: oneEvent }), []);
});
