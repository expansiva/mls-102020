/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupEnterText/adopt.test.ts" enhancement="_blank"/>
// The conversion table of the group — and the refusals, which here are also the NEGATIVE CONTROL of
// the whole design: a `<select>` and an `<input type="date">` belong to other groups, and a predicate
// that says yes to those proves nothing about the ones it says yes to.
import assert from 'node:assert/strict';
import test from 'node:test';
import { scanTemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { describeElement, type IAdoptTarget } from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import { candidate, convert, group } from '/_102020_/l2/aura/molecules/skills/groupEnterText/adopt.js';

const TARGET: IAdoptTarget = {
  tag: 'groupentertext--ml-enter-text',
  importPath: '/_102040_/l2/molecules/groupentertext/ml-enter-text.js',
};

function shapeOf(markup: string, tag = 'input') {
  const source = `class X { render() { return html\`<div>${markup}</div>\`; } }`;
  const tree = scanTemplateTree(source);
  const index = tree.elements.findIndex((element) => element.tag === tag);
  return describeElement(source, tree, index)!;
}

function markupOf(markup: string, tag = 'input'): string {
  const shape = shapeOf(markup, tag);
  const cand = candidate(shape)!;
  assert.ok(cand, 'it candidates');
  const result = convert(shape, cand, TARGET);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.reason));
  return result.ok ? result.markup : '';
}

function refusalOf(markup: string, tag = 'input') {
  const shape = shapeOf(markup, tag);
  const cand = candidate(shape);
  if (!cand) return null;
  const result = convert(shape, cand, TARGET);
  return result.ok ? undefined : result.reason;
}

test('the group is the one the catalog names', () => {
  assert.equal(group, 'groupEnterText');
});

test('a real search field of the 102047 converts the way the task says', () => {
  // Verbatim from ticketCatalogue.ts — and what is replaced is the `<label>`, not the `<input>`.
  const written = markupOf('<label class="flex flex-col gap-1">${msg[\'intent.qryListTicket.list.filter.search.label\']}'
    + '<input class="rounded-md border border-[var(--border-default,#e2e8f0)] bg-[var(--input-bg,#ffffff)] px-3 py-2"'
    + ' .value=${this.qryListTicketSearch} @input=${this.handleQryListTicketSearchChange}></label>');

  assert.equal(written, '<groupentertext--ml-enter-text .value=${this.qryListTicketSearch}'
    + ' @input=${this.handleQryListTicketSearchChange}>'
    + "<Label>${msg['intent.qryListTicket.list.filter.search.label']}</Label>"
    + '</groupentertext--ml-enter-text>');
});

test('the unit is the `<label>`, and the candidacy says so BEFORE the write', () => {
  const shape = shapeOf('<label class="block">${msg[\'k\']}<input .value=${this.v}></label>');
  const cand = candidate(shape)!;
  assert.equal(cand.lift, 1, 'one level up');
  assert.equal(cand.why.id, 'adopt.whyEnterTextLabel');
  assert.equal(cand.parts.label, "${msg['k']}");

  // Without a wrapper it is the field itself, and there is no Label slot to fill.
  const alone = candidate(shapeOf('<input class="p-2" .value=${this.v}>'))!;
  assert.equal(alone.lift, 0);
  assert.equal(markupOf('<input class="p-2" .value=${this.v}>').includes('<Label>'), false);
});

test('the label written inside a `<span>` travels whole, class and all', () => {
  // 104 of the 257 real pairs write it this way; reading only bare text would lose the styling.
  const written = markupOf('<label class="flex flex-col"><span class="text-sm">${msg[\'k\']}</span>'
    + '<input .value=${this.v}></label>');
  assert.match(written, /<Label><span class="text-sm">\$\{msg\['k'\]\}<\/span><\/Label>/u);
});

test('the wiring survives with the same names — that is the whole point of this group', () => {
  const written = markupOf('<label class="b">${msg[\'k\']}<input .value=${this.v} @input=${this.onChange}'
    + ' @change=${this.onBlurred} placeholder="nome" required></label>');
  assert.match(written, /\.value=\$\{this\.v\}/u);
  assert.match(written, /@input=\$\{this\.onChange\}/u);
  assert.match(written, /@change=\$\{this\.onBlurred\}/u);
  assert.match(written, /placeholder="nome"/u);
  assert.match(written, /\srequired>/u);
});

test('`type="search"` becomes the molecule`s own inputType, and `text` is its default', () => {
  assert.match(markupOf('<input class="p-2" type="search" .value=${this.v}>'), /inputType="search"/u);
  assert.equal(markupOf('<input class="p-2" type="text" .value=${this.v}>').includes('inputType'), false);
  assert.equal(markupOf('<input class="p-2" .value=${this.v}>').includes('inputType'), false);
});

test('a `<textarea>` is the same molecule with more than one row', () => {
  assert.match(markupOf('<textarea class="p-2" .value=${this.v}></textarea>', 'textarea'), /rows="3"/u);
  assert.match(markupOf('<textarea class="p-2" rows="6" .value=${this.v}></textarea>', 'textarea'), /rows="6"/u);
});

test('the maxlength of the markup becomes the attribute the molecule declares', () => {
  const written = markupOf('<input class="p-2" maxlength="200" minlength="3" .value=${this.v}>');
  assert.match(written, /max-length="200"/u);
  assert.match(written, /min-length="3"/u);
});

test('the classes that travel are the WRAPPER`s: its place in the form, not the field`s look', () => {
  const written = markupOf('<label class="flex-1 mt-2 gap-1 text-sm">${msg[\'k\']}'
    + '<input class="w-full rounded-md px-3" .value=${this.v}></label>');
  assert.match(written, /data-class="flex-1 mt-2"/u);
  // The input's own width belongs to the control that is gone.
  assert.equal(written.includes('w-full'), false);
});

// ── The refusals and the negative control ───────────────────────────────────

test('a `<select>` does not candidate: it is groupSelectOne', () => {
  assert.equal(candidate(shapeOf('<select class="p-2" .value=${this.v}></select>', 'select')), null);
});

test('an input of another group does not candidate', () => {
  for (const type of ['date', 'number', 'email', 'datetime-local', 'checkbox', 'radio', 'file']) {
    assert.equal(candidate(shapeOf(`<input class="p-2" type="${type}" .value=\${this.v}>`)), null, type);
  }
  // A `type` that is a binding is unknowable statically — 7 of the real inputs write it that way.
  assert.equal(candidate(shapeOf('<input class="p-2" type=${this.kind}>')), null);
});

test('a `<label>` with two controls is refused — there is no single unit', () => {
  // One real page writes exactly this (`span + textarea + input`).
  const reason = refusalOf('<label class="b"><span>${msg[\'k\']}</span><textarea .value=${this.a}></textarea>'
    + '<input .value=${this.b}></label>');
  assert.equal(reason?.id, 'reason.adoptSharedLabel');
});

test('an attribute the table does not know refuses the conversion, NAMING it', () => {
  const reason = refusalOf('<input class="p-2" step="0.5" min="1" .value=${this.v}>');
  assert.equal(reason?.id, 'reason.adoptUnknownAttr');
  assert.equal(reason?.params?.attrs, 'step, min');
});

test('a label whose text carries behaviour of its own is refused', () => {
  const reason = refusalOf('<label class="b"><span @click=${this.help}>${msg[\'k\']}</span>'
    + '<input .value=${this.v}></label>');
  assert.equal(reason?.id, 'reason.adoptSlotBindings');
});

test('the tag is the catalog one, verbatim', () => {
  const other: IAdoptTarget = { tag: 'groupentertext--ml-floating-text-input', importPath: '/y.js' };
  const shape = shapeOf('<input class="p-2" .value=${this.v}>');
  const result = convert(shape, candidate(shape)!, other);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.markup, /^<groupentertext--ml-floating-text-input /u);
  assert.deepEqual(result.imports, ['/y.js']);
});
