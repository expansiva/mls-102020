/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2SharedV2.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2Page11Definition, D2Page11Device, D2Page11Location } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2BffValueLeaves, d2FedReads, d2PageSubmits, d2ReadCovered, type D2BffDesign, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';

export interface D2SharedV2Request {
  kind: 'qry' | 'cmd';
  trigger: string;
  writes?: string;
  returns: string[];
}
export interface D2SharedV2State { source: string; description: string; organisms: string[] }
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
    const row = exact(raw, ['source', 'description', 'organisms'], `D2_SHARED_V2_STATE: ${id}`);
    if (typeof row.source !== 'string' || typeof row.description !== 'string') throw new Error(`D2_SHARED_V2_STATE: ${id}`);
    if (!Array.isArray(row.organisms) || !row.organisms.every(item => typeof item === 'string')) throw new Error(`D2_SHARED_V2_STATE_ORGANISMS: ${id}`);
    states[id] = { source: row.source, description: row.description, organisms: row.organisms as string[] };
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

export interface D2SharedGateContext {
  page11: Record<D2Page11Device, D2Page11Definition>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  need: D2NeedPage;
  menu: D2Menu;
  design: D2BffDesign;
  entities: Record<string, Ns5OntologyAnyEntity>;
}

/**
 * D (d2_73): facts of the shared over the approved BFF, never its shape. Every organism is fed (an organism that reads is
 * listed in the organisms of some state (d2_80), what it reads is held by a state whose source carries it, what it edits
 * is a form), every function calls an endpoint that exists, every intent has a function, every state is filled by a
 * source, a function or a form; references, navigation targets and journey steps exist.
 */
export function gateD2SharedV2(value: unknown, context: D2SharedGateContext): D2SharedV2Issue[] {
  const issues: D2SharedV2Issue[] = [];
  let definition: D2SharedV2Definition;
  try { definition = buildD2SharedV2(value); } catch (error) { return [{ code: 'D2_SHARED_V2_FORMAT', path: 'definition', message: String(error) }]; }
  const add = (code: string, path: string, message: string): void => { issues.push({ code, path, message }); };
  const organisms = new Map<string, { reads: Set<string>; edits: Set<string>; intents: Array<{ id: string; kind: string; to?: string }> }>();
  for (const device of ['desktop', 'mobile'] as const) {
    for (const [id, organism] of Object.entries(context.page11[device].organisms)) {
      const row = organisms.get(id) ?? { reads: new Set<string>(), edits: new Set<string>(), intents: [] };
      for (const intent of organism.intents) if (!row.intents.some(item => item.id === intent.id)) row.intents.push(intent);
      const draft = context.drafts[device].organisms[id];
      for (const path of draft ? d2FedReads(draft) : []) row.reads.add(path);
      for (const path of draft?.edits ?? []) row.edits.add(path);
      organisms.set(id, row);
    }
  }

  // D.4: every state is filled by a source, a function or a form.
  for (const [id, state] of Object.entries(definition.states)) {
    if (!validStateSource(id, state.source, definition)) add('D2_SHARED_V2_STATE_SOURCE', `states.${id}`, `State ${id} source ${JSON.stringify(state.source)} is not <endpoint>.<output key>, <command>.input, entry.params.<name>, another state id, or a function whose sets is this state.`);
  }

  // D.1: an organism that reads is listed by a state; what it reads is held by a state; what it edits belongs to a form.
  const held = new Map(Object.keys(definition.states).map(id => [id, heldPaths(id, definition, context.design)]));
  const formOrganisms = new Set(Object.values(definition.forms).map(form => form.organism));
  const listed = new Set(Object.values(definition.states).flatMap(state => state.organisms));
  for (const [id, row] of organisms) {
    if (row.reads.size && !listed.has(id)) add('D2_SHARED_V2_ORGANISM_UNFED', `organisms.${id}`, `Organism ${id} reads, and no state lists it in organisms.`);
    for (const path of row.reads) {
      if ([...held.values()].some(origins => d2ReadCovered(path, origins, context.entities))) continue;
      add('D2_SHARED_V2_ORGANISM_UNFED', `organisms.${id}`, `Organism ${id} reads ${path}, and no state holds it: no state's source is an endpoint output that carries it.`);
    }
    if (row.edits.size && !formOrganisms.has(id)) add('D2_SHARED_V2_FORM_UNBOUND', `organisms.${id}`, `Organism ${id} edits ${[...row.edits].join(', ')} and is the organism of no form.`);
  }

  // Forms bind an organism of the page to one of its submits.
  const submits = d2PageSubmits(context);
  for (const [id, form] of Object.entries(definition.forms)) {
    if (!organisms.has(form.organism)) add('D2_SHARED_V2_FORM', `forms.${id}`, `Form ${id} names organism ${form.organism}, which is not on the page.`);
    if (!submits.has(form.submit)) add('D2_SHARED_V2_FORM', `forms.${id}`, `Form ${id} submits ${form.submit}, which is not a submit intent of the page.`);
  }

  // D.2: functions call endpoints that exist and touch states that exist; a navigation reaches a page the actors open.
  const pageActors = new Set(context.need.actors);
  for (const [id, fn] of Object.entries(definition.functions)) {
    if (fn.calls && !definition.requests[fn.calls]) add('D2_SHARED_V2_FUNCTION_CALL', `functions.${id}`, `Function ${id} calls ${fn.calls}, which is not an endpoint of the page.`);
    if (fn.sets && !definition.states[fn.sets]) add('D2_SHARED_V2_FUNCTION_SET', `functions.${id}`, `Function ${id} sets ${JSON.stringify(fn.sets)}, which is not one state id.`);
    for (const target of fn.updates ?? []) if (!definition.states[target]) add('D2_SHARED_V2_FUNCTION_UPDATE', `functions.${id}.updates`, `Function ${id} updates ${target}, which is not a state.`);
    if (fn.navigate && !canNavigate(context.menu, fn.navigate, pageActors)) add('D2_SHARED_V2_FUNCTION_NAVIGATE', `functions.${id}`, `Function ${id} navigates to ${fn.navigate}, which the page actors cannot open.`);
    for (const [key, ref] of Object.entries(fn.carries ?? {})) {
      const stateId = ref.split('.')[0];
      if (!definition.states[stateId]) add('D2_SHARED_V2_CARRIES_PATH', `functions.${id}.carries.${key}`, `Carry ${key} reads ${JSON.stringify(ref)}, and ${stateId} is not a state.`);
    }
  }

  // D.3: every submit has a function that calls its command; every navigation intent has its function.
  for (const [organismId, row] of organisms) {
    for (const intent of row.intents) {
      if (intent.kind === 'submit') {
        const command = context.design.endpoints.find(endpoint => endpoint.kind === 'cmd' && endpoint.when === intent.id);
        if (!command || !Object.values(definition.functions).some(fn => fn.calls === command.id)) add('D2_SHARED_V2_SUBMIT_FUNCTION', `organisms.${organismId}.intents.${intent.id}`, `Submit ${intent.id} has no function that calls its command${command ? ` ${command.id}` : ''}.`);
      } else if (!definition.functions[intent.id] && !Object.values(definition.functions).some(fn => fn.navigate === intent.to)) {
        add('D2_SHARED_V2_FUNCTION_MISSING', `organisms.${organismId}.intents.${intent.id}`, `Intent ${intent.id} has no function.`);
      }
    }
  }

  // Journeys: only the real steps of the page, each served by an organism or a continuation; references exist.
  const journeySteps = new Set(context.need.reads.flatMap(read => read.from.filter(item => item.startsWith('journey:')).map(item => item.slice('journey:'.length))));
  const pageJourneys = new Set(Object.entries(context.menu.meta?.journeys ?? {}).filter(([, pages]) => pages.includes(context.need.pageId)).map(([id]) => id));
  for (const step of journeySteps) {
    if (!pageJourneys.has(step.split('/')[0])) add('D2_SHARED_V2_JOURNEY_OUTSIDE', 'journeys', `Step ${step} is not linked to this page in the menu.`);
    if (!definition.journeys.some(item => item.step === step && (item.organisms.length || item.continuesIn))) add('D2_SHARED_V2_JOURNEY_UNSERVED', 'journeys', `Needs step ${step} is not served by an organism or continuesIn.`);
  }
  for (const row of definition.journeys) {
    if (!journeySteps.has(row.step)) add('D2_SHARED_V2_JOURNEY_INVENTED', `journeys.${row.step}`, `Journey step ${row.step} is not a real step for this page.`);
    for (const organism of row.organisms) if (!organisms.has(organism)) add('D2_SHARED_V2_JOURNEY_REF', `journeys.${row.step}`, `Journey step ${row.step} names organism ${organism}, which is not on the page.`);
    for (const fn of row.functions) if (!definition.functions[fn]) add('D2_SHARED_V2_JOURNEY_REF', `journeys.${row.step}`, `Journey step ${row.step} names function ${fn}, which does not exist.`);
  }
  return issues;
}

/** The L4 paths a state holds, through its source: an endpoint output key or a command input, by their leaf origins. */
function heldPaths(stateId: string, definition: D2SharedV2Definition, design: D2BffDesign, seen = new Set<string>()): string[] {
  if (seen.has(stateId)) return [];
  seen.add(stateId);
  const source = definition.states[stateId]?.source ?? '';
  if (definition.states[source]) return heldPaths(source, definition, design, seen);
  const dot = source.indexOf('.');
  if (dot <= 0 || source.startsWith('entry.')) return [];
  const endpoint = design.endpoints.find(item => item.id === source.slice(0, dot));
  const tail = source.slice(dot + 1);
  if (!endpoint) return [];
  const rows = tail === 'input' ? endpoint.input : endpoint.output.filter(leaf => leaf.name === tail);
  return d2BffValueLeaves(rows, design).flatMap(item => item.leaf.origin?.paths ?? []);
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
  if (definition.states[source]) return source !== stateId;
  return definition.functions[source]?.sets === stateId;
}

/** Menu pages the page actors can open: the navigate targets a shared function may name. */
export function d2SharedNavigablePages(menu: D2Menu, actors: readonly string[]): string[] {
  const ids: string[] = [];
  const walk = (nodes: D2Menu['tree']): void => { for (const node of nodes) { if (node.kind === 'page') ids.push(node.id); walk(node.children ?? []); } };
  walk(menu.tree);
  return ids.filter(pageId => canNavigate(menu, pageId, new Set(actors)));
}

function canNavigate(menu: D2Menu, pageId: string, pageActors: Set<string>): boolean {
  const path = menuPath(menu.tree, pageId, []);
  if (!path) return false;
  for (const [actor, refs] of Object.entries(menu.authorities ?? {})) {
    if (!refs.some(ref => path.includes(ref))) continue;
    if (pageActors.has(actor.replace(/^actor:/u, ''))) return true;
  }
  return false;
}

function menuPath(nodes: D2Menu['tree'], pageId: string, ancestors: string[]): string[] | null {
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
