/// <mls fileReference="_102020_/l2/agentChangeFrontend/nodejsSaveConfigJson.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  composeFrontendRuntimeConfig,
  FrontendConfigComposeError,
} from '/_102020_/l2/agentChangeFrontend/nodejsSaveConfigJson.js';

const CLIENT_ID = '109001';

function defs(body: Record<string, unknown>): string {
  return `export const value = ${JSON.stringify(body, null, 2)} as const;\n`;
}

function writeFile(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function materializePage(clientRoot: string, moduleName: string, pageId: string, title: string): void {
  writeFile(path.join(clientRoot, 'l4', moduleName, 'workspaces', `${pageId}.defs.ts`), defs({
    workspaceId: pageId,
    title,
    actors: ['user'],
    kind: 'landing',
  }));
  writeFile(path.join(clientRoot, 'l4', moduleName, 'actors.defs.ts'), defs({
    actors: [{ actorId: 'user' }],
  }));
  writeFile(path.join(clientRoot, 'l4', moduleName, 'siteMap.defs.ts'), defs({
    landings: [{ actorId: 'user', workspaceId: pageId }],
  }));
  writeFile(path.join(clientRoot, 'l2', moduleName, 'web', 'shared', `${pageId}.ts`), `export const ${pageId} = true;\n`);
  writeFile(path.join(clientRoot, 'l2', moduleName, 'web', 'contracts', `${pageId}.ts`), `export const ${pageId}Contract = true;\n`);
  writeFile(path.join(clientRoot, 'l2', moduleName, 'web', 'desktop', 'page11', `${pageId}.ts`), `export const ${pageId}Page = true;\n`);
}

function writeProjectJson(clientRoot: string, moduleNames: string[]): void {
  writeFile(path.join(clientRoot, 'l5', 'project.json'), `${JSON.stringify({
    masters: {
      frontend: { runtimeProject: 102033 },
      backend: { runtimeProject: 102034 },
    },
    languages: [{ language: 'en' }],
    modules: moduleNames.map(moduleName => ({ moduleName })),
  }, null, 2)}\n`);
}

function writeDesignSystem(clientRoot: string): void {
  writeFile(path.join(clientRoot, 'l2', 'designSystem.ts'), `export const ds = { themeName: 'localDesignSystem' };\n`);
}

function withRoot(run: (root: string, clientRoot: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-config-multi-'));
  try {
    const clientRoot = path.join(root, `mls-${CLIENT_ID}`);
    fs.mkdirSync(path.join(clientRoot, 'l5'), { recursive: true });
    run(root, clientRoot);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function readConfig(clientRoot: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(clientRoot, 'l5', 'config.json'), 'utf8')) as Record<string, unknown>;
}

function clientRecord(config: Record<string, unknown>): Record<string, unknown> {
  const projects = config.projects as Record<string, Record<string, unknown>>;
  return projects[CLIENT_ID];
}

function modulesOf(config: Record<string, unknown>): Record<string, unknown>[] {
  return (clientRecord(config).modules as Record<string, unknown>[]) || [];
}

function pageIdsOf(mod: Record<string, unknown>): string[] {
  const frontend = mod.frontend as { pages?: { pageId: string }[] } | undefined;
  return (frontend?.pages || []).map(page => page.pageId);
}

test('T3 multi-module: todo + listaAssinatura each keep their own pages', () => {
  withRoot((root, clientRoot) => {
    writeProjectJson(clientRoot, ['todo', 'listaAssinatura']);
    writeDesignSystem(clientRoot);
    materializePage(clientRoot, 'todo', 'taskCatalogue', 'Tarefa');
    materializePage(clientRoot, 'listaAssinatura', 'petitionLanding', 'Petição');

    const result = composeFrontendRuntimeConfig(root, CLIENT_ID);
    assert.deepEqual(result.composed.map(item => item.moduleName), ['todo', 'listaAssinatura']);
    assert.equal(result.skipped.length, 0);

    const mods = modulesOf(readConfig(clientRoot));
    assert.deepEqual(mods.map(mod => mod.moduleId), ['todo', 'listaAssinatura']);
    assert.deepEqual(pageIdsOf(mods[0]), ['taskCatalogue']);
    assert.deepEqual(pageIdsOf(mods[1]), ['petitionLanding']);
    assert.equal((mods[0].frontend as { pages: { source: string }[] }).pages[0].source, 'l2/todo/web/desktop/page11/taskCatalogue.ts');
    assert.equal((mods[1].frontend as { pages: { source: string }[] }).pages[0].source, 'l2/listaAssinatura/web/desktop/page11/petitionLanding.ts');
    assert.deepEqual(mods[0].designSystems, ['localDesignSystem']);
    assert.deepEqual(mods[1].designSystems, ['localDesignSystem']);
  });
});

test('T3 module without l2: the others compose and the missing entry is preserved', () => {
  withRoot((root, clientRoot) => {
    writeProjectJson(clientRoot, ['todo', 'listaAssinatura']);
    writeDesignSystem(clientRoot);
    materializePage(clientRoot, 'todo', 'taskCatalogue', 'Tarefa');
    writeFile(path.join(clientRoot, 'l5', 'config.json'), `${JSON.stringify({
      defaultProjectId: CLIENT_ID,
      projects: {
        [CLIENT_ID]: {
          root: '.',
          type: 'client',
          modules: [
            {
              moduleId: 'listaAssinatura',
              basePath: '/listaAssinatura',
              shellMode: 'spa',
              backendControllers: './_109001_/l1/listaAssinatura/layer_1_external/adapters/http/controllers',
              frontend: {
                layer: 'l2',
                pages: [{
                  pageId: 'signatureCatalogue',
                  route: '/listaAssinatura/signatureCatalogue',
                  source: 'l2/listaAssinatura/web/desktop/page11/signatureCatalogue.ts',
                  componentTag: 'lista-assinatura--web--desktop--page11--signature-catalogue-109001',
                  title: 'Assinatura',
                }],
              },
            },
          ],
        },
      },
    }, null, 2)}\n`);

    const result = composeFrontendRuntimeConfig(root, CLIENT_ID);
    assert.deepEqual(result.composed.map(item => item.moduleName), ['todo']);
    assert.equal(result.skipped[0]?.moduleName, 'listaAssinatura');

    const mods = modulesOf(readConfig(clientRoot));
    const lista = mods.find(mod => mod.moduleId === 'listaAssinatura');
    const todo = mods.find(mod => mod.moduleId === 'todo');
    assert.ok(lista);
    assert.ok(todo);
    assert.deepEqual(pageIdsOf(lista), ['signatureCatalogue']);
    assert.equal(lista.backendControllers, './_109001_/l1/listaAssinatura/layer_1_external/adapters/http/controllers');
    assert.deepEqual(pageIdsOf(todo), ['taskCatalogue']);
  });
});

test('T3 one-module: same pages shape as the previous single-module composer, idempotent', () => {
  withRoot((root, clientRoot) => {
    writeProjectJson(clientRoot, ['todo']);
    writeDesignSystem(clientRoot);
    materializePage(clientRoot, 'todo', 'taskCatalogue', 'Tarefa');

    composeFrontendRuntimeConfig(root, CLIENT_ID);
    const first = fs.readFileSync(path.join(clientRoot, 'l5', 'config.json'), 'utf8');
    composeFrontendRuntimeConfig(root, CLIENT_ID);
    const second = fs.readFileSync(path.join(clientRoot, 'l5', 'config.json'), 'utf8');
    assert.equal(second, first);

    const todo = modulesOf(JSON.parse(first) as Record<string, unknown>)[0];
    assert.equal(todo.moduleId, 'todo');
    assert.equal(todo.basePath, '/todo');
    assert.equal(todo.shellMode, 'spa');
    assert.deepEqual(todo.languages, ['en']);
    assert.deepEqual(todo.designSystems, ['localDesignSystem']);
    assert.deepEqual(pageIdsOf(todo), ['taskCatalogue']);
    const page = (todo.frontend as { pages: Record<string, unknown>[] }).pages[0];
    assert.equal(page.route, '/todo/taskCatalogue');
    assert.equal(page.source, 'l2/todo/web/desktop/page11/taskCatalogue.ts');
    assert.equal(page.definition, 'l2/todo/web/desktop/page11/taskCatalogue.defs.ts');
    assert.equal(page.componentTag, 'todo--web--desktop--page11--task-catalogue-109001');
    assert.equal(page.title, 'Tarefa');
    assert.deepEqual(page.actors, ['user']);
    assert.equal(page.public, true);
    assert.deepEqual(todo.navigation, [{
      id: 'taskCatalogue',
      label: 'Tarefa',
      href: '/todo/taskCatalogue',
      description: 'Tarefa',
      actors: ['user'],
      landing: true,
    }]);
    assert.deepEqual(todo.landings, [{ actorId: 'user', pageId: 'taskCatalogue', route: '/todo/taskCatalogue' }]);
  });
});

test('T3 CF pass keeps backendControllers and persistenceModules written by the CB', () => {
  withRoot((root, clientRoot) => {
    writeProjectJson(clientRoot, ['todo']);
    writeDesignSystem(clientRoot);
    materializePage(clientRoot, 'todo', 'taskCatalogue', 'Tarefa');
    writeFile(path.join(clientRoot, 'l5', 'config.json'), `${JSON.stringify({
      defaultProjectId: CLIENT_ID,
      projects: {
        [CLIENT_ID]: {
          root: '.',
          type: 'client',
          modules: [{
            moduleId: 'todo',
            basePath: '/todo',
            shellMode: 'spa',
            backendControllers: './_109001_/l1/todo/layer_1_external/adapters/http/controllers',
            headerLinks: [{ id: 'keep-me', href: '/todo/taskCatalogue' }],
          }],
          persistenceModules: [{
            moduleId: 'todo',
            tableDefsDir: './_109001_/l1/todo/layer_1_external/adapters/persistence',
          }],
        },
        '102034': { root: '../mls-102034', type: 'master backend', modules: [{ moduleId: 'mdm' }] },
      },
    }, null, 2)}\n`);

    composeFrontendRuntimeConfig(root, CLIENT_ID);
    const client = clientRecord(readConfig(clientRoot));
    const todo = (client.modules as Record<string, unknown>[])[0];
    assert.equal(todo.backendControllers, './_109001_/l1/todo/layer_1_external/adapters/http/controllers');
    assert.deepEqual(todo.headerLinks, [{ id: 'keep-me', href: '/todo/taskCatalogue' }]);
    assert.deepEqual(client.persistenceModules, [{
      moduleId: 'todo',
      tableDefsDir: './_109001_/l1/todo/layer_1_external/adapters/persistence',
    }]);
    assert.deepEqual(pageIdsOf(todo), ['taskCatalogue']);
    const projects = readConfig(clientRoot).projects as Record<string, Record<string, unknown>>;
    assert.deepEqual(projects['102034'].modules, [{ moduleId: 'mdm' }]);
  });
});

test('zero resolvable modules fail the compose', () => {
  withRoot((root, clientRoot) => {
    writeProjectJson(clientRoot, ['todo', 'listaAssinatura']);
    assert.throws(
      () => composeFrontendRuntimeConfig(root, CLIENT_ID),
      (error: unknown) => error instanceof FrontendConfigComposeError && /no module could be composed from l2/.test(error.message),
    );
    assert.equal(fs.existsSync(path.join(clientRoot, 'l5', 'config.json')), false);
  });
});
