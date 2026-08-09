/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e5/contracts.ts" enhancement="_blank"/>

import { sha256Ns4 } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export const NS4_RULES_SCHEMA_VERSION = '2026-08-09-ns4-rules-v2' as const;

/** The permanent business-rule contract. Meaning lives here; consumers keep only the id. */
export interface Ns4RuleDefinition {
  id: string;
  description: string;
}

export interface Ns4E5Review {
  planId: 'e5-rules-review';
  moduleName: string;
  userLanguage: string;
  title: string;
  reviewRound: number;
  rules: Ns4RuleDefinition[];
  changeSummary: string[];
}

export interface Ns4E5ReviewEvent {
  action: 'approve' | 'requestChanges' | 'cancel';
  adjustment: string;
  review: Ns4E5Review;
}

export interface Ns4RulesArtifact {
  schemaVersion: typeof NS4_RULES_SCHEMA_VERSION;
  moduleName: string;
  userLanguage: string;
  rules: Ns4RuleDefinition[];
  rulesHash: string;
  approvedBy: 'human' | 'auto';
  approvedAt: string;
  realization: {
    status: 'pending';
    compiledFromRulesHash: string;
  };
}

export function normalizeNs4E5Review(value: unknown, fallbackModule = ''): Ns4E5Review {
  const root = record(value);
  return {
    planId: 'e5-rules-review',
    moduleName: text(root.moduleName) || fallbackModule,
    userLanguage: text(root.userLanguage) || 'en',
    title: text(root.title) || 'Business rules',
    reviewRound: positiveInteger(root.reviewRound, 1),
    rules: array(root.rules).map(item => {
      const rule = record(item);
      return { id: text(rule.id), description: text(rule.description) };
    }),
    changeSummary: strings(root.changeSummary),
  };
}

export async function buildNs4RulesArtifact(
  review: Ns4E5Review,
  approvedBy: 'human' | 'auto',
  approvedAt: string,
): Promise<Ns4RulesArtifact> {
  const rulesHash = await sha256Ns4(review.rules);
  return {
    schemaVersion: NS4_RULES_SCHEMA_VERSION,
    moduleName: review.moduleName,
    userLanguage: review.userLanguage,
    rules: review.rules,
    rulesHash,
    approvedBy,
    approvedAt,
    realization: { status: 'pending', compiledFromRulesHash: rulesHash },
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
