/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/guard.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/helpers/hash.js';

export type SnapshotFile = { path: string; bytes: string };

export type DefsGuard = {
  created: string[];
  changed: string[];
  deleted: string[];
  outside: string[];
};

const PAGE_FILE = /(?:^|\/)l2\/[^/]+\/web\/(?:contracts|shared|desktop\/page11|mobile\/page11)\/([^/]+)\.defs\.ts$/;

function pageOf(path: string): string | undefined {
  return PAGE_FILE.exec(path)?.[1];
}

/** sha256 of product defs under l2/<mod>/web/. Pipeline files and anything else are left out. */
export async function snapshotOf(files: readonly SnapshotFile[]): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const file of files) {
    if (!pageOf(file.path)) continue;
    snapshot[file.path] = await sha256Text(file.bytes);
  }
  return snapshot;
}

/** Created, changed and deleted product paths. Paths outside `pages` are listed in `outside`. */
export function checkAfterDefs(before: Record<string, string>, after: Record<string, string>, pages: readonly string[]): DefsGuard {
  const allowed = new Set(pages);
  const created: string[] = [];
  const changed: string[] = [];
  const deleted: string[] = [];
  for (const path of Object.keys(after)) {
    if (!(path in before)) created.push(path);
    else if (before[path] !== after[path]) changed.push(path);
  }
  for (const path of Object.keys(before)) {
    if (!(path in after)) deleted.push(path);
  }
  const outside = [...created, ...changed, ...deleted].filter(path => {
    const page = pageOf(path);
    return !page || !allowed.has(page);
  });
  created.sort();
  changed.sort();
  deleted.sort();
  outside.sort();
  return { created, changed, deleted, outside };
}
