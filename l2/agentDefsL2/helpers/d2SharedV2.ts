/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2SharedV2.ts" enhancement="_blank"/>

import { buildD2Page11Definition, type D2Page11Location } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2DerivedPageRequests } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2PageRequestsMenu, D2PageRequestsNeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';

export interface D2SharedV2Request {
  kind: 'qry' | 'cmd';
  trigger: string;
  writes?: string;
  returns: string[];
}
export interface D2SharedV2State { source: string; description: string }
export interface D2SharedV2Function {
  calls?: string;
  sets?: string;
  updates?: string[];
  navigate?: string;
  carries?: Record<string, string>;
  description: string;
}
export interface D2SharedV2Journey { step: string; organisms: string[]; functions: string[]; continuesIn?: string }
export interface D2SharedV2Definition {
  entry: { params: Record<string, { type: string; sources: string[]; effect: string; persist: boolean }> };
  forms: Record<string, { organism: string; submit: string }>;
  requests: Record<string, D2SharedV2Request>;
  states: Record<string, D2SharedV2State>;
  functions: Record<string, D2SharedV2Function>;
  journeys: D2SharedV2Journey[];
  rules: Record<string, string[]>;
  access: { actors: string[]; grants: string[] };
}

export interface D2SharedV2Issue { code: string; path: string; message: string }

export function sharedFromDerived(derived: D2DerivedPageRequests, extras?: Partial<D2SharedV2Definition>): D2SharedV2Definition {
  const requests: D2SharedV2Definition['requests'] = {};
  for (const request of derived.requests) {
    requests[request.id] = {
      kind: request.kind,
      trigger: request.trigger,
      ...(request.writes ? { writes: request.writes } : {}),
      returns: request.returns,
    };
  }
  const functions: D2SharedV2Definition['functions'] = { ...(extras?.functions ?? {}) };
  functions.load = functions.load ?? { calls: 'load', description: extras?.functions?.load?.description ?? '' };
  for (const request of derived.requests) {
    for (const list of request.lists) {
      functions[list.filter] = functions[list.filter] ?? { calls: request.id, description: '' };
      functions[list.loadMore] = functions[list.loadMore] ?? { calls: request.id, description: '' };
    }
  }
  for (const request of derived.requests.filter(item => item.kind === 'cmd')) {
    functions[request.id] = functions[request.id] ?? { calls: request.id, updates: request.returns, description: '' };
  }
  const forms: D2SharedV2Definition['forms'] = {};
  for (const [id, form] of Object.entries(derived.forms)) forms[id] = { organism: form.organism, submit: form.submit };
  return {
    entry: derived.entry,
    forms,
    requests,
    states: extras?.states ?? {},
    functions,
    journeys: extras?.journeys ?? [],
    rules: derived.rules,
    access: { actors: derived.access.actors, grants: derived.access.grants },
  };
}

export function buildD2SharedV2(value: unknown): D2SharedV2Definition {
  const root = exact(value, ['entry', 'forms', 'requests', 'states', 'functions', 'journeys', 'rules', 'access'], 'D2_SHARED_V2_KEYS');
  const entryRow = exact(root.entry, ['params'], 'D2_SHARED_V2_ENTRY');
  const paramsRaw = object(entryRow.params, 'D2_SHARED_V2_PARAMS');
  const params: D2SharedV2Definition['entry']['params'] = {};
  for (const [id, raw] of Object.entries(paramsRaw)) {
    const row = exact(raw, ['type', 'sources', 'effect', 'persist'], `D2_SHARED_V2_PARAM: ${id}`);
    if (typeof row.type !== 'string' || typeof row.effect !== 'string' || typeof row.persist !== 'boolean') throw new Error(`D2_SHARED_V2_PARAM: ${id}`);
    if (!Array.isArray(row.sources) || !row.sources.every(item => item === 'url' || item === 'localStorage')) throw new Error(`D2_SHARED_V2_PARAM_SOURCES: ${id}`);
    params[id] = { type: row.type, sources: row.sources as string[], effect: row.effect, persist: row.persist };
  }
  const forms: D2SharedV2Definition['forms'] = {};
  for (const [id, raw] of Object.entries(object(root.forms, 'D2_SHARED_V2_FORMS'))) {
    const row = exact(raw, ['organism', 'submit'], `D2_SHARED_V2_FORM: ${id}`);
    if (typeof row.organism !== 'string' || typeof row.submit !== 'string') throw new Error(`D2_SHARED_V2_FORM: ${id}`);
    forms[id] = { organism: row.organism, submit: row.submit };
  }
  const requests: D2SharedV2Definition['requests'] = {};
  for (const [id, raw] of Object.entries(object(root.requests, 'D2_SHARED_V2_REQUESTS'))) {
    const row = object(raw, `D2_SHARED_V2_REQUEST: ${id}`);
    if (row.kind !== 'qry' && row.kind !== 'cmd') throw new Error(`D2_SHARED_V2_REQUEST_KIND: ${id}`);
    if (typeof row.trigger !== 'string' || !Array.isArray(row.returns) || !row.returns.every(item => typeof item === 'string')) throw new Error(`D2_SHARED_V2_REQUEST: ${id}`);
    if (row.kind === 'cmd' && typeof row.writes !== 'string') throw new Error(`D2_SHARED_V2_REQUEST_WRITES: ${id}`);
    requests[id] = { kind: row.kind, trigger: row.trigger, returns: row.returns as string[], ...(typeof row.writes === 'string' ? { writes: row.writes } : {}) };
  }
  const states: D2SharedV2Definition['states'] = {};
  for (const [id, raw] of Object.entries(object(root.states, 'D2_SHARED_V2_STATES'))) {
    const row = exact(raw, ['source', 'description'], `D2_SHARED_V2_STATE: ${id}`);
    if (typeof row.source !== 'string' || typeof row.description !== 'string') throw new Error(`D2_SHARED_V2_STATE: ${id}`);
    states[id] = { source: row.source, description: row.description };
  }
  const functions: D2SharedV2Definition['functions'] = {};
  for (const [id, raw] of Object.entries(object(root.functions, 'D2_SHARED_V2_FUNCTIONS'))) {
    const row = object(raw, `D2_SHARED_V2_FUNCTION: ${id}`);
    if (typeof row.description !== 'string') throw new Error(`D2_SHARED_V2_FUNCTION: ${id}`);
    functions[id] = {
      description: row.description,
      ...(typeof row.calls === 'string' ? { calls: row.calls } : {}),
      ...(typeof row.sets === 'string' ? { sets: row.sets } : {}),
      ...(Array.isArray(row.updates) ? { updates: row.updates as string[] } : {}),
      ...(typeof row.navigate === 'string' ? { navigate: row.navigate } : {}),
      ...(row.carries && typeof row.carries === 'object' && !Array.isArray(row.carries) ? { carries: row.carries as Record<string, string> } : {}),
    };
  }
  if (!Array.isArray(root.journeys)) throw new Error('D2_SHARED_V2_JOURNEYS');
  const journeys = root.journeys.map((raw, index) => {
    const row = object(raw, `D2_SHARED_V2_JOURNEY: ${index}`);
    if (typeof row.step !== 'string' || !Array.isArray(row.organisms) || !Array.isArray(row.functions)) throw new Error(`D2_SHARED_V2_JOURNEY: ${index}`);
    return { step: row.step, organisms: row.organisms as string[], functions: row.functions as string[], ...(typeof row.continuesIn === 'string' ? { continuesIn: row.continuesIn } : {}) };
  });
  const rules: Record<string, string[]> = {};
  for (const [id, raw] of Object.entries(object(root.rules, 'D2_SHARED_V2_RULES'))) {
    if (!Array.isArray(raw) || !raw.every(item => typeof item === 'string')) throw new Error(`D2_SHARED_V2_RULES: ${id}`);
    rules[id] = raw as string[];
  }
  const access = exact(root.access, ['actors', 'grants'], 'D2_SHARED_V2_ACCESS');
  if (!Array.isArray(access.actors) || !Array.isArray(access.grants)) throw new Error('D2_SHARED_V2_ACCESS');
  return { entry: { params }, forms, requests, states, functions, journeys, rules, access: { actors: access.actors as string[], grants: access.grants as string[] } };
}

export function d2SharedV2Path(location: Omit<D2Page11Location, 'device'>): string {
  return `_${location.project}_/l2/${location.module}/web/shared/${location.pageId}.defs.ts`;
}

export function renderD2SharedV2(location: Omit<D2Page11Location, 'device'>, value: unknown): string {
  const definition = buildD2SharedV2(value);
  return `/// <mls fileReference="${d2SharedV2Path(location)}" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

export function parseD2SharedV2(source: string): { location: Omit<D2Page11Location, 'device'>; definition: D2SharedV2Definition } {
  const match = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/shared\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\n\nexport const definition = ([\s\S]+) as const;\n$/u.exec(source);
  if (!match) throw new Error('D2_SHARED_V2_SOURCE_SHAPE');
  let parsed: unknown;
  try { parsed = JSON.parse(match[4]); } catch { throw new Error('D2_SHARED_V2_SOURCE_JSON'); }
  return { location: { project: Number(match[1]), module: match[2], pageId: match[3] }, definition: buildD2SharedV2(parsed) };
}

export function gateD2SharedV2(
  value: unknown,
  context: { page11: unknown; draft: D2Page11Needs; needs: D2PageRequestsNeedPage; menu: D2PageRequestsMenu; derived: D2DerivedPageRequests },
): D2SharedV2Issue[] {
  const issues: D2SharedV2Issue[] = [];
  let definition: D2SharedV2Definition;
  try { definition = buildD2SharedV2(value); } catch (error) { return [{ code: 'D2_SHARED_V2_FORMAT', path: 'definition', message: String(error) }]; }
  const page = buildD2Page11Definition(context.page11);
  const journeySteps = new Set((context.needs.reads ?? []).flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length))));
  const menuJourneys = context.menu.meta?.journeys ?? {};
  const pageJourneys = new Set(Object.entries(menuJourneys).filter(([, pages]) => pages.includes(context.needs.pageId)).map(([id]) => id));
  for (const step of journeySteps) {
    const journeyId = step.split('/')[0];
    if (!pageJourneys.has(journeyId)) issues.push({ code: 'D2_SHARED_V2_JOURNEY_OUTSIDE', path: 'journeys', message: `Step ${step} is not linked to this page in the menu.` });
    const hit = definition.journeys.some(item => item.step === step && (item.organisms.length || item.continuesIn));
    if (!hit) issues.push({ code: 'D2_SHARED_V2_JOURNEY_UNSERVED', path: 'journeys', message: `Needs step ${step} is not served by an organism or continuesIn.` });
  }
  for (const row of definition.journeys) {
    if (!journeySteps.has(row.step)) issues.push({ code: 'D2_SHARED_V2_JOURNEY_INVENTED', path: `journeys.${row.step}`, message: `Journey step ${row.step} is not a real step for this page.` });
  }
  for (const [id, organism] of Object.entries(page.organisms)) {
    const draft = context.draft.organisms[id];
    if (draft && (draft.reads.length || draft.edits.length) && !organismBound(id, context.draft, definition, context.derived)) {
      issues.push({ code: 'D2_SHARED_V2_ORGANISM_UNBOUND', path: `organisms.${id}`, message: `Organism ${id} reads or edits and is not bound to a state.` });
    }
    for (const intent of organism.intents) {
      if (!definition.functions[intent.id] && !Object.values(definition.forms).some(form => form.submit === intent.id)) {
        issues.push({ code: 'D2_SHARED_V2_FUNCTION_MISSING', path: `functions.${intent.id}`, message: `Page intent ${intent.id} has no function.` });
      }
    }
  }
  for (const [id, state] of Object.entries(definition.states)) {
    if (!validStateSource(id, state.source, definition)) issues.push({ code: 'D2_SHARED_V2_STATE_SOURCE', path: `states.${id}`, message: `State ${id} has no valid source.` });
  }
  const pageActors = new Set(context.needs.actors);
  for (const [id, fn] of Object.entries(definition.functions)) {
    if (fn.calls && !definition.requests[fn.calls]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_CALL', path: `functions.${id}`, message: `Function ${id} calls unknown request ${fn.calls}.` });
    if (fn.sets && !definition.states[fn.sets]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_SET', path: `functions.${id}`, message: `Function ${id} sets unknown state ${fn.sets}.` });
    for (const target of fn.updates ?? []) {
      if (!definition.states[target]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_UPDATE', path: `functions.${id}.updates`, message: `Function ${id} updates unknown state ${target}.` });
    }
    if (fn.navigate && !canNavigate(context.menu, fn.navigate, pageActors)) issues.push({ code: 'D2_SHARED_V2_FUNCTION_NAVIGATE', path: `functions.${id}`, message: `Function ${id} navigates to a page the page actors cannot access.` });
  }
  const readEntities = new Set(context.needs.reads.map(item => item.entity[0].toLowerCase() + item.entity.slice(1)));
  for (const [id, request] of Object.entries(definition.requests)) {
    if (request.kind !== 'cmd') continue;
    for (const name of request.returns) {
      if (!readEntities.has(name)) issues.push({ code: 'D2_SHARED_V2_RETURNS', path: `requests.${id}.returns`, message: `Command ${id} returns ${name}, which the page does not read.` });
    }
  }
  return issues;
}

function organismBound(organismId: string, draft: D2Page11Needs, definition: D2SharedV2Definition, derived: D2DerivedPageRequests): boolean {
  const unit = draft.organisms[organismId];
  if (!unit) return false;
  const readEntities = new Set(unit.reads.map(path => path.split('.')[0]));
  const selectTarget = Object.values(draft.organisms).some(row => row.selects === organismId);
  const form = Object.values(definition.forms).find(item => item.organism === organismId)
    ?? Object.values(derived.forms).find(item => item.organism === organismId);
  const bound = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const [stateId, state] of Object.entries(definition.states)) {
      if (bound.has(stateId)) continue;
      if (!stateBindsOrganism(stateId, state.source)) continue;
      bound.add(stateId);
      grew = true;
    }
  }
  return bound.size > 0;

  function stateBindsOrganism(stateId: string, source: string): boolean {
    if (selectTarget && Object.values(definition.functions).some(item => item.sets === stateId)) return true;
    const dot = source.indexOf('.');
    if (dot > 0) {
      const requestId = source.slice(0, dot);
      const tail = source.slice(dot + 1);
      const request = definition.requests[requestId];
      const derivedRequest = derived.requests.find(item => item.id === requestId);
      if (request?.kind === 'cmd' && tail === 'input' && form?.submit === requestId) return true;
      const entity = derivedRequest?.returnEntities[tail];
      return Boolean(request && derivedRequest?.organisms.includes(organismId) && request.returns.includes(tail) && entity && readEntities.has(entity));
    }
    return bound.has(source);
  }
}

function validStateSource(stateId: string, source: string, definition: D2SharedV2Definition): boolean {
  const dot = source.indexOf('.');
  if (dot > 0) {
    const requestId = source.slice(0, dot);
    const tail = source.slice(dot + 1);
    const request = definition.requests[requestId];
    if (!request || !tail || tail.includes('.')) return false;
    if (tail === 'input') return request.kind === 'cmd';
    return request.returns.includes(tail);
  }
  if (definition.states[source]) return true;
  return definition.functions[source]?.sets === stateId;
}

function canNavigate(menu: D2PageRequestsMenu, pageId: string, pageActors: Set<string>): boolean {
  const path = menuPath(menu.tree, pageId, []);
  if (!path) return false;
  for (const [actor, refs] of Object.entries(menu.authorities ?? {})) {
    if (!refs.some(ref => path.includes(ref))) continue;
    if (pageActors.has(actor.replace(/^actor:/u, ''))) return true;
  }
  return false;
}

function menuPath(nodes: D2PageRequestsMenu['tree'], pageId: string, ancestors: string[]): string[] | null {
  for (const node of nodes) {
    const path = [...ancestors, node.id];
    if (node.kind === 'page' && node.id === pageId) return path;
    const child = menuPath(node.children ?? [], pageId, path);
    if (child) return child;
  }
  return null;
}
function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
function exact(value: unknown, allowed: readonly string[], code: string): Record<string, unknown> {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of allowed) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
  return row;
}
