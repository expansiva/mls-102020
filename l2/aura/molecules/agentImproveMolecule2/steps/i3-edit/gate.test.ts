/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImEditGateInputs,
  ImEditedFile,
  runImEditGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.js';

const HEADER = '/// <mls fileReference="_102054_/l2/molecules/groupviewtable/ml-data-table-brutal.ts" enhancement="_102027_/l2/enhancementAgent"/>';

function file(over: Partial<ImEditedFile> = {}): ImEditedFile {
  return {
    kind: 'ts',
    reference: '_102054_/l2/molecules/groupviewtable/ml-data-table-brutal.ts',
    before: `${HEADER}\nexport class X extends Y { render() { return html\`<div class="ml-row"></div>\`; } }`,
    after: `${HEADER}\nexport class X extends Y { render() { return html\`<div class="ml-row ml-tight"></div>\`; } }`,
    created: false,
    ...over,
  };
}

function inputs(over: Partial<ImEditGateInputs> = {}): ImEditGateInputs {
  return {
    files: [file()],
    currentProject: 102054,
    parentReference: null,
    compileErrors: [],
    compileErrorsBefore: [],
    ...over,
  };
}

test('a clean edit passes', () => {
  assert.deepEqual(runImEditGate(inputs()), { ok: true, errors: [] });
});

test('THE HARD INVARIANT: a write into another project is refused', () => {
  const result = runImEditGate(inputs({ files: [file({ reference: '_102040_/l2/molecules/groupviewtable/ml-data-table.ts' })] }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^foreign_write: /);
});

test('on a shell, writing the PARENT is refused by name', () => {
  // "Nunca deve mudar o código pai." The reference is the same file the shell extends.
  const parent = '_102040_/l2/molecules/groupviewtable/ml-data-table.ts';
  const result = runImEditGate(
    inputs({ currentProject: 102040, parentReference: parent, files: [file({ reference: parent })] }),
  );
  assert.ok(result.errors.some(e => /^parent_write: /.test(e)));
});

test('losing the mls header is refused — it is what a replace can destroy while looking reasonable', () => {
  const result = runImEditGate(inputs({ files: [file({ after: 'export class X extends Y {}' })] }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^header: /);
  assert.match(result.errors[0], /\(gone\)/);
});

test('a created file must bring its header', () => {
  const result = runImEditGate(inputs({ files: [file({ created: true, before: '', after: 'collab-x { }' })] }));
  assert.match(result.errors[0], /^header: /);
});

test('THE DELTA RULE: a colour the file ALREADY hardcoded does not block an unrelated fix', () => {
  // The molecule has bg-black today. The user asked for a padding change. Blocking here would
  // freeze the agent on a molecule nobody asked to repair.
  const before = `${HEADER}\nclass X { render() { return html\`<div class="bg-black p-1"></div>\`; } }`;
  const after = `${HEADER}\nclass X { render() { return html\`<div class="bg-black p-2"></div>\`; } }`;
  assert.equal(runImEditGate(inputs({ files: [file({ before, after })] })).ok, true);
});

test('a colour the edit INTRODUCED is refused', () => {
  const before = `${HEADER}\nclass X { render() { return html\`<div class="p-1"></div>\`; } }`;
  const after = `${HEADER}\nclass X { render() { return html\`<div class="p-1 bg-black"></div>\`; } }`;
  const result = runImEditGate(inputs({ files: [file({ before, after })] }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^appearance_class: /);
  assert.match(result.errors[0], /bg-black/);
});

test('a top-level helper the edit introduced is refused', () => {
  // The recurring invention: a local `nothing` sentinel. Four generations produced it.
  const after = `${HEADER}\nfunction nothingAttr(): null { return null; }\nclass X {}`;
  const result = runImEditGate(inputs({ files: [file({ after })] }));
  assert.ok(result.errors.some(e => /^helper_outside_class: /.test(e)));
});

test('a render side effect the edit introduced is refused', () => {
  // Laid out like a real molecule: the shared detector finds render() by line start, which is how
  // every file in the library is written.
  const before = [HEADER, 'class X {', '  render() {', '    return html`<div class="ml-row"></div>`;', '  }', '}'].join('\n');
  const after = [HEADER, 'class X {', '  render() {', "    this.setAttribute('x','1');", '    return html`<div class="ml-row"></div>`;', '  }', '}'].join('\n');
  const result = runImEditGate(inputs({ files: [file({ before, after })] }));
  assert.ok(result.errors.some(e => /^render_side_effect: /.test(e)));
});

test('the appearance detectors do not run on a .less — that file IS the appearance', () => {
  const after = 'collab-x {\n  .ml-row { background: black; }\n}';
  const result = runImEditGate(
    inputs({ files: [file({ kind: 'less', before: 'collab-x {\n  .ml-row { background: white; }\n}', after })] }),
  );
  assert.equal(result.ok, true);
});

test('THE DELTA RULE for the compiler: a pre-existing error does not block', () => {
  const result = runImEditGate(
    inputs({ compileErrors: ['line 4: already broken'], compileErrorsBefore: ['line 4: already broken'] }),
  );
  assert.equal(result.ok, true);
});

test('a compile error the edit introduced is refused', () => {
  const result = runImEditGate(
    inputs({ compileErrors: ['line 4: already broken', 'line 9: new breakage'], compileErrorsBefore: ['line 4: already broken'] }),
  );
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^compile: line 9/);
});

test('writing nothing is a failure', () => {
  assert.match(runImEditGate(inputs({ files: [] })).errors[0], /^no_change: /);
});

test('an empty result file is a failure', () => {
  assert.match(runImEditGate(inputs({ files: [file({ after: '  ' })] })).errors[0], /^empty: /);
});
