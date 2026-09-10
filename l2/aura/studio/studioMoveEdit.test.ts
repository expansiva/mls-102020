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
  SLICE_MOUNTED_ROOT,
  SLICE_NO_TARGET,
  SLICE_STALE,
  SLICE_UNCLOSED,
  applyInsert,
  applyMove,
  applyRemove,
  duplicatedIds,
  planDuplicate,
  planMove,
  planRemove,
  planRemoveSlice,
  planRestore,
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

// ── Duplicating and removing: the same slice, halved (TASK-102020-duplicate-remove) ──────────────

/** Duplicate by literal, and hand back the resulting source plus where the copy landed. */
function duplicate(source: string, literal: string): { source: string; copy: { start: number; end: number } } {
  const current = scanTemplateTree(source);
  const plan = planDuplicate(source, current, indexOfLiteral(source, literal));
  assert.equal(plan.ok, true, `duplicate ${literal}`);
  const ok = plan as { ok: true; slice: { start: number; end: number }; insertAt: number };
  const result = applyInsert(source, { ok: true, at: ok.insertAt, text: source.slice(ok.slice.start, ok.slice.end) });
  assert.equal(result.ok, true);
  const done = result as { ok: true; source: string; inserted: { start: number; end: number } };
  return { source: done.source, copy: done.inserted };
}

/** Remove by literal, with the address of the hole it left. */
function remove(source: string, literal: string): {
  source: string; at: number; removed: string; before: string; after: string;
} {
  const current = scanTemplateTree(source);
  const index = indexOfLiteral(source, literal);
  const plan = planRemove(source, current, index);
  assert.equal(plan.ok, true, `remove ${literal}`);
  const ok = plan as { ok: true; slice: { start: number; end: number } };
  const result = applyRemove(source, ok);
  assert.equal(result.ok, true);
  const done = result as { ok: true; source: string; removed: string; before: string; after: string };
  return {
    source: done.source,
    at: ok.slice.start,
    removed: done.removed,
    before: done.before,
    after: done.after,
  };
}

test('a duplicated element is byte for byte the same, children and ${...} included', () => {
  const { source: after } = duplicate(PAGE, 'body');

  // Two of them, and the copy carries the whole subtree.
  const copies = [...after.matchAll(/<div class="body">/gu)];
  assert.equal(copies.length, 2);
  assert.equal([...after.matchAll(/<p class="two">dois<\/p>/gu)].length, 2, 'the children came along');
  // The copy sits right after the original: nothing between them.
  assert.match(after, /<\/div><div class="body">/u);
  // And nothing else moved: the neighbours are where they were.
  assert.deepEqual(orderUnder(after, 'wrap'), ['title', 'body', 'body', 'foot']);

  // The interpolation of a duplicated slice travels verbatim.
  const withExpression = duplicate(PAGE, 'foot').source;
  assert.equal([...withExpression.matchAll(/<footer class="foot">\$\{msg\['z'\]\}<\/footer>/gu)].length, 2);
});

test('duplicate then undo gives back the file byte for byte', () => {
  const { source: after, copy } = duplicate(PAGE, 'body');
  const text = after.slice(copy.start, copy.end);

  const plan = planRemoveSlice(after, copy, text);
  assert.equal(plan.ok, true);
  const back = applyRemove(after, plan as { ok: true; slice: { start: number; end: number } });
  assert.equal(back.ok, true);
  assert.equal((back as { ok: true; source: string }).source, PAGE);
});

test('remove then undo gives back the file byte for byte', () => {
  const gone = remove(PAGE, 'body');
  assert.equal(gone.source.includes('class="body"'), false);
  assert.equal(gone.source.includes('class="one"'), false, 'the children went with it');
  assert.deepEqual(orderUnder(gone.source, 'wrap'), ['title', 'foot']);

  const plan = planRestore(gone.source, gone.at, gone.removed, { before: gone.before, after: gone.after });
  assert.equal(plan.ok, true);
  const back = applyInsert(gone.source, plan as { ok: true; at: number; text: string });
  assert.equal(back.ok, true);
  assert.equal((back as { ok: true; source: string }).source, PAGE);
});

test('removing the only child empties the parent, and the undo fills it again', () => {
  // 103 elements of the 102047 and 871 of the 102046 are an only child. Emptying a parent is a
  // legitimate choice — the refusal would be the surprise — and the undo covers the regret.
  const single = [
    'class X {',
    '  render() {',
    '    return html`<section class="wrap"><div class="body"><p class="only">um</p></div></section>`;',
    '  }',
    '}',
  ].join('\n');

  const gone = remove(single, 'only');
  assert.match(gone.source, /<div class="body"><\/div>/u, 'the parent is still there, empty');

  const plan = planRestore(gone.source, gone.at, gone.removed, { before: gone.before, after: gone.after });
  assert.equal(plan.ok, true);
  const back = applyInsert(gone.source, plan as { ok: true; at: number; text: string });
  assert.equal((back as { ok: true; source: string }).source, single);
});

test('a helper root is refused for both — its slice is the CALL', () => {
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
  assert.ok(current.links.some((link) => link.root === body), 'the fixture really mounts it');

  for (const plan of [planDuplicate(withHelper, current, body), planRemove(withHelper, current, body)]) {
    assert.equal(plan.ok, false);
    assert.deepEqual((plan as { ok: false; reason: unknown }).reason, SLICE_MOUNTED_ROOT);
  }
});

test('an element the scanner never saw closed is refused for both', () => {
  // The failure that destroys work: `end` is `source.length`, so copying it would duplicate the rest
  // of the file and removing it would delete it.
  const broken = 'class X { render() { return html`<section class="wrap">'
    + '<h1 class="title">a</h1><p class="one">um</section>`; } }';
  const current = scanTemplateTree(broken);
  const one = current.elements.findIndex((e) => e.literal === 'one');
  assert.equal(current.elements[one].end, broken.length, 'the fixture really is unclosed');

  for (const plan of [planDuplicate(broken, current, one), planRemove(broken, current, one)]) {
    assert.equal(plan.ok, false);
    assert.deepEqual((plan as { ok: false; reason: unknown }).reason, SLICE_UNCLOSED);
  }
});

test('an index nobody has is refused before anything is read', () => {
  for (const plan of [planDuplicate(PAGE, tree, 999), planRemove(PAGE, tree, 999)]) {
    assert.equal(plan.ok, false);
    assert.deepEqual((plan as { ok: false; reason: unknown }).reason, SLICE_NO_TARGET);
  }
});

test('the undo of a duplicate is refused when that slice is no longer there', () => {
  const { source: after, copy } = duplicate(PAGE, 'body');
  const rewritten = after.replace('class="two"', 'class="dois"');

  const plan = planRemoveSlice(rewritten, copy, after.slice(copy.start, copy.end));
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, SLICE_STALE);
});

test('the undo of a remove is refused when the neighbourhood changed', () => {
  // There is nothing at the hole to compare against, so the address is what surrounds it. An offset
  // alone would happily splice markup into the middle of a string literal.
  const gone = remove(PAGE, 'body');
  const rewritten = gone.source.replace('class="title"', 'class="titulo"');

  const plan = planRestore(rewritten, gone.at, gone.removed, { before: gone.before, after: gone.after });
  assert.equal(plan.ok, false);
  assert.deepEqual((plan as { ok: false; reason: unknown }).reason, SLICE_STALE);

  // And the same source, untouched, still restores.
  assert.equal(planRestore(gone.source, gone.at, gone.removed, gone).ok, true);
});

test('the ids a copy would carry are named, and only the real ones', () => {
  const slice = '<div id="hdr-1" aria-labelledby="hdr-1" data-id="x">'
    + '<label for="fld-1">a</label><input id="fld-1"></div>';

  assert.deepEqual(duplicatedIds(slice), ['hdr-1', 'fld-1']);
  // `data-id` is not an id, and a computed one cannot be named.
  assert.deepEqual(duplicatedIds('<div data-id="x" id=${this.uid}></div>'), []);
  assert.deepEqual(duplicatedIds('<p class="a">nada</p>'), []);
});

test('nothing else in the file moves — the rest of the tree is identical', () => {
  // Criterion 2: the removal takes the slice and nothing besides it.
  const gone = remove(PAGE, 'body');
  assert.equal(gone.source, PAGE.replace(gone.removed, ''));

  // And the duplication adds exactly the slice, in one place.
  const { source: after, copy } = duplicate(PAGE, 'body');
  assert.equal(after.length, PAGE.length + (copy.end - copy.start));
  assert.equal(after.slice(0, copy.start) + after.slice(copy.end), PAGE);
});

test('duplicate and remove are one write each, through the same path as every other edit', () => {
  for (const name of ['public async duplicateSelected', 'public async removeSelected']) {
    const write = EDITOR.slice(EDITOR.indexOf(name), EDITOR.indexOf('\n  }\n', EDITOR.indexOf(name)));
    assert.ok(write.includes('await this.commitSource('), `${name}: model + local copy + compile + live`);
    assert.equal((write.match(/commitSource\(/gu) ?? []).length, 1, `${name}: exactly one write`);
    // One at a time, and never onto an element that already left the screen.
    assert.ok(write.includes('if (this.applying)'), `${name}: serialised`);
    assert.ok(write.includes("t('status.gone')"), `${name}: a stale selection is reported`);
  }
  // The model is written in TWO places in this editor and no more: `commitSource` (the class, the
  // move, and these two) and the text path, which predates it and builds its own per-locale status.
  // A third copy of that sequence is how the file and the screen start disagreeing.
  const writes = codeLines(EDITOR).filter((line) => line.includes('pushEditOperations'));
  assert.equal(writes.length, 2, 'commitSource and applyTextEditToSource, nothing else');
});

test('the slice step replays through the planners, and each revalidates on what it can', () => {
  // Taking a slice OUT compares the text that should be there; putting one BACK compares the
  // neighbourhood, because there is nothing at the hole to compare against.
  const step = EDITOR.slice(EDITOR.indexOf('private async applySliceStep'), EDITOR.indexOf('// --- Undo'));
  assert.ok(step.includes('planRestore(source, step.at, step.text, { before: step.before, after: step.after })'));
  assert.ok(step.includes('planRemoveSlice(source, { start: step.at, end: step.at + step.text.length }, step.text)'));
  // The direction is a flip of the operation, not a second branch of code.
  assert.ok(step.includes("const inserting = (step.op === 'insert') === (direction === 'redo');"));
  // A refused plan writes nothing at all.
  assert.equal((step.match(/if \(!plan\.ok\) return false;/gu) ?? []).length, 2);
  assert.ok(step.includes('this.commitSource('), 'and the write is the shared one');

  // The removed node is held STRONGLY: a WeakRef would let it be collected and the undo would put
  // the source right with an empty screen.
  assert.match(EDITOR, /kind: 'slice';[\s\S]*?node: HTMLElement;/u);
  assert.match(EDITOR, /parent: WeakRef<HTMLElement>;\s*\n\s*next: WeakRef<ChildNode> \| null;/u);
  // And the position is captured BEFORE the node leaves the DOM, or there is nowhere to put it back.
  const remove = EDITOR.slice(EDITOR.indexOf('public async removeSelected'));
  const body = remove.slice(0, remove.indexOf('\n  }\n'));
  assert.ok(body.indexOf('const next = el.nextSibling;') < body.indexOf('el.remove();'));
});

test('what the user has to know about a duplicate is on screen BEFORE the click', () => {
  // Two surprises, both invisible afterwards: a node inside a `.map()` makes N copies, and the copy
  // carries the same id (which breaks a `<label for>`).
  const options = EDITOR.slice(EDITOR.indexOf('private sliceOptions'), EDITOR.indexOf('public async duplicateSelected'));
  assert.ok(options.includes('repeatedRenderWarning(resolved.renders)'), 'N renders');
  assert.ok(options.includes('duplicatedIds('), 'the ids');
  assert.ok(options.includes("{ id: 'panel.duplicateIds'"), 'named, not just counted');
  // The real planners answer, so an enabled button is a button that writes.
  assert.ok(options.includes('planDuplicate(source'), 'the duplicate planner');
  assert.ok(options.includes('planRemove(source'), 'and the remove planner');

  // The panel puts the notes where they are read: the button's own tooltip.
  const button = PANEL.slice(PANEL.indexOf('private duplicateButton'), PANEL.indexOf('private removeElementButton'));
  assert.ok(button.includes('duplicateNotes'), 'the notes reach the title');
  assert.ok(button.includes("t('panel.duplicate')"));
});

test('remove asks twice, and only remove asks', () => {
  // The undo is exact but lives in this session's memory: close the Studio and the markup is gone
  // from the source. That is what the second click is for — and it is a click on the button, not a
  // browser `confirm()` (which the app does not own and cannot style).
  const button = PANEL.slice(PANEL.indexOf('private removeElementButton'), PANEL.indexOf('private historyButton'));
  assert.ok(button.includes('this.confirmRemove'), 'armed by the first click');
  assert.equal(codeLines(PANEL).some((line) => line.includes('confirm(')), false, 'never the browser dialog');

  const arm = PANEL.slice(PANEL.indexOf('private onRemoveElement'), PANEL.indexOf('private historyButton'));
  assert.ok(arm.includes('if (!this.confirmRemove) {'), 'the first click only arms');
  assert.ok(arm.indexOf('this.confirmRemove = false;') < arm.indexOf("'picker-remove'"), 'and it disarms as it fires');

  // The arming never survives a render, so the second click has to be deliberate.
  const will = PANEL.slice(PANEL.indexOf('protected willUpdate'));
  assert.ok(will.slice(0, will.indexOf('\n  }')).includes("if (changed.has('target')) this.confirmRemove = false;"));

  // Duplicating does not ask: it is undoable AND visible.
  const duplicate = PANEL.slice(PANEL.indexOf('private duplicateButton'), PANEL.indexOf('private removeElementButton'));
  assert.equal(duplicate.includes('confirm'), false);
});

test('a removal clears the selection: the element the panel described is gone', () => {
  const remove = EDITOR.slice(EDITOR.indexOf('public async removeSelected'), EDITOR.indexOf('private async applySliceStep'));
  for (const step of ['this.selectedEl = null;', 'this.hideClassPanel();', 'this.publishSelection(null);']) {
    assert.ok(remove.includes(step), step);
  }
});

test('the slice operations need no sibling — that is why they reach more than the move', () => {
  // The move needs two nodes ON SCREEN to prove they coexist; duplicating and removing ask about one.
  const resolve = EDITOR.slice(EDITOR.indexOf('private resolveSlice'), EDITOR.indexOf('private sliceOptions'));
  assert.ok(resolve.includes('resolveStructuralAnchor('), 'resolved by position in the tree');
  assert.equal(resolve.includes('domSibling'), false, 'and never by asking for a neighbour');
  assert.equal(resolve.includes('resolveAnchor('), false, 'never by counting a literal');
});
