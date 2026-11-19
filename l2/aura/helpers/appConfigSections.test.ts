/// <mls fileReference="_102020_/l2/aura/helpers/appConfigSections.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  appendAt,
  buildSections,
  clientKey,
  describePath,
  FIELD_LABELS,
  labelOf,
  viewOfPath,
  type Spec,
  diffConfig,
  emptyValue,
  getAt,
  hasErrors,
  isAppConfig,
  missingFields,
  newErrors,
  moveAt,
  orphanPages,
  parseRef,
  pathKey,
  rebaseConfig,
  removeAt,
  renameKeyAt,
  ROOT_SPEC,
  setAt,
  unknownKeys,
  validateConfig,
  type FileRef,
  type ObjectSpec,
} from '/_102020_/l2/aura/helpers/appConfigSections.js';

// A cut of mls-102047/l5/config.json (11/11/2026): one module, two pages, header profile.
function config(): Record<string, unknown> {
  return {
    alphaAllAuthorities: true,
    organization: { source: 'development-project' },
    projectSettings: { driver: 'vm', url: 'local/local/local/mls-102047' },
    workspaceDependencies: ['102020', '102033', '102034'],
    projects: {
      102033: { root: '../mls-102033', type: 'master frontend' },
      102047: {
        root: '../mls-102047',
        type: 'client',
        runtime: { projectId: '102047' },
        modules: [{
          moduleId: 'tarefas',
          shellMode: 'spa',
          basePath: '/tarefas',
          userLanguage: 'pt-BR',
          backendControllers: './_102047_/l1/tarefas/layer_1_external/adapters/http/controllers',
          navigation: [
            { id: 'inicio', label: 'Início', href: '/tarefas/inicio', description: 'Início.', actors: ['membro'], landing: true },
            { id: 'painel', label: 'Painel', href: '/tarefas/painel', description: 'Painel.', actors: ['gestor'] },
          ],
          landings: [{ actorId: 'membro', pageId: 'inicio', route: '/tarefas/inicio' }],
          headerLinks: [],
          frontend: {
            layer: 'l2',
            pageTests: [],
            pages: [
              { pageId: 'inicio', route: '/tarefas/inicio', source: 'l2/tarefas/web/desktop/page11/inicio.ts', definition: 'l2/tarefas/web/desktop/page11/inicio.defs.ts', componentTag: 'tarefas--inicio-102047', title: 'Início', actors: ['membro'] },
              { pageId: 'painel', route: '/tarefas/painel', source: 'l2/tarefas/web/desktop/page11/painel.ts', definition: 'l2/tarefas/web/desktop/page11/painel.defs.ts', componentTag: 'tarefas--painel-102047', title: 'Painel', actors: ['gestor'] },
            ],
          },
        }],
        persistenceModules: [{ moduleId: 'tarefas', tableDefsDir: './_102047_/l1/tarefas/layer_1_external/adapters/persistence' }],
      },
    },
    defaultProjectId: '102047',
    vmGitOrigin: 'https://github.com/expansiva/mls-102047.git',
    shellTemplates: { spa: './_102033_/l2/shared/spa/index.html', pwa: './_102033_/l2/shared/pwa/index.html' },
    clientShell: {
      mode: 'spa',
      activeProfile: 'header',
      regions: {
        header: {
          activeProfile: 'header',
          profiles: {
            header: {
              renderer: { entrypoint: '/_102047_/l2/layout/appHeaderHeader.js', source: 'l2/layout/appHeaderHeader.ts', tag: 'layout--app-header-header-102047' },
              heightPx: 66,
              brand: { title: 'App' },
            },
          },
        },
      },
    },
  };
}

const MODULE: Array<string | number> = ['projects', '102047', 'modules', 0];

test('the client entry is the project itself, else the only client', () => {
  assert.equal(clientKey(config(), 102047), '102047');
  assert.equal(clientKey(config(), 999), '102047');
});

test('sections: every top-level key has a home, an unknown one goes to Other', () => {
  const sections = buildSections({ ...config(), publication: { at: 'x' } }, 102047);
  assert.deepEqual(sections.map(section => section.id), ['modules', 'shell', 'dependencies', 'project', 'other']);
  assert.deepEqual(sections[0].blocks.map(block => pathKey(block.path)), ['projects.102047.modules', 'projects.102047.persistenceModules']);
  assert.deepEqual(sections[4].blocks.map(block => block.label), ['publication']);
  const placed = sections.flatMap(section => section.blocks.map(block => String(block.path[0])));
  for (const key of Object.keys(config())) assert.ok(placed.includes(key), key);
});

test('the real 102047 config is valid: no error, nothing left in Other', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const file = path.resolve(process.cwd(), '../../mls-102047/l5/config.json');
  if (!fs.existsSync(file)) return;
  const real = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateConfig(real, 102047).filter(issue => issue.severity === 'error');
  assert.deepEqual(errors, []);
  assert.deepEqual(buildSections(real, 102047)[4].blocks, []);
});

test('edits are immutable and touch only their path', () => {
  const before = config();
  const after = setAt(before, [...MODULE, 'basePath'], '/tasks');
  assert.equal(getAt(after, [...MODULE, 'basePath']), '/tasks');
  assert.equal(getAt(before, [...MODULE, 'basePath']), '/tarefas');
  assert.equal(getAt(after, ['clientShell']), before.clientShell);

  const removed = removeAt(after, [...MODULE, 'navigation', 0]);
  assert.equal((getAt(removed, [...MODULE, 'navigation']) as unknown[]).length, 1);
  assert.equal(getAt(removed, [...MODULE, 'navigation', 0, 'id']), 'painel');

  const appended = appendAt(before, ['workspaceDependencies'], '102029');
  assert.deepEqual(getAt(appended, ['workspaceDependencies']), ['102020', '102033', '102034', '102029']);

  const moved = moveAt(before, [...MODULE, 'navigation'], 1, 0);
  assert.equal(getAt(moved, [...MODULE, 'navigation', 0, 'id']), 'painel');
  assert.equal(moveAt(before, [...MODULE, 'navigation'], 1, 5), before);
});

test('renaming a map key keeps the order and refuses an existing key', () => {
  const renamed = renameKeyAt(config(), ['clientShell', 'regions', 'header', 'profiles'], 'header', 'compact');
  assert.deepEqual(Object.keys(getAt(renamed, ['clientShell', 'regions', 'header', 'profiles']) as object), ['compact']);
  const projects = ['projects'];
  const same = config();
  assert.equal(renameKeyAt(same, projects, '102033', '102047'), same);
});

test('"+ field" offers what is missing; unknown keys are listed, not dropped', () => {
  const profile = ((ROOT_SPEC.fields.clientShell as ObjectSpec).fields.regions as ObjectSpec).fields.header as ObjectSpec;
  const value = getAt(config(), ['clientShell', 'regions', 'header']);
  assert.deepEqual(missingFields(profile, value), ['switchWithoutRouteReload']);
  assert.deepEqual(unknownKeys(profile, { ...(value as object), extra: 1 }), ['extra']);
  assert.deepEqual(emptyValue(profile), { activeProfile: '', profiles: {} });
});

test('validation: schema errors block, consistency only warns', () => {
  assert.equal(hasErrors(validateConfig(config(), 102047)), false);

  const broken = setAt(setAt(config(), [...MODULE, 'basePath'], 'tarefas'), [...MODULE, 'shellMode'], 'mpa');
  const codes = validateConfig(broken, 102047).map(issue => `${issue.code}@${pathKey(issue.path)}`);
  assert.ok(codes.includes('bad-basePath@projects.102047.modules[0].basePath'));
  assert.ok(codes.includes('bad-option@projects.102047.modules[0].shellMode'));

  const duplicated = setAt(config(), [...MODULE, 'frontend', 'pages', 1, 'route'], '/tarefas/inicio');
  const duplicate = validateConfig(duplicated, 102047).find(issue => issue.code === 'duplicate-route');
  assert.equal(pathKey(duplicate!.path), 'projects.102047.modules[0].frontend.pages[1].route');

  const required = setAt(config(), [...MODULE, 'moduleId'], '');
  assert.ok(validateConfig(required, 102047).some(issue => issue.code === 'required' && issue.severity === 'error'));

  const sameId = appendAt(config(), [...MODULE, 'navigation'], { id: 'inicio', label: 'x', href: '/tarefas/x' });
  assert.ok(validateConfig(sameId, 102047).some(issue => issue.code === 'duplicate-key'));
});

test('a lib config (projectSettings only) is not missing the app keys', () => {
  const lib = { projectSettings: { driver: 'vm', url: 'local/local/local/mls-102029' } };
  assert.equal(isAppConfig(lib), false);
  assert.deepEqual(validateConfig(lib, 102029), []);
  assert.ok(validateConfig({ projects: {} }, 1).some(issue => issue.code === 'required' && pathKey(issue.path) === 'defaultProjectId'));
});

test('only the errors the edit brought block the apply', () => {
  // The flat header region of mls-102050 (an old shape): an error the file already had.
  const old = setAt(config(), ['clientShell', 'regions', 'header'], { entrypoint: './_102033_/l2/shared/layout/aura-header.js', tag: 'collab-aura-header' });
  const before = validateConfig(old, 102047);
  assert.equal(hasErrors(before), true);
  const unrelated = setAt(old, ['vmGitOrigin'], 'https://example.com/x.git');
  assert.deepEqual(newErrors(before, validateConfig(unrelated, 102047)), []);
  const worse = setAt(old, [...MODULE, 'basePath'], 'x');
  assert.deepEqual(newErrors(before, validateConfig(worse, 102047)).map(issue => issue.code), ['bad-basePath']);
});

test('a module with pages needs shellMode; a backend-only module does not', () => {
  const noMode = removeAt(config(), [...MODULE, 'shellMode']);
  assert.ok(validateConfig(noMode, 102047).some(issue => issue.code === 'required' && pathKey(issue.path).endsWith('shellMode')));
  const backendOnly = setAt(noMode, [...MODULE, 'frontend', 'pages'], []);
  assert.ok(!validateConfig(backendOnly, 102047).some(issue => pathKey(issue.path).endsWith('shellMode')));
});

test('the active profile of a region must exist', () => {
  const wrong = setAt(config(), ['clientShell', 'regions', 'header', 'activeProfile'], 'nope');
  const issue = validateConfig(wrong, 102047).find(item => item.code === 'unknown-profile');
  assert.equal(issue?.severity, 'error');
});

test('menu inconsistencies come from menuConfigCore, as warnings', () => {
  const nav = setAt(config(), [...MODULE, 'navigation', 1, 'href'], '/tarefas/outro');
  const menu = validateConfig(nav, 102047).filter(issue => issue.code === 'menu');
  assert.ok(menu.length > 0);
  assert.ok(menu.every(issue => issue.severity === 'warning'));
});

test('file checks read every path shape as a stor file, and only warn', () => {
  assert.deepEqual(parseRef('l2/tarefas/web/desktop/page11/inicio.ts', 102047, 'file'),
    { kind: 'file', project: 102047, level: 2, folder: 'tarefas/web/desktop/page11', shortName: 'inicio', extension: '.ts' });
  assert.deepEqual(parseRef('/_102047_/l2/layout/appHeaderHeader.js', 1, 'file'),
    { kind: 'file', project: 102047, level: 2, folder: 'layout', shortName: 'appHeaderHeader', extension: '.ts' });
  assert.deepEqual(parseRef('./_102033_/l2/shared/spa/index.html', 1, 'file')?.extension, '.html');
  assert.deepEqual(parseRef('../mls-102033/l2/shared/layout/aura-aside.ts', 1, 'file')?.project, 102033);
  assert.deepEqual(parseRef('_102047_/l2/m/web/desktop/page11/p.test.js', 1, 'file')?.shortName, 'p.test');
  assert.deepEqual(parseRef('./_102047_/l1/tarefas/adapters/http/controllers', 1, 'dir'),
    { kind: 'dir', project: 102047, level: 1, folder: 'tarefas/adapters/http/controllers', shortName: '', extension: '' });

  const seen: FileRef[] = [];
  const issues = validateConfig(config(), 102047, {
    refExists: (ref) => { seen.push(ref); return ref.shortName === 'painel' ? false : ref.project === 102033 ? undefined : true; },
  });
  const missing = issues.filter(issue => issue.code === 'missing-file');
  assert.deepEqual(missing.map(issue => pathKey(issue.path)), ['projects.102047.modules[0].frontend.pages[1].source']);
  assert.equal(missing[0].severity, 'warning');
  assert.ok(seen.some(ref => ref.kind === 'dir'));
});

test('orphan pages: a page file no route points at; defs, tests and variants of a routed page are not', () => {
  const declared = new Set(['l2/tarefas/web/desktop/page11/inicio.ts']);
  assert.deepEqual(orphanPages([
    'l2/tarefas/web/desktop/page11/inicio.ts',
    'l2/tarefas/web/desktop/page11/inicio.defs.ts',
    'l2/tarefas/web/desktop/page21/inicio.ts',
    'l2/tarefas/web/mobile/page11/inicio.ts',
    'l2/tarefas/web/desktop/page11/sobra.ts',
    'l2/tarefas/web/desktop/page11/sobra.test.ts',
    'l2/layout/appHeaderHeader.ts',
  ], declared), ['l2/tarefas/web/desktop/page11/sobra.ts']);
});

test('diff: smallest paths; a reordered list is one change', () => {
  const after = setAt(config(), [...MODULE, 'navigation', 0, 'label'], 'Começo');
  assert.deepEqual(diffConfig(config(), after).map(change => pathKey(change.path)), ['projects.102047.modules[0].navigation[0].label']);
  const moved = moveAt(config(), [...MODULE, 'navigation'], 1, 0);
  assert.deepEqual(diffConfig(config(), moved).map(change => pathKey(change.path)), ['projects.102047.modules[0].navigation']);
  assert.deepEqual(diffConfig(config(), config()), []);
});

test('rebase: my edit goes on top of a file changed elsewhere; the same place changed twice is a conflict', () => {
  const original = config();
  const mine = setAt(original, [...MODULE, 'basePath'], '/tasks');
  const theirs = setAt(original, ['clientShell', 'regions', 'header', 'profiles', 'header', 'heightPx'], 72);

  const merged = rebaseConfig(original, mine, theirs);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(getAt(merged.config, [...MODULE, 'basePath']), '/tasks');
  assert.equal(getAt(merged.config, ['clientShell', 'regions', 'header', 'profiles', 'header', 'heightPx']), 72);

  const clash = setAt(original, [...MODULE, 'basePath'], '/other');
  const refused = rebaseConfig(original, mine, clash);
  assert.deepEqual(refused.conflicts.map(pathKey), ['projects.102047.modules[0].basePath']);
  assert.equal(refused.config, clash);

  const same = rebaseConfig(original, mine, mine);
  assert.deepEqual(same.conflicts, []);
});

test('every field of the schema has a name for a person', () => {
  const missing: string[] = [];
  const walk = (spec: Spec, where: string) => {
    if (spec.kind === 'object') {
      for (const [key, field] of Object.entries(spec.fields)) {
        if (!labelOf(key, field)) missing.push(`${where}.${key}`);
        walk(field, `${where}.${key}`);
      }
    } else if (spec.kind === 'list') walk(spec.item, `${where}[]`);
    else if (spec.kind === 'map') walk(spec.value, `${where}{}`);
  };
  walk(ROOT_SPEC, '');
  assert.deepEqual(missing, []);
  assert.equal(labelOf('source', (ROOT_SPEC.fields.organization as ObjectSpec).fields.source)?.pt, 'Origem', 'a spec label wins over the key');
  assert.equal(FIELD_LABELS.route.pt, 'Rota');
});

test('the screen of a path: each module, the persistence, the sections', () => {
  const c = config();
  assert.equal(viewOfPath(c, 102047, [...MODULE, 'navigation', 1, 'href']), 'module:0');
  assert.equal(viewOfPath(c, 102047, ['projects', '102047', 'persistenceModules', 0]), 'persistence');
  assert.equal(viewOfPath(c, 102047, ['projects', '102047', 'modules']), 'checks');
  assert.equal(viewOfPath(c, 102047, ['projects', '102033', 'root']), 'dependencies');
  assert.equal(viewOfPath(c, 102047, ['clientShell', 'regions', 'header', 'activeProfile']), 'shell');
  assert.equal(viewOfPath(c, 102047, ['projectSettings', 'url']), 'project');
  assert.equal(viewOfPath(c, 102047, ['somethingNew']), 'other');
});

test('a path described for a person, with names instead of indexes', () => {
  const c = config();
  const pt = (trail: ReturnType<typeof describePath>) => trail.map(step => typeof step === 'string' ? step : step.pt);
  assert.deepEqual(pt(describePath(c, 102047, [...MODULE, 'navigation', 1, 'href'])), ['tarefas', 'Menu', 'Painel', 'Link']);
  assert.deepEqual(pt(describePath(c, 102047, [...MODULE, 'frontend', 'pages', 0, 'route'])), ['tarefas', 'Frontend', 'Páginas', 'Início', 'Rota']);
  assert.deepEqual(pt(describePath(c, 102047, [...MODULE, 'shellMode'])), ['tarefas', 'Modo do shell']);
  assert.deepEqual(pt(describePath(c, 102047, ['clientShell', 'regions', 'header', 'activeProfile'])), ['Shell do app', 'Regiões', 'Cabeçalho', 'Perfil ativo']);
});
