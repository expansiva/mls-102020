/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/gate.ts" enhancement="_blank"/>

// E7 — deterministic global validation + closing (NO LLM). PURE functions only:
// every input arrives as a parameter (no stor access), so gate.test.ts runs under
// node:test without the browser runtime. The agent reads the saved artifacts from
// disk and feeds them here.

import { errorIssue, NsGateIssue, warningIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  NsE3EntityArtifact,
  NsE3ModelArtifact,
  NsE3Relationship,
} from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

export interface NsE7ClassificationWorkflow {
  workflowId: string;
  actorId: string;
  primaryEntity: string;
  featureRefs: string[];
  operationIds: string[];
}

export interface NsE7ClassificationOperation {
  operationId: string;
  actorId: string;
  entity: string;
  kind: string;
  featureRefs: string[];
  workflowId?: string;
}

export interface NsE7Classification {
  workflows: NsE7ClassificationWorkflow[];
  operations: NsE7ClassificationOperation[];
}

// Loose shapes for the defs saved by E5/E6: E7 only reads the fields it checks.
export interface NsE7WorkflowDef {
  workflowId?: string;
  title?: string;
  pageId?: string;
  actor?: string;
  actors?: string[];
  operationIds?: string[];
  entities?: string[];
  rulesApplied?: string[];
  capabilities?: { capabilityId?: string }[];
}

export interface NsE7OperationDef {
  operationId?: string;
  title?: string;
  actor?: string;
  entity?: string;
  kind?: string;
  reads?: string[];
  writes?: string[];
  rulesApplied?: string[];
  pageId?: string;
  commandName?: string;
  bffName?: string;
  accessPattern?: { kind?: string; keyField?: string; pagination?: unknown; output?: string };
  capability?: { capabilityId?: string };
}

export interface NsE7Workspace {
  workspaceId: string;
  operationIds: string[];
  actor: string;
  workflowId?: string;
}

export interface NsE7JourneyMap {
  workspaces: NsE7Workspace[];
  landings: unknown[];
}

export interface NsE7HealthInput {
  moduleName: string;
  e2: NsE2JourneysArtifact;
  model: NsE3ModelArtifact;
  entities: NsE3EntityArtifact[];
  e4: { actors: { actorId: string }[]; rules: { ruleId: string }[] };
  classification: NsE7Classification;
  workflowDefs: NsE7WorkflowDef[];
  operationDefs: NsE7OperationDef[];
  journeyMap: NsE7JourneyMap | null;
}

export interface NsE7HealthReport {
  passed: boolean;
  counts: { entities: number; workflows: number; operations: number; workspaces: number };
  errors: NsGateIssue[];
  warnings: NsGateIssue[];
}

export interface NsE7ExternalRefs {
  mdm: unknown[];
  horizontals: unknown[];
  plugins: unknown[];
  agents: unknown[];
}

export interface NsE7ModuleDefsArgs {
  moduleName: string;
  model: NsE3ModelArtifact;
  entities: NsE3EntityArtifact[];
  e1Draft: Record<string, unknown> | null;
  e2: NsE2JourneysArtifact;
  e4ExternalRefs: NsE7ExternalRefs;
  journeyDefPath: string;
}

export interface NsE7ModuleDecision {
  recommendationId: string;
  artifactType: 'decision';
  title: string;
  decidedPriority: string;
  accepted: true;
}

export interface NsE7OntologyIndexEntry {
  title: string;
  description: string;
  kind: string;
  ownership: string;
  statusEnum?: string[];
  lifecycleStates?: string[];
}

export interface NsE7ModuleDefs {
  module: { moduleName: string; title: string; purpose: string; businessDomain: string; languages: string[]; visualStyle: string };
  designContext: {
    initialPrompt: string;
    userLanguage: string;
    openDetails: { title: string; description: string }[];
    decisions: NsE7ModuleDecision[];
  };
  ontology: { entities: Record<string, NsE7OntologyIndexEntry> };
  journey: { defPath: string };
  relationships: NsE3Relationship[];
  approvedArtifacts: NsE7ExternalRefs;
}

export interface NsE7TodoOwner {
  ownerType: 'workflow' | 'operation';
  ownerId: string;
  title: string;
  status: 'toCreate';
  defPath: string;
  pageId: string;
  capabilityId: string;
  commandName?: string;
  bffName?: string;
}

export interface NsE7NextStep {
  id: string;
  title: string;
  description: string;
}

// ---------------------------------------------------------------------------
// health report
// ---------------------------------------------------------------------------

export function computeNsHealthReport(input: NsE7HealthInput): NsE7HealthReport {
  const issues: NsGateIssue[] = [];

  const entityIds = new Set(input.entities.map(entity => entity.entityId));
  const entityFieldIds = new Map<string, Set<string>>(
    input.entities.map(entity => [entity.entityId, new Set(entity.fields.map(field => field.fieldId))]),
  );
  const actorIds = new Set(input.e4.actors.map(actor => actor.actorId));
  const ruleIds = new Set(input.e4.rules.map(rule => rule.ruleId));
  const workflowDefIds = new Set(input.workflowDefs.map(def => def.workflowId || '').filter(Boolean));
  const operationDefIds = new Set(input.operationDefs.map(def => def.operationId || '').filter(Boolean));

  // plan.disk.divergence: the E5 classification and the defs on disk must be the same set.
  const classifiedWorkflowIds = new Set(input.classification.workflows.map(workflow => workflow.workflowId));
  const classifiedOperationIds = new Set(input.classification.operations.map(operation => operation.operationId));
  for (const id of classifiedWorkflowIds) {
    if (!workflowDefIds.has(id)) issues.push(errorIssue('plan.disk.divergence', `classified workflow '${id}' has no def on disk (l4/${input.moduleName}/workflows/${id}.defs.ts)`));
  }
  for (const id of workflowDefIds) {
    if (!classifiedWorkflowIds.has(id)) issues.push(errorIssue('plan.disk.divergence', `workflow def '${id}' is not declared in e5-classification.json`));
  }
  for (const id of classifiedOperationIds) {
    if (!operationDefIds.has(id)) issues.push(errorIssue('plan.disk.divergence', `classified operation '${id}' has no def on disk (l4/${input.moduleName}/operations/${id}.defs.ts)`));
  }
  for (const id of operationDefIds) {
    if (!classifiedOperationIds.has(id)) issues.push(errorIssue('plan.disk.divergence', `operation def '${id}' is not declared in e5-classification.json`));
  }

  for (const def of input.workflowDefs) {
    const workflowId = def.workflowId || '(unknown)';
    const operationIds = def.operationIds || [];
    if (operationIds.length === 0) {
      issues.push(errorIssue('workflow.operations.missing', `workflow ${workflowId} has an empty operationIds list`));
    }
    for (const operationId of operationIds) {
      if (!operationDefIds.has(operationId)) {
        issues.push(errorIssue('workflow.operation.unknown', `workflow ${workflowId}: orchestrated operation '${operationId}' does not exist`));
      }
    }
    for (const entityId of def.entities || []) {
      if (!entityIds.has(entityId)) {
        issues.push(errorIssue('entity.ref.unknown', `workflow ${workflowId}: entity '${entityId}' is not in the ontology`));
      }
    }
    for (const actor of collectDefActors(def)) {
      if (!actorIds.has(actor)) issues.push(errorIssue('actor.unknown', `workflow ${workflowId}: actor '${actor}' is not in the e4 roster`));
    }
    for (const ruleId of def.rulesApplied || []) {
      if (!ruleIds.has(ruleId)) issues.push(warningIssue('rule.unknown', `workflow ${workflowId}: applied rule '${ruleId}' is not in the e4 rule set`));
    }
  }

  for (const def of input.operationDefs) {
    const operationId = def.operationId || '(unknown)';
    if (def.entity && !entityIds.has(def.entity)) {
      issues.push(errorIssue('entity.ref.unknown', `operation ${operationId}: entity '${def.entity}' is not in the ontology`));
    }
    for (const ref of [...(def.reads || []), ...(def.writes || [])]) {
      // reads/writes accept 'Entity' or 'Entity.field'; the entity part must resolve.
      const refEntity = ref.split('.')[0];
      if (!entityIds.has(refEntity)) {
        issues.push(errorIssue('entity.ref.unknown', `operation ${operationId}: reads/writes reference unknown entity '${refEntity}'`));
      }
    }
    if (def.actor && !actorIds.has(def.actor)) {
      issues.push(errorIssue('actor.unknown', `operation ${operationId}: actor '${def.actor}' is not in the e4 roster`));
    }
    for (const ruleId of def.rulesApplied || []) {
      if (!ruleIds.has(ruleId)) issues.push(warningIssue('rule.unknown', `operation ${operationId}: applied rule '${ruleId}' is not in the e4 rule set`));
    }

    // Deterministic naming re-check: bffName = {module}.{pageId}.{commandName}.
    const pageId = readTrimmed(def.pageId);
    const commandName = readTrimmed(def.commandName);
    if (!pageId) issues.push(errorIssue('operation.pageId.missing', `operation ${operationId}: pageId is missing`));
    if (!commandName) issues.push(errorIssue('operation.commandName.missing', `operation ${operationId}: commandName is missing`));
    if (pageId && commandName) {
      const expected = `${input.moduleName}.${pageId}.${commandName}`;
      if (def.bffName !== expected) {
        issues.push(errorIssue('operation.bffName.mismatch', `operation ${operationId}: bffName '${def.bffName || ''}' must be '${expected}'`));
      }
    }

    if (!def.accessPattern) {
      issues.push(errorIssue('operation.accessPattern.missing', `operation ${operationId}: accessPattern is missing`));
    } else {
      const keyField = readTrimmed(def.accessPattern.keyField) || '';
      const [keyEntity, keyFieldId] = keyField.split('.');
      const knownFields = keyEntity ? entityFieldIds.get(keyEntity) : undefined;
      if (!keyFieldId || !knownFields || !knownFields.has(keyFieldId)) {
        issues.push(errorIssue('operation.accessPattern.key.unknown', `operation ${operationId}: accessPattern.keyField '${keyField}' does not resolve to an existing Entity.field`));
      }
    }
  }

  // Journey coverage: every operation must be reachable from at least one workspace.
  const workspaces = input.journeyMap?.workspaces || [];
  if (!input.journeyMap) {
    issues.push(errorIssue('journey.missing', `journey map defs not found (l4/${input.moduleName}/navigation.defs.ts + l4/${input.moduleName}/workspaces/)`));
  } else {
    const reachable = new Set<string>();
    for (const workspace of workspaces) {
      for (const operationId of workspace.operationIds || []) {
        reachable.add(operationId);
        if (!operationDefIds.has(operationId)) {
          issues.push(errorIssue('journey.workspace.operation.unknown', `workspace ${workspace.workspaceId}: operation '${operationId}' does not exist`));
        }
      }
    }
    for (const operationId of operationDefIds) {
      if (!reachable.has(operationId)) {
        issues.push(errorIssue('journey.operation.unreachable', `operation '${operationId}' is not reachable from any workspace`));
      }
    }
  }

  // Capability coverage: every non-never E2 feature must be owned by the classification.
  const ownedFeatures = new Set([
    ...input.classification.workflows.flatMap(workflow => workflow.featureRefs || []),
    ...input.classification.operations.flatMap(operation => operation.featureRefs || []),
  ]);
  for (const feature of input.e2.features) {
    if (feature.priority === 'never' || ownedFeatures.has(feature.featureId)) continue;
    const message = `feature '${feature.featureId}' (${feature.priority}) is not covered by any workflow/operation featureRefs`;
    issues.push(feature.priority === 'now' ? errorIssue('capability.unowned', message) : warningIssue('capability.unowned', message));
  }

  // Capability ownership: a capability spread over several workspaces is a smell (warning).
  const capabilityWorkspaces = new Map<string, Set<string>>();
  for (const def of input.operationDefs) {
    const capabilityId = readTrimmed(def.capability?.capabilityId);
    const operationId = def.operationId || '';
    if (!capabilityId || !operationId) continue;
    for (const workspace of workspaces) {
      if (!(workspace.operationIds || []).includes(operationId)) continue;
      const owners = capabilityWorkspaces.get(capabilityId) || new Set<string>();
      owners.add(workspace.workspaceId);
      capabilityWorkspaces.set(capabilityId, owners);
    }
  }
  for (const [capabilityId, owners] of capabilityWorkspaces) {
    if (owners.size > 1) {
      issues.push(warningIssue('capability.multiowned', `capability '${capabilityId}' is owned by ${owners.size} workspaces (${[...owners].sort().join(', ')})`));
    }
  }

  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  return {
    passed: errors.length === 0,
    counts: {
      entities: input.entities.length,
      workflows: input.workflowDefs.length,
      operations: input.operationDefs.length,
      workspaces: workspaces.length,
    },
    errors,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// closing artifacts
// ---------------------------------------------------------------------------

export function buildNsModuleDefs(args: NsE7ModuleDefsArgs): NsE7ModuleDefs {
  const draft = args.e1Draft || {};
  const openQuestions = Array.isArray(draft.openQuestions) ? draft.openQuestions.filter(isRecord) : [];
  const openDetails = openQuestions.map((question, index) => ({
    title: readString(question.question) || readString(question.questionId) || `Open question ${index + 1}`,
    description: readString(question.impact) || readString(question.defaultAnswer) || '',
  }));

  const decisions: NsE7ModuleDecision[] = (args.e2.decisions || []).map(decision => {
    const record = decision as unknown as Record<string, unknown>;
    return {
      recommendationId: readString(record.decisionId) || readString(record.kind) || 'decision',
      artifactType: 'decision',
      title: readString(record.title) || readString(record.kind) || 'decision',
      decidedPriority: readString(record.priority) || 'now',
      accepted: true,
    };
  });

  const entities: Record<string, NsE7OntologyIndexEntry> = {};
  for (const entity of args.entities) {
    entities[entity.entityId] = {
      title: entity.title,
      description: entity.description,
      kind: entity.kind,
      ownership: entity.ownership,
      ...(entity.statusEnum?.length ? { statusEnum: entity.statusEnum } : {}),
      ...(entity.lifecycleStates?.length ? { lifecycleStates: entity.lifecycleStates } : {}),
    };
  }

  return {
    module: { moduleName: args.moduleName, ...args.model.module },
    designContext: {
      initialPrompt: readString(draft.sourcePrompt) || '',
      userLanguage: args.e2.userLanguage,
      openDetails,
      decisions,
    },
    ontology: { entities },
    journey: { defPath: args.journeyDefPath },
    relationships: args.model.relationships,
    approvedArtifacts: args.e4ExternalRefs,
  };
}

export function buildNsTodoOwners(args: {
  moduleName: string;
  workflowDefs: NsE7WorkflowDef[];
  operationDefs: NsE7OperationDef[];
}): NsE7TodoOwner[] {
  const owners: NsE7TodoOwner[] = [];
  for (const def of args.workflowDefs) {
    const workflowId = def.workflowId || '';
    if (!workflowId) continue;
    owners.push({
      ownerType: 'workflow',
      ownerId: workflowId,
      title: def.title || workflowId,
      status: 'toCreate',
      defPath: `l4/${args.moduleName}/workflows/${workflowId}.defs.ts`,
      pageId: def.pageId || workflowId,
      capabilityId: readTrimmed(def.capabilities?.[0]?.capabilityId) || '',
    });
  }
  for (const def of args.operationDefs) {
    const operationId = def.operationId || '';
    if (!operationId) continue;
    const pageId = def.pageId || operationId;
    const commandName = def.commandName || operationId;
    owners.push({
      ownerType: 'operation',
      ownerId: operationId,
      title: def.title || operationId,
      status: 'toCreate',
      defPath: `l4/${args.moduleName}/operations/${operationId}.defs.ts`,
      pageId,
      commandName,
      bffName: def.bffName || `${args.moduleName}.${pageId}.${commandName}`,
      capabilityId: readTrimmed(def.capability?.capabilityId) || '',
    });
  }
  return owners;
}

// ---------------------------------------------------------------------------
// markdown
// ---------------------------------------------------------------------------

export function renderE7Markdown(
  report: NsE7HealthReport,
  options: { moduleName: string; nextSteps: NsE7NextStep[] },
): string {
  const lines: string[] = [];
  lines.push(`# E7 — Validation & Closing: ${options.moduleName}`);
  lines.push('');
  lines.push(`- result: ${report.passed ? 'PASSED' : 'FAILED'} (${report.errors.length} error(s), ${report.warnings.length} warning(s))`);
  lines.push(`- entities: ${report.counts.entities} / workflows: ${report.counts.workflows} / operations: ${report.counts.operations} / workspaces: ${report.counts.workspaces}`);
  lines.push(`- full machine report: \`l4/${options.moduleName}/trace/behavior-health-report.json\``);
  lines.push('');
  if (report.errors.length) {
    lines.push('## Errors (upstream bugs — fix the producing step and rerun)');
    lines.push('');
    for (const issue of report.errors) lines.push(`- \`${issue.code}\` ${issue.message}`);
    lines.push('');
  }
  if (report.warnings.length) {
    lines.push('## Warnings (do not block)');
    lines.push('');
    for (const issue of report.warnings) lines.push(`- \`${issue.code}\` ${issue.message}`);
    lines.push('');
  }
  if (report.passed) {
    lines.push('## Closing artifacts');
    lines.push('');
    lines.push(`- \`l4/${options.moduleName}/module.defs.ts\` — module block + designContext + ontology index + relationships + approvedArtifacts`);
    lines.push(`- \`l5/${options.moduleName}/todoFrontend.defs.ts\` / \`l5/${options.moduleName}/todoBackend.defs.ts\` — generation-status source for Stage 2/3`);
    lines.push(`- \`l5/${options.moduleName}/process.defs.ts\` — run record + handoff notes`);
    lines.push('');
  }
  lines.push('## Next steps');
  lines.push('');
  for (const nextStep of options.nextSteps) lines.push(`- **${nextStep.title}** — ${nextStep.description}`);
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// small utils (pure)
// ---------------------------------------------------------------------------

function collectDefActors(def: NsE7WorkflowDef): string[] {
  const actors = Array.isArray(def.actors) ? def.actors : [];
  return def.actor ? [...actors, def.actor] : actors;
}

function readTrimmed(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readString(value: unknown): string | undefined {
  return readTrimmed(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
