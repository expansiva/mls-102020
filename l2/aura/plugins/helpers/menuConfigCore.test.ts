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
  searchMenuIcons,
  setHomePage,
  setLanding,
  setMenuActor,
  setMenuDescription,
  setMenuIcon,
  setMenuIconSvg,
  setMenuLabel,
  setPageRoute,
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
    { id: 'inicio', label: 'Início', icon: '', iconSvg: '', landing: true },
    { id: 'minhas_tarefas', label: 'Minhas tarefas', icon: '', iconSvg: '', landing: false },
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

// ─── icon ────────────────────────────────────────────────────────────────────

test('reading without icons: every row has icon "" and no issue', () => {
  const view = readModuleMenu(tarefas());
  assert.ok(view.rows.every(row => row.icon === ''));
  assert.deepEqual(view.issues, []);
});

test('setting an icon writes only navigation[i].icon; the fingerprint sees it', () => {
  const before = tarefas();
  const { entry, refused } = setMenuIcon(before, 'participantes', 'users');
  assert.equal(refused, undefined);
  assert.equal(nav(entry)[4].icon, 'users');
  assert.equal(readModuleMenu(entry).rows[4].icon, 'users');
  assert.equal(pages(entry)[4].icon, undefined);
  assert.notEqual(moduleMenuFingerprint(entry), moduleMenuFingerprint(before));
  delete nav(entry)[4].icon;
  assert.deepEqual(entry, before, 'nothing else changed');
});

test('"no icon" removes the key instead of writing ""', () => {
  const withIcon = setMenuIcon(tarefas(), 'inicio', 'house').entry;
  const { entry } = setMenuIcon(withIcon, 'inicio', '');
  assert.equal('icon' in nav(entry)[0], false);
  assert.deepEqual(entry, tarefas());
});

test('same icon again, or "no icon" on an item without one, is a no-op returning the same entry', () => {
  const withIcon = setMenuIcon(tarefas(), 'inicio', 'house').entry;
  assert.equal(setMenuIcon(withIcon, 'inicio', 'house').entry, withIcon);
  const plain = tarefas();
  assert.equal(setMenuIcon(plain, 'inicio', '').entry, plain);
});

test('an icon outside the Lucide catalog, or on a page out of the menu, is refused', () => {
  const before = tarefas();
  assert.equal(setMenuIcon(before, 'inicio', 'not-an-icon').refused, 'unknown-icon');
  const hidden = hideFromMenu(before, 'inicio').entry;
  assert.equal(setMenuIcon(hidden, 'inicio', 'house').refused, 'not-in-menu');
});

test('an unknown icon already in the config is an issue; fixing it removes the key', () => {
  const broken = tarefas();
  nav(broken)[1].icon = 'old-icon-name';
  const view = readModuleMenu(broken);
  assert.deepEqual(view.issues, [{ code: 'unknown-icon', pageId: 'minhas_tarefas' }]);
  assert.equal(view.rows[1].icon, 'old-icon-name');
  const { entry } = fixMenuIssue(broken, view.issues[0]);
  assert.equal('icon' in nav(entry)[1], false);
  assert.deepEqual(readModuleMenu(entry).issues, []);
});

test('the icon survives replaceModuleMenu and shows in the actor preview', () => {
  const edited = setMenuIcon(tarefas(), 'painel_tarefas', 'layout-dashboard').entry;
  const config = { projects: { '102047': { modules: [tarefas()] } } };
  const written = findModuleEntry(replaceModuleMenu(config, 102047, 'tarefas', edited), 102047, 'tarefas')!;
  assert.equal(nav(written)[2].icon, 'layout-dashboard');
  const preview = previewForActor(edited, 'tarefas', 'gestor');
  assert.equal(preview.find(item => item.id === 'painel_tarefas')?.icon, 'layout-dashboard');
});

test('searchMenuIcons: case-insensitive substring, empty query lists all', () => {
  const all = searchMenuIcons('');
  assert.ok(all.length > 1000);
  assert.ok(all.includes('house'));
  const users = searchMenuIcons('  USERS ');
  assert.ok(users.length > 0);
  assert.ok(users.every(name => name.includes('users')));
  assert.deepEqual(searchMenuIcons('zzzz-nothing'), []);
});

// ─── own SVG icon ────────────────────────────────────────────────────────────

const OWN_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h16"/></svg>';

test('setMenuIconSvg writes iconSvg, drops the Lucide icon, and the fingerprint sees it', () => {
  const withLucide = setMenuIcon(tarefas(), 'participantes', 'users').entry;
  const { entry, refused } = setMenuIconSvg(withLucide, 'participantes', `  ${OWN_SVG} `);
  assert.equal(refused, undefined);
  assert.equal(nav(entry)[4].iconSvg, OWN_SVG);
  assert.equal('icon' in nav(entry)[4], false);
  assert.equal(readModuleMenu(entry).rows[4].iconSvg, OWN_SVG);
  assert.notEqual(moduleMenuFingerprint(entry), moduleMenuFingerprint(withLucide));
  assert.deepEqual(readModuleMenu(entry).issues, []);
});

test('setMenuIcon drops iconSvg; "no icon" removes both keys', () => {
  const withSvg = setMenuIconSvg(tarefas(), 'inicio', OWN_SVG).entry;
  const lucide = setMenuIcon(withSvg, 'inicio', 'house').entry;
  assert.equal(nav(lucide)[0].icon, 'house');
  assert.equal('iconSvg' in nav(lucide)[0], false);
  const none = setMenuIcon(withSvg, 'inicio', '').entry;
  assert.equal('icon' in nav(none)[0] || 'iconSvg' in nav(none)[0], false);
  assert.deepEqual(none, tarefas());
});

test('setMenuIconSvg refuses unsafe or colored markup and a page out of the menu; same svg again is a no-op', () => {
  const before = tarefas();
  assert.equal(setMenuIconSvg(before, 'inicio', '<svg viewBox="0 0 24 24"><script>x()</script></svg>').refused, 'unsafe-svg');
  assert.equal(setMenuIconSvg(before, 'inicio', '<svg viewBox="0 0 24 24"><path d="M0 0" stroke="#f00"/></svg>').refused, 'unsafe-svg');
  assert.equal(setMenuIconSvg(hideFromMenu(before, 'inicio').entry, 'inicio', OWN_SVG).refused, 'not-in-menu');
  const withSvg = setMenuIconSvg(before, 'inicio', OWN_SVG).entry;
  assert.equal(setMenuIconSvg(withSvg, 'inicio', OWN_SVG).entry, withSvg);
});

test('an unsafe iconSvg in the config is an issue; fixing removes it', () => {
  const broken = tarefas();
  nav(broken)[2].iconSvg = '<svg viewBox="0 0 24 24" onload="x()"></svg>';
  const view = readModuleMenu(broken);
  assert.deepEqual(view.issues, [{ code: 'unsafe-icon-svg', pageId: 'painel_tarefas' }]);
  const { entry } = fixMenuIssue(broken, view.issues[0]);
  assert.equal('iconSvg' in nav(entry)[2], false);
});

test('icon and iconSvg together is an issue; fixing keeps the svg and removes the icon', () => {
  const broken = tarefas();
  nav(broken)[3].icon = 'house';
  nav(broken)[3].iconSvg = OWN_SVG;
  const view = readModuleMenu(broken);
  assert.deepEqual(view.issues, [{ code: 'icon-and-svg', pageId: 'tarefas_equipe' }]);
  const { entry } = fixMenuIssue(broken, view.issues[0]);
  assert.equal('icon' in nav(entry)[3], false);
  assert.equal(nav(entry)[3].iconSvg, OWN_SVG);
});

test('the iconSvg shows in the actor preview and survives replaceModuleMenu', () => {
  const edited = setMenuIconSvg(tarefas(), 'painel_tarefas', OWN_SVG).entry;
  assert.equal(previewForActor(edited, 'tarefas', 'gestor').find(item => item.id === 'painel_tarefas')?.iconSvg, OWN_SVG);
  const config = { projects: { '102047': { modules: [tarefas()] } } };
  const written = findModuleEntry(replaceModuleMenu(config, 102047, 'tarefas', edited), 102047, 'tarefas')!;
  assert.equal(nav(written)[2].iconSvg, OWN_SVG);
});

test('setPageRoute changes the route, the menu link and the start pages together', () => {
  const result = setPageRoute(tarefas(), 'inicio', '/tarefas/home');
  assert.equal(result.refused, undefined);
  assert.equal(pages(result.entry).find(page => page.pageId === 'inicio')?.route, '/tarefas/home');
  assert.equal(nav(result.entry).find(item => item.id === 'inicio')?.href, '/tarefas/home');
  const landings = result.entry.landings as Array<Record<string, string>>;
  assert.equal(landings.find(landing => landing.pageId === 'inicio')?.route, '/tarefas/home');
  assert.equal(landings.find(landing => landing.pageId === 'painel_tarefas')?.route, '/tarefas/painel_tarefas', 'other landings untouched');
  assert.deepEqual(readModuleMenu(result.entry).issues, []);
  assert.equal(setPageRoute(tarefas(), 'inicio', 'sem-barra').refused, 'bad-route');
  assert.equal(setPageRoute(tarefas(), 'nao_existe', '/x').refused, 'no-page');
});
