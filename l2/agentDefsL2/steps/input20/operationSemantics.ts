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

/** Resolve declared operation policy by structural refs; prose and disclosure never grant writes. */
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
    const opSpec = rec(rec(entity.operations)[operation]);
    const isTransition = operation === 'transition' || (operation !== 'create' && operation !== 'update' && operation !== 'list' && operation !== 'get');
    const transition = rows(entity.transitions).find(item => text(item.transitionId) === usecaseId);
    const actorRef = isTransition ? strings(transition?.by).find(actor => actors.includes(actor)) || actors[0] || '' : actors[0] || '';
    const fields = recordFields(entity);
    const referenced = isTransition ? strings(transition?.payload) : [...strings(opSpec.writable), ...Object.keys(rec(opSpec.assigned))];
    const required = new Set(isTransition ? strings(transition?.payload) : strings(opSpec.required));
    const assigned = new Set(Object.keys(rec(opSpec.assigned)));
    const inputFields = unique(referenced).map(path => {
      if (!fields.has(path)) throw new D2OperationSemanticsError('FIELD_REF_MISSING', entityFile, `${entityId}.${path}`, `operation '${operation}' references an undeclared record field`);
      return { path: path.startsWith(`${entityId}.`) ? path : `${entityId}.${path}`, origin: assigned.has(path) ? 'server' as const : 'actor' as const, required: required.has(path) };
    });
    for (const path of required) if (!referenced.includes(path)) {
      throw new D2OperationSemanticsError('REQUIRED_FIELD_NOT_WRITABLE', entityFile, `${entityId}.${path}`, `required path '${path}' is not declared writable/payload`);
    }
    if (isTransition && !transition) throw new D2OperationSemanticsError('TRANSITION_REF_MISSING', entityFile, `transitions.${usecaseId}`, `operation '${usecaseId}' has no matching transition`);
    const citedRules = unique([...strings(opSpec.ruleRefs), ...strings(transition?.ruleRefs)]);
    if (['create', 'update'].includes(operation) && !Object.keys(opSpec).length) {
      throw new D2OperationSemanticsError('OPERATION_SEMANTICS_MISSING', entityFile, `operations.${operation}`, `operation '${operation}' has no declared write semantics`);
    }
    const ruleRefs = citedRules.map(ruleId => {
      const description = rules.get(ruleId);
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
      output.push({
        pageId, route, entityId, operation, actorRef: actor,
        grantRefs: applicable.map(item => text(item.grant.grantId)).filter(Boolean),
        authorities: applicable.map(item => text(item.grant.actorRef)).filter(Boolean),
        inputFields: actorPaths,
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
