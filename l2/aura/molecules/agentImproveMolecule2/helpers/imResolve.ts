/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.ts" enhancement="_blank"/>

// Locating the target molecule and reading what exists today. This is the ONLY helper here that
// touches the disk; imInherit and imCoherence are pure and are fed from what this one reads.
//
// ⚠️ THE INVERTED PRECONDITION, and it is the reason this agent exists separately from
// agentNewMolecule2: nmFs.ts:75 states "a new molecule must not overwrite an existing one" — NM2
// REFUSES an existing file. Here the molecule MUST exist, and the failure when it does not points
// the user at agentNewMolecule2. Never reconcile the two with a mode flag inside the NM2 steps.
//
// Path building, stor mechanics and reference formatting are imported from NM2, never rewritten.

import {
  NmFileInfo,
  nmDestProject,
  nmDefsFile,
  nmTsFile,
  nmLessFile,
  nmHtmlFile,
  nmGroupIndexFile,
  nmFileExists,
  readStorText,
  toMlsFileReference,
  writeStorTextAtomic,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { detectInheritance } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imInherit.js';
import {
  IM_AGENT_FOLDER,
  IM_AGENT_PROJECT,
  ImArtifact,
  ImArtifactKind,
  ImInheritance,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';

export interface ImTargetRef {
  project: number;
  groupFolder: string;
  shortName: string;
  fileReference: string;
}

export class ImNotFoundError extends Error {
  constructor(public readonly attempted: string) {
    super(
      `molecule not found: ${attempted}. agentImproveMolecule2 only CHANGES molecules that already exist — to create one, use @@agentNewMolecule2.`,
    );
    this.name = 'ImNotFoundError';
  }
}

/**
 * Resolves what the classifier extracted from the prose into a concrete target in the CURRENT
 * project. Accepts either a bare shortName ('ml-data-table') or 'group/ml-data-table'.
 *
 * `knownGroups` comes from skills/index.ts — the same list the NM2 classifier uses. Passing it in
 * keeps this helper pure of skill loading.
 */
export function resolveTarget(rawTarget: string, knownGroups: string[]): ImTargetRef {
  const project = nmDestProject();
  const cleaned = (rawTarget || '').trim().replace(/\.ts$/, '');
  if (!cleaned) throw new ImNotFoundError('(empty)');

  const [maybeGroup, maybeName] = cleaned.includes('/') ? cleaned.split('/') : ['', cleaned];
  const shortName = (maybeName || '').trim();
  if (!shortName.startsWith('ml-')) throw new ImNotFoundError(cleaned);

  const candidates = maybeGroup
    ? [maybeGroup.toLowerCase()]
    : knownGroups.map((g) => g.toLowerCase());

  for (const groupFolder of candidates) {
    if (nmFileExists(nmTsFile(groupFolder, shortName))) {
      return {
        project,
        groupFolder,
        shortName,
        fileReference: toMlsFileReference(nmTsFile(groupFolder, shortName)),
      };
    }
  }

  throw new ImNotFoundError(maybeGroup ? cleaned : `${shortName} (searched every group of mls-${project})`);
}

/** The tag is DERIVED from the path, never authored — same rule as agentNewMolecule2. */
export function deriveTag(groupFolder: string, shortName: string): string {
  return `${groupFolder}--${shortName}`;
}

/**
 * Reads the four artifacts plus the group index, as they are RIGHT NOW.
 *
 * Every later step writes a delta over this. A missing `.less` or `.html` is recorded as
 * `present: false`, not an error — plenty of molecules have no playground yet. A missing `.ts` or
 * `.defs.ts` is fatal and is caught by the i1-locate gate, not here.
 */
export async function readArtifacts(target: ImTargetRef): Promise<ImArtifact[]> {
  const { groupFolder, shortName } = target;

  const files: Array<[ImArtifactKind, ReturnType<typeof nmTsFile>]> = [
    ['defs', nmDefsFile(groupFolder, shortName)],
    ['ts', nmTsFile(groupFolder, shortName)],
    ['less', nmLessFile(groupFolder, shortName)],
    ['html', nmHtmlFile(groupFolder, shortName)],
    ['groupIndex', nmGroupIndexFile(groupFolder, '.ts')],
  ];

  const out: ImArtifact[] = [];
  for (const [kind, fileInfo] of files) {
    const present = nmFileExists(fileInfo);
    out.push({
      kind,
      reference: toMlsFileReference(fileInfo),
      present,
      source: present ? await readStorText(fileInfo) : '',
    });
  }
  return out;
}

/**
 * Writing a SOURCE artifact of the molecule. Use this and never writeStorTextAtomic directly.
 *
 * ⚠️ THE 2026-08-10 DEFECT, and it cost a full run that reported success while changing nothing.
 *
 * `writeStorTextAtomic`'s third argument is `needCreateModel`, and its own comment states the rule:
 * TRUE for source artifacts, FALSE for l4 work files. Every one of this agent's six call sites
 * passed `false` (or `!present`, which is `false` for a file that exists) — treating a molecule's
 * `.ts` like a scratch JSON. Two things followed:
 *
 *   1. the editor model was never updated, so the write never reached where the Studio persists
 *      from: `ml-hierarchy-tree.ts` kept its 2026-08-05 timestamp while the run wrote its l4
 *      artifacts and reported "edited: ts";
 *   2. worse, THE COMPILE GATE WENT BLIND. compileStorTs compiles the MODEL, and the model still
 *      held the old content — so it compiled the OLD code, found no new error, and passed. Every
 *      "no new compile error" verdict in that run meant nothing.
 *
 * The second failure is the one already documented in that same comment: the n4-render blindness of
 * 2026-07-30, one paragraph below the line I ignored.
 *
 * The argument is not exposed here on purpose. A boolean that must always be true at six call sites
 * is a footgun, not a parameter.
 */
export async function writeImSource(fileInfo: NmFileInfo, content: string): Promise<void> {
  await writeStorTextAtomic(fileInfo, content, true);
}

// ---- this agent's own files (prompt.md, schemas) ----
// nmAgentFile is hardcoded to the NM2 folder, so it cannot be reused: a prompt read through it
// would silently return the NM2 prompt of the same name.

export function imAgentFile(folder: string, shortName: string, extension: string): NmFileInfo {
  const sub = folder ? `${IM_AGENT_FOLDER}/${folder}` : IM_AGENT_FOLDER;
  return { project: IM_AGENT_PROJECT, level: 2, folder: sub, shortName, extension };
}

export async function readImAgentText(folder: string, shortName: string, extension: string, required = false): Promise<string> {
  return readStorText(imAgentFile(folder, shortName, extension), required);
}

// ---- l4 work artifacts ----
// Same shape as nmWorkFile, under this agent's own folder: a run of IM2 must never land in the
// l4 folder of a NM2 run, including when route A hands the work over to NM2 with the same runKey.

export function imWorkFile(runKey: string, shortName: string): NmFileInfo {
  return { project: nmDestProject(), level: 4, folder: `agentImproveMolecule2/${runKey}`, shortName, extension: '.json' };
}

export const imContextFileInfo = (runKey: string): NmFileInfo => imWorkFile(runKey, 'context');
export const imTriageFileInfo = (runKey: string): NmFileInfo => imWorkFile(runKey, 'triage');

export function imTraceFileInfo(runKey: string, planId: string, attempt: number): NmFileInfo {
  return imWorkFile(runKey, `trace-${planId}-${String(attempt).padStart(2, '0')}`);
}

/** The writable path of one artifact of the target molecule. */
export function imFileInfoFor(
  target: { target: { groupFolder: string; shortName: string } } | ImTargetRef,
  kind: ImArtifactKind,
): NmFileInfo {
  const ref = 'target' in target ? target.target : target;
  const { groupFolder, shortName } = ref;
  if (kind === 'defs') return nmDefsFile(groupFolder, shortName);
  if (kind === 'ts') return nmTsFile(groupFolder, shortName);
  if (kind === 'less') return nmLessFile(groupFolder, shortName);
  if (kind === 'html') return nmHtmlFile(groupFolder, shortName);
  return nmGroupIndexFile(groupFolder, '.ts');
}

export function artifactOf(artifacts: ImArtifact[], kind: ImArtifactKind): ImArtifact | undefined {
  return artifacts.find((a) => a.kind === kind);
}

export function sourceOf(artifacts: ImArtifact[], kind: ImArtifactKind): string {
  return artifactOf(artifacts, kind)?.source || '';
}

/**
 * Shell detection, with the parent read when it is reachable.
 *
 * The parent lives in ANOTHER project by definition, and reading across projects may not be
 * possible at runtime. When it is not, the shell is still detected and `overridableMembers` comes
 * back empty — route C then offers `.less` and the "change the parent" instruction, but cannot
 * propose a member to override. That degradation is deliberate: better a narrower clarification
 * than a wrong one.
 */
export async function readInheritance(tsSource: string): Promise<ImInheritance> {
  const shallow = detectInheritance(tsSource);
  if (!shallow.isShell || !shallow.parentReference) return shallow;

  const parentSource = await readParentSource(shallow.parentReference);
  return parentSource ? detectInheritance(tsSource, parentSource) : shallow;
}

/**
 * The contract of a SHELL's parent.
 *
 * A shell exists to give another molecule a different appearance, not different behaviour, so what
 * the molecule PROMISES is stated in the parent's .defs.ts. Reading it is not a nicety: i2-triage
 * decides bug-versus-definition by asking "does the contract already promise this?", and for a
 * shell the only contract there is lives one project away.
 *
 * Measured 2026-08-10: mls-102054 carries ZERO .defs.ts across its 42 shells (mls-102055 carries 42
 * of 42), so without this every route C run in that project had nothing to judge against.
 */
export async function readParentDefs(parentReference: string): Promise<string> {
  return readParentSource(parentReference.replace(/\.ts$/, '.defs.ts'));
}

/**
 * The parent's SOURCE, for when a shell overrides one of its members.
 *
 * ⚠️ 2026-08-10: without it the model wrote an override referencing `this.open`, a member the parent
 * keeps private — two attempts burned on a compile error. Overriding a member means reading the
 * member, and the model cannot read what it was not shown.
 */
export async function readParentTs(parentReference: string): Promise<string> {
  return readParentSource(parentReference);
}

/**
 * A GROUP contract, by reference. Returns '' when it cannot be read.
 *
 * Two of them exist per group and they answer different questions:
 *
 *   creation (`skillReference`)      — how a molecule of this group is BUILT. Declares the surface in
 *                                     tables, plus the implementation rules.
 *   usage    (`skillUsageReference`) — what the group OFFERS to whoever consumes it: slots,
 *                                     properties, events, composition examples, design tokens.
 *
 * ⚠️ THE AGENTS READ THESE AND NEVER WRITE THEM (decision of 2026-08-17). The group contract is where
 * the public surface of every molecule in the group is defined; changing it is manual work in
 * mls-102020. An agent that could edit it could quietly widen what a whole group promises.
 *
 * ⚠️ AND READING THEM IS NOT NEW. `agentImproveMoleculeMaterialize`, the step that wrote code in the
 * previous flow, injected the group's creation skill into its prompt. agentImproveMolecule2 inherited
 * the REFERENCES in context.json and stopped injecting the content — and the measured cost was the
 * defect of 2026-08-14: asked for a label and help text on `ml-currency-input`, the editor invented two
 * public properties instead of declaring the slots `Label` and `Helper` that the group already requires.
 */
export async function readGroupSkill(reference: string): Promise<string> {
  if (!reference) return '';
  try {
    const mod = await import(reference) as { skill?: unknown };
    return typeof mod.skill === 'string' ? mod.skill : '';
  } catch {
    return '';
  }
}

/**
 * The source of the platform's base class, `_102033_/l2/moleculeBase.ts`.
 *
 * Read, never written — same rule and same reason as readGroupSkill above: this is the class every
 * molecule extends, maintained by hand in mls-102033, and an agent that could edit it could quietly
 * change what the whole platform guarantees. It is injected (not just described) because one fact that
 * decides many repairs — live-slot projection MOVES the consumer's nodes during `update()`, before
 * `updated()` runs — exists only as a comment on this source, not in any skill: a defect that appears
 * only on the first render and self-corrects afterward is this ordering, and a model cannot suspect an
 * ordering it was never shown.
 *
 * Deliberately NOT `nmBaseFile()` from agentNewMolecule2/helpers/nmFs — importing a helper across the
 * two agents couples flows that are meant to stay independent, so the path is a local literal instead.
 */
export async function readMoleculeBaseSource(): Promise<string> {
  try {
    return await readStorText({ project: 102033, level: 2, folder: '', shortName: 'moleculeBase', extension: '.ts' });
  } catch {
    return '';
  }
}

/** Best-effort read of a file in another project. Returns '' when it is not reachable. */
async function readParentSource(parentReference: string): Promise<string> {
  const m = parentReference.match(/^_?(\d+)_\/l(\d+)\/(.+)\/([^/]+)\.ts$/);
  if (!m) return '';
  const fileInfo = {
    project: Number(m[1]),
    level: Number(m[2]),
    folder: m[3],
    shortName: m[4],
    extension: '.ts',
  };
  try {
    return await readStorText(fileInfo as Parameters<typeof readStorText>[0]);
  } catch {
    return '';
  }
}
