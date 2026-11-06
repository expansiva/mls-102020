/// <mls fileReference="_102020_/l2/aura/plugins/helpers/menuConfigCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findModuleEntry,
  fixMenuIssue,
  hideFromMenu,
  moduleMenuFingerprint,
  moveMenuItem,
  previewForActor,
  readModuleMenu,
  replaceModuleMenu,
  setHomePage,
  setLanding,
  setMenuActor,
  setMenuDescription,
  setMenuLabel,
  showInMenu,
  type ModuleEntry,
} from '/_102020_/l2/aura/plugins/helpers/menuConfigCore.js';

// The `tarefas` entry of mls-102047/l5/config.json (30/10/2026), descriptions shortened.
const PAGES: Array<[string, string, string]> = [
  ['inicio', 'Início', 'membroEquipe'],
  ['minhas_tarefas', 'Minhas tarefas', 'membroEquipe'],
  ['painel_tarefas', 'Painel de tarefas', 'gestor'],
  ['tarefas_equipe', 'Todas as tarefas', 'gestor'],
  ['participantes', 'Participantes', 'gestor'],
  ['listas_tarefas', 'Listas de tarefas', 'gestor'],
];

function tarefas(): ModuleEntry {
  return {
    moduleId: 'tarefas',
    basePath: '/tarefas',
    userLanguage: 'pt-BR',
    navigation: PAGES.map(([id, label, actor]) => ({
      id, label, href: `/tarefas/${id}`, description: `Descrição de ${label}.`, actors: [actor],
      ...(id === 'inicio' || id === 'painel_tarefas' ? { landing: true } : {}),
    })),
    headerLinks: [],
    shellMode: 'spa',
    languages: ['pt-BR', 'en'],
    landings: [
      { actorId: 'membroEquipe', pageId: 'inicio', route: '/tarefas/inicio' },
      { actorId: 'gestor', pageId: 'painel_tarefas', route: '/tarefas/painel_tarefas' },
    ],
    frontend: {
      layer: 'l2',
      pages: PAGES.map(([id, label, actor]) => ({
        pageId: id, route: `/tarefas/${id}`, source: `l2/tarefas/web/desktop/page11/${id}.ts`,
        definition: `l2/tarefas/web/desktop/page11/${id}.defs.ts`, componentTag: `tarefas--web--desktop--page11--${id}-102047`,
        title: label, actors: [actor],
      })),
    },
  };
}

const nav = (entry: ModuleEntry) => entry.navigation as Array<Record<string, any>>;
const pages = (entry: ModuleEntry) => (entry.frontend as { pages: Array<Record<string, any>> }).pages;
const navIds = (entry: ModuleEntry) => nav(entry).map(item => item.id);

test('reading tarefas: rows in menu order, both actors, home page, no issue', () => {
  const view = readModuleMenu(tarefas());
  assert.deepEqual(view.rows.map(row => row.pageId), PAGES.map(([id]) => id));
  assert.deepEqual(view.actors, ['membroEquipe', 'gestor']);
  assert.equal(view.homePageId, 'inicio');
  assert.deepEqual(view.hidden, []);
  assert.deepEqual(view.issues, []);
  assert.deepEqual(view.rows.find(row => row.pageId === 'painel_tarefas')?.landingOf, ['gestor']);
});

test('renaming writes the menu label and the route title, and nothing else', () => {
  const before = tarefas();
  const { entry, refused } = setMenuLabel(before, 'painel_tarefas', '  Visão geral ');
  assert.equal(refused, undefined);
  assert.equal(nav(entry)[2].label, 'Visão geral');
  assert.equal(pages(entry)[2].title, 'Visão geral');
  nav(entry)[2].label = 'Painel de tarefas';
  pages(entry)[2].title = 'Painel de tarefas';
  assert.deepEqual(entry, before);
});

test('an empty label is refused', () => {
  const before = tarefas();
  const result = setMenuLabel(before, 'inicio', '   ');
  assert.equal(result.refused, 'empty-label');
  assert.equal(result.entry, before);
});

test('description: set, and cleared when empty', () => {
  const set = setMenuDescription(tarefas(), 'inicio', 'Tudo o que depende de você.').entry;
  assert.equal(nav(set)[0].description, 'Tudo o que depende de você.');
  const cleared = setMenuDescription(set, 'inicio', '  ').entry;
  assert.equal('description' in nav(cleared)[0], false);
});

test('reordering moves only navigation: the page of /tarefas does not change', () => {
  const { entry } = moveMenuItem(tarefas(), 'painel_tarefas', 0);
  assert.deepEqual(navIds(entry).slice(0, 2), ['painel_tarefas', 'inicio']);
  assert.deepEqual(pages(entry).map(page => page.pageId), PAGES.map(([id]) => id));
  assert.equal(readModuleMenu(entry).homePageId, 'inicio');
});

test('the home page moves only that page to the head of frontend.pages', () => {
  const { entry } = setHomePage(tarefas(), 'painel_tarefas');
  assert.deepEqual(pages(entry).map(page => page.pageId),
    ['painel_tarefas', 'inicio', 'minhas_tarefas', 'tarefas_equipe', 'participantes', 'listas_tarefas']);
  assert.deepEqual(navIds(entry), PAGES.map(([id]) => id));
});

test('giving an actor updates both actors lists', () => {
  const { entry } = setMenuActor(tarefas(), 'inicio', 'gestor', true);
  assert.deepEqual(nav(entry)[0].actors, ['membroEquipe', 'gestor']);
  assert.deepEqual(pages(entry)[0].actors, ['membroEquipe', 'gestor']);
});

test('taking an actor drops its landing on that page and the landing flag', () => {
  const given = setMenuActor(tarefas(), 'painel_tarefas', 'membroEquipe', true).entry;
  const { entry, refused } = setMenuActor(given, 'painel_tarefas', 'gestor', false);
  assert.equal(refused, undefined);
  assert.deepEqual(pages(entry)[2].actors, ['membroEquipe']);
  assert.deepEqual((entry.landings as unknown[]).length, 1);
  assert.equal('landing' in nav(entry)[2], false);
  assert.deepEqual(readModuleMenu(entry).issues, []);
});

test('the last actor of a page cannot be taken', () => {
  const before = tarefas();
  const result = setMenuActor(before, 'inicio', 'membroEquipe', false);
  assert.equal(result.refused, 'last-actor');
  assert.equal(result.entry, before);
});

test('hiding takes the item and its landings out; the route stays; showing rebuilds it from the page', () => {
  const hidden = hideFromMenu(tarefas(), 'inicio').entry;
  assert.equal(navIds(hidden).includes('inicio'), false);
  assert.equal(pages(hidden)[0].pageId, 'inicio');
  assert.deepEqual((hidden.landings as Array<{ actorId: string }>).map(landing => landing.actorId), ['gestor']);
  assert.deepEqual(readModuleMenu(hidden).hidden, [{ pageId: 'inicio', title: 'Início', route: '/tarefas/inicio' }]);

  const shown = showInMenu(hidden, 'inicio').entry;
  assert.deepEqual(nav(shown).at(-1), { id: 'inicio', label: 'Início', href: '/tarefas/inicio', actors: ['membroEquipe'] });
  assert.equal(showInMenu(shown, 'inicio').refused, 'already-in-menu');
});

test('landing: set, moved, cleared; refused when the actor does not see the page', () => {
  const moved = setLanding(tarefas(), 'gestor', 'participantes').entry;
  assert.deepEqual((moved.landings as Array<Record<string, string>>)[1], { actorId: 'gestor', pageId: 'participantes', route: '/tarefas/participantes' });
  assert.equal(nav(moved)[4].landing, true);
  assert.equal('landing' in nav(moved)[2], false);

  assert.equal(setLanding(tarefas(), 'gestor', 'inicio').refused, 'actor-does-not-see');

  const cleared = setLanding(tarefas(), 'membroEquipe', null).entry;
  assert.deepEqual((cleared.landings as Array<{ actorId: string }>).map(landing => landing.actorId), ['gestor']);
  assert.equal('landing' in nav(cleared)[0], false);
});

test('preview uses the shell filter: each actor sees its own pages and its landing', () => {
  assert.deepEqual(previewForActor(tarefas(), 'tarefas', 'membroEquipe'), [
    { id: 'inicio', label: 'Início', landing: true },
    { id: 'minhas_tarefas', label: 'Minhas tarefas', landing: false },
  ]);
  assert.equal(previewForActor(tarefas(), 'tarefas', 'gestor').length, 4);
});

test('issues already in the entry are reported and each fix changes only its own point', () => {
  const broken = tarefas();
  pages(broken)[1].title = 'Outro título';
  nav(broken)[3].href = '/tarefas/errado';
  pages(broken)[4].actors = ['gestor', 'membroEquipe'];
  nav(broken).push({ id: 'fantasma', label: 'Fantasma', href: '/tarefas/fantasma', actors: ['gestor'] });
  (broken.landings as unknown[]).push({ actorId: 'gestor', pageId: 'sumiu', route: '/tarefas/sumiu' });
  delete nav(broken)[0].landing;

  const issues = readModuleMenu(broken).issues;
  assert.deepEqual(issues.map(issue => `${issue.code}:${issue.pageId}`).sort(), [
    'actors-differ:participantes', 'href-differs:tarefas_equipe', 'landing-flag-differs:inicio',
    'landing-orphan:sumiu', 'nav-without-page:fantasma', 'title-differs:minhas_tarefas',
  ]);

  const titleFixed = fixMenuIssue(broken, issues.find(issue => issue.code === 'title-differs')!).entry;
  assert.equal(pages(titleFixed)[1].title, 'Minhas tarefas');
  assert.equal(readModuleMenu(titleFixed).issues.length, issues.length - 1);

  let fixed = broken;
  for (const issue of issues) fixed = fixMenuIssue(fixed, issue).entry;
  assert.deepEqual(readModuleMenu(fixed).issues, []);
  assert.deepEqual(pages(fixed)[4].actors, ['gestor']);
  assert.equal(nav(fixed)[3].href, '/tarefas/tarefas_equipe');
});

test('an edit never touches the keys outside the menu', () => {
  let entry = tarefas();
  entry = setMenuLabel(entry, 'inicio', 'Começo').entry;
  entry = moveMenuItem(entry, 'listas_tarefas', 0).entry;
  entry = setHomePage(entry, 'minhas_tarefas').entry;
  for (const key of ['moduleId', 'basePath', 'userLanguage', 'headerLinks', 'shellMode', 'languages']) {
    assert.deepEqual(entry[key], tarefas()[key], key);
  }
  assert.equal((entry.frontend as Record<string, unknown>).layer, 'l2');
  assert.equal(pages(entry)[0].componentTag, 'tarefas--web--desktop--page11--minhas_tarefas-102047');
});

test('an entry without landings or navigation gets no empty keys from a refused or no-op edit', () => {
  const bare: ModuleEntry = { moduleId: 'x', frontend: { pages: [{ pageId: 'a', route: '/x/a', title: 'A' }] } };
  assert.deepEqual(setLanding(bare, 'gestor', null).entry, bare);
  assert.deepEqual(setMenuLabel(bare, 'a', 'B').entry, bare);
  assert.deepEqual(nav(showInMenu(bare, 'a').entry), [{ id: 'a', label: 'A', href: '/x/a' }]);
});

test('fingerprint: changes with a menu field, not with another key of the entry', () => {
  const base = moduleMenuFingerprint(tarefas());
  assert.equal(moduleMenuFingerprint(tarefas()), base);
  assert.notEqual(moduleMenuFingerprint(setMenuLabel(tarefas(), 'inicio', 'Começo').entry), base);
  assert.notEqual(moduleMenuFingerprint(setHomePage(tarefas(), 'participantes').entry), base);
  assert.equal(moduleMenuFingerprint({ ...tarefas(), shellMode: 'pwa', headerLinks: [{ href: '/x' }] }), base);
});

test('replaceModuleMenu writes the menu of one module into a fresh config and keeps the rest', () => {
  const config = {
    alphaAllAuthorities: true,
    projects: {
      '102047': { root: '.', modules: [{ moduleId: 'compras', navigation: [] }, { ...tarefas(), backendControllers: './x', headerLinks: [{ href: '/novo' }] }] },
      '102020': { root: '../mls-102020', type: 'lib' },
    },
  };
  const edited = moveMenuItem(setMenuLabel(tarefas(), 'inicio', 'Começo').entry, 'inicio', 5).entry;
  const next = replaceModuleMenu(config, 102047, 'tarefas', edited) as typeof config;
  const target = findModuleEntry(next, 102047, 'tarefas')!;
  assert.equal(navIds(target).at(-1), 'inicio');
  assert.equal(pages(target)[0].title, 'Começo');
  assert.equal(target.backendControllers, './x');
  assert.deepEqual(target.headerLinks, [{ href: '/novo' }]);
  assert.deepEqual(next.projects['102047'].modules[0], { moduleId: 'compras', navigation: [] });
  assert.deepEqual(next.projects['102020'], config.projects['102020']);
  assert.equal(findModuleEntry(config, 102047, 'tarefas')!.navigation, config.projects['102047'].modules[1].navigation);
  assert.throws(() => replaceModuleMenu(config, 102047, 'naoExiste', edited), /MENU_MODULE_MISSING/u);
});
