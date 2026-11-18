/// <mls fileReference="_102020_/l2/aura/studio/pageTreePanel.test.ts" enhancement="_blank" />
// Guards over the page tree's wiring: the editor side (studioEditor.ts) and the panel. The rule itself
// is tested on plain objects in pageTreeCore.test.ts; these pin the promises that only hold if the
// editor keeps using it the way it does now.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { messageIds } from '/_102020_/l2/aura/studio/studioMessages.js';

const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');
const PANEL = readFileSync(new URL('pageTreePanel.ts', import.meta.url), 'utf8');
const PANEL_CSS = readFileSync(new URL('pageTreePanel.less', import.meta.url), 'utf8');
const CORE = readFileSync(new URL('pageTreeCore.ts', import.meta.url), 'utf8');
const SELECT_PAGE = readFileSync(new URL('../plugins/selectPage.ts', import.meta.url), 'utf8');

/** The body of a method or arrow property of the editor, up to the next member at the same indent. */
function member(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.ok(start >= 0, `missing: ${signature}`);
  const rest = source.slice(start + signature.length);
  const end = rest.search(/\r?\n {2}(?:private|public|protected|\/\*\*|\/\/ ---)/u);
  return rest.slice(0, end < 0 ? undefined : end);
}

test('the tree is built with the SAME ownership accessors the pointer uses', () => {
  const access = member(EDITOR, 'private treeAccess(');
  assert.match(access, /this\.ownerTree\(\)/u);
  assert.match(access, /ownerChain\(el, host, owner\)/u);
});

test('a node picked in the tree is selected by the one selection path', () => {
  const select = member(EDITOR, 'private onTreeSelect = ');
  assert.match(select, /this\.selectElement\(el\)/u);
  assert.match(select, /this\.selectElement\(molecule\)/u);
  assert.doesNotMatch(select, /this\.selectedEl = /u, 'no second way of setting the selection');
});

test('the panel is handed DATA: the tree and an id, never an element', () => {
  const publish = member(EDITOR, 'private publishTree(');
  assert.match(publish, /panel\.tree = tree;/u);
  for (const assignment of EDITOR.matchAll(/\.tree = ([^;]+);/gu)) {
    assert.ok(['tree', 'null'].includes(assignment[1].trim()), `panel.tree = ${assignment[1]}`);
  }
  assert.match(member(EDITOR, 'private syncTreeSelection('), /panel\.selectedId = this\.treeIdOf\(/u);
});

test('the tree follows every selection, and a write rebuilds it', () => {
  assert.match(member(EDITOR, 'private publishSelection('), /this\.syncTreeSelection\(\)/u);
  assert.match(member(EDITOR, 'private publishEdited('), /this\.scheduleTree\(\)/u);
});

test('nothing is watched unless the editor is armed AND a tree is on screen', () => {
  const sync = member(EDITOR, 'private syncTreeWatch(');
  assert.match(sync, /this\.mode !== 'off' && this\.treePanelEl !== null/u);
  assert.match(sync, /this\.treeObserver\?\.disconnect\(\)/u);
});

test('a drop in the tree is the arrows’ move: same planner, same writer, one undo step', () => {
  const move = member(EDITOR, 'public async moveInTree(');
  assert.match(move, /treeDropRefusal\(/u);
  assert.match(move, /this\.resolveMoveTo\(el, pivot, detail\.side\)/u);
  assert.match(move, /this\.writeMove\(\{/u);
  assert.match(move, /record: true/u);
  // The arrows ask the same function for their neighbour.
  assert.match(member(EDITOR, 'private resolveMove('), /return this\.resolveMoveTo\(el, neighbour,/u);
});

test('the undo of a move puts the element back next to the neighbour it had, at any distance', () => {
  assert.match(EDITOR, /back: back \? \{ pivot: new WeakRef\(back\.pivot\)/u);
  assert.match(EDITOR, /const recorded = undoing \? step\.back : step\.forth;/u);
});

test('every refusal the tree can give has words, in both catalogs', () => {
  const ids = new Set(messageIds());
  const kinds = /export type TreeDropRefusal = ([^;]+);/u.exec(CORE)?.[1] ?? '';
  const refusals = [...kinds.matchAll(/'(\w+)'/gu)].map((match) => match[1]);
  assert.ok(refusals.length >= 6);
  for (const refusal of refusals) assert.ok(ids.has(`tree.drop.${refusal}`), `tree.drop.${refusal}`);
  for (const kind of ['page', 'organism', 'molecule', 'slot', 'element']) assert.ok(ids.has(`tree.kind.${kind}`));
  for (const layout of ['grid', 'row', 'column']) assert.ok(ids.has(`tree.layout.${layout}`));
});

test('the panel docks while connected and sends ids back', () => {
  assert.match(PANEL, /dockPageTree\(this\)/u);
  assert.match(PANEL, /undockPageTree\(this\)/u);
  assert.match(PANEL, /this\.emit\(TREE_SELECT, node\.id\)/u);
  assert.doesNotMatch(PANEL, /HTMLElement\[\]/u, 'the panel holds no element list');
});

test('the stylesheet keeps the prefix and has no backtick or dollar-brace (it lands in a template literal)', () => {
  assert.doesNotMatch(PANEL_CSS, /`/u);
  assert.doesNotMatch(PANEL_CSS, /\$\{/u);
  const rules = PANEL_CSS.split(/\r?\n/u).filter((line) => !line.trim().startsWith('//')).join('\n');
  for (const cls of rules.matchAll(/\.([a-z][\w-]*)/gu)) {
    if (cls[1] === 'dark') continue;
    assert.ok(cls[1].startsWith('apt-'), `unprefixed class: ${cls[1]}`);
  }
});

test('the tree sits on top of the Visual tab, above the picker; the AI request has its own tab', () => {
  assert.match(SELECT_PAGE, /_renderTabPanel\('visual', html`\$\{this\._renderPageTree\(\)\}\$\{this\._renderClassPicker\(\)\}`\)/u);
  assert.match(SELECT_PAGE, /_renderTabPanel\('ai', this\._editTarget\(page\)\s*\? this\._renderEditPanel\(page\)/u);
  // Selecting an element while the AI tab is open keeps it open: the selection is what the request is about.
  assert.match(SELECT_PAGE, /if \(this\._selection && this\._tab !== 'ai'\) this\._tab = 'visual';/u);
});
