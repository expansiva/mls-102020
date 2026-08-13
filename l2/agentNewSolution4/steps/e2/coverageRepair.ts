/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e2/coverageRepair.ts" enhancement="_blank"/>

import {
  normalizeNs4E2Review,
  Ns4E2Feature,
  Ns4E2Review,
  Ns4JourneyProposal,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';

export interface Ns4E2CoveragePatch {
  planId: 'e2-coverage-patch';
  moduleName: string;
  reviewRound: number;
  journeyUpserts: Ns4JourneyProposal[];
  featureUpserts: Ns4E2Feature[];
}

export interface Ns4E2CoveragePatchValidation {
  ok: boolean;
  errors: string[];
}

export function normalizeNs4E2CoveragePatch(
  value: unknown,
  fallbackModule = '',
  fallbackRound = 1,
): Ns4E2CoveragePatch {
  const source = record(value);
  const normalized = normalizeNs4E2Review({
    moduleName: text(source.moduleName) || fallbackModule,
    reviewRound: positiveInteger(source.reviewRound, fallbackRound),
    journeys: array(source.journeyUpserts),
    features: array(source.featureUpserts),
  }, fallbackModule);
  return {
    planId: 'e2-coverage-patch',
    moduleName: normalized.moduleName,
    reviewRound: normalized.reviewRound,
    journeyUpserts: normalized.journeys,
    featureUpserts: normalized.features,
  };
}

export function validateNs4E2CoveragePatch(
  patch: Ns4E2CoveragePatch,
  expectedModule: string,
  expectedRound: number,
  allowNoOp = false,
): Ns4E2CoveragePatchValidation {
  const errors: string[] = [];
  if (patch.moduleName !== expectedModule) errors.push(`moduleName must be ${expectedModule}.`);
  if (patch.reviewRound !== expectedRound) errors.push(`reviewRound must be ${expectedRound}.`);
  if (!allowNoOp && !patch.journeyUpserts.length && !patch.featureUpserts.length) {
    errors.push('At least one journeyUpsert or featureUpsert is required.');
  }
  checkUniqueIds(patch.journeyUpserts.map(item => item.journeyId), 'journeyUpserts', errors);
  checkUniqueIds(patch.featureUpserts.map(item => item.featureId), 'featureUpserts', errors);
  return { ok: errors.length === 0, errors };
}

export function applyNs4E2CoveragePatch(previous: Ns4E2Review, patch: Ns4E2CoveragePatch): Ns4E2Review {
  const journeys = upsertById(previous.journeys, patch.journeyUpserts, item => item.journeyId);
  const features = upsertById(previous.features, patch.featureUpserts, item => item.featureId);
  return {
    ...previous,
    moduleName: patch.moduleName,
    reviewRound: patch.reviewRound,
    journeys,
    features,
  };
}

function upsertById<T>(current: T[], upserts: T[], readId: (value: T) => string): T[] {
  const replacements = new Map(upserts.map(item => [readId(item), item]));
  const merged = current.map(item => {
    const id = readId(item);
    const replacement = replacements.get(id);
    if (replacement) replacements.delete(id);
    return replacement || item;
  });
  return [...merged, ...replacements.values()];
}

function checkUniqueIds(ids: string[], path: string, errors: string[]): void {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (!id) errors.push(`${path}[${index}] must have an id.`);
    if (seen.has(id)) errors.push(`${path}[${index}] duplicates ${id}.`);
    if (id) seen.add(id);
  });
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}
