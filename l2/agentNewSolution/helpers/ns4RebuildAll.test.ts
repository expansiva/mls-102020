/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4RebuildAll.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { listNs4RebuildDeletionKeys, parseNs4Invocation } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  isNs4ExactModuleFolderPrefix,
  planNs4RebuildAll,
  recoverNs4RebuildAllPrompt,
} from '/_102020_/l2/agentNewSolution/helpers/ns4RebuildAll.js';

const LISTA_PROMPT = 'Crie um módulo listaAssinatura de abaixo-assinados para administração e moradores.';
const TODO_PROMPT = 'Crie um aplicativo todo com a tabela tasks.';

/** Stor-shaped fixture: two modules. Copied shape, not a live generated app. */
function twoModuleStor() {
  return {
    // listaAssinatura — target
    la_l4_module: { project: 1, level: 4, folder: 'listaAssinatura', status: 'changed' },
    la_l4_orphan_contract: { project: 1, level: 4, folder: 'listaAssinatura/contracts', status: 'changed' },
    la_l4_pipeline: { project: 1, level: 4, folder: 'listaAssinatura/pipeline', status: 'changed' },
    la_l2_shared: { project: 1, level: 2, folder: 'listaAssinatura/web/shared', status: 'changed' },
    la_l2_orphan_page: { project: 1, level: 2, folder: 'listaAssinatura/web/desktop/page11', status: 'changed' },
    la_l1_controller: { project: 1, level: 1, folder: 'listaAssinatura/layer_1_external/adapters/http/controllers', status: 'changed' },
    la_l5_todo_fe: { project: 1, level: 5, folder: 'listaAssinatura', status: 'changed' },
    la_l5_todo_be: { project: 1, level: 5, folder: 'listaAssinatura', status: 'changed' },
    // todo — must survive
    todo_l4_module: { project: 1, level: 4, folder: 'todo', status: 'changed' },
    todo_l2_shared: { project: 1, level: 2, folder: 'todo/web/shared', status: 'changed' },
    todo_l1_controller: { project: 1, level: 1, folder: 'todo/layer_1_external/adapters/http/controllers', status: 'changed' },
    todo_l5_todo_fe: { project: 1, level: 5, folder: 'todo', status: 'changed' },
    // neighbors that must never match
    antiga_l4: { project: 1, level: 4, folder: 'listaAssinaturaAntiga', status: 'changed' },
    todo_list_l2: { project: 1, level: 2, folder: 'todoList/web/shared', status: 'changed' },
    // project-level l5
    l5_config: { project: 1, level: 5, folder: '', status: 'changed' },
    l5_project: { project: 1, level: 5, folder: '', status: 'changed' },
    // other project / already deleted
    other_project: { project: 9, level: 4, folder: 'listaAssinatura', status: 'changed' },
    already_gone: { project: 1, level: 4, folder: 'listaAssinatura/ontology', status: 'deleted' },
  } as const;
}

const projectJson = {
  modules: [
    { moduleName: 'todo', backend: { routeKeys: ['todo.taskCatalogue.qryListTask'] } },
    { moduleName: 'listaAssinatura', backend: { routeKeys: ['listaAssinatura.petitionCatalogue.qryLocatePetition'] } },
  ],
};

const configJson = {
  modules: [
    { moduleId: 'todo', basePath: '/todo' },
    { moduleId: 'listaAssinatura', basePath: '/listaAssinatura' },
  ],
  projects: {
    '1': {
      type: 'client',
      modules: [
        { moduleId: 'todo', basePath: '/todo' },
        { moduleId: 'listaAssinatura', basePath: '/listaAssinatura' },
      ],
    },
  },
};

test('/rebuild all is its own parser mode and leaves the prompt', () => {
  assert.deepEqual(parseNs4Invocation('listaAssinatura /rebuild all'), {
    fast: false, rebuild: true, rebuildFrom: 'all', prompt: 'listaAssinatura',
  });
  assert.deepEqual(parseNs4Invocation('listaAssinatura /fast /rebuild all'), {
    fast: true, rebuild: true, rebuildFrom: 'all', prompt: 'listaAssinatura',
  });
  assert.deepEqual(parseNs4Invocation('/rebuild all listaAssinatura'), {
    fast: false, rebuild: true, rebuildFrom: 'all', prompt: 'listaAssinatura',
  });
});

test('/rebuild and /rebuild e10 do not become rebuild-all', () => {
  assert.deepEqual(parseNs4Invocation('listaAssinatura /rebuild'), {
    fast: false, rebuild: true, rebuildFrom: '', prompt: 'listaAssinatura',
  });
  assert.deepEqual(parseNs4Invocation('listaAssinatura /rebuild e10'), {
    fast: false, rebuild: true, rebuildFrom: 'e10', prompt: 'listaAssinatura',
  });
  assert.deepEqual(parseNs4Invocation('/rebuildall listaAssinatura'), {
    fast: false, rebuild: false, rebuildFrom: '', prompt: '/rebuildall listaAssinatura',
  });
});

test('exact module-folder prefix never uses includes', () => {
  assert.equal(isNs4ExactModuleFolderPrefix('listaAssinatura', 'listaAssinatura'), true);
  assert.equal(isNs4ExactModuleFolderPrefix('listaAssinatura/contracts', 'listaAssinatura'), true);
  assert.equal(isNs4ExactModuleFolderPrefix('listaAssinaturaAntiga', 'listaAssinatura'), false);
  assert.equal(isNs4ExactModuleFolderPrefix('todo', 'todo'), true);
  assert.equal(isNs4ExactModuleFolderPrefix('todoList/web/shared', 'todo'), false);
  assert.equal(isNs4ExactModuleFolderPrefix('listTodo', 'todo'), false);
});

test('/rebuild all listaAssinatura deletes only that module — todo is untouched', () => {
  const files = twoModuleStor();
  const plan = planNs4RebuildAll({
    files,
    project: 1,
    moduleName: 'listaAssinatura',
    initialPrompt: LISTA_PROMPT,
    sourcePrompt: 'stale pipeline prompt',
    projectJson,
    configJson,
    at: '2026-08-29T12:00:00.000Z',
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.prompt, LISTA_PROMPT);
  const deleted = new Set(plan.keys);
  assert.deepEqual([...deleted].sort(), [
    'la_l1_controller',
    'la_l2_orphan_page',
    'la_l2_shared',
    'la_l4_module',
    'la_l4_orphan_contract',
    'la_l4_pipeline',
    'la_l5_todo_be',
    'la_l5_todo_fe',
  ]);
  for (const key of ['todo_l4_module', 'todo_l2_shared', 'todo_l1_controller', 'todo_l5_todo_fe', 'antiga_l4', 'todo_list_l2', 'l5_config', 'l5_project', 'other_project', 'already_gone']) {
    assert.equal(deleted.has(key), false, key);
  }
  assert.deepEqual(plan.report.deleted, { l1: 1, l2: 2, l4: 3, l5: 2 });
  assert.equal(plan.projectJson && Array.isArray(plan.projectJson.modules) && plan.projectJson.modules.length, 1);
  assert.equal((plan.projectJson?.modules as Array<{ moduleName: string }>)[0].moduleName, 'todo');
  const rootModules = plan.configJson?.modules as Array<{ moduleId: string }>;
  assert.deepEqual(rootModules.map(item => item.moduleId), ['todo']);
  const clientModules = (plan.configJson?.projects as Record<string, { modules: Array<{ moduleId: string }> }>)['1'].modules;
  assert.deepEqual(clientModules.map(item => item.moduleId), ['todo']);
});

test('orphan contract/page of a previous generation is in the deletion set', () => {
  const files = twoModuleStor();
  const plan = planNs4RebuildAll({
    files,
    project: 1,
    moduleName: 'listaAssinatura',
    initialPrompt: LISTA_PROMPT,
  });
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.ok(plan.keys.includes('la_l4_orphan_contract'));
  assert.ok(plan.keys.includes('la_l2_orphan_page'));
});

test('without a recoverable prompt, nothing is selected for deletion', () => {
  const files = twoModuleStor();
  const plan = planNs4RebuildAll({
    files,
    project: 1,
    moduleName: 'listaAssinatura',
    initialPrompt: '   ',
    sourcePrompt: '',
    projectJson,
    configJson,
  });
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.deepEqual(plan.keys, []);
  assert.match(plan.reason, /Nada foi apagado/);
  assert.equal(recoverNs4RebuildAllPrompt({}).ok, false);
});

test('recovered prompt prefers initialPrompt over pipeline sourcePrompt', () => {
  const recovered = recoverNs4RebuildAllPrompt({
    initialPrompt: LISTA_PROMPT,
    sourcePrompt: 'pipeline copy',
  });
  assert.deepEqual(recovered, { ok: true, prompt: LISTA_PROMPT });
  assert.deepEqual(recoverNs4RebuildAllPrompt({ sourcePrompt: TODO_PROMPT }), { ok: true, prompt: TODO_PROMPT });
});

test('plain /rebuild selection still does not touch l1 or l2', () => {
  const files = twoModuleStor();
  const keys = new Set(listNs4RebuildDeletionKeys(files, 1, 'listaAssinatura'));
  assert.equal(keys.has('la_l4_module'), true);
  assert.equal(keys.has('la_l5_todo_fe'), true);
  assert.equal(keys.has('la_l1_controller'), false);
  assert.equal(keys.has('la_l2_shared'), false);
  assert.equal(keys.has('todo_l4_module'), false);
});
