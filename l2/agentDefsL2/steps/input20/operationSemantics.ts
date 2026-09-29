/// <mls fileReference="_102020_/l2/agentDefsL2/steps/input20/operationSemantics.ts" enhancement="_blank"/>

import type { D2OperationBinding, D2SourceDigest } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';

export interface D2OperationSemanticsSources {
  module: string;
  entities: Record<string, unknown>;
  access: unknown;
  rules: unknown;
  digests: D2SourceDigest[];
}

export class D2OperationSemanticsError extends Error {
  constructor(readonly code: string, readonly file: string, readonly path: string, message: string) {
    super(`${code} ${file}#${path}: ${message}`);
    this.name = 'D2OperationSemanticsError';
  }
}

/** Derive operation inputs from record fields and lifecycle metadata; prose never grants writes. */
export function resolveD2OperationBindings(
  sources: D2OperationSemanticsSources,
  pageId: string,
  endpoints: Array<Record<string, unknown>>,
  usecases: Array<Record<string, unknown>>,
  actors: string[],
): D2OperationBinding[] {
  const rules = ruleMap(sources.rules);
  const digests = new Map(sources.digests.map(item => [item.path, item.sha256]));
  const byUsecase = new Map(usecases.map(item => [text(item.usecaseId), item]));
  const output: D2OperationBinding[] = [];
  for (const endpoint of endpoints) {
    const route = text(endpoint.route);
    const usecaseId = text(endpoint.usecaseRef);
    const usecase = byUsecase.get(usecaseId);
    if (!usecase) throw new D2OperationSemanticsError('USECASE_MISSING', 'pool/l2/web/backend.json', `endpoints.${route}`, `usecase '${usecaseId}' is missing`);
    const entityId = text(usecase.entity);
    const operation = text(usecase.operation);
    const entity = rec(sources.entities[entityId]);
    const entityFile = `l4/${sources.module}/ontology/${entityId}.defs.ts`;
    if (!Object.keys(entity).length) throw new D2OperationSemanticsError('ENTITY_MISSING', entityFile, entityId, 'entity source is missing');
    const isTransition = operation === 'transition' || (operation !== 'create' && operation !== 'update' && operation !== 'list' && operation !== 'get');
    const transition = rows(entity.transitions).find(item => text(item.transitionId) === usecaseId);
    const actorRef = isTransition ? strings(transition?.by).find(actor => actors.includes(actor)) || actors[0] || '' : actors[0] || '';
    const fields = recordFields(entity);
    const initialState = rows(entity.lifecycleStates)[0];
    const serverAssigned = new Map<string, unknown>();
    const lifecycleField = text(initialState?.field) || text(entity.lifecycleField) || 'state';
    if (initialState && fields.has(lifecycleField)) serverAssigned.set(lifecycleField, initialState.state ?? initialState.value);
    else if (initialState && fields.has('status')) serverAssigned.set('status', initialState.state ?? initialState.value);
    const subtype = text(entity.subtype);
    const subtypePath = fields.has('subtype') ? 'subtype' : fields.has('details.identification.subtype') ? 'details.identification.subtype' : fields.has('details.identity.subtype') ? 'details.identity.subtype' : '';
    if (subtype && subtypePath) serverAssigned.set(subtypePath, subtype);
    const writablePaths = [...fields].filter(path => {
      const field = fieldByPath(entity, path);
      return !field.derived && !field.writePrecondition && !serverAssigned.has(path) && !isContainer(field);
    });
    const referenced = isTransition ? strings(transition?.payload) : operation === 'create' || operation === 'update' ? writablePaths : [];
    const referencedPaths = unique(referenced);
    const structuralPaths = operation === 'create' || operation === 'update' || isTransition
      ? withAncestors(referencedPaths, fields)
      : referencedPaths;
    const required = new Set(isTransition
      ? withAncestors(referencedPaths, fields)
      : structuralPaths.filter(path => fieldByPath(entity, path).required === true));
    const inputFields = structuralPaths.map(path => {
      if (!fields.has(path)) throw new D2OperationSemanticsError('FIELD_REF_MISSING', entityFile, `${entityId}.${path}`, `operation '${operation}' references an undeclared record field`);
      return { path: path.startsWith(`${entityId}.`) ? path : `${entityId}.${path}`, origin: serverAssigned.has(path) ? 'server' as const : 'actor' as const, required: required.has(path) };
    });
    if (isTransition && !transition) throw new D2OperationSemanticsError('TRANSITION_REF_MISSING', entityFile, `transitions.${usecaseId}`, `operation '${usecaseId}' has no matching transition`);
    const citedRules = unique(isTransition ? strings(transition?.ruleRefs) : operation === 'create' || operation === 'update' ? strings(entity.rules) : []);
    const ruleRefs = citedRules.flatMap(ruleId => {
      const description = rules.get(ruleId);
      if (description === undefined && !isTransition) return [{ ruleId, file: entityFile, symbol: `rules[${ruleId}]`, description: '' }];
      if (description === undefined) throw new D2OperationSemanticsError('RULE_REF_MISSING', `l4/${sources.module}/rules.defs.ts`, `rules.${ruleId}`, `rule '${ruleId}' is absent`);
      const file = `l4/${sources.module}/rules.defs.ts`;
      return { ruleId, file, symbol: ruleSymbol(sources.rules, ruleId), description };
    });
    const grantResult = actorGrants(sources.access, isTransition ? [actorRef] : actors, entityId);
    const grants = grantResult.map(grant => ({ grant }));
    if (isTransition && transition && !strings(transition.by).every(actor => actors.includes(actor))) {
      throw new D2OperationSemanticsError('TRANSITION_ACTOR_NOT_SELECTED', entityFile, `transitions.${usecaseId}.by`, 'transition actor is not authorized by the selected page context');
    }
    const sourcePaths = [entityFile, `l4/${sources.module}/access.defs.ts`, `l4/${sources.module}/rules.defs.ts`];
    const sourceHashes = sourcePaths.map(path => {
      const sha256 = digests.get(path);
      if (!sha256) throw new D2OperationSemanticsError('SOURCE_HASH_MISSING', 'input20', path, 'semantic source digest is absent');
      return `${path}#${sha256}`;
    });
    for (const actor of (isTransition ? [actorRef] : actors)) {
      const applicable = grants.filter(item => text(item.grant.actorRef) === actor);
      const actorPaths = inputFields.filter(field => field.origin === 'actor' && !deniedBy(applicable, actor, entityId, field.path));
      const actorPathSet = new Set(actorPaths.map(field => field.path));
      const referencedActorPaths = new Set(referencedPaths.map(path => path.startsWith(`${entityId}.`) ? path : `${entityId}.${path}`));
      output.push({
        pageId, route, entityId, operation, actorRef: actor,
        grantRefs: applicable.map(item => text(item.grant.grantId)).filter(Boolean),
        authorities: applicable.map(item => text(item.grant.actorRef)).filter(Boolean),
        inputFields: actorPaths.filter(field => referencedActorPaths.has(field.path)
          || [...actorPathSet].some(path => path.startsWith(`${field.path}.`))),
        ...(transition ? { transition: { transitionId: text(transition.transitionId), from: strings(transition.from), to: text(transition.to), by: strings(transition.by), payload: strings(transition.payload) } } : {}),
        ruleRefs, sourceHashes,
      });
    }
  }
  return output;
}

function ruleMap(value: unknown): Map<string, string> {
  const root = rec(value);
  const entries = Array.isArray(root.rules)
    ? rows(root.rules).map(item => [text(item.ruleId), text(item.description)] as const)
    : Object.entries(rec(root.rules)).map(([id, description]) => [id, text(description)] as const);
  return new Map(entries.filter(([id]) => id));
}
function ruleSymbol(value: unknown, id: string): string {
  return Array.isArray(rec(value).rules) ? `rules[ruleId=${id}]` : `rules.${id}`;
}
function actorGrants(value: unknown, actors: string[], entityId: string): Record<string, unknown>[] {
  return rows(rec(value).grants).filter(grant => actors.includes(text(grant.actorRef)) && strings(grant.entityRefs).includes(entityId));
}
function recordFields(entity: Record<string, unknown>): Set<string> {
  const root = rec(rec(entity.record).fields);
  const result = new Set<string>();
  const visit = (items: Record<string, unknown>, prefix: string) => {
    for (const [key, raw] of Object.entries(items)) {
      const path = prefix ? `${prefix}.${key}` : key;
      result.add(path);
      visit(rec(rec(raw).fields), path);
    }
  };
  visit(root, '');
  return result;
}
function withAncestors(paths: string[], fields: Set<string>): string[] {
  const selected = new Set<string>();
  for (const path of paths) {
    const parts = path.split('.');
    for (let length = 1; length <= parts.length; length++) {
      const ancestor = parts.slice(0, length).join('.');
      if (fields.has(ancestor)) selected.add(ancestor);
    }
  }
  return [...fields].filter(path => selected.has(path));
}
function fieldByPath(entity: Record<string, unknown>, path: string): Record<string, unknown> {
  let current: Record<string, unknown> = rec(rec(entity.record).fields);
  let field: Record<string, unknown> = {};
  for (const part of path.split('.')) { field = rec(current[part]); current = rec(field.fields); }
  return field;
}
function isContainer(field: Record<string, unknown>): boolean { return text(field.type) === 'object' || Object.keys(rec(field.fields)).length > 0; }
function deniedBy(grants: Array<{ grant: Record<string, unknown> }>, actor: string, entityId: string, path: string): boolean {
  const fullPath = path.startsWith(`${entityId}.`) ? path : `${entityId}.${path}`;
  return grants.filter(item => text(item.grant.actorRef) === actor).some(item => strings(rec(item.grant.disclosure).deniedFields).some(denied =>
    denied === entityId || denied === fullPath || fullPath.startsWith(`${denied}.`)));
}
function unique(values: string[]): string[] { return [...new Set(values.filter(Boolean))]; }
function rec(value: unknown): Record<string, any> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {}; }
function rows(value: unknown): Array<Record<string, any>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
