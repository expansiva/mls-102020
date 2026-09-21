/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/treeFingerprint.ts" enhancement="_blank"/>

/** Relative posix path → fingerprint (file contents, or a caller-supplied token). */
export type TreeSnapshot = Record<string, string>;

export interface TreeDiff {
  created: string[];
  modified: string[];
  deleted: string[];
}

export interface TreeEntry {
  rel: string;
  fingerprint: string;
}

/** Snapshot an in-memory bag. Each item supplies its own relative path. */
export function snapshotEntries(entries: Iterable<TreeEntry>): TreeSnapshot {
  const out: TreeSnapshot = {};
  for (const entry of entries) out[entry.rel] = entry.fingerprint;
  return out;
}

export function diffTrees(before: TreeSnapshot, after: TreeSnapshot): TreeDiff {
  const created: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of [...keys].sort()) {
    const previous = before[key];
    const next = after[key];
    if (previous === undefined && next !== undefined) created.push(key);
    else if (previous !== undefined && next === undefined) deleted.push(key);
    else if (previous !== next) modified.push(key);
  }
  return { created, modified, deleted };
}

/** True when `rel` is `root` or a descendant. Both are posix paths. */
export function pathUnder(rel: string, root: string): boolean {
  const a = posixPath(rel);
  const b = posixPath(root);
  if (!b) return false;
  return a === b || a.startsWith(`${b}/`);
}

/** Paths in the diff that sit outside every allowed root. */
export function changedOutside(diff: TreeDiff, roots: readonly string[]): string[] {
  const all = [...diff.created, ...diff.modified, ...diff.deleted];
  return all.filter(rel => !roots.some(root => pathUnder(rel, root))).sort();
}

function posixPath(value: string): string {
  return String(value || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
