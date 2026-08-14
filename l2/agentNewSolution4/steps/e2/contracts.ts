/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/contracts.ts" enhancement="_blank"/>

import type { Ns4SystemDecision } from '/_102020_/l2/agentNewSolution4/helpers/ns4Resolve.js';
import { collectNs4JourneyEntities, type Ns4DerivedContext } from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';
import {
  analyzeNs4E2MechanicalCoverage,
  isNs4E2DemotionDecisionId,
  ns4E2DemotionDecisionId,
  Ns4E2StepKindHistogram,
} from '/_102020_/l2/agentNewSolution4/steps/e2/coverageSignals.js';

export const NS4_JOURNEY_SCHEMA_VERSION = '2026-08-14-ns4-journey-v5' as const;
export const NS4_JOURNEY_INDEX_SCHEMA_VERSION = '2026-08-14-ns4-journey-index-v6' as const;
export const NS4_REALIZED_JOURNEY_SCHEMA_VERSION = '2026-08-14-ns4-journey-realized-v5' as const;
export const NS4_E2_IMPACT_REPORT_SCHEMA_VERSION = '2026-08-13-ns4-e2-impact-report-v2' as const;

export type Ns4JourneyEntryMode = 'coldStart' | 'contextRequired' | 'contextOrLookup' | 'eventDriven';
export type Ns4JourneyStepKind = 'locate' | 'inspect' | 'act' | 'decide' | 'handoff';
export type Ns4FeaturePriority = 'now' | 'next' | 'later';

/**
 * A step names what it does and to which business record. Everything about context — who provides
 * it, what it carries, how many — is derived by helpers/ns4Context.ts from this entity, the step
 * kind, the journey sequence and the approved ontology.
 */
export interface Ns4JourneyStep {
  stepId: string;
  kind: Ns4JourneyStepKind;
  entity: string;
  title: string;
  description: string;
  featureRefs: string[];
  /** Only a handoff names the receiving E3 profile; it is the routing fact E9 compiles. */
  targetProfile?: string;
}

export interface Ns4JourneyBusiness {
  actorRef: string;
  title: string;
  goal: string;
  entry: {
    mode: Ns4JourneyEntryMode;
    preferredFromJourneyRef?: string;
  };
  steps: Ns4JourneyStep[];
  outcome: {
    statement: string;
    evidence: string[];
  };
  useRules: string[];
}

/** Frozen shape of journeys written by flow versions before the context graph became derived. */
export interface Ns4LegacyJourneyContext {
  contextId: string;
  businessObject: string;
  cardinality: 'one' | 'many';
  required: boolean;
  description: string;
  stateRequirement?: string;
}

export interface Ns4LegacyJourneyBusiness {
  actorRef: string;
  title: string;
  goal: string;
  prerequisites: Array<{ journeyRef: string; reason: string; required: boolean; providesContext: string[] }>;
  entry: {
    mode: Ns4JourneyEntryMode;
    preferredFromJourneyRef?: string;
    carries: Ns4LegacyJourneyContext[];
  };
  steps: Array<{
    stepId: string;
    kind: Ns4JourneyStepKind;
    intent: string;
    requiresContext: string[];
    providesContext: Ns4LegacyJourneyContext[];
    result: string;
    featureRefs: string[];
  }>;
  outcome: { statement: string; evidence: string[] };
  useRules: string[];
}

export interface Ns4JourneyProposal {
  journeyId: string;
  business: Ns4JourneyBusiness;
  policyDecisions: Ns4PolicyDecision[];
}

/** A product choice made while generating a journey, before any human review. */
export interface Ns4PolicyDecision {
  decisionId: string;
  question: string;
  chosen: string;
  alternatives: string[];
  /** Only the independent E2 judge may add this explanation. */
  impact?: string;
  relatedJourneyIds?: string[];
}

/** Durable audit record of the choice the reviewer approved. */
export interface Ns4PolicyDecisionSelection {
  decisionId: string;
  generatedChoice: string;
  selectedChoice: string;
  selectedBy: 'human' | 'auto';
  selectedAt: string;
}

export interface Ns4E2Feature {
  featureId: string;
  title: string;
  priority: Ns4FeaturePriority;
  journeyStepRefs: string[];
}

export interface Ns4E2Review {
  planId: 'e2-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  journeys: Ns4JourneyProposal[];
  features: Ns4E2Feature[];
  systemDecisions: Ns4SystemDecision[];
}

export interface Ns4JourneyArtifactV5 extends Ns4JourneyProposal {
  schemaVersion: typeof NS4_JOURNEY_SCHEMA_VERSION;
  revision: number;
  businessHash: string;
  resolution: {
    status: 'pending';
    contexts: Record<string, never>;
  };
  realization: {
    status: 'pending';
    compiledFromBusinessHash: string;
    steps: never[];
    transitionRefs: never[];
  };
}

/** The derived context, plus the structural provenance E7 records for the compiled journey. */
export interface Ns4JourneyResolvedContext extends Ns4DerivedContext {
  sourceRefs: string[];
  consumerStepRefs: string[];
}

export interface Ns4JourneyStepRealization {
  stepId: string;
  useCaseRefs: string[];
}

export interface Ns4JourneyArtifactV5Realized extends Omit<Ns4JourneyProposal, 'policyDecisions'> {
  schemaVersion: typeof NS4_REALIZED_JOURNEY_SCHEMA_VERSION;
  revision: number;
  businessHash: string;
  resolution: {
    status: 'compiled';
    contexts: Record<string, Ns4JourneyResolvedContext>;
  };
  realization: {
    status: 'compiled';
    compiledFromBusinessHash: string;
    steps: Ns4JourneyStepRealization[];
    transitionRefs: string[];
    realizationHash: string;
  };
}

/**
 * Compile-only compatibility for permanent artifacts written by previous flow versions. They are
 * never resumed or migrated; the union only keeps already-generated L4 modules type-safe.
 */
export interface Ns4LegacyJourneyArtifact {
  schemaVersion: '2026-08-04-ns4-journey-v1' | '2026-08-09-ns4-journey-v2' | '2026-08-10-ns4-journey-v3' | '2026-08-10-ns4-journey-v4';
  journeyId: string;
  revision: number;
  business: Ns4LegacyJourneyBusiness | (Omit<Ns4LegacyJourneyBusiness, 'useRules'> & {
    businessRules: Array<{ journeyRuleId: string; statement: string }>;
  });
  policyDecisions?: Ns4PolicyDecision[];
  businessHash: string;
  resolution: { status: 'pending' | 'compiled'; contexts: Record<string, unknown> };
  realization: {
    status: 'pending' | 'compiled';
    compiledFromBusinessHash: string;
    steps: Array<{ stepId: string; useCaseRefs: string[] }>;
    transitionRefs: string[];
    realizationHash?: string;
  };
}

export type Ns4JourneyArtifact = Ns4JourneyArtifactV5 | Ns4JourneyArtifactV5Realized | Ns4LegacyJourneyArtifact;

/** A journey written by a previous flow version still declares its context graph; it is never compiled. */
export function isNs4CurrentJourneyBusiness(value: Ns4JourneyArtifact['business']): value is Ns4JourneyBusiness {
  return !('prerequisites' in value) && !('carries' in value.entry);
}

export interface Ns4JourneyIndex {
  schemaVersion: typeof NS4_JOURNEY_INDEX_SCHEMA_VERSION | '2026-08-12-ns4-journey-index-v5' | '2026-08-10-ns4-journey-index-v4' | '2026-08-04-ns4-journey-index-v1' | '2026-08-10-ns4-journey-index-v3' | '2026-08-09-ns4-journey-index-v2';
  moduleName: string;
  approvedAt: string;
  approvedBy: 'human' | 'auto';
  journeys: Array<{
    journeyId: string;
    actorRef: string;
    title: string;
    goal: string;
    entryMode: Ns4JourneyEntryMode;
    businessHash: string;
    artifactPath: string;
    useCaseRefs?: string[];
  }>;
  features: Ns4E2Feature[];
  policyDecisionSelections?: Ns4PolicyDecisionSelection[];
  systemDecisions?: Ns4SystemDecision[];
  realizationHash?: string;
}

export interface Ns4E2ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E2Review;
  policyDecisionSelections: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>>;
}

export interface Ns4E2ImpactReport {
  schemaVersion: typeof NS4_E2_IMPACT_REPORT_SCHEMA_VERSION;
  moduleName: string;
  generatedAt: string;
  stepKindHistogram: Ns4E2StepKindHistogram;
  changes: Array<{ journeyId: string; reason: 'hashDivergent' | 'journeyNew' | 'journeyRemoved' }>;
  affectedSteps: Array<'e3-access-matrix' | 'e4-ontology' | 'e5-rules' | 'e7-realization'>;
}

export function normalizeNs4E2Review(value: unknown, fallbackModule = ''): Ns4E2Review {
  const root = record(value);
  const userLanguage = text(root.userLanguage) || 'en';
  const journeys = withNs4DemotionDecisions(array(root.journeys).map(normalizeJourney), userLanguage);
  const features = array(root.features).map(item => {
    const feature = record(item);
    return {
      featureId: text(feature.featureId),
      title: text(feature.title),
      priority: featurePriority(feature.priority),
      journeyStepRefs: strings(feature.journeyStepRefs),
    };
  });
  return {
    planId: 'e2-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage,
    title: text(root.title) || 'Review business journeys',
    reviewRound: positiveInteger(root.reviewRound, 1),
    journeys,
    features,
    systemDecisions: normalizeSystemDecisions(root.systemDecisions),
  };
}

export async function buildNs4JourneyArtifacts(review: Ns4E2Review): Promise<Ns4JourneyArtifactV5[]> {
  return Promise.all(review.journeys.map(async journey => {
    const businessHash = await sha256Ns4(journey.business);
    return {
      schemaVersion: NS4_JOURNEY_SCHEMA_VERSION,
      journeyId: journey.journeyId,
      revision: 1,
      business: journey.business,
      policyDecisions: journey.policyDecisions,
      businessHash,
      resolution: { status: 'pending', contexts: {} },
      realization: { status: 'pending', compiledFromBusinessHash: businessHash, steps: [] as never[], transitionRefs: [] as never[] },
    } satisfies Ns4JourneyArtifactV5;
  }));
}

export function buildNs4JourneyIndex(
  moduleName: string,
  review: Ns4E2Review,
  artifacts: Ns4JourneyArtifactV5[],
  artifactPaths: string[],
  approvedBy: 'human' | 'auto',
  approvedAt: string,
  policyDecisionSelections: Ns4PolicyDecisionSelection[] = [],
): Ns4JourneyIndex {
  return {
    schemaVersion: NS4_JOURNEY_INDEX_SCHEMA_VERSION,
    moduleName,
    approvedAt,
    approvedBy,
    journeys: artifacts.map((artifact, index) => ({
      journeyId: artifact.journeyId,
      actorRef: artifact.business.actorRef,
      title: artifact.business.title,
      goal: artifact.business.goal,
      entryMode: artifact.business.entry.mode,
      businessHash: artifact.businessHash,
      artifactPath: artifactPaths[index],
    })),
    features: review.features,
    policyDecisionSelections,
    systemDecisions: review.systemDecisions,
  };
}

function normalizeSystemDecisions(value: unknown): Ns4SystemDecision[] {
  return array(value).map(item => {
    const decision = record(item);
    return {
      decisionId: text(decision.decisionId), stage: text(decision.stage), question: text(decision.question),
      chosen: text(decision.chosen), alternatives: strings(decision.alternatives), decidedBy: 'system' as const,
      findingRef: text(decision.findingRef), changeHint: text(decision.changeHint),
    };
  }).filter(decision => decision.decisionId && decision.stage && decision.question && decision.chosen && decision.findingRef);
}

export function buildNs4PolicyDecisionSelections(
  review: Ns4E2Review,
  selectedChoices: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>>,
  selectedBy: 'human' | 'auto',
  selectedAt: string,
): Ns4PolicyDecisionSelection[] {
  const selections = new Map(selectedChoices.map(selection => [selection.decisionId, selection.selectedChoice]));
  return review.journeys.flatMap(journey => journey.policyDecisions.map(decision => ({
    decisionId: decision.decisionId,
    generatedChoice: decision.chosen,
    selectedChoice: selections.get(decision.decisionId) || decision.chosen,
    selectedBy,
    selectedAt,
  })));
}

export function buildNs4E2ImpactReport(
  moduleName: string,
  previousIndex: Ns4JourneyIndex | null,
  artifacts: Array<Pick<Ns4JourneyArtifactV5, 'journeyId' | 'businessHash'>>,
  generatedAt: string,
  review: Pick<Ns4E2Review, 'journeys'>,
): Ns4E2ImpactReport {
  const previous = new Map((previousIndex?.journeys || []).map(journey => [journey.journeyId, journey.businessHash]));
  const changes: Ns4E2ImpactReport['changes'] = [];
  artifacts.forEach(artifact => {
    const oldHash = previous.get(artifact.journeyId);
    if (!oldHash) changes.push({ journeyId: artifact.journeyId, reason: 'journeyNew' });
    else if (oldHash !== artifact.businessHash) changes.push({ journeyId: artifact.journeyId, reason: 'hashDivergent' });
    previous.delete(artifact.journeyId);
  });
  previous.forEach((_hash, journeyId) => changes.push({ journeyId, reason: 'journeyRemoved' }));
  return {
    schemaVersion: NS4_E2_IMPACT_REPORT_SCHEMA_VERSION,
    moduleName,
    generatedAt,
    stepKindHistogram: analyzeNs4E2MechanicalCoverage(review).stepKindHistogram,
    changes: changes.sort((left, right) => left.journeyId.localeCompare(right.journeyId) || left.reason.localeCompare(right.reason)),
    affectedSteps: changes.length ? ['e3-access-matrix', 'e4-ontology', 'e5-rules', 'e7-realization'] : [],
  };
}

export async function sha256Ns4(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(stableNs4Stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

export function stableNs4Stringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableNs4Stringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    return `{${Object.keys(source).sort().map(key => `${JSON.stringify(key)}:${stableNs4Stringify(source[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function normalizeJourney(value: unknown): Ns4JourneyProposal {
  const source = record(value);
  const business = record(source.business);
  const entry = record(business.entry);
  const outcome = record(business.outcome);
  return {
    journeyId: text(source.journeyId),
    policyDecisions: array(source.policyDecisions).map(item => {
      const decision = record(item);
      const impact = text(decision.impact);
      const relatedJourneyIds = strings(decision.relatedJourneyIds);
      return {
        decisionId: text(decision.decisionId),
        question: text(decision.question),
        chosen: text(decision.chosen),
        alternatives: strings(decision.alternatives),
        ...(impact ? { impact } : {}),
        ...(relatedJourneyIds.length ? { relatedJourneyIds } : {}),
      };
    }),
    business: {
      actorRef: text(business.actorRef),
      title: text(business.title),
      goal: text(business.goal),
      entry: {
        mode: entryMode(entry.mode),
        ...(text(entry.preferredFromJourneyRef) ? { preferredFromJourneyRef: text(entry.preferredFromJourneyRef) } : {}),
      },
      steps: array(business.steps).map(item => {
        const step = record(item);
        const targetProfile = text(step.targetProfile);
        return {
          stepId: text(step.stepId),
          kind: stepKind(step.kind),
          entity: normalizeNs4BusinessObjectId(step.entity),
          title: text(step.title),
          description: text(step.description),
          featureRefs: strings(step.featureRefs),
          ...(targetProfile ? { targetProfile } : {}),
        };
      }),
      outcome: {
        statement: text(outcome.statement),
        evidence: strings(outcome.evidence),
      },
      useRules: strings(business.useRules),
    },
  };
}

/**
 * Turns a human-spaced or already technical business noun into the stable PascalCase id shared by
 * journeys and ontology entities. The transformation is intentionally lexical: it never translates
 * or substitutes a domain noun.
 */
export function normalizeNs4BusinessObjectId(value: unknown): string {
  const raw = text(value);
  if (!raw) return '';
  const decomposed = raw.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const words = decomposed
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .match(/[A-Za-z0-9]+/g) || [];
  return words.map(word => {
    if (/^[A-Z0-9]+$/.test(word)) return word;
    return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
  }).join('');
}

/**
 * A journey with no decision, no handoff and one single entity IS the record catalogue of that
 * entity. Tier 1 already owns that screen, so the module records the demotion as a visible product
 * choice at the E2 checkpoint instead of shipping the same catalogue twice. The decision is
 * deterministic: it is recomputed on every round and is never authored by the generator.
 */
export function withNs4DemotionDecisions(journeys: Ns4JourneyProposal[], userLanguage: string): Ns4JourneyProposal[] {
  const portuguese = userLanguage.toLowerCase().startsWith('pt');
  const captureOnly = new Map(analyzeNs4E2MechanicalCoverage({ journeys }).captureOnlyJourneys
    .map(item => [item.journeyId, item.entity]));
  return journeys.map(journey => {
    const entity = captureOnly.get(journey.journeyId);
    const decisionId = ns4E2DemotionDecisionId(journey.journeyId);
    const kept = journey.policyDecisions.filter(decision => !isNs4E2DemotionDecisionId(decision.decisionId));
    if (!entity) return kept.length === journey.policyDecisions.length ? journey : { ...journey, policyDecisions: kept };
    const chosen = portuguese ? `Tela de cadastro padrão de ${entity}` : `Standard ${entity} record catalogue`;
    const alternative = portuguese ? `Manter ${journey.business.title} como jornada própria` : `Keep ${journey.business.title} as its own journey`;
    return {
      ...journey,
      policyDecisions: [...kept, {
        decisionId,
        question: portuguese
          ? `${journey.business.title} não tem decisão nem repasse: vira a tela de cadastro padrão de ${entity}?`
          : `${journey.business.title} has no decision and no handoff: should it become the standard ${entity} record catalogue?`,
        chosen,
        alternatives: [chosen, alternative],
      }],
    };
  });
}

/** The journeys the approved review demoted to the tier 1 record catalogue of their entity. */
export function collectNs4DemotedJourneyIds(
  review: Pick<Ns4E2Review, 'journeys'>,
  selections: Array<Pick<Ns4PolicyDecisionSelection, 'decisionId' | 'selectedChoice'>> = [],
): string[] {
  const selected = new Map(selections.map(selection => [selection.decisionId, selection.selectedChoice]));
  return review.journeys.filter(journey => journey.policyDecisions.some(decision => {
    if (!isNs4E2DemotionDecisionId(decision.decisionId)) return false;
    return (selected.get(decision.decisionId) ?? decision.chosen) === decision.chosen;
  })).map(journey => journey.journeyId).sort();
}

/** Business objects that later ontology compilation must realize as entities or projections. */
export function collectNs4RequiredJourneyBusinessObjects(review: Ns4E2Review): string[] {
  return collectNs4JourneyEntities(review);
}

function entryMode(value: unknown): Ns4JourneyEntryMode {
  return value === 'contextRequired' || value === 'contextOrLookup' || value === 'eventDriven' ? value : 'coldStart';
}

function stepKind(value: unknown): Ns4JourneyStepKind {
  return typeof value === 'string' && value.trim() ? value.trim() as Ns4JourneyStepKind : 'locate';
}

function featurePriority(value: unknown): Ns4FeaturePriority {
  return value === 'next' || value === 'later' ? value : 'now';
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return array(value).map(text).filter(Boolean);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function boolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
