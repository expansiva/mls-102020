/// <mls fileReference="_102020_/l2/helpers/defsInput/externalCatalog.ts" enhancement="_blank"/>

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogFilePath, externalConnectionId } from '/_102020_/l2/helpers/connections/catalogPath.js';

const MLS_BASE = fileURLToPath(new URL('../../../../', import.meta.url));

/** Catalog texts keyed by `connectionId`. A missing file or an invalid id leaves that connection out. */
export async function externalCatalogTexts(entities: Record<string, unknown>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const entity of Object.values(entities)) {
    const row = entity as { kind?: unknown } | null;
    if (row?.kind !== 'external') continue;
    const id = externalConnectionId(row);
    const match = /^\/_(\d+)_\/(.+)$/.exec(catalogFilePath(id));
    if (!id || !match || out[id]) continue;
    try { out[id] = await readFile(path.join(MLS_BASE, `mls-${match[1]}`, match[2]), 'utf8'); }
    catch { /* the check then asks only for the page edits */ }
  }
  return out;
}
