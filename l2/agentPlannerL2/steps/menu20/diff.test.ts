/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/menu20/diff.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  parsePreviousMenuTree,
  type MenuAction,
  type MenuNode,
  type MenuPageNode,
  type MenuStampedNode,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { countMenuActions, diffMenuTrees } from '/_102020_/l2/agentPlannerL2/steps/menu20/diff.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMPRAS_PREVIOUS = JSON.parse(readFileSync(
  path.join(HERE, 'fixtures/previous-compras.json'),
  'utf8',
)) as unknown;

function loadComprasTree(): MenuNode[] {
  return parsePreviousMenuTree(COMPRAS_PREVIOUS);
}

function actionById(nodes: readonly MenuStampedNode[]): Map<string, MenuAction> {
  const out = new Map<string, MenuAction>();
  const walk = (list: readonly MenuStampedNode[]) => {
    for (const node of list) {
      out.set(node.id, node.action);
      if (node.kind === 'hub' || node.kind === 'group') walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

function pageById(nodes: readonly MenuNode[], id: string): MenuPageNode {
  const found = findNode(nodes, id);
  assert.equal(found?.kind, 'page', `expected page ${id}`);
  if (found?.kind !== 'page') throw new Error(`expected page ${id}`);
  return found;
}

function findNode(nodes: readonly MenuNode[], id: string): MenuNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.kind === 'hub' || node.kind === 'group') {
      const nested = findNode(node.children, id);
      if (nested) return nested;
    }
  }
  return undefined;
}

void test('diffMenuTrees: no previous stamps every node new and removed is empty', () => {
  const next = loadComprasTree();
  const diff = diffMenuTrees(null, next);
  const actions = actionById(diff.tree);
  assert.ok(actions.size >= 6);
  for (const action of actions.values()) assert.equal(action, 'new');
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(countMenuActions(diff), { new: actions.size, change: 0, keep: 0, remove: 0 });
});

void test('diffMenuTrees: equal node is keep, changed label is change', () => {
  const prev = loadComprasTree();
  const same = diffMenuTrees(prev, structuredClone(prev));
  const sameActions = actionById(same.tree);
  for (const action of sameActions.values()) assert.equal(action, 'keep');
  assert.deepEqual(same.removed, []);
  assert.equal(countMenuActions(same).keep, sameActions.size);
  assert.equal(countMenuActions(same).change, 0);

  const next = structuredClone(prev);
  pageById(next, 'pedidos_de_compra').label = 'Pedidos';
  const changed = diffMenuTrees(prev, next);
  const actions = actionById(changed.tree);
  assert.equal(actions.get('pedidos_de_compra'), 'change');
  assert.equal(actions.get('meu_perfil_comprador'), 'keep');
  assert.equal(actions.get('perfil_comprador'), 'keep');
  assert.equal(actions.get('fornecedores_e_condicoes'), 'keep');
  assert.deepEqual(changed.removed, []);
  assert.ok(countMenuActions(changed).change === 1);
  assert.ok(countMenuActions(changed).keep === sameActions.size - 1);
  assert.notEqual(actions.get('pedidos_de_compra'), 'keep');
});

void test('diffMenuTrees: extra organism is change', () => {
  const prev = loadComprasTree();
  const next = structuredClone(prev);
  pageById(next, 'pedidos_de_compra').organisms.push({ kind: 'form', text: 'Abra um pedido novo.' });
  const diff = diffMenuTrees(prev, next);
  assert.equal(actionById(diff.tree).get('pedidos_de_compra'), 'change');
  assert.equal(actionById(diff.tree).get('perfil_comprador'), 'keep');
});

void test('diffMenuTrees: missing node goes to meta.removed with action remove', () => {
  const prev = loadComprasTree();
  const next = structuredClone(prev).filter(node => node.id !== 'recebimento_de_pedidos');
  const diff = diffMenuTrees(prev, next);
  assert.equal(actionById(diff.tree).has('recebimento_de_pedidos'), false);
  assert.equal(diff.removed.length, 1);
  assert.equal(diff.removed[0].id, 'recebimento_de_pedidos');
  assert.equal(diff.removed[0].action, 'remove');
  assert.equal(countMenuActions(diff).remove, 1);
});

void test('diffMenuTrees: new node is new', () => {
  const prev = loadComprasTree();
  const next = structuredClone(prev);
  next.push({
    id: 'indicadores_de_compras',
    kind: 'page',
    label: 'Indicadores',
    organisms: [{ kind: 'summary', text: 'Números do período.' }],
  });
  const diff = diffMenuTrees(prev, next);
  assert.equal(actionById(diff.tree).get('indicadores_de_compras'), 'new');
  assert.equal(actionById(diff.tree).get('pedidos_de_compra'), 'keep');
  assert.deepEqual(diff.removed, []);
});

void test('diffMenuTrees: hub child is judged at its own level', () => {
  const prev = loadComprasTree();
  const next = structuredClone(prev);
  pageById(next, 'perfil_comprador').label = 'Perfil';
  const diff = diffMenuTrees(prev, next);
  const actions = actionById(diff.tree);
  assert.equal(actions.get('meu_perfil_comprador'), 'keep');
  assert.equal(actions.get('perfil_comprador'), 'change');
});
