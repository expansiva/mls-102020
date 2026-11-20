/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/compose.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { composeM4ModuleEntry, EXTERNAL_SYSTEM_MENU_NODE_MISSING, m4FirstSentence, m4MenuActors, m4MenuPages, m4PageNeedsRecord, type M4FinalizePage, type M4FinalizeSources } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/compose.js';
import { m4ModuleLanguages } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/run.js';

const root = new URL('./fixtures/reembolsoDespesas/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const readTarefas = (path: string) => readFileSync(new URL(path, new URL('./fixtures/tarefas/', import.meta.url)), 'utf8');
function sources(module: string, pageIds: string[], load: (path: string) => string = read) {
  const pages: M4FinalizePage[] = pageIds.map(pageId => ({
    pageId,
    intent: parseL2Page11(load(`l2/${module}/web/desktop/page11/${pageId}.defs.ts`)).definition.intent,
    sharedActors: parseL2Shared(load(`l2/${module}/web/shared/${pageId}.defs.ts`)).definition.access.actors,
  }));
  return { project: 102047, module, pages, menu: JSON.parse(load(`l4/${module}/pool/l2/web/menu.json`)), ...m4ModuleLanguages(load(`l4/${module}/module.defs.ts`)) };
}
const configEntry = (module: string) => (JSON.parse(read('l5/config.json')) as { projects: Record<string, { modules: Array<Record<string, unknown>> }> }).projects['102047'].modules.find(item => item.moduleId === module);

// The entry of reembolsoDespesas was written by hand on 13-15/10/2026; finalize70 must compose the same one.
test('reembolsoDespesas: the composed entry is the hand-written one, except the descriptions (first sentence of the intent)', () => {
  const current = configEntry('reembolsoDespesas')!;
  const { entry, navigation } = composeM4ModuleEntry(sources('reembolsoDespesas', ['despesas_aprovadas', 'despesas_da_equipe', 'inicio', 'minhas_despesas']), current);
  // The module already exists: the hand-written order stays, including inicio first.
  assert.deepEqual(navigation.map(item => item.id), (current.navigation as Array<{ id: string }>).map(item => item.id));
  const byId = (items: unknown) => [...(items as Array<Record<string, unknown>>)].sort((a, b) => String(a.id ?? a.pageId ?? a.actorId).localeCompare(String(b.id ?? b.pageId ?? b.actorId)));
  const strip = (items: unknown) => byId(items).map(({ description: _d, ...rest }) => rest);
  assert.deepEqual(strip(entry.navigation), strip(current.navigation), 'labels, hrefs, actors and landing flags');
  assert.deepEqual(byId(entry.landings), byId(current.landings));
  const frontend = entry.frontend as { pages: unknown[] };
  const handFrontend = current.frontend as { pages: unknown[] };
  assert.deepEqual({ ...frontend, pages: byId(frontend.pages) }, { ...handFrontend, pages: byId(handFrontend.pages) });
  // The languages added by hand on 15/10 were lost when the file was rewritten (9e88444); finalize70 restores them from module.defs.ts.
  assert.deepEqual(entry.languages, ['pt-BR', 'en-US', 'es-ES']);
  for (const key of ['backendControllers', 'headerLinks', 'shellMode', 'basePath', 'userLanguage']) assert.deepEqual(entry[key], current[key], key);
  assert.deepEqual(Object.keys(entry).filter(key => key !== 'languages'), Object.keys(current).filter(key => key !== 'languages'), 'the keys keep their place');
  assert.ok(navigation.every(item => item.description && !/\.\s\S/u.test(item.description)), 'one sentence each');
});

test('tarefas: the minha_area hub is flattened, meus_avisos gets both actors, each actor lands on the first page of its own list', () => {
  const pageIds = ['inicio_gestor', 'inicio_membro', 'listas', 'membros_equipe', 'meus_avisos', 'minhas_tarefas', 'tarefas_equipe'];
  const { entry, changes, navigationKept } = composeM4ModuleEntry(sources('tarefas', pageIds, readTarefas));
  assert.equal(navigationKept, 0);
  const navigation = entry.navigation as Array<{ id: string; actors: string[]; landing?: true }>;
  assert.deepEqual(navigation.map(item => item.id), ['inicio_membro', 'minhas_tarefas', 'meus_avisos', 'inicio_gestor', 'tarefas_equipe', 'listas', 'membros_equipe']);
  assert.deepEqual(navigation.find(item => item.id === 'meus_avisos')!.actors, ['membroEquipe', 'gestor']);
  assert.deepEqual(entry.landings, [
    { actorId: 'membroEquipe', pageId: 'inicio_membro', route: '/tarefas/inicio_membro' },
    { actorId: 'gestor', pageId: 'inicio_gestor', route: '/tarefas/inicio_gestor' },
  ]);
  // by menu order alone the gestor would land on meus_avisos (inside the membro hub, before Painel da equipe)
  assert.deepEqual(navigation.filter(item => item.landing).map(item => item.id), ['inicio_membro', 'inicio_gestor']);
  assert.equal((entry.frontend as { pages: Array<{ componentTag: string }> }).pages[0].componentTag, 'tarefas--web--desktop--page11--inicio_membro-102047');
  assert.ok(changes.includes('navigation') && changes.includes('frontend'));
});

test('a hand-edited label and order stay, a new approved page goes last, and a config-only page stays', () => {
  const all = sources('reembolsoDespesas', ['minhas_despesas', 'despesas_aprovadas']);
  const current = {
    navigation: [
      { id: 'inicio', label: 'Começo', href: '/reembolsoDespesas/inicio', description: 'editada à mão', actors: ['colaborador'], landing: true as const },
      { id: 'minhas_despesas', label: 'Minhas', href: '/reembolsoDespesas/minhas_despesas', description: 'old', actors: ['colaborador'] },
      { id: 'so_no_config', label: 'Do l3', href: '/reembolsoDespesas/so_no_config', description: 'posta à mão', actors: ['gestor'] },
    ],
    landings: [{ actorId: 'colaborador', pageId: 'inicio', route: '/reembolsoDespesas/inicio' }],
    frontend: { layer: 'l2', pages: [
      { pageId: 'inicio', route: '/reembolsoDespesas/inicio', title: 'Começo' },
      { pageId: 'so_no_config', route: '/reembolsoDespesas/so_no_config', title: 'Do l3' },
      { pageId: 'minhas_despesas', route: '/reembolsoDespesas/minhas_despesas', title: 'Minhas' },
    ] },
  };
  const { entry, navigationAdded, navigationKept } = composeM4ModuleEntry(all, current);
  const navigation = entry.navigation as Array<{ id: string; label: string; description: string }>;
  assert.deepEqual(navigation.map(item => item.id), ['inicio', 'minhas_despesas', 'so_no_config', 'despesas_aprovadas']);
  assert.equal(navigation[0].label, 'Começo');
  assert.equal(navigation[0].description, 'editada à mão');
  assert.equal(navigation[2].label, 'Do l3');
  assert.deepEqual(navigationAdded, ['despesas_aprovadas']);
  assert.equal(navigationKept, 3);
  assert.deepEqual(entry.landings, [
    { actorId: 'colaborador', pageId: 'inicio', route: '/reembolsoDespesas/inicio' },
    { actorId: 'financeiro', pageId: 'despesas_aprovadas', route: '/reembolsoDespesas/despesas_aprovadas' },
  ]);
  const pages = (entry.frontend as { pages: Array<{ pageId: string; title?: string }> }).pages;
  assert.deepEqual(pages.map(item => item.pageId), ['inicio', 'so_no_config', 'minhas_despesas', 'despesas_aprovadas']);
  assert.equal(pages[0].title, 'Começo');
  assert.equal(pages.at(-1)!.title, 'Despesas aprovadas');
});

test('an existing module keeps a hand-edited page and a page that exists only in the config, and appends a new page', () => {
  const src = sources('reembolsoDespesas', ['inicio', 'minhas_despesas', 'despesas_da_equipe']);
  const current = {
    navigation: [
      { id: 'minhas_despesas', label: 'Editada', href: '/reembolsoDespesas/minhas_despesas', description: 'texto da mão', actors: ['colaborador'], landing: true as const },
      { id: 'so_no_config', label: 'Do l3', href: '/reembolsoDespesas/so_no_config', description: 'posta à mão', actors: ['gestor'] },
    ],
    landings: [{ actorId: 'colaborador', pageId: 'minhas_despesas', route: '/reembolsoDespesas/minhas_despesas' }],
    frontend: { pages: [
      { pageId: 'minhas_despesas', title: 'Editada', route: '/reembolsoDespesas/minhas_despesas' },
      { pageId: 'so_no_config', title: 'Do l3', route: '/reembolsoDespesas/so_no_config' },
    ] },
  };
  const { entry, navigationAdded, navigationKept } = composeM4ModuleEntry(src, current);
  const navigation = entry.navigation as Array<{ id: string; label: string; description: string; actors: string[] }>;
  assert.deepEqual(navigation.map(item => item.id), ['minhas_despesas', 'so_no_config', 'inicio', 'despesas_da_equipe']);
  assert.equal(navigation[0].label, 'Editada');
  assert.equal(navigation[0].description, 'texto da mão');
  assert.deepEqual(navigation[0].actors, ['colaborador']);
  assert.equal(navigation[1].label, 'Do l3');
  assert.deepEqual(navigationAdded, ['inicio', 'despesas_da_equipe']);
  assert.equal(navigationKept, 2);
  const pages = (entry.frontend as { pages: Array<{ pageId: string; title: string }> }).pages;
  assert.deepEqual(pages.map(item => item.pageId), ['minhas_despesas', 'so_no_config', 'inicio', 'despesas_da_equipe']);
  assert.equal(pages[0].title, 'Editada');
  assert.equal(pages[1].title, 'Do l3');
  const landings = entry.landings as Array<{ actorId: string; pageId: string }>;
  assert.equal(landings[0].pageId, 'minhas_despesas');
  assert.ok(landings.some(item => item.pageId !== 'minhas_despesas'), 'a new actor gets a landing');
  const fresh = composeM4ModuleEntry(src);
  assert.deepEqual((fresh.entry.navigation as Array<{ id: string }>).map(item => item.id), ['minhas_despesas', 'inicio', 'despesas_da_equipe']);
  assert.equal(fresh.navigationKept, 0);
});

test('a page that pages50 did not approve is left out; a page the menu does not list goes last, labelled from its id', () => {
  const all = sources('reembolsoDespesas', ['despesas_aprovadas', 'inicio']);
  const { entry } = composeM4ModuleEntry({ ...all, pages: [...all.pages, { pageId: 'relatorio_mensal', intent: 'Mostra o mês. Detalhe.', sharedActors: ['financeiro'] }] });
  const navigation = entry.navigation as Array<{ id: string; label: string; description: string; actors: string[] }>;
  assert.deepEqual(navigation.map(item => item.id), ['inicio', 'despesas_aprovadas', 'relatorio_mensal']);
  assert.deepEqual(navigation[2], { id: 'relatorio_mensal', label: 'Relatorio mensal', href: '/reembolsoDespesas/relatorio_mensal', description: 'Mostra o mês.', actors: ['financeiro'] });
});

test('a new entry gets the frontend fields; an existing one keeps every field it does not own; recomposing changes nothing', () => {
  const src = sources('reembolsoDespesas', ['inicio']);
  const fresh = composeM4ModuleEntry(src);
  assert.deepEqual(Object.keys(fresh.entry), ['moduleId', 'shellMode', 'basePath', 'userLanguage', 'languages', 'navigation', 'landings', 'frontend', 'headerLinks']);
  const current = { moduleId: 'reembolsoDespesas', basePath: '/x', backendControllers: './l1/x', persistenceModules: ['keep'], custom: 1, frontend: { pageTests: ['t.js'] } };
  const { entry } = composeM4ModuleEntry(src, current);
  assert.equal(entry.backendControllers, './l1/x');
  assert.deepEqual(entry.persistenceModules, ['keep']);
  assert.equal(entry.custom, 1);
  assert.deepEqual((entry.frontend as { pageTests: string[] }).pageTests, ['t.js'], 'pageTests belongs to tests60');
  assert.deepEqual(current.frontend, { pageTests: ['t.js'] }, 'the current entry is not mutated');
  assert.deepEqual(composeM4ModuleEntry(src, entry).changes, []);
});

test('icon is copied onto a new item only when the page has one; an existing item keeps the icon the hand set', () => {
  const base = sources('reembolsoDespesas', ['inicio', 'minhas_despesas', 'despesas_aprovadas']);
  const menu = structuredClone(base.menu) as { tree: Array<Record<string, unknown>> };
  const stamp = (pageId: string, icon: string) => {
    const walk = (list: Array<Record<string, unknown>>) => {
      for (const node of list) {
        if (node.id === pageId) node.icon = icon;
        if (Array.isArray(node.children)) walk(node.children as Array<Record<string, unknown>>);
      }
    };
    walk(menu.tree);
  };
  stamp('inicio', '  house  ');
  stamp('minhas_despesas', '');
  stamp('despesas_aprovadas', 'wallet');
  const src = { ...base, menu };
  const fresh = composeM4ModuleEntry(src);
  const items = fresh.entry.navigation as Array<Record<string, unknown>>;
  const byId = (id: string) => items.find(item => item.id === id)!;
  assert.equal(byId('inicio').icon, 'house');
  assert.equal('icon' in byId('minhas_despesas'), false);
  assert.equal(byId('despesas_aprovadas').icon, 'wallet');
  const current = {
    navigation: [
      { id: 'inicio', label: 'Começo', href: '/reembolsoDespesas/inicio', description: 'à mão', actors: ['colaborador'], icon: 'pencil' },
      { id: 'minhas_despesas', label: 'Minhas', href: '/reembolsoDespesas/minhas_despesas', description: 'à mão', actors: ['colaborador'] },
    ],
  };
  const again = composeM4ModuleEntry(src, current);
  const kept = again.entry.navigation as Array<Record<string, unknown>>;
  assert.equal(kept.find(item => item.id === 'inicio')!.icon, 'pencil');
  assert.equal('icon' in kept.find(item => item.id === 'minhas_despesas')!, false);
  assert.equal(kept.find(item => item.id === 'despesas_aprovadas')!.icon, 'wallet');
  assert.deepEqual(again.navigationAdded, ['despesas_aprovadas']);
});

test('menu helpers: a record page is not a menu item, a hub still gives it actors, first sentence', () => {
  const menu = { tree: [{ id: 'area', kind: 'hub', children: [{ id: 'a', kind: 'page', label: 'A' }, { id: 'b', kind: 'page' }] }, { id: 'c', kind: 'page', label: 'C' }], authorities: { 'actor:x': ['area'], 'actor:y': ['c', 'a'] } };
  const { order, hubs } = m4MenuPages(menu, new Set(['b']));
  assert.deepEqual(order, [{ pageId: 'a', label: 'A' }, { pageId: 'c', label: 'C' }]);
  assert.deepEqual(hubs.get('area'), ['a', 'b']);
  assert.deepEqual(Object.fromEntries(m4MenuActors(menu, hubs)), { a: ['x', 'y'], b: ['x'], c: ['y'] });
  assert.equal(m4FirstSentence('Registra a despesa. Envia depois.'), 'Registra a despesa.');
  assert.equal(m4FirstSentence('Sem ponto final'), 'Sem ponto final');
  assert.equal(m4FirstSentence('Valor de R$ 3.50 aprovado. Fim.'), 'Valor de R$ 3.50 aprovado.');
});

function menuWithExternal(src: M4FinalizeSources, label: string, text: string, nest = false): M4FinalizeSources {
  const menu = structuredClone(src.menu) as { tree: Array<Record<string, unknown>> };
  const node = { id: 'external_systems', kind: 'group', label, text, children: [] };
  if (nest) menu.tree.push({ id: 'config', kind: 'group', label: 'Config', text: 'Area.', children: [node] });
  else menu.tree.push(node);
  return { ...src, menu };
}

test('external systems: the plan label and text become the admin link, in whatever language the plan wrote', () => {
  const src = sources('reembolsoDespesas', ['inicio', 'minhas_despesas']);
  const pt = composeM4ModuleEntry({ ...menuWithExternal(src, 'Sistemas de fora', 'O admin configura os sistemas. O resto fica de fora.'), externalSystemIds: ['erp'] });
  const navigation = pt.entry.navigation as Array<Record<string, unknown>>;
  assert.deepEqual(navigation[navigation.length - 1], {
    id: 'external_systems',
    label: 'Sistemas de fora',
    href: '/monitor/external-systems?module=reembolsoDespesas',
    description: 'O admin configura os sistemas.',
    actors: ['admin'],
  });
  assert.deepEqual(pt.problems, []);
  assert.equal(pt.navigationAdded.includes('external_systems'), false);
  assert.equal(pt.navigationKept, 0);
  const landings = pt.entry.landings as Array<{ pageId: string }>;
  assert.equal(landings.some(item => item.pageId === 'external_systems'), false);
  assert.equal((pt.entry.frontend as { pages: Array<{ pageId: string }> }).pages.some(item => item.pageId === 'external_systems'), false);

  const en = composeM4ModuleEntry({ ...menuWithExternal(src, 'Outside systems', 'The admin configures the systems.'), externalSystemIds: ['erp'] });
  const enItem = (en.entry.navigation as Array<{ id: string; label: string; description: string }>).find(item => item.id === 'external_systems')!;
  assert.equal(enItem.label, 'Outside systems');
  assert.equal(enItem.description, 'The admin configures the systems.');

  const nested = composeM4ModuleEntry({ ...menuWithExternal(src, 'Sistemas de fora', 'O admin configura os sistemas.', true), externalSystemIds: ['erp'] });
  assert.equal((nested.entry.navigation as Array<{ label: string }>).at(-1)!.label, 'Sistemas de fora');
});

test('external systems: no plan node means the problem and no link; no system means neither', () => {
  const src = sources('reembolsoDespesas', ['inicio']);
  const missing = composeM4ModuleEntry({ ...src, externalSystemIds: ['erp'] });
  assert.deepEqual(missing.problems, [EXTERNAL_SYSTEM_MENU_NODE_MISSING]);
  assert.equal((missing.entry.navigation as Array<{ id: string }>).some(item => item.id === 'external_systems'), false);
  const blank = composeM4ModuleEntry({ ...menuWithExternal(src, '  ', 'texto'), externalSystemIds: ['erp'] });
  assert.deepEqual(blank.problems, [EXTERNAL_SYSTEM_MENU_NODE_MISSING]);
  const none = composeM4ModuleEntry(src);
  assert.deepEqual(none.problems, []);
  assert.equal((none.entry.navigation as Array<{ id: string }>).some(item => item.id === 'external_systems'), false);
});

test('external systems: an existing module gains the link, keeps a hand edit, and loses only that link', () => {
  const src = sources('reembolsoDespesas', ['inicio']);
  const current = {
    moduleId: 'reembolsoDespesas',
    navigation: [
      { id: 'inicio', label: 'Começo', href: '/reembolsoDespesas/inicio', description: 'à mão', actors: ['colaborador'], landing: true as const },
    ],
    landings: [{ actorId: 'colaborador', pageId: 'inicio', route: '/reembolsoDespesas/inicio' }],
    frontend: { pages: [{ pageId: 'inicio', route: '/reembolsoDespesas/inicio' }] },
  };
  const gained = composeM4ModuleEntry({ ...menuWithExternal(src, 'Sistemas de fora', 'O admin configura os sistemas.'), externalSystemIds: ['erp', 'crm'] }, current);
  assert.deepEqual((gained.entry.navigation as Array<{ id: string }>).map(item => item.id), ['inicio', 'external_systems']);
  assert.deepEqual(gained.navigationAdded, []);
  assert.equal(gained.navigationKept, 1);
  assert.deepEqual(gained.entry.landings, current.landings);
  assert.deepEqual((gained.entry.frontend as { pages: unknown[] }).pages, current.frontend.pages);

  const edited = structuredClone(gained.entry);
  (edited.navigation as Array<{ label: string }>)[1].label = 'Sistemas';
  const still = composeM4ModuleEntry({ ...src, externalSystemIds: ['erp'] }, edited);
  assert.deepEqual(still.problems, []);
  assert.equal((still.entry.navigation as Array<{ id: string; label: string }>).find(item => item.id === 'external_systems')!.label, 'Sistemas');
  assert.equal(still.navigationKept, 1);

  const gone = composeM4ModuleEntry({ ...src, externalSystemIds: [] }, edited);
  assert.deepEqual((gone.entry.navigation as Array<{ id: string }>).map(item => item.id), ['inicio']);
  assert.deepEqual(gone.entry.landings, current.landings);
  assert.deepEqual((gone.entry.frontend as { pages: unknown[] }).pages, current.frontend.pages);
  assert.equal(gone.navigationKept, 1);
});

test('agents: a page with a required id leaves the menu and keeps its route; the hub is not flattened', () => {
  assert.equal(m4PageNeedsRecord({ agentId: { required: true }, agentBehaviorId: { required: false } }), true);
  assert.equal(m4PageNeedsRecord({ agentDraftId: { required: false }, page: { required: true } }), false);
  const agentsRoot = new URL('./fixtures/agents/', import.meta.url);
  const load = (path: string) => readFileSync(new URL(path, agentsRoot), 'utf8');
  const pageIds = ['agents', 'draft_review', 'agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_activity', 'agent_simulation', 'my_conduct', 'person_restrictions', 'tool_catalog'];
  const paramsOf = (pageId: string) => parseL2Shared(load(`l2/agents/web/shared/${pageId}.defs.ts`)).definition.entry.params;
  const record = pageIds.filter(pageId => m4PageNeedsRecord(paramsOf(pageId)));
  assert.deepEqual(record, ['draft_review', 'agent_overview', 'agent_behavior', 'agent_tools', 'agent_configuration', 'agent_activity', 'agent_simulation', 'my_conduct']);
  assert.equal(m4PageNeedsRecord(paramsOf('draft_review')), true);
  assert.equal(m4PageNeedsRecord(paramsOf('agent_overview')), true);
  const pages: M4FinalizePage[] = pageIds.map(pageId => ({
    pageId,
    intent: parseL2Page11(load(`l2/agents/web/desktop/page11/${pageId}.defs.ts`)).definition.intent,
    sharedActors: parseL2Shared(load(`l2/agents/web/shared/${pageId}.defs.ts`)).definition.access.actors,
    needsRecord: m4PageNeedsRecord(paramsOf(pageId)),
  }));
  const src: M4FinalizeSources = { project: 102047, module: 'agents', pages, menu: JSON.parse(load('l4/agents/pool/l2/web/menu.json')), productLanguages: ['en-US'], userLanguage: 'en-US' };
  const fresh = composeM4ModuleEntry(src);
  const navigation = fresh.entry.navigation as Array<{ id: string }>;
  assert.deepEqual(navigation.map(item => item.id), ['agents', 'person_restrictions', 'tool_catalog']);
  const routes = (fresh.entry.frontend as { pages: Array<{ pageId: string; actors: string[] }> }).pages;
  assert.deepEqual(routes.map(item => item.pageId), [...navigation.map(item => item.id), ...record]);
  assert.deepEqual(routes.find(item => item.pageId === 'agent_overview')!.actors, ['companyAdmin', 'organizationMember']);
  assert.deepEqual(fresh.entry.landings, [
    { actorId: 'companyAdmin', pageId: 'agents', route: '/agents/agents' },
    { actorId: 'organizationMember', pageId: 'agents', route: '/agents/agents' },
  ]);
  const menu = structuredClone(src.menu) as { authorities: Record<string, string[]> };
  menu.authorities['actor:onlyRecord'] = ['agent_overview'];
  const landed = composeM4ModuleEntry({ ...src, menu });
  assert.equal((landed.entry.navigation as Array<{ id: string }>).some(item => item.id === 'agent_overview'), false);
  assert.deepEqual((landed.entry.landings as Array<{ actorId: string; pageId: string }>).find(item => item.actorId === 'onlyRecord'), { actorId: 'onlyRecord', pageId: 'agent_overview', route: '/agents/agent_overview' });
  const current = {
    navigation: [
      { id: 'agents', label: 'Agents', href: '/agents/agents', description: 'kept', actors: ['companyAdmin'] },
      { id: 'agent_overview', label: 'Hand', href: '/agents/agent_overview', description: 'hand', actors: ['companyAdmin'] },
    ],
    landings: [{ actorId: 'companyAdmin', pageId: 'agents', route: '/agents/agents' }],
    frontend: { pages: [
      { pageId: 'agents', route: '/agents/agents', title: 'Agents' },
      { pageId: 'agent_overview', route: '/agents/agent_overview', title: 'Hand' },
    ] },
  };
  const again = composeM4ModuleEntry(src, current);
  assert.equal((again.entry.navigation as Array<{ id: string }>).some(item => item.id === 'agent_overview'), false);
  assert.equal((again.entry.navigation as Array<{ id: string }>).some(item => item.id === 'agents'), true);
  const againPages = (again.entry.frontend as { pages: Array<{ pageId: string; title?: string }> }).pages;
  assert.equal(againPages.find(item => item.pageId === 'agent_overview')!.title, 'Hand');
  assert.ok(againPages.length === pageIds.length);
});

test('designSystems: the project DS names go in after languages; without names the field is left as it is', () => {
  const src = sources('reembolsoDespesas', ['inicio']);
  const withDs = composeM4ModuleEntry({ ...src, designSystems: ['Default', 'Canteiro'] });
  assert.deepEqual(withDs.entry.designSystems, ['Default', 'Canteiro']);
  assert.deepEqual(Object.keys(withDs.entry).slice(0, 6), ['moduleId', 'shellMode', 'basePath', 'userLanguage', 'languages', 'designSystems']);
  const kept = composeM4ModuleEntry({ ...src, designSystems: [] }, { moduleId: 'reembolsoDespesas', designSystems: ['Old'] });
  assert.deepEqual(kept.entry.designSystems, ['Old'], 'no names read = no change to the list');
  assert.equal(kept.changes.includes('designSystems'), false);
});
