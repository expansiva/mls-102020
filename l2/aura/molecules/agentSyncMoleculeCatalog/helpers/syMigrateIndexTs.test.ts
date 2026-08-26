/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { syMigrateIndexTs, syNeedsIndexTsCreation, syNeedsIndexTsMigration } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syMigrateIndexTs.js';

const SHARED_REF = '/_102020_/l2/aura/molecules/shared/indexReferenceTable.js';

const FIXTURE = `/// <mls fileReference="_102040_/l2/molecules/groupfoo/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';

import '/_102040_/l2/molecules/groupfoo/ml-a';
import '/_102040_/l2/molecules/groupfoo/ml-b';

@customElement('molecules--groupfoo--index-102040')
export class GroupFooIndex extends StateLitElement {
  private renderHero(): TemplateResult {
    return html\`<header>hi</header>\`;
  }

  private renderReferenceTable(): TemplateResult {
    const headers = [
      { label: 'A', cls: 'text-violet-600' },
      { label: 'B', cls: 'text-emerald-600' },
    ];
    interface Row { scenario: string; a: boolean; b: boolean; }
    const rows: Row[] = [
      { scenario: 'Simple case', a: true, b: false },
    ];
    return html\`
      <table>
        <thead>
          <tr>\${headers.map(h => html\`<th class="\${h.cls}">\${h.label}</th>\`)}</tr>
        </thead>
        <tbody>
          \${rows.map(row => html\`<tr><td>\${row.scenario}</td></tr>\`)}
        </tbody>
      </table>
    \`;
  }

  render(): TemplateResult {
    return html\`
      <div>
        \${this.renderHero()}
        \${this.renderReferenceTable()}
      </div>
    \`;
  }
}
`;

void test('replaces the whole renderReferenceTable() method with the thin delegating call', () => {
  const result = syMigrateIndexTs(FIXTURE, SHARED_REF);
  assert.equal(result.changed, true);
  assert.match(result.migrated, /private renderReferenceTable\(\): TemplateResult \{\n {4}return renderCatalogReferenceTable\(molecules, scenarios\);\n {2}\}/);
});

void test('the old headers/rows/interface Row content is gone', () => {
  const result = syMigrateIndexTs(FIXTURE, SHARED_REF);
  assert.doesNotMatch(result.migrated, /interface Row/);
  assert.doesNotMatch(result.migrated, /const headers = \[/);
  assert.doesNotMatch(result.migrated, /Simple case/);
});

void test('everything OUTSIDE the method is untouched — hero, class declaration, render()', () => {
  const result = syMigrateIndexTs(FIXTURE, SHARED_REF);
  assert.match(result.migrated, /private renderHero\(\): TemplateResult \{\n {4}return html`<header>hi<\/header>`;/);
  assert.match(result.migrated, /export class GroupFooIndex extends StateLitElement \{/);
  assert.match(result.migrated, /render\(\): TemplateResult \{\n {4}return html`/);
});

void test('the two new imports are inserted right after the last existing import line, blank line before the class preserved', () => {
  const result = syMigrateIndexTs(FIXTURE, SHARED_REF);
  const lines = result.migrated.split('\n');
  const lastMoleculeImport = lines.findIndex(l => l.includes("import '/_102040_/l2/molecules/groupfoo/ml-b'"));
  assert.equal(lines[lastMoleculeImport + 1], "import { molecules, scenarios } from './index.defs';");
  assert.equal(lines[lastMoleculeImport + 2], `import { renderCatalogReferenceTable } from '${SHARED_REF}';`);
  assert.equal(lines[lastMoleculeImport + 3], '');
  assert.equal(lines[lastMoleculeImport + 4], "@customElement('molecules--groupfoo--index-102040')");
});

void test('a nested template literal inside a ${} interpolation does not confuse the brace matcher', () => {
  // FIXTURE's own renderReferenceTable already has this shape (${headers.map(h => html`...`)}) and the
  // method-replacement test above passing IS the proof, but assert it explicitly too: render() (which
  // comes right after) must still be intact and syntactically whole.
  const result = syMigrateIndexTs(FIXTURE, SHARED_REF);
  const openCount = (result.migrated.match(/\{/g) || []).length;
  const closeCount = (result.migrated.match(/\}/g) || []).length;
  assert.equal(openCount, closeCount, 'braces must stay balanced after the surgery');
});

void test('a file already importing from ./index.defs is left untouched', () => {
  const migrated = FIXTURE.replace("import '/_102040_/l2/molecules/groupfoo/ml-b';", "import '/_102040_/l2/molecules/groupfoo/ml-b';\nimport { scenarios } from './index.defs';");
  const result = syMigrateIndexTs(migrated, SHARED_REF);
  assert.equal(result.changed, false);
  assert.match(result.reason || '', /already imports/);
  assert.equal(result.migrated, migrated);
});

void test('a file with no renderReferenceTable() method is left untouched, with a reason', () => {
  const result = syMigrateIndexTs('export class Empty {}', SHARED_REF);
  assert.equal(result.changed, false);
  assert.match(result.reason || '', /no .*renderReferenceTable/);
});

void test('an empty source is left untouched, with a reason', () => {
  const result = syMigrateIndexTs('', SHARED_REF);
  assert.equal(result.changed, false);
});

// ---- triggers ----

void test('G1: no index.ts at all needs creation', () => {
  assert.equal(syNeedsIndexTsCreation(false), true);
  assert.equal(syNeedsIndexTsCreation(true), false);
});

void test('G3: index.ts exists and has not been migrated yet', () => {
  assert.equal(syNeedsIndexTsMigration(true, FIXTURE), true);
  assert.equal(syNeedsIndexTsMigration(false, FIXTURE), false);
});

void test('G3 does not re-fire once migrated', () => {
  const migrated = syMigrateIndexTs(FIXTURE, SHARED_REF).migrated;
  assert.equal(syNeedsIndexTsMigration(true, migrated), false);
});
