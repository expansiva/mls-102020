/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/shared.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/defsL2v2, 05/10/2026; that original was removed with agentMaterializeL2v2 on 08/10/2026).
// Reader of the public shared v2 defs (web/shared/<pageId>.defs.ts). Grammar only, no policy.
// The grammar is the one agentDefsL2 renders (helpers/d2SharedV2.ts there, d2_59/d2_60, 30/09/2026).

import type { L2PageLocation } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';

export interface L2SharedParam { type: string; sources: Array<'url' | 'localStorage'>; effect: string; persist: boolean }
export interface L2SharedRequest { kind: 'qry' | 'cmd'; trigger: string; writes?: string; returns: string[] }
export interface L2SharedState { source: string; description: string; organisms?: string[] }
export interface L2SharedFunction {
  description: string;
  calls?: string;
  sets?: string;
  updates?: string[];
  navigate?: string;
  carries?: Record<string, string>;
}
export interface L2SharedJourney { step: string; organisms: string[]; functions: string[]; continuesIn?: string }
export interface L2SharedDefinition {
  entry: { params: Record<string, L2SharedParam> };
  forms: Record<string, { organism: string; submit: string }>;
  requests: Record<string, L2SharedRequest>;
  states: Record<string, L2SharedState>;
  functions: Record<string, L2SharedFunction>;
  journeys: L2SharedJourney[];
  rules: Record<string, string[]>;
  access: { actors: string[]; grants: string[] };
}

/** A state source, classified by the closed grammar of shared v2. */
export type L2StateSource =
  | { kind: 'entryParam'; param: string }
  | { kind: 'requestInput'; request: string }
  | { kind: 'requestReturn'; request: string; key: string }
  | { kind: 'state'; state: string }
  | { kind: 'function'; fn: string }
  | { kind: 'invalid' };

export function parseL2Shared(source: string): { location: L2PageLocation; definition: L2SharedDefinition } {
  const match = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/shared\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\r?\n\r?\nexport const definition = ([\s\S]+) as const;\r?\n?$/u.exec(source);
  if (!match) throw new Error('L2_SHARED_SOURCE_SHAPE');
  let parsed: unknown;
  try { parsed = JSON.parse(match[4]); } catch { throw new Error('L2_SHARED_SOURCE_JSON'); }
  return { location: { project: Number(match[1]), module: match[2], pageId: match[3] }, definition: buildL2Shared(parsed) };
}

export function buildL2Shared(value: unknown): L2SharedDefinition {
  const root = exact(value, ['entry', 'forms', 'requests', 'states', 'functions', 'journeys', 'rules', 'access'], 'L2_SHARED_KEYS');
  const params: L2SharedDefinition['entry']['params'] = {};
  for (const [id, raw] of Object.entries(object(exact(root.entry, ['params'], 'L2_SHARED_ENTRY').params, 'L2_SHARED_PARAMS'))) {
    const row = exact(raw, ['type', 'sources', 'effect', 'persist'], `L2_SHARED_PARAM: ${id}`);
    if (typeof row.type !== 'string' || typeof row.effect !== 'string' || typeof row.persist !== 'boolean') throw new Error(`L2_SHARED_PARAM: ${id}`);
    if (!Array.isArray(row.sources) || !row.sources.every(item => item === 'url' || item === 'localStorage')) throw new Error(`L2_SHARED_PARAM_SOURCES: ${id}`);
    params[id] = { type: row.type, sources: row.sources as L2SharedParam['sources'], effect: row.effect, persist: row.persist };
  }
  const forms: L2SharedDefinition['forms'] = {};
  for (const [id, raw] of Object.entries(object(root.forms, 'L2_SHARED_FORMS'))) {
    const row = exact(raw, ['organism', 'submit'], `L2_SHARED_FORM: ${id}`);
    if (typeof row.organism !== 'string' || typeof row.submit !== 'string') throw new Error(`L2_SHARED_FORM: ${id}`);
    forms[id] = { organism: row.organism, submit: row.submit };
  }
  const requests: L2SharedDefinition['requests'] = {};
  for (const [id, raw] of Object.entries(object(root.requests, 'L2_SHARED_REQUESTS'))) {
    const row = object(raw, `L2_SHARED_REQUEST: ${id}`);
    if (row.kind !== 'qry' && row.kind !== 'cmd') throw new Error(`L2_SHARED_REQUEST_KIND: ${id}`);
    if (typeof row.trigger !== 'string' || !Array.isArray(row.returns) || !row.returns.every(item => typeof item === 'string')) throw new Error(`L2_SHARED_REQUEST: ${id}`);
    requests[id] = { kind: row.kind, trigger: row.trigger, returns: row.returns as string[], ...(typeof row.writes === 'string' ? { writes: row.writes } : {}) };
  }
  const states: L2SharedDefinition['states'] = {};
  for (const [id, raw] of Object.entries(object(root.states, 'L2_SHARED_STATES'))) {
    // `organisms` (the organisms the state feeds) is required by agentDefsL2 since d2_80 (05/10/2026); defs
    // rendered before that have no such field, so it is optional here.
    const row = exact(raw, ['source', 'description'], `L2_SHARED_STATE: ${id}`, ['organisms']);
    if (typeof row.source !== 'string' || typeof row.description !== 'string') throw new Error(`L2_SHARED_STATE: ${id}`);
    if ('organisms' in row && (!Array.isArray(row.organisms) || !row.organisms.every(item => typeof item === 'string'))) throw new Error(`L2_SHARED_STATE_ORGANISMS: ${id}`);
    states[id] = { source: row.source, description: row.description, ...(Array.isArray(row.organisms) ? { organisms: row.organisms as string[] } : {}) };
  }
  const functions: L2SharedDefinition['functions'] = {};
  for (const [id, raw] of Object.entries(object(root.functions, 'L2_SHARED_FUNCTIONS'))) {
    const row = object(raw, `L2_SHARED_FUNCTION: ${id}`);
    if (typeof row.description !== 'string') throw new Error(`L2_SHARED_FUNCTION: ${id}`);
    functions[id] = {
      description: row.description,
      ...(typeof row.calls === 'string' ? { calls: row.calls } : {}),
      ...(typeof row.sets === 'string' ? { sets: row.sets } : {}),
      ...(Array.isArray(row.updates) ? { updates: row.updates.map(String) } : {}),
      ...(typeof row.navigate === 'string' ? { navigate: row.navigate } : {}),
      ...(row.carries && typeof row.carries === 'object' && !Array.isArray(row.carries) ? { carries: row.carries as Record<string, string> } : {}),
    };
  }
  if (!Array.isArray(root.journeys)) throw new Error('L2_SHARED_JOURNEYS');
  const journeys = root.journeys.map((raw, index) => {
    const row = object(raw, `L2_SHARED_JOURNEY: ${index}`);
    if (typeof row.step !== 'string' || !Array.isArray(row.organisms) || !Array.isArray(row.functions)) throw new Error(`L2_SHARED_JOURNEY: ${index}`);
    return { step: row.step, organisms: row.organisms.map(String), functions: row.functions.map(String), ...(typeof row.continuesIn === 'string' ? { continuesIn: row.continuesIn } : {}) };
  });
  const rules: Record<string, string[]> = {};
  for (const [id, raw] of Object.entries(object(root.rules, 'L2_SHARED_RULES'))) {
    if (!Array.isArray(raw) || !raw.every(item => typeof item === 'string')) throw new Error(`L2_SHARED_RULES: ${id}`);
    rules[id] = raw as string[];
  }
  const access = exact(root.access, ['actors', 'grants'], 'L2_SHARED_ACCESS');
  if (!Array.isArray(access.actors) || !Array.isArray(access.grants)) throw new Error('L2_SHARED_ACCESS');
  return { entry: { params }, forms, requests, states, functions, journeys, rules, access: { actors: access.actors.map(String), grants: access.grants.map(String) } };
}

export function classifyL2StateSource(stateId: string, source: string, definition: L2SharedDefinition): L2StateSource {
  if (source.startsWith('entry.params.')) {
    const param = source.slice('entry.params.'.length);
    return param && !param.includes('.') && definition.entry.params[param] ? { kind: 'entryParam', param } : { kind: 'invalid' };
  }
  const dot = source.indexOf('.');
  if (dot > 0) {
    const request = source.slice(0, dot);
    const tail = source.slice(dot + 1);
    const row = definition.requests[request];
    if (!row || !tail || tail.includes('.')) return { kind: 'invalid' };
    if (tail === 'input') return row.kind === 'cmd' ? { kind: 'requestInput', request } : { kind: 'invalid' };
    return row.returns.includes(tail) ? { kind: 'requestReturn', request, key: tail } : { kind: 'invalid' };
  }
  if (definition.states[source]) return { kind: 'state', state: source };
  if (definition.functions[source]?.sets === stateId) return { kind: 'function', fn: source };
  return { kind: 'invalid' };
}

function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
function exact(value: unknown, allowed: readonly string[], code: string, optional: readonly string[] = []): Record<string, unknown> {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!allowed.includes(key) && !optional.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of allowed) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
  return row;
}
