import { sha256Ns4, type Ns4PolicyDecision } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { compileNs4E9, type Ns4E9Compilation } from '/_102020_/l2/agentNewSolution4/steps/e9/contracts.js';
import { validateNs4E9 } from '/_102020_/l2/agentNewSolution4/steps/e9/gate.js';
import {
  compileNs4L5ModuleNavigation, NS4_E10_MENU_LIMIT, NS4_E10_VALIDATION_REPORT_VERSION,
  type Ns4E10CheckSummary, type Ns4E10Issue, type Ns4E10RepairStep, type Ns4E10Sources, type Ns4E10ValidationReport,
} from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';

type Add = (bucket: 'errors' | 'warnings' | 'registrars', issue: Ns4E10Issue) => void;

export async function validateNs4E10(sources: Ns4E10Sources): Promise<Ns4E10ValidationReport> {
  const errors: Ns4E10Issue[] = []; const warnings: Ns4E10Issue[] = []; const registrars: Ns4E10Issue[] = [];
  const add: Add = (bucket, issue) => ({ errors, warnings, registrars })[bucket].push(issue);
  const expected = await compileNs4E9(sources);
  const e9Gate = validateNs4E9(sources, expected);
  e9Gate.issues.forEach(issue => add('errors', { ...issue, repairStep: 'e8-workspaces' }));
  validateE9Persistence(sources, expected, add);
  validateDecisionCoherence(sources, add);
  validateDisclosureRegistrars(sources, add);
  validateWorkflows(sources, add);
  validateSourceHashes(sources, add);
  validateAllowedWarnings(sources, add);
  const dormantDecisions = dormantCommandDecisions(sources, add);
  const policyDecisions = [...(sources.journeyIndex.policyDecisionSelections || [])].sort((left, right) => left.decisionId.localeCompare(right.decisionId));
  const systemDecisions = uniqueDecisions([
    ...(sources.journeyIndex.systemDecisions || []),
    ...('systemDecisions' in sources.workflowIndex ? sources.workflowIndex.systemDecisions || [] : []),
    ...sources.workspaceIndex.systemDecisions,
    ...dormantDecisions,
  ]);
  const repairStep = earliestRepair(errors.map(error => error.repairStep).filter((value): value is Ns4E10RepairStep => !!value));
  const checks = summarizeChecks(errors, warnings, registrars);
  const menuPreview = compileNs4L5ModuleNavigation(sources);
  const sourceHashes = {
    journeys: sources.journeyIndex.journeys.map(item => ({ journeyId: item.journeyId, businessHash: item.businessHash })).sort((left, right) => left.journeyId.localeCompare(right.journeyId)),
    accessHash: sources.access.accessHash, ontologyHash: sources.ontologyIndex.ontologyHash, rulesHash: sources.rules.rulesHash,
    skeletonHash: sources.workspaceIndex.skeletonHash, navigationHash: sources.navigation.navigationHash,
  };
  const counts = { journeys: sources.journeys.journeys.length, workspaces: sources.workspaces.length,
    scenarios: sources.workspaces.reduce((total, workspace) => total + workspace.scenarios.length, 0), contracts: sources.contracts.length,
    notifications: sources.notifications.entries.length, decisions: policyDecisions.length + systemDecisions.length };
  const value = {
    schemaVersion: NS4_E10_VALIDATION_REPORT_VERSION, moduleName: sources.workspaceIndex.moduleName,
    userLanguage: sources.workspaceIndex.userLanguage, finalStatus: errors.length ? 'failed' as const : 'passed' as const,
    checks, errors: uniqueIssues(errors), warnings: uniqueIssues(warnings), registrars: uniqueIssues(registrars),
    policyDecisions, systemDecisions, ...(repairStep ? { repairStep } : {}), sourceHashes, counts, menuPreview,
  };
  return { ...value, reportHash: await sha256Ns4(value) };
}

function validateE9Persistence(sources: Ns4E10Sources, expected: Ns4E9Compilation, add: Add): void {
  const mismatch = (code: string, path: string, actual: string, wanted: string) => {
    if (actual !== wanted) add('errors', { code, path, message: `Saved E9 artifact hash ${actual || '(missing)'} differs from current compiled hash ${wanted || '(missing)'}.`, repairStep: 'e9-navigation-compiler' });
  };
  mismatch('NS4_E10_NAVIGATION_STALE', 'navigation.navigationHash', sources.navigation.navigationHash, expected.navigation.navigationHash);
  mismatch('NS4_E10_STORE_STALE', 'navigation.storeHash', sources.store.storeHash, expected.store.storeHash);
  mismatch('NS4_E10_NOTIFICATIONS_STALE', 'navigation.notificationHash', sources.notifications.notificationHash, expected.notifications.notificationHash);
  mismatch('NS4_E10_ACCESS_STALE', 'access.realization.realizationHash', sources.access.realization.realizationHash, expected.access.realization.realizationHash);
  const saved = new Map(sources.contracts.map(contract => [contract.operationRef, contract]));
  const compiled = new Map(expected.contracts.map(contract => [contract.operationRef, contract]));
  for (const [operationRef, contract] of compiled) {
    const current = saved.get(operationRef);
    if (!current || current.contractHash !== contract.contractHash) add('errors', { code: 'NS4_E10_CONTRACT_STALE', path: operationRef,
      message: `Saved contract ${operationRef} is missing or stale.`, repairStep: 'e9-navigation-compiler' });
  }
  for (const operationRef of saved.keys()) if (!compiled.has(operationRef)) add('errors', { code: 'NS4_E10_CONTRACT_EXTRA', path: operationRef,
    message: `Saved contract ${operationRef} has no current approved workspace command.`, repairStep: 'e9-navigation-compiler' });
}

function validateDecisionCoherence(sources: Ns4E10Sources, add: Add): void {
  const selections = new Map((sources.journeyIndex.policyDecisionSelections || []).map(selection => [selection.decisionId, selection]));
  const policies = sources.journeys.journeys.flatMap(journey => (journey.policyDecisions || []).map(decision => ({ decision, ownerJourneyId: journey.journeyId })));
  for (const { decision, ownerJourneyId } of policies) {
    const selection = selections.get(decision.decisionId);
    if (!selection) { add('errors', { code: 'NS4_E10_POLICY_SELECTION_MISSING', path: decision.decisionId,
      message: `Approved policy decision ${decision.decisionId} has no durable selection.`, repairStep: 'e2-journeys' }); continue; }
    checkDecisionMode(sources, decision, selection.selectedChoice, decision.relatedJourneyIds?.length ? decision.relatedJourneyIds : [ownerJourneyId], add, decision.decisionId);
  }
  const priorSystem = [
    ...(sources.journeyIndex.systemDecisions || []),
    ...('systemDecisions' in sources.workflowIndex ? sources.workflowIndex.systemDecisions || [] : []),
    ...sources.workspaceIndex.systemDecisions,
  ];
  priorSystem.forEach(decision => {
    const related = sources.journeys.journeys.filter(journey => `${decision.findingRef} ${decision.changeHint}`.includes(journey.journeyId)).map(journey => journey.journeyId);
    if (related.length) checkDecisionMode(sources, { decisionId: decision.decisionId, question: decision.question, chosen: decision.chosen, alternatives: decision.alternatives }, decision.chosen, related, add, decision.findingRef);
  });
}

function checkDecisionMode(sources: Ns4E10Sources, decision: Ns4PolicyDecision, chosen: string, journeyIds: string[], add: Add, path: string): void {
  const mode = approvalMode(`${decision.question} ${chosen}`); if (mode === 'unknown') return;
  const journeys = sources.journeys.journeys.filter(journey => journeyIds.includes(journey.journeyId));
  const decideRefs = journeys.flatMap(journey => journey.business.steps.filter(step => step.kind === 'decide').map(step => `${journey.journeyId}.${step.stepId}`));
  const reviewRefs = sources.workspaces.flatMap(workspace => workspace.scenarios.filter(scenario => scenario.kind === 'review'
    && scenario.stepRefs.some(stepRef => journeyIds.some(journeyId => stepRef.startsWith(`${journeyId}.`)))).map(scenario => `${workspace.workspaceId}.${scenario.scenarioId}`));
  const realized = [...decideRefs, ...reviewRefs];
  if (mode === 'withoutApproval' && realized.length) add('errors', { code: 'NS4_E10_DECISION_CONTRADICTION', path,
    message: `Choice without approval conflicts with realized decision surfaces: ${realized.join(', ')}.`, repairStep: 'e2-journeys' });
  if (mode === 'requiresApproval' && !realized.length) add('errors', { code: 'NS4_E10_DECISION_MISSING', path,
    message: `Choice requiring approval has no decide step and review scenario in journeys ${journeyIds.join(', ')}.`, repairStep: 'e2-journeys' });
}

function validateDisclosureRegistrars(sources: Ns4E10Sources, add: Add): void {
  const decisions = sources.workspaceIndex.systemDecisions;
  for (const grant of sources.access.grants.filter(item => item.disclosure.mode === 'fieldsOnly')) for (const workspace of sources.workspaces) {
    if (!workspace.profileRefs.includes(grant.profileRef)) continue;
    const scenarios = workspace.scenarios.filter(scenario => scenario.authorityRefs.includes(grant.authorityRef)
      && scenario.organisms.some(organism => organism.fieldRefs.length));
    if (!scenarios.length) continue;
    const findingRef = `NS4_E8_DISCLOSURE:${workspace.workspaceId}:${grant.authorityRef}`;
    const decision = decisions.find(item => item.findingRef === findingRef);
    add('registrars', { code: decision ? 'NS4_E10_DISCLOSURE_RECORDED' : 'NS4_E10_DISCLOSURE_UNRECORDED', path: findingRef,
      message: decision ? `E8 disclosure decision retained: ${decision.chosen}.` : `fieldsOnly projection is present for ${grant.profileRef}; E8 has no matching disclosure systemDecision. This is reported without text-to-field comparison.` });
  }
}

function validateWorkflows(sources: Ns4E10Sources, add: Add): void {
  for (const workflow of sources.workflows) {
    const stateSet = new Set(workflow.states);
    if (!stateSet.has(workflow.initialState)) add('errors', { code: 'NS4_E10_FSM_INITIAL', path: workflow.workflowId,
      message: `Compiled workflow initial state ${workflow.initialState} is absent.`, repairStep: 'e7-realization' });
    const reachable = new Set([workflow.initialState]); let changed = true;
    while (changed) { changed = false; for (const transition of workflow.transitions) if (transition.fromStates.some(state => reachable.has(state)) && !reachable.has(transition.toState)) { reachable.add(transition.toState); changed = true; } }
    const unreachable = workflow.states.filter(state => !reachable.has(state));
    if (unreachable.length) add('errors', { code: 'NS4_E10_FSM_UNREACHABLE', path: workflow.workflowId,
      message: `Compiled workflow retains unreachable states: ${unreachable.join(', ')}.`, repairStep: 'e7-realization' });
    workflow.transitions.forEach(transition => {
      const missing = [...transition.fromStates, transition.toState].filter(state => !stateSet.has(state));
      if (missing.length) add('errors', { code: 'NS4_E10_FSM_TRANSITION_STATE', path: `${workflow.workflowId}.${transition.transitionId}`,
        message: `Compiled transition references absent states: ${[...new Set(missing)].join(', ')}.`, repairStep: 'e7-realization' });
    });
  }
}

function validateSourceHashes(sources: Ns4E10Sources, add: Add): void {
  const journeys = sources.journeyIndex.journeys.map(item => ({ journeyId: item.journeyId, businessHash: item.businessHash })).sort((a, b) => a.journeyId.localeCompare(b.journeyId));
  const validateE7Hashes = (label: string, hashes: typeof sources.useCaseIndex.sourceHashes) => {
    if (JSON.stringify([...hashes.journeys].sort((a, b) => a.journeyId.localeCompare(b.journeyId))) !== JSON.stringify(journeys)) add('errors', { code: 'NS4_E10_BUSINESS_HASH', path: `${label}.sourceHashes.journeys`, message: `${label} cites stale journey business hashes.`, repairStep: 'e7-realization' });
    if (hashes.ontologyHash !== sources.ontologyIndex.ontologyHash) add('errors', { code: 'NS4_E10_ONTOLOGY_HASH', path: `${label}.sourceHashes.ontologyHash`, message: `${label} cites a stale ontologyHash; rerun E7 after E4.`, repairStep: 'e7-realization' });
    if (hashes.rulesHash !== sources.rules.rulesHash) add('errors', { code: 'NS4_E10_RULES_HASH', path: `${label}.sourceHashes.rulesHash`, message: `${label} cites a stale rulesHash; rerun E7 after E5.`, repairStep: 'e7-realization' });
  };
  validateE7Hashes('useCaseIndex', sources.useCaseIndex.sourceHashes); validateE7Hashes('workflowIndex', sources.workflowIndex.sourceHashes);
  const useCaseById = new Map(sources.useCases.map(item => [item.useCaseId, item]));
  sources.useCaseIndex.useCases.forEach(entry => { if (useCaseById.get(entry.useCaseId)?.useCaseHash !== entry.useCaseHash) add('errors', { code: 'NS4_E10_USECASE_HASH', path: entry.useCaseId, message: `Use-case index hash differs from ${entry.useCaseId}.`, repairStep: 'e7-realization' }); });
  const workflowById = new Map(sources.workflows.map(item => [item.workflowId, item]));
  sources.workflowIndex.workflows.forEach(entry => { if (workflowById.get(entry.workflowId)?.workflowHash !== entry.workflowHash) add('errors', { code: 'NS4_E10_WORKFLOW_HASH', path: entry.workflowId, message: `Workflow index hash differs from ${entry.workflowId}.`, repairStep: 'e7-realization' }); });
  if (sources.ontologyIndex.realization.compiledFromOntologyHash !== sources.ontologyIndex.ontologyHash) add('errors', { code: 'NS4_E10_ONTOLOGY_SELF_HASH', path: 'ontology.realization', message: 'Ontology realization cites a stale ontology hash.', repairStep: 'e4-ontology' });
  if (sources.rules.realization.compiledFromRulesHash !== sources.rules.rulesHash) add('errors', { code: 'NS4_E10_RULES_SELF_HASH', path: 'rules.realization', message: 'Rules realization cites a stale rules hash.', repairStep: 'e5-rules' });
  if (sources.access.realization.compiledFromAccessHash !== sources.access.accessHash) add('errors', { code: 'NS4_E10_ACCESS_HASH', path: 'access.realization', message: 'Access realization cites a stale access hash.', repairStep: 'e9-navigation-compiler' });
}

function validateAllowedWarnings(sources: Ns4E10Sources, add: Add): void {
  for (const warning of sources.navigation.warnings) {
    if (warning.code === 'NS4_E9_JSON_UNKNOWN') add('warnings', warning);
    else add('registrars', { ...warning, code: 'NS4_E10_FIELD_TITLE_REGISTRAR' });
  }
  for (const workspace of sources.workspaces) for (const slice of workspace.viewCall.uses) {
    const consumed = workspace.scenarios.some(scenario => scenario.organisms.some(organism => organism.sliceId === slice.sliceId));
    if (!consumed) add('warnings', { code: 'NS4_E10_ORPHAN_SLICE', path: `${workspace.workspaceId}.${slice.sliceId}`, message: `Slice ${slice.sliceId} is not consumed by an organism.` });
  }
  for (const section of sources.workspaceIndex.menu.sections) {
    if (section.items.length === NS4_E10_MENU_LIMIT) add('warnings', { code: 'NS4_E10_MENU_AT_LIMIT', path: section.sectionId, message: `Menu section is at the ${NS4_E10_MENU_LIMIT}-item limit.` });
    if (section.items.length > NS4_E10_MENU_LIMIT) add('errors', { code: 'NS4_E10_MENU_OVER_LIMIT', path: section.sectionId, message: `Menu section exceeds the ${NS4_E10_MENU_LIMIT}-item limit.`, repairStep: 'e8-workspaces' });
  }
}

function dormantCommandDecisions(sources: Ns4E10Sources, add: Add): Ns4SystemDecision[] {
  const available = new Set(sources.workflows.flatMap(workflow => workflow.transitions.map(transition => transition.transitionId)));
  const useCases = new Map(sources.useCases.map(useCase => [useCase.useCaseId, useCase])); const decisions: Ns4SystemDecision[] = [];
  for (const workspace of sources.workspaces) for (const scenario of workspace.scenarios) for (const command of scenario.commandInputs) {
    const useCase = useCases.get(command.useCaseId); if (!useCase?.transitionRefs.length) continue;
    const missing = useCase.transitionRefs.filter(ref => !available.has(ref)); if (!missing.length) continue;
    const decision: Ns4SystemDecision = { decisionId: `e10Dormant.${workspace.workspaceId}.${scenario.scenarioId}.${command.useCaseId}`,
      stage: 'e10-validation', question: dormantText(sources.workspaceIndex.userLanguage, scenario.title, missing),
      chosen: 'keepDormantCommand', alternatives: ['extendJourneyToReachRequiredState'], decidedBy: 'system',
      findingRef: `NS4_E10_DORMANT_COMMAND:${workspace.workspaceId}:${scenario.scenarioId}:${command.useCaseId}`,
      changeHint: `Extend an approved journey for ${useCase.compiledFrom.join(', ') || command.useCaseId} so transition(s) ${missing.join(', ')} become reachable in E7.` };
    decisions.push(decision); add('registrars', { code: 'NS4_E10_DORMANT_COMMAND', path: decision.findingRef, message: decision.question });
  }
  return decisions;
}

function dormantText(language: string, title: string, missing: string[]): string {
  if (/^pt(?:-|$)/i.test(language)) return `${title} sem efeito nesta versão — o workflow compilado não contém ${missing.join(', ')}.`;
  return `${title} has no effect in this version — the compiled workflow does not contain ${missing.join(', ')}.`;
}
function approvalMode(value: string): 'withoutApproval' | 'requiresApproval' | 'unknown' {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!/(approv|aprova|decision|decis|review|revis|validat|validac)/.test(normalized)) return 'unknown';
  if (/(^|\W)(no|not|without|none|nao|sem|sans|nein|sin|ningun|aucun)(\W|$)/.test(normalized)) return 'withoutApproval';
  if (/(^|\W)(yes|sim|with|com|required|require|must|mandatory|obrig|avec|mit|con)(\W|$)/.test(normalized)) return 'requiresApproval';
  return 'unknown';
}
function summarizeChecks(errors: Ns4E10Issue[], warnings: Ns4E10Issue[], registrars: Ns4E10Issue[]): Ns4E10CheckSummary[] {
  const ids: Ns4E10CheckSummary['checkId'][] = ['A1-resolution', 'A2-journeys', 'A3-decisions', 'A4-disclosure', 'A5-fsm', 'A6-staleness', 'A7-warnings', 'A8-dormant-commands'];
  const matches = (checkId: string, issue: Ns4E10Issue) => checkId.startsWith('A3') ? /DECISION|POLICY/.test(issue.code)
    : checkId.startsWith('A4') ? /DISCLOSURE/.test(issue.code) : checkId.startsWith('A5') ? /FSM|QUEUE/.test(issue.code)
    : checkId.startsWith('A6') ? /STALE|HASH|CONTRACT_EXTRA/.test(issue.code) : checkId.startsWith('A7') ? /WARNING|ORPHAN_SLICE|MENU_|FIELD_TITLE|JSON/.test(issue.code)
    : checkId.startsWith('A8') ? /DORMANT/.test(issue.code) : checkId.startsWith('A2') ? /JOURNEY/.test(issue.code) : /E9_|CONTEXT|EDGE|ROUTE|NOTIFICATION/.test(issue.code);
  return ids.map(checkId => { const errorCount = errors.filter(issue => matches(checkId, issue)).length; const warningCount = warnings.filter(issue => matches(checkId, issue)).length; const registrarCount = registrars.filter(issue => matches(checkId, issue)).length;
    return { checkId, status: errorCount ? 'failed' : warningCount || registrarCount ? 'reported' : 'passed', errorCount, warningCount, registrarCount }; });
}
function earliestRepair(steps: Ns4E10RepairStep[]): Ns4E10RepairStep | undefined { const order: Ns4E10RepairStep[] = ['e2-journeys', 'e3-access-matrix', 'e4-ontology', 'e5-rules', 'e6-behaviors', 'e7-realization', 'e8-workspaces', 'e9-navigation-compiler']; return order.find(step => steps.includes(step)); }
function uniqueDecisions(values: Ns4SystemDecision[]): Ns4SystemDecision[] { return [...new Map(values.map(value => [value.decisionId, value])).values()].sort((a, b) => a.decisionId.localeCompare(b.decisionId)); }
function uniqueIssues(values: Ns4E10Issue[]): Ns4E10Issue[] { return [...new Map(values.map(value => [`${value.code}:${value.path}:${value.message}`, value])).values()].sort((a, b) => `${a.code}:${a.path}`.localeCompare(`${b.code}:${b.path}`)); }
