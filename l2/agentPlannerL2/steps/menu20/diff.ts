/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/diff.ts" enhancement="_blank"/>

import type {
  MenuAction,
  MenuNode,
  MenuOrganism,
  MenuStampedNode,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';

export interface MenuTreeDiff {
  tree: MenuStampedNode[];
  removed: MenuStampedNode[];
}

export const EMPTY_ACTION_COUNTS: Record<MenuAction, number> = {
  new: 0,
  change: 0,
  keep: 0,
  remove: 0,
};

/**
 * Structural diff of two menu trees. Comparison is per id: label, text/organisms
 * (item by item, kind+text), children ids, hub context. Child nodes are judged
 * at their own level — a hub stays `keep` when only a child page changed.
 */
export function diffMenuTrees(
  prev: readonly MenuNode[] | null | undefined,
  next: readonly MenuNode[],
): MenuTreeDiff {
  const previous = prev || [];
  const prevById = indexById(previous);
  const nextById = indexById(next);
  return {
    tree: stampTree(next, prevById),
    removed: collectRemoved(previous, nextById),
  };
}

export function countMenuActions(diff: MenuTreeDiff): Record<MenuAction, number> {
  const counts: Record<MenuAction, number> = { ...EMPTY_ACTION_COUNTS };
  const seen = new Set<string>();
  const visit = (nodes: readonly MenuStampedNode[]) => {
    for (const node of nodes) {
      if (!seen.has(node.id)) {
        seen.add(node.id);
        counts[node.action] += 1;
      }
      if (node.kind === 'hub' || node.kind === 'group') visit(node.children);
    }
  };
  visit(diff.tree);
  visit(diff.removed);
  return counts;
}

function stampTree(nodes: readonly MenuNode[], prevById: Map<string, MenuNode>): MenuStampedNode[] {
  return nodes.map(node => stampNode(node, prevById));
}

function stampNode(next: MenuNode, prevById: Map<string, MenuNode>): MenuStampedNode {
  const prev = prevById.get(next.id);
  const action: MenuAction = !prev ? 'new' : nodesEqual(prev, next) ? 'keep' : 'change';
  if (next.kind === 'page') return { ...next, action };
  return { ...next, action, children: stampTree(next.children, prevById) };
}

function collectRemoved(nodes: readonly MenuNode[], nextById: Map<string, MenuNode>): MenuStampedNode[] {
  const out: MenuStampedNode[] = [];
  const walk = (list: readonly MenuNode[]) => {
    for (const node of list) {
      if (!nextById.has(node.id)) out.push(stampRemoved(node));
      if (node.kind === 'hub' || node.kind === 'group') walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function stampRemoved(node: MenuNode): MenuStampedNode {
  if (node.kind === 'page') return { ...node, action: 'remove' };
  return { ...node, action: 'remove', children: node.children.map(stampRemoved) };
}

function indexById(nodes: readonly MenuNode[], into = new Map<string, MenuNode>()): Map<string, MenuNode> {
  for (const node of nodes) {
    if (!into.has(node.id)) into.set(node.id, node);
    if (node.kind === 'hub' || node.kind === 'group') indexById(node.children, into);
  }
  return into;
}

function nodesEqual(prev: MenuNode, next: MenuNode): boolean {
  if (prev.kind !== next.kind || prev.label !== next.label) return false;
  if (prev.kind === 'page' && next.kind === 'page') {
    return organismsEqual(prev.organisms, next.organisms);
  }
  if (prev.kind === 'hub' && next.kind === 'hub') {
    return prev.context === next.context
      && prev.text === next.text
      && childIdsEqual(prev.children, next.children);
  }
  if (prev.kind === 'group' && next.kind === 'group') {
    return prev.text === next.text && childIdsEqual(prev.children, next.children);
  }
  return false;
}

function organismsEqual(left: readonly MenuOrganism[], right: readonly MenuOrganism[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.kind === right[index].kind && item.text === right[index].text);
}

function childIdsEqual(left: readonly MenuNode[], right: readonly MenuNode[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.id === right[index].id);
}
