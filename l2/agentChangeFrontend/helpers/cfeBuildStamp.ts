/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeBuildStamp.ts" enhancement="_blank"/>

/**
 * A per-agent COPY of the same ~60 pure lines that live in agentChangeBackend and agentNewSolution.
 * Deliberate: importing one agent's helper from another inside 102020 would couple two independent
 * pipelines, and the previous round already decided against promoting this to a shared project (a
 * shared surface widens the blast radius of any change to every project).
 *
 * PROVENANCE of the running agent code: WHICH version of this agent produced this run.
 *
 * Not "is it stale?" — that question cannot be answered from inside the agent, and asking it produced a
 * wrong diagnosis once already. What happened on 2026-08-22 (run cb-run-…01-34-27, agentChangeBackend): the MDM F1 was in
 * nobody's build because it had never been committed. The `obj/compiled.zip` in play was perfectly
 * CONSISTENT — its `fileinfos.json` and its `.js` both sat on commit 308ab97 — and the run executed the
 * last PUBLISHED build, correctly. Measured, not argued (on the agentChangeBackend of the incident): the build recorded
 * `1ef6d903…` for one of its sources, exactly `git rev-parse 308ab97:<path>`, while the working copy on
 * the author's disk hashed to `5691b296…`. There was no build bug and nothing
 * to "recompile": what puts code on the platform is commit + push (the `build.yml` Action compiles and
 * commits `obj/compiled.zip`).
 *
 * So the useful line in a trace is not an alarm, it is an IDENTITY a human can match with git.
 *
 * WHAT THIS CANNOT DO — by construction, not by omission:
 *   - It cannot see work that was never committed and pushed: the platform has never seen it. No
 *     measurement from inside the agent finds it, by timestamp or by hash.
 *   - It cannot tell whether the built `.js` matches the `.ts` of the same commit. That would be a bug in
 *     the Action, and the place to catch it is there.
 *   - It is NOT a gate: it never blocks, never fails a run, and emits no warning. A source being edited
 *     locally is the NORMAL state of whoever is editing (a file "in development" keeps its local version
 *     instead of the build's `.js` — `cfe-collab-front-end/src/stor/stor.server.ts`), so treating that as
 *     an anomaly would be noise, not signal.
 */

/** The project this agent's code lives in. */
export const CFE_AGENT_PROJECT = 102020;

/** Only this agent's own sources: another folder's version says nothing about which agent ran. */
export const CFE_AGENT_SOURCE_PREFIX = 'l2/agentChangeFrontend/';

/**
 * The files a human checks first, in `git`. Kept short on purpose — the digest already covers everything;
 * these exist so a reader has something to paste into `git rev-parse <commit>:<path>` without unzipping.
 */
export const CFE_BUILD_ANCHORS: readonly string[] = [
  'l2/agentChangeFrontend/agentChangeFrontend.ts',
  'l2/agentChangeFrontend/flow.json',
  'l2/agentChangeFrontend/helpers/cfeCreateShared.ts',
  'l2/agentChangeFrontend/helpers/cfeMaterializeCore.ts',
];

/** One entry of the build's own manifest (`fileinfos.json` inside obj/compiled.zip). */
export interface AgentBuildFile {
  shortPath: string;
  /** git blob OID of the source AT THE BUILD COMMIT. Verified: equals `git hash-object <file>`. */
  versionRef: string;
}

export interface AgentProvenance {
  project: number;
  /**
   * Stable digest of the agent's `shortPath:versionRef` pairs. Two runs with the same buildRef executed
   * the same code; different buildRefs executed different code. Match a single file with
   * `git rev-parse <commit>:<path>` (or `git hash-object <file>` for a working copy).
   */
  buildRef: string;
  /** How many of this agent's sources went into the digest. */
  files: number;
  /** versionRef per anchor file; `absent` when the manifest has no entry (e.g. a file never committed). */
  anchors: Record<string, string>;
  /**
   * Last push registered on the project. NOT the build time: the platform webhook writes it on every
   * push (`cbe-collab-back-end/.../executeOnProjectUpdated.ts`) and the backend uses it to invalidate the
   * zip cache, so a push that produces no new build already moves it.
   */
  lastPushAt: string | null;
  /** How many of this agent's sources are being edited locally. Informational: this is normal. */
  localEdits: number;
  error?: string;
}

/**
 * FNV-1a over the sorted `shortPath:versionRef` pairs. Local and pure on purpose: the digest has to be
 * reproducible in a test without a platform, and it only has to be stable, not cryptographic.
 */
export function digestBuildFiles(files: readonly AgentBuildFile[]): string {
  const payload = files
    .map(file => `${file.shortPath}:${file.versionRef}`)
    .sort()
    .join('\n');
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index++) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * PURE. Builds the provenance from the manifest the browser already holds.
 *
 * The manifest is the right source precisely BECAUSE it is not perturbed by local editing: it is what
 * the build recorded. `mls.stor.files[].versionRef` is not usable here — a locally created file is
 * stamped `'0'` by `createStorFile`, so a digest over it would change as soon as anyone edits.
 */
export function buildProvenance(
  project: number,
  files: readonly AgentBuildFile[],
  options: { prefix: string; anchors: readonly string[]; lastPushAt?: string | null; localEdits?: number; error?: string },
): AgentProvenance {
  const own = files.filter(file => file.shortPath.startsWith(options.prefix) && file.versionRef);
  const byPath = new Map(own.map(file => [file.shortPath, file.versionRef]));
  const anchors: Record<string, string> = {};
  for (const anchor of options.anchors) anchors[anchor] = byPath.get(anchor) ?? 'absent';
  return {
    project,
    buildRef: own.length > 0 ? digestBuildFiles(own) : '',
    files: own.length,
    anchors,
    lastPushAt: options.lastPushAt ?? null,
    localEdits: options.localEdits ?? 0,
    ...(options.error ? { error: options.error } : {}),
  };
}

/** The one line a trace carries. No warning path: there is no measured signal that warrants one. */
export function describeProvenance(provenance: AgentProvenance | null): string {
  if (!provenance) return '';
  if (provenance.error) return ` Agent build: unknown (${provenance.error}).`;
  const anchor = Object.entries(provenance.anchors)[0];
  const sample = anchor ? `, ${anchor[0].split('/').pop()}=${anchor[1].slice(0, 12)}` : '';
  const edits = provenance.localEdits > 0 ? `, ${provenance.localEdits} source(s) edited locally` : '';
  return ` Agent build: ${provenance.project}@${provenance.buildRef} (${provenance.files} source(s)${sample}${edits}; last push ${provenance.lastPushAt ?? 'unknown'}).`;
}

/**
 * Read the provenance of the running agent. Fail-soft by contract: any throw becomes an empty
 * `buildRef` plus the reason, and never touches the run.
 */
export async function readAgentProvenance(project: number = CFE_AGENT_PROJECT): Promise<AgentProvenance> {
  try {
    const prj = await mls.stor.localDB.readPrjInfo(project);
    const files: AgentBuildFile[] = (prj?.fileInfo ?? [])
      .map(entry => ({ shortPath: String(entry?.shortPath || ''), versionRef: String(entry?.versionRef || '') }))
      .filter(file => file.shortPath);
    let localEdits = 0;
    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
      if (!String(file.folder || '').startsWith(CFE_AGENT_SOURCE_PREFIX.replace(/^l2\//u, ''))) continue;
      if (file.inLocalStorage === true || file.status === 'changed' || file.status === 'new') localEdits++;
    }
    return buildProvenance(project, files, {
      prefix: CFE_AGENT_SOURCE_PREFIX,
      anchors: CFE_BUILD_ANCHORS,
      lastPushAt: prj?.repository_lastModified || null,
      localEdits,
      ...(files.length === 0 ? { error: 'project info carries no fileInfo[]' } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return buildProvenance(project, [], {
      prefix: CFE_AGENT_SOURCE_PREFIX,
      anchors: CFE_BUILD_ANCHORS,
      error: `provenance unavailable: ${message}`,
    });
  }
}

/**
 * One line for a step trace, plus the same line in the console. Informational by contract — there is no
 * warning path here (see the header): the stamp records WHICH code ran, it does not judge it.
 */
export async function agentBuildTrace(logPrefix: string): Promise<string> {
  const described = describeProvenance(await readAgentProvenance());
  if (described) console.info(`${logPrefix}${described}`);
  return described;
}
