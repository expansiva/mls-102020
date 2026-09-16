/// <mls fileReference="_102020_/l2/aura/studio/studioAdoptEdit.test.ts" enhancement="_blank" />
// The pure half of adopting a molecule: reading the element and writing the new source.
//
// What these tests are really about is the two properties the whole operation stands on — nothing of
// the original is lost without being named, and adopt + undo returns the file BYTE FOR BYTE.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { readAttributes, scanTemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import {
  ADOPT_STALE,
  ADOPT_UNCLOSED,
  carriedClasses,
  classifyAttributes,
  composeAdopt,
  describeElement,
  hasBindingInside,
  hasImport,
  importAnchor,
  importLineFor,
  innerWithout,
  isCoreElementTag,
  ownText,
  planAdopt,
  planUnadopt,
  roleInLiteral,
  writeAttribute,
} from '/_102020_/l2/aura/studio/studioAdoptEdit.js';

const CORE_FILE = fileURLToPath(new URL('studioAdoptEdit.ts', import.meta.url));
const SKILLS = fileURLToPath(new URL('../molecules/skills/', import.meta.url));
/** The hand-written conversion files — the guards below hold for every group's. */
const ADOPT_FILES = [
  `${SKILLS}groupTriggerAction/adopt.ts`,
  `${SKILLS}groupEnterText/adopt.ts`,
  `${SKILLS}groupSelectOne/adopt.ts`,
];

/** A page in the shape the generator emits — one line of markup, bindings and all. */
function page(markup: string, imports = "import { html } from 'lit';\n"): string {
  return [
    '/// <mls fileReference="_102047_/l2/m/web/desktop/page11/x.ts" enhancement="_blank" />',
    imports,
    'class X {',
    '  render() {',
    `    return html\`${markup}\`;`,
    '  }',
    '}',
    '',
  ].join('\n');
}

/** The index of the first element with that tag. */
function indexOf(source: string, tag: string, occurrence = 0): number {
  const tree = scanTemplateTree(source);
  const found = tree.elements
    .map((element, index) => ({ element, index }))
    .filter((entry) => entry.element.tag === tag);
  return found[occurrence].index;
}

// ── Reading the element ─────────────────────────────────────────────────────

test('readAttributes lists every attribute, in every form the generator writes', () => {
  const open = '<button title=${x} class="a b" ?disabled=${!this.id || this.s === \'loading\'} '
    + 'type="submit" @click=${() => { if (a > b) this.go(); }} required>';
  const attributes = readAttributes(open, 0);

  assert.deepEqual(attributes.map((entry) => entry.name), [
    'title', 'class', '?disabled', 'type', '@click', 'required',
  ]);
  // The arrow's `>` is inside the binding, and reading the tag up to the first `>` would have cut
  // the open tag in half — losing `required` and inventing elements after it.
  assert.equal(attributes[4].value.kind, 'expression');
  assert.match((attributes[4].value as { expression: string }).expression, /if \(a > b\)/u);
  assert.deepEqual(attributes[5].value, { kind: 'bare' });
  assert.deepEqual(attributes[1].value, { kind: 'literal', value: 'a b' });
});

test('readAttributes reads a quoted binding as a binding, and a mixed value as markup', () => {
  const attributes = readAttributes('<p title="${msg[\'x\']}" alt="Total: ${n}">', 0);
  assert.deepEqual(attributes[0].value, { kind: 'expression', expression: "msg['x']" });
  assert.equal(attributes[1].value.kind, 'literal');
});

test('describeElement carries the children, the parent and the text of each', () => {
  const source = page('<label class="block">${msg[\'f.label\']}<input class="w-full" .value=${this.v}></label>');
  const tree = scanTemplateTree(source);
  const shape = describeElement(source, tree, indexOf(source, 'input'));

  assert.ok(shape);
  assert.equal(shape.tag, 'input');
  assert.equal(shape.parent?.tag, 'label');
  assert.equal(shape.parent?.children.length, 1);
  // The label's own text, with the control cut out — the content the `Label` slot receives.
  assert.equal(ownText(shape.parent!), "${msg['f.label']}");
  assert.equal(shape.inner, '', 'a void element has no content');
});

test('describeElement keeps the content of an element whole, `${...}` included', () => {
  const source = page('<button class="x" @click=${() => this.go()}>${msg[\'common.refresh\']}</button>');
  const tree = scanTemplateTree(source);
  const shape = describeElement(source, tree, indexOf(source, 'button'))!;

  assert.equal(shape.inner, "${msg['common.refresh']}");
  assert.equal(source.slice(shape.span.start, shape.span.end).endsWith('</button>'), true);
});

test('innerWithout cuts only what it is given', () => {
  const source = page('<label class="b"><span class="t">${msg[\'k\']}</span><input .value=${this.v}></label>');
  const tree = scanTemplateTree(source);
  const input = describeElement(source, tree, indexOf(source, 'input'))!;
  const label = input.parent!;

  assert.equal(innerWithout(label, [input]), '<span class="t">${msg[\'k\']}</span>');
  assert.equal(ownText(label), '', 'with every child cut there is no bare text left');
});

// ── What travels and what does not ──────────────────────────────────────────

test('only the classes that hold the element in PLACE travel', () => {
  const literal = 'w-full mt-4 rounded-md px-3 py-2 bg-[var(--button-primary-bg,#2563eb)] self-end';
  assert.deepEqual(carriedClasses(literal), ['w-full', 'mt-4', 'self-end']);
  // Colour, padding and radius stay behind on purpose: they are the molecule's now, and the group
  // contract is explicit that a `data-class` background does not beat the variant.
  assert.equal(carriedClasses(literal).includes('px-3'), false);
  assert.equal(carriedClasses(null).length, 0);
});

test('the design-system role is read from the token, never from the class name', () => {
  const roles = ['primary', 'secondary', 'danger'];
  assert.equal(roleInLiteral('px-3 bg-[var(--button-secondary-bg,#fff)]', 'button', roles), 'secondary');
  assert.equal(roleInLiteral('px-3 bg-white text-slate-900', 'button', roles), null);
  // A token of another family is not a button tone.
  assert.equal(roleInLiteral('bg-[var(--surface-bg,#fff)]', 'button', roles), null);
});

test('an unknown attribute is NAMED, never dropped', () => {
  const attributes = readAttributes('<button @click=${a} @dblclick=${b} ?autofocus=${c} title="t">', 0);
  const { written, unknown } = classifyAttributes(attributes, {
    rename: { '@click': '@action' },
    keep: ['title'],
  });
  assert.deepEqual(written, ['@action=${a}', 'title="t"']);
  assert.deepEqual(unknown, ['@dblclick', '?autofocus']);
});

test('an attribute the molecule writes itself is refused, not overwritten', () => {
  const attributes = readAttributes('<button data-variant="ghost">', 0);
  const { unknown } = classifyAttributes(attributes, { reserved: ['data-variant'] });
  assert.deepEqual(unknown, ['data-variant']);
});

test('writeAttribute puts every form back exactly as it was read', () => {
  const attributes = readAttributes('<input required .value=${this.v} placeholder="name">', 0);
  assert.equal(writeAttribute(attributes[0]), 'required');
  assert.equal(writeAttribute(attributes[1]), '.value=${this.v}');
  assert.equal(writeAttribute(attributes[2]), 'placeholder="name"');
  assert.equal(writeAttribute(attributes[1], '.text'), '.text=${this.v}');
});

test('content with behaviour of its own is recognised as such', () => {
  assert.equal(hasBindingInside("${msg['common.refresh']}"), false);
  assert.equal(hasBindingInside('<span class="t">${msg[\'k\']}</span>'), false);
  assert.equal(hasBindingInside('<span @click=${() => this.go()}>x</span>'), true);
  assert.equal(hasBindingInside('<img .src=${this.url}>'), true);
});

// ── Writing it ──────────────────────────────────────────────────────────────

const MOLECULE = 'grouptriggeraction--ml-button-standard';
const IMPORT = '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';

test('the markup replaces the element and the import goes in after the last one', () => {
  const source = page('<button class="px-3">${msg[\'a\']}</button>');
  const markup = `<${MOLECULE} data-variant="primary"><Label>\${msg['a']}</Label></${MOLECULE}>`;
  const plan = planAdopt(source, scanTemplateTree(source), indexOf(source, 'button'), markup, [IMPORT]);
  assert.equal(plan.ok, true);

  const result = composeAdopt(source, plan as never);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.source.includes(`import '${IMPORT}';`), true);
  assert.equal(result.source.includes('<button'), false);
  assert.equal(result.source.slice(result.landed.start, result.landed.end), markup);
  assert.equal(result.source.slice(result.importSpan!.start, result.importSpan!.end), `import '${IMPORT}';\n`);
  // The header line is the toolchain's and stays first.
  assert.match(result.source.split('\n')[0], /^\/\/\/ <mls /u);
});

test('an import that is already there is not written twice', () => {
  const source = page('<button class="px-3">x</button>', `import { html } from 'lit';\nimport '${IMPORT}';\n`);
  const plan = planAdopt(source, scanTemplateTree(source), indexOf(source, 'button'), '<x></x>', [IMPORT]);
  assert.equal(plan.ok, true);
  assert.equal((plan as { importLine: unknown }).importLine, null);

  const result = composeAdopt(source, plan as never);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.source.split(IMPORT).length - 1, 1);
  assert.equal(result.importSpan, null);
});

test('hasImport and importAnchor answer about the file, not about a convention', () => {
  const source = page('<button>x</button>', `import { html } from 'lit';\nimport '${IMPORT}';\n`);
  assert.equal(hasImport(source, IMPORT), true);
  assert.equal(hasImport(source, '/_102040_/l2/molecules/grouptriggeraction/ml-icon-button.js'), false);
  assert.equal(importLineFor(IMPORT), `import '${IMPORT}';`);
  // Right after the last import, which is where a new line belongs.
  assert.equal(source.slice(0, importAnchor(source)).trimEnd().endsWith(`import '${IMPORT}';`), true);
});

test('adopting and undoing gives the file back BYTE FOR BYTE', () => {
  const source = page('<div class="row"><button class="px-3 mt-2" @click=${this.go}>${msg[\'a\']}</button></div>');
  const at = indexOf(source, 'button');
  const markup = `<${MOLECULE} data-variant="primary" data-class="mt-2" @action=\${this.go}><Label>\${msg['a']}</Label></${MOLECULE}>`;
  const plan = planAdopt(source, scanTemplateTree(source), at, markup, [IMPORT]);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;

  const original = source.slice(plan.slice.start, plan.slice.end);
  const result = composeAdopt(source, plan);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const back = planUnadopt(result.source, {
    landed: result.landed,
    markup,
    original,
    importSpan: result.importSpan,
    importText: plan.importLine!.text,
  });
  assert.equal(back.ok, true);
  if (!back.ok) return;
  assert.equal(back.source, source, 'the undo is the file it started from');
  assert.equal(back.source.slice(back.restored.start, back.restored.end), original);
});

test('the undo of an adoption that reused an import gives the file back too', () => {
  const source = page('<button class="px-3">x</button>', `import { html } from 'lit';\nimport '${IMPORT}';\n`);
  const at = indexOf(source, 'button');
  const markup = `<${MOLECULE}></${MOLECULE}>`;
  const plan = planAdopt(source, scanTemplateTree(source), at, markup, [IMPORT]);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const original = source.slice(plan.slice.start, plan.slice.end);
  const result = composeAdopt(source, plan);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  const back = planUnadopt(result.source, {
    landed: result.landed, markup, original, importSpan: null, importText: '',
  });
  assert.equal(back.ok, true);
  assert.equal((back as { source: string }).source, source);
});

test('a file rewritten in between refuses the undo instead of cutting something else', () => {
  const source = page('<button class="px-3">x</button>');
  const at = indexOf(source, 'button');
  const markup = `<${MOLECULE}></${MOLECULE}>`;
  const plan = planAdopt(source, scanTemplateTree(source), at, markup, [IMPORT]);
  if (!plan.ok) return;
  const result = composeAdopt(source, plan);
  if (!result.ok) return;

  const rewritten = result.source.replace(markup, '<section>other</section>');
  const back = planUnadopt(rewritten, {
    landed: result.landed,
    markup,
    original: source.slice(plan.slice.start, plan.slice.end),
    importSpan: result.importSpan,
    importText: plan.importLine!.text,
  });
  assert.equal(back.ok, false);
  assert.deepEqual((back as { reason: unknown }).reason, ADOPT_STALE);
});

test('an element the scanner never saw closed is refused', () => {
  // `end` is the end of the FILE for an unclosed element: replacing that slice would take the rest of
  // the source with it, which is the one failure of this operation that destroys work.
  const source = 'class X { render() { return html`<button class="a">no close';
  const tree = scanTemplateTree(source);
  const plan = planAdopt(source, tree, indexOf(source, 'button'), '<x></x>', []);
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { reason: unknown }).reason, ADOPT_UNCLOSED);
});

test('adopting inside a `${...}` is a slice like any other', () => {
  const source = page('${this.rows.map((r) => html`<li><button class="px-2" @click=${() => this.go(r)}>${r.name}</button></li>`)}');
  const at = indexOf(source, 'button');
  const markup = `<${MOLECULE}></${MOLECULE}>`;
  const plan = planAdopt(source, scanTemplateTree(source), at, markup, [IMPORT]);
  assert.equal(plan.ok, true);
  const result = composeAdopt(source, plan as never);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  // The arrow inside the binding survives: the slice is delimited by the scanner, not by the first `>`.
  assert.match(result.source, /html`<li><grouptriggeraction--ml-button-standard><\/grouptriggeraction--ml-button-standard><\/li>`/u);
});

// ── The guards ──────────────────────────────────────────────────────────────

test('the conversion files never BUILD a tag — the catalog is the only source', () => {
  // Risk 2 of the task, as a test. A tag derived by convention names an element that never renders,
  // and the failure is silent: an `HTMLUnknownElement` with the slots inside it, on screen, empty.
  for (const file of ADOPT_FILES) {
    const source = readFileSync(file, 'utf8');
    const code = source.split('\n').filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'));
    for (const line of code) {
      assert.equal(/--\$\{/u.test(line), false, `${file}: a tag assembled by hand: ${line.trim()}`);
      assert.equal(/toLowerCase\(\)\s*\}--/u.test(line), false, `${file}: a tag assembled by hand: ${line.trim()}`);
    }
    // The tag that is written comes from the target, and from nowhere else.
    assert.match(source, /target\.tag/u, `${file}: writes no tag from the catalog`);
  }
});

test('nothing in the pure path touches the DOM', () => {
  for (const file of [CORE_FILE, ...ADOPT_FILES]) {
    const code = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => !line.trim().startsWith('*') && !line.trim().startsWith('//'))
      .join('\n');
    for (const forbidden of ['document.', 'window.', 'customElements', 'HTMLElement', 'mls.stor']) {
      assert.equal(code.includes(forbidden), false, `${file}: ${forbidden}`);
    }
  }
});

test('an adoption is ONE write, with the import in it', () => {
  // Risk 3: the import inserted by a second write would be undone on its own, leaving a page that
  // imports a module it does not use — or a molecule with no module at all.
  const editor = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
  const block = editor.slice(editor.indexOf('public async adoptSelected('), editor.indexOf('private async applyAdoptStep('));
  assert.ok(block.length > 200, 'the scan found the method');
  assert.equal(block.split('commitSource(').length - 1, 1, 'exactly one write');
  assert.equal(block.split('composeAdopt(').length - 1, 1, 'exactly one composition');
});

test('only a CORE html element can be adopted — a molecule is another question', () => {
  for (const tag of ['button', 'input', 'textarea', 'div', 'label']) {
    assert.equal(isCoreElementTag(tag), true, tag);
  }
  for (const tag of ['grouptriggeraction--ml-button-standard', 'groupentertext--ml-enter-text',
    'molecules--button-102020', 'aura--studio--class-picker-102020', 'ml-scenary']) {
    assert.equal(isCoreElementTag(tag), false, tag);
  }
  assert.equal(isCoreElementTag(''), false);
});

test('the panel does not even OFFER the tab outside a core element', () => {
  // The rule is one function and the panel asks it — a second copy of "does it have a hyphen" is how
  // the two sides start disagreeing.
  const panel = readFileSync(fileURLToPath(new URL('classPickerPanel.ts', import.meta.url)), 'utf8');
  assert.match(panel, /isCoreElementTag\(this\.target\?\.tag \?\? ''\)/u);
  assert.match(panel, /this\.isCoreElement \? this\.tabButton\('molecules'/u);
});
