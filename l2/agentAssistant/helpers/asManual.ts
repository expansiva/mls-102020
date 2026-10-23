/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asManual.ts" enhancement="_blank"/>

// The app's user manual, read from its defs only (pure; the stor IO is in asStor):
//   l4 module.defs      module title
//   l4 access.defs      actors (who) and their descriptions
//   l4 rules.defs       business rules, already written as sentences
//   l4 journeys/*.defs  how-to: actor, goal, ordered steps, outcome and its evidence
//   l4 pool/l2/web/menu.json   screens as the menu shows them (labels, hubs, what each screen does,
//                              which actors see it)
//   l2 web/desktop/*/<page>.defs  how a screen is organized (intent, sections, organisms)
//   l1 controllers defs        which routes each screen calls
// Links are by data, never by name: a journey step that acts (`create`, `update` or a transition)
// reaches the command whose contract `writes` `<Entity>.<operation>` (catalog), and that command's
// route belongs to one screen (controllers defs).

import type { AsCatalog, AsCommand, AsManualSelection } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { asArray, asRecord, asString } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { extractExportedObject } from '/_102020_/l2/agentAssistant/helpers/asSource.js';

export interface AsManualSources {
  module: string;
  moduleDef: string;
  access: string;
  rules: string;
  journeys: string[];
  menuJson: string;
  pageDefs: Array<{ pageId: string; text: string }>;
  controllers: string[];
}

export interface AsManualActor {
  id: string;
  title: string;
  description: string;
}

export interface AsManualPage {
  module: string;
  pageId: string;
  label: string;
  hub: string;
  texts: string[];
  actors: string[];
  intent: string;
  sections: string[];
  routes: string[];
}

export interface AsManualStep {
  title: string;
  description: string;
  kind: string;
  entity: string;
  effect: string;           // create | update | transition
  transitionRef: string;
}

export interface AsManualJourney {
  module: string;
  journeyId: string;
  title: string;
  actor: string;
  goal: string;
  steps: AsManualStep[];
  outcome: string;
  evidence: string[];
}

export interface AsManualModule {
  module: string;
  title: string;
  actors: AsManualActor[];
  rules: Array<{ id: string; text: string }>;
  pages: AsManualPage[];
  journeys: AsManualJourney[];
}

export interface AsManual {
  modules: AsManualModule[];
}

export function buildManual(sources: AsManualSources[]): AsManual {
  return { modules: sources.map(readModule).filter((item): item is AsManualModule => !!item) };
}

function readModule(sources: AsManualSources): AsManualModule | null {
  const moduleDef = asRecord(extractExportedObject(sources.moduleDef));
  const access = asRecord(extractExportedObject(sources.access));
  const actors: AsManualActor[] = asArray(access.actors).map(asRecord).map(actor => ({
    id: asString(actor.actorId),
    title: asString(actor.title) || asString(actor.actorId),
    description: asString(actor.description),
  })).filter(actor => actor.id);

  const rulesRaw = asRecord(asRecord(extractExportedObject(sources.rules)).rules);
  const rules = Object.entries(rulesRaw)
    .map(([id, value]) => ({ id, text: typeof value === 'string' ? value : asString(asRecord(value).statement) || asString(asRecord(value).description) }))
    .filter(rule => rule.text);

  const journeys = sources.journeys.map(text => readJourney(sources.module, text)).filter((item): item is AsManualJourney => !!item);
  const pages = readPages(sources, actors);
  const title = asString(moduleDef.title);
  if (!title && !pages.length && !journeys.length) return null;
  return { module: sources.module, title: title || sources.module, actors, rules, pages, journeys };
}

function readJourney(module: string, text: string): AsManualJourney | null {
  const raw = asRecord(extractExportedObject(text));
  const journeyId = asString(raw.journeyId);
  const business = asRecord(raw.business);
  if (!journeyId || !asString(business.title)) return null;
  const outcome = asRecord(business.outcome);
  return {
    module,
    journeyId,
    title: asString(business.title),
    actor: asString(business.actorRef),
    goal: asString(business.goal),
    steps: asArray(business.steps).map(asRecord).map(step => ({
      title: asString(step.title),
      description: asString(step.description),
      kind: asString(step.kind),
      entity: asString(step.entity),
      effect: asString(step.effect),
      transitionRef: asString(step.transitionRef),
    })),
    outcome: asString(outcome.statement),
    evidence: asArray(outcome.evidence).map(asString).filter(Boolean),
  };
}

function readPages(sources: AsManualSources, actors: AsManualActor[]): AsManualPage[] {
  const menu = asRecord(safeJson(sources.menuJson));
  const authorities = asRecord(menu.authorities);
  const actorTitle = (actorKey: string): string => {
    const id = actorKey.replace(/^actor:/, '');
    return actors.find(actor => actor.id === id)?.title || id;
  };
  const visibleTo = (pageId: string): string[] => Object.entries(authorities)
    .filter(([, pageIds]) => asArray(pageIds).includes(pageId))
    .map(([actorKey]) => actorTitle(actorKey));

  const routesByPage = new Map<string, string[]>();
  for (const text of sources.controllers) {
    const data = asRecord(asRecord(extractExportedObject(text)).data);
    const pageId = asString(data.pageId);
    if (!pageId) continue;
    routesByPage.set(pageId, asArray(data.handlers).map(handler => asString(asRecord(handler).route)).filter(Boolean));
  }
  const defsByPage = new Map(sources.pageDefs.map(item => [item.pageId, asRecord(asRecord(extractExportedObject(item.text)).definition ?? extractExportedObject(item.text))]));

  const pages: AsManualPage[] = [];
  const walk = (nodes: unknown[], hub: string): void => {
    for (const rawNode of nodes) {
      const node = asRecord(rawNode);
      const kind = asString(node.kind);
      const id = asString(node.id);
      const label = asString(node.label) || id;
      if (kind === 'hub') {
        walk(asArray(node.children), label);
        continue;
      }
      if (kind !== 'page' || !id) continue;
      const def = defsByPage.get(id) || {};
      pages.push({
        module: sources.module,
        pageId: id,
        label,
        hub,
        texts: asArray(node.organisms).map(item => asString(asRecord(item).text)).filter(Boolean),
        actors: visibleTo(id),
        intent: asString(def.intent),
        sections: asArray(def.sections).map(section => asString(asRecord(section).purpose)).filter(Boolean),
        routes: routesByPage.get(id) || [],
      });
    }
  };
  walk(asArray(menu.tree), '');
  return pages;
}

// ---- what the interpret call sees: short, every module (with or without backend) ----

export function manualIndex(manual: AsManual): Record<string, unknown> {
  return {
    modules: manual.modules.map(item => ({ module: item.module, title: item.title })),
    pages: manual.modules.flatMap(item => item.pages.map(page => ({ module: item.module, pageId: page.pageId, label: page.hub ? `${page.hub} › ${page.label}` : page.label }))),
    journeys: manual.modules.flatMap(item => item.journeys.map(journey => ({ module: item.module, journeyId: journey.journeyId, title: journey.title, actor: actorTitleOf(item, journey.actor) }))),
  };
}

export function hasManualContent(manual: AsManual | null): manual is AsManual {
  return !!manual && manual.modules.length > 0;
}

// ---- what the answer call receives: only the chosen items, with everything they need ----

export const AS_MANUAL_CONTEXT_MAX = 20000;

export function manualContext(manual: AsManual, selection: AsManualSelection, catalog: AsCatalog | null): string {
  const empty = !selection.modules.length && !selection.pages.length && !selection.journeys.length;
  if (empty) return clip(JSON.stringify({ overview: manual.modules.map(overviewOf) }, null, 1));

  const journeys = selection.journeys
    .map(ref => findModule(manual, ref.module)?.journeys.find(item => item.journeyId === ref.journeyId))
    .filter((item): item is AsManualJourney => !!item);
  const pageKeys = new Set(selection.pages.map(ref => `${ref.module}/${ref.pageId}`));
  // a journey brings the screens where its actions happen
  for (const journey of journeys) {
    for (const page of pagesOfJourney(manual, journey, catalog)) pageKeys.add(`${page.module}/${page.pageId}`);
  }
  const moduleIds = new Set([...selection.modules, ...journeys.map(item => item.module), ...[...pageKeys].map(key => key.split('/')[0])]);

  const modules = [...moduleIds].map(id => findModule(manual, id)).filter((item): item is AsManualModule => !!item).map(module => ({
    module: module.module,
    title: module.title,
    actors: module.actors.map(actor => ({ title: actor.title, does: actor.description })),
    rules: module.rules.map(rule => rule.text),
    screens: module.pages
      .filter(page => pageKeys.has(`${page.module}/${page.pageId}`) || (selection.modules.includes(module.module) && !pageKeys.size))
      .map(page => pageDetail(module, page, catalog)),
    journeys: journeys.filter(item => item.module === module.module).map(journey => ({
      title: journey.title,
      who: actorTitleOf(module, journey.actor),
      goal: journey.goal,
      steps: journey.steps.map(step => ({ title: step.title, description: step.description })),
      whereTheActionsHappen: pagesOfJourney(manual, journey, catalog).map(page => screenName(page)),
      outcome: journey.outcome,
      youWillSee: journey.evidence,
    })),
    ...(selection.modules.includes(module.module) ? { allJourneys: module.journeys.map(item => item.title) } : {}),
  }));
  return clip(JSON.stringify({ modules }, null, 1));
}

export function pagesOfJourney(manual: AsManual, journey: AsManualJourney, catalog: AsCatalog | null): AsManualPage[] {
  const module = findModule(manual, journey.module);
  if (!module || !catalog) return [];
  const routes = new Set<string>();
  for (const step of journey.steps) {
    // the contract's `writes` uses the journey's own vocabulary: Entity.create | Entity.update | Entity.<transition>
    const operation = step.transitionRef || step.effect;
    if (!step.entity || !operation) continue;
    const writes = `${step.entity}.${operation}`;
    for (const command of catalog.commands) {
      if (command.module === journey.module && command.writes === writes) routes.add(command.route);
    }
  }
  return module.pages.filter(page => page.routes.some(route => routes.has(route)));
}

function pageDetail(module: AsManualModule, page: AsManualPage, catalog: AsCatalog | null): Record<string, unknown> {
  const commands = (catalog?.commands || []).filter(command => page.routes.includes(command.route));
  return {
    screen: screenName(page),
    whoSeesIt: page.actors,
    whatItIsFor: page.intent || page.texts.join(' '),
    parts: page.sections.length ? page.sections : page.texts,
    actions: commands.map(command => actionOf(command)),
  };
}

function actionOf(command: AsCommand): Record<string, unknown> {
  return {
    does: command.purpose,
    fields: command.inputs.filter(input => input.role !== 'version' && !(input.role === 'ref' && input.path === 'id')).map(input => ({
      field: input.label,
      required: input.required,
      ...(input.enumValues.length ? { options: input.enumValues.map(item => item.label) } : {}),
      ...(input.role === 'ref' ? { pick: input.ref } : {}),
    })),
  };
}

function overviewOf(module: AsManualModule): Record<string, unknown> {
  return {
    module: module.title,
    who: module.actors.map(actor => actor.title),
    screens: module.pages.map(page => screenName(page)),
    tasks: module.journeys.map(journey => journey.title),
  };
}

function screenName(page: AsManualPage): string {
  return page.hub ? `${page.hub} › ${page.label}` : page.label;
}

function actorTitleOf(module: AsManualModule, actorId: string): string {
  return module.actors.find(actor => actor.id === actorId)?.title || actorId;
}

function findModule(manual: AsManual, module: string): AsManualModule | undefined {
  return manual.modules.find(item => item.module === module);
}

function clip(text: string): string {
  return text.length <= AS_MANUAL_CONTEXT_MAX ? text : `${text.slice(0, AS_MANUAL_CONTEXT_MAX)}... (truncated)`;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
