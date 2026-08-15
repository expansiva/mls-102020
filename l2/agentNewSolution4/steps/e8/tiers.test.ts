/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e8/tiers.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { normalizeNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/tiers.js';
import { resolveNs4E8ModelFindings, validateNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/modelGate.js';
import {
  applyNs4HubComposition, defaultNs4HubComposition, normalizeNs4HubComposition,
  resolveNs4HubCompositionFindings, validateNs4HubComposition,
} from '/_102020_/l2/agentNewSolution4/steps/e8/hubComposition.js';

const run44 = JSON.parse(readFileSync(new URL('fixtures/run44-tier-model.json', import.meta.url), 'utf8')) as any;
const sources = (): any => structuredClone({
  journeys: run44.journeys, access: run44.access, ontology: run44.ontology,
  useCases: run44.useCases, workflows: run44.workflows,
});

test('the fixture is the shape the live reader returns, not a snapshot of one normalization', () => {
  // readNs4ApprovedOntology re-normalizes the permanent artifact, so a fixture that only survives
  // as frozen output would measure a shape the agent never sees.
  const renormalized = normalizeNs4E4Review(structuredClone(run44.ontology));
  const unionsOf = (entities: any[]) => entities.flatMap(entity => entity.fields
    .filter((field: any) => field.enum?.length).map((field: any) => `${entity.entityId}.${field.fieldId}=${field.enum.join('|')}`)).sort();
  assert.deepEqual(unionsOf(renormalized.entities), unionsOf(run44.ontology.entities));
  assert.deepEqual(
    renormalized.entities.filter(entity => entity.statusEnum?.length).map(entity => entity.entityId).sort(),
    run44.ontology.entities.filter((entity: any) => entity.statusEnum?.length).map((entity: any) => entity.entityId).sort(),
  );
  // And the model derived from either one is the same model.
  assert.deepEqual(deriveNs4E8Model({ ...sources(), ontology: renormalized }).operations, deriveNs4E8Model(sources()).operations);
});

test('every screen of the module is one of the three tiers, and the module compiles whole', () => {
  const input = sources();
  const model = deriveNs4E8Model(input);
  const byTier: Record<string, number> = {};
  model.workspaces.forEach(workspace => { byTier[workspace.tier] = (byTier[workspace.tier] || 0) + 1; });

  assert.equal(model.hubEntity, run44.expected.hubEntity);
  assert.equal(model.workspaces.length, run44.expected.workspaces);
  assert.deepEqual(byTier, run44.expected.byTier);
  // The three capture-only journeys are demoted by E2 and never become a second screen.
  assert.equal(input.journeys.journeys.length - byTier.journey, run44.expected.demotedJourneys);

  const gate = validateNs4E8Model(model, input);
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, run44.expected.blockingIssues);
  assert.equal(gate.ok, true);
  assert.deepEqual(resolveNs4E8ModelFindings(model, gate.issues).unresolved, []);
});

test('the menu lists places only: a journey is reached from the hub, never from the menu', () => {
  const model = deriveNs4E8Model(sources());
  assert.equal(model.menu.length, run44.expected.menuPlaces);
  assert.equal(model.menu.filter(entry => entry.tier === 'journey').length, run44.expected.journeysInMenu);
  assert.ok(model.landings.length, 'every profile lands on a place');
  assert.equal(model.landings.every(landing => model.workspaces.some(workspace =>
    workspace.workspaceId === landing.workspaceId && workspace.tier !== 'journey')), true);
});

test('a journey compiles one query per locate/inspect step and one command per act/decide step', () => {
  const model = deriveNs4E8Model(sources());
  const journey = model.workspaces.find(workspace => workspace.workspaceId === 'approveChangeOrder')!;
  const source = run44.journeys.journeys.find((item: any) => item.journeyId === 'approveChangeOrder');
  const queries = source.business.steps.filter((step: any) => step.kind === 'locate' || step.kind === 'inspect').length;
  const commands = source.business.steps.filter((step: any) => step.kind === 'act' || step.kind === 'decide' || step.kind === 'handoff').length;

  assert.equal(journey.bffCalls.filter(call => call.kind === 'query').length, queries);
  assert.equal(journey.bffCalls.filter(call => call.kind === 'command').length, commands);
  // One section per step, in the order of the journey, each pointing at its own call.
  assert.deepEqual(journey.sections.map(section => section.sectionId), source.business.steps.map((step: any) => step.stepId));
  assert.equal(journey.categoryRef, 'approvalWorkflow');
  // A locate renders the picker; nothing else does.
  const locateSection = journey.sections[source.business.steps.findIndex((step: any) => step.kind === 'locate')];
  assert.equal(locateSection.organisms[0].usage, 'picker');
});

test('the decision of a decide step is a closed verb selector, not a free text box', () => {
  const model = deriveNs4E8Model(sources());
  const decision = model.operations.find(operation => operation.accessPattern.kind === 'transition')!;
  const verb = decision.inputs.find(input => input.enumValues?.length)!;
  assert.ok(verb, 'the decide operation carries the decision itself');
  assert.equal(verb.source, 'userInput');
  assert.deepEqual(verb.enumValues, ['submitted', 'approved', 'rejected']);
  // The union also travels through the ontology, so the page resolves it by either path.
  const entity = run44.ontology.entities.find((item: any) => item.entityId === verb.fieldRef.entityId);
  assert.deepEqual(entity.fields.find((field: any) => field.fieldId === verb.fieldRef.fieldId).enum, verb.enumValues);
});

test('a record catalogue classifies its inputs structurally and never transitions a state', () => {
  const model = deriveNs4E8Model(sources());
  const create = model.operations.find(operation => operation.operationId === 'createChangeOrder')!;
  const sourceOf = (inputId: string) => create.inputs.find(input => input.inputId === inputId)?.source;

  assert.equal(sourceOf('project'), 'selectedEntity');          // a foreign key is chosen in a picker
  assert.equal(sourceOf('submittedByUser'), 'actorSession');    // a platform identity is the session
  assert.equal(sourceOf('scopeDescription'), 'userInput');      // a business field is typed
  assert.equal(sourceOf('submittedAt'), 'systemDefault');       // a timestamp is set by the server
  assert.equal(sourceOf('status'), 'systemDefault');            // the lifecycle is never edited here

  const catalogue = model.workspaces.find(workspace => workspace.workspaceId === 'changeOrderCatalogue')!;
  assert.equal(catalogue.categoryRef, 'entityRecordManagement');
  assert.deepEqual(catalogue.bffCalls.map(call => call.bffId),
    ['qryListChangeOrder', 'cmdCreateChangeOrder', 'cmdUpdateChangeOrder', 'cmdDeleteChangeOrder']);
  assert.equal(model.operations.some(operation => operation.operationId === 'deleteChangeOrder'), true);

  // The catalogue edits a whole record: a field required on create stays required on update, and
  // only the identity is added. Delete asks for the identity and nothing else.
  const update = model.operations.find(operation => operation.operationId === 'updateChangeOrder')!;
  const remove = model.operations.find(operation => operation.operationId === 'deleteChangeOrder')!;
  const requiredOf = (operation: typeof update) => operation.inputs.filter(input => input.required).map(input => input.inputId).sort();
  assert.deepEqual(requiredOf(update), [...requiredOf(create), 'changeOrderId'].sort());
  assert.deepEqual(remove.inputs.map(input => input.inputId), ['changeOrderId']);
});

test('an entity no journey operates still gets a catalogue, and the audience is a recorded decision', () => {
  const input = sources();
  input.access.authorities = [];
  input.access.grants = [];
  const model = deriveNs4E8Model(input);
  const catalogues = model.workspaces.filter(workspace => workspace.tier === 'recordCatalogue');
  assert.ok(catalogues.length, 'the data stays reachable');
  assert.equal(catalogues.every(workspace => workspace.profileRefs.length > 0), true);
  assert.equal(model.systemDecisions.every(decision => decision.chosen === 'internalProfiles'), true);
  assert.equal(model.systemDecisions.length, catalogues.length);
});

test('the hub composition may order, promote and name — never add or drop a catalogue item', () => {
  const model = deriveNs4E8Model(sources());
  const hub = model.workspaces.find(workspace => workspace.tier === 'hub')!;
  const catalogue = hub.hubCatalogue!;
  assert.ok(catalogue.items.length, 'code derived a closed catalogue');

  const proposal = normalizeNs4HubComposition({
    workspaceId: hub.workspaceId, title: 'Painel do projeto',
    tileOrder: [...catalogue.items].reverse().map(item => item.itemId),
    primaryActionIds: catalogue.items.filter(item => item.kind === 'action').slice(0, 1).map(item => item.itemId),
    labels: [{ itemId: catalogue.items[0].itemId, label: 'Custos' }],
    menuGroups: [],
  }, hub.workspaceId, hub.title);
  assert.deepEqual(validateNs4HubComposition(catalogue, proposal), { ok: true, issues: [] });
  const composed = applyNs4HubComposition(hub, proposal);
  assert.equal(composed.title, 'Painel do projeto');
  assert.deepEqual(composed.hubCatalogue!.items.map(item => item.itemId), proposal.tileOrder);
  assert.equal(composed.hubCatalogue!.items.find(item => item.itemId === catalogue.items[0].itemId)!.label, 'Custos');
  // The record section renders what the hub READS, over calls of its own; a journey is navigation.
  const record = composed.sections.find(section => section.sectionId === 'record')!;
  const readable = composed.hubCatalogue!.items.filter(item => item.kind !== 'action' && item.kind !== 'pending');
  assert.equal(record.organisms.length, readable.filter(item => item.sourceOperationId).length);
  const localQueries = new Set(composed.bffCalls.filter(call => call.kind === 'query').map(call => call.bffId));
  assert.equal(record.organisms.every(organism => localQueries.has(organism.dataSource!)), true);
  // A tile reuses the operation of the workspace that owns it — a new CALL, never a new operation.
  readable.filter(item => item.sourceOperationId).forEach(item => {
    const call = composed.bffCalls.find(entry => entry.bffId === (item.sourceBffId || ''))
      || composed.bffCalls.find(entry => entry.operationId === item.sourceOperationId)!;
    assert.equal(call.operationId, item.sourceOperationId);
    assert.equal(model.operations.some(operation => operation.operationId === call.operationId), true);
    // The shape travels with the call: a list read as an object would project a single record.
    const owner = model.workspaces.find(entry => entry.workspaceId === item.targetRef)!;
    assert.equal(call.outputKind, owner.bffCalls.find(entry => entry.bffId === call.bffId)!.outputKind);
  });
  // The actions the composition chose left the sections carrying their prominence and order.
  const actions = composed.hubCatalogue!.items.filter(item => item.kind === 'action' || item.kind === 'pending');
  assert.equal((composed.navigation || []).length, actions.length);
  assert.equal(record.organisms.some(organism => actions.some(item => item.targetRef === organism.action)), false);
  assert.equal((composed.navigation || []).filter(target => target.prominence === 'primary').length,
    proposal.primaryActionIds.length);

  const invented = normalizeNs4HubComposition({ ...proposal, tileOrder: [...proposal.tileOrder, 'tileInvented'] }, hub.workspaceId, hub.title);
  const rejected = validateNs4HubComposition(catalogue, invented);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.issues.some(issue => issue.code === 'NS4_E8_HUB_UNKNOWN_ITEM'));

  const dropped = normalizeNs4HubComposition({ ...proposal, tileOrder: proposal.tileOrder.slice(1) }, hub.workspaceId, hub.title);
  assert.ok(validateNs4HubComposition(catalogue, dropped).issues.some(issue => issue.code === 'NS4_E8_HUB_MISSING_ITEM'));
});

test('an invalid hub composition falls back to the derived order and records the choice', () => {
  const model = deriveNs4E8Model(sources());
  const hub = model.workspaces.find(workspace => workspace.tier === 'hub')!;
  const invalid = normalizeNs4HubComposition({ workspaceId: hub.workspaceId, title: '', tileOrder: ['tileInvented'] }, hub.workspaceId, hub.title);
  const issues = validateNs4HubComposition(hub.hubCatalogue!, invalid).issues;
  assert.ok(issues.length);

  const resolution = resolveNs4HubCompositionFindings(hub, issues, true);
  assert.deepEqual(resolution.unresolved, []);
  assert.equal(resolution.systemDecisions[0].chosen, 'keepDerivedComposition');
  assert.deepEqual(
    resolution.artifact.hubCatalogue!.items.map(item => item.itemId),
    defaultNs4HubComposition(hub).tileOrder,
  );
});

test('a broken organism reference is repaired, migrated or dropped — never a dead run', () => {
  const input = sources();
  const model = deriveNs4E8Model(input);
  const hub = model.workspaces.find(workspace => workspace.tier === 'hub')!;
  const projection = model.workspaces.find(workspace => workspace.tier === 'projection'
    && workspace.bffCalls.some(call => call.kind === 'query'))!;
  const journey = model.workspaces.find(workspace => workspace.tier === 'journey')!;
  const foreignQuery = projection.bffCalls.find(call => call.kind === 'query')!;

  // The three vocabularies run 46 emitted into the record section of the hub.
  const broken = {
    ...model,
    workspaces: model.workspaces.map(workspace => workspace.workspaceId !== hub.workspaceId ? workspace : {
      ...workspace,
      sections: workspace.sections.map(section => section.sectionId !== 'record' ? section : {
        ...section,
        organisms: [
          { role: 'detailPanel' as const, dataSource: projection.workspaceId },
          { role: 'contextualAction' as const, action: journey.workspaceId },
          { role: 'detailPanel' as const, dataSource: 'panelNobodyDerived' },
        ],
      }),
    }),
  };
  const gate = validateNs4E8Model(broken, input);
  // The detection did not loosen: all three are still findings.
  assert.equal(gate.issues.filter(issue => issue.code === 'NS4_E8_ORGANISM_SOURCE').length, 2);
  assert.equal(gate.issues.filter(issue => issue.code === 'NS4_E8_ORGANISM_ACTION').length, 1);

  const resolved = resolveNs4E8ModelFindings(broken, gate.issues);
  assert.deepEqual(resolved.unresolved, []);
  const repaired = resolved.artifact.workspaces.find(workspace => workspace.workspaceId === hub.workspaceId)!;
  const record = repaired.sections.find(section => section.sectionId === 'record')!;

  // 1. The projection tile became a local call over the SAME shared operation, with its shape.
  const wired = repaired.bffCalls.find(call => call.bffId === foreignQuery.bffId)!;
  assert.equal(wired.operationId, foreignQuery.operationId);
  assert.equal(wired.outputKind, foreignQuery.outputKind);
  assert.equal(record.organisms.some(organism => organism.dataSource === foreignQuery.bffId), true);
  // 2. The journey action left the sections and became navigation.
  assert.equal(record.organisms.some(organism => organism.action === journey.workspaceId), false);
  assert.equal((repaired.navigation || []).some(target => target.targetWorkspaceId === journey.workspaceId), true);
  // 3. What resolved to nothing lost its panel — the hub degrades, the run continues.
  assert.equal(record.organisms.some(organism => organism.dataSource === 'panelNobodyDerived'), false);
  assert.equal(record.organisms.length, 1, 'the wired tile stayed; the action and the phantom left');
  assert.deepEqual(
    resolved.systemDecisions.filter(decision => decision.findingRef.startsWith('NS4_E8_ORGANISM_')).map(decision => decision.chosen).sort(),
    ['dropUnbuildablePanel', 'openJourneyScreen', 'wireLocalQuery'],
  );
  assert.equal(validateNs4E8Model(resolved.artifact, input).issues
    .filter(issue => issue.severity !== 'warning').length, 0);
});

test('actors are actor ids and profileRefs are E3 profiles — the backend derives route scopes from actors', () => {
  const input = sources();
  const model = deriveNs4E8Model(input);
  const actorIds = new Set(input.access.profiles.flatMap((profile: any) => profile.actorRefs || []));
  const profileIds = new Set(input.access.profiles.map((profile: any) => profile.profileId));

  for (const workspace of model.workspaces) {
    for (const actor of workspace.actors) {
      // A profile id here would fabricate a route scope collab-auth never issued.
      assert.equal(actorIds.has(actor), true, `${workspace.workspaceId} lists ${actor} as an actor`);
    }
    for (const profile of workspace.profileRefs) assert.equal(profileIds.has(profile), true);
  }
  const catalogue = model.workspaces.find(workspace => workspace.workspaceId === 'changeOrderCatalogue')!;
  assert.ok(catalogue.actors.length, 'a catalogue names the actors behind its granted profiles');
  assert.equal(catalogue.actors.some(actor => profileIds.has(actor) && !actorIds.has(actor)), false);
});

test('a projection only reads a journey that is actually compiled', () => {
  const input = sources();
  const model = deriveNs4E8Model(input);
  const operations = new Set(model.operations.map(operation => operation.operationId));
  // Every call of every workspace resolves: a projection whose only reader was demoted is skipped,
  // never emitted against an operation that does not exist.
  for (const workspace of model.workspaces) {
    for (const call of workspace.bffCalls) {
      assert.equal(operations.has(call.operationId), true, `${workspace.workspaceId}.${call.bffId} -> ${call.operationId}`);
    }
  }
});
