/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/finalize70/compose.ts" enhancement="_blank"/>

// finalize70, pure: the frontend part of one module entry of l5/config.json, from what the run approved and the planning.
// Deterministic, no IO. Only the fields the frontend owns are written; every other field of the entry (backendControllers,
// persistence, headerLinks, unknown keys) is kept as it is, in its place (TASK-102020-materialize-l2-finalize70).
//
// Sources and rules:
// - pages: the pages approved by pages50 (page11 desktop), in the input20 order;
// - first generation (no current module entry): order and label come from menu.json `tree`, depth first; a hub is flattened;
//   a page the menu does not list goes after the others, labelled from its id; actors from menu.json `authorities`
//   (`actor:<id>` → page or hub ids; a hub gives its children), fallback shared.access.actors; description is the first
//   sentence of the page11 desktop intent; the landing of each actor is the first page of its own authorities list
//   (fallback: its first page in menu order);
// - module already generated: every current navigation item, frontend page and landing stays as it is (order, label,
//   description, actors, landing). Approved pages the navigation does not have are appended, in plan order, built as on
//   the first generation. A page that exists only in the config stays. Nothing is removed.
// - languages: l4 module.defs.ts productLanguages (what Ctrl+Alt+L cycles); userLanguage from the same file;
// - variants (page21…) are not pages: the shell swaps them on the same route.

import { m4PageTag } from '/_102020_/l2/agentMaterializeL2/steps/pages50/gate.js';

export interface M4FinalizePage {
  pageId: string;
  /** The page11 desktop intent: its first sentence is the menu description. */
  intent: string;
  /** shared.access.actors: used when the menu gives the page no actor. */
  sharedActors: string[];
}

export interface M4FinalizeSources {
  project: number;
  module: string;
  /** Approved pages only, in the input20 order. */
  pages: M4FinalizePage[];
  /** Accepted pages whose desktop receipt is stale, already in the current module entry. */
  keepPageIds?: string[];
  /** l4/<module>/pool/l2/web/menu.json, or null when the planning has none. */
  menu: unknown;
  productLanguages: string[];
  userLanguage: string;
}

export interface M4NavigationItem { id: string; label: string; href: string; description: string; actors: string[]; landing?: true }
export interface M4FinalizeResult {
  entry: Record<string, unknown>;
  /** The top-level keys whose value changed (empty: nothing to write). */
  changes: string[];
  navigation: M4NavigationItem[];
  /** Page ids appended to an existing navigation. On the first generation, every page. */
  navigationAdded: string[];
  /** Navigation items left as they were. Zero on the first generation. */
  navigationKept: number;
}

interface MenuNode { id?: unknown; kind?: unknown; label?: unknown; children?: unknown }

const str = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const nodes = (value: unknown): MenuNode[] => (Array.isArray(value) ? value.filter((item): item is MenuNode => Boolean(item) && typeof item === 'object') : []);

/** `minhas_despesas` → `Minhas despesas`. */
export function m4HumanizeId(id: string): string {
  const spaced = id.replace(/([a-z0-9])([A-Z])/gu, '$1 $2').replace(/[_-]+/gu, ' ').trim().toLowerCase();
  return spaced ? `${spaced[0].toUpperCase()}${spaced.slice(1)}` : id;
}

/** The first sentence of a text (up to the first `.`, `!` or `?` followed by a space or the end). */
export function m4FirstSentence(text: string): string {
  const trimmed = text.replace(/\s+/gu, ' ').trim();
  const match = /^.*?[.!?](?=\s|$)/u.exec(trimmed);
  return match ? match[0] : trimmed;
}

/** The pages of the menu tree in reading order (hubs flattened), and the pages under each hub. */
export function m4MenuPages(menu: unknown): { order: Array<{ pageId: string; label: string }>; hubs: Map<string, string[]> } {
  const order: Array<{ pageId: string; label: string }> = [];
  const hubs = new Map<string, string[]>();
  const walk = (list: MenuNode[], ancestors: string[]) => {
    for (const node of list) {
      const id = str(node.id);
      if (!id) continue;
      const children = nodes(node.children);
      if (str(node.kind) === 'page') {
        order.push({ pageId: id, label: str(node.label) || m4HumanizeId(id) });
        for (const hub of ancestors) hubs.set(hub, [...(hubs.get(hub) ?? []), id]);
      }
      if (children.length) walk(children, str(node.kind) === 'page' ? ancestors : [...ancestors, id]);
    }
  };
  walk(nodes((menu as { tree?: unknown } | null)?.tree), []);
  return { order, hubs };
}

/** pageId → actors, from menu.json `authorities` (`actor:<id>` → page or hub ids). */
export function m4MenuActors(menu: unknown, hubs: Map<string, string[]>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const authorities = (menu as { authorities?: unknown } | null)?.authorities;
  if (!authorities || typeof authorities !== 'object') return out;
  for (const [key, ids] of Object.entries(authorities as Record<string, unknown>)) {
    const actor = key.startsWith('actor:') ? key.slice('actor:'.length) : key;
    if (!actor || !Array.isArray(ids)) continue;
    for (const id of ids.map(str).filter(Boolean)) {
      for (const pageId of hubs.get(id) ?? [id]) {
        const list = out.get(pageId) ?? [];
        if (!list.includes(actor)) out.set(pageId, [...list, actor]);
      }
    }
  }
  return out;
}

/** actor → its pages in the order of its authorities list (a hub gives its children in menu order). */
export function m4MenuFirstPages(menu: unknown, hubs: Map<string, string[]>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const authorities = (menu as { authorities?: unknown } | null)?.authorities;
  if (!authorities || typeof authorities !== 'object') return out;
  for (const [key, ids] of Object.entries(authorities as Record<string, unknown>)) {
    const actor = key.startsWith('actor:') ? key.slice('actor:'.length) : key;
    if (actor && Array.isArray(ids)) out.set(actor, ids.map(str).filter(Boolean).flatMap(id => hubs.get(id) ?? [id]));
  }
  return out;
}

/** The new module entry and the keys that changed. `current` is never mutated. */
export function composeM4ModuleEntry(sources: M4FinalizeSources, current?: Record<string, unknown>): M4FinalizeResult {
  const { module, project } = sources;
  const basePath = `/${module}`;
  const { order, hubs } = m4MenuPages(sources.menu);
  const menuActors = m4MenuActors(sources.menu, hubs);
  const approved = new Map(sources.pages.map(page => [page.pageId, page]));
  const currentNav = Array.isArray(current?.navigation) ? current.navigation as M4NavigationItem[] : [];
  const currentFrontendPages = (() => {
    const frontend = current?.frontend && typeof current.frontend === 'object' ? current.frontend as Record<string, unknown> : {};
    return Array.isArray(frontend.pages) ? frontend.pages as Array<Record<string, unknown>> : [];
  })();
  const planned = [
    ...order.filter(item => approved.has(item.pageId)),
    ...sources.pages.filter(page => !order.some(item => item.pageId === page.pageId)).map(page => ({ pageId: page.pageId, label: m4HumanizeId(page.pageId) })),
  ];
  const composeApproved = (pageId: string, label: string): M4NavigationItem => {
    const page = approved.get(pageId)!;
    const actors = menuActors.get(pageId) ?? [...page.sharedActors];
    return { id: pageId, label, href: `${basePath}/${pageId}`, description: m4FirstSentence(page.intent), actors };
  };
  const frontendPage = (item: M4NavigationItem) => ({
    pageId: item.id,
    route: item.href,
    source: `l2/${module}/web/desktop/page11/${item.id}.ts`,
    definition: `l2/${module}/web/desktop/page11/${item.id}.defs.ts`,
    componentTag: m4PageTag(project, module, 'desktop', item.id),
    title: item.label,
    actors: item.actors,
  });

  let navigation: M4NavigationItem[];
  let landings: Array<{ actorId: string; pageId: string; route: string }>;
  let pages: Array<Record<string, unknown>>;
  let navigationAdded: string[];
  let navigationKept: number;

  if (current) {
    const keptNav = currentNav.map(item => structuredClone(item));
    const keptIds = new Set(keptNav.flatMap(item => (item && typeof item.id === 'string' ? [item.id] : [])));
    const addedNav = planned.filter(item => !keptIds.has(item.pageId)).map(item => composeApproved(item.pageId, item.label));
    navigation = [...keptNav, ...addedNav];
    navigationAdded = addedNav.map(item => item.id);
    navigationKept = keptNav.length;
    const currentLandings = Array.isArray(current.landings) ? current.landings as Array<{ actorId: string; pageId: string; route: string }> : [];
    landings = currentLandings.map(landing => structuredClone(landing));
    // A new actor lands the way the first generation would. An actor that already has a landing keeps it,
    // and the landing flag of an existing navigation item is not touched.
    const firstByActor = m4MenuFirstPages(sources.menu, hubs);
    const landed = new Set(landings.map(landing => landing.actorId));
    const addedIds = new Set(navigationAdded);
    for (const item of addedNav) {
      for (const actor of item.actors) {
        if (landed.has(actor)) continue;
        const preferred = firstByActor.get(actor)?.find(pageId => navigation.some(other => other.id === pageId && other.actors.includes(actor)));
        const target = navigation.find(other => other.id === (preferred ?? item.id))!;
        landings.push({ actorId: actor, pageId: target.id, route: target.href });
        if (addedIds.has(target.id)) target.landing = true;
        landed.add(actor);
      }
    }
    const keptPages = currentFrontendPages.map(item => structuredClone(item));
    const have = new Set(keptPages.map(item => String(item.pageId)));
    pages = [...keptPages];
    for (const item of addedNav) {
      if (have.has(item.id)) continue;
      pages.push(frontendPage(item));
      have.add(item.id);
    }
  } else {
    navigation = planned.map(({ pageId, label }) => composeApproved(pageId, label));
    // The landing of an actor is the first page of ITS authorities list in menu.json (the planner's order for that actor);
    // an actor the menu does not list lands on its first page in menu order. tarefas (16/10/2026): by menu order alone the
    // gestor would land on meus_avisos, which sits in the membro hub before "Painel da equipe".
    const firstByActor = m4MenuFirstPages(sources.menu, hubs);
    landings = [];
    for (const item of navigation) {
      if (!approved.has(item.id)) continue;
      for (const actor of item.actors) {
        if (landings.some(landing => landing.actorId === actor)) continue;
        const preferred = firstByActor.get(actor)?.find(pageId => navigation.some(other => other.id === pageId && other.actors.includes(actor)));
        const target = navigation.find(other => other.id === (preferred ?? item.id))!;
        landings.push({ actorId: actor, pageId: target.id, route: target.href });
        target.landing = true;
      }
    }
    pages = navigation.map(item => frontendPage(item));
    navigationAdded = navigation.map(item => item.id);
    navigationKept = 0;
  }

  const before = current ?? {};
  const entry: Record<string, unknown> = current ? structuredClone(current) : { moduleId: module };
  const currentFrontend = before.frontend && typeof before.frontend === 'object' ? before.frontend as Record<string, unknown> : {};
  const frontend: Record<string, unknown> = { ...currentFrontend, layer: 'l2', pages };
  const writes: Record<string, unknown> = {
    moduleId: module,
    shellMode: before.shellMode === 'pwa' ? 'pwa' : 'spa',
    basePath,
    ...(sources.userLanguage ? { userLanguage: sources.userLanguage } : {}),
    ...(sources.productLanguages.length ? { languages: [...sources.productLanguages] } : {}),
    navigation: navigation.map(item => ({ ...item, actors: [...(item.actors ?? [])] })),
    landings,
    frontend,
  };
  const changes: string[] = [];
  for (const [key, value] of Object.entries(writes)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(value)) changes.push(key);
    entry[key] = value;
  }
  if (!('headerLinks' in entry)) {
    entry.headerLinks = [];
    changes.push('headerLinks');
  }
  return { entry, changes, navigation, navigationAdded, navigationKept };
}
