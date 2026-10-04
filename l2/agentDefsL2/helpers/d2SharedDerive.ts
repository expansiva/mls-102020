/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2SharedDerive.ts" enhancement="_blank"/>

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import type { D2Page11Definition, D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2WriteByKey } from '/_102020_/l2/helpers/defsInput/writeKey.js';
import { d2TransitionPayload } from '/_102020_/l2/agentDefsL2/helpers/d2WriteInput.js';
import { d2BffTypeRoot, d2PageSubmits, parseD2BffType, type D2BffDesign, type D2BffEndpoint, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { gateD2SharedV2, type D2SharedV2Definition, type D2SharedV2Issue } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';

/**
 * d2_75: the shared is written by code. It transcribes the design of A (endpoints and bindings) and derives only facts:
 * entry params (rule 8: URL, then local storage), the form of each submit from the input its write asks for (d2_72),
 * and descriptions taken from the JSDoc and the named types. No description is an identifier; no state takes a function
 * as source.
 */
export interface D2SharedDeriveInput {
  pageId: string;
  page11: Record<D2Page11Device, D2Page11Definition>;
  drafts: Record<D2Page11Device, D2Page11Needs>;
  need: D2NeedPage;
  menu: D2Menu;
  design: D2BffDesign;
  access: { actors: string[]; grants: string[] };
  entities: Record<string, Ns5OntologyAnyEntity>;
  /** The other selected pages, for the navigations that open this one with an id. */
  siblings: Array<{ pageId: string; page11: D2Page11Definition; drafts: D2Page11Needs[] }>;
}

const camel = (value: string): string => (value ? value[0].toLowerCase() + value.slice(1) : value);
const pascal = (value: string): string => (value ? value[0].toUpperCase() + value.slice(1) : value);
const SOURCES: Array<'url' | 'localStorage'> = ['url', 'localStorage'];

export function deriveD2Shared(input: D2SharedDeriveInput): D2SharedV2Definition {
  const { design } = input;
  const endpoint = (id: string): D2BffEndpoint | undefined => design.endpoints.find(item => item.id === id);
  const organisms = mergedOrganisms(input);

  const requests: D2SharedV2Definition['requests'] = {};
  const rules: D2SharedV2Definition['rules'] = {};
  for (const item of design.endpoints) {
    requests[item.id] = { kind: item.kind, trigger: item.when === 'interaction' ? item.id : item.when, ...(item.writes ? { writes: item.writes } : {}), returns: item.output.map(leaf => leaf.name) };
    rules[item.id] = item.rules;
  }

  // States: one per endpoint output key an organism reads from.
  const refs = [...new Set(design.bindings.organisms.map(row => row.reads))];
  const keyCount = new Map<string, number>();
  for (const ref of refs) keyCount.set(ref.split('.')[1], (keyCount.get(ref.split('.')[1]) ?? 0) + 1);
  const stateOf = new Map<string, string>();
  const states: D2SharedV2Definition['states'] = {};
  for (const ref of refs) {
    const [endpointId, key] = ref.split('.');
    const id = (keyCount.get(key) ?? 0) > 1 ? `${endpointId}${pascal(key)}` : key;
    stateOf.set(ref, id);
    states[id] = { source: ref, description: leafDescription(endpoint(endpointId), key, design) };
  }

  // Selections: the selected id lives in an entry param; the state of the selection is the item that id resolves.
  const params: D2SharedV2Definition['entry']['params'] = {};
  const selectionState = new Map<string, string>();
  for (const row of design.bindings.selections) {
    const entity = selectionEntity(row.via, design);
    if (!entity) continue;
    const param = `${camel(entity)}Id`;
    const target = organisms.get(row.organism)?.selects || row.organism;
    params[param] = params[param] ?? { type: 'string', sources: SOURCES, effect: `select:${target}`, persist: true };
    const stateId = `selected${entity}`;
    const typeName = 'query' in row.via ? outputType(endpoint(row.via.query), design) : listItemType(row.via.list, design);
    states[stateId] = { source: `entry.params.${param}`, description: design.types.find(type => type.name === typeName)?.description || leafDescription(endpoint(('query' in row.via ? row.via.query : row.via.list).split('.')[0]), '', design) };
    // The selecting organism and the one it opens both know the selected record (a navigation from either carries it).
    for (const id of [row.organism, target]) if (!selectionState.has(id)) selectionState.set(id, stateId);
  }
  Object.assign(params, navigationParams(input), filterParams(input));

  // Functions: one per endpoint, with the endpoint's id; a command updates what its own output redraws and what it reloads.
  const functions: D2SharedV2Definition['functions'] = {};
  const fedBy = (endpointId: string): string[] => [...stateOf].filter(([ref]) => ref.split('.')[0] === endpointId).map(([, id]) => id);
  for (const item of design.endpoints) {
    let targets: string[];
    if (item.kind === 'qry') targets = fedBy(item.id);
    else {
      const redrawn = [...stateOf].filter(([ref]) => {
        const [sourceId, key] = ref.split('.');
        const source = endpoint(sourceId)?.output.find(leaf => leaf.name === key);
        return item.output.some(leaf => leaf.name === key && leaf.type === source?.type);
      }).map(([, id]) => id);
      const reloads = design.bindings.commands.filter(row => row.endpoint === item.id).flatMap(row => row.refreshes).flatMap(fedBy);
      targets = [...new Set([...redrawn, ...reloads])];
    }
    functions[item.id] = { calls: item.id, description: item.jsdoc.purpose, ...(targets.length ? { sets: targets[0] } : {}), ...(targets.length > 1 ? { updates: targets.slice(1) } : {}) };
  }
  for (const [organismId, row] of organisms) {
    for (const intent of row.intents) {
      if (intent.kind !== 'navigate' || !intent.to || functions[intent.id]) continue;
      const stateId = selectionState.get(organismId);
      const entity = stateId?.slice('selected'.length) ?? '';
      functions[intent.id] = { navigate: intent.to, description: row.text, ...(stateId ? { carries: { [`${camel(entity)}Id`]: `${stateId}.id` } } : {}) };
    }
  }

  // Form prefill: an id the form edits may come in the URL.
  const forms = deriveForms(input, organisms);
  for (const form of Object.values(forms)) {
    for (const path of organisms.get(form.organism)?.edits ?? []) {
      const name = path.split('.').slice(-1)[0];
      if (name.endsWith('Id') && !params[name]) params[name] = { type: 'string', sources: SOURCES, effect: `prefill:${form.organism}`, persist: false };
    }
  }

  return {
    entry: { params },
    forms,
    requests,
    states,
    functions,
    journeys: design.bindings.journeys.map(row => ({ step: row.step, organisms: row.organisms, functions: row.endpoints, ...(row.continuesIn ? { continuesIn: row.continuesIn } : {}) })),
    rules,
    access: input.access,
  };
}

/** D over the derived shared (d2_70): the code's own output passes its own fact checks. */
export function d2SharedDeriveIssues(input: D2SharedDeriveInput, definition: D2SharedV2Definition): D2SharedV2Issue[] {
  return gateD2SharedV2(definition, { page11: input.page11, drafts: input.drafts, need: input.need, menu: input.menu, design: input.design });
}

interface OrganismRow { kind: string; text: string; section: string; intents: Array<{ id: string; kind: string; to?: string }>; reads: string[]; edits: string[]; selects: string; submits: Array<{ intentId: string; write: string }> }

function mergedOrganisms(input: Pick<D2SharedDeriveInput, 'page11' | 'drafts'>): Map<string, OrganismRow> {
  const out = new Map<string, OrganismRow>();
  for (const device of ['desktop', 'mobile'] as const) {
    const page = input.page11[device];
    for (const [id, organism] of Object.entries(page.organisms)) {
      const draft = input.drafts[device].organisms[id] ?? { reads: [], edits: [], selects: '', submits: [] };
      const row = out.get(id) ?? { kind: organism.kind, text: organism.text, section: page.sections.find(section => section.organisms.includes(id))?.id ?? '', intents: [], reads: [], edits: [], selects: '', submits: [] };
      for (const intent of organism.intents) if (!row.intents.some(item => item.id === intent.id)) row.intents.push(intent);
      row.reads = [...new Set([...row.reads, ...draft.reads])];
      row.edits = [...new Set([...row.edits, ...draft.edits])];
      row.selects = row.selects || draft.selects;
      for (const submit of draft.submits) if (!row.submits.some(item => item.intentId === submit.intentId)) row.submits.push(submit);
      out.set(id, row);
    }
  }
  return out;
}

function outputType(item: D2BffEndpoint | undefined, design: D2BffDesign): string {
  for (const leaf of item?.output ?? []) {
    const ref = parseD2BffType(leaf.type);
    if (ref?.base === 'ref' && d2BffTypeRoot(ref.ref, design)) return ref.ref;
  }
  return '';
}

function listItemType(ref: string, design: D2BffDesign): string {
  const [endpointId, key] = ref.split('.');
  const leaf = design.endpoints.find(item => item.id === endpointId)?.output.find(row => row.name === key);
  const type = leaf ? parseD2BffType(leaf.type) : null;
  return type?.base === 'ref' ? type.ref : '';
}

/** The entity a selection picks: the root of the detail the query returns, or of the list item; else the id the query takes. */
function selectionEntity(via: { query: string } | { list: string }, design: D2BffDesign): string {
  if ('list' in via) return d2BffTypeRoot(listItemType(via.list, design), design);
  const query = design.endpoints.find(item => item.id === via.query);
  const root = d2BffTypeRoot(outputType(query, design), design);
  if (root) return root;
  const id = (query?.input ?? []).flatMap(leaf => (leaf.origin?.kind === 'field' ? leaf.origin.paths : [])).find(path => path.split('.').length === 2 && path.endsWith('.id'));
  return id?.split('.')[0] ?? '';
}

function leafDescription(item: D2BffEndpoint | undefined, key: string, design: D2BffDesign): string {
  const leaf = item?.output.find(row => row.name === key);
  const ref = leaf ? parseD2BffType(leaf.type) : null;
  const type = ref?.base === 'ref' ? design.types.find(row => row.name === ref.ref) : undefined;
  return type?.description || item?.jsdoc.output || '';
}

/** A sibling page that navigates here from a selection opens this page with that record's id (rule 8). */
function navigationParams(input: D2SharedDeriveInput): D2SharedV2Definition['entry']['params'] {
  const params: D2SharedV2Definition['entry']['params'] = {};
  const readEntities = new Set(input.need.reads.map(item => item.entity));
  for (const sibling of input.siblings) {
    if (sibling.pageId === input.pageId) continue;
    const draft = (id: string) => sibling.drafts.map(row => row.organisms[id]).find(Boolean);
    for (const [id, organism] of Object.entries(sibling.page11.organisms)) {
      for (const intent of organism.intents) {
        if (intent.kind !== 'navigate' || intent.to !== input.pageId) continue;
        const selected = draft(id)?.selects;
        const target = (selected ? draft(selected) : undefined) ?? draft(id);
        const entity = target?.reads[0]?.split('.')[0] ?? '';
        if (!entity || !readEntities.has(entity)) continue;
        params[`${camel(entity)}Id`] = params[`${camel(entity)}Id`] ?? { type: 'string', sources: SOURCES, effect: `select:${entity}`, persist: true };
      }
    }
  }
  return params;
}

/** The inputs of the page queries that filter or page what the page shows survive a reload (rule 8). */
function filterParams(input: D2SharedDeriveInput): D2SharedV2Definition['entry']['params'] {
  const params: D2SharedV2Definition['entry']['params'] = {};
  for (const item of input.design.endpoints.filter(row => row.kind === 'qry')) {
    const target = input.design.bindings.organisms.find(row => row.reads.split('.')[0] === item.id)?.organism ?? item.id;
    for (const leaf of item.input) {
      const path = leaf.origin?.kind === 'field' ? leaf.origin.paths[0] : '';
      if (path.split('.').length === 2 && path.endsWith('.id')) continue; // the selected id is the selection's param
      if (leaf.name === 'pageSize' || params[leaf.name]) continue;
      const ref = parseD2BffType(leaf.type);
      params[leaf.name] = { type: ref?.base === 'number' || ref?.base === 'boolean' ? ref.base : 'string', sources: SOURCES, effect: `filter:${target}`, persist: true };
    }
  }
  return params;
}

/** The form of each submit is the organism that edits the input its write asks for (d2_72); a write without input has none. */
function deriveForms(input: D2SharedDeriveInput, organisms: Map<string, OrganismRow>): D2SharedV2Definition['forms'] {
  const forms: D2SharedV2Definition['forms'] = {};
  const writes = d2PageSubmits(input);
  for (const [unitId, unit] of organisms) {
    for (const submit of unit.submits) {
      const pageWrite = d2WriteByKey(input.need.writes, writes.get(submit.intentId) || submit.write);
      if (!pageWrite) continue;
      const entityId = pageWrite.entity;
      const payload = pageWrite.operation === 'transition' ? d2TransitionPayload(input.entities[entityId], entityId, pageWrite.transitionRef ?? '') : [];
      if (pageWrite.operation === 'transition' && !payload.length) continue;
      const wanted = pageWrite.operation === 'transition' ? payload : [];
      const candidates = [...organisms].filter(([, row]) => row.edits.some(path => path.split('.')[0] === entityId) && wanted.every(path => row.edits.includes(path)));
      if (!candidates.length) continue;
      const sameSection = candidates.filter(([id, row]) => row.section && row.section === unit.section && id !== unitId);
      // More than one candidate: the one that edits most of the entity, in page order.
      const score = ([, row]: [string, OrganismRow]) => row.edits.filter(path => path.split('.')[0] === entityId).length;
      const pool = sameSection.length === 1 ? sameSection : candidates;
      const chosen = [...pool].sort((a, b) => score(b) - score(a))[0];
      forms[submit.intentId] = { organism: chosen[0], submit: submit.intentId };
    }
  }
  return forms;
}
