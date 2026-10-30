/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/compose.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { composeM4ModuleEntry, m4FirstSentence, m4MenuActors, m4MenuPages, type M4FinalizePage } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/compose.js';
import { m4ModuleLanguages } from '/_102020_/l2/agentMaterializeL2/steps/finalize70/run.js';

const root = new URL('../../../../../mls-102047/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
function sources(module: string, pageIds: string[]) {
  const pages: M4FinalizePage[] = pageIds.map(pageId => ({
    pageId,
    intent: parseL2Page11(read(`l2/${module}/web/desktop/page11/${pageId}.defs.ts`)).definition.intent,
    sharedActors: parseL2Shared(read(`l2/${module}/web/shared/${pageId}.defs.ts`)).definition.access.actors,
  }));
  return { project: 102047, module, pages, menu: JSON.parse(read(`l4/${module}/pool/l2/web/menu.json`)), ...m4ModuleLanguages(read(`l4/${module}/module.defs.ts`)) };
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
  const { entry, changes, navigationKept } = composeM4ModuleEntry(sources('tarefas', pageIds));
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

test('menu helpers: hubs, authorities through a hub, first sentence', () => {
  const menu = { tree: [{ id: 'area', kind: 'hub', children: [{ id: 'a', kind: 'page', label: 'A' }, { id: 'b', kind: 'page' }] }, { id: 'c', kind: 'page', label: 'C' }], authorities: { 'actor:x': ['area'], 'actor:y': ['c', 'a'] } };
  const { order, hubs } = m4MenuPages(menu);
  assert.deepEqual(order, [{ pageId: 'a', label: 'A' }, { pageId: 'b', label: 'B' }, { pageId: 'c', label: 'C' }]);
  assert.deepEqual(Object.fromEntries(m4MenuActors(menu, hubs)), { a: ['x', 'y'], b: ['x'], c: ['y'] });
  assert.equal(m4FirstSentence('Registra a despesa. Envia depois.'), 'Registra a despesa.');
  assert.equal(m4FirstSentence('Sem ponto final'), 'Sem ponto final');
  assert.equal(m4FirstSentence('Valor de R$ 3.50 aprovado. Fim.'), 'Valor de R$ 3.50 aprovado.');
});
