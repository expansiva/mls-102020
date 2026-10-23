/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asLookup.ts" enhancement="_blank"/>

// Deterministic reference resolution. A record field ("comandaId") is filled by running one of
// the app's own list queries for its target entity through /execBff (same session, same access
// rules as the screen) and matching the user's words against each row's display values: the
// entity's displayField and the displayField of every related entity the query returns
// (a Comanda row carries its Mesa, so "mesa 1" finds the comanda of table 1).

import type { AsBffCall, AsCatalog, AsLookup, AsRow } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { asRecord, findEntity } from '/_102020_/l2/agentAssistant/helpers/asCatalog.js';
import { parseDateInput, parseTimestampInput } from '/_102020_/l2/agentAssistant/helpers/asDates.js';

export const AS_LOOKUP_PAGE_SIZE = 50;
export const AS_LOOKUP_MAX_PAGES = 4;

export async function runLookup(
  catalog: AsCatalog,
  lookup: AsLookup,
  params: Record<string, string>,
  bff: AsBffCall,
): Promise<AsRow[]> {
  const rows: AsRow[] = [];
  const baseParams = coerceFilterParams(lookup, params);
  const paged = !!lookup.pageParam;
  for (let page = 1; page <= (paged ? AS_LOOKUP_MAX_PAGES : 1); page += 1) {
    const requestParams: Record<string, unknown> = { ...baseParams };
    if (lookup.pageParam) requestParams[lookup.pageParam] = page;
    if (lookup.pageSizeParam) requestParams[lookup.pageSizeParam] = AS_LOOKUP_PAGE_SIZE;
    const response = await bff(lookup.route, requestParams);
    if (!response.ok) {
      const error = response.error;
      throw new Error(`${lookup.route}: ${error?.code || 'ERROR'} ${error?.message || ''}`.trim());
    }
    const items = listItems(response.data, lookup);
    rows.push(...items.map(item => toRow(catalog, lookup, item)).filter((row): row is AsRow => !!row));
    if (!paged || !lookup.hasMorePath || getPath(response.data, lookup.hasMorePath) !== true) break;
  }
  return rows;
}

function coerceFilterParams(lookup: AsLookup, params: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const filter of lookup.filters) {
    const raw = params[filter.path];
    if (raw === undefined || raw === '') continue;
    if (filter.valueType === 'date' || filter.valueType === 'timestamp') {
      // a filter date the model wrote wrong is dropped, never sent as free text
      const iso = filter.valueType === 'date' ? parseDateInput(raw) : parseTimestampInput(raw);
      if (iso) setPath(out, filter.path, iso);
    } else if (filter.wireType === 'number') {
      const value = Number(raw.replace(',', '.'));
      if (Number.isFinite(value)) setPath(out, filter.path, value);
    } else if (filter.wireType === 'boolean') {
      setPath(out, filter.path, /^(true|sim|yes|1)$/i.test(raw.trim()));
    } else {
      setPath(out, filter.path, raw);
    }
  }
  return out;
}

export function listItems(data: unknown, lookup: AsLookup): unknown[] {
  const list = getPath(data, lookup.listPath);
  const items = lookup.itemsPath ? getPath(list, lookup.itemsPath) : list;
  return Array.isArray(items) ? items : [];
}

export function toRow(catalog: AsCatalog, lookup: AsLookup, item: unknown): AsRow | null {
  const record = asRecord(item);
  const id = record.id;
  if (typeof id !== 'string' && typeof id !== 'number') return null;
  const entity = findEntity(catalog, lookup.module, lookup.entity);
  const texts: Record<string, string> = {};
  const parts: string[] = [];
  const own = displayValue(getPath(record, entity?.displayField || 'id'));
  if (own) {
    texts[lookup.entity] = own;
    parts.push(`${entity?.title || lookup.entity} ${own}`);
  }
  for (const related of lookup.related) {
    const relatedEntity = findEntity(catalog, lookup.module, related.entity);
    const field = relatedEntity?.displayField || '';
    if (!field || !related.fields.includes(field)) continue;
    const value = displayValue(getPath(record, `${related.path}.${field}`));
    if (!value) continue;
    texts[related.entity] = value;
    parts.push(`${relatedEntity?.title || related.entity} ${value}`);
  }
  const version = record.version;
  return {
    id: String(id),
    label: parts.join(' · ') || String(id),
    ...(typeof version === 'number' ? { version } : {}),
    texts,
  };
}

function displayValue(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Exact matches win; otherwise any row whose value contains the term (or vice versa).
// matchEntity '' searches every display value of the row.
export function matchRows(rows: AsRow[], matchEntity: string, text: string): AsRow[] {
  const term = normalizeText(text);
  if (!term) return [];
  const valuesOf = (row: AsRow): string[] => {
    if (matchEntity && row.texts[matchEntity] !== undefined) return [row.texts[matchEntity]];
    if (matchEntity) return [];
    return Object.values(row.texts);
  };
  const exact = rows.filter(row => valuesOf(row).some(value => normalizeText(value) === term));
  if (exact.length) return exact;
  return rows.filter(row => valuesOf(row).some(value => {
    const normalized = normalizeText(value);
    return normalized.includes(term) || (normalized.length > 0 && term.includes(normalized) && normalized.length >= 3);
  }));
}

export function getPath(value: unknown, path: string): unknown {
  if (!path) return value;
  let current: unknown = value;
  for (const segment of path.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

export function setPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const segments = path.split('.');
  let current = target;
  for (const segment of segments.slice(0, -1)) {
    const next = current[segment];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) current[segment] = {};
    current = current[segment] as Record<string, unknown>;
  }
  current[segments[segments.length - 1]] = value;
}
