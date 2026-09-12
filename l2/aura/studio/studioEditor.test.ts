/// <mls fileReference="_102020_/l2/aura/studio/studioEditor.test.ts" enhancement="_blank" />
// Source-level guards for the in-place editor. It is DOM-bound (no jsdom here), so what can be tested
// is the invariant that matters and is easy to break by accident: where an edit is allowed to land.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
const TARGET = readFileSync(new URL('studioEditTarget.ts', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('classPickerPanel.ts', import.meta.url), 'utf8');
/** The panel's looks moved out of the component when it went light DOM (classPickerPanel.less). */
const PANEL_CSS = readFileSync(new URL('classPickerPanel.less', import.meta.url), 'utf8');

/** Code lines only: a mention inside a comment is documentation, not a call. */
function codeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));
}

test('an in-place edit stops at the LOCAL store — the editor never writes to the project files', () => {
  // The whole point: an edit writes the model and the local copy (IndexedDB). Reaching the project's
  // files is the save's job. `saveTarget` right after an edit also had a side effect that read as a
  // bug — the lib's `setContents` clears the local copy on success, so nothing ever showed up in
  // IndexedDB.
  const calls = codeLines(EDITOR).filter((line) => line.includes('saveTarget('));
  assert.deepEqual(calls, [], 'the editor must not call saveTarget');

  // And it must not reach the driver by any other door.
  for (const forbidden of ['mls.stor.setContents', 'stor.setContents(']) {
    assert.equal(
      codeLines(EDITOR).some((line) => line.includes(forbidden)),
      false,
      `${forbidden} is a write to the project's files`,
    );
  }
});

test('the local write is still there, and it is the model + IndexedDB pair', () => {
  const code = codeLines(EDITOR);
  assert.equal(code.filter((line) => line.includes('persistLocalEdit(')).length, 2, 'text edit and class edit');
  // The model is the source of truth; the local copy is what a reload reads.
  assert.equal(code.some((line) => line.includes('pushEditOperations')), true);
  // And the compile stays: it feeds the live update and the service worker cache.
  assert.equal(code.some((line) => line.includes('compileAfterEdit(')), true);
});

test('every edit says it is not saved yet', () => {
  // The edit survives a reload but has not reached the project — and nothing else on screen says so.
  const statuses = codeLines(EDITOR).filter((line) => line.includes('this.setStatus(`${what}'));
  assert.ok(statuses.length >= 2, 'both paths report their outcome');
  for (const line of statuses) {
    if (line.includes("t('status.applying')")) continue; // the progress message
    assert.ok(line.includes("t('status.localOnly')"), line);
  }
  // The old wording claimed a save that no longer happens.
  assert.equal(codeLines(EDITOR).some((line) => line.includes('} salvo${where}')), false);
});

test('saveTarget stays available for whoever does the saving, and says who that is', () => {
  assert.match(TARGET, /export async function saveTarget/u);
  assert.match(TARGET, /NOT CALLED BY THE EDITOR/u);
  assert.match(TARGET, /serviceSave/u, 'the doc points at where the save lives');
});

test('the panel is a component, and the editor stopped building markup', () => {
  // The markup, the css and the words moved into classPickerPanel; what stays here is the brain.
  const code = codeLines(EDITOR);
  // `innerHTML` still serves the OVERLAY (the hover/selection boxes on the body), which is a different
  // layer and out of this change; what must be gone is the panel's markup and css.
  assert.equal(code.some((line) => line.includes('innerHTML') && !line.includes('overlayEl')), false,
    'the panel is not hand-built any more');
  assert.equal(code.some((line) => line.includes('se-cp-')), false, 'no panel css left either');
  assert.ok(code.some((line) => line.includes('CLASS_PICKER_TAG')), 'it creates the component');
  for (const intent of ['picker-apply', 'picker-preview', 'picker-close']) {
    assert.ok(code.some((line) => line.includes(intent)), intent);
  }
});

test('the role picker is a palette list, not a native select', () => {
  // A native `<option>` takes no markup, so the only way to show the colour there was to paint the
  // whole row. The swatch needs an element of its own.
  // Code lines only: the file EXPLAINS why there is no select, and that comment is not a select.
  assert.equal(codeLines(PANEL).some((line) => line.includes('<select')), false, 'no native select left');
  assert.ok(PANEL.includes('class="acp-swatch'), 'the swatch is an element');
  // Inline, not floating: the panel scrolls, so a positioned popup would be clipped by its own
  // container.
  assert.match(PANEL_CSS, /\.acp-role-list \{[^}]*display: block/u);
  assert.equal(/\.acp-role-list \{[^}]*position: (absolute|fixed)/u.test(PANEL_CSS), false);
});

test('a preview never outlives the moment it is showing', () => {
  // The bug it guards: the pointer stays over the chips while an edit is written, a hover starts a
  // preview, and the panel then re-reads the element's class attribute — finding the PREVIEWED classes
  // and reporting that they are not in the source. It went away on the next click, which is exactly
  // what a transient DOM state looks like.
  const code = codeLines(EDITOR);

  const inside = (method: string): string => {
    const start = EDITOR.indexOf(`private ${method}`);
    assert.notEqual(start, -1, method);
    return EDITOR.slice(start, EDITOR.indexOf('\n  }', start));
  };

  // Reading the class attribute has to happen with no preview applied.
  const show = inside('async showClassPanel');
  assert.ok(show.indexOf('previewAnimation(null)') < show.indexOf("getAttribute('class')"), 'cancel BEFORE reading');
  // Closing the panel cannot leave a preview on the element.
  assert.ok(inside('hideClassPanel').includes('previewAnimation(null)'));
  // And the cancel must not depend on the panel state that may already be gone.
  assert.ok(code.some((line) => line.includes('private previewEl')), 'the preview owns its element');
});

test('two fast clicks cannot silently revert each other', () => {
  // Both would compute from the SAME starting literal, and the second would overwrite the first.
  const start = EDITOR.indexOf('private async applyLiteralChange');
  const body = EDITOR.slice(start, EDITOR.indexOf('\n  }', start));
  assert.ok(body.includes('if (this.applying)'), 'the write is serialised');
  assert.ok(body.includes('finally'), 'and the flag is released even when the write throws');
});

test('a pasted style is written like every other edit, and its preview is HELD', () => {
  // The gesture is copy on one element, paste on another — so the clipboard is the ONE piece of panel
  // state that must survive a change of selection.
  const willUpdate = PANEL.slice(PANEL.indexOf('protected willUpdate'));
  assert.equal(
    willUpdate.slice(0, willUpdate.indexOf('\n  }')).includes('clipboard'),
    false,
    'the copied style must not be dropped with the rest of the per-selection state',
  );

  // The panel asks, the editor writes. A paste that reached the model from here would skip the
  // anchoring, the local store and the live update.
  for (const write of ['pushEditOperations', 'persistLocalEdit', 'setContent']) {
    assert.equal(codeLines(PANEL).some((line) => line.includes(write)), false, `${write} belongs to the editor`);
  }
  assert.ok(PANEL.includes("this.applyLiteral(result, t('status.pasted'"), 'the paste goes out as picker-apply');

  // An animation preview undoes itself after a moment; a paste preview must NOT — the eyes are on the
  // summary while the pointer is on the button, and a result that vanishes mid-read is a bug report.
  const start = EDITOR.indexOf('private previewLiteral');
  assert.notEqual(start, -1);
  const preview = EDITOR.slice(start, EDITOR.indexOf('\n  }', start));
  assert.ok(preview.includes('if (timeout)'), 'the timer is opt-in');
  assert.ok(EDITOR.includes('this.previewLiteral(applyAnimationOption('), 'and the animation asks for one');
});

test('the editor chrome follows the viewport, not the end of the document', () => {
  // The bug: as `absolute` inside the service element, `bottom: 12px` hangs from the bottom of the
  // whole scrollable content, so on any page long enough to scroll the panel sat below the fold.
  // In the light DOM the host rule is the TAG itself (`& { … }` inside it, in the .less).
  assert.match(PANEL_CSS, /& \{[\s\S]*?position: fixed/u, 'the panel is fixed');
  assert.match(EDITOR, /\.se-status \{[\s\S]*?position: fixed/u, 'and so is the toast');

  const scroll = EDITOR.slice(EDITOR.indexOf('private onScrollResize'));
  assert.ok(scroll.slice(0, scroll.indexOf('};')).includes('positionChrome()'), 're-pinned on scroll and resize');

  // Fixed means the host no longer has to be turned into a containing block — and the client's own
  // styling was never ours to change.
  assert.equal(codeLines(EDITOR).some((line) => line.includes("style.position = 'relative'")), false);

  // The placement corrects itself: `fixed` answers to the viewport only while no ancestor has a
  // transform, a filter or `contain`, and the host is the shell's, not ours.
  const pin = EDITOR.slice(EDITOR.indexOf('private pin('));
  assert.ok(pin.slice(0, pin.indexOf('\n  }')).includes('getBoundingClientRect'), 'placed, measured, corrected');
});

test('nothing is a foreign molecule while this page own file is unknown', () => {
  // The bug: with `target === null` every tag was compared against `undefined`, so the page's OWN
  // element read as a molecule from another project — "this element comes from a molecule (project
  // 102046)" naming the client's own project, on almost every click of that page. The real problem
  // was the target, and that is what has to be said.
  const foreign = EDITOR.slice(EDITOR.indexOf('private foreignProjectOfTag'));
  const body = foreign.slice(0, foreign.indexOf('\n  }'));
  assert.ok(body.includes('const own = this.target?.project;'), 'it reads our own project first');
  assert.ok(body.includes('if (!own) return null;'), 'and judges nothing without it');

  // Order matters as much as the guard: the target failure is reported before the molecule check.
  const show = EDITOR.slice(EDITOR.indexOf('private async showClassPanel'));
  const flow = show.slice(0, show.indexOf('\n  }\n'));
  assert.ok(flow.indexOf('if (!this.target)') < flow.indexOf('foreignProjectOfAncestor'), 'target first');
  // And it says WHY the page could not be resolved instead of a generic sentence.
  assert.ok(flow.includes('this.targetFailure'), 'the real reason is kept and shown');
});

test('an element with no class can be given one — and never a second', () => {
  // The "+" made an element with no class attribute worth opening: the anchor is structural and the
  // first write inserts the attribute.
  assert.match(EDITOR, /\| \{ kind: 'insert'; path: IDomPathStep\[\] \}/u);

  const locate = EDITOR.slice(EDITOR.indexOf("if (anchor.kind === 'insert')"));
  const body = locate.slice(0, locate.indexOf('\n    }'));
  assert.ok(body.includes('resolved.element.literal !== null'), 'a class that appeared meanwhile aborts');
  assert.ok(body.includes('resolved.element.classComputed'), 'and so does a computed one');

  // The write carries the attribute syntax only for an insertion.
  assert.ok(EDITOR.includes('match.insert ? ` class="${to}"` : to'));
});

test('undo walks the same write as any other edit, and the shortcut stays contained', () => {
  const code = codeLines(EDITOR);
  // NOT the Monaco stack: `model.undo()` undoes the text and leaves the screen, the compile, the live
  // update and the local copy behind — the file and the screen would drift apart.
  assert.equal(code.some((line) => line.includes('model.undo(')), false, 'no shortcut through Monaco');

  const inside = (name: string, end = '\n  }'): string => {
    const start = EDITOR.indexOf(name);
    assert.notEqual(start, -1, name);
    return EDITOR.slice(start, EDITOR.indexOf(end, start));
  };

  const step = inside('private async applyStep');
  assert.ok(step.includes('this.writeClassLiteral('), 'a class step goes through the normal write');
  assert.ok(step.includes('this.applyTextEditToSource('), 'and a text step through the normal one');

  // Nothing is popped on faith: peek, apply, and only then commit — or drop the whole branch.
  const travel = inside('private async travel');
  for (const call of ['peekUndo()', 'commitUndo()', 'dropUndo()', 'if (this.applying)']) {
    assert.ok(travel.includes(call), call);
  }

  // The shortcut: captured, stopped, and never taken from a field that has its own undo.
  const key = inside('private onEditorKey', '\n  };');
  assert.ok(key.includes('e.stopPropagation()'), 'the page and the shell must not see it');
  assert.ok(key.includes('this.editSpan || this.isTypingTarget(e)'), 'a field keeps its own undo');
  assert.ok(EDITOR.includes("window.addEventListener('keydown', this.onEditorKey, true)"), 'capture phase');
  assert.ok(EDITOR.includes("window.removeEventListener('keydown', this.onEditorKey, true)"), 'and removed');

  // Only a write that landed is recorded — an edit refused as dynamic text changed nothing, and
  // undoing it would undo the previous one instead.
  assert.ok(EDITOR.includes('if (!result.ok) return;'), 'the text push is guarded by the outcome');
});

test('a step carries BOTH directions, because they are not the same anchor', () => {
  // An edit that CREATED the class attribute is undone by removing it (`insert` one way, `structural`
  // the other), and a literal found by counting can be the 3rd `p-2` before and the 1st `p-4` after.
  assert.match(EDITOR, /anchorBefore: ClassAnchor;\s*\n\s*anchorAfter: ClassAnchor;/u);

  const start = EDITOR.indexOf('private reverseAnchor');
  const body = EDITOR.slice(start, EDITOR.indexOf('\n  }', start));
  assert.ok(body.includes("kind: 'occurrence', occurrence"), 'the count is the one measured AFTER');
  assert.ok(body.includes("literal ? { kind: 'structural'"), 'and the kind follows what is expected');

  // The count comes from the write itself, not from a guess.
  assert.ok(EDITOR.includes('findClassAttrs(newSource, to).findIndex'));
});

test('the pointer target is resolved by geometry, and the same way for hover and click', () => {
  // The bug: a disabled control has its click PREVENTED — the event never exists, not for the
  // element and not for its ancestors — so the armed stylesheet makes it transparent to hit-testing
  // and the click lands on an ancestor. Walking down by geometry is what turns that back into the
  // button the user clicked.
  const code = codeLines(EDITOR);

  const inside = (name: string, end = '\n  }'): string => {
    const start = EDITOR.indexOf(name);
    assert.notEqual(start, -1, name);
    return EDITOR.slice(start, EDITOR.indexOf(end, start));
  };

  assert.ok(inside('private resolvePointerTarget').includes('deepestAt('), 'geometry, not the target');
  // NEVER elementFromPoint: it respects the very `pointer-events: none` we put there and would hand
  // back the ancestor we are trying to see through.
  assert.equal(code.some((line) => line.includes('elementFromPoint')), false);

  // Both paths, or the outline points at one element and the click selects another.
  assert.ok(inside('private onHostClick', '\n  };').includes('this.resolvePointerTarget(e, target)'), 'click');
  const hover = inside('private onHostMouseMove', '\n  };');
  assert.ok(hover.includes('this.resolvePointerTarget(e, target)'), 'hover');
  // And the hover cache has to compare the RESOLVED element: the pointer can cross a disabled button
  // without `e.target` ever changing.
  assert.ok(hover.includes('hovered === this.lastHoveredEl'), 'the cache compares what was resolved');
  assert.equal(hover.includes('target === this.lastHoveredEl'), false);
});

test('the two pointer-events rules live in the stylesheet the editor removes', () => {
  const styles = EDITOR.slice(EDITOR.indexOf('private injectStyles'), EDITOR.indexOf('private drawSelection'));

  // Scoped to the shell: the editor's own chrome sits on the body, outside it, so the panel's
  // disabled chips keep behaving like buttons.
  assert.match(styles, /collab-aura-shell :disabled \{ pointer-events: none; \}/u);
  // The toast sits over the app's bottom strip and used to swallow clicks there while it was up.
  assert.match(styles, /\.se-status \{[\s\S]*?pointer-events: none/u);

  // Both are in THIS stylesheet, and this stylesheet goes away when the editor disarms — the client
  // page must not keep an editor rule after that.
  assert.ok(codeLines(EDITOR).some((line) => line.includes('document.getElementById(STYLE_ID)?.remove()')));
});

// ── Live slots: the page markup a molecule was handed ────────────────────────────────────────────

/** The body of a member, from its declaration to the closing brace at member indentation. */
function memberOf(source: string, name: string, end = '\n  }'): string {
  const start = source.indexOf(name);
  assert.notEqual(start, -1, name);
  return source.slice(start, source.indexOf(end, start));
}

test('the three layers ask the SAME question about who owns the markup', () => {
  // Selection, scope and the structural path each used to walk `parentElement` on their own, and any
  // disagreement between them is a tool that lies: the outline follows one element while the click
  // selects another, or the panel names a file the write will not land in. One walk, three readers.
  for (const [member, end] of [
    ['private resolveSelectableElement', '\n  }'],
    ['private foreignProjectOfAncestor', '\n  }'],
    ['private domPathOf', '\n  }'],
  ] as const) {
    assert.ok(memberOf(EDITOR, member, end).includes('this.ownerChainOf('), member);
  }

  // And the raw walk is gone from all three: a `parentElement` chain cannot tell the markup the page
  // passed into a live slot from the molecule's own, because projection MOVED it in there.
  for (const member of ['private resolveSelectableElement', 'private foreignProjectOfAncestor']) {
    assert.equal(memberOf(EDITOR, member).includes('.parentElement'), false, member);
  }
  // `domPathOf` still reads `parentElement` — deliberately, and only to COUNT siblings: the anchor
  // holds exactly the source's children, so their order there is the source's order.
  const path = memberOf(EDITOR, 'private domPathOf');
  assert.equal(path.includes('current.parentElement'), false, 'not to build the chain');
  assert.ok(path.includes('node.parentElement'), 'but still to measure each step');
});

test('hover and click resolve the same element, inside a molecule too', () => {
  // They disagreed exactly where it hurt most: the outline followed the internal div while the click
  // jumped to the molecule. That reads as a rendering defect rather than as the scope rule it is —
  // TASK-102020-select-inert-elements called that shape worse than the bug it fixed.
  const hover = memberOf(EDITOR, 'private onHostMouseMove', '\n  };');
  const click = memberOf(EDITOR, 'private onHostClick', '\n  };');

  for (const [where, body] of [['hover', hover], ['click', click]] as const) {
    assert.ok(body.includes('this.resolvePointerTarget(e, target)'), `${where}: geometry`);
    assert.ok(body.includes('this.resolveSelectableElement('), `${where}: ownership`);
  }
});

test('the boundary is read from what the anchor HOLDS', () => {
  // `_fillAnchor` reuses anchors by position, so during a sort an anchor still carries the key it
  // was rendered with while already holding another row's nodes. Reading `mlLiveSlot`/`mlLiveRef`
  // there resolves the previous row's source, and the panel edits a cell nobody clicked.
  const tree = memberOf(EDITOR, 'private ownerTree');
  assert.ok(tree.includes('dataset.mlLiveHeld'), 'held is what is in there now');
  assert.equal(tree.includes('dataset.mlLiveSlot'), false);
  assert.equal(tree.includes('dataset.mlLiveRef'), false);

  // The source is hunted inside the molecule that rendered the anchor: the keys (`Scene`, `ref3`)
  // are per molecule, and a document-wide lookup would happily return another molecule's source.
  const source = memberOf(EDITOR, 'private liveSlotSource');
  assert.ok(source.includes('this.owningComponent(anchor)'), 'scoped to its molecule');
  assert.equal(source.includes('document.querySelector'), false);
});

test('the page own element is never treated as a molecule', () => {
  // Without the guard a page whose file could not be resolved compares every tag against `null`, and
  // the page's own element reads as a foreign component — which collapses every click on it.
  const tree = memberOf(EDITOR, 'private ownerTree');
  assert.ok(tree.includes('pageTag !== null'), 'no page tag, no collapsing');
  assert.ok(tree.includes('tag !== pageTag'));
});

// ── The breadcrumb of the selection (TASK-102020-ancestor-breadcrumb) ────────────────────────────

test('the breadcrumb selects through the SAME path as a click', () => {
  // Two ways to select would eventually disagree about what the panel is showing — the failure this
  // whole file keeps guarding against. The pointer resolves the element and the breadcrumb reads it
  // off the chain, but from there on it is one method.
  const select = memberOf(EDITOR, 'private selectElement');
  for (const step of ['this.selectedEl = el', 'this.drawSelection()', 'this.publishSelection(el)',
    'this.showClassPanel(el)', 'this.lastHoveredEl = null']) {
    assert.ok(select.includes(step), step);
  }

  const click = memberOf(EDITOR, 'private onHostClick', '\n  };');
  assert.ok(click.includes('this.selectElement(selectableEl)'), 'the click goes through it');
  assert.equal(click.includes('this.selectedEl ='), false, 'and no longer selects on its own');
  const level = memberOf(EDITOR, 'private selectLevel');
  assert.ok(level.includes('this.selectElement(el)'), 'so does the breadcrumb');
});

test('the panel is handed the chain as DATA, and resolves it by index', () => {
  // The state manager keeps every value it is handed in a 10.000-entry log and the panel outlives the
  // page it edits: a live node in either would outlive what it points at. So the panel gets a tag, a
  // literal and an index — and the index comes back.
  const render = memberOf(EDITOR, 'private renderClassPanel');
  assert.ok(render.includes('levels: state.levels.map('), 'mapped, not passed');
  const fields = ['tag: node.tagName.toLowerCase()', "node.getAttribute('class')", 'current: node === state.el'];
  for (const field of fields) {
    assert.ok(render.includes(field), field);
  }
  assert.equal(/levels: state\.levels[,\s]/u.test(render), false, 'never the elements themselves');

  // The panel's side of the contract: no DOM type reaches it.
  const declared = PANEL.slice(
    PANEL.indexOf('export interface IPickerLevel'),
    PANEL.indexOf('export interface IPickerTarget'),
  );
  assert.ok(declared.includes('index: number;'), 'the handle is the index');
  assert.equal(/HTMLElement|Element(?![a-zA-Z])/u.test(declared), false, 'and never a node');

  // Resolving happens where the elements live, and a chain that aged out says so instead of writing.
  const resolve = memberOf(EDITOR, 'private selectLevel');
  assert.ok(resolve.includes('this.classPanel?.levels[index]'), 'the editor owns the chain');
  assert.ok(resolve.includes("t('status.gone')"), 'a level that left the DOM is reported, not written');
});

test('the chain is recomputed for every selection', () => {
  // It ages: a re-render (the scenario panel writing a state, a live update) replaces the nodes. It is
  // built where the panel state is built, so it cannot outlive the selection it describes.
  const show = memberOf(EDITOR, 'private async showClassPanel');
  assert.ok(show.includes('levels: this.selectionLevels(el),'), 'part of the panel state');
  assert.equal(codeLines(EDITOR).some((line) => line.includes('private chain')), false,
    'no second copy of the chain in a field of its own');
  // And it is the SAME ownership walk as the selection and the anchor — not a parentElement chain.
  assert.ok(memberOf(EDITOR, 'private selectionLevels').includes('this.ownerChainOf(el)'));
  assert.equal(memberOf(EDITOR, 'private selectionLevels').includes('.parentElement'), false);
});

test('hovering a level marks it with the box the pointer already draws', () => {
  // Without it `div › div › div` is decoration: the only way to tell the levels apart would be to
  // select each one and look, which is the trial and error the breadcrumb exists to remove.
  const hover = memberOf(EDITOR, 'private onPickerLevelHover', '\n  };');
  assert.ok(hover.includes('this.drawHover(el)'), 'the same drawing as the pointer');
  assert.ok(hover.includes('this.classPanel?.levels[e.detail]'), 'resolved from the chain, by index');
  assert.ok(hover.includes('this.drawSelection()'), 'and the mark goes back when the pointer leaves');
});

test('Esc has three owners and this is the order', () => {
  // The risk of the task: reaching for "one level up" and losing the text being typed. The text edit
  // owns Esc first, then a field of the panel, and only then does the selection move — and the panel
  // closes only when there is nowhere left to go up.
  const key = memberOf(EDITOR, 'private onEditorKey', '\n  };');
  const esc = key.slice(key.indexOf("if (e.key === 'Escape')"));
  assert.notEqual(esc, '', 'the handler answers Escape');

  const typing = esc.indexOf('this.editSpan || this.isTypingTarget(e)');
  const up = esc.indexOf('this.selectParentLevel()');
  const close = esc.indexOf('this.hideClassPanel()');
  assert.ok(typing >= 0 && up > typing, 'the text being edited keeps its cancel');
  assert.ok(close > up, 'and closing is the fallback of going up, not the other way round');
  // The listener is on the WINDOW in capture, so it runs BEFORE the span's own handler: returning is
  // what leaves the cancel to it. Preventing anything there would eat the text.
  assert.ok(esc.slice(typing, up).includes('return;'), 'it returns without touching the event');
  assert.ok(esc.includes('if (!this.classPanel) return;'), 'with nothing open the key is not ours');
});

// ── Text that lives in an attribute (TASK-102020-attribute-text) ─────────────────────────────────

test('an attribute edit is the SAME write as the text between tags', () => {
  // The whole reason this feature is cheap: an i18n edit rewrites the catalog ENTRY, in every locale
  // that declares it — so changing a `placeholder` is byte for byte the same write as changing a
  // `<p>`. A second writer here would be a second set of bugs (no compile, no live update, no undo).
  const write = memberOf(EDITOR, 'private async applyAttributeEdit');
  assert.ok(write.includes('this.applyTextEditToSource({'), 'it goes through the shared writer');

  // And there is exactly ONE call to the text module's write in the whole editor.
  const calls = codeLines(EDITOR).filter((line) => line.includes('applyTextEdit('));
  assert.equal(calls.length, 1, 'applyTextEdit is called in one place only');

  // The screen first, then the source, and a refused write puts the attribute back.
  assert.ok(write.includes('el.setAttribute(attribute, newValue)'), 'optimistic');
  assert.ok(write.includes('revert: () => el.setAttribute(attribute, before)'), 'and undone on failure');
  // Serialised like every other write, and never onto an element that left the screen.
  assert.ok(write.includes('if (this.applying)'), 'one edit at a time');
  assert.ok(write.includes("t('status.gone')"));
});

test('the list of text attributes is closed, and nothing on it is a link', () => {
  // `id`, `for`, `href`, `value` and `data-*` carry strings too — editing one of those changes a
  // BINDING, not content, and the panel must not be able to reach them.
  const list = EDITOR.slice(EDITOR.indexOf('const TEXT_ATTRIBUTES'), EDITOR.indexOf('] as const;') + 10);
  assert.match(list, /\['placeholder', 'title', 'aria-label', 'alt'\]/u);
  for (const forbidden of ['id', 'for', 'href', 'value', 'data-']) {
    assert.equal(list.includes(`'${forbidden}'`), false, forbidden);
  }

  // The panel is chrome: what comes back from it is checked against the closed list AND against the
  // keys that were offered, so an event nobody could have produced writes nothing.
  const write = memberOf(EDITOR, 'private async applyAttributeEdit');
  assert.ok(write.includes('TEXT_ATTRIBUTES.includes(attribute'), 'the attribute is validated');
  assert.ok(write.includes('text.keys.includes(key)'), 'and so is the key');
});

test('the key of an attribute comes from the SOURCE first, and from the value as the fallback', () => {
  // Measured on the real pages: the VALUE alone is ambiguous for 36 of the 47 attributes of the
  // 102047 — the same sentence is the value of three to five keys — and an attribute has no position
  // in the DOM to break that tie with. The MARKUP has no such problem: `title=${msg['x']}` names the
  // key at the element's own open tag, and the structural anchor already knows which element that is.
  const resolve = memberOf(EDITOR, 'private async resolveTextAttributes');
  assert.ok(resolve.includes('this.locateElementInSource('), 'the element in the source');
  assert.ok(resolve.includes('await this.resolveCandidates()'), 'page, organisms and shared, like the write');
  // Read as an ATTRIBUTE and nothing else: `<svg><title>` is an ELEMENT with the same name, and a
  // querySelector here would edit it as if it were one.
  assert.ok(resolve.includes('el.getAttribute(attribute)'));
  assert.equal(resolve.includes('querySelector'), false);
  // A blank attribute is not a text with no key — it is not a text at all.
  assert.ok(resolve.includes('if (!value.trim()) continue;'));

  // `\n  }\n`: the member takes an inline object type, whose own closing brace is `\n  })`.
  const one = memberOf(EDITOR, 'private resolveAttrText', '\n  }\n');
  assert.ok(one.indexOf('extractI18nKeyFromExpression') < one.indexOf('findAllI18nMatches'),
    'the source is asked before the sentence');
  assert.ok(one.includes('this.keyInCatalog(key, where.candidates)'), 'and a key nobody declares is no key');
  // The grammar of what a key looks like lives in ONE place (studioTextEdit): a copy of the
  // `msg['…']` shape here would drift from the one the template map reads.
  assert.equal(codeLines(EDITOR).some((line) => line.includes('msg[')), false, 'no second copy of the grammar');
  // Data and static markup get their own reason instead of a shrug.
  for (const id of ['reason.attrIsData', 'reason.attrStaticText', 'reason.attrNotInCatalog']) {
    assert.ok(one.includes(id), id);
  }

  // Only a POSITION can name an element: an `occurrence` anchor knows where a class literal is, and
  // reading attributes there would read them off the first element that happens to share it.
  assert.ok(memberOf(EDITOR, 'private locateElementInSource').includes("anchor.kind === 'occurrence'"));

  // Resolved at SELECTION time and not gated by the class anchor: an element whose class literal
  // could not be located can still have an editable title.
  const show = memberOf(EDITOR, 'private async showClassPanel');
  assert.ok(show.includes('state.texts = await this.resolveTextAttributes(el, state);'));
  assert.ok(show.indexOf('resolveClassAnchor') < show.indexOf('resolveTextAttributes'), 'after, never instead');
});

test('undo of an attribute edit walks the same writer', () => {
  // Criterion 5: Ctrl+Z is the editor's own stack, and the step replays through the shared write —
  // the file and the screen cannot drift apart.
  assert.match(EDITOR, /kind: 'attr';\s*\n\s*attribute: string;\s*\n\s*i18nKey: string;/u);

  const step = memberOf(EDITOR, 'private async applyStep');
  const attr = step.slice(step.indexOf("if (step.kind === 'attr')"));
  assert.ok(attr.includes('live?.setAttribute(step.attribute, to)'), 'the screen follows');
  assert.ok(attr.includes('this.applyTextEditToSource({'), 'and the source through the same door');
  assert.ok(attr.includes('i18nKey: step.i18nKey'), 'the address is the key, as in the text step');
  assert.ok(attr.includes("t('status.offscreen')"), 'a file put right with no screen says so');

  // Only a write that landed is recorded.
  const write = memberOf(EDITOR, 'private async applyAttributeEdit');
  assert.ok(write.includes('if (result.ok) {'), 'the push is guarded by the outcome');
});

test('the panel never picks a key for an ambiguous text', () => {
  // Risk 2 of the task: in the 102047 three keys hold "Nenhum registro encontrado", and an attribute
  // has no position in the DOM to break the tie with. Picking one would write a sentence the user
  // never pointed at.
  // The FULL signature: `private textKeys` (the chosen-key state) is a prefix of this name.
  const key = memberOf(PANEL, 'private textKey(text: IPickerText)', '\n  }');
  assert.ok(key.includes('text.keys.length === 1'), 'one key needs no choosing');
  assert.ok(key.includes("return chosen && text.keys.includes(chosen) ? chosen : '';"), 'anything else asks');

  // Full signature again: `renderTexts` (the section) is a prefix of `renderText` (the row).
  const row = memberOf(PANEL, 'private renderText(text: IPickerText)', '\n  }');
  assert.ok(row.includes("t('panel.textPickKey'"), 'and the row says so');
  assert.ok(row.includes("t('reason.attrNotInCatalog')"), 'a text with no key shows the reason');
  // The input only exists once a key is settled.
  assert.ok(row.indexOf('const chosen = this.textKey(text);') < row.indexOf('acp-text-input'));

  // Enter applies, Esc gives up, and the write is asked for ONCE (Enter plus the blur that follows).
  const commit = memberOf(PANEL, 'private commitText', '\n  }');
  assert.ok(commit.includes('this.lastSent[text.attribute]'), 'the same edit is not sent twice');
  assert.ok(commit.includes("'picker-text'"));
  // The panel asks; it never writes.
  for (const forbidden of ['applyTextEdit', 'pushEditOperations', 'persistLocalEdit']) {
    assert.equal(codeLines(PANEL).some((line) => line.includes(forbidden)), false, forbidden);
  }
});
