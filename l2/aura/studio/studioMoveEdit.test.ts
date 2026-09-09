/// <mls fileReference="_102020_/l2/aura/studio/studioMoveEdit.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { scanTemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import {
  MOVE_MOUNTED_ROOT,
  MOVE_NOT_SIBLING,
  MOVE_SAME_NODE,
  MOVE_STALE,
  MOVE_UNCLOSED,
  applyMove,
  planMove,
  planReverse,
  siblingsOf,
} from '/_102020_/l2/aura/studio/studioMoveEdit.js';

/** A page in the shape the generator emits: a section with three static children. */
const PAGE = [
  'class X {',
  '  render() {',
  '    return html`',
  '      <section class="wrap">',
  '        <h1 class="title">${msg[\'a\']}</h1>',
  '        <div class="body">',
  '          <p class="one">um</p>',
  '          <p class="two">dois</p>',
  '        </div>',
  '        <footer class="foot">${msg[\'z\']}</footer>',
  '      </section>`;',
  '  }',
  '}',
].join('\n');

const tree = scanTemplateTree(PAGE);

function indexOfLiteral(source: string, literal: string): number {
  const found = scanTemplateTree(source).elements.findIndex((element) => element.literal === literal);
  assert.notEqual(found, -1, literal);
  return found;
}

const at = (literal: string): number => indexOfLiteral(PAGE, literal);

/** Move by literal, and hand back the resulting source. */
function move(source: string, movedLiteral: string, targetLiteral: string, side: 'before' | 'after'): string {
  const current = scanTemplateTree(source);
  const plan = planMove(
    source, current,
    indexOfLiteral(source, movedLiteral), indexOfLiteral(source, targetLiteral), side,
  );
  assert.equal(plan.ok, true, `plan ${movedLiteral} ${side} ${targetLiteral}`);
  const result = applyMove(source, plan as { ok: true; slice: { start: number; end: number }; insertAt: number });
  assert.equal(result.ok, true);
  return (result as { ok: true; source: string }).source;
}

/** The order of the same-parent literals, as the scanner sees them after a rewrite. */
function orderUnder(source: string, parentLiteral: string): (string | null)[] {
  const current = scanTemplateTree(source);
  const parent = indexOfLiteral(source, parentLiteral);
  return siblingsOf(current, current.elements.findIndex((e) => e.parent === parent))
    .map((index) => current.elements[index].literal);
}

test('a slice is the whole element — children and ${...} come along', () => {
  const moved = move(PAGE, 'body', 'foot', 'after');
  assert.match(moved, /<div class="body">\s*<p class="one">um<\/p>\s*<p class="two">dois<\/p>\s*<\/div>/u);
  assert.deepEqual(orderUnder(moved, 'wrap'), ['title', 'foot', 'body']);
  // And the interpolation that was inside the neighbour is untouched.
  assert.ok(moved.includes(`<footer class="foot">\${msg['z']}</footer>`));
});

test('forward and backward are different arithmetic, and both land right', () => {
  // The classic bug of this operation: cutting first slides everything after the slice to the left,
  // so a forward move has to subtract the slice's length and a backward one must not.
  assert.deepEqual(orderUnder(move(PAGE, 'title', 'foot', 'after'), 'wrap'), ['body', 'foot', 'title']);
  assert.deepEqual(orderUnder(move(PAGE, 'foot', 'title', 'before'), 'wrap'), ['foot', 'title', 'body']);
});

test('the adjacent sibling, where the offsets touch', () => {
  // `insertAt` lands exactly on the end of the slice being cut — off by one here and the element is
  // spliced into its own neighbour.
  assert.deepEqual(orderUnder(move(PAGE, 'one', 'two', 'after'), 'body'), ['two', 'one']);
  assert.deepEqual(orderUnder(move(PAGE, 'two', 'one', 'before'), 'body'), ['two', 'one']);
  assert.deepEqual(orderUnder(move(PAGE, 'title', 'body', 'after'), 'wrap'), ['body', 'title', 'foot']);
});

test('move then undo gives back the file byte for byte', () => {
  // NOT by planning the opposite move: that restores the ORDER but not the BYTES, because the
  // whitespace that sat between the siblings has migrated. The undo replays the exact inverse splice.
  for (const [moved, target, side] of [
    ['title', 'foot', 'after'],
    ['foot', 'title', 'before'],
    ['one', 'two', 'after'],
    ['body', 'title', 'before'],
  ] as const) {
    const current = scanTemplateTree(PAGE);
    const plan = planMove(PAGE, current, at(moved), at(target), side);
    assert.equal(plan.ok, true);
    const forward = applyMove(PAGE, plan as never);
    assert.equal(forward.ok, true);
    const { source: after, moved: landed } = forward as { ok: true; source: string; moved: { start: number; end: number } };
    assert.notEqual(after, PAGE, `${moved} ${side} ${target} changed nothing`);

    const slice = PAGE.slice((plan as never as { slice: { start: number; end: number } }).slice.start,
      (plan as never as { slice: { start: number; end: number } }).slice.end);
    const back = planReverse(after, landed, slice, (plan as never as { slice: { start: number } }).slice.start);
    assert.equal(back.ok, true, `reverse ${moved}`);
    const restored = applyMove(after, back as never);
    assert.equal((restored as { ok: true; source: string }).source, PAGE, `round trip ${moved} ${side} ${target}`);
  }
});

test('the undo is refused when the file no longer holds that slice', () => {
  // An agent rewriting the file under us. Replaying a stale offset would cut something else, so the
  // step is revalidated on the TEXT and refused — the stack falls, the file survives.
  const result = planReverse(PAGE, { start: 10, end: 20 }, '<p class="one">um</p>', 0);
  assert.equal(result.ok, false);
  assert.deepEqual((result as { ok: false; reason: unknown }).reason, MOVE_STALE);
});

test('an element the scanner never saw closed is refused', () => {
  // `end` is `source.length` for an unclosed element, and cutting that takes the rest of the file.
  // This is the one failure of this operation that destroys work, so it is checked on the text.
  const broken = 'class X { render() { return html`<section class="wrap">'
    + '<h1 class="title">a</h1><p class="one">um</section>`; } }';
  const current = scanTemplateTree(broken);
  const one = current.elements.findIndex((e) => e.literal === 'one');
  const title = current.elements.findIndex((e) => e.literal === 'title');
  assert.notEqual(one, -1);
  assert.equal(current.elements[one].end, broken.length, 'the fixture really is unclosed');
  assert.equal(current.elements[one].parent, current.elements[title].parent, 'and they ARE siblings');

  const plan = planMove(broken, current, one, title, 'before');
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, MOVE_UNCLOSED);
});

test('a destination that is not a sibling is refused', () => {
  const plan = planMove(PAGE, tree, at('title'), at('one'), 'after');
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, MOVE_NOT_SIBLING);
});

test('the same source node on both sides is refused — that is data order, not markup', () => {
  // Two screen elements from ONE line of code is a `.map()`. Reordering it would change the order of
  // the DATA, which is not what someone pointing at two cells is asking for.
  const plan = planMove(PAGE, tree, at('one'), at('one'), 'after');
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, MOVE_SAME_NODE);
});

test('a helper root is refused — moving it would move the CALL', () => {
  const withHelper = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap"><h1 class="title">a</h1>${this.renderBody()}</section>`;',
    '  }',
    '  renderBody() {',
    '    return html`<div class="body">b</div>`;',
    '  }',
    '}',
  ].join('\n');
  const current = scanTemplateTree(withHelper);
  const body = current.elements.findIndex((e) => e.literal === 'body');
  const title = current.elements.findIndex((e) => e.literal === 'title');
  assert.ok(current.links.some((link) => link.root === body), 'the fixture really mounts it');

  const plan = planMove(withHelper, current, body, title, 'before');
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, MOVE_MOUNTED_ROOT);
});

test('a slice carrying an interpolation moves whole', () => {
  const rows = [
    'class X {',
    '  render() {',
    '    return html`<tr class="row">',
    '      <td class="cell-a">${item.title}</td>',
    '      <td class="cell-b">${item.status === "x" ? html`<b>s</b>` : nothing}</td>',
    '    </tr>`;',
    '  }',
    '}',
  ].join('\n');
  const moved = move(rows, 'cell-b', 'cell-a', 'before');
  assert.ok(moved.includes('<td class="cell-b">${item.status === "x" ? html`<b>s</b>` : nothing}</td>'));
  assert.deepEqual(orderUnder(moved, 'row'), ['cell-b', 'cell-a']);
});

test('siblings are the ones in the same template plus the helpers mounted among them', () => {
  const withHelper = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap"><h1 class="title">a</h1>${this.renderBody()}<footer class="foot">z</footer></section>`;',
    '  }',
    '  renderBody() {',
    '    return html`<div class="body">b</div>`;',
    '  }',
    '}',
  ].join('\n');
  const current = scanTemplateTree(withHelper);
  const title = current.elements.findIndex((e) => e.literal === 'title');
  assert.deepEqual(
    siblingsOf(current, title).map((i) => current.elements[i].literal),
    ['title', 'body', 'foot'],
    'in render order, the mounted helper where its CALL is',
  );
});

// --- Source guards for the editor that uses it ---

const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('classPickerPanel.ts', import.meta.url), 'utf8');

/** Code lines only: a mention inside a comment is documentation, not a call. */
function codeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));
}

test('the move anchors structurally — it never counts occurrences', () => {
  // Counting a literal is ambiguous for 63% of the class attributes of a real page, and here the cost
  // of picking the wrong one is not a wrong colour, it is a slice of the file moving.
  const body = EDITOR.slice(EDITOR.indexOf('private resolveMove('), EDITOR.indexOf('private domSibling('));
  assert.ok(body.includes('resolveStructuralAnchor('), 'resolved by position in the tree');
  assert.equal(body.includes('resolveAnchor('), false, 'never by counting');
  // Both ends of the move are resolved the same way: the element AND the sibling it swaps with.
  assert.equal((body.match(/resolveStructuralAnchor\(/gu) ?? []).length, 2);
});

test('a move is one write, through the same path as every other edit', () => {
  const write = EDITOR.slice(EDITOR.indexOf('private async writeMove'), EDITOR.indexOf('// --- Undo'));
  assert.ok(write.includes('this.commitSource('), 'model + local copy + compile + live update');
  // And it stops at the local store, like the rest: reaching the project files is the save's job.
  assert.equal(codeLines(EDITOR).some((line) => line.includes('saveTarget(')), false);
});

test('the drag has a threshold, or selecting becomes impossible', () => {
  // Without it every click is a 1px drag and the element can never simply be selected.
  assert.match(EDITOR, /DRAG_THRESHOLD_PX = \d+/u);
  const move = EDITOR.slice(EDITOR.indexOf('private onHostPointerMove'), EDITOR.indexOf('private onHostPointerUp'));
  assert.ok(move.includes('DRAG_THRESHOLD_PX'), 'the threshold gates the start of the drag');
});

test('the drop indicator lives in the overlay the detach removes', () => {
  // The client page must not keep a line drawn by the editor after it disarms.
  assert.ok(codeLines(EDITOR).some((line) => line.includes('se-drop-line')), 'it has a class of its own');
  const styles = EDITOR.slice(EDITOR.indexOf('private injectStyles'), EDITOR.indexOf('private drawSelection'));
  assert.match(styles, /\.se-drop-line/u, 'styled in the stylesheet that goes away');
  const draw = EDITOR.slice(EDITOR.indexOf('private drawDropLine'), EDITOR.indexOf('private clearDropLine'));
  assert.ok(draw.includes('this.overlayEl'), 'drawn into the overlay, not into the app');
});

test('an invalid drop writes nothing', () => {
  const up = EDITOR.slice(EDITOR.indexOf('private onHostPointerUp'), EDITOR.indexOf('private dropTargetAt'));
  assert.ok(up.includes('if (!drop)'), 'no target, no write');
});

test('the panel offers the two directions and says why when it cannot', () => {
  // The panel composes the intent from the direction; the editor listens for both by name.
  assert.ok(codeLines(PANEL).some((line) => line.includes('picker-move-${direction}')), 'the panel emits it');
  for (const intent of ['picker-move-up', 'picker-move-down']) {
    assert.ok(codeLines(EDITOR).some((line) => line.includes(intent)), `${intent} is handled`);
  }

  // Disabled WITH a reason: the same discipline as the chips — the user knows before clicking, and
  // the reason is the one the real planner gave.
  assert.match(PANEL, /moveUpReason/u);
  assert.match(PANEL, /moveDownReason/u);
  const options = EDITOR.slice(EDITOR.indexOf('private moveOptions('), EDITOR.indexOf('private resolveMove('));
  assert.ok(options.includes('this.resolveMove('), 'answered by the real planner, not by a guess');
});
