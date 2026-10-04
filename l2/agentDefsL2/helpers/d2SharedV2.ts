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
  // A fixed function exists only for a derived request: a page without requests has only navigations (d2_70).
  if (derived.requests.some(request => request.id === 'load')) functions.load = functions.load ?? { calls: 'load', description: extras?.functions?.load?.description ?? '' };
  // The list state is shape: one state per list key, fed by load and replaced or extended by filter/loadMore.
  const states: D2SharedV2Definition['states'] = {};
  for (const request of derived.requests) {
    if (request.id === 'load') continue;
    for (const list of request.lists) {
      states[list.key] = { source: `load.${list.key}`, description: extras?.states?.[list.key]?.description ?? '' };
      functions[list.filter] = functions[list.filter] ?? { calls: request.id, sets: list.key, description: '' };
      functions[list.loadMore] = functions[list.loadMore] ?? { calls: request.id, sets: list.key, description: '' };
    }
  }
  for (const request of derived.requests.filter(item => item.kind === 'cmd')) {
    // Which states a command refreshes is the answer's choice; return keys are not state ids.
    functions[request.id] = functions[request.id] ?? { calls: request.id, description: '' };
  }
  const forms: D2SharedV2Definition['forms'] = {};
  for (const [id, form] of Object.entries(derived.forms)) forms[id] = { organism: form.organism, submit: form.submit };
  return {
    entry: derived.entry,
    forms,
    requests,
    states: { ...(extras?.states ?? {}), ...states },
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
  const listRequests = context.derived.requests.filter(item => item.id !== 'load' && item.lists.length > 0);
  for (const request of listRequests) {
    for (const list of request.lists) {
      for (const fnId of [list.filter, list.loadMore]) {
        const target = definition.functions[fnId]?.sets;
        if (!target || rootSource(target, definition) !== `load.${list.key}`) {
          issues.push({ code: 'D2_SHARED_V2_LIST_STATE', path: `functions.${fnId}`, message: `${fnId} must set the state whose source is load.${list.key}: ${request.id} replaces or appends to the list that load opened, never a second state.` });
        }
      }
    }
  }
  const fixedStates = sharedFromDerived(context.derived).states;
  for (const [id, fixedState] of Object.entries(fixedStates)) {
    const state = definition.states[id];
    if (!state || state.source !== fixedState.source) {
      issues.push({ code: 'D2_SHARED_V2_STATE_FIXED', path: `states.${id}`, message: `State ${id} is the fixed list state with source ${fixedState.source}; keep its id and source and only write its description.` });
    } else if (!state.description.trim()) {
      issues.push({ code: 'D2_SHARED_V2_DESCRIPTION_EMPTY', path: `states.${id}`, message: `Fixed list state ${id} already exists and needs a description.` });
    }
  }
  for (const [id, state] of Object.entries(definition.states)) {
    const repeated = Object.entries(fixedStates).find(([fixedId, fixedState]) => fixedId !== id && fixedState.source === state.source);
    if (repeated) {
      issues.push({ code: 'D2_SHARED_V2_STATE_DUPLICATE', path: `states.${id}`, message: `State ${id} repeats the fixed list state ${repeated[0]} (source ${state.source}). Use ${repeated[0]} instead of another state.` });
      continue;
    }
    if (listRequests.some(request => state.source.startsWith(`${request.id}.`))) {
      issues.push({ code: 'D2_SHARED_V2_LIST_STATE', path: `states.${id}`, message: `State ${id} has ${state.source} as source. A list request only feeds the state sourced from load; drop ${id}.` });
      continue;
    }
    if (definition.functions[state.source]?.navigate) {
      issues.push({ code: 'D2_SHARED_V2_STATE_NAVIGATE', path: `states.${id}`, message: `State ${id} has navigation ${state.source} as source. A navigation leaves the page and feeds no state; drop the state or source it from validSources.` });
      continue;
    }
    if (!validStateSource(id, state.source, definition)) issues.push({ code: 'D2_SHARED_V2_STATE_SOURCE', path: `states.${id}`, message: `State ${id} source ${JSON.stringify(state.source)} is not in validSources, is not another state id, and is not the id of a function whose sets is this state.` });
  }
  const pageActors = new Set(context.needs.actors);
  for (const [id, fn] of Object.entries(definition.functions)) {
    if (fn.calls && !definition.requests[fn.calls]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_CALL', path: `functions.${id}`, message: `Function ${id} calls unknown request ${fn.calls}.` });
    if (fn.sets && !definition.states[fn.sets]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_SET', path: `functions.${id}`, message: `Function ${id} sets ${JSON.stringify(fn.sets)}, which is not one state id. Put one state id in sets, or list several states in updates. See validSources.` });
    for (const target of fn.updates ?? []) {
      if (!definition.states[target]) issues.push({ code: 'D2_SHARED_V2_FUNCTION_UPDATE', path: `functions.${id}.updates`, message: `Function ${id} updates unknown state ${target}.` });
    }
    if (fn.navigate && !canNavigate(context.menu, fn.navigate, pageActors)) issues.push({ code: 'D2_SHARED_V2_FUNCTION_NAVIGATE', path: `functions.${id}`, message: `Function ${id} navigates to a page the page actors cannot access.` });
    if (fn.navigate && (fn.sets || fn.updates?.length)) issues.push({ code: 'D2_SHARED_V2_NAVIGATE_SETS', path: `functions.${id}`, message: `Function ${id} navigates and also sets or updates a state. A navigation only carries values to the next page.` });
    if (fn.carries && !fn.navigate) issues.push({ code: 'D2_SHARED_V2_CARRIES_OUTSIDE', path: `functions.${id}.carries`, message: `Function ${id} has carries without navigate. carries only exist on a navigation; list and filter params come from declared states.` });
    const request = fn.calls ? definition.requests[fn.calls] : undefined;
    if (request?.kind === 'cmd') {
      const returned = new Set(request.returns.map(name => returnEntity(fn.calls!, name, definition, context)).filter(Boolean));
      for (const target of [...(fn.sets ? [fn.sets] : []), ...(fn.updates ?? [])]) {
        if (!definition.states[target]) continue;
        const entity = stateType(target, definition, context).entity;
        if (!entity || !returned.has(entity)) issues.push({ code: 'D2_SHARED_V2_UPDATES_RETURNS', path: `functions.${id}.updates`, message: `Command ${fn.calls} feeds state ${target}, but its returns have no key of entity ${entity || '(none: the state holds no entity)'}. Add that entity's key to the command returns, or drop the state.` });
      }
      // A write changes the derived fields of every read entity derived through a relationship with it.
      const written = request.writes?.split('.')[0] ?? '';
      const fed = new Set([...(fn.sets ? [fn.sets] : []), ...(fn.updates ?? [])].filter(target => definition.states[target]).map(target => stateType(target, definition, context).entity));
      for (const read of context.needs.reads) {
        if (read.entity === written || !read.derived.length || !read.from.some(ref => ref.startsWith(`relationship:${written}/`))) continue;
        const holders = Object.keys(definition.states).filter(stateId => stateType(stateId, definition, context).entity === read.entity);
        if (!returned.has(read.entity) || (holders.length && !fed.has(read.entity))) {
          issues.push({ code: 'D2_SHARED_V2_RETURNS_DERIVED', path: `functions.${id}`, message: `Command ${fn.calls} writes ${written}, which changes the derived fields of ${read.entity} (${read.derived.join(', ')}). Return ${camel(read.entity)} and update a state that holds ${read.entity}.` });
        }
      }
    }
  }
  const fixed = sharedFromDerived(context.derived).functions;
  const fixedCalls = new Set(Object.values(fixed).map(item => item.calls).filter((calls): calls is string => Boolean(calls)));
  for (const [id, fn] of Object.entries(definition.functions)) {
    if (fixed[id]) {
      if (!fn.description.trim()) issues.push({ code: 'D2_SHARED_V2_DESCRIPTION_EMPTY', path: `functions.${id}`, message: `Fixed function ${id} already exists and needs a description. Reuse it instead of adding another function.` });
    } else if (fn.calls && fixedCalls.has(fn.calls)) {
      issues.push({ code: 'D2_SHARED_V2_FUNCTION_DUPLICATE', path: `functions.${id}`, message: `Function ${id} calls ${fn.calls}, which a fixed function already calls. Reuse that function and complete its description, sets and updates.` });
    } else if (!fn.calls && fn.sets && sourcesList(definition.states[fn.sets]?.source, context.derived)) {
      issues.push({ code: 'D2_SHARED_V2_FUNCTION_DUPLICATE', path: `functions.${id}`, message: `Function ${id} sets a list state and has no calls, so it does not replace filter<List>. Reuse the fixed filter function.` });
    }
    for (const [key, value] of Object.entries(fn.carries ?? {})) {
      const dot = value.indexOf('.');
      const stateId = dot > 0 ? value.slice(0, dot) : '';
      const field = dot > 0 ? value.slice(dot + 1) : '';
      if (!stateId || !field || field.includes('.') || !definition.states[stateId]) {
        issues.push({ code: 'D2_SHARED_V2_CARRIES_PATH', path: `functions.${id}.carries.${key}`, message: `Carry ${key} must be <state>.<field> for an existing state, not ${JSON.stringify(value)}.` });
        continue;
      }
      const type = stateType(stateId, definition, context);
      const readable = field === 'id' || Object.values(context.draft.organisms).some(row => [...row.reads, ...row.edits].some(path => path === `${type.entity}.${field}` || path.startsWith(`${type.entity}.${field}.`)));
      if (type.kind === 'item' && !type.entity) {
        const selectParam = Object.entries(definition.entry.params).find(([, param]) => param.effect.startsWith('select:'))?.[0];
        const fix = selectParam ? `Source ${stateId} from entry.params.${selectParam}.` : `Drop the carry ${key}.`;
        issues.push({ code: 'D2_SHARED_V2_CARRIES_TYPE', path: `functions.${id}.carries.${key}`, message: `Carry ${key} reads ${value}, but the entity of ${stateId} is unknown: the page selects no single entity. ${fix}` });
        continue;
      }
      if (type.kind !== 'item' || !readable || (field === 'id' && key !== `${camel(type.entity)}Id`)) {
        issues.push({ code: 'D2_SHARED_V2_CARRIES_TYPE', path: `functions.${id}.carries.${key}`, message: `Carry ${key} reads ${value}, but ${stateId} holds ${type.kind === 'item' ? `one ${type.entity}` : `a ${type.kind}`}. Carry a field of a selected item; an id carry is named <entity>Id.` });
      }
    }
  }
  const readEntities = new Set(context.needs.reads.map(item => camel(item.entity)));
  for (const [id, request] of Object.entries(definition.requests)) {
    if (request.kind !== 'cmd') continue;
    for (const name of request.returns) {
      if (!readEntities.has(name)) issues.push({ code: 'D2_SHARED_V2_RETURNS', path: `requests.${id}.returns`, message: `Command ${id} returns ${name}, which the page does not read.` });
    }
  }
  for (const id of Object.keys(definition.requests)) {
    if (!definition.rules[id]) issues.push({ code: 'D2_SHARED_V2_RULE_REQUEST', path: `rules.${id}`, message: `Request ${id} has no rule choice. List the pertinent rules from ruleCandidates, or none.` });
  }
  for (const [id, chosen] of Object.entries(definition.rules)) {
    const candidates = context.derived.rules[id];
    if (!definition.requests[id] || !candidates) {
      issues.push({ code: 'D2_SHARED_V2_RULE_REQUEST', path: `rules.${id}`, message: `Rules name request ${id}, which does not exist.` });
      continue;
    }
    for (const rule of chosen) {
      if (!candidates.includes(rule)) issues.push({ code: 'D2_SHARED_V2_RULE_OUTSIDE', path: `rules.${id}`, message: `Rule ${rule} is not a rule of the entities request ${id} touches. Choose only from ruleCandidates.${id}.` });
    }
    const request = definition.requests[id];
    if (request.kind !== 'cmd') continue;
    const own = (context.derived.entityRules[request.writes?.split('.')[0] ?? ''] ?? []).filter(rule => candidates.includes(rule));
    if (own.length && !chosen.some(rule => own.includes(rule))) {
      issues.push({ code: 'D2_SHARED_V2_RULE_COMMAND', path: `rules.${id}`, message: `Command ${id} keeps no rule of the entity it writes. Keep at least one of ${own.join(', ')}.` });
    }
  }
  return issues;
}

type SharedGateContext = Parameters<typeof gateD2SharedV2>[1];

function returnEntity(requestId: string, name: string, definition: D2SharedV2Definition, context: SharedGateContext): string {
  const derived = context.derived.requests.find(item => item.id === requestId)?.returnEntities[name];
  if (derived) return derived;
  if (definition.requests[requestId]?.kind !== 'cmd') return '';
  return context.needs.reads.map(item => item.entity).find(entity => camel(entity) === name) ?? '';
}

/** What a state holds: a list or one item of an entity, a scalar param, or unknown. */
function stateType(stateId: string, definition: D2SharedV2Definition, context: SharedGateContext, seen = new Set<string>()): { kind: 'list' | 'item' | 'scalar' | 'unknown'; entity: string } {
  const source = definition.states[stateId]?.source ?? '';
  if (seen.has(stateId)) return { kind: 'unknown', entity: '' };
  seen.add(stateId);
  const paramName = entryParamName(source);
  if (paramName !== null) {
    const effect = definition.entry.params[paramName]?.effect ?? '';
    if (!effect.startsWith('select:')) return { kind: 'scalar', entity: '' };
    // A select param holds the id in the URL; the state is the item resolved by that id.
    const target = effect.slice('select:'.length);
    const reads = context.draft.organisms[target]?.reads ?? [];
    const entity = reads[0]?.split('.')[0] ?? (context.needs.reads.some(item => item.entity === target) ? target : '');
    return { kind: 'item', entity };
  }
  const dot = source.indexOf('.');
  if (dot > 0) {
    const requestId = source.slice(0, dot);
    const tail = source.slice(dot + 1);
    const request = definition.requests[requestId];
    if (!request) return { kind: 'unknown', entity: '' };
    if (tail === 'input') return { kind: 'item', entity: request.writes?.split('.')[0] ?? '' };
    const derivedRequest = context.derived.requests.find(item => item.id === requestId);
    const many = request.kind === 'qry' && (requestId === 'load' || Boolean(derivedRequest?.lists.length));
    return { kind: many ? 'list' : 'item', entity: returnEntity(requestId, tail, definition, context) };
  }
  if (definition.states[source]) return stateType(source, definition, context, seen);
  const fn = definition.functions[source];
  if (fn && !fn.calls && !fn.navigate) {
    // A selection: the item belongs to the one entity the page's select targets read.
    const targets = new Set(Object.values(context.draft.organisms).map(row => row.selects).filter(Boolean));
    const entities = new Set([...targets].map(target => context.draft.organisms[target]?.reads[0]?.split('.')[0] ?? '').filter(Boolean));
    return { kind: 'item', entity: entities.size === 1 ? [...entities][0] : '' };
  }
  return { kind: 'unknown', entity: '' };
}

function camel(value: string): string { return value ? value[0].toLowerCase() + value.slice(1) : value; }

function rootSource(stateId: string, definition: D2SharedV2Definition): string {
  const seen = new Set<string>();
  let current = stateId;
  while (definition.states[current] && !seen.has(current)) {
    seen.add(current);
    const source = definition.states[current].source;
    if (!definition.states[source]) return source;
    current = source;
  }
  return '';
}

function organismBound(organismId: string, draft: D2Page11Needs, definition: D2SharedV2Definition, derived: D2DerivedPageRequests): boolean {
  const unit = draft.organisms[organismId];
  if (!unit) return false;
  const readEntities = new Set(unit.reads.map(path => path.split('.')[0]));
  const selectTarget = Object.values(draft.organisms).some(row => row.selects === organismId);
  const formSubmits = new Set([...Object.values(definition.forms), ...Object.values(derived.forms)]
    .filter(item => item.organism === organismId).map(item => item.submit));
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
    const paramName = entryParamName(source);
    if (paramName !== null) {
      const effect = definition.entry.params[paramName]?.effect ?? '';
      return effect === `select:${organismId}` || effect === `filter:${organismId}`;
    }
    const dot = source.indexOf('.');
    if (dot > 0) {
      const requestId = source.slice(0, dot);
      const tail = source.slice(dot + 1);
      const request = definition.requests[requestId];
      const derivedRequest = derived.requests.find(item => item.id === requestId);
      if (request?.kind === 'cmd' && tail === 'input' && formSubmits.has(requestId)) return true;
      const entity = derivedRequest?.returnEntities[tail];
      return Boolean(request && derivedRequest?.organisms.includes(organismId) && request.returns.includes(tail) && entity && readEntities.has(entity));
    }
    return bound.has(source);
  }
}

/** A state fed by a filtered or paginated list; only then does filter<List> exist to replace. */
function sourcesList(source: string | undefined, derived: D2DerivedPageRequests): boolean {
  if (!source) return false;
  return derived.requests.some(request => request.lists.some(list => source === `${request.id}.${list.key}` || source === list.key));
}

function entryParamName(source: string): string | null {
  const prefix = 'entry.params.';
  if (!source.startsWith(prefix)) return null;
  const name = source.slice(prefix.length);
  if (!name || name.includes('.')) return null;
  return name;
}

function validStateSource(stateId: string, source: string, definition: D2SharedV2Definition): boolean {
  const paramName = entryParamName(source);
  if (paramName !== null) return Object.prototype.hasOwnProperty.call(definition.entry.params, paramName);
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

/** Menu pages the page actors can open: the navigate targets a shared function may name. */
export function d2SharedNavigablePages(menu: D2PageRequestsMenu, actors: readonly string[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: D2PageRequestsMenu['tree']): void => { for (const node of nodes) { if (node.kind === 'page') ids.push(node.id); walk(node.children ?? []); } };
  walk(menu.tree);
  return ids.filter(pageId => canNavigate(menu, pageId, new Set(actors)));
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
