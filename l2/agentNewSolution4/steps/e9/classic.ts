/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e9/classic.ts" enhancement="_blank"/>

/**
 * E9 is a transpiler. It takes no screen decision: every workspace, call, section and operation was
 * already decided by E8. What lives here is the shape the consumers read — the classic L4 format
 * that agentChangeBackend and agentChangeFrontend already parse today.
 *
 * The one thing that must be exactly right is the `from` path of a projected field,
 * `"<operationId>.<inputId>"`, because both consumers trace an input's origin and an enumerated
 * field's literal union back through it (cbContracts.resolveBffProjection and
 * cfeL4Contract.bffCallCommandShape).
 */

import type { Ns4E4Review, Ns4OntologyEntity, Ns4OntologyField } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type {
  Ns4E8BffCall, Ns4E8Input, Ns4E8Model, Ns4E8ModelWorkspace, Ns4E8Operation,
} from '/_102020_/l2/agentNewSolution4/steps/e8/model.js';

export const NS4_CLASSIC_WORKSPACE_VERSION = '2026-08-14-ns4-classic-workspace-v6' as const;

export interface Ns4ClassicField { name: string; from: string; type?: string; required?: boolean; item?: { fields: Ns4ClassicField[] }; }
export interface Ns4ClassicBffCall {
  bffId: string;
  kind: 'query' | 'command';
  uses: Array<{ operationId: string }>;
  input: Array<{ name: string; from: string; required?: boolean; source: string; type: string }>;
  output: { kind: 'object' | 'list'; fields: Ns4ClassicField[] };
  route: string;
}
export interface Ns4ClassicWorkspace {
  workspaceId: string;
  title: string;
  actors: string[];
  kind: string;
  entity: string;
  workflowId?: string;
  bffCalls: Ns4ClassicBffCall[];
  sections: Array<{ sectionId: string; intent: string; organisms: Array<Record<string, string>> }>;
  operationIds: string[];
  purpose: string;
  presentation: { categoryRef: string; confidence: number; classificationNote: string };
  sliceHash: string;
}
export interface Ns4ClassicOperation {
  operationId: string;
  title: string;
  actors: string[];
  entity: string;
  kind: string;
  reads: string[];
  writes: string[];
  rulesApplied: string[];
  story: { actor: string; goal: string; steps: string[]; outcome: string };
  accessPattern: { kind: string; description: string; entity: string; keyField: string; pagination: string; selection: string; output: string[] };
  outputShape: { kind: 'object' | 'list'; fields: Array<{ name: string; type: string; required: boolean; fieldRef: string }> };
  inputs: Array<{ inputId: string; fieldRef: string; required: boolean; source: string; description: string }>;
  pageId: string;
  commandName: string;
  bffName: string;
}
export interface Ns4ClassicSiteMap {
  moduleName: string;
  note: string;
  workspaces: Array<{ workspaceId: string; title: string; actors: string[]; kind: string; entity: string; operationIds: string[]; purpose: string }>;
  landings: Array<{ actorId: string; workspaceId: string; reason: string }>;
  navigationEdges: Array<{ from: string; to: string; operationId: string; description: string }>;
  workspaceIds: string[];
}

/** `<operationId>.<inputId>`: the only path both consumers know how to trace back. */
export function ns4ClassicFrom(operationId: string, member: string): string {
  return `${operationId}.${member}`;
}

export function transposeNs4ClassicOperation(
  model: Ns4E8Model, operation: Ns4E8Operation, ontology: Ns4E4Review,
): Ns4ClassicOperation {
  const entity = ontology.entities.find(item => item.entityId === operation.entityRef);
  const owner = model.workspaces.find(workspace => workspace.bffCalls.some(call => call.operationId === operation.operationId));
  const call = owner?.bffCalls.find(item => item.operationId === operation.operationId);
  const list = operation.accessPattern.kind === 'list';
  const outputFields = (entity?.fields || []).map(field => ({
    name: field.fieldId, type: classicType(field.type), required: field.required,
    fieldRef: `${operation.entityRef}.${field.fieldId}`,
  }));
  return {
    operationId: operation.operationId,
    title: operation.title,
    actors: owner?.actors || [],
    entity: operation.entityRef,
    kind: operation.kind === 'query' ? 'query' : operation.accessPattern.kind,
    reads: operation.entityRefs,
    writes: operation.kind === 'command' ? [operation.entityRef] : [],
    rulesApplied: operation.useRules,
    story: {
      actor: owner?.actors[0] || '', goal: operation.title,
      steps: operation.story, outcome: operation.story[operation.story.length - 1] || operation.title,
    },
    accessPattern: {
      kind: operation.accessPattern.kind,
      description: operation.title,
      entity: operation.entityRef,
      keyField: `${operation.entityRef}.${identityFieldOf(entity)}`,
      // Pagination stays declared as none until a call actually projects the page meta; a shape the
      // module never emits would only make the wire lie about itself.
      pagination: 'none',
      selection: list ? 'single' : 'none',
      output: outputFields.map(field => field.fieldRef),
    },
    outputShape: { kind: list ? 'list' : 'object', fields: outputFields },
    inputs: operation.inputs.map(input => ({
      inputId: input.inputId,
      fieldRef: `${input.fieldRef.entityId}.${input.fieldRef.fieldId}`,
      required: input.required,
      source: input.source,
      description: input.description,
    })),
    pageId: owner?.workspaceId || '',
    commandName: call?.bffId || operation.operationId,
    bffName: call?.bffId || operation.operationId,
  };
}

export function transposeNs4ClassicWorkspace(
  model: Ns4E8Model, workspace: Ns4E8ModelWorkspace, operations: Map<string, Ns4E8Operation>, ontology: Ns4E4Review, sliceHash: string,
): Ns4ClassicWorkspace {
  const bffCalls = workspace.bffCalls.map(call => transposeCall(model, workspace.workspaceId, call, operations.get(call.operationId), ontology));
  return {
    workspaceId: workspace.workspaceId,
    title: workspace.title,
    actors: workspace.actors.length ? workspace.actors : workspace.profileRefs,
    kind: workspace.kind,
    entity: workspace.entity,
    ...(workspace.workflowId ? { workflowId: workspace.workflowId } : {}),
    bffCalls,
    sections: workspace.sections.map(section => ({
      sectionId: section.sectionId,
      intent: section.intent,
      organisms: section.organisms.map(organism => ({
        role: organism.role,
        ...(organism.dataSource ? { dataSource: organism.dataSource } : {}),
        ...(organism.action ? { action: organism.action } : {}),
        ...(organism.usage ? { usage: organism.usage } : {}),
      })),
    })),
    operationIds: [...new Set(workspace.bffCalls.map(call => call.operationId))].sort(),
    purpose: workspace.purpose,
    presentation: {
      categoryRef: workspace.categoryRef,
      confidence: 10,
      classificationNote: `Derived from the ${workspace.tier} tier of the approved E8 model; the category is structural, not a guess.`,
    },
    sliceHash,
  };
}

function transposeCall(
  model: Ns4E8Model, workspaceId: string, call: Ns4E8BffCall, operation: Ns4E8Operation | undefined, ontology: Ns4E4Review,
): Ns4ClassicBffCall {
  const entity = ontology.entities.find(item => item.entityId === call.entityRef);
  const list = call.outputKind === 'paginated' || operation?.accessPattern.kind === 'list';
  const fields = (entity?.fields || []).map(field => ({
    name: field.fieldId,
    from: ns4ClassicFrom(call.operationId, list ? `$items.${field.fieldId}` : field.fieldId),
    type: classicType(field.type),
    required: field.required,
  }));
  return {
    bffId: call.bffId,
    kind: call.kind,
    uses: [{ operationId: call.operationId }],
    input: (operation?.inputs || []).map(input => ({
      name: input.inputId,
      from: ns4ClassicFrom(call.operationId, input.inputId),
      ...(input.required ? { required: true } : {}),
      source: input.source,
      // 2. The type comes from the ontology field the input names, never from a lucky match against
      // an output projection path (a list output is `$items.`-prefixed and would never match).
      type: classicType(fieldTypeOf(ontology, input.fieldRef.entityId, input.fieldRef.fieldId)),
    })),
    // One call carries at most one collection: composition is several calls on one page.
    output: { kind: list ? 'list' : 'object', fields },
    route: `${model.moduleName}.${workspaceId}.${call.bffId}`,
  };
}

function fieldTypeOf(ontology: Ns4E4Review, entityId: string, fieldId: string): Ns4OntologyField['type'] {
  return ontology.entities.find(entity => entity.entityId === entityId)
    ?.fields.find(field => field.fieldId === fieldId)?.type || 'string';
}

/** One TypeScript contract file per bffCall, byte-compatible with what the CFE reads today. */
export function buildNs4ClassicContractSource(args: {
  moduleName: string; workspaceId: string; call: Ns4ClassicBffCall; fileRef: string; sourceRef: string;
}): string {
  const pascal = upperCamel(args.call.bffId);
  const inputFields = args.call.input.map(input => `  ${input.name}${input.required ? '' : '?'}: ${tsType(input.type)};`);
  const outputFields = args.call.output.fields.map(field => `  ${field.name}${field.required ? '' : '?'}: ${tsType(field.type)};`);
  return [
    `/// <mls fileReference="${args.fileRef}" enhancement="_blank"/>`,
    '',
    `// GENERATED MECHANICALLY from ${args.sourceRef} — DO NOT EDIT.`,
    `// Contract of record: bffCall ${args.call.bffId} (${args.call.kind}); Output kind=${args.call.output.kind}; route ${args.call.route}.`,
    '',
    `export interface ${pascal}Input {`,
    ...(inputFields.length ? inputFields : ['  // sem inputs públicos (resolvidos por contexto)']),
    '}',
    '',
    `export interface ${pascal}Output {`,
    ...(outputFields.length ? outputFields : ['  // sem projeção declarada']),
    '}',
    '',
    `export const ${args.call.bffId}Route = '${args.call.route}' as const;`,
    '',
  ].join('\n');
}

export function buildNs4ClassicSiteMap(model: Ns4E8Model, classic: Ns4ClassicWorkspace[]): Ns4ClassicSiteMap {
  const byId = new Map(model.workspaces.map(workspace => [workspace.workspaceId, workspace]));
  const hub = model.workspaces.find(workspace => workspace.tier === 'hub');
  return {
    moduleName: model.moduleName,
    note: 'Site map (permanent page index) — workspaces, landings and advisory edges. Detail (sections/organisms/bffCalls) lives per-workspace under workspaces/.',
    workspaces: classic.map(workspace => ({
      workspaceId: workspace.workspaceId, title: workspace.title, actors: workspace.actors,
      kind: workspace.kind, entity: workspace.entity, operationIds: workspace.operationIds, purpose: workspace.purpose,
    })),
    landings: model.landings.map(landing => ({
      actorId: landing.profileRef, workspaceId: landing.workspaceId,
      reason: byId.get(landing.workspaceId)?.purpose || '',
    })),
    // A journey is reached from the hub that anchors it, never from the menu: the edge records that.
    navigationEdges: hub ? (hub.hubCatalogue?.items || [])
      .filter(item => byId.has(item.targetRef))
      .map(item => ({ from: hub.workspaceId, to: item.targetRef, operationId: '', description: item.label }))
      : [],
    workspaceIds: classic.map(workspace => workspace.workspaceId),
  };
}

function identityFieldOf(entity: Ns4OntologyEntity | undefined): string {
  return entity?.storage.idField || entity?.fields.find(field => /Id$/.test(field.fieldId))?.fieldId || '';
}
function classicType(type: Ns4OntologyField['type']): string {
  if (type === 'number' || type === 'integer' || type === 'money') return 'number';
  if (type === 'boolean') return 'boolean';
  return 'string';
}
function tsType(type: string | undefined): string {
  return type === 'number' || type === 'boolean' ? type : 'string';
}

function upperCamel(value: string): string {
  return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : '';
}

export interface Ns4ClassicL4 {
  workspaces: Ns4ClassicWorkspace[];
  operations: Ns4ClassicOperation[];
  contracts: Array<{ workspaceId: string; bffId: string; route: string; source: string }>;
  siteMap: Ns4ClassicSiteMap;
}

/** The whole transposition: what E9 writes to L4 from an approved E8 model. */
export async function compileNs4ClassicL4(model: Ns4E8Model, ontology: Ns4E4Review): Promise<Ns4ClassicL4> {
  const operations = new Map(model.operations.map(operation => [operation.operationId, operation]));
  const workspaces: Ns4ClassicWorkspace[] = [];
  for (const workspace of model.workspaces) {
    const sliceHash = await hashNs4Slice({ workspaceId: workspace.workspaceId, bffCalls: workspace.bffCalls, sections: workspace.sections });
    workspaces.push(transposeNs4ClassicWorkspace(model, workspace, operations, ontology, sliceHash));
  }
  const contracts = workspaces.flatMap(workspace => workspace.bffCalls.map(call => ({
    workspaceId: workspace.workspaceId, bffId: call.bffId, route: call.route,
    source: buildNs4ClassicContractSource({
      moduleName: model.moduleName, workspaceId: workspace.workspaceId, call,
      fileRef: `_${'{project}'}_/l4/${model.moduleName}/contracts/${workspace.workspaceId}.${call.bffId}.defs.ts`,
      sourceRef: `l4/${model.moduleName}/workspaces/${workspace.workspaceId}.defs.ts`,
    }),
  })));
  return {
    workspaces,
    operations: model.operations.map(operation => transposeNs4ClassicOperation(model, operation, ontology)),
    contracts,
    siteMap: buildNs4ClassicSiteMap(model, workspaces),
  };
}

async function hashNs4Slice(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].slice(0, 4).map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export type Ns4ClassicInput = Ns4E8Input;
