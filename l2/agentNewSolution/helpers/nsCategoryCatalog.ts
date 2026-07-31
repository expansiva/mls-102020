/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.ts" enhancement="_blank"/>

// Page-category catalog (collabux) — PURE parsing/summarizing/integrity helpers.
//
// SINGLE SOURCE OF TRUTH: `_102020_/l4/collabux/templates/categoryList.json`. No category id, count
// or description may be copied into a prompt, schema, gate or agent code — everything is derived
// from the file AT RUN TIME, so a category added to the JSON is classifiable on the next run with
// no code change. The catalog is read by the AGENT (disk/stor) and handed to the gate through the
// gate context, keeping the gate itself disk-free and unit-testable (same contract as
// NsE6OperationFact).
//
// Availability is NOT assumed: `parseNsCategoryCatalog` returns null for missing/!unusable input and
// every consumer degrades with a warning instead of failing the run (see gate.ts
// `presentation.catalog.unavailable`). This matters because level 4 of the agent project is not part
// of what the build ships (SHIP_LEVELS = ['l2']); when the catalog is absent the classification is
// simply not produced/enforced, and the warning in the trace says so out loud.

import { errorIssue, NsGateIssue } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';

export interface NsCategory {
  categoryId: string;
  name: string;
  description: string;
  typicalEntities: string[];
  commonOperations: string[];
  parentCategory?: string;
  /** Machine-readable template contract (T4 lint). Absent = lint skips this category with a warning. */
  minimumRequired?: Record<string, unknown>;
}

export interface NsCategoryCatalog {
  categories: NsCategory[];
  byId: Map<string, NsCategory>;
}

/** Parses the raw categoryList.json content. Returns null when absent/unusable (never throws). */
export function parseNsCategoryCatalog(raw: unknown): NsCategoryCatalog | null {
  const parsed = typeof raw === 'string' ? tryParseJson(raw) : raw;
  if (!isRecord(parsed) || !Array.isArray(parsed.categories)) return null;
  const categories: NsCategory[] = [];
  for (const item of parsed.categories) {
    if (!isRecord(item)) continue;
    const categoryId = readString(item.categoryId);
    if (!categoryId) continue;
    const category: NsCategory = {
      categoryId,
      name: readString(item.name) || categoryId,
      description: readString(item.description) || '',
      typicalEntities: readStringArray(item.typicalEntities),
      commonOperations: readStringArray(item.commonOperations),
    };
    const parentCategory = readString(item.parentCategory);
    if (parentCategory) category.parentCategory = parentCategory;
    if (isRecord(item.minimumRequired)) category.minimumRequired = item.minimumRequired;
    categories.push(category);
  }
  if (categories.length === 0) return null;
  // First occurrence wins in the index; the duplicate itself is reported by the integrity check.
  const byId = new Map<string, NsCategory>();
  for (const category of categories) if (!byId.has(category.categoryId)) byId.set(category.categoryId, category);
  return { categories, byId };
}

/**
 * Catalog integrity (a broken catalog is a CONFIGURATION error, not a classification error):
 * duplicated ids and a `parentCategory` pointing at an id that does not exist.
 */
export function validateNsCatalogIntegrity(catalog: NsCategoryCatalog): NsGateIssue[] {
  const issues: NsGateIssue[] = [];
  const seen = new Set<string>();
  for (const category of catalog.categories) {
    if (seen.has(category.categoryId)) {
      issues.push(errorIssue('catalog.category.duplicate', `categoryList.json declares duplicated categoryId ${category.categoryId}`, category.categoryId));
    }
    seen.add(category.categoryId);
  }
  for (const category of catalog.categories) {
    if (category.parentCategory && !catalog.byId.has(category.parentCategory)) {
      issues.push(errorIssue('catalog.parent.unknown', `category ${category.categoryId} declares parentCategory ${category.parentCategory}, which is not in the catalog`, category.categoryId));
    }
  }
  return issues;
}

/**
 * Compact catalog view for the classification prompt, BUILT AT RUN TIME (never pasted into a .md).
 * Keeps only what discriminates one category from another; the template.md is deliberately NOT
 * injected (the classifier picks a category, it does not render a page).
 */
export function summarizeNsCatalogForPrompt(catalog: NsCategoryCatalog): string {
  return catalog.categories.map(category => {
    const parts = [`- ${category.categoryId}: ${category.name}`];
    if (category.parentCategory) parts.push(` (child of ${category.parentCategory} — prefer this one when both fit)`);
    if (category.description) parts.push(`\n    ${category.description}`);
    if (category.typicalEntities.length) parts.push(`\n    typical entities: ${category.typicalEntities.join(', ')}`);
    if (category.commonOperations.length) parts.push(`\n    common operations: ${category.commonOperations.join(', ')}`);
    return parts.join('');
  }).join('\n');
}

function tryParseJson(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function readString(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && !!item.trim()) : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
