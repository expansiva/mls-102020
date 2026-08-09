import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_COMPOSITION_SCHEMA_VERSION = '2026-08-09-ns4-composition-v1' as const;

export type Ns4AdditionalCapabilityKind = 'horizontalModule' | 'plugin';
export type Ns4AdditionalCapabilityDecision = 'include' | 'defer';

export interface Ns4AdditionalCapability {
  id: string;
  kind: Ns4AdditionalCapabilityKind;
  title: string;
  purpose: string;
  decision: Ns4AdditionalCapabilityDecision;
}

export interface Ns4E6Review {
  planId: 'e6-composition-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  analysisSummary: string;
  recommendations: Ns4AdditionalCapability[];
  changeSummary: string[];
}

export interface Ns4E6ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E6Review;
}

export interface Ns4CompositionArtifact {
  schemaVersion: typeof NS4_COMPOSITION_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  analysisSummary: string;
  recommendations: Ns4AdditionalCapability[];
  compositionHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: {
    status: 'pending';
    compiledFromCompositionHash: string;
  };
}

export function normalizeNs4E6Review(value: unknown, fallbackModule = ''): Ns4E6Review {
  const root = record(value);
  return {
    planId: 'e6-composition-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Additional modules and plugins',
    reviewRound: positiveInteger(root.reviewRound, 1),
    analysisSummary: text(root.analysisSummary),
    recommendations: array(root.recommendations).map(item => {
      const recommendation = record(item);
      return {
        id: text(recommendation.id),
        kind: text(recommendation.kind) as Ns4AdditionalCapabilityKind,
        title: text(recommendation.title),
        purpose: text(recommendation.purpose),
        decision: text(recommendation.decision) as Ns4AdditionalCapabilityDecision,
      };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export async function buildNs4CompositionArtifact(
  review: Ns4E6Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<Ns4CompositionArtifact> {
  const source = {
    analysisSummary: review.analysisSummary,
    recommendations: review.recommendations,
  };
  const compositionHash = await sha256Ns4(source);
  return {
    schemaVersion: NS4_COMPOSITION_SCHEMA_VERSION,
    moduleName: review.moduleName,
    userLanguage: review.userLanguage,
    ...source,
    compositionHash,
    approvedBy,
    approvedAt,
    realization: { status: 'pending', compiledFromCompositionHash: compositionHash },
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return array(value).map(text).filter(Boolean); }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
