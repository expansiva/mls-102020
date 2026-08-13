import type { Ns4E8PresentationProposal, Ns4E8SkeletonReview, Ns4E8Sources, Ns4WorkspaceDetailDraft, Ns4WorkspaceRoutedContext } from '/_102020_/l2/agentNewSolution4/steps/e8/contracts.js';
import { resolveNs4Findings } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import type { Ns4ResolutionFinding, Ns4ResolutionResult } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';

type Ns4E8IssueResolution =
  | { kind: 'disclosureReview'; workspaceId: string; authorityRef: string; profileRef: string; scenarioId: string; screenTitle: string }
  | { kind: 'removeOrganismFieldRef'; scenarioId: string; organismIndex: number; entityId: string; fieldId: string }
  | { kind: 'removeCommandInputFieldRef'; scenarioId: string; commandIndex: number; inputIndex: number; entityId: string; fieldId: string };

export interface Ns4E8GateIssue { code: string; path: string; message: string; severity?: 'warning'; resolution?: Ns4E8IssueResolution; }
export interface Ns4E8GateResult { ok: boolean; issues: Ns4E8GateIssue[]; }

const MEMBER_ID = /^[a-z][A-Za-z0-9]*$/;
const MAX_MENU_ITEMS = 7;

export function validateNs4E8PresentationProposal(derived: Ns4E8SkeletonReview, proposal: Ns4E8PresentationProposal): Ns4E8GateResult {
  const issues: Ns4E8GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (proposal.moduleName !== derived.moduleName || proposal.reviewRound !== derived.reviewRound || proposal.userLanguage !== derived.userLanguage) add('NS4_E8_PRESENTATION_IDENTITY', 'moduleName', 'Presentation identity must match the mechanically-derived skeleton.');
  if (!proposal.title) add('NS4_E8_PRESENTATION_LABEL', 'title', 'Presentation title is required.');
  const expectedWorkspaceIds = derived.workspaces.map(workspace => workspace.workspaceId).sort();
  const proposedWorkspaceIds = proposal.workspaces.map(workspace => workspace.workspaceId).sort();
  if (expectedWorkspaceIds.join('\u0000') !== proposedWorkspaceIds.join('\u0000')) add('NS4_E8_PRESENTATION_WORKSPACES', 'workspaces', 'Presentation must preserve every workspace id exactly once.');
  derived.workspaces.forEach(workspace => {
    const candidate = proposal.workspaces.find(item => item.workspaceId === workspace.workspaceId);
    if (!candidate) return;
    if (!candidate.title || !candidate.description) add('NS4_E8_PRESENTATION_LABEL', workspace.workspaceId, 'Workspace title and description are required.');
    if (workspace.pageContext.map(context => context.contextId).sort().join('\u0000') !== candidate.pageContext.map(context => context.contextId).sort().join('\u0000')) add('NS4_E8_PRESENTATION_PAGE_CONTEXT', `${workspace.workspaceId}.pageContext`, 'Presentation must preserve mechanical page contexts.');
    workspace.pageContext.forEach(context => { const proposed = candidate.pageContext.find(item => item.contextId === context.contextId); if (!sameMechanicalContext(context, proposed) || proposed?.urlRole !== context.urlRole || proposed?.urlRoleSource !== context.urlRoleSource) add('NS4_E8_PRESENTATION_MECHANICAL_ROLE', `${workspace.workspaceId}.pageContext.${context.contextId}`, 'Mechanical context attributes, URL roles and sources cannot be changed by L1.'); });
    if (workspace.scenarios.map(scenario => scenario.scenarioId).sort().join('\u0000') !== candidate.scenarios.map(scenario => scenario.scenarioId).sort().join('\u0000')) add('NS4_E8_PRESENTATION_SCENARIOS', `${workspace.workspaceId}.scenarios`, 'Presentation must preserve every scenario id exactly once.');
    workspace.scenarios.forEach(scenario => {
      const proposedScenario = candidate.scenarios.find(item => item.scenarioId === scenario.scenarioId); if (!proposedScenario) return;
      if (!proposedScenario.title || !proposedScenario.description) add('NS4_E8_PRESENTATION_LABEL', `${workspace.workspaceId}.${scenario.scenarioId}`, 'Scenario title and description are required.');
      if (scenario.selectionContexts.map(context => context.contextId).sort().join('\u0000') !== proposedScenario.selectionContexts.map(context => context.contextId).sort().join('\u0000')) add('NS4_E8_PRESENTATION_SELECTION_CONTEXT', `${workspace.workspaceId}.${scenario.scenarioId}.selectionContexts`, 'Presentation must preserve scenario contexts.');
      scenario.selectionContexts.forEach(context => {
        const proposed = proposedScenario.selectionContexts.find(item => item.contextId === context.contextId);
        const ambiguous = derived.urlRoleDecisions.some(decision => decision.workspaceId === workspace.workspaceId && decision.scenarioId === scenario.scenarioId && decision.contextId === context.contextId);
        if (!sameMechanicalContext(context, proposed) || (!ambiguous && (proposed?.urlRole !== context.urlRole || proposed?.urlRoleSource !== context.urlRoleSource))) add('NS4_E8_PRESENTATION_MECHANICAL_ROLE', `${workspace.workspaceId}.${scenario.scenarioId}.${context.contextId}`, 'Only ambiguous URL roles may be classified by L1; all mechanical context attributes are frozen.');
        if (ambiguous && (!proposed || proposed.urlRoleSource !== 'llm' || !proposed.urlRoleJustification?.trim())) add('NS4_E8_PRESENTATION_JUSTIFICATION', `${workspace.workspaceId}.${scenario.scenarioId}.${context.contextId}`, 'An ambiguous URL role requires L1 source and a one-line business justification.');
      });
      if (proposedScenario.surface && !proposedScenario.surfaceJustification?.trim()) add('NS4_E8_PRESENTATION_SURFACE', `${workspace.workspaceId}.${scenario.scenarioId}.surface`, 'A chosen surface requires a one-line justification.');
      if (proposedScenario.surface === 'batchAction' && (scenario.kind === 'review' || ![...workspace.pageContext, ...scenario.selectionContexts].some(context => context.cardinality === 'many'))) add('NS4_E8_PRESENTATION_SURFACE', `${workspace.workspaceId}.${scenario.scenarioId}.surface`, 'batchAction is not structurally valid for this scenario.');
    });
  });
  const expectedFeatures = derived.menu.sections.map(section => section.featureRef).sort();
  const proposedFeatures = proposal.menuSections.map(section => section.featureRef).sort();
  if (expectedFeatures.join('\u0000') !== proposedFeatures.join('\u0000') || proposal.menuSections.some(section => !section.label)) add('NS4_E8_PRESENTATION_MENU', 'menuSections', 'Presentation must preserve each feature reference with a non-empty label.');
  return { ok: !issues.length, issues };
}

export function validateNs4E8Skeleton(skeleton: Ns4E8SkeletonReview, sources: Ns4E8Sources): Ns4E8GateResult {
  const issues: Ns4E8GateIssue[] = [];
  const add = (code: string, path: string, message: string, severity?: 'warning') => issues.push({ code, path, message, ...(severity ? { severity } : {}) });
  if (skeleton.moduleName !== sources.journeys.moduleName || skeleton.moduleName !== sources.access.moduleName || skeleton.moduleName !== sources.ontology.moduleName) add('NS4_E8_MODULE', 'moduleName', 'All approved sources and the skeleton must belong to the same module.');
  const workspaceIds = new Set<string>(); const stepRefs = new Set<string>(); const useCaseRefs = new Set<string>();
  const sourceUseCases = new Set(sources.useCases.map(item => item.useCaseId));
  const useCasesById = new Map(sources.useCases.map(item => [item.useCaseId, item]));
  const sourceSteps = new Set(sources.journeys.journeys.flatMap(journey => journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`)));
  const profileIds = new Set(sources.access.profiles.map(profile => profile.profileId));
  const entityIds = new Set(sources.ontology.entities.map(entity => entity.entityId));
  const contexts = new Set(skeleton.contextCatalog.map(context => context.contextId));
  const fields = new Set(sources.ontology.entities.flatMap(entity => entity.fields.map(field => `${entity.entityId}.${field.fieldId}`)));
  skeleton.workspaces.forEach((workspace, index) => {
    const path = `workspaces[${index}]`;
    if (!MEMBER_ID.test(workspace.workspaceId)) add('NS4_E8_WORKSPACE_ID', `${path}.workspaceId`, 'Workspace id must be lower-camel.');
    if (workspaceIds.has(workspace.workspaceId)) add('NS4_E8_WORKSPACE_DUPLICATE', `${path}.workspaceId`, `Duplicate workspace ${workspace.workspaceId}.`);
    workspaceIds.add(workspace.workspaceId);
    if (!workspace.title || !workspace.description) add('NS4_E8_LABEL', path, 'Workspace title and description are required in the user language.');
    if (!workspace.hostedStepRefs.length || !workspace.useCaseIds.length) add('NS4_E8_EMPTY_WORKSPACE', path, 'A workspace must host journey steps and use cases.');
    if (workspace.anchorEntity && !entityIds.has(workspace.anchorEntity)) add('NS4_E8_ANCHOR', `${path}.anchorEntity`, `Unknown ontology entity ${workspace.anchorEntity}.`);
    workspace.profileRefs.forEach(profile => { if (!profileIds.has(profile)) add('NS4_E8_PROFILE', `${path}.profileRefs`, `Unknown E3 profile ${profile}.`); });
    workspace.hostedStepRefs.forEach(ref => { if (!sourceSteps.has(ref)) add('NS4_E8_STEP', `${path}.hostedStepRefs`, `Unknown journey step ${ref}.`); stepRefs.add(ref); });
    workspace.useCaseIds.forEach(id => { if (!sourceUseCases.has(id)) add('NS4_E8_USECASE', `${path}.useCaseIds`, `Unknown compiled use case ${id}.`); useCaseRefs.add(id); });
    workspace.pageContext.forEach(context => {
      if (!contexts.has(context.contextId)) add('NS4_E8_CONTEXT', `${path}.pageContext`, `Unknown context ${context.contextId}.`);
      if (context.urlRole !== 'path') add('NS4_E8_PAGE_URL_ROLE', `${path}.pageContext`, `Workspace page context ${context.contextId} must be path identity.`);
      validatePathContext(context, `${path}.pageContext`, fields, add);
    });
    const scenarioIds = new Set<string>();
    workspace.scenarios.forEach((scenario, scenarioIndex) => {
      const scenarioPath = `${path}.scenarios[${scenarioIndex}]`;
      if (!MEMBER_ID.test(scenario.scenarioId)) add('NS4_E8_SCENARIO_ID', `${scenarioPath}.scenarioId`, 'Scenario id must be lower-camel.');
      if (scenarioIds.has(scenario.scenarioId)) add('NS4_E8_SCENARIO_DUPLICATE', `${scenarioPath}.scenarioId`, `Duplicate scenario ${scenario.scenarioId}.`); scenarioIds.add(scenario.scenarioId);
      if (!scenario.title || !scenario.description) add('NS4_E8_SCENARIO_LABEL', scenarioPath, 'Scenario title and description are required in the user language.');
      scenario.stepRefs.forEach(ref => { if (!workspace.hostedStepRefs.includes(ref)) add('NS4_E8_SCENARIO_STEP', `${scenarioPath}.stepRefs`, `Scenario references non-hosted step ${ref}.`); });
      scenario.useCaseIds.forEach(id => { if (!workspace.useCaseIds.includes(id)) add('NS4_E8_SCENARIO_USECASE', `${scenarioPath}.useCaseIds`, `Scenario references non-hosted use case ${id}.`); });
      scenario.selectionContexts.forEach(context => {
        if (!contexts.has(context.contextId)) add('NS4_E8_CONTEXT', `${scenarioPath}.selectionContexts`, `Unknown context ${context.contextId}.`);
        if (context.urlRole === 'path') validatePathContext(context, `${scenarioPath}.selectionContexts`, fields, add);
        else {
          const localSlice = workspace.slices.some(slice => slice.entityRefs.includes(context.businessObject));
          const localFormInput = scenario.kind === 'form' && scenario.useCaseIds.some(id => useCasesById.get(id)?.contexts?.requires?.includes(context.contextId));
          if (!localSlice && !localFormInput) add('NS4_E8_SELECTION_SOURCE', `${scenarioPath}.selectionContexts`, `Selection context ${context.contextId} requires a local picker, slice or form input.`);
        }
        if (context.urlRoleSource === 'ambiguous') add('NS4_E8_URL_ROLE_UNCLASSIFIED', `${scenarioPath}.selectionContexts`, `Ambiguous context ${context.contextId} must be classified before checkpoint.`);
      });
      if (scenario.surface === 'batchAction') {
        if (![...workspace.pageContext, ...scenario.selectionContexts].some(context => context.cardinality === 'many')) add('NS4_E8_BATCH_CARDINALITY', scenarioPath, 'batchAction requires a many-cardinality context.');
        if (scenario.kind === 'review') add('NS4_E8_BATCH_DECISION', scenarioPath, 'batchAction cannot apply to a decision scenario.');
        if (!scenario.surfaceJustification) add('NS4_E8_BATCH_JUSTIFICATION', scenarioPath, 'batchAction requires a one-line justification.');
      }
      if (scenario.kind === 'queue') validateQueue(scenarioPath, workspace.useCaseIds, sources, add);
    });
    if (workspace.kind === 'hub') {
      if (!workspace.anchorEntity) add('NS4_E8_HUB_ANCHOR', path, 'Hub requires an anchor entity.');
      if (!workspace.scenarios.some(scenario => scenario.kind === 'collection') || !workspace.scenarios.some(scenario => scenario.kind === 'record')) add('NS4_E8_HUB_SCENARIOS', `${path}.scenarios`, 'Hub requires collection and record scenarios.');
    }
    const requiresExistingSubject = workspace.scenarios.some(scenario => {
      if (scenario.kind === 'review') return true;
      if (scenario.kind !== 'form') return false;
      const commands = scenario.useCaseIds.map(id => useCasesById.get(id)).filter(useCase => useCase?.kind === 'command');
      return !commands.length || commands.some(useCase => (useCase!.contexts?.requires || []).length > 0);
    });
    if (requiresExistingSubject && !workspace.slices.length && !workspace.pageContext.length && !workspace.scenarios.some(scenario => scenario.selectionContexts.length)) add('NS4_E8_DECISION_WITHOUT_CONTEXT', path, 'A review or context-dependent command must host an entity slice or receive page/scenario context.');
  });
  skeleton.urlRoleDecisions.filter(decision => decision.decidedBy === 'pending').forEach(decision => add('NS4_E8_URL_ROLE_UNCLASSIFIED', 'urlRoleDecisions', `URL role for ${decision.workspaceId}.${decision.scenarioId}.${decision.contextId} is still pending.`));
  sourceSteps.forEach(ref => { if (!stepRefs.has(ref)) add('NS4_E8_STEP_UNHOSTED', 'workspaces', `Journey step ${ref} is not hosted by a workspace.`); });
  sourceUseCases.forEach(id => { if (!useCaseRefs.has(id)) add('NS4_E8_USECASE_UNHOSTED', 'workspaces', `Use case ${id} is not hosted by a workspace.`); });
  skeleton.menu.headerLinks.forEach(id => { if (!workspaceIds.has(id)) add('NS4_E8_HEADER_LINK', 'menu.headerLinks', `Unknown workspace ${id}.`); });
  skeleton.menu.sections.forEach((section, index) => {
    if (!section.label || !section.featureRef) add('NS4_E8_MENU_LABEL', `menu.sections[${index}]`, 'Menu section requires label and feature reference.');
    if (!section.workspaceIds.length) add('NS4_E8_MENU_EMPTY', `menu.sections[${index}].workspaceIds`, `Menu section ${section.sectionId || index} has no workspace items; mechanical grouping must omit or regroup it.`, 'warning');
    if (section.workspaceIds.length > MAX_MENU_ITEMS) add('NS4_E8_MENU_CAP', `menu.sections[${index}].workspaceIds`, `Menu section exceeds the ${MAX_MENU_ITEMS} item limit; regroup it.`);
    section.workspaceIds.forEach(id => { if (!workspaceIds.has(id)) add('NS4_E8_MENU_WORKSPACE', `menu.sections[${index}]`, `Unknown workspace ${id}.`); });
  });
  skeleton.menu.landings.forEach((landing, index) => {
    const workspace = skeleton.workspaces.find(item => item.workspaceId === landing.workspaceId);
    if (!profileIds.has(landing.profileRef) || !workspace || !workspace.scenarios.some(scenario => scenario.scenarioId === landing.scenarioId)) add('NS4_E8_LANDING', `menu.landings[${index}]`, 'Landing must resolve to an existing profile, workspace and scenario.');
    if (workspace?.pageContext.length && workspace.kind !== 'hub') add('NS4_E8_LANDING_CONTEXT', `menu.landings[${index}]`, 'A landing cannot require unresolved page context.');
  });
  const edgesByTarget = new Map<string, string[]>();
  skeleton.edges.forEach((edge, index) => {
    if (!workspaceIds.has(edge.from) || !workspaceIds.has(edge.to) || !edge.carries.length) add('NS4_E8_EDGE', `edges[${index}]`, 'Edge requires existing endpoints and carried context ids.');
    edge.carries.forEach(context => { if (!contexts.has(context)) add('NS4_E8_EDGE_CONTEXT', `edges[${index}].carries`, `Unknown carried context ${context}.`); });
    edgesByTarget.set(edge.to, [...(edgesByTarget.get(edge.to) || []), ...edge.carries]);
  });
  skeleton.workspaces.filter(workspace => workspace.pageContext.length && workspace.kind !== 'hub').forEach(workspace => {
    const carried = new Set(edgesByTarget.get(workspace.workspaceId) || []);
    const isLanding = skeleton.menu.landings.some(landing => landing.workspaceId === workspace.workspaceId);
    workspace.pageContext.filter(context => context.required && !carried.has(context.contextId)).forEach(context => {
      if (!isLanding) add('NS4_E8_PAGE_CONTEXT_COVERAGE', workspace.workspaceId, `Required page context ${context.contextId} has no candidate incoming edge.`);
    });
  });
  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
}

export function validateNs4WorkspaceDetail(detail: Ns4WorkspaceDetailDraft, skeleton: Ns4E8SkeletonReview, sources: Ns4E8Sources): Ns4E8GateResult {
  const issues: Ns4E8GateIssue[] = [];
  const add = (code: string, path: string, message: string, severity?: 'warning', resolution?: Ns4E8IssueResolution) => issues.push({ code, path, message, ...(severity ? { severity } : {}), ...(resolution ? { resolution } : {}) });
  const workspace = skeleton.workspaces.find(item => item.workspaceId === detail.workspaceId);
  if (!workspace) return { ok: false, issues: [{ code: 'NS4_E8_WORKSPACE_UNKNOWN', path: 'workspaceId', message: `Unknown workspace ${detail.workspaceId}.` }] };
  if (detail.moduleName !== skeleton.moduleName) add('NS4_E8_DETAIL_MODULE', 'moduleName', 'Worker output must match the frozen skeleton module.');
  if (detail.skeletonHash !== skeleton.skeletonHash) add('NS4_E8_DETAIL_HASH', 'skeletonHash', 'Worker output must preserve the frozen skeleton hash.');
  const expectedScenarios = new Set(workspace.scenarios.map(item => item.scenarioId));
  const gotScenarios = new Set(detail.scenarios.map(item => item.scenarioId));
  expectedScenarios.forEach(id => { if (!gotScenarios.has(id)) add('NS4_E8_DETAIL_SCENARIO', 'scenarios', `Missing frozen scenario ${id}.`); });
  gotScenarios.forEach(id => { if (!expectedScenarios.has(id)) add('NS4_E8_DETAIL_SCENARIO', 'scenarios', `Unknown scenario ${id}.`); });
  const fields = new Map(sources.ontology.entities.flatMap(entity => entity.fields.map(field => [`${entity.entityId}.${field.fieldId}`, field] as const)));
  const queryUseCases = new Map(sources.useCases.filter(item => item.kind === 'query').map(item => [item.useCaseId, item]));
  const grants = new Map(sources.access.grants.map(grant => [`${grant.profileRef}\u0000${grant.authorityRef}`, grant]));
  const recordedDisclosure = new Set<string>();
  detail.scenarios.forEach((scenario, index) => {
    const target = workspace.scenarios.find(item => item.scenarioId === scenario.scenarioId); if (!target) return;
    scenario.organisms.forEach((organism, organismIndex) => {
      const path = `scenarios[${index}].organisms[${organismIndex}]`;
      if (!organism.role || !organism.fragmentRef || !organism.intent) add('NS4_E8_ORGANISM', path, 'Organism requires role, fragmentRef and localized intent.');
      const useCase = organism.sliceId ? queryUseCases.get(organism.sliceId) : undefined;
      if (organism.sliceId && !workspace.slices.some(slice => slice.sliceId === organism.sliceId)) add('NS4_E8_SLICE', `${path}.sliceId`, `Unknown frozen slice ${organism.sliceId}.`);
      organism.fieldRefs.forEach(field => {
        const fieldExists = fields.has(`${field.entityId}.${field.fieldId}`);
        if (!fieldExists) add('NS4_E8_FIELD', `${path}.fieldRefs`, `Unknown ontology field ${field.entityId}.${field.fieldId}.`, undefined,
          { kind: 'removeOrganismFieldRef', scenarioId: scenario.scenarioId, organismIndex, entityId: field.entityId, fieldId: field.fieldId });
        else if (useCase && !useCase.entityRefs.includes(field.entityId)) add('NS4_E8_SLICE_ENTITY', `${path}.fieldRefs`, `Slice ${organism.sliceId} cannot project fields from ${field.entityId}.`);
      });
    });
    for (const authority of target.authorityRefs) {
      const profile = workspace.profileRefs.find(profileRef => grants.get(`${profileRef}\u0000${authority}`)?.disclosure.mode === 'fieldsOnly');
      if (profile && scenario.organisms.some(organism => organism.fieldRefs.length) && !recordedDisclosure.has(authority)) {
        recordedDisclosure.add(authority);
        add('NS4_E8_DISCLOSURE', `scenarios[${index}].organisms`,
          `The ${target.title} screen projects fields for ${profile} under fieldsOnly disclosure; E3 allowedInformation is business prose and cannot be matched mechanically to ontology fields.`, 'warning',
          { kind: 'disclosureReview', workspaceId: workspace.workspaceId, authorityRef: authority, profileRef: profile, scenarioId: scenario.scenarioId, screenTitle: target.title });
      }
    }
    scenario.commandInputs.forEach((command, commandIndex) => command.inputs.forEach((input, inputIndex) => {
      const path = `scenarios[${index}].commandInputs[${commandIndex}].inputs[${inputIndex}]`;
      if (!target.useCaseIds.includes(command.useCaseId)) add('NS4_E8_COMMAND', path, `Command ${command.useCaseId} is not hosted by scenario ${target.scenarioId}.`);
      if (input.fieldRef && !fields.has(`${input.fieldRef.entityId}.${input.fieldRef.fieldId}`)) add('NS4_E8_INPUT_FIELD', path, `Unknown ontology input field ${input.fieldRef.entityId}.${input.fieldRef.fieldId}.`, undefined,
        { kind: 'removeCommandInputFieldRef', scenarioId: scenario.scenarioId, commandIndex, inputIndex, entityId: input.fieldRef.entityId, fieldId: input.fieldRef.fieldId });
      if (input.source === 'pageContext' && (!input.sourceRef || !workspace.pageContext.some(context => context.contextId === input.sourceRef))) add('NS4_E8_INPUT_PAGE_CONTEXT', path, 'pageContext input must reference workspace pageContext.');
      if (input.source === 'selection' && (!input.sourceRef || !workspace.slices.some(slice => slice.sliceId === input.sourceRef))) add('NS4_E8_INPUT_SELECTION', path, 'selection input must reference a frozen slice.');
    }));
  });
  return { ok: issues.every(issue => issue.severity === 'warning'), issues };
}

export function resolveNs4WorkspaceDetailFindings(detail: Ns4WorkspaceDetailDraft, issues: Ns4E8GateIssue[]): Ns4ResolutionResult<Ns4WorkspaceDetailDraft> {
  const seenDisclosure = new Set<string>();
  const findings = issues.flatMap((issue): Array<Ns4ResolutionFinding<Ns4WorkspaceDetailDraft>> => {
    const resolution = issue.resolution;
    if (resolution?.kind === 'disclosureReview') {
      const key = `${resolution.workspaceId}\u0000${resolution.authorityRef}`;
      if (seenDisclosure.has(key)) return [];
      seenDisclosure.add(key);
      return [{
        classification: 'B', decisionId: decisionId('e8Disclosure', resolution.workspaceId, resolution.authorityRef),
        findingRef: `NS4_E8_DISCLOSURE:${resolution.workspaceId}:${resolution.authorityRef}`, stage: 'e8-workspaces',
        question: `A tela ${resolution.screenTitle} mostra campos ao perfil ${resolution.profileRef} sob divulgação limitada; a verificação automática campo-a-campo ainda não é possível — o servidor continua aplicando a projeção do E3. Revisar os campos exibidos?`,
        defaultChoice: 'keepE3Projection', alternatives: ['reviewDisplayedFields'],
        changeHint: `Revisar os campos exibidos no cenário ${resolution.scenarioId} do workspace ${resolution.workspaceId}.`,
      }];
    }
    if (resolution?.kind === 'removeOrganismFieldRef') return [{
      classification: 'C', decisionId: decisionId('e8RemoveInvalidField', detail.workspaceId, resolution.scenarioId, resolution.entityId, resolution.fieldId),
      findingRef: `${issue.code}:${detail.workspaceId}:${resolution.scenarioId}:${resolution.entityId}.${resolution.fieldId}`, stage: 'e8-workspaces',
      question: `O rascunho de ${detail.workspaceId} referencia o campo inexistente ${resolution.entityId}.${resolution.fieldId}. Remover essa referência inválida?`,
      deterministicChoice: 'removeInvalidFieldRef', alternatives: ['repairWorkspaceDraftManually'], changeHint: `Revisar o organismo do cenário ${resolution.scenarioId}.`,
      apply: artifact => removeOrganismFieldRef(artifact, resolution),
    }];
    if (resolution?.kind === 'removeCommandInputFieldRef') return [{
      classification: 'C', decisionId: decisionId('e8RemoveInvalidInputField', detail.workspaceId, resolution.scenarioId, resolution.entityId, resolution.fieldId),
      findingRef: `${issue.code}:${detail.workspaceId}:${resolution.scenarioId}:${resolution.entityId}.${resolution.fieldId}`, stage: 'e8-workspaces',
      question: `O rascunho de ${detail.workspaceId} referencia o campo de entrada inexistente ${resolution.entityId}.${resolution.fieldId}. Remover essa referência inválida?`,
      deterministicChoice: 'removeInvalidFieldRef', alternatives: ['repairWorkspaceDraftManually'], changeHint: `Revisar as entradas do cenário ${resolution.scenarioId}.`,
      apply: artifact => removeCommandInputFieldRef(artifact, resolution),
    }];
    return [{ classification: 'A', findingRef: `${issue.code}:${detail.workspaceId}:${issue.path}`, stage: 'e8-workspaces',
      question: issue.message, alternatives: [], changeHint: `Corrigir ${issue.path} no draft do workspace ${detail.workspaceId}.` }];
  });
  return resolveNs4Findings(detail, findings);
}

function removeOrganismFieldRef(detail: Ns4WorkspaceDetailDraft, target: Extract<Ns4E8IssueResolution, { kind: 'removeOrganismFieldRef' }>): Ns4WorkspaceDetailDraft {
  return { ...detail, scenarios: detail.scenarios.map(scenario => scenario.scenarioId !== target.scenarioId ? scenario : { ...scenario,
    organisms: scenario.organisms.map((organism, index) => index !== target.organismIndex ? organism : { ...organism,
      fieldRefs: organism.fieldRefs.filter(field => field.entityId !== target.entityId || field.fieldId !== target.fieldId) }) }) };
}

function removeCommandInputFieldRef(detail: Ns4WorkspaceDetailDraft, target: Extract<Ns4E8IssueResolution, { kind: 'removeCommandInputFieldRef' }>): Ns4WorkspaceDetailDraft {
  return { ...detail, scenarios: detail.scenarios.map(scenario => scenario.scenarioId !== target.scenarioId ? scenario : { ...scenario,
    commandInputs: scenario.commandInputs.map((command, commandIndex) => commandIndex !== target.commandIndex ? command : { ...command,
      inputs: command.inputs.map((input, inputIndex) => inputIndex !== target.inputIndex ? input : { ...input, fieldRef: undefined }) }) }) };
}

function decisionId(prefix: string, ...parts: string[]): string {
  return prefix + parts.map(part => part.replace(/[^A-Za-z0-9]+(.)?/g, (_match, next: string | undefined) => next ? next.toUpperCase() : '')).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}

function validatePathContext(context: Ns4WorkspaceRoutedContext, path: string, fields: Set<string>, add: (code: string, path: string, message: string) => void): void {
  if (context.cardinality !== 'one') add('NS4_E8_PATH_CARDINALITY', path, `Path context ${context.contextId} must have cardinality one.`);
  if (!context.idFieldRef || !fields.has(`${context.businessObject}.${context.idFieldRef}`)) add('NS4_E8_PATH_ID_FIELD', path, `Path context ${context.contextId} requires a resolvable ontology idFieldRef.`);
}

function sameMechanicalContext(expected: Ns4WorkspaceRoutedContext, actual: Ns4WorkspaceRoutedContext | undefined): boolean {
  return !!actual && expected.contextId === actual.contextId && expected.businessObject === actual.businessObject
    && expected.cardinality === actual.cardinality && expected.required === actual.required
    && (expected.idFieldRef || '') === (actual.idFieldRef || '');
}

function validateQueue(path: string, workspaceUseCases: string[], sources: Ns4E8Sources, add: (code: string, path: string, message: string) => void): void {
  const workflowEntities = new Set(sources.useCases.filter(useCase => workspaceUseCases.includes(useCase.useCaseId)).flatMap(useCase => useCase.entityRefs));
  const workflow = sources.workflows.find(item => workflowEntities.has(item.entityRef) && item.states.some(state => /pending|proposed|awaiting/i.test(state)));
  if (!workflow) add('NS4_E8_QUEUE', path, 'Queue is allowed only for an entity with a reachable pending-decision FSM state.');
}
