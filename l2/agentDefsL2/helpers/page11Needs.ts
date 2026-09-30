/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/page11Needs.ts" enhancement="_blank"/>

import { d2Page11Path } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import type { D2Page11Location } from '/_102020_/l2/agentDefsL2/helpers/page11.js';

/** Internal draft. Field paths and write bindings never enter the public definition. */
export interface D2Page11OrganismNeeds {
  reads: string[];
  edits: string[];
  selects: string;
  submits: Array<{ intentId: string; write: string }>;
}
export interface D2Page11Needs { organisms: Record<string, D2Page11OrganismNeeds> }

export function d2Page11NeedsPath(location: D2Page11Location): string {
  d2Page11Path(location);
  const device = location.device === 'desktop' ? 'Desktop' : 'Mobile';
  return `l2/${location.module}/pipeline/agentDefsL2/page11Needs/${location.pageId}${device}.json`;
}

export function buildD2Page11Needs(value: unknown): D2Page11Needs {
  const root = exact(value, ['organisms'], 'D2_PAGE11_NEEDS_KEYS');
  const rows = object(root.organisms, 'D2_PAGE11_NEEDS_ORGANISMS');
  const organisms: D2Page11Needs['organisms'] = {};
  for (const [id, raw] of Object.entries(rows)) {
    if (!/^[a-z][A-Za-z0-9]*$/u.test(id)) throw new Error(`D2_PAGE11_NEEDS_ORGANISM_ID: ${id}`);
    const row = exact(raw, ['reads', 'edits', 'selects', 'submits'], `D2_PAGE11_NEEDS_ORGANISM_KEYS: ${id}`);
    const reads = paths(row.reads, `D2_PAGE11_NEEDS_READS: ${id}`);
    const edits = paths(row.edits, `D2_PAGE11_NEEDS_EDITS: ${id}`);
    if (typeof row.selects !== 'string') throw new Error(`D2_PAGE11_NEEDS_SELECTS: ${id}`);
    if (!Array.isArray(row.submits)) throw new Error(`D2_PAGE11_NEEDS_SUBMITS: ${id}`);
    const submits = row.submits.map((rawSubmit, index) => {
      const submit = exact(rawSubmit, ['intentId', 'write'], `D2_PAGE11_NEEDS_SUBMIT_KEYS: ${id}/${index}`);
      if (typeof submit.intentId !== 'string' || !/^[a-z][A-Za-z0-9]*$/u.test(submit.intentId)) throw new Error(`D2_PAGE11_NEEDS_SUBMIT_ID: ${id}/${index}`);
      if (typeof submit.write !== 'string' || !/^[A-Z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/u.test(submit.write)) throw new Error(`D2_PAGE11_NEEDS_WRITE: ${id}/${index}`);
      return { intentId: submit.intentId, write: submit.write };
    });
    organisms[id] = { reads, edits, selects: row.selects, submits };
  }
  return { organisms };
}

function paths(value: unknown, code: string): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string' && /^[A-Z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+$/u.test(item))) throw new Error(code);
  return value;
}
function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
function exact(value: unknown, allowed: readonly string[], code: string): Record<string, unknown> {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of allowed) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
  return row;
}
