/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/nodejsTreeFingerprint.ts" enhancement="_blank"/>

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { TreeSnapshot } from '/_102020_/l2/agentPlannerL2/helpers/treeFingerprint.js';

/** Snapshot a real directory tree. Keys are posix-relative paths from `root`. */
export function snapshotDir(root: string): TreeSnapshot {
  const out: TreeSnapshot = {};
  walk(root, '', out);
  return out;
}

function walk(dir: string, rel: string, out: TreeSnapshot): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    const childPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(childPath, childRel, out);
    else if (entry.isFile()) out[childRel] = readFileSync(childPath, 'utf8');
  }
}
