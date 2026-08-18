/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4ClassicDefs.ts" enhancement="_blank"/>

/**
 * The untyped defs shape of the classic L4 emission, and its reader — PURE, with no storage import.
 * It lives apart from ns4Fs.ts on purpose: ns4Fs pulls in libModel, whose top-level event listener
 * crashes the l2 test stub, and the write/read round trip of these files must stay testable.
 */

export interface Ns4ClassicDefsFile {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  extension: string;
}

export function ns4ClassicDefsSource(fileInfo: Ns4ClassicDefsFile, exportName: string, value: unknown): string {
  const reference = `_${fileInfo.project}_/l${fileInfo.level}/${fileInfo.folder}/${fileInfo.shortName}${fileInfo.extension}`;
  return `/// <mls fileReference="${reference}" enhancement="_blank"/>\n\n`
    + `export const ${exportName} = ${JSON.stringify(value, null, 2)} as const;\n\n`
    + `export default ${exportName};\n`;
}

/** Reads a defs file back to its data, exactly as the storage reader does. */
export function parseNs4ClassicDefsSource<T>(source: string): T | null {
  const json = extractNs4ClassicJsonObject(source);
  if (!json) return null;
  try { return JSON.parse(json) as T; } catch { return null; }
}

export function extractNs4ClassicJsonObject(source: string): string {
  const assignment = source.search(/export\s+const\s+[A-Za-z_$][A-Za-z0-9_$]*\s*=/);
  const start = source.indexOf('{', Math.max(0, assignment));
  if (assignment < 0 || start < 0) return '';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') { depth -= 1; if (depth === 0) return source.slice(start, index + 1); }
  }
  return '';
}
