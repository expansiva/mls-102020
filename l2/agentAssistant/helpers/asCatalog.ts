/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asCatalog.ts" enhancement="_blank"/>

// Builds the action catalog of a generated app from its own files (pure; the stor IO is in
// asStor). Meaning comes from the l4 ontology (titles, displayField, record targets), the wire
// shape from the l2 contract types, and list mechanics (where the rows are, how to page) from
// the l1 requests defs. Only routes the backend registers (l5 routeKeys) enter the catalog.

import type {
  AsCatalog,
  AsCommand,
  AsEntity,
  AsEntityField,
  AsEnumValue,
  AsInputField,
  AsLookup,
  AsModuleSources,
  AsRelated,
  AsTypeNode,
} from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { extractExportedObject, flattenType, parseContractSource, type AsTypeLeaf } from '/_102020_/l2/agentAssistant/helpers/asSource.js';

export function buildCatalog(modules: AsModuleSources[]): AsCatalog {
  const catalog: AsCatalog = { commands: [], queries: [], lookups: [], entities: [], issues: [] };
  for (const sources of modules) buildModule(sources, catalog);
  return catalog;
}

function buildModule(sources: AsModuleSources, catalog: AsCatalog): void {
  const live = new Set(sources.routeKeys);
  const entities = sources.ontology.map(text => readEntity(sources.module, text)).filter((entity): entity is AsEntity => !!entity);
  catalog.entities.push(...entities);
  const entityById = new Map(entities.map(entity => [entity.entityId, entity]));

  const contractRoutes = new Map<string, { kind: string; writes: string; leaves: AsTypeLeaf[] }>();
  for (const text of sources.contracts) {
    const parsed = parseContractSource(text);
    for (const route of parsed.routes) {
      contractRoutes.set(route.route, { kind: route.kind, writes: route.writes, leaves: flattenType(route.input, parsed.types) });
    }
  }

  for (const text of sources.requests) {
    const definition = asRecord(extractExportedObject(text));
    const requests = asArray(asRecord(definition.data).requests);
    for (const rawRequest of requests) {
      const request = asRecord(rawRequest);
      const route = asString(request.route);
      if (!route || !live.has(route)) continue;
      const contract = contractRoutes.get(route);
      if (!contract) {
        catalog.issues.push(`${route}: no contract type found`);
        continue;
      }
      const purpose = asString(asRecord(request.doc).purpose);
      const kind = asString(request.kind) || contract.kind;
      if (kind === 'cmd') {
        const command = buildCommand(sources.module, route, purpose, contract.writes, contract.leaves, entityById);
        if (command) catalog.commands.push(command);
        else catalog.issues.push(`${route}: input has shapes the assistant cannot fill`);
        continue;
      }
      catalog.lookups.push(...buildLookups(sources.module, route, purpose, request, contract.leaves, entityById));
      const query = buildQuery(sources.module, route, purpose, request, contract.leaves, entityById);
      if (query) catalog.queries.push(query);
      else catalog.issues.push(`${route}: query input has shapes the assistant cannot fill`);
    }
  }
}

// ---- ontology ----

function readEntity(module: string, text: string): AsEntity | null {
  const raw = asRecord(extractExportedObject(text));
  const entityId = asString(raw.entityId);
  if (!entityId) return null;
  const fields: AsEntityField[] = [];
  collectFields(asRecord(asRecord(raw.record).fields), '', fields);
  return {
    module,
    entityId,
    title: asString(raw.title) || entityId,
    displayField: asString(raw.displayField) || 'id',
    fields,
  };
}

function collectFields(fields: Record<string, unknown>, prefix: string, out: AsEntityField[]): void {
  for (const [name, value] of Object.entries(fields)) {
    const field = asRecord(value);
    const path = prefix ? `${prefix}.${name}` : name;
    out.push({
      path,
      title: asString(field.title),
      description: asString(field.description),
      type: asString(field.type),
      required: field.required === true,
      derived: field.derived === true,
      to: asArray(field.to).map(asString).filter(Boolean),
      enumValues: asArray(field.values).map(item => {
        const entry = asRecord(item);
        const enumValue = asString(entry.value);
        return { value: enumValue, label: asString(entry.title) || enumValue };
      }).filter(item => item.value),
    });
    const nested = asRecord(field.fields);
    if (Object.keys(nested).length) collectFields(nested, path, out);
  }
}

// The contract may wrap ontology paths (e.g. wire `details.details.precoVigente` for the
// ontology field `details.precoVigente`): the longest wire suffix that is an ontology path wins.
export function mapWireToEntityField(wirePath: string, entity: AsEntity | undefined): AsEntityField | undefined {
  if (!entity) return undefined;
  const segments = wirePath.split('.');
  for (let start = 0; start < segments.length; start += 1) {
    const suffix = segments.slice(start).join('.');
    const field = entity.fields.find(item => item.path === suffix);
    if (field) return field;
  }
  return undefined;
}

// ---- commands ----

function buildCommand(
  module: string,
  route: string,
  purpose: string,
  writes: string,
  leaves: AsTypeLeaf[],
  entityById: Map<string, AsEntity>,
): AsCommand | null {
  const entityId = writes.split('.')[0] || '';
  const entity = entityById.get(entityId);
  const inputs: AsInputField[] = [];
  for (const leaf of leaves) {
    const field = buildInputField(leaf, entity, entityId);
    if (!field) {
      // an optional field the assistant cannot type (arrays, unknown) is simply never sent
      if (leaf.required) return null;
      continue;
    }
    inputs.push(field);
  }
  return { route, module, kind: 'cmd', purpose, writes, entity: entityId, inputs, pageParam: '', pageSizeParam: '' };
}

// Every read route can answer a question. Its entity is the first entity it returns (so 'id' is
// that record), and paging params are not asked: buildWireInput sends the first page.
function buildQuery(
  module: string,
  route: string,
  purpose: string,
  request: Record<string, unknown>,
  leaves: AsTypeLeaf[],
  entityById: Map<string, AsEntity>,
): AsCommand | null {
  const outputs = asArray(request.output).map(asRecord);
  const main = outputs.find(output => ['entity', 'list'].includes(asString(output.kind))) || {};
  const entityId = asString(main.entity);
  const entity = entityById.get(entityId);
  const pagingParams = new Set(asArray(request.params).map(asRecord).filter(param => asString(param.pages)).map(param => asString(param.name)));
  const pageParam = tail(asString(main.page));
  const pageSizeParam = tail(asString(main.pageSize));
  const isPaging = (path: string): boolean => pagingParams.has(path) || (!!path && (path === pageParam || path === pageSizeParam));
  const inputs: AsInputField[] = [];
  for (const leaf of leaves) {
    if (isPaging(leaf.path)) continue;
    const field = buildInputField(leaf, entity, entityId);
    if (!field) {
      if (leaf.required) return null;
      continue;
    }
    // a query does not act on a record: 'version' would only be a filter nobody can fill
    if (field.role === 'version') continue;
    inputs.push(field);
  }
  const sentPage = leaves.some(leaf => leaf.path === pageParam) ? pageParam : '';
  const sentPageSize = leaves.some(leaf => leaf.path === pageSizeParam) ? pageSizeParam : '';
  return { route, module, kind: 'qry', purpose, writes: '', entity: entityId, inputs, pageParam: sentPage, pageSizeParam: sentPageSize };
}

function buildInputField(leaf: AsTypeLeaf, entity: AsEntity | undefined, entityId: string): AsInputField | null {
  const wire = wireTypeOf(leaf.type);
  if (wire.wireType === 'unknown') return null;
  const mapped = mapWireToEntityField(leaf.path, entity);
  const lastSegment = leaf.path.split('.').pop() || leaf.path;
  let role: AsInputField['role'] = 'value';
  let ref = '';
  if (mapped?.type === 'record' && mapped.to.length) {
    role = 'ref';
    ref = mapped.to[0];
  } else if (leaf.path === 'id' && entityId) {
    role = 'ref';
    ref = entityId;
  } else if (leaf.path === 'version') {
    role = 'version';
  }
  const enumValues: AsEnumValue[] = wire.literals.map(value => ({
    value,
    label: mapped?.enumValues.find(item => item.value === value)?.label || value,
  }));
  return {
    path: leaf.path,
    // the record a transition acts on is named after its entity, not after its 'Id' column
    label: role === 'ref' && leaf.path === 'id' ? entity?.title || entityId : mapped?.title || humanize(lastSegment),
    description: mapped?.description || '',
    wireType: wire.wireType,
    valueType: mapped?.type || wire.wireType,
    enumValues,
    required: leaf.required,
    role,
    ref,
  };
}

function wireTypeOf(node: AsTypeNode): { wireType: AsInputField['wireType']; literals: string[] } {
  if (node.kind === 'primitive') return { wireType: node.name, literals: [] };
  if (node.kind === 'literal') {
    const allBooleans = node.values.every(value => value === 'true' || value === 'false');
    if (allBooleans) return { wireType: 'boolean', literals: [] };
    const allNumbers = node.values.every(value => /^-?\d+(\.\d+)?$/.test(value));
    return { wireType: allNumbers ? 'number' : 'string', literals: node.values };
  }
  return { wireType: 'unknown', literals: [] };
}

// ---- lookups (list queries) ----

function buildLookups(
  module: string,
  route: string,
  purpose: string,
  request: Record<string, unknown>,
  leaves: AsTypeLeaf[],
  entityById: Map<string, AsEntity>,
): AsLookup[] {
  const outputs = asArray(request.output).map(asRecord);
  const params = asArray(request.params).map(asRecord);
  const pagingParams = new Set(params.filter(param => asString(param.pages)).map(param => asString(param.name)));
  const lookups: AsLookup[] = [];
  const seen = new Set<string>();
  for (const output of outputs) {
    if (asString(output.kind) !== 'list') continue;
    const entityId = asString(output.entity);
    if (!entityId || seen.has(entityId) || !entityById.has(entityId)) continue;
    seen.add(entityId);
    const listPath = asString(output.path);
    const itemsPath = asString(output.items);
    const itemPrefix = itemsPath ? `${listPath}.${itemsPath}.` : `${listPath}.`;
    const related: AsRelated[] = outputs
      .filter(item => asString(item.kind) === 'related' && asString(item.path).startsWith(itemPrefix))
      .map(item => ({
        path: asString(item.path).slice(itemPrefix.length),
        entity: asString(item.entity),
        fields: asArray(item.fields).map(field => asString(asRecord(field).path)).filter(Boolean),
      }))
      .filter(item => item.path && !item.path.includes('.') && item.entity);
    const pageParam = tail(asString(output.page));
    const pageSizeParam = tail(asString(output.pageSize));
    const filters = leaves
      .filter(leaf => !pagingParams.has(leaf.path) && leaf.path !== pageParam && leaf.path !== pageSizeParam)
      .map(leaf => buildInputField(leaf, entityById.get(entityId), ''))
      .filter((field): field is AsInputField => !!field);
    lookups.push({
      route,
      module,
      purpose,
      entity: entityId,
      listPath,
      itemsPath,
      hasMorePath: asString(output.hasMore),
      pageParam: pagingParams.has(pageParam) || leaves.some(leaf => leaf.path === pageParam) ? pageParam : '',
      pageSizeParam: pagingParams.has(pageSizeParam) || leaves.some(leaf => leaf.path === pageSizeParam) ? pageSizeParam : '',
      filters,
      related,
    });
  }
  return lookups;
}

// A lookup can run without the model's help when nothing but paging is required.
export function lookupNeedsParams(lookup: AsLookup): boolean {
  return lookup.filters.some(filter => filter.required);
}

export function lookupsFor(catalog: AsCatalog, module: string, entityId: string): AsLookup[] {
  return catalog.lookups.filter(lookup => lookup.module === module && lookup.entity === entityId);
}

export function findEntity(catalog: AsCatalog, module: string, entityId: string): AsEntity | undefined {
  return catalog.entities.find(entity => entity.module === module && entity.entityId === entityId);
}

// ---- what the model sees: compact, only what it can act on ----

export function catalogForPrompt(catalog: AsCatalog): Record<string, unknown> {
  return {
    entities: catalog.entities.map(entity => ({
      module: entity.module,
      entity: entity.entityId,
      title: entity.title,
      displayField: entity.displayField,
    })),
    commands: catalog.commands.map(command => ({
      route: command.route,
      purpose: command.purpose,
      writes: command.writes,
      inputs: command.inputs.filter(input => input.role !== 'version').map(input => ({
        path: input.path,
        label: input.label,
        type: input.valueType,
        required: input.required,
        ...(input.enumValues.length ? { values: input.enumValues.map(item => item.value) } : {}),
        ...(input.role === 'ref' ? { refEntity: input.ref } : {}),
      })),
    })),
    queries: catalog.queries.map(query => ({
      route: query.route,
      purpose: query.purpose,
      returns: query.entity,
      inputs: query.inputs.map(input => ({
        path: input.path,
        label: input.label,
        type: input.valueType,
        required: input.required,
        ...(input.enumValues.length ? { values: input.enumValues.map(item => item.value) } : {}),
        ...(input.role === 'ref' ? { refEntity: input.ref } : {}),
      })),
    })),
    lookups: catalog.lookups.map(lookup => ({
      route: lookup.route,
      entity: lookup.entity,
      purpose: lookup.purpose,
      filters: lookup.filters.map(filter => ({ name: filter.path, type: filter.valueType, required: filter.required })),
      relatedEntities: lookup.related.map(item => item.entity),
    })),
  };
}

// ---- small utils ----

export function humanize(name: string): string {
  const words = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words ? words[0].toUpperCase() + words.slice(1) : name;
}

function tail(path: string): string {
  return path ? path.split('.').pop() || '' : '';
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
