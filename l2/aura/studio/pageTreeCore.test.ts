/// <mls fileReference="_102020_/l2/aura/studio/pageTreeCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ownerChain, type IOwnerTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import {
  buildPageTree,
  findNode,
  layoutOf,
  moleculeShortName,
  pathTo,
  REPEAT_MIN,
  searchTree,
  treeDropRefusal,
  type IPageTreeAccess,
  type IPageTreeNode,
} from '/_102020_/l2/aura/studio/pageTreeCore.js';

// ─── A tiny DOM of plain objects ─────────────────────────────────────────────

interface N {
  tag: string;
  parent: N | null;
  kids: N[];
  attrs: Record<string, string>;
  text?: string;
  /** Declared slot name when this is a slot element the page wrote. */
  slot?: string;
  /** Live-slot anchor key (molecule markup that holds projected content). */
  anchor?: string;
  hidden?: boolean;
}

function el(tag: string, attrs: Record<string, string> = {}, kids: N[] = [], extra: Partial<N> = {}): N {
  const node: N = { tag, parent: null, kids, attrs, ...extra };
  for (const kid of kids) kid.parent = node;
  return node;
}

function all(root: N): N[] {
  const out: N[] = [];
  const walk = (node: N): void => { out.push(node); node.kids.forEach(walk); };
  root.kids.forEach(walk);
  return out;
}

const PAGE_TAG = 'app--my-page';

function setup(page: N): { host: N; access: IPageTreeAccess<N>; tree: IOwnerTree<N>; nodes: N[] } {
  const host = el('div', {}, [page]);
  const nodes = all(host);
  // A projection anchor's source: the slot element with that name under the nearest molecule.
  const sourceOf = (anchor: N, key: string): N | null => {
    for (let at = anchor.parent; at; at = at.parent) {
      if (at.tag.includes('-') && at.tag !== PAGE_TAG) return at.kids.find((kid) => kid.slot === key) ?? null;
    }
    return null;
  };
  const tree: IOwnerTree<N> = {
    parent: (node) => node.parent,
    slotAnchor: (node) => node.anchor ?? null,
    slotSource: sourceOf,
    component: (node) => (node.tag.includes('-') && node.tag !== PAGE_TAG ? node.tag : null),
    slotElement: (node) => Boolean(node.slot),
  };
  const access: IPageTreeAccess<N> = {
    chain: (node) => ownerChain(node, host, tree),
    tag: (node) => node.tag,
    slotName: (node) => node.slot ?? null,
    isMolecule: (node) => node.tag.includes('-') && node.tag !== PAGE_TAG,
    attr: (node, name) => node.attrs[name] ?? null,
    attributeNames: (node) => Object.keys(node.attrs),
    ownText: (node) => node.text ?? '',
    hidden: (node) => Boolean(node.hidden),
  };
  return { host, access, tree, nodes };
}

const names = (node: IPageTreeNode): string[] => node.children.map((kid) => kid.name);

// ─── The page used by most tests ─────────────────────────────────────────────

function samplePage(): { page: N; label: N; inner: N; projected: N; scene: N } {
  const label = el('label', {}, [], { slot: 'Label', text: 'Nova despesa' });
  const inner = el('span', { class: 'ml-btn-inner' }, [], { text: 'Nova despesa' });
  const button = el('grouptriggeraction--ml-button-standard', { 'data-variant': 'primary' }, [label, el('button', {}, [inner])]);

  const scene = el('scene', { value: 'list' }, [], { slot: 'Scene' });
  const projected = el('div', { class: 'flex flex-col gap-5' }, [el('p', {}, [], { text: 'Conteúdo da cena' })]);
  const scenary = el('molecules--ml-scenary-102020', {}, [
    scene,
    el('div', { class: 'ml-scenary-body' }, [el('span', {}, [projected], { anchor: 'Scene' })]),
  ]);

  const page = el(PAGE_TAG, {}, [
    el('h1', { class: 'text-2xl' }, [], { text: 'Minhas despesas' }),
    el('section', { 'data-organism-id': 'lista', class: 'grid grid-cols-2 gap-4' }, [button]),
    scenary,
  ]);
  return { page, label, inner, projected, scene };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('the tree offers exactly what a click could select — the same predicate as the editor', () => {
  const { page } = samplePage();
  const { access, nodes } = setup(page);
  const { handles } = buildPageTree(page, nodes, access);
  // The editor's resolveSelectableElement, spelled over the same chain.
  const selectable = (node: N): N => {
    const { chain, ownerBreak } = access.chain(node);
    return ownerBreak < 0 ? node : (chain[ownerBreak] ?? node);
  };
  const clickable = new Set([page, ...nodes.filter((node) => access.chain(node).chain[0] === page && selectable(node) === node)]);
  assert.deepEqual(new Set(handles), clickable);
});

test('a molecule is a leaf of slots: its internal markup never shows, its slots do', () => {
  const { page, label, inner } = samplePage();
  const { access, nodes } = setup(page);
  const { tree, handles } = buildPageTree(page, nodes, access);
  assert.ok(!handles.includes(inner), 'the molecule internal span is not offered');
  const button = tree.root.children[1].children[0];
  assert.equal(button.kind, 'molecule');
  assert.equal(button.name, 'ml-button-standard');
  assert.deepEqual(names(button), ['Label']);
  assert.equal(handles[button.children[0].id], label);
  // With no text of its own, a molecule reads by its first slot.
  assert.equal(button.text, 'Nova despesa');
});

test('content a live slot moved into the molecule hangs under the slot source, where the page wrote it', () => {
  const { page, projected, scene } = samplePage();
  const { access, nodes } = setup(page);
  const { tree, handles } = buildPageTree(page, nodes, access);
  const scenary = tree.root.children[2];
  assert.equal(scenary.name, 'ml-scenary');
  assert.deepEqual(names(scenary), ['Scene']);
  const sceneNode = scenary.children[0];
  assert.equal(handles[sceneNode.id], scene);
  assert.equal(sceneNode.kind, 'slot');
  assert.equal(handles[sceneNode.children[0].id], projected);
  assert.equal(sceneNode.children[0].layout, 'column');
  assert.deepEqual(names(sceneNode.children[0]), ['p']);
});

test('names: organism by its id, molecule by its short name, element by tag + own text', () => {
  const { page } = samplePage();
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  const [h1, section] = tree.root.children;
  assert.equal(tree.root.kind, 'page');
  assert.deepEqual([h1.kind, h1.name, h1.text], ['element', 'h1', 'Minhas despesas']);
  assert.deepEqual([section.kind, section.name, section.layout, section.columns], ['organism', 'lista', 'grid', 2]);
});

test('a naming attribute wins over the text, and long text is cut', () => {
  const page = el(PAGE_TAG, {}, [
    el('div', { 'aria-label': 'Filtrar por situação' }, [], { text: 'ignored' }),
    el('p', {}, [], { text: 'x'.repeat(80) }),
  ]);
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  assert.equal(tree.root.children[0].text, 'Filtrar por situação');
  assert.ok(tree.root.children[1].text.endsWith('…'));
  assert.ok(tree.root.children[1].text.length <= 33);
});

test(`look-alike siblings fold into a group from ${REPEAT_MIN} on, and the group opens to every item`, () => {
  const row = (key: string, text: string): N => el('tr', { key, class: 'border-t' }, [], { text });
  const page = el(PAGE_TAG, {}, [
    el('tbody', {}, [row('1', 'a'), row('2', 'b'), row('3', 'c'), row('4', 'd')]),
    el('div', {}, [el('button', { class: 'x' }), el('button', { class: 'x' })]),
    el('div', {}, [el('li', { class: 'on' }), el('li', { class: 'off' }), el('li', { class: 'off' }), el('li', { class: 'off' })]),
  ]);
  const { access, nodes } = setup(page);
  const { tree, handles } = buildPageTree(page, nodes, access);
  const [tbody, pair, list] = tree.root.children;

  assert.equal(tbody.children.length, 1);
  const group = tbody.children[0];
  assert.equal(group.repeated, 4);
  assert.deepEqual(group.children.map((item) => item.text), ['a', 'b', 'c', 'd']);
  assert.ok(group.children.every((item) => item.item && tree.parentOf[item.id] === group.id));
  assert.equal(handles[group.id], handles[group.children[0].id], 'a group resolves to its first item');

  // Two alike stay one by one; a different class breaks the run.
  assert.deepEqual(pair.children.map((kid) => kid.repeated), [0, 0]);
  assert.deepEqual(list.children.map((kid) => kid.repeated), [0, 3]);
});

test('hidden is reported per node; a slot is never "hidden" — hiding it is the molecule design', () => {
  const page = el(PAGE_TAG, {}, [
    el('molecules--ml-scenary-102020', {}, [el('scene', {}, [], { slot: 'Scene', hidden: true })]),
    el('div', {}, [], { hidden: true }),
  ]);
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  assert.equal(tree.root.children[0].children[0].hidden, false);
  assert.equal(tree.root.children[1].hidden, true);
});

test('elements outside the page are not the page’s', () => {
  const page = el(PAGE_TAG, {}, [el('p')]);
  const { access, nodes } = setup(page);
  const stray = el('div');
  const { handles } = buildPageTree(page, [...nodes, stray], access);
  assert.ok(!handles.includes(stray));
});

test('drop rule: only siblings of the same parent, never items, groups, slots or the page', () => {
  const page = el(PAGE_TAG, {}, [
    el('form', {}, [el('p', { class: 'a' }), el('div', { class: 'b' }, [el('span', { class: 'c' })]), el('label', { class: 'd' })]),
    el('ul', {}, [el('li'), el('li'), el('li')]),
    el('grouptriggeraction--ml-button-standard', {}, [el('label', {}, [], { slot: 'Label' })]),
  ]);
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  const [form, ul, button] = tree.root.children;
  const [p, div, label] = form.children;
  const span = div.children[0];
  const group = ul.children[0];

  assert.equal(treeDropRefusal(tree, label.id, p.id), null, 'any distance among siblings');
  assert.equal(treeDropRefusal(tree, p.id, p.id), 'self');
  assert.equal(treeDropRefusal(tree, span.id, p.id), 'otherParent');
  assert.equal(treeDropRefusal(tree, group.children[2].id, group.children[0].id), 'item');
  assert.equal(treeDropRefusal(tree, group.id, form.id), 'group');
  assert.equal(treeDropRefusal(tree, button.children[0].id, p.id), 'slot');
  assert.equal(treeDropRefusal(tree, tree.root.id, p.id), 'page');
});

test('search keeps the ancestors of every hit visible', () => {
  const { page } = samplePage();
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  const { hits, visible } = searchTree(tree, 'nova');
  assert.ok(hits.size >= 1);
  for (const hit of hits) for (const at of pathTo(tree, hit)) assert.ok(visible.has(at));
  assert.equal(searchTree(tree, '   ').hits.size, 0);
});

test('pathTo and findNode agree with parentOf', () => {
  const { page } = samplePage();
  const { access, nodes } = setup(page);
  const { tree } = buildPageTree(page, nodes, access);
  for (let id = 0; id < tree.size; id += 1) {
    const path = pathTo(tree, id);
    assert.equal(path[0], tree.root.id);
    assert.equal(path[path.length - 1], id);
    assert.equal(findNode(tree, id)?.id, id);
  }
});

test('helpers: short molecule names and layout hints', () => {
  assert.equal(moleculeShortName('grouptriggeraction--ml-button-standard'), 'ml-button-standard');
  assert.equal(moleculeShortName('molecules--ml-scenary-102020'), 'ml-scenary');
  assert.deepEqual(layoutOf('grid grid-cols-3 gap-2'), { layout: 'grid', columns: 3 });
  assert.deepEqual(layoutOf('grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)]'), { layout: 'grid', columns: 2 });
  assert.deepEqual(layoutOf('flex flex-col'), { layout: 'column', columns: 0 });
  assert.deepEqual(layoutOf('md:flex block'), { layout: null, columns: 0 });
});
