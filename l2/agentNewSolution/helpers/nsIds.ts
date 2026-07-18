/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsIds.ts" enhancement="_blank"/>

export function normalizeModuleFolderName(value: unknown, fallback = 'module'): string {
  const source = `${typeof value === 'string' && value.trim() ? value : fallback}` || 'module';
  const ascii = source
    .normalize('NFD')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  const words = ascii.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'module';
  const camel = words
    .map((word, index) => index === 0 ? word.toLowerCase() : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join('');
  return (camel.replace(/^[0-9]+/, '') || 'module').slice(0, 60);
}

export function reserveModuleFolderName(value: unknown, fallback: string, existingFolders: Iterable<string>): string {
  const existing = new Set(Array.from(existingFolders).map(item => normalizeModuleFolderName(item)));
  const base = normalizeModuleFolderName(value, fallback);
  if (!existing.has(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}${index}`;
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error(`[reserveModuleFolderName] no available folder for ${base}`);
}

export function normalizeNsId(value: unknown, fallback = 'item'): string {
  const source = `${typeof value === 'string' && value.trim() ? value : fallback}` || fallback;
  const ascii = source
    .normalize('NFD')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();
  const words = ascii.split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const camel = words
    .map((word, index) => index === 0 ? word.toLowerCase() : `${word.slice(0, 1).toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join('');
  return (camel.replace(/^[0-9]+/, '') || fallback).slice(0, 80);
}

export function uniqueNsId(baseValue: unknown, used: Set<string>, fallback = 'item'): string {
  const base = normalizeNsId(baseValue, fallback);
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}${index}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
  throw new Error(`[uniqueNsId] no available id for ${base}`);
}

export function collectDuplicateIds(ids: Iterable<string>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    const normalized = normalizeNsId(id);
    if (seen.has(normalized)) duplicates.add(normalized);
    seen.add(normalized);
  }
  return [...duplicates].sort();
}

export function toExportIdentifier(value: string, fallback = 'defsArtifact'): string {
  const words = value.trim().split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const joined = words.length > 0
    ? words.map((word, index) => index === 0 ? word : `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join('')
    : fallback;
  const clean = joined.replace(/[^a-zA-Z0-9_$]/g, '');
  if (/^[a-zA-Z_$]/.test(clean)) return clean;
  return clean ? `_${clean}` : fallback;
}

