/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupSelectOne/adopt.test.ts" enhancement="_blank"/>
// The conversion table of the group — and the property the whole thing stands on: what is written
// inside a `${…map(…)}` comes out IDENTICAL. The options of 82 of the 101 real selects live in one,
// so a conversion that reformatted the map by a character would break the page it just edited.
//
// The refusals are the negative control: a `<select multiple>` is another group, an `<input>` is
// another group, and a predicate that says yes to those proves nothing about the ones it says yes to.
import assert from 'node:assert/strict';
import test from 'node:test';
import { scanTemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { describeElement, type IAdoptTarget } from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import { candidate, convert, group } from '/_102020_/l2/aura/molecules/skills/groupSelectOne/adopt.js';

const TARGET: IAdoptTarget = {
  tag: 'groupselectone--ml-select-dropdown',
  importPath: '/_102040_/l2/molecules/groupselectone/ml-select-dropdown.js',
};

function shapeOf(markup: string, tag = 'select') {
  const source = `class X { render() { return html\`<div>${markup}</div>\`; } }`;
  const tree = scanTemplateTree(source);
  const index = tree.elements.findIndex((element) => element.tag === tag);
  return describeElement(source, tree, index)!;
}

function markupOf(markup: string, tag = 'select'): string {
  const shape = shapeOf(markup, tag);
  const cand = candidate(shape)!;
  assert.ok(cand, 'it candidates');
  const result = convert(shape, cand, TARGET);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.reason));
  return result.ok ? result.markup : '';
}

function refusalOf(markup: string, tag = 'select') {
  const shape = shapeOf(markup, tag);
  const cand = candidate(shape);
  if (!cand) return null;
  const result = convert(shape, cand, TARGET);
  return result.ok ? undefined : result.reason;
}

test('the group is the one the catalog names', () => {
  assert.equal(group, 'groupSelectOne');
});

// ── The two real shapes ─────────────────────────────────────────────────────

test('a real static select of the 102047 converts the way the task says', () => {
  // Verbatim from ticketCatalogue.ts:141 — and what is replaced is the `<label>`, not the `<select>`.
  const written = markupOf('<label class="block">${msg[\'intent.cmdCreateTicket.form.field.status.label\']}'
    + '<select required class="mt-1 w-full rounded-md border border-[var(--border-default,#e2e8f0)] px-3 py-2"'
    + ' .value=${this.cmdCreateTicketStatus} @change=${this.handleCmdCreateTicketStatusChange}>'
    + '<option value="">${msg[\'common.chooseStatus\']}</option>'
    + '<option value="open">${msg[\'status.open\']}</option>'
    + '<option value="closed">${msg[\'status.closed\']}</option></select></label>');

  assert.equal(written, '<groupselectone--ml-select-dropdown data-class="mt-1 w-full" required'
    + ' .value=${this.cmdCreateTicketStatus} @change=${this.handleCmdCreateTicketStatusChange}>'
    + "<Label>${msg['intent.cmdCreateTicket.form.field.status.label']}</Label>"
    + "<Item value=\"\">${msg['common.chooseStatus']}</Item>"
    + "<Item value=\"open\">${msg['status.open']}</Item>"
    + "<Item value=\"closed\">${msg['status.closed']}</Item>"
    + '</groupselectone--ml-select-dropdown>');
});

test('a real mapped select of the 102046 keeps the map EXACTLY as it was written', () => {
  // Verbatim from approveChangeOrder.ts:137. The map carries a type annotation, an arrow and a
  // nested `html` — none of it is markup, and none of it may be touched.
  const map = '${this.qryLocateChangeOrderData.map((item: QryLocateChangeOrderOutput) =>'
    + ' html`<option value=${item.changeOrderId}>${item.changeOrderId}</option>`)}';
  const written = markupOf('<label class="space-y-1"><span class="block text-sm font-medium">'
    + '${msg[\'selectOrder\']}</span><select class="w-full rounded-md border px-3 py-2"'
    + ' .value=${this.cmdApproveChangeOrderDecisionChangeOrderChangeOrderId}'
    + ' @change=${this.handleCmdApproveChangeOrderDecisionChangeOrderChangeOrderIdChange}>'
    + `<option value="">\${msg['choose']}</option>${map}</select></label>`);

  // The label travels with its `<span>`; the item inside the map is an `<Item>` and the code around
  // it — the call, the type, the arrow, the `html` — is byte for byte the input.
  assert.equal(written, '<groupselectone--ml-select-dropdown data-class="w-full"'
    + ' .value=${this.cmdApproveChangeOrderDecisionChangeOrderChangeOrderId}'
    + ' @change=${this.handleCmdApproveChangeOrderDecisionChangeOrderChangeOrderIdChange}>'
    + '<Label><span class="block text-sm font-medium">${msg[\'selectOrder\']}</span></Label>'
    + '<Item value="">${msg[\'choose\']}</Item>'
    + '${this.qryLocateChangeOrderData.map((item: QryLocateChangeOrderOutput) =>'
    + ' html`<Item value=${item.changeOrderId}>${item.changeOrderId}</Item>`)}'
    + '</groupselectone--ml-select-dropdown>');

  // And the same thing said as a property, which is what actually has to hold: everything between
  // the options is copied, never reformatted.
  const between = '.map((item: QryLocateChangeOrderOutput) => html`';
  assert.ok(written.includes(between), 'the map expression crossed untouched');
});

test('the unit is the `<label>`, and the candidacy says so BEFORE the write', () => {
  const shape = shapeOf('<label class="block">${msg[\'k\']}<select .value=${this.v}>'
    + '<option value="a">A</option></select></label>');
  const cand = candidate(shape)!;
  assert.equal(cand.lift, 1, 'one level up');
  assert.equal(cand.why.id, 'adopt.whySelectOneLabel');
  assert.equal(cand.parts.items, 1, 'it counted the list');
  assert.equal(cand.parts.label, "${msg['k']}");
  // The preview needs both: the label from what disappears, the rows from the live control.
  assert.deepEqual(cand.previewSlots, [
    { slot: 'Label', from: 'replaced' },
    { slot: 'Item', from: 'children' },
  ]);
});

test('a select with no label around it replaces itself, and previews only its rows', () => {
  const shape = shapeOf('<div><select .value=${this.v}><option value="a">A</option>'
    + '<option value="b">B</option></select></div>');
  const cand = candidate(shape)!;
  assert.equal(cand.lift, 0);
  assert.equal(cand.why.id, 'adopt.whySelectOne');
  assert.equal(cand.parts.items, 2);
  assert.deepEqual(cand.previewSlots, [{ slot: 'Item', from: 'children' }]);
  assert.equal(markupOf('<div><select .value=${this.v}><option value="a">A</option></select></div>'),
    '<groupselectone--ml-select-dropdown .value=${this.v}><Item value="a">A</Item>'
    + '</groupselectone--ml-select-dropdown>');
});

// ── What travels, and what does not ─────────────────────────────────────────

test('the wiring survives with the SAME names — no rename anywhere', () => {
  const written = markupOf('<select .value=${this.v} @change=${this.onChange} @blur=${this.onBlur}'
    + ' @focus=${this.onFocus} name="status" id="s" required ?disabled=${this.busy}'
    + ' aria-label="Status"><option value="a">A</option></select>');

  for (const attribute of ['.value=${this.v}', '@change=${this.onChange}', '@blur=${this.onBlur}',
    '@focus=${this.onFocus}', 'name="status"', 'id="s"', 'required', '?disabled=${this.busy}',
    'aria-label="Status"']) {
    assert.ok(written.includes(attribute), attribute);
  }

  const cand = candidate(shapeOf('<select @change=${this.onChange}><option value="a">A</option></select>'))!;
  assert.deepEqual(cand.parts.events, { '@change': 'this.onChange' });
});

test('the classes that travel are the wrapper\'s, and only the ones that place it', () => {
  // `w-full` and `mt-1` held the field's place in the form; the border and the padding are the
  // molecule's business now.
  const written = markupOf('<label class="mt-1 w-full">t<select class="rounded-md border px-3 py-2">'
    + '<option value="a">A</option></select></label>');
  assert.ok(written.startsWith('<groupselectone--ml-select-dropdown data-class="mt-1 w-full">'), written);
  assert.ok(!written.includes('rounded-md'), 'the look did not travel');
});

test('every conversion warns that the look AND the shape become the design system\'s', () => {
  const cand = candidate(shapeOf('<select><option value="a">A</option></select>'))!;
  assert.deepEqual(cand.warnings.map((warning) => warning.id),
    ['adopt.warnAppearance', 'adopt.warnSelectShape']);
});

// ── The refusals (and the negative control) ─────────────────────────────────

test('a select that is not "exactly one" does not candidate at all', () => {
  for (const markup of ['<select multiple><option value="a">A</option></select>',
    '<select size="4"><option value="a">A</option></select>']) {
    assert.equal(candidate(shapeOf(markup)), null, markup);
  }
});

test('the other groups\' controls do not candidate here — the negative control', () => {
  assert.equal(candidate(shapeOf('<input type="text" .value=${this.v}>', 'input')), null);
  assert.equal(candidate(shapeOf('<textarea .value=${this.v}></textarea>', 'textarea')), null);
  assert.equal(candidate(shapeOf('<button @click=${this.go}>x</button>', 'button')), null);
});

test('an attribute nobody mapped refuses the conversion, by name', () => {
  // `@input` is the trap of this group: a native select fires it, the molecule never does, so a
  // handler carried over would be silently dead.
  const refusal = refusalOf('<select @input=${this.go}><option value="a">A</option></select>');
  assert.equal(refusal?.id, 'reason.adoptUnknownAttr');
  assert.match(String(refusal?.params?.attrs), /@input/u);

  // And on the ITEM: `?selected` decides what is chosen, `label` decides what is read.
  assert.equal(refusalOf('<select><option value="a" ?selected=${this.isA}>A</option></select>')?.id,
    'reason.adoptUnknownAttr');
  assert.equal(refusalOf('<select><option value="a" label="A">A</option></select>')?.id,
    'reason.adoptUnknownAttr');
});

test('an option with no value refuses — the molecule identifies an item by it', () => {
  assert.equal(refusalOf('<select><option>A</option></select>')?.id, 'reason.adoptSelectItemValue');
});

test('a list this file cannot see refuses instead of disappearing', () => {
  assert.equal(refusalOf('<select><div>${this.rows}</div></select>')?.id, 'reason.adoptSelectChildren');
  assert.equal(refusalOf('<select></select>')?.id, 'reason.adoptSelectNoItems');
  assert.equal(refusalOf('<select><optgroup label="g"><option value="a">A</option></optgroup></select>')?.id,
    'reason.adoptSelectGroups');
});

test('content with behaviour of its own does not travel into a slot', () => {
  assert.equal(refusalOf('<select><option value="a"><b @click=${this.go}>A</b></option></select>')?.id,
    'reason.adoptSlotBindings');
  assert.equal(refusalOf('<label><b @click=${this.go}>t</b><select><option value="a">A</option>'
    + '</select></label>')?.id, 'reason.adoptSlotBindings');
});

test('a `<label>` with two controls has no single unit', () => {
  assert.equal(refusalOf('<label>t<select><option value="a">A</option></select>'
    + '<input .value=${this.v}></label>')?.id, 'reason.adoptSharedLabel');
});
