/// <mls fileReference="_102020_/l2/helpers/connections/declarationObject.ts" enhancement="_blank"/>

import { extractExportedObject } from '/_102020_/l2/helpers/assistantCatalog/asSource.js';

/**
 * The object a connection declaration exports, without evaluating the file.
 * Platform catalogs are `export const <name> = {…}`. A generated sibling declaration is
 * `const <id>[: T] = {…}; export default <id>`. Null when neither form is there.
 */
export function declarationObjectOf(source: string): unknown {
  const exported = extractExportedObject(source);
  if (exported !== null) return exported;
  const name = /export\s+default\s+([A-Za-z_$][\w$]*)\s*;/u.exec(source)?.[1];
  if (!name) return null;
  const declaration = new RegExp(String.raw`const\s+${name}\s*(?::[^=]+)?=\s*\{`, 'u').exec(source);
  if (!declaration) return null;
  const start = declaration.index + declaration[0].length - 1;
  const end = matchingBrace(source, start);
  if (end < 0) return null;
  try { return JSON.parse(source.slice(start, end + 1)) as unknown; } catch { return null; }
}

function matchingBrace(text: string, openIndex: number): number {
  let depth = 0;
  let quote = '';
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = '';
      continue;
    }
    if (char === '"' || char === '\'' || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}
