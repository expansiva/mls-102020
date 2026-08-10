/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ImEdit, ImFileState, applyEdits, mlsHeaderOf } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/applyEdits.js';
import { ImArtifactKind } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

const TS = `/// <mls fileReference="_102040_/l2/molecules/groupviewtable/ml-data-table.ts" enhancement="_102027_/l2/enhancementAgent"/>

export class MlDataTableMolecule extends MoleculeAuraElement {
  pageSize = 0;
  private getTotalPages(): number {
    return 1;
  }
}
`;

const LESS = `collab-x {
  .ml-row { padding: 4px; }
}
`;

function files(over: Partial<Record<ImArtifactKind, ImFileState>> = {}): Map<ImArtifactKind, ImFileState> {
  return new Map<ImArtifactKind, ImFileState>([
    ['defs', { present: true, source: 'export const skill = `x`;' }],
    ['ts', { present: true, source: TS }],
    ['less', { present: true, source: LESS }],
    ['html', { present: false, source: '' }],
    ['groupIndex', { present: true, source: 'index' }],
    ...Object.entries(over).map(([k, v]) => [k as ImArtifactKind, v] as [ImArtifactKind, ImFileState]),
  ]);
}

function edit(over: Partial<ImEdit> = {}): ImEdit {
  return { artifact: 'less', op: 'replace', find: 'padding: 4px;', content: 'padding: 8px;', why: 'more room', ...over };
}

test('a replace applies and leaves everything else byte-identical', () => {
  const result = applyEdits(files(), [edit()]);
  assert.equal(result.errors.length, 0);
  const after = result.changed.get('less')!;
  assert.equal(after, LESS.replace('padding: 4px;', 'padding: 8px;'));
});

test('THE HEADER survives without being checked — untouched bytes are untouched', () => {
  const result = applyEdits(files(), [edit({ artifact: 'ts', find: 'return 1;', content: 'return 2;' })]);
  assert.equal(mlsHeaderOf(result.changed.get('ts')!), mlsHeaderOf(TS));
});

test('a `find` that matches twice is REJECTED, not applied to the first hit', () => {
  // Ambiguity means the model was thinking of one place and code would pick another.
  const source = 'padding: 4px;\npadding: 4px;\n';
  const result = applyEdits(files({ less: { present: true, source } }), [edit()]);
  assert.equal(result.changed.size, 0);
  assert.match(result.errors[0], /occurs 2 times/);
});

test('a `find` that is not there fails with the text quoted back', () => {
  const result = applyEdits(files(), [edit({ find: 'padding:4px;' })]);
  assert.match(result.errors[0], /does not occur/);
  assert.match(result.errors[0], /padding:4px;/);
});

test('later edits see the result of earlier ones', () => {
  // What lets two edits touch neighbouring lines without one invalidating the other's find.
  const result = applyEdits(files(), [
    edit({ find: 'padding: 4px;', content: 'padding: 8px;' }),
    edit({ find: 'padding: 8px;', content: 'padding: 12px;' }),
  ]);
  assert.equal(result.errors.length, 0);
  assert.match(result.changed.get('less')!, /padding: 12px;/);
});

test('nothing is written when ANY edit fails', () => {
  const result = applyEdits(files(), [edit(), edit({ find: 'not there' })]);
  assert.equal(result.changed.size, 0);
  assert.equal(result.errors.length, 1);
});

test('create is only for a file that does not exist', () => {
  const ok = applyEdits(files(), [edit({ artifact: 'html', op: 'create', find: undefined, content: '<div></div>' })]);
  assert.equal(ok.errors.length, 0);
  assert.equal(ok.changed.get('html'), '<div></div>');

  const clash = applyEdits(files(), [edit({ artifact: 'less', op: 'create', find: undefined, content: 'x' })]);
  assert.match(clash.errors[0], /already exists/);
});

test('replace and append need the file to exist', () => {
  const result = applyEdits(files(), [edit({ artifact: 'html', op: 'append', find: undefined, content: 'x' })]);
  assert.match(result.errors[0], /does not exist/);
});

test('append keeps exactly one newline at the seam', () => {
  const result = applyEdits(files({ less: { present: true, source: 'a' } }), [
    edit({ op: 'append', find: undefined, content: 'b' }),
  ]);
  assert.equal(result.changed.get('less'), 'a\nb\n');
});

test('an edit that changes nothing is an error, not a silent success', () => {
  // It would make the summary claim work that did not happen.
  const same = applyEdits(files(), [edit({ content: 'padding: 4px;' })]);
  assert.match(same.errors[0], /identical/);
});

test('an empty edit list is an error', () => {
  assert.match(applyEdits(files(), []).errors[0], /no edits/);
});

test('an artifact this molecule does not have is rejected', () => {
  const result = applyEdits(new Map(), [edit()]);
  assert.match(result.errors[0], /not an artifact of this molecule/);
});

test('an empty `find` is fine on append and create, and rejected on replace', () => {
  // The schema now REQUIRES `find` on every edit (agentsBestPractices §9: a strict provider rejects
  // a tool with an optional property). Optionality moved here, where it can carry a real message.
  const created = applyEdits(files(), [edit({ artifact: 'html', op: 'create', find: '', content: '<div></div>' })]);
  assert.equal(created.errors.length, 0);

  const appended = applyEdits(files(), [edit({ op: 'append', find: '', content: 'x' })]);
  assert.equal(appended.errors.length, 0);

  const replaced = applyEdits(files(), [edit({ op: 'replace', find: '' })]);
  assert.match(replaced.errors[0], /replace without `find`/);
});

// ---- whitespace-tolerant matching (o defeito do primeiro run real, 2026-08-10) ----

// A indentação REAL de ml-hierarchy-tree.ts: um espaço em qualquer profundidade. 32 das 153
// moléculas do mls-102040 são assim.
const COLAPSADO = `/// <mls fileReference="_102040_/l2/molecules/groupviewhierarchy/ml-hierarchy-tree.ts" enhancement="_blank"/>
export class Tree extends MoleculeAuraElement {
 private parseNodes() {
 this.nodeIdCounter = 0;
 const nodeElements = this.getSlots('Node');
 }
}
`;

test('THE 2026-08-10 DEFECT: o modelo reindenta, e o find casa mesmo assim', () => {
  // O modelo lê ' private parseNodes() {' com UM espaço e escreve com dois — é o instinto de
  // normalização mais forte que um modelo de código tem. Casamento exato morre aqui.
  const result = applyEdits(files({ ts: { present: true, source: COLAPSADO } }), [
    edit({
      artifact: 'ts',
      find: "  private parseNodes() {\n    this.nodeIdCounter = 0;\n    const nodeElements = this.getSlots('Node');\n  }",
      content: "  private parseNodes() {\n    this.nodeIdCounter = 1;\n    const nodeElements = this.getSlots('Node');\n  }",
    }),
  ]);
  assert.equal(result.errors.length, 0, result.errors.join('\n'));
  assert.match(result.changed.get('ts')!, /this\.nodeIdCounter = 1;/);
});

test('o casamento tolerante substitui SÓ o trecho achado — o resto mantém os próprios bytes', () => {
  const result = applyEdits(files({ ts: { present: true, source: COLAPSADO } }), [
    edit({ artifact: 'ts', find: 'this.nodeIdCounter   =   0;', content: 'this.nodeIdCounter = 7;' }),
  ]);
  const after = result.changed.get('ts')!;
  assert.equal(mlsHeaderOf(after), mlsHeaderOf(COLAPSADO));
  // as linhas vizinhas continuam com UM espaço, como estavam
  assert.match(after, /\n private parseNodes\(\) \{/);
  assert.match(after, /\n const nodeElements/);
});

test('o caminho exato tem precedência, e é byte a byte', () => {
  const result = applyEdits(files(), [edit({ find: 'padding: 4px;', content: 'padding: 9px;' })]);
  assert.equal(result.changed.get('less'), LESS.replace('padding: 4px;', 'padding: 9px;'));
  assert.deepEqual(result.applied, ['less: more room']);
});

test('ambiguidade continua sendo recusada no caminho tolerante', () => {
  const source = ' a();\n a();\n';
  const result = applyEdits(files({ ts: { present: true, source } }), [
    edit({ artifact: 'ts', find: '  a();', content: '  b();' }),
  ]);
  assert.equal(result.changed.size, 0);
  assert.match(result.errors[0], /occurs 2 times/);
});

test('texto que realmente não está lá diz isso, e não culpa o espaçamento', () => {
  const result = applyEdits(files({ ts: { present: true, source: COLAPSADO } }), [
    edit({ artifact: 'ts', find: 'this.naoExiste()', content: 'x' }),
  ]);
  assert.match(result.errors[0], /not even ignoring whitespace/);
});

test('find e content iguais a menos de espaçamento é erro, não substituição vazia', () => {
  const result = applyEdits(files({ ts: { present: true, source: COLAPSADO } }), [
    edit({ artifact: 'ts', find: 'this.nodeIdCounter = 0;', content: '  this.nodeIdCounter = 0;  ' }),
  ]);
  assert.match(result.errors[0], /identical/);
});
