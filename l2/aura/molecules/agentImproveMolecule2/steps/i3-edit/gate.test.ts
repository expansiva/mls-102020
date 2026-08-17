/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImEditGateInputs,
  ImEditedFile,
  runImEditGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i3-edit/gate.js';

// The group contract's declared vocabulary, in the shape a skill carries it (escaped backticks).
const GROUP_SKILL = '| \\`Label\\` | No | Title | \\`Helper\\` | \\`size\\` | \\`action\\` |';

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
    parentSource: '',
    route: 'B',
    groupSkill: GROUP_SKILL,
    compileErrors: [],
    compileErrorsBefore: [],
    ...over,
  };
}

// ---- the shell of 2026-08-14 ----
const PARENT_SOURCE = [
  'const COPY_CONFIRM_MS = 2000;',
  'export class MlCopyButtonMolecule extends MoleculeAuraElement {',
  '  protected portalWidgetName = \'a\';',
  '  private beginCopiedState() { return COPY_CONFIRM_MS; }',
  '  render() { return this.portalWidgetName; }',
  '}',
].join('\n');

function shell(body: string): string {
  return [
    HEADER,
    "import { MlCopyButtonMolecule } from '/_102040_/l2/molecules/grouptriggeraction/ml-copy-button.js';",
    'export class G extends MlCopyButtonMolecule {',
    body,
    '}',
  ].join('\n');
}

function shellInputs(before: string, after: string): ImEditGateInputs {
  return inputs({
    parentReference: '_102040_/l2/molecules/grouptriggeraction/ml-copy-button.ts',
    parentSource: PARENT_SOURCE,
    files: [file({ before, after })],
  });
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

// ---- dead member: the override that overrides nothing (2026-08-14) ----

test('a member the edit declares that the parent does not have and nobody reads is refused', () => {
  const result = runImEditGate(shellInputs(shell(''), shell('  protected copiedDurationMs = 3000;')));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => /^dead_member: /.test(e)));
  assert.match(result.errors.join('\n'), /copiedDurationMs/);
});

test('assigning a dead member is refused too — it is what the SECOND run did', () => {
  // The field already existed; the whole edit was a constructor writing the same value into it.
  const before = shell('  protected copiedDurationMs = 3000;');
  const after = shell('  protected copiedDurationMs = 3000;\n  constructor() {\n    super();\n    this.copiedDurationMs = 3000;\n  }');
  assert.ok(runImEditGate(shellInputs(before, after)).errors.some(e => /^dead_member: /.test(e)));
});

test('THE DELTA RULE: a dead member the edit did not touch does not block an unrelated fix', () => {
  const before = shell('  protected copiedDurationMs = 3000;\n  protected portalWidgetName = \'a\';');
  const after = shell('  protected copiedDurationMs = 3000;\n  protected portalWidgetName = \'b\';');
  assert.equal(runImEditGate(shellInputs(before, after)).ok, true);
});

test('a REAL override passes — the parent declares it', () => {
  const result = runImEditGate(shellInputs(shell(''), shell('  protected portalWidgetName = \'b\';')));
  assert.equal(result.ok, true);
});

test('without the parent source the check does not run — every member would look invented', () => {
  const after = shell('  protected copiedDurationMs = 3000;');
  assert.equal(runImEditGate(inputs({ files: [file({ before: shell(''), after })] })).ok, true);
});

test('writing nothing is a failure', () => {
  assert.match(runImEditGate(inputs({ files: [] })).errors[0], /^no_change: /);
});

test('an empty result file is a failure', () => {
  assert.match(runImEditGate(inputs({ files: [file({ after: '  ' })] })).errors[0], /^empty: /);
});

// ---- a definition change made on a route that does not do those (2026-08-14) ----

function withSurface(slots: string, extra = ''): string {
  return [HEADER, 'export class X extends MoleculeAuraElement {', `  slotTags = [${slots}];`, extra, '}'].join('\n');
}

test('ADDING a public property the group never declares is refused on route B', () => {
  // Measured on ml-currency-input: asked for a label and help text — which the group defines as the
  // SLOTS `Label` and `Helper` — the run added public properties `label` and `helper` instead.
  const before = withSurface("'Label'");
  const after = withSurface("'Label'", '  @propertyDataSource({ type: String })\n  helper = \'\';');
  const result = runImEditGate(inputs({ files: [file({ before, after })] }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => /^definition_changed: /.test(e)));
  assert.match(result.errors.join('\n'), /helper/);
});

test('DECLARING a slot the group already requires PASSES — that is the defect fix', () => {
  // 27 molecules are missing a slot their group mandates. Fixing one moves the surface and is
  // exactly the route B run that finally reaches i5 and i6; refusing it would block the fix.
  const result = runImEditGate(inputs({
    files: [file({ before: withSurface("'Label'"), after: withSurface("'Label','Helper'") })],
  }));
  assert.equal(result.ok, true);
});

test('REMOVING a public element is refused whatever the group says', () => {
  const result = runImEditGate(inputs({
    files: [file({ before: withSurface("'Label','Helper'"), after: withSurface("'Label'") })],
  }));
  assert.ok(result.errors.some(e => /^definition_removed: /.test(e)));
});

test('ROUTE A may move the surface — that is what the checkpoint confirmed', () => {
  const result = runImEditGate(inputs({
    route: 'A',
    files: [file({ before: withSurface("'Label'"), after: withSurface("'Label','Footer'") })],
  }));
  assert.equal(result.ok, true);
});

test('without the group contract the check admits — unmeasured is not forbidden', () => {
  const after = withSurface("'Label'", '  @propertyDataSource({ type: String })\n  invented = \'\';');
  const result = runImEditGate(inputs({ groupSkill: '', files: [file({ before: withSurface("'Label'"), after })] }));
  assert.equal(result.ok, true);
});
