/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e10/gate.ts" enhancement="_blank"/>

/**
 * E10 validates the complete saved L4 graph before any L5 delivery. Its authority over E8/E9 is
 * recompilation: the approved model is compiled again and compared, byte for byte, with what E9
 * actually wrote — a saved artifact that drifted from its source is stale, not merely different.
 */

import { sha256Ns4, type Ns4PolicyDecision } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/modelGate.js';
import { compileNs4ClassicL4 } from '/_102020_/l2/agentNewSolution4/steps/e9/classic.js';
import {
  compileNs4L5ModuleNavigation, NS4_E10_VALIDATION_REPORT_VERSION,
  type Ns4E10CheckSummary, type Ns4E10Issue, type Ns4E10RepairStep, type Ns4E10Sources, type Ns4E10ValidationReport,
} from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';

type Add = (bucket: 'errors' | 'warnings' | 'registrars', issue: Ns4E10Issue) => void;

/** Findings no step can repair, because the source they read was written wrong by the pipeline. */
const PIPELINE_DEFECT_CODES = new Set(['NS4_E10_POLICY_DECISIONS_ABSENT']);

export async function validateNs4E10(sources: Ns4E10Sources): Promise<Ns4E10ValidationReport> {
  const errors: Ns4E10Issue[] = []; const warnings: Ns4E10Issue[] = []; const registrars: Ns4E10Issue[] = [];
  const add: Add = (bucket, issue) => ({ errors, warnings, registrars })[bucket].push(issue);

  validateModel(sources, add);
  await validateEmissionFreshness(sources, add);
  validateDecisionCoherence(sources, add);
  validateDisclosureRegistrars(sources, add);
  validateWorkflows(sources, add);
  validateSourceHashes(sources, add);
  const dormantDecisions = dormantCommandDecisions(sources, add);

  const policyDecisions = [...(sources.journeyIndex.policyDecisionSelections || [])].sort((left, right) => left.decisionId.localeCompare(right.decisionId));
  const systemDecisions = uniqueDecisions([
    ...(sources.journeyIndex.systemDecisions || []),
    ...('systemDecisions' in sources.workflowIndex ? sources.workflowIndex.systemDecisions || [] : []),
    ...sources.model.systemDecisions,
    ...dormantDecisions,
  ]);
  // A defect of our own pipeline outranks any content repair: sending the module back to a step
  // that reads a broken source would re-run everything and land in the same place.
  const pipelineDefect = errors.some(error => PIPELINE_DEFECT_CODES.has(error.code));
  const repairStep = pipelineDefect ? undefined
    : earliestRepair(errors.map(error => error.repairStep).filter((value): value is Ns4E10RepairStep => !!value));
  const value = {
    schemaVersion: NS4_E10_VALIDATION_REPORT_VERSION, moduleName: sources.moduleName, userLanguage: sources.userLanguage,
    finalStatus: errors.length ? 'failed' as const : 'passed' as const,
    checks: summarizeChecks(errors, warnings, registrars),
    errors: uniqueIssues(errors), warnings: uniqueIssues(warnings), registrars: uniqueIssues(registrars),
    policyDecisions, systemDecisions, ...(repairStep ? { repairStep } : {}), ...(pipelineDefect ? { pipelineDefect: true as const } : {}),
    sourceHashes: {
      journeys: sources.journeyIndex.journeys.map(item => ({ journeyId: item.journeyId, businessHash: item.businessHash })).sort((left, right) => left.journeyId.localeCompare(right.journeyId)),
      accessHash: sources.access.accessHash, ontologyHash: sources.ontologyIndex.ontologyHash, rulesHash: sources.rules.rulesHash,
    },
    counts: {
      journeys: sources.journeys.journeys.length, workspaces: sources.saved.workspaces.length,
      operations: sources.saved.operations.length, contracts: sources.saved.contracts.length,
      decisions: policyDecisions.length + systemDecisions.length,
    },
    menuPreview: compileNs4L5ModuleNavigation(sources),
  };
  return { ...value, reportHash: await sha256Ns4(value) };
}

/** The approved model must still satisfy its own gate; a model that no longer does is an E8 repair. */
function validateModel(sources: Ns4E10Sources, add: Add): void {
  const gate = validateNs4E8Model(sources.model, {
    journeys: sources.journeys,
    access: { planId: 'e3-access-review', moduleName: sources.access.moduleName, userLanguage: sources.access.userLanguage,
      title: sources.access.title, reviewRound: 1, profiles: sources.access.profiles, authorities: sources.access.authorities,
      grants: sources.access.grants.map(grant => 'useRules' in grant ? grant : { ...grant, useRules: [] }), changeSummary: [] },
    ontology: sources.ontology,
    useCases: sources.useCases, workflows: sources.workflows,
    policyDecisionSelections: sources.journeyIndex.policyDecisionSelections || [],
  });
  gate.issues.forEach(issue => add(issue.severity === 'warning' ? 'registrars' : 'errors',
    { code: issue.code, path: issue.path, message: issue.message, ...(issue.severity === 'warning' ? {} : { repairStep: 'e8-workspaces' as const }) }));
}

/** Recompile and compare: an artifact on disk that differs from its source is stale, not a variant. */
async function validateEmissionFreshness(sources: Ns4E10Sources, add: Add): Promise<void> {
  const expected = await compileNs4ClassicL4(sources.model, sources.ontology);
  const stale = (code: string, path: string, message: string) => add('errors', { code, path, message, repairStep: 'e9-navigation-compiler' });

  compare(expected.workspaces, sources.saved.workspaces, item => item.workspaceId, 'workspace',
    (id, reason) => stale('NS4_E10_WORKSPACE_STALE', `workspaces.${id}`, reason));
  compare(expected.operations, sources.saved.operations, item => item.operationId, 'operation',
    (id, reason) => stale('NS4_E10_OPERATION_STALE', `operations.${id}`, reason));
  compare(expected.contracts, sources.saved.contracts, item => `${item.workspaceId}.${item.bffId}`, 'contract',
    (id, reason) => stale('NS4_E10_CONTRACT_STALE', `contracts.${id}`, reason));
  if (stableStringify(expected.siteMap) !== stableStringify(sources.saved.siteMap)) {
    stale('NS4_E10_SITEMAP_STALE', 'siteMap', 'The saved site map differs from the one the approved model compiles.');
  }
}

function compare<T>(expected: T[], saved: T[], key: (item: T) => string, label: string, report: (id: string, reason: string) => void): void {
  const savedById = new Map(saved.map(item => [key(item), item]));
  for (const item of expected) {
    const current = savedById.get(key(item));
    if (!current) { report(key(item), `The approved model compiles ${label} ${key(item)}, which is not saved in L4.`); continue; }
    if (stableStringify(current) !== stableStringify(item)) report(key(item), `Saved ${label} ${key(item)} differs from the one the approved model compiles.`);
    savedById.delete(key(item));
  }
  for (const id of savedById.keys()) report(id, `Saved ${label} ${id} has no counterpart in the approved model.`);
}

/**
 * Decisions and selections are compared inside the SAME permanent artifact. Reading the bodies from
 * the journey artifacts made this check unsatisfiable by construction: E7 rewrites them as
 * realized-v5, which carries no policyDecisions, so every selection looked unknown.
 */
function validateDecisionCoherence(sources: Ns4E10Sources, add: Add): void {
  const selections = new Map((sources.journeyIndex.policyDecisionSelections || []).map(selection => [selection.decisionId, selection]));
  const decisions = new Map<string, Ns4PolicyDecision>(
    (sources.journeyIndex.policyDecisions || []).map(decision => [decision.decisionId, decision]));
  // An index that answers decisions it does not carry was written by a pipeline that lost them:
  // our defect, not the product's. Sending the module back to E2 would re-run everything for nothing.
  if (!decisions.size && selections.size) {
    add('errors', { code: 'NS4_E10_POLICY_DECISIONS_ABSENT', path: 'journeys.index.policyDecisions',
      message: `The journey index persists ${selections.size} selections and no decision to answer; the approved index lost the decision bodies.` });
    return;
  }
  for (const [decisionId, decision] of decisions) {
    const selection = selections.get(decisionId);
    if (!selection) {
      add('errors', { code: 'NS4_E10_POLICY_SELECTION_MISSING', path: `policyDecisions.${decisionId}`, message: `Approved journey decision ${decisionId} has no persisted selection.`, repairStep: 'e2-journeys' });
      continue;
    }
    if (selection.selectedChoice !== decision.chosen && !decision.alternatives.includes(selection.selectedChoice)) {
      add('errors', { code: 'NS4_E10_POLICY_SELECTION_VALUE', path: `policyDecisions.${decisionId}`, message: `Persisted selection for ${decisionId} is neither the generated choice nor a declared alternative.`, repairStep: 'e2-journeys' });
    }
  }
  for (const decisionId of selections.keys()) {
    if (!decisions.has(decisionId)) add('errors', { code: 'NS4_E10_POLICY_SELECTION_UNKNOWN', path: `policyDecisions.${decisionId}`, message: `Persisted selection ${decisionId} has no approved journey decision.`, repairStep: 'e2-journeys' });
  }
}

/** Disclosure stays a registrar: E3 allowedInformation is prose and is never matched to field ids. */
function validateDisclosureRegistrars(sources: Ns4E10Sources, add: Add): void {
  sources.model.systemDecisions
    .filter(decision => decision.findingRef.startsWith('NS4_E8_DISCLOSURE') || decision.findingRef.startsWith('NS4_E8_PICKER_SOURCE'))
    .forEach(decision => add('registrars', { code: decision.findingRef.split(':')[0], path: decision.findingRef, message: decision.question }));
}

function validateWorkflows(sources: Ns4E10Sources, add: Add): void {
  for (const workflow of sources.workflows) {
    const stateSet = new Set(workflow.states);
    if (!stateSet.has(workflow.initialState)) {
      add('errors', { code: 'NS4_E10_FSM_INITIAL', path: workflow.workflowId, message: `Workflow ${workflow.workflowId} declares an initial state outside its own state set.`, repairStep: 'e7-realization' });
    }
    const reachable = new Set([workflow.initialState]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const transition of workflow.transitions) {
        if (!transition.fromStates.some(state => reachable.has(state)) || reachable.has(transition.toState)) continue;
        reachable.add(transition.toState); grew = true;
      }
    }
    const unreachable = workflow.states.filter(state => !reachable.has(state));
    if (unreachable.length) add('errors', { code: 'NS4_E10_FSM_UNREACHABLE', path: workflow.workflowId, message: `Workflow ${workflow.workflowId} keeps unreachable state(s): ${unreachable.join(', ')}.`, repairStep: 'e7-realization' });
    const missing = workflow.transitions.flatMap(transition => [...transition.fromStates, transition.toState]).filter(state => !stateSet.has(state));
    if (missing.length) add('errors', { code: 'NS4_E10_FSM_TRANSITION_STATE', path: workflow.workflowId, message: `Workflow ${workflow.workflowId} transitions through undeclared state(s): ${[...new Set(missing)].join(', ')}.`, repairStep: 'e7-realization' });
  }
}

function validateSourceHashes(sources: Ns4E10Sources, add: Add): void {
  const hashes = sources.useCaseIndex.sourceHashes;
  const journeyHashes = sources.journeyIndex.journeys.map(item => ({ journeyId: item.journeyId, businessHash: item.businessHash })).sort((left, right) => left.journeyId.localeCompare(right.journeyId));
  if (stableStringify([...hashes.journeys].sort((left, right) => left.journeyId.localeCompare(right.journeyId))) !== stableStringify(journeyHashes)) {
    add('errors', { code: 'NS4_E10_JOURNEY_STALE', path: 'useCaseIndex.sourceHashes.journeys', message: 'Compiled use cases were built from different journey hashes than the approved index.', repairStep: 'e7-realization' });
  }
  if (hashes.ontologyHash !== sources.ontologyIndex.ontologyHash) add('errors', { code: 'NS4_E10_ONTOLOGY_STALE', path: 'useCaseIndex.sourceHashes.ontologyHash', message: 'Compiled use cases were built from a different ontology hash.', repairStep: 'e7-realization' });
  if (hashes.rulesHash !== sources.rules.rulesHash) add('errors', { code: 'NS4_E10_RULES_STALE', path: 'useCaseIndex.sourceHashes.rulesHash', message: 'Compiled use cases were built from a different rules hash.', repairStep: 'e7-realization' });
  const useCaseById = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase]));
  sources.useCaseIndex.useCases.forEach(entry => {
    if (useCaseById.get(entry.useCaseId)?.useCaseHash !== entry.useCaseHash) add('errors', { code: 'NS4_E10_USECASE_STALE', path: `useCases.${entry.useCaseId}`, message: `Saved use case ${entry.useCaseId} does not match its index hash.`, repairStep: 'e7-realization' });
  });
  const workflowById = new Map(sources.workflows.map(workflow => [workflow.workflowId, workflow]));
  sources.workflowIndex.workflows.forEach(entry => {
    if (workflowById.get(entry.workflowId)?.workflowHash !== entry.workflowHash) add('errors', { code: 'NS4_E10_WORKFLOW_STALE', path: `workflows.${entry.workflowId}`, message: `Saved workflow ${entry.workflowId} does not match its index hash.`, repairStep: 'e7-realization' });
  });
}

/**
 * A command whose approved transitions no longer exist in any compiled workflow stays visible and
 * becomes an auditable decision naming the evidence it lacks; it never blocks the delivery.
 */
function dormantCommandDecisions(sources: Ns4E10Sources, add: Add): Ns4SystemDecision[] {
  const available = new Set(sources.workflows.flatMap(workflow => workflow.transitions.map(transition => transition.transitionId)));
  const decisions: Ns4SystemDecision[] = [];
  const portuguese = sources.userLanguage.toLowerCase().startsWith('pt');
  for (const operation of sources.model.operations) {
    if (!operation.transitionRefs.length) continue;
    const missing = operation.transitionRefs.filter(ref => !available.has(ref));
    if (!missing.length) continue;
    const decision: Ns4SystemDecision = {
      decisionId: `e10Dormant${upperCamel(operation.operationId)}`, stage: 'e10-validation',
      question: portuguese
        ? `A ação ${operation.title} continua visível, mas a transição ${missing.join(', ')} não é alcançável nesta versão.`
        : `The ${operation.title} action stays visible, but transition ${missing.join(', ')} is not reachable in this version.`,
      chosen: 'keepDormantCommand', alternatives: ['extendJourneyToReachRequiredState'], decidedBy: 'system',
      findingRef: `NS4_E10_DORMANT_COMMAND:${operation.operationId}`,
      changeHint: `Extend an approved journey so transition(s) ${missing.join(', ')} become reachable in E7.`,
    };
    decisions.push(decision);
    add('registrars', { code: 'NS4_E10_DORMANT_COMMAND', path: decision.findingRef, message: decision.question });
  }
  return decisions;
}

const REPAIR_ORDER: Ns4E10RepairStep[] = ['e2-journeys', 'e3-access-matrix', 'e4-ontology', 'e5-rules', 'e6-behaviors', 'e7-realization', 'e8-workspaces', 'e9-navigation-compiler'];
function earliestRepair(steps: Ns4E10RepairStep[]): Ns4E10RepairStep | undefined {
  return REPAIR_ORDER.find(step => steps.includes(step));
}
/** Every finding belongs to one named check, so the report keeps the A1-A8 contract it always had. */
const CHECK_OF: Array<[RegExp, Ns4E10CheckSummary['checkId']]> = [
  [/^NS4_E8_(MENU|LANDING|STEP_UNHOSTED|EMPTY_JOURNEY)/, 'A2-journeys'],
  [/^NS4_E10_POLICY/, 'A3-decisions'],
  [/^NS4_E8_(DISCLOSURE|PICKER_SOURCE)/, 'A4-disclosure'],
  [/^NS4_E10_FSM/, 'A5-fsm'],
  [/^NS4_E10_(WORKSPACE_STALE|OPERATION_STALE|CONTRACT_STALE|SITEMAP_STALE|JOURNEY_STALE|ONTOLOGY_STALE|RULES_STALE|USECASE_STALE|WORKFLOW_STALE)/, 'A6-staleness'],
  [/^NS4_E10_DORMANT_COMMAND/, 'A8-dormant-commands'],
];
function checkOf(code: string): Ns4E10CheckSummary['checkId'] {
  return CHECK_OF.find(([pattern]) => pattern.test(code))?.[1] || 'A1-resolution';
}
function summarizeChecks(errors: Ns4E10Issue[], warnings: Ns4E10Issue[], registrars: Ns4E10Issue[]): Ns4E10CheckSummary[] {
  const ids: Ns4E10CheckSummary['checkId'][] = ['A1-resolution', 'A2-journeys', 'A3-decisions', 'A4-disclosure', 'A5-fsm', 'A6-staleness', 'A7-warnings', 'A8-dormant-commands'];
  return ids.map(checkId => {
    const errorCount = errors.filter(issue => checkOf(issue.code) === checkId).length;
    const warningCount = checkId === 'A7-warnings' ? warnings.length : warnings.filter(issue => checkOf(issue.code) === checkId).length;
    const registrarCount = registrars.filter(issue => checkOf(issue.code) === checkId).length;
    return { checkId, status: errorCount ? 'failed' as const : registrarCount ? 'reported' as const : 'passed' as const, errorCount, warningCount, registrarCount };
  });
}
function uniqueIssues(issues: Ns4E10Issue[]): Ns4E10Issue[] {
  return [...new Map(issues.map(issue => [`${issue.code}:${issue.path}`, issue])).values()]
    .sort((left, right) => `${left.code}:${left.path}`.localeCompare(`${right.code}:${right.path}`));
}
function uniqueDecisions(decisions: Ns4SystemDecision[]): Ns4SystemDecision[] {
  return [...new Map(decisions.map(decision => [decision.decisionId, decision])).values()]
    .sort((left, right) => left.decisionId.localeCompare(right.decisionId));
}
function stableStringify(value: unknown): string { return JSON.stringify(value); }
function upperCamel(value: string): string { return value ? value.slice(0, 1).toUpperCase() + value.slice(1) : ''; }
