/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ImIndexGateInputs, runImIndexGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/gate.js';
import {
  countImports,
  importLineFor,
  insertImport,
  lastMoleculeImport,
  planIndexWork,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i6-index/indexPlan.js';

// Shortened from the real mls-102040/l2/molecules/groupviewtable/index.ts.
const INDEX = `/// <mls fileReference="_102040_/l2/molecules/groupviewtable/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import '/_102040_/l2/molecules/groupviewtable/ml-data-table';
import '/_102040_/l2/molecules/groupviewtable/ml-view-table';

@customElement('molecules--groupviewtable--index-102040')
export class GroupViewTableIndex extends StateLitElement {
  render() {
    return html\`
      <groupviewtable--ml-data-table>
        <div slot="Caption">Customers</div>
      </groupviewtable--ml-data-table>\`;
  }
}
`;

function inputs(over: Partial<ImIndexGateInputs> = {}): ImIndexGateInputs {
  return {
    playgroundChanged: true,
    indexUpdated: true,
    before: INDEX,
    after: INDEX,
    project: 102040,
    groupFolder: 'groupviewtable',
    shortName: 'ml-data-table',
    tag: 'groupviewtable--ml-data-table',
    addedSlots: [],
    ...over,
  };
}

// ---- the plan ----

test('nothing to do when the playground did not change', () => {
  const plan = planIndexWork({
    indexSource: INDEX, project: 102040, groupFolder: 'groupviewtable', shortName: 'ml-data-table',
    tag: 'groupviewtable--ml-data-table', addedSlots: ['Detail'], playgroundChanged: false,
  });
  assert.equal(plan.noop, true);
  assert.equal(plan.needsModel, false);
});

test('a missing import is derivable, so the model is not called for it', () => {
  const plan = planIndexWork({
    indexSource: INDEX, project: 102040, groupFolder: 'groupviewtable', shortName: 'ml-new-table',
    tag: 'groupviewtable--ml-new-table', addedSlots: [], playgroundChanged: true,
  });
  assert.equal(plan.missingImport, "import '/_102040_/l2/molecules/groupviewtable/ml-new-table';");
  assert.equal(plan.needsModel, false);
});

test('a slot the showcase does not exercise is what needs the model', () => {
  // Not derivable: the card is hand-written Lit with real sample data.
  const plan = planIndexWork({
    indexSource: INDEX, project: 102040, groupFolder: 'groupviewtable', shortName: 'ml-data-table',
    tag: 'groupviewtable--ml-data-table', addedSlots: ['Detail'], playgroundChanged: true,
  });
  assert.deepEqual(plan.missingSlots, ['Detail']);
  assert.equal(plan.needsModel, true);
});

test('a slot the showcase already exercises needs nothing', () => {
  const plan = planIndexWork({
    indexSource: INDEX, project: 102040, groupFolder: 'groupviewtable', shortName: 'ml-data-table',
    tag: 'groupviewtable--ml-data-table', addedSlots: ['Caption'], playgroundChanged: true,
  });
  assert.deepEqual(plan.missingSlots, []);
  assert.equal(plan.needsModel, false);
});

test('an import is counted with or without the .js extension', () => {
  assert.equal(countImports(INDEX, 102040, 'groupviewtable', 'ml-data-table'), 1);
  assert.equal(countImports(INDEX.replace("ml-data-table';", "ml-data-table.js';"), 102040, 'groupviewtable', 'ml-data-table'), 1);
  assert.equal(countImports(INDEX, 102040, 'groupviewtable', 'ml-absent'), 0);
});

test('a new import lands right after the last molecule import, keeping the block together', () => {
  const anchor = lastMoleculeImport(INDEX, 102040, 'groupviewtable');
  assert.equal(anchor, "import '/_102040_/l2/molecules/groupviewtable/ml-view-table';");
  const after = insertImport(INDEX, importLineFor(102040, 'groupviewtable', 'ml-new'), anchor);
  assert.match(after, /ml-view-table';\nimport '\/_102040_\/l2\/molecules\/groupviewtable\/ml-new';/);
});

// ---- the gate ----

test('THE RULE OF 2026-08-05: a changed playground with an untouched index is refused', () => {
  const result = runImIndexGate(inputs({ indexUpdated: false }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^index_stale: /);
});

test('an unchanged playground with a rewritten index is refused too', () => {
  const result = runImIndexGate(inputs({ playgroundChanged: false, indexUpdated: true }));
  assert.match(result.errors[0], /^should_be_noop: /);
});

test('a no-op run passes', () => {
  assert.deepEqual(runImIndexGate(inputs({ playgroundChanged: false, indexUpdated: false })), { ok: true, errors: [] });
});

test('an added slot missing from the showcase card is refused', () => {
  const result = runImIndexGate(inputs({ addedSlots: ['Detail'] }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^slot_missing: /);
});

test('an added slot present in the card passes', () => {
  const after = INDEX.replace('</groupviewtable--ml-data-table>', '<div slot="Detail">x</div></groupviewtable--ml-data-table>');
  assert.equal(runImIndexGate(inputs({ addedSlots: ['Detail'], after })).ok, true);
});

test('a duplicated import is refused', () => {
  const after = INDEX.replace(
    "import '/_102040_/l2/molecules/groupviewtable/ml-data-table';",
    "import '/_102040_/l2/molecules/groupviewtable/ml-data-table';\nimport '/_102040_/l2/molecules/groupviewtable/ml-data-table';",
  );
  assert.match(runImIndexGate(inputs({ after })).errors[0], /^import_duplicate: /);
});

test('a molecule imported and never shown is refused', () => {
  const after = INDEX.replace(/<groupviewtable--ml-data-table>[\s\S]*?<\/groupviewtable--ml-data-table>/, '');
  assert.ok(runImIndexGate(inputs({ after })).errors.some(e => /^showcase_missing: /.test(e)));
});

test('an index that shrank is refused — this step adds, it does not rewrite', () => {
  const result = runImIndexGate(inputs({ after: INDEX.slice(0, 200) }));
  assert.ok(result.errors.some(e => /^shrunk: /.test(e)));
});
