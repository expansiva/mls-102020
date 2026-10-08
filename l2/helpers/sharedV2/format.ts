/// <mls fileReference="_102020_/l2/helpers/sharedV2/format.ts" enhancement="_blank"/>

/** Fields of a page location that the shared path, render and parse read. No device. */
export interface D2SharedV2Location {
  project: number;
  module: string;
  pageId: string;
}

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
  /** Entity.path → organism ids that read or edit it. */
  fields: Record<string, string[]>;
}

export interface D2SharedV2Issue { code: string; path: string; message: string }

export function buildD2SharedV2(value: unknown): D2SharedV2Definition {
  const root = exact(value, ['entry', 'forms', 'requests', 'states', 'functions', 'journeys', 'rules', 'access', 'fields'], 'D2_SHARED_V2_KEYS');
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
  const fields: Record<string, string[]> = {};
  for (const [id, raw] of Object.entries(object(root.fields, 'D2_SHARED_V2_FIELDS'))) {
    if (!/^[A-Z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9.]*$/u.test(id)) throw new Error(`D2_SHARED_V2_FIELDS: ${id}`);
    if (!Array.isArray(raw) || raw.length === 0 || !raw.every(item => typeof item === 'string' && item.length > 0)) throw new Error(`D2_SHARED_V2_FIELDS: ${id}`);
    fields[id] = raw as string[];
  }
  return { entry: { params }, forms, requests, states, functions, journeys, rules, access: { actors: access.actors as string[], grants: access.grants as string[] }, fields };
}

export function d2SharedV2Path(location: D2SharedV2Location): string {
  return `_${location.project}_/l2/${location.module}/web/shared/${location.pageId}.defs.ts`;
}

export function renderD2SharedV2(location: D2SharedV2Location, value: unknown): string {
  const definition = buildD2SharedV2(value);
  return `/// <mls fileReference="${d2SharedV2Path(location)}" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

export function parseD2SharedV2(source: string): { location: D2SharedV2Location; definition: D2SharedV2Definition } {
  const match = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/shared\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\n\nexport const definition = ([\s\S]+) as const;\n$/u.exec(source);
  if (!match) throw new Error('D2_SHARED_V2_SOURCE_SHAPE');
  let parsed: unknown;
  try { parsed = JSON.parse(match[4]); } catch { throw new Error('D2_SHARED_V2_SOURCE_JSON'); }
  return { location: { project: Number(match[1]), module: match[2], pageId: match[3] }, definition: buildD2SharedV2(parsed) };
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
