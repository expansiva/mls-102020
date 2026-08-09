/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/gate.ts" enhancement="_blank"/>

import {
  Ns4E2Review,
  requiredNs4JourneyContexts,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export interface Ns4E2GateIssue {
  code: string;
  path: string;
  message: string;
}

export interface Ns4E2GateResult {
  ok: boolean;
  issues: Ns4E2GateIssue[];
}

const ID_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const BUSINESS_OBJECT_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
const RAW_TECHNICAL_ID_PATTERN = /\b(?:[a-z][A-Za-z0-9]*Id|[a-z][a-z0-9]*_id|[A-Za-z][A-Za-z0-9]*\s+(?:id|ID))\b/;
const STEP_KINDS = new Set(['locate', 'inspect', 'act', 'decide', 'handoff']);

export function validateNs4E2Review(review: Ns4E2Review): Ns4E2GateResult {
  const issues: Ns4E2GateIssue[] = [];
  const add = (code: string, path: string, message: string) => issues.push({ code, path, message });

  if (!ID_PATTERN.test(review.moduleName)) add('NS4_E2_MODULE_ID', 'moduleName', 'moduleName must be lower-camel identifier.');
  if (!review.journeys.length) add('NS4_E2_NO_JOURNEYS', 'journeys', 'At least one business journey is required.');

  const journeyIds = new Set<string>();
  const journeyIndex = new Map<string, number>();
  const exportedContexts = new Map<string, Map<string, string>>();
  review.journeys.forEach((journey, index) => {
    checkId(journey.journeyId, `journeys[${index}].journeyId`, 'journey', journeyIds, add);
    journeyIndex.set(journey.journeyId, index);
    const exported = new Map<string, string>();
    journey.business.entry.carries.forEach(context => exported.set(context.contextId, context.businessObject));
    journey.business.steps.forEach(step => step.providesContext.forEach(context => exported.set(context.contextId, context.businessObject)));
    exportedContexts.set(journey.journeyId, exported);
  });

  const featureIds = new Set<string>();
  review.features.forEach((feature, index) => {
    checkId(feature.featureId, `features[${index}].featureId`, 'feature', featureIds, add);
    if (!feature.title) add('NS4_E2_FEATURE_TITLE', `features[${index}].title`, 'Feature title is required.');
  });

  const validStepRefs = new Set<string>();
  review.journeys.forEach((journey, journeyPosition) => {
    const base = `journeys[${journeyPosition}]`;
    const business = journey.business;
    if (!business.actorRef) add('NS4_E2_ACTOR', `${base}.business.actorRef`, 'actorRef is required.');
    if (!business.title) add('NS4_E2_TITLE', `${base}.business.title`, 'Journey title is required.');
    if (!business.goal) add('NS4_E2_GOAL', `${base}.business.goal`, 'Journey goal is required.');
    checkBusinessText(business.goal, `${base}.business.goal`, add);
    if (!business.steps.length) add('NS4_E2_STEPS', `${base}.business.steps`, 'Journey must contain at least one step.');
    if (!business.outcome.statement) add('NS4_E2_OUTCOME', `${base}.business.outcome.statement`, 'Outcome statement is required.');
    if (!business.outcome.evidence.length || business.outcome.evidence.some(item => !item)) {
      add('NS4_E2_EVIDENCE', `${base}.business.outcome.evidence`, 'Outcome needs observable evidence.');
    }

    const entryContexts = new Set<string>();
    business.entry.carries.forEach((context, index) => {
      checkContext(context.contextId, context.businessObject, `${base}.business.entry.carries[${index}]`, entryContexts, add);
      checkBusinessText(context.description, `${base}.business.entry.carries[${index}].description`, add);
    });
    const requiredEntryContexts = requiredNs4JourneyContexts(business.entry.carries);
    if ((business.entry.mode === 'contextRequired' || business.entry.mode === 'contextOrLookup' || business.entry.mode === 'eventDriven')
      && !requiredEntryContexts.length) {
      add('NS4_E2_ENTRY_CONTEXT', `${base}.business.entry.carries`, `${business.entry.mode} requires at least one required carried business context.`);
    }
    if (business.entry.mode === 'coldStart' && requiredEntryContexts.length) {
      add('NS4_E2_COLD_START_CONTEXT', `${base}.business.entry.carries`, 'coldStart cannot depend on a required carried context. Use contextRequired or contextOrLookup.');
    }

    const preferredRef = business.entry.preferredFromJourneyRef;
    if (preferredRef) checkEarlierJourneyRef(preferredRef, journey.journeyId, journeyPosition, journeyIndex, `${base}.business.entry.preferredFromJourneyRef`, add);
    business.prerequisites.forEach((prerequisite, index) => {
      const path = `${base}.business.prerequisites[${index}]`;
      checkEarlierJourneyRef(prerequisite.journeyRef, journey.journeyId, journeyPosition, journeyIndex, `${path}.journeyRef`, add);
      if (!prerequisite.reason) add('NS4_E2_PREREQUISITE_REASON', `${path}.reason`, 'Prerequisite reason is required.');
      prerequisite.providesContext.forEach(contextId => {
        if (!entryContexts.has(contextId)) add('NS4_E2_PREREQUISITE_CONTEXT', `${path}.providesContext`, `Prerequisite provides undeclared entry context ${contextId}.`);
        const exported = exportedContexts.get(prerequisite.journeyRef);
        if (exported && !exported.has(contextId)) {
          add('NS4_E2_PREREQUISITE_HANDOFF', `${path}.providesContext`, `Journey ${prerequisite.journeyRef} does not export context ${contextId}. Use one stable contextId across the handoff.`);
        }
      });
    });

    const availableContexts = new Set(requiredEntryContexts.map(context => context.contextId));
    const contextObjects = new Map(business.entry.carries.map(context => [context.contextId, context.businessObject]));
    const stepIds = new Set<string>();
    business.steps.forEach((step, stepPosition) => {
      const path = `${base}.business.steps[${stepPosition}]`;
      checkId(step.stepId, `${path}.stepId`, 'step', stepIds, add);
      validStepRefs.add(`${journey.journeyId}.${step.stepId}`);
      if (!STEP_KINDS.has(step.kind)) {
        add('NS4_E2_STEP_KIND', `${path}.kind`, `Unknown step kind ${step.kind || '(empty)'}. Use locate, inspect, act, decide or handoff.`);
      }
      if (!step.intent) add('NS4_E2_STEP_INTENT', `${path}.intent`, 'Step intent is required.');
      if (!step.result) add('NS4_E2_STEP_RESULT', `${path}.result`, 'Step result must be observable.');
      checkBusinessText(step.intent, `${path}.intent`, add);
      checkBusinessText(step.result, `${path}.result`, add);
      if (step.kind === 'decide' && !step.requiresContext.length) {
        add('NS4_E2_DECISION_CONTEXT', `${path}.requiresContext`, 'A decide step must identify the record/context being decided.');
      }
      step.requiresContext.forEach(contextId => {
        if (!availableContexts.has(contextId)) {
          add('NS4_E2_CONTEXT_ORDER', `${path}.requiresContext`, `Context ${contextId} is not carried or produced by an earlier step.`);
        }
      });
      step.providesContext.forEach((context, contextPosition) => {
        const contextPath = `${path}.providesContext[${contextPosition}]`;
        checkContextShape(context.contextId, context.businessObject, contextPath, add);
        const previousObject = contextObjects.get(context.contextId);
        if (previousObject && previousObject !== context.businessObject) {
          add('NS4_E2_CONTEXT_OBJECT_CONFLICT', `${contextPath}.businessObject`, `Context ${context.contextId} must keep businessObject ${previousObject}, not ${context.businessObject}.`);
        }
        if (context.contextId) contextObjects.set(context.contextId, context.businessObject);
        checkBusinessText(context.description, `${contextPath}.description`, add);
        availableContexts.add(context.contextId);
      });
      step.featureRefs.forEach(featureRef => {
        if (!featureIds.has(featureRef)) add('NS4_E2_FEATURE_REF', `${path}.featureRefs`, `Unknown featureRef ${featureRef}.`);
      });
    });

    if (business.entry.mode === 'contextOrLookup') {
      const located = new Set(
        business.steps.filter(step => step.kind === 'locate').flatMap(step => step.providesContext.map(context => context.contextId)),
      );
      requiredEntryContexts.forEach(context => {
        const contextId = context.contextId;
        if (!located.has(contextId)) {
          add('NS4_E2_LOOKUP_FALLBACK', `${base}.business.steps`, `contextOrLookup must include a locate step that provides fallback context ${contextId}.`);
        }
      });
    }

    const ruleIds = new Set<string>();
    business.useRules.forEach((ruleId, index) => {
      checkId(ruleId, `${base}.business.useRules[${index}]`, 'rule reference', ruleIds, add);
    });
  });

  review.features.forEach((feature, index) => {
    if (feature.priority === 'now' && !feature.journeyStepRefs.length) {
      add('NS4_E2_NOW_FEATURE_UNMAPPED', `features[${index}].journeyStepRefs`, 'A now feature must map to at least one journey step.');
    }
    feature.journeyStepRefs.forEach(stepRef => {
      if (!validStepRefs.has(stepRef)) add('NS4_E2_FEATURE_STEP_REF', `features[${index}].journeyStepRefs`, `Unknown journey step ${stepRef}.`);
    });
  });

  return { ok: issues.length === 0, issues };
}

type AddIssue = (code: string, path: string, message: string) => void;

function checkId(value: string, path: string, label: string, ids: Set<string>, add: AddIssue): void {
  if (!ID_PATTERN.test(value)) add('NS4_E2_ID', path, `${label} id must be a lower-camel identifier.`);
  if (ids.has(value)) add('NS4_E2_DUPLICATE_ID', path, `Duplicate ${label} id ${value || '(empty)'}.`);
  if (value) ids.add(value);
}

function checkContext(contextId: string, businessObject: string, path: string, ids: Set<string>, add: AddIssue): void {
  checkId(contextId, `${path}.contextId`, 'context', ids, add);
  if (!businessObject) add('NS4_E2_CONTEXT_OBJECT', `${path}.businessObject`, 'Context businessObject is required.');
  else if (!BUSINESS_OBJECT_PATTERN.test(businessObject)) {
    add('NS4_E2_CONTEXT_OBJECT_ID', `${path}.businessObject`, 'Context businessObject must be a stable PascalCase identifier.');
  }
}

function checkContextShape(contextId: string, businessObject: string, path: string, add: AddIssue): void {
  if (!ID_PATTERN.test(contextId)) add('NS4_E2_ID', `${path}.contextId`, 'context id must be a lower-camel identifier.');
  if (!businessObject) add('NS4_E2_CONTEXT_OBJECT', `${path}.businessObject`, 'Context businessObject is required.');
  else if (!BUSINESS_OBJECT_PATTERN.test(businessObject)) {
    add('NS4_E2_CONTEXT_OBJECT_ID', `${path}.businessObject`, 'Context businessObject must be a stable PascalCase identifier.');
  }
}

function checkBusinessText(value: string, path: string, add: AddIssue): void {
  if (RAW_TECHNICAL_ID_PATTERN.test(value)) {
    add('NS4_E2_RAW_TECHNICAL_ID', path, 'Business-facing journey text must name the business record, not ask for a technical id.');
  }
}

function checkEarlierJourneyRef(
  journeyRef: string,
  currentJourneyId: string,
  currentPosition: number,
  indexes: Map<string, number>,
  path: string,
  add: AddIssue,
): void {
  if (!journeyRef || !indexes.has(journeyRef)) {
    add('NS4_E2_PREREQUISITE_REF', path, `Unknown prerequisite journey ${journeyRef || '(empty)'}.`);
    return;
  }
  if (journeyRef === currentJourneyId) add('NS4_E2_PREREQUISITE_SELF', path, 'A journey cannot require itself.');
  if ((indexes.get(journeyRef) ?? currentPosition) >= currentPosition) {
    add('NS4_E2_PREREQUISITE_ORDER', path, `Prerequisite ${journeyRef} must appear before ${currentJourneyId}.`);
  }
}
