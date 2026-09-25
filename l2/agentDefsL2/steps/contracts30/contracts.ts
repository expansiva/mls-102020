/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/contracts.ts" enhancement="_blank"/>

import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';

export type D2ContractScalar = 'string' | 'number' | 'boolean' | 'object';
export type D2ContractOperation = 'list' | 'get' | 'create' | 'update' | 'transition';

export interface D2ContractField {
  path: string;
  name: string;
  scalar: D2ContractScalar;
  tsType: string;
  required: boolean;
  derived: boolean;
  writePrecondition: boolean;
  indexed: boolean;
  collection: boolean;
  enumValues: string[];
  referenceTo: string[];
  children: D2ContractField[];
}

export interface D2ContractCall {
  callName: string;
  callPascal: string;
  routeName: string;
  route: string;
  entityId: string;
  operation: D2ContractOperation;
  actors: string[];
  relationships: D2ContractRelationship[];
  input: D2ContractField[];
  output: D2ContractField[];
  outputShape: 'array' | 'object';
}

export interface D2ContractRelationship {
  relationshipId: string;
  to: string;
  via: string;
  cardinality: string;
  collection: boolean;
}

export interface D2PageContract {
  pageId: string;
  calls: D2ContractCall[];
}

export interface D2ContractsPageSource {
  pageId: string;
  actors: string[];
  endpoints: Array<Record<string, unknown>>;
  usecases: Array<Record<string, unknown>>;
}

export interface D2ContractsSources {
  module: string;
  entities: Record<string, Ns5OntologyAnyEntity>;
  access: unknown;
  pages: D2ContractsPageSource[];
}

export interface D2ContractIssue {
  code: string;
  source: string;
  message: string;
  pageId?: string;
  route?: string;
  path?: string;
}

export class D2ContractDerivationError extends Error {
  constructor(readonly issues: D2ContractIssue[]) {
    super(issues.map(issue => `${issue.code}${issue.path ? ` ${issue.path}` : ''}: ${issue.message}`).join('; '));
    this.name = 'D2ContractDerivationError';
  }
}

export function buildD2ContractsCatalog(sources: D2ContractsSources): D2PageContract[] {
  const issues: D2ContractIssue[] = [];
  const catalog = new Map<string, D2ContractField[]>();
  for (const [entityId, entity] of Object.entries(sources.entities)) {
    try { catalog.set(entityId, collectD2EntityFields(entity)); }
    catch (error) { issues.push(issueOf(error, `l4/${sources.module}/ontology/${entityId}.defs.ts`)); }
  }
  const grants = rows(rec(sources.access).grants);
  const pages = sources.pages.map(page => {
    const usecases = new Map(page.usecases.map(usecase => [text(usecase.usecaseId), usecase]));
    const seenCalls = new Set<string>();
    const calls: D2ContractCall[] = [];
    for (const endpoint of [...page.endpoints].sort((a, b) => text(a.route).localeCompare(text(b.route)))) {
      const route = text(endpoint.route);
      const usecaseId = text(endpoint.usecaseRef);
      const usecase = usecases.get(usecaseId);
      if (!usecase) {
        issues.push({ code: 'D2_CONTRACT_USECASE_MISSING', source: 'input.json', pageId: page.pageId, route, message: `usecase '${usecaseId}' is absent` });
        continue;
      }
      if (route !== `${sources.module}.${page.pageId}.${text(endpoint.kind)}${pascal(usecaseId)}`) {
        issues.push({ code: 'D2_CONTRACT_ROUTE_CHANGED', source: 'input.json', pageId: page.pageId, route, message: `route no longer matches ${usecaseId}` });
        continue;
      }
      if (seenCalls.has(usecaseId)) {
        issues.push({ code: 'D2_CONTRACT_CALL_DUPLICATE', source: 'input.json', pageId: page.pageId, route, message: `duplicate call '${usecaseId}'` });
        continue;
      }
      seenCalls.add(usecaseId);
      const entityId = text(usecase.entity);
      const entity = sources.entities[entityId];
      const allFields = catalog.get(entityId);
      const operation = contractOperation(usecase.operation);
      if (!entity || !allFields) {
        issues.push({ code: 'D2_CONTRACT_ENTITY_MISSING', source: 'input.json', pageId: page.pageId, route, message: `entity '${entityId}' is absent` });
        continue;
      }
      if (!operation) {
        issues.push({ code: 'D2_CONTRACT_OPERATION_UNSUPPORTED', source: 'input.json', pageId: page.pageId, route, message: `operation '${text(usecase.operation)}' is unsupported` });
        continue;
      }
      const allowed = allowedPathsByPageActor(page, entityId, allFields, grants, issues, route);
      if (!allowed) continue;
      const visible = filterTree(allFields, allowed);
      const callPascal = pascal(usecaseId);
      calls.push({
        callName: usecaseId,
        callPascal,
        routeName: `${usecaseId}Route`,
        route,
        entityId,
        operation,
        actors: [...page.actors].sort(),
        relationships: relationshipsOf(entity),
        input: inputFields(operation, entity, visible, usecaseId, page.pageId, route, issues),
        output: visible,
        outputShape: operation === 'list' ? 'array' : 'object',
      });
    }
    return { pageId: page.pageId, calls };
  });
  if (issues.length) throw new D2ContractDerivationError(issues);
  return pages.sort((a, b) => a.pageId.localeCompare(b.pageId));
}

function relationshipsOf(entity: Ns5OntologyAnyEntity): D2ContractRelationship[] {
  return Object.values(rec(rec(entity).relationships)).map(raw => {
    const relationship = rec(raw);
    const cardinality = text(relationship.cardinality);
    return {
      relationshipId: text(relationship.relationshipId),
      to: text(relationship.to),
      via: text(relationship.via),
      cardinality,
      collection: cardinality.endsWith(':N'),
    };
  }).filter(relationship => relationship.relationshipId && relationship.to);
}

export function collectD2EntityFields(entity: Ns5OntologyAnyEntity): D2ContractField[] {
  const root = rec(rec(entity).record);
  const fields = rec(root.fields);
  if (!Object.keys(fields).length) throw issueError('D2_CONTRACT_FIELDS_MISSING', text(rec(entity).entityId), 'record.fields is absent');
  const declared = new Set(resolvableFieldPaths(entity));
  const walk = (source: Record<string, unknown>, parent: string): D2ContractField[] => Object.entries(source).map(([name, raw]) => {
    const field = rec(raw);
    const path = `${parent}.${name}`;
    if (!declared.has(path)) throw issueError('D2_CONTRACT_PATH_UNRESOLVED', path, 'path is not resolvable by ontologyPaths');
    const children = walk(rec(field.fields), path);
    const mapped = mapFieldType(text(field.type), field, path, children);
    return {
      path,
      name,
      ...mapped,
      required: field.required === true,
      derived: field.derived === true,
      writePrecondition: field.writePrecondition === true,
      indexed: field.indexed === true,
      collection: field.collection === true || text(field.type) === 'array',
      enumValues: enumValues(field.values, path),
      referenceTo: strings(field.to),
      children,
    };
  });
  return walk(fields, text(rec(entity).entityId));
}

function inputFields(
  operation: D2ContractOperation,
  entity: Ns5OntologyAnyEntity,
  visible: D2ContractField[],
  callName: string,
  pageId: string,
  route: string,
  issues: D2ContractIssue[],
): D2ContractField[] {
  const identity = findIdentity(visible);
  if ((operation === 'get' || operation === 'update' || operation === 'transition') && !identity) {
    issues.push({ code: 'D2_CONTRACT_IDENTITY_MISSING', source: 'ontology', pageId, route, message: `identity field missing for ${callName}` });
    return [];
  }
  if (operation === 'get') return [identity!];
  if (operation === 'list') {
    const indexed = filterTree(visible, new Set(flatten(visible).filter(field => field.indexed).map(field => field.path)));
    return [...indexed, syntheticPageField(text(rec(entity).entityId))];
  }
  if (operation === 'create') return writableTree(visible);
  const preconditions = writePreconditionTree(visible);
  if (operation === 'update') return mergeFields([identity!], preconditions, writableTree(visible));
  const transition = rows(rec(entity).transitions).find(item => text(item.transitionId) === callName);
  if (!transition) {
    issues.push({ code: 'D2_CONTRACT_TRANSITION_MISSING', source: 'ontology', pageId, route, message: `transition '${callName}' is absent` });
    return [];
  }
  if (!Object.prototype.hasOwnProperty.call(transition, 'payload')) {
    issues.push({
      code: 'D2_CONTRACT_TRANSITION_PAYLOAD_MISSING', source: 'ontology', pageId, route,
      path: `${text(rec(entity).entityId)}.transitions.${callName}`,
      message: `transition '${callName}' does not declare payload`,
    });
    return [identity!];
  }
  const declaredPayload = strings(transition.payload);
  const payloadPaths = declaredPayload.map(path => path.startsWith(`${text(rec(entity).entityId)}.`) ? path : `${text(rec(entity).entityId)}.${path}`);
  const available = new Set(flatten(visible).map(field => field.path));
  for (const path of payloadPaths) if (!available.has(path)) {
    issues.push({ code: 'D2_CONTRACT_TRANSITION_PATH_INVALID', source: 'ontology', pageId, route, path, message: `transition payload path '${path}' is absent or forbidden` });
  }
  return mergeFields([identity!], preconditions, filterTree(visible, new Set(payloadPaths)));
}

function allowedPathsByPageActor(
  page: D2ContractsPageSource,
  entityId: string,
  fields: D2ContractField[],
  grants: Record<string, unknown>[],
  issues: D2ContractIssue[],
  route: string,
): Set<string> | null {
  if (!page.actors.length) {
    issues.push({ code: 'D2_CONTRACT_ACTOR_MISSING', source: 'input.json', pageId: page.pageId, route, message: 'page has no actor' });
    return null;
  }
  const allPaths = flatten(fields).map(field => field.path);
  const perActor = page.actors.map(actor => {
    const actorGrants = grants.filter(grant => text(grant.actorRef) === actor && strings(grant.entityRefs).includes(entityId));
    if (!actorGrants.length) {
      issues.push({ code: 'D2_CONTRACT_GRANT_MISSING', source: 'l4/access.defs.ts', pageId: page.pageId, route, message: `actor '${actor}' has no grant for '${entityId}'` });
      return new Set<string>();
    }
    const allowed = new Set<string>();
    for (const grant of actorGrants) {
      const disclosure = rec(grant.disclosure);
      if (text(disclosure.mode) === 'fullRecord') for (const path of allPaths) allowed.add(path);
      else if (text(disclosure.mode) === 'fieldsOnly') for (const ref of strings(disclosure.allowedFields)) {
        if (ref !== entityId && !ref.startsWith(`${entityId}.`)) continue;
        const matches = ref === entityId ? allPaths : allPaths.filter(path => path === ref || path.startsWith(`${ref}.`) || ref.startsWith(`${path}.`));
        if (!matches.length) issues.push({ code: 'D2_CONTRACT_GRANT_PATH_INVALID', source: 'l4/access.defs.ts', pageId: page.pageId, route, path: ref, message: `grant path '${ref}' is absent` });
        for (const path of matches) allowed.add(path);
      }
    }
    return allowed;
  });
  if (perActor.some(paths => paths.size === 0)) return null;
  const signatures = perActor.map(paths => [...paths].sort().join('\0'));
  if (new Set(signatures).size !== 1) {
    issues.push({ code: 'D2_CONTRACT_GRANT_AMBIGUOUS', source: 'l4/access.defs.ts', pageId: page.pageId, route, message: `actors have different grants for '${entityId}'` });
    return null;
  }
  return perActor[0];
}

function mapFieldType(type: string, field: Record<string, unknown>, path: string, children: D2ContractField[]): Pick<D2ContractField, 'scalar' | 'tsType'> {
  const values = enumValues(field.values, path);
  if (values.length) return { scalar: 'string', tsType: values.map(value => JSON.stringify(value)).join(' | ') };
  if (type === 'object') return { scalar: 'object', tsType: 'object' };
  if (type === 'uuid' || type === 'string' || type === 'text' || type === 'timestamp' || type === 'datetime' || type === 'date' || type === 'record') return { scalar: 'string', tsType: 'string' };
  if (type === 'integer' || type === 'number' || type === 'money' || type === 'decimal') return { scalar: 'number', tsType: 'number' };
  if (type === 'boolean') return { scalar: 'boolean', tsType: 'boolean' };
  if (type === 'array' && children.length) return { scalar: 'object', tsType: 'object' };
  throw issueError('D2_CONTRACT_TYPE_UNSUPPORTED', path, `unsupported ontology type '${type}'`);
}

function writableTree(fields: D2ContractField[]): D2ContractField[] {
  return fields.flatMap(field => {
    if (field.derived || field.writePrecondition) return [];
    const children = writableTree(field.children);
    if (field.children.length && !children.length) return [];
    return [{ ...field, children }];
  });
}

function writePreconditionTree(fields: D2ContractField[]): D2ContractField[] {
  return fields.flatMap(field => {
    const children = writePreconditionTree(field.children);
    if (!field.writePrecondition && !children.length) return [];
    return [{ ...field, required: true, children }];
  });
}

function mergeFields(...groups: D2ContractField[][]): D2ContractField[] {
  const out: D2ContractField[] = [];
  for (const field of groups.flat()) {
    const prior = out.find(item => item.path === field.path);
    if (!prior) { out.push({ ...field, children: mergeFields(field.children) }); continue; }
    prior.required = prior.required || field.required;
    prior.writePrecondition = prior.writePrecondition || field.writePrecondition;
    prior.children = mergeFields(prior.children, field.children);
  }
  return out;
}

function filterTree(fields: D2ContractField[], allowed: Set<string>): D2ContractField[] {
  return fields.flatMap(field => {
    const children = filterTree(field.children, allowed);
    if (!allowed.has(field.path) && !children.length) return [];
    return [{ ...field, children }];
  });
}

function findIdentity(fields: D2ContractField[]): D2ContractField | undefined {
  return flatten(fields).find(field => field.name === 'id' && field.derived);
}

function flatten(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => [field, ...flatten(field.children)]); }

function syntheticPageField(entityId: string): D2ContractField {
  return { path: `${entityId}.$page`, name: 'page', scalar: 'number', tsType: 'number', required: false, derived: false, writePrecondition: false, indexed: false, collection: false, enumValues: [], referenceTo: [], children: [] };
}

function contractOperation(value: unknown): D2ContractOperation | '' {
  const operation = text(value);
  return operation === 'list' || operation === 'get' || operation === 'create' || operation === 'update' || operation === 'transition' ? operation : '';
}

function enumValues(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) return [];
  const result = value.map(item => typeof item === 'string' ? item : text(rec(item).value));
  if (result.some(item => !item)) throw issueError('D2_CONTRACT_ENUM_INVALID', path, 'enum contains an empty code');
  return result;
}

function issueError(code: string, path: string, message: string): Error {
  const error = new Error(message) as Error & { contractIssue?: D2ContractIssue };
  error.contractIssue = { code, source: 'ontology', path, message };
  return error;
}

function issueOf(error: unknown, source: string): D2ContractIssue {
  const tagged = error as { contractIssue?: D2ContractIssue };
  return tagged.contractIssue ? { ...tagged.contractIssue, source } : { code: 'D2_CONTRACT_DERIVATION_FAILED', source, message: error instanceof Error ? error.message : String(error) };
}

function pascal(value: string): string {
  if (!/^[a-z][A-Za-z0-9]*$/.test(value)) throw new D2ContractDerivationError([{ code: 'D2_CONTRACT_NAME_INVALID', source: 'input.json', message: `unsafe call name '${value}'` }]);
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
