/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages-page/decisionContext.ts" enhancement="_blank"/>

import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import type { D2SharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';

export const D2_PAGES_DECISION_PROMPT_MAX_CHARS = 160_000;

export interface D2PagesDecisionSources {
  page: D2SelectedPage;
  shared: D2SharedDefinition;
  definition: D2SharedDefinitionDocument;
  userLanguage: string;
  journeys: Array<{ journeyId: string; sourceRef: string; value: unknown }>;
  relevantRules: unknown[];
  organisms: Array<{ organismId: string; kind: string; intent: string; staticContent: boolean }>;
  categoryCatalog: unknown;
  categoryCatalogRef: string | null;
  moleculeShortlist: unknown;
  repair: { feedback: string; previous: unknown } | null;
}

export function buildD2PagesDecisionPrompt(sources: D2PagesDecisionSources): { prompt: string; sectionChars: Record<string, number> } {
  const { page, shared, definition } = sources;
  if (page.pageId !== definition.pageId || page.pageId !== shared.pageId) throw new Error('D2_PAGES_DECISION_SOURCE_MISMATCH');
  const payload = {
    page: {
      pageId: page.pageId, label: page.label, userLanguage: sources.userLanguage,
      actors: page.actors, ancestors: page.ancestors, authorityRefs: page.authorityRefs,
      organisms: sources.organisms,
      journeys: sources.journeys.map(compactJourney),
      relevantRules: sources.relevantRules,
    },
    shared: {
      sourceRef: `l2/${shared.moduleName}/web/shared/${page.pageId}.defs.ts`,
      intent: definition.intent,
      contractRef: definition.contractRef,
      authorityRefs: definition.authorityRefs,
      states: definition.states.map(state => ({
        id: state.id, purpose: state.purpose, origin: state.origin?.fragment || state.origin?.purpose,
        uiType: state.uiType, required: state.required, values: state.values,
        source: state.source, presentation: state.presentation, editable: state.editable,
        selection: state.selection ? { sourceActionRef: state.selection.sourceActionRef, resultStateRef: state.selection.resultStateRef, identityRef: state.selection.identityRef.fragment } : undefined,
      })),
      actions: definition.actions.map(action => ({
        id: action.id, callRef: action.callRef.fragment, inputs: action.inputs.map(input => ({ parameterRef: input.parameterRef.fragment, stateRef: input.stateRef })),
        resultStateRef: action.resultStateRef, statusStateRef: action.statusStateRef, errorStateRef: action.errorStateRef,
        refreshActionRefs: action.refreshActionRefs, authorityRefs: action.authorityRefs?.map(ref => ref.fragment || ref.fileRef),
        confirmation: action.confirmation, transitions: action.transitions,
      })),
      contents: definition.contents.map(content => ({ id: content.id, intent: content.intent, actionRef: content.actionRef, visibleWhen: content.visibleWhen?.map(ref => ref.fragment || ref.fileRef), stateRefs: content.stateRefs, inactiveBehavior: content.inactiveBehavior })),
      scenarios: definition.scenarios.map(scene => ({ id: scene.id, actionRef: scene.actionRef, contentRefs: scene.contentRefs, preconditions: scene.preconditions.map(ref => ref.fragment || ref.fileRef) })),
      coverage: shared.coverage.map(item => ({
        organismId: item.organismId, kind: item.kind, contentRef: item.contentRef,
        scenarioRefs: item.scenarioRefs, capabilityRefs: item.capabilityRefs,
        outputFieldsByCapability: item.outputFieldsByCapability,
      })),
    },
    pageCategoryCatalog: sources.categoryCatalog,
    templateGuidance: { catalogRef: sources.categoryCatalogRef, targetPage: 'page11', orientationPage: 'page21', selection: 'The selected category Markdown reference and hash are resolved after category judgment; no implicit style preference.' },
    moleculeShortlist: sources.moleculeShortlist,
    repair: sources.repair,
  };
  const sectionChars = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key, JSON.stringify(value).length]));
  const prompt = JSON.stringify(payload);
  assertD2PagesDecisionPromptLimit(prompt, sectionChars);
  return { prompt, sectionChars };
}

export function assertD2PagesDecisionPromptLimit(prompt: string, sectionChars: Record<string, number> = {}): void {
  if (prompt.length > D2_PAGES_DECISION_PROMPT_MAX_CHARS) {
    const sections = Object.entries(sectionChars).map(([name, chars]) => `${name}=${chars}`).join(', ');
    throw new Error(`D2_PAGES_DECISION_PROMPT_LIMIT: ${prompt.length} > ${D2_PAGES_DECISION_PROMPT_MAX_CHARS}${sections ? ` (${sections})` : ''}`);
  }
}

function compactJourney(item: D2PagesDecisionSources['journeys'][number]) {
  const value = record(item.value);
  const business = record(value.business);
  if (!item.journeyId || !item.sourceRef || !text(business.goal) || !Array.isArray(business.steps)) throw new Error(`D2_PAGES_JOURNEY_SEMANTICS_MISSING: ${item.journeyId}`);
  return {
    journeyId: item.journeyId, sourceRef: item.sourceRef, actorRef: business.actorRef,
    title: business.title, goal: business.goal, entry: business.entry,
    steps: business.steps, outcome: business.outcome,
  };
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
