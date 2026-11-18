/// <mls fileReference="_102020_/l2/aura/studio/pageTreeCore.ts" enhancement="_blank" />
// The structure of the page on screen, as the Studio's tree shows it. PURE: no DOM, no stor, no prose.
//
// WHAT IS A NODE
// Exactly what a click could select, and nothing else. The predicate is the editor's own
// (`resolveSelectableElement(el) === el`), spelled over the ownership chain: the chain is walked from
// the region host, and a node is offered when the ownership does not break ABOVE it. That one rule
// keeps a molecule's internal markup out (it breaks at the molecule), keeps the page's own content
// in (also when a live slot MOVED it into the molecule — the chain re-routes it through the slot
// source), and keeps the slot elements the page wrote (`<Label>`, `<Scene>`), which are handed to the
// molecule and never owned by it. The tree and the click therefore cannot disagree about what is
// selectable: they ask the same question.
//
// WHERE A NODE HANGS
// Under the deepest node of its OWN chain that is also a node. The chain, and not `parentElement`:
// content projected into a live slot sits, in the DOM, under the molecule's internal wrappers; in the
// chain it sits under the slot source, which is where the page wrote it.
//
// REPEATED SIBLINGS
// A `.map()` renders N siblings from one line of the source. Shown one by one, a table of 200 rows
// buries the rest of the page, so consecutive siblings that look alike are folded into a group. "Look
// alike" is a cheap signature (tag, class attribute, attribute names) instead of the source anchor,
// which costs a template scan per node. The signature can only err on the side of FOLDING two
// genuinely different elements that happen to be written identically — which is why a group needs
// REPEAT_MIN members and why the group still opens to every item.
//
// HANDLES
// The tree carries numbers, never elements: the panel is chrome and holds no live node (the
// discipline of the selection and the breadcrumb). `handles[id]` is the element behind node `id`; a
// group's handle is its first item.

import type { IOwnerChain } from '/_102020_/l2/aura/studio/studioClassEdit.js';

export type PageTreeKind = 'page' | 'organism' | 'molecule' | 'slot' | 'element';

/** The layout hint of an element, from its classes — what tells one `div` from the next. */
export type PageTreeLayout = 'grid' | 'row' | 'column' | null;

export interface IPageTreeNode {
  /** The handle: the editor resolves it to an element when the panel sends it back. */
  id: number;
  kind: PageTreeKind;
  /** Organism id, molecule short name, slot name, or tag — never empty. */
  name: string;
  /** The text that tells this node apart (own text or a naming attribute), cut short; may be empty. */
  text: string;
  /** The real tag, lower-case. */
  tag: string;
  layout: PageTreeLayout;
  /** Grid columns, when the classes say (`grid-cols-3`); 0 otherwise. */
  columns: number;
  /** Not on screen right now (no box), and not merely because it is a slot's own source. */
  hidden: boolean;
  /** >0 for a group: this many siblings folded together; the children are the items. */
  repeated: number;
  /** True for an item inside a group (its order is the data's, not the markup's). */
  item: boolean;
  children: IPageTreeNode[];
}

export interface IPageTree {
  root: IPageTreeNode;
  /** Parent id of every id; -1 for the root. A group's items have the group as parent. */
  parentOf: number[];
  /** How many nodes the tree has, groups included. */
  size: number;
}

export interface IPageTreeAccess<T> {
  /** The ownership chain of the node, walked from the region host (as the editor computes it). */
  chain: (node: T) => IOwnerChain<T>;
  /** Tag, lower-case. */
  tag: (node: T) => string;
  /** The slot name as the molecule declares it (`Label`), or null when the node is not a slot element. */
  slotName: (node: T) => string | null;
  /** True for a molecule the page uses (a custom element that is not the page itself). */
  isMolecule: (node: T) => boolean;
  attr: (node: T, name: string) => string | null;
  attributeNames: (node: T) => string[];
  /** The node's own text: its direct text nodes, joined and trimmed. */
  ownText: (node: T) => string;
  /** Off screen right now (no box), for a reason other than living inside a slot's hidden source. */
  hidden: (node: T) => boolean;
}

/** Fewer than this many look-alike siblings stay one by one. */
export const REPEAT_MIN = 3;

/** Longest text a node shows; the rest is the tooltip's job. */
export const TEXT_MAX = 32;

/** Attributes that NAME an element, in the order they win over its text. */
const NAMING_ATTRIBUTES = ['aria-label', 'title', 'label', 'placeholder', 'alt'];

/** Attributes whose VALUE changes per item of a `.map()` and so never enter the signature. */
const PER_ITEM_ATTRIBUTES = new Set(['key', 'id', 'value', 'aria-pressed', 'aria-selected', 'aria-current', 'href', 'src', 'style']);

export function cutText(text: string, max = TEXT_MAX): string {
  const flat = text.replace(/\s+/gu, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

/** `grouptriggeraction--ml-button-standard` → `ml-button-standard`; `molecules--ml-scenary-102020` → `ml-scenary`. */
export function moleculeShortName(tag: string): string {
  const tail = tag.includes('--') ? tag.slice(tag.lastIndexOf('--') + 2) : tag;
  return tail.replace(/-\d{6}$/u, '');
}

/** The layout an element's classes declare, ignoring variants (`md:grid`) — the base is what the tree hints. */
export function layoutOf(classes: string): { layout: PageTreeLayout; columns: number } {
  const tokens = classes.split(/\s+/u).filter((token) => token && !token.includes(':'));
  if (tokens.includes('grid') || tokens.includes('inline-grid')) {
    const cols = tokens.map((token) => /^grid-cols-(\d+)$/u.exec(token)).find(Boolean);
    const arbitrary = tokens.find((token) => token.startsWith('grid-cols-['));
    const columns = cols ? Number(cols[1]) : arbitrary ? arbitrary.split('_').length : 0;
    return { layout: 'grid', columns };
  }
  if (tokens.includes('flex') || tokens.includes('inline-flex')) {
    return { layout: tokens.includes('flex-col') || tokens.includes('flex-col-reverse') ? 'column' : 'row', columns: 0 };
  }
  return { layout: null, columns: 0 };
}

/** Whether a click could select this node: the ownership does not break above it. */
export function isTreeNode<T>(node: T, owner: IOwnerChain<T>): boolean {
  if (!owner.chain.length) return false;
  return owner.ownerBreak < 0 || owner.chain[owner.ownerBreak] === node;
}

interface IDraft<T> {
  el: T;
  node: IPageTreeNode;
  signature: string;
  kids: IDraft<T>[];
  /** The chain the node was found with; the root has none. */
  owner?: IOwnerChain<T>;
}

/**
 * Builds the tree of `page`, from every element under the region host in DOM order.
 *
 * `nodes` may include anything (the editor passes `host.querySelectorAll('*')` minus its own chrome);
 * what is not selectable, or not under `page`, is dropped here.
 */
export function buildPageTree<T>(page: T, nodes: readonly T[], access: IPageTreeAccess<T>): { tree: IPageTree; handles: T[] } {
  const drafts = new Map<T, IDraft<T>>();
  const order: IDraft<T>[] = [];

  const make = (el: T, isPage: boolean): IDraft<T> => {
    const tag = access.tag(el);
    const classes = access.attr(el, 'class') ?? '';
    const slot = isPage ? null : access.slotName(el);
    const organism = access.attr(el, 'data-organism-id');
    const molecule = !isPage && !slot && access.isMolecule(el);
    const kind: PageTreeKind = isPage ? 'page' : slot ? 'slot' : organism ? 'organism' : molecule ? 'molecule' : 'element';
    const name = kind === 'page' ? moleculeShortName(tag)
      : kind === 'slot' ? slot!
        : kind === 'organism' ? organism!
          : kind === 'molecule' ? moleculeShortName(tag)
            : tag;
    let text = '';
    for (const attribute of NAMING_ATTRIBUTES) {
      const value = access.attr(el, attribute);
      if (value && value.trim()) {
        text = cutText(value);
        break;
      }
    }
    if (!text) text = cutText(access.ownText(el));
    const { layout, columns } = layoutOf(classes);
    const names = access.attributeNames(el).filter((attribute) => !PER_ITEM_ATTRIBUTES.has(attribute)).sort();
    const draft: IDraft<T> = {
      el,
      node: {
        id: -1, kind, name, text, tag, layout, columns,
        // A slot element is hidden by its molecule by design; that is not "off screen".
        hidden: kind === 'slot' || kind === 'page' ? false : access.hidden(el),
        repeated: 0, item: false, children: [],
      },
      signature: `${kind}|${tag}|${classes}|${names.join(',')}`,
      kids: [],
    };
    drafts.set(el, draft);
    return draft;
  };

  const root = make(page, true);
  for (const el of nodes) {
    if (el === page || drafts.has(el)) continue;
    const owner = access.chain(el);
    if (!isTreeNode(el, owner)) continue;
    // Under the page, or not ours: the chain starts at the host's child, which must be the page.
    if (owner.chain[0] !== page) continue;
    const draft = make(el, false);
    draft.owner = owner;
    order.push(draft);
  }

  // Second pass, once every node exists: hang each one under its chain's deepest tree ancestor. Not
  // in the first pass because content projected into a live slot can come BEFORE its slot source in
  // document order, and its parent would not exist yet.
  for (const draft of order) {
    const owner = draft.owner!;
    let parent: IDraft<T> = root;
    for (let i = owner.chain.length - 2; i >= 0; i -= 1) {
      const found = drafts.get(owner.chain[i]);
      if (found) {
        parent = found;
        break;
      }
    }
    parent.kids.push(draft);
  }

  // A molecule with no text of its own reads by its first slot's text (a button by its Label).
  for (const draft of order) {
    if (draft.node.kind !== 'molecule' || draft.node.text) continue;
    const first = firstSlotText(draft);
    if (first) draft.node.text = first;
  }

  const handles: T[] = [];
  const parentOf: number[] = [];
  const assign = (draft: IDraft<T>, parent: number): IPageTreeNode => {
    const node = draft.node;
    node.id = handles.length;
    handles.push(draft.el);
    parentOf.push(parent);
    node.children = foldRepeats(draft.kids, node.id, handles, parentOf, assign);
    return node;
  };
  const tree = assign(root, -1);
  return { tree: { root: tree, parentOf, size: handles.length }, handles };
}

function firstSlotText<T>(draft: IDraft<T>): string {
  for (const kid of draft.kids) {
    if (kid.node.kind !== 'slot') continue;
    if (kid.node.text) return kid.node.text;
    const deeper = firstSlotText(kid);
    if (deeper) return deeper;
  }
  return '';
}

/** Assigns ids to a parent's children, folding runs of REPEAT_MIN+ look-alike siblings into a group. */
function foldRepeats<T>(
  kids: IDraft<T>[],
  parent: number,
  handles: T[],
  parentOf: number[],
  assign: (draft: IDraft<T>, parent: number) => IPageTreeNode,
): IPageTreeNode[] {
  const out: IPageTreeNode[] = [];
  for (let i = 0; i < kids.length;) {
    let end = i + 1;
    while (end < kids.length && kids[end].signature === kids[i].signature) end += 1;
    const run = end - i;
    if (run < REPEAT_MIN) {
      for (let k = i; k < end; k += 1) out.push(assign(kids[k], parent));
    } else {
      const first = kids[i].node;
      const group: IPageTreeNode = {
        ...first,
        id: handles.length,
        repeated: run,
        item: false,
        hidden: kids.slice(i, end).every((kid) => kid.node.hidden),
        children: [],
      };
      handles.push(kids[i].el);
      parentOf.push(parent);
      for (let k = i; k < end; k += 1) {
        const item = assign(kids[k], group.id);
        item.item = true;
        group.children.push(item);
      }
      out.push(group);
    }
    i = end;
  }
  return out;
}

/** Every node on the way from the root down to `id`, root first, `id` last. */
export function pathTo(tree: IPageTree, id: number): number[] {
  const path: number[] = [];
  for (let at = id; at >= 0 && at < tree.parentOf.length; at = tree.parentOf[at]) path.unshift(at);
  return path;
}

/** The node with this id, or null. */
export function findNode(tree: IPageTree, id: number): IPageTreeNode | null {
  const stack = [tree.root];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.id === id) return node;
    stack.push(...node.children);
  }
  return null;
}

/**
 * Why `moved` cannot be dropped next to `target`, or null when it can.
 *
 * Only siblings: a drop next to a node of another parent would be a move across parents, whose
 * slice may carry `${…}` bindings that do not exist in the destination. Items of a group and slots
 * keep the order they have — the data's, and the molecule's own reorder (the picker's arrows).
 * The source has the last word (`planMove`); this is the answer the tree can give while dragging.
 */
export type TreeDropRefusal = 'self' | 'otherParent' | 'item' | 'slot' | 'page' | 'group';

export function treeDropRefusal(tree: IPageTree, moved: number, target: number): TreeDropRefusal | null {
  if (moved === target) return 'self';
  const a = findNode(tree, moved);
  const b = findNode(tree, target);
  if (!a || !b) return 'otherParent';
  if (a.kind === 'page' || b.kind === 'page') return 'page';
  if (a.item || b.item) return 'item';
  if (a.repeated || b.repeated) return 'group';
  if (a.kind === 'slot' || b.kind === 'slot') return 'slot';
  if (tree.parentOf[moved] !== tree.parentOf[target]) return 'otherParent';
  return null;
}

/** Nodes whose name, text or tag contain `query` (case-insensitive), plus their ancestors. */
export function searchTree(tree: IPageTree, query: string): { hits: Set<number>; visible: Set<number> } {
  const hits = new Set<number>();
  const visible = new Set<number>();
  const q = query.trim().toLowerCase();
  if (!q) return { hits, visible };
  const visit = (node: IPageTreeNode): void => {
    if ([node.name, node.text, node.tag].some((value) => value.toLowerCase().includes(q))) {
      hits.add(node.id);
      for (const at of pathTo(tree, node.id)) visible.add(at);
    }
    node.children.forEach(visit);
  };
  visit(tree.root);
  return { hits, visible };
}
