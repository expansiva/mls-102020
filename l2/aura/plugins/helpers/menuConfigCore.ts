/// <mls fileReference="_102020_/l2/aura/plugins/helpers/menuConfigCore.ts" enhancement="_blank"/>

// Pure core of the menu editor (pluginMenuEditor): reads the menu of ONE module entry of `l5/config.json`
// and edits it. No DOM and no mls calls, so every rule is testable in node; the widget only renders and
// does the I/O (configIo.ts). TASK-102020-config-menu-editor.
//
// The config is the source of truth of the menu (decided 30/10/2026). The same data sits in three places of
// the module entry, and each edit keeps them in agreement:
//   * `navigation[]`     — the aside menu, in its order: label, description, href, actors (visibility filter);
//   * `frontend.pages[]` — the routes: `title` is the route title; the FIRST page also answers `/<module>`;
//   * `landings[]`       — start page per actor (+ the `landing` flag of the navigation item). Not read by the
//                          shell nor the server today; kept coherent for when they are.
//
// Every edit is `entry → entry` and touches only the item it edits: an item nobody touched stays byte-equal,
// so an inconsistency that already exists changes only through its own `fixMenuIssue`. The one exception is
// the `landing` flag: an edit that changes `landings` recomputes it on every item. Unknown keys are kept.

import { visibleNavigation } from '/_102033_/l2/shared/navigationVisibility.js';

export type ModuleEntry = Record<string, unknown>;

interface NavItem { id: string; label: string; href: string; description?: string; actors?: string[]; landing?: boolean; [key: string]: unknown }
interface PageItem { pageId: string; route: string; title?: string; actors?: string[]; [key: string]: unknown }
interface Landing { actorId: string; pageId: string; route: string; [key: string]: unknown }

export interface MenuRow {
  pageId: string;
  label: string;
  description: string;
  actors: string[];
  route: string;
  /** Actors whose start page (`landings`) is this page. */
  landingOf: string[];
}

export type MenuIssueCode =
  | 'nav-without-page'
  | 'title-differs'
  | 'href-differs'
  | 'actors-differ'
  | 'landing-orphan'
  | 'landing-flag-differs';

export interface MenuIssue { code: MenuIssueCode; pageId: string; actorId?: string }

export interface ModuleMenuView {
  /** Pages in the menu, in menu order. A navigation item without a page is an issue, not a row. */
  rows: MenuRow[];
  /** Pages with a route but out of the menu, in `frontend.pages` order. */
  hidden: Array<{ pageId: string; title: string; route: string }>;
  /** The possible actors: the ones already in the entry (decided 30/10/2026: access.defs.ts is not read). */
  actors: string[];
  /** The page that also answers `/<module>`: the first of `frontend.pages`. */
  homePageId: string;
  issues: MenuIssue[];
}

/** An edit either applies or is refused with the reason (the entry comes back unchanged). */
export interface MenuEditResult { entry: ModuleEntry; refused?: string }

// ─── small helpers ───────────────────────────────────────────────────────────

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every(item => b.includes(item));

function navOf(entry: ModuleEntry): NavItem[] {
  return (Array.isArray(entry.navigation) ? entry.navigation : []).filter(isRecord) as NavItem[];
}
function pagesOf(entry: ModuleEntry): PageItem[] {
  const frontend = isRecord(entry.frontend) ? entry.frontend : {};
  return (Array.isArray(frontend.pages) ? frontend.pages : []).filter(isRecord) as PageItem[];
}
function landingsOf(entry: ModuleEntry): Landing[] {
  return (Array.isArray(entry.landings) ? entry.landings : []).filter(isRecord) as Landing[];
}

/**
 * A copy of the entry and its three lists, edited in place. A list the entry does not have comes back as a
 * detached empty array, so reading it never adds a key; showInMenu attaches `navigation` when it is missing.
 */
function draft(entry: ModuleEntry): { next: ModuleEntry; nav: NavItem[]; pages: PageItem[]; landings: Landing[] } {
  const next = clone(entry);
  const frontend = isRecord(next.frontend) ? next.frontend : {};
  return {
    next,
    nav: (Array.isArray(next.navigation) ? next.navigation : []) as NavItem[],
    pages: (Array.isArray(frontend.pages) ? frontend.pages : []) as PageItem[],
    landings: landingsOf(next),
  };
}

/** Writes `landings` back and recomputes the `landing` flag of every navigation item from it. */
function commitLandings(next: ModuleEntry, landings: Landing[]): void {
  if (landings.length || Array.isArray(next.landings)) next.landings = landings;
  const targets = new Set(landings.map(landing => landing.pageId));
  for (const item of navOf(next)) {
    if (targets.has(item.id)) item.landing = true;
    else delete item.landing;
  }
}

// ─── reading ─────────────────────────────────────────────────────────────────

export function readModuleMenu(entry: ModuleEntry): ModuleMenuView {
  const nav = navOf(entry);
  const pages = pagesOf(entry);
  const landings = landingsOf(entry);
  const pageById = new Map(pages.map(page => [page.pageId, page]));
  const navIds = new Set(nav.map(item => item.id));

  const actors: string[] = [];
  const addActor = (actor: string) => { if (actor && !actors.includes(actor)) actors.push(actor); };
  nav.forEach(item => strings(item.actors).forEach(addActor));
  pages.forEach(page => strings(page.actors).forEach(addActor));
  landings.forEach(landing => addActor(str(landing.actorId)));

  const issues: MenuIssue[] = [];
  const rows: MenuRow[] = [];
  for (const item of nav) {
    const page = pageById.get(item.id);
    if (!page) { issues.push({ code: 'nav-without-page', pageId: item.id }); continue; }
    const itemActors = strings(item.actors);
    if (str(page.title) && str(page.title) !== str(item.label)) issues.push({ code: 'title-differs', pageId: item.id });
    if (str(item.href) !== str(page.route)) issues.push({ code: 'href-differs', pageId: item.id });
    if (!sameSet(itemActors, strings(page.actors))) issues.push({ code: 'actors-differ', pageId: item.id });
    const landingOf = landings.filter(landing => landing.pageId === item.id).map(landing => str(landing.actorId));
    if (Boolean(item.landing) !== landingOf.length > 0) issues.push({ code: 'landing-flag-differs', pageId: item.id });
    rows.push({ pageId: item.id, label: str(item.label), description: str(item.description), actors: itemActors, route: str(page.route), landingOf });
  }
  for (const landing of landings) {
    const item = nav.find(navItem => navItem.id === landing.pageId);
    const sees = item && pageById.has(item.id) && (strings(item.actors).length === 0 || strings(item.actors).includes(str(landing.actorId)));
    if (!sees) issues.push({ code: 'landing-orphan', pageId: str(landing.pageId), actorId: str(landing.actorId) });
  }
  const hidden = pages.filter(page => !navIds.has(page.pageId))
    .map(page => ({ pageId: page.pageId, title: str(page.title) || page.pageId, route: str(page.route) }));
  return { rows, hidden, actors, homePageId: pages[0]?.pageId ?? '', issues };
}

/** The navigation the aside would show to one actor: the shell's own filter (102033 navigationVisibility). */
export function previewForActor(entry: ModuleEntry, moduleId: string, actor: string): Array<{ id: string; label: string; landing: boolean }> {
  const visible = visibleNavigation(navOf(entry), [`${moduleId}:${actor}`], moduleId);
  const landing = landingsOf(entry).find(item => item.actorId === actor)?.pageId;
  return visible.map(item => ({ id: item.id, label: str(item.label), landing: item.id === landing }));
}

/** Only the menu fields of the entry: two entries with the same fingerprint have the same menu. */
export function moduleMenuFingerprint(entry: ModuleEntry | undefined): string {
  if (!entry) return '';
  return JSON.stringify({ navigation: entry.navigation ?? null, landings: entry.landings ?? null, pages: pagesOf(entry) });
}

// ─── edits ───────────────────────────────────────────────────────────────────

export function setMenuLabel(entry: ModuleEntry, pageId: string, label: string): MenuEditResult {
  const text = label.trim();
  if (!text) return { entry, refused: 'empty-label' };
  const { next, nav, pages } = draft(entry);
  const item = nav.find(navItem => navItem.id === pageId);
  if (!item) return { entry, refused: 'not-in-menu' };
  item.label = text;
  const page = pages.find(pageItem => pageItem.pageId === pageId);
  if (page) page.title = text;
  return { entry: next };
}

export function setMenuDescription(entry: ModuleEntry, pageId: string, description: string): MenuEditResult {
  const { next, nav } = draft(entry);
  const item = nav.find(navItem => navItem.id === pageId);
  if (!item) return { entry, refused: 'not-in-menu' };
  const text = description.trim();
  if (text) item.description = text;
  else delete item.description;
  return { entry: next };
}

/** Moves a menu item to `toIndex` of the menu rows. Only `navigation` changes: `/<module>` is setHomePage's. */
export function moveMenuItem(entry: ModuleEntry, pageId: string, toIndex: number): MenuEditResult {
  const { next, nav } = draft(entry);
  const from = nav.findIndex(item => item.id === pageId);
  if (from < 0) return { entry, refused: 'not-in-menu' };
  const [item] = nav.splice(from, 1);
  nav.splice(Math.max(0, Math.min(toIndex, nav.length)), 0, item);
  return { entry: next };
}

/**
 * Gives or takes one actor of a page, in `navigation` and `frontend.pages` together. Taking the last one is
 * refused: an empty list means "everybody" to the shell, which is not what unticking means. Taking an actor
 * also drops its landing on that page.
 */
export function setMenuActor(entry: ModuleEntry, pageId: string, actor: string, on: boolean): MenuEditResult {
  const { next, nav, pages, landings } = draft(entry);
  const item = nav.find(navItem => navItem.id === pageId);
  if (!item) return { entry, refused: 'not-in-menu' };
  const current = strings(item.actors);
  if (on === current.includes(actor)) return { entry };
  const actors = on ? [...current, actor] : current.filter(value => value !== actor);
  if (!actors.length) return { entry, refused: 'last-actor' };
  item.actors = actors;
  const page = pages.find(pageItem => pageItem.pageId === pageId);
  if (page) page.actors = [...actors];
  if (!on && landings.some(landing => landing.actorId === actor && landing.pageId === pageId)) {
    commitLandings(next, landings.filter(landing => !(landing.actorId === actor && landing.pageId === pageId)));
  }
  return { entry: next };
}

/** Takes a page out of the menu. Its route stays in `frontend.pages`; the landings on it go. */
export function hideFromMenu(entry: ModuleEntry, pageId: string): MenuEditResult {
  const { next, nav, landings } = draft(entry);
  const index = nav.findIndex(item => item.id === pageId);
  if (index < 0) return { entry, refused: 'not-in-menu' };
  nav.splice(index, 1);
  if (landings.some(landing => landing.pageId === pageId)) commitLandings(next, landings.filter(landing => landing.pageId !== pageId));
  return { entry: next };
}

/** Puts a routed page back in the menu, at the end, built from its `frontend.pages` entry. */
export function showInMenu(entry: ModuleEntry, pageId: string): MenuEditResult {
  const { next, nav, pages } = draft(entry);
  if (nav.some(item => item.id === pageId)) return { entry, refused: 'already-in-menu' };
  const page = pages.find(pageItem => pageItem.pageId === pageId);
  if (!page) return { entry, refused: 'no-page' };
  const item: NavItem = { id: pageId, label: str(page.title) || pageId, href: str(page.route) };
  if (strings(page.actors).length) item.actors = strings(page.actors);
  nav.push(item);
  if (!Array.isArray(next.navigation)) next.navigation = nav;
  return { entry: next };
}

/** Moves the page to the head of `frontend.pages`, which makes it answer `/<module>`. Nothing else moves. */
export function setHomePage(entry: ModuleEntry, pageId: string): MenuEditResult {
  const { next, pages } = draft(entry);
  const index = pages.findIndex(page => page.pageId === pageId);
  if (index < 0) return { entry, refused: 'no-page' };
  if (index === 0) return { entry };
  const [page] = pages.splice(index, 1);
  pages.unshift(page);
  return { entry: next };
}

/** Sets (or clears, with `pageId` null) the start page of an actor. The page must be in the menu and seen by the actor. */
export function setLanding(entry: ModuleEntry, actor: string, pageId: string | null): MenuEditResult {
  const { next, nav, pages, landings } = draft(entry);
  const rest = landings.filter(landing => landing.actorId !== actor);
  if (pageId === null) {
    if (rest.length === landings.length) return { entry };
    commitLandings(next, rest);
    return { entry: next };
  }
  const item = nav.find(navItem => navItem.id === pageId);
  if (!item) return { entry, refused: 'not-in-menu' };
  const itemActors = strings(item.actors);
  if (itemActors.length && !itemActors.includes(actor)) return { entry, refused: 'actor-does-not-see' };
  const route = str(pages.find(page => page.pageId === pageId)?.route) || str(item.href);
  const index = landings.findIndex(landing => landing.actorId === actor);
  const updated = index >= 0
    ? landings.map((landing, at) => (at === index ? { ...landing, pageId, route } : landing))
    : [...landings, { actorId: actor, pageId, route }];
  commitLandings(next, updated);
  return { entry: next };
}

/** Fixes one issue of readModuleMenu. The menu (`navigation`) wins over the copies. */
export function fixMenuIssue(entry: ModuleEntry, issue: MenuIssue): MenuEditResult {
  const { next, nav, pages, landings } = draft(entry);
  const item = nav.find(navItem => navItem.id === issue.pageId);
  const page = pages.find(pageItem => pageItem.pageId === issue.pageId);
  switch (issue.code) {
    case 'nav-without-page': {
      if (!item) return { entry };
      nav.splice(nav.indexOf(item), 1);
      if (landings.some(landing => landing.pageId === issue.pageId)) commitLandings(next, landings.filter(landing => landing.pageId !== issue.pageId));
      return { entry: next };
    }
    case 'title-differs':
      if (!item || !page) return { entry };
      page.title = item.label;
      return { entry: next };
    case 'href-differs':
      if (!item || !page) return { entry };
      item.href = page.route;
      return { entry: next };
    case 'actors-differ':
      if (!item || !page) return { entry };
      if (strings(item.actors).length) page.actors = [...strings(item.actors)];
      else delete page.actors;
      return { entry: next };
    case 'landing-orphan':
      commitLandings(next, landings.filter(landing => !(landing.pageId === issue.pageId && landing.actorId === issue.actorId)));
      return { entry: next };
    case 'landing-flag-differs':
      commitLandings(next, landings);
      return { entry: next };
    default:
      return { entry };
  }
}

// ─── the config document ─────────────────────────────────────────────────────

function modulesOf(config: unknown, projectId: number): unknown[] | undefined {
  if (!isRecord(config) || !isRecord(config.projects)) return undefined;
  const project = config.projects[String(projectId)];
  return isRecord(project) && Array.isArray(project.modules) ? project.modules : undefined;
}

/** The entry `projects[<projectId>].modules[moduleId]` of `l5/config.json`, or undefined. */
export function findModuleEntry(config: unknown, projectId: number, moduleId: string): ModuleEntry | undefined {
  return modulesOf(config, projectId)?.find((item): item is ModuleEntry => isRecord(item) && item.moduleId === moduleId);
}

/**
 * The config with the menu fields of one module replaced by the edited entry's: `navigation`, `landings` and
 * `frontend.pages`. Every other key of the (freshly read) config is kept, including the other keys of that
 * module entry and of its `frontend`. `config` is never mutated.
 */
export function replaceModuleMenu(config: unknown, projectId: number, moduleId: string, edited: ModuleEntry): unknown {
  const next = clone(config);
  const target = findModuleEntry(next, projectId, moduleId);
  if (!target) throw new Error(`MENU_MODULE_MISSING: projects["${projectId}"].modules has no "${moduleId}".`);
  if ('navigation' in edited) target.navigation = clone(edited.navigation);
  if ('landings' in edited) target.landings = clone(edited.landings);
  else delete target.landings;
  const editedFrontend = isRecord(edited.frontend) ? edited.frontend : undefined;
  if (editedFrontend && 'pages' in editedFrontend) {
    target.frontend = { ...(isRecord(target.frontend) ? target.frontend : {}), pages: clone(editedFrontend.pages) };
  }
  return next;
}
