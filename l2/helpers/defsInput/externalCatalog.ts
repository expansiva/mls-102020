/// <mls fileReference="_102020_/l2/helpers/defsInput/externalCatalog.ts" enhancement="_blank"/>

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MLS_BASE = fileURLToPath(new URL('../../../../', import.meta.url));

/** Catalog files named by `external` entities (`/_102034_/l4/...`). A missing file leaves that source out. */
export async function externalCatalogTexts(entities: Record<string, unknown>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const entity of Object.values(entities)) {
    const row = entity as { kind?: unknown; source?: unknown } | null;
    const source = row?.kind === 'external' && typeof row.source === 'string' ? row.source : '';
    const match = /^\/_(\d+)_\/(.+)$/.exec(source);
    if (!match || out[source]) continue;
    try { out[source] = await readFile(path.join(MLS_BASE, `mls-${match[1]}`, match[2]), 'utf8'); }
    catch { /* the check then asks only for the page edits */ }
  }
  return out;
}
