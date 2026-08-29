/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeModuleNavigation.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { navigationFromE8Menu } from '/_102020_/l2/agentChangeFrontend/helpers/cfeModuleNavigation.js';

test('R2: menu is E8 places intersected with materialized pages, in E8 order', () => {
  const navigation = navigationFromE8Menu({
    moduleName: 'todo',
    menu: [
      { workspaceId: 'taskCatalogue', label: 'Tarefa' },
      { workspaceId: 'taskHub', label: 'Painel' },
    ],
    pages: [
      { pageId: 'monitorAndUpdateTaskStatus', label: 'Acompanhar', actors: ['taskOwner'] },
      { pageId: 'taskCatalogue', label: 'Cadastro', actors: ['taskOwner'], landing: true },
    ],
    labels: { taskCatalogue: 'Tarefas' },
  });
  assert.deepEqual(navigation.map(entry => entry.id), ['taskCatalogue']);
  assert.equal(navigation[0].label, 'Tarefas');
  assert.equal(navigation[0].href, '/todo/taskCatalogue');
  assert.equal(navigation[0].landing, true);
  assert.deepEqual(navigation[0].actors, ['taskOwner']);
});

test('R2: a materialized page that is not in the E8 menu is omitted, not listed', () => {
  const navigation = navigationFromE8Menu({
    moduleName: 'todo',
    menu: [{ workspaceId: 'taskCatalogue', label: 'Tarefa' }],
    pages: [
      { pageId: 'taskCatalogue', label: 'Tarefa' },
      { pageId: 'monitorAndUpdateTaskStatus', label: 'Acompanhar' },
    ],
  });
  assert.deepEqual(navigation.map(entry => entry.id), ['taskCatalogue']);
});

test('R2: an E8 menu entry whose page did not materialize is dropped (no dead link)', () => {
  const navigation = navigationFromE8Menu({
    moduleName: 'todo',
    menu: [
      { workspaceId: 'taskCatalogue', label: 'Tarefa' },
      { workspaceId: 'taskHub', label: 'Painel' },
    ],
    pages: [{ pageId: 'taskCatalogue', label: 'Tarefa' }],
  });
  assert.deepEqual(navigation.map(entry => entry.id), ['taskCatalogue']);
});

test('R2: L4 without an E8 menu keeps one entry per materialized page', () => {
  const navigation = navigationFromE8Menu({
    moduleName: 'legacy',
    menu: [],
    pages: [
      { pageId: 'alpha', label: 'Alpha' },
      { pageId: 'beta', label: 'Beta' },
    ],
  });
  assert.deepEqual(navigation.map(entry => entry.id), ['alpha', 'beta']);
});
