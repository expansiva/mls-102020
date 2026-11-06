/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.ts" enhancement="_blank" />
// Pure decisions for the Studio draft panel. No Lit. fetch, the release wait, reload,
// setContents, saveL5File, and the stor snapshot all come in as arguments.
// `listLocalFiles` is the caller's injection — its return value is `storFiles` here.
// `afterDraftSave` is the one default that calls `mls`, the same cleanup as
// serviceSave.afterUpdate; tests pass their own deps. A successful `saveToDraft`
// dispatches `collabDraftSaved` on `window` (the shell listens; the cm does not).
//
// Branch slugs mirror the server (cbeDraft.parseDraftSlug). The first `_` of a user slug is `@`
// and the remaining `_` are `.`, so an email with `.` or `_` in the local part does not round-trip.

import { forgetStaleDraftL2 } from '/_102033_/l2/cbe/studioDraftL2.js';
import { modelTextDiffers } from '/_102020_/l2/aura/studio/studioAutoSave.js';

const SLUG_RE = /^(team|user)-([a-z0-9_.-]{1,64})$/;
const SLUG_BODY = /^[a-z0-9_.-]{1,64}$/;

export interface IListedDraft {
  branch: string;
  ahead: number;
  behind: number;
  author: string;
  email: string;
  date: string;
  message: string;
  files: string[];
  /** Person email, `team`, or null when `owner.json` is missing. Absent on an older payload. */
  owner?: string | null;
}

/** The stor fields this panel reads. Callers keep the rest of `IFileInfo` on the same object. */
export interface IPanelStorFile {
  project: number;
  inLocalStorage?: boolean;
  status?: string;
  hasError?: boolean;
  /** Optional path parts. Together they build `l<level>/<folder/>shortName<extension>`. */
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
}

/** One file sitting in the browser, not yet saved to the draft. */
export interface ILocalEdit {
  shortPath: string;
  hasError: boolean;
  /** Compiler text when `hasError`. Absent when the editor has no message. */
  error?: string;
}

/** What `publish` asks the caller to store after a merge. The key itself stays in the service. */
export interface IPublishedRecord {
  files: string[];
  at: number;
}

export interface ISetContentsResult {
  result: boolean;
}

/** Window event after a successful draft send. The shell listens; there is no import either way. */
export const COLLAB_DRAFT_SAVED = 'collabDraftSaved';

/** Window event while a large file is uploaded in parts. The driver dispatches it; this panel only listens. */
export const COLLAB_DRAFT_UPLOAD = 'collabDraftUpload';

export interface ICollabDraftSavedDetail {
  project: number;
  paths: string[];
}

function dispatchDraftSaved(project: number, paths: string[]): void {
  const target = (globalThis as { window?: EventTarget }).window;
  if (!target || typeof target.dispatchEvent !== 'function') return;
  const detail: ICollabDraftSavedDetail = { project, paths };
  try {
    target.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVED, { detail }));
  } catch (err) {
    console.error('[draftPanel] collabDraftSaved was not dispatched:', err);
  }
}

export interface IFetchResponse {
  status: number;
  json: () => Promise<unknown>;
}

export type FetchImpl = (
  input: string,
  init: {
    method: 'POST';
    credentials: 'same-origin';
    headers: { 'Content-Type': 'application/json' };
    body: string;
  },
) => Promise<IFetchResponse>;

/** Same shape `collabRelease.waitForNew` resolves with. Injected; this file does not touch `window`. */
export interface IDraftWaitResult {
  changed: boolean;
  reason: 'released' | 'build-failed' | 'timeout';
}

/** What the caller uses to read `mls.stor.files` without this module importing mls. */
export type ListLocalFiles = () => Readonly<Record<string, IPanelStorFile | null | undefined>>;

export interface IExecFailure {
  ok: false;
  code: string;
  statusCode: number;
  files?: string[];
  /** Server reason, such as `draft.not_owner`. The panel translates the known ones. */
  msg?: string;
}

export interface IExecSuccess {
  ok: true;
  statusCode: number;
  status?: string;
  ref?: string;
  release?: string;
  msg?: string;
  /** Body of a `draftDiff` response (`status: 'diff'`). */
  text?: string;
  drafts?: IListedDraft[];
  /** Name returned by `draftResetDatabase` when `status` is `reset`. */
  database?: string;
  /** Reason on a `draftResetDatabase` HTTP 500, which has no `code`. */
  cause?: string;
}

export type ExecResult = IExecSuccess | IExecFailure;

export type PublishResult =
  | { outcome: 'merged' }
  | { outcome: 'nothing' }
  | { outcome: 'conflict'; files: string[] };

export interface IPublishEffects {
  fetchImpl: FetchImpl;
  waitForNew: () => Promise<IDraftWaitResult>;
  reload: () => void;
  /** Called only after a merge has landed and before `reload`. Absent → nothing is stored. */
  rememberPublished?: (record: IPublishedRecord) => void;
}

export interface IReloadEffects {
  fetchImpl: FetchImpl;
  reload: () => void;
}

export interface IDiscardEffects extends IReloadEffects {
  storFiles: Readonly<Record<string, IPanelStorFile | null | undefined>>;
  clearLocal: (file: IPanelStorFile) => Promise<void>;
}

/** Same signature as `saveL5File` in mls-102033. Injected so this file does not import mls. */
export type SaveL5File = (
  project: number,
  shortName: string,
  content: string,
  comment: string,
) => Promise<boolean>;

function fail(message: string): never {
  console.error('[draftPanel]', message);
  throw new Error(message);
}

function decodeDraftEmail(encoded: string): string {
  const at = encoded.indexOf('_');
  if (at < 0) return encoded;
  return `${encoded.slice(0, at)}@${encoded.slice(at + 1).replaceAll('_', '.')}`;
}

/** `team-x` → `team/x`; `user-<enc>` → `user/<email>`. Invalid slug → null. */
export function branchForSlug(slug: string): string | null {
  const match = SLUG_RE.exec(slug);
  if (!match) return null;
  const kind = match[1];
  const rest = match[2];
  return kind === 'team' ? `team/${rest}` : `user/${decodeDraftEmail(rest)}`;
}

/**
 * Inverse of `branchForSlug`. Returns a slug only when encoding and decoding land on the same
 * branch. A `.` or `_` in the local part of the email is ambiguous under this encoding → null.
 */
export function slugForBranch(branch: string): string | null {
  let slug: string | null = null;
  if (branch.startsWith('team/')) {
    const rest = branch.slice('team/'.length);
    if (!SLUG_BODY.test(rest)) return null;
    slug = `team-${rest}`;
  } else if (branch.startsWith('user/')) {
    const email = branch.slice('user/'.length);
    const at = email.indexOf('@');
    if (at <= 0 || email.indexOf('@', at + 1) !== -1) return null;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.includes('.') || local.includes('_')) return null;
    if (domain.length === 0) return null;
    const encoded = `${local}_${domain.replaceAll('.', '_')}`;
    if (!SLUG_BODY.test(encoded)) return null;
    slug = `user-${encoded}`;
  } else {
    return null;
  }
  if (branchForSlug(slug) !== branch) return null;
  return slug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

export async function callExec(
  fetchImpl: FetchImpl,
  action: string,
  body: Record<string, unknown>,
): Promise<ExecResult> {
  let response: IFetchResponse;
  try {
    response = await fetchImpl('/exec', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, action }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(message);
  }
  if (!isRecord(parsed)) return fail('response was not a JSON object');

  const statusCode = typeof parsed.statusCode === 'number' ? parsed.statusCode : response.status;
  if (typeof parsed.code === 'string') {
    const failure: IExecFailure = { ok: false, code: parsed.code, statusCode };
    const files = stringList(parsed.files);
    if (files !== undefined) failure.files = files;
    if (typeof parsed.msg === 'string') failure.msg = parsed.msg;
    return failure;
  }

  const success: IExecSuccess = { ok: true, statusCode };
  if (typeof parsed.status === 'string') success.status = parsed.status;
  if (typeof parsed.ref === 'string') success.ref = parsed.ref;
  if (typeof parsed.release === 'string') success.release = parsed.release;
  if (typeof parsed.msg === 'string') success.msg = parsed.msg;
  if (typeof parsed.text === 'string') success.text = parsed.text;
  if (Array.isArray(parsed.drafts)) success.drafts = parsed.drafts as IListedDraft[];
  if (typeof parsed.database === 'string') success.database = parsed.database;
  if (typeof parsed.cause === 'string') success.cause = parsed.cause;
  return success;
}

function readDrafts(value: IListedDraft[] | undefined): IListedDraft[] {
  if (!Array.isArray(value)) return fail('listDrafts response has no drafts array');
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.branch !== 'string') {
      return fail('listDrafts item has no branch');
    }
  }
  return value;
}

/** Current draft is the one whose branch matches `branchForSlug(slug)`. Missing branch → null. */
export async function loadPanel(
  fetchImpl: FetchImpl,
  project: number,
  slug: string,
): Promise<{ current: IListedDraft | null; others: IListedDraft[] }> {
  const result = await callExec(fetchImpl, 'listDrafts', { project });
  if (!result.ok) return fail(result.code);
  if (result.status !== 'listed') return fail(result.status ?? 'listDrafts failed');

  const drafts = readDrafts(result.drafts);
  const want = branchForSlug(slug);
  let current: IListedDraft | null = null;
  const others: IListedDraft[] = [];
  for (const draft of drafts) {
    if (current === null && want !== null && draft.branch === want) current = draft;
    else others.push(draft);
  }
  return { current, others };
}

export async function publish(
  effects: IPublishEffects,
  project: number,
  slug: string,
  comment: string,
  files: readonly string[] = [],
): Promise<PublishResult> {
  const result = await callExec(effects.fetchImpl, 'promote', {
    project,
    draft: slug,
    target: 'production',
    comment,
  });
  if (!result.ok) {
    if (result.code === 'DRAFT_CONFLICT') {
      return { outcome: 'conflict', files: result.files ?? [] };
    }
    return fail(result.code);
  }
  // No rebuild was scheduled, so waiting would time out and a reload would show the old page.
  if (result.status === 'nothing_to_promote') return { outcome: 'nothing' };
  if (result.status !== 'merged') return fail(result.status ?? 'promote failed');

  const wait = await effects.waitForNew();
  if (!wait.changed) return fail(wait.reason);
  effects.rememberPublished?.({ files: [...files], at: Date.now() });
  effects.reload();
  return { outcome: 'merged' };
}

/** Parses the published-record text the service stored. Invalid JSON or a wrong shape → null. */
export function readPublished(raw: string | null): IPublishedRecord | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[draftPanel]', `published record is not JSON: ${message}`);
    return null;
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.files) || typeof parsed.at !== 'number' || !Number.isFinite(parsed.at)) {
    console.error('[draftPanel]', 'published record has no files array or at');
    return null;
  }
  const files = stringList(parsed.files);
  if (files === undefined || files.length !== parsed.files.length) {
    console.error('[draftPanel]', 'published record files are not all strings');
    return null;
  }
  return { files, at: parsed.at };
}

/** Whole-branch diff. `draft` is the slug from `slugForBranch`, never the raw branch. */
export async function viewDiff(
  fetchImpl: FetchImpl,
  project: number,
  branch: string,
): Promise<string> {
  const slug = slugForBranch(branch);
  if (!slug) return fail(`branch has no draft slug: ${branch}`);
  const result = await callExec(fetchImpl, 'draftDiff', { project, draft: slug });
  if (!result.ok) return fail(result.code);
  if (result.status !== 'diff') return fail(result.status ?? 'draftDiff failed');
  if (typeof result.text !== 'string') return fail('draftDiff response has no text');
  return result.text;
}

/**
 * Changes only `studio.defaultDraft` in the current `l5/config.json` text and writes it back
 * through `saveL5File` (`shortName` `config`). Every other field stays.
 */
export async function saveDefaultDraft(
  currentJson: string,
  project: number,
  slug: string,
  comment: string,
  saveL5File: SaveL5File,
): Promise<void> {
  if (!SLUG_RE.test(slug)) return fail(`default draft slug is invalid: ${slug}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(currentJson);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`l5/config.json is not JSON: ${message}`);
  }
  if (!isRecord(parsed)) return fail('l5/config.json is not an object');
  if (parsed.studio !== undefined && !isRecord(parsed.studio)) {
    return fail('l5/config.json studio is not an object');
  }
  const studio = isRecord(parsed.studio) ? { ...parsed.studio } : {};
  studio.defaultDraft = slug;
  const content = JSON.stringify({ ...parsed, studio });
  const saved = await saveL5File(project, 'config', content, comment);
  if (!saved) return fail('saveL5File refused l5/config.json');
}

export async function discard(
  effects: IDiscardEffects,
  project: number,
  slug: string,
): Promise<void> {
  const result = await callExec(effects.fetchImpl, 'discardDraft', { project, draft: slug });
  if (!result.ok) return fail(result.code);
  if (result.status !== 'discarded') return fail(result.status ?? 'discard failed');
  try {
    await forgetStaleDraftL2(project, slug, new Set<string>());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[draftPanel]', `forgetStaleDraftL2: ${message}`);
  }
  for (const file of collectEditedFiles(effects.storFiles, project)) {
    try {
      await effects.clearLocal(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[draftPanel]', `clearLocal ${shortPathOf(file)}: ${message}`);
    }
  }
  effects.reload();
}

/** Drops the draft test database and recreates it from the seed. Sources stay. */
export async function resetDraftDatabase(
  fetchImpl: FetchImpl,
  project: number,
  slug: string,
): Promise<{ database: string }> {
  const result = await callExec(fetchImpl, 'draftResetDatabase', { project, draft: slug });
  if (!result.ok) return fail(result.msg ?? result.code);
  if (result.status !== 'reset') {
    const reason = result.cause?.trim() ? result.cause : (result.status ?? 'draftResetDatabase failed');
    return fail(reason);
  }
  if (!result.database) return fail('draftResetDatabase returned no database');
  return { database: result.database };
}

/** One path segment. A slash or `..` would restore something outside the module. */
const MODULE_SEGMENT = /^[A-Za-z0-9_.-]+$/;

/**
 * Directories the draft restore puts back to `main`.
 * The route rejects a trailing slash (`draft.path_invalid`), so these have none.
 */
export function moduleRestorePaths(moduleName: string): string[] {
  return [
    `l1/${moduleName}`,
    `l1/${moduleName}_old`,
    `l2/${moduleName}`,
    `l4/${moduleName}`,
  ];
}

/** A file of the module, including the `_old` directory. A longer name (`ordersExtra`) does not match. */
export function pathInModule(filePath: string, moduleName: string): boolean {
  if (!MODULE_SEGMENT.test(moduleName)) return false;
  return moduleRestorePaths(moduleName).some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}/`));
}

/** Pending files of one module, across l1, l1 `_old`, l2 and l4. */
export function modulePendingCount(files: readonly IPendingFile[], moduleName: string): number {
  let count = 0;
  for (const file of files) {
    if (pathInModule(file.path, moduleName)) count += 1;
  }
  return count;
}

export interface IDiscardModuleEffects {
  fetchImpl: FetchImpl;
  saveL5File: SaveL5File;
  /** Same undo as one file: `undoFile` in the stor lib, which drops a `new` file. */
  undoFile: (file: IPanelStorFile) => Promise<void>;
  storFiles: Readonly<Record<string, IPanelStorFile | null | undefined>>;
  /** Reread the project and swap the visible screen. */
  reloadLive: () => Promise<void>;
}

function parseConfigObject(text: string, which: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`l5/config.json (${which}) is not JSON: ${message}`);
  }
  if (!isRecord(parsed)) return fail(`l5/config.json (${which}) is not an object`);
  return parsed;
}

function projectNode(config: Record<string, unknown>, project: number, required: boolean): Record<string, unknown> | null {
  const projects = config.projects;
  if (projects === undefined && !required) return null;
  if (!isRecord(projects)) return fail('l5/config.json projects is not an object');
  const node = projects[String(project)];
  if (node === undefined) {
    if (!required) return null;
    return fail(`l5/config.json has no project ${project}`);
  }
  if (!isRecord(node)) return fail(`l5/config.json project ${project} is not an object`);
  return node;
}

function moduleList(node: Record<string, unknown>): unknown[] {
  const modules = node.modules;
  if (modules === undefined) return [];
  if (!Array.isArray(modules)) return fail('l5/config.json modules is not an array');
  return modules;
}

function moduleIdOf(block: unknown): string | null {
  if (!isRecord(block)) return null;
  return typeof block.moduleId === 'string' ? block.moduleId : null;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Replaces one module object. Its `navigation` travels inside the object. Other modules stay. */
function swapModule(currentModules: readonly unknown[], publishedModules: readonly unknown[], moduleName: string): unknown[] {
  const published = publishedModules.find((block) => moduleIdOf(block) === moduleName);
  const next: unknown[] = [];
  let placed = false;
  for (const block of currentModules) {
    if (moduleIdOf(block) !== moduleName) {
      next.push(block);
      continue;
    }
    if (!placed && published !== undefined) {
      next.push(cloneJson(published));
      placed = true;
    }
  }
  if (!placed && published !== undefined) {
    const index = publishedModules.findIndex((block) => moduleIdOf(block) === moduleName);
    const at = index < 0 ? next.length : Math.min(index, next.length);
    next.splice(at, 0, cloneJson(published));
  }
  return next;
}

/**
 * The current `l5/config.json` with only this module's block taken from the published text.
 * `changed` is false when that block already matches, so the caller does not rewrite the file.
 */
export function replaceModuleBlock(
  currentJson: string,
  publishedJson: string,
  project: number,
  moduleName: string,
): { content: string; changed: boolean } {
  if (!MODULE_SEGMENT.test(moduleName)) return fail(`module name is invalid: ${moduleName}`);
  const current = parseConfigObject(currentJson, 'current');
  const published = parseConfigObject(publishedJson, 'published');
  const currentProject = projectNode(current, project, true);
  if (!currentProject) return fail(`l5/config.json has no project ${project}`);
  const publishedProject = projectNode(published, project, false);
  const currentModules = moduleList(currentProject);
  const publishedModules = publishedProject ? moduleList(publishedProject) : [];
  const next = swapModule(currentModules, publishedModules, moduleName);
  if (JSON.stringify(next) === JSON.stringify(currentModules)) {
    return { content: currentJson, changed: false };
  }
  currentProject.modules = next;
  return { content: JSON.stringify(current), changed: true };
}

function isModuleLocalCopy(file: IPanelStorFile): boolean {
  if (file.inLocalStorage) return true;
  return file.status === 'new' || file.status === 'changed' || file.status === 'deleted' || file.status === 'renamed';
}

function moduleLocalFiles(
  storFiles: Readonly<Record<string, IPanelStorFile | null | undefined>>,
  project: number,
  moduleName: string,
): IPanelStorFile[] {
  const found: IPanelStorFile[] = [];
  for (const file of Object.values(storFiles)) {
    if (!file || file.project !== project) continue;
    if (!pathInModule(shortPathOf(file), moduleName)) continue;
    if (!isModuleLocalCopy(file)) continue;
    found.push(file);
  }
  found.sort((a, b) => shortPathOf(a).localeCompare(shortPathOf(b)));
  return found;
}

/**
 * Puts one module back to the published sources.
 * The server restores the four directories. `l5/config.json` keeps every other block.
 * Local copies of those paths, including a `new` file under `_old`, go through `undoFile`.
 */
export async function discardModule(
  effects: IDiscardModuleEffects,
  project: number,
  slug: string,
  moduleName: string,
  currentJson: string,
  publishedJson: string,
): Promise<void> {
  if (!MODULE_SEGMENT.test(moduleName)) return fail(`module name is invalid: ${moduleName}`);
  const paths = moduleRestorePaths(moduleName);
  const result = await callExec(effects.fetchImpl, 'draftRestorePaths', {
    project,
    draft: slug,
    ref: 'main',
    paths,
  });
  if (!result.ok) return fail(result.msg ?? result.code);
  if (result.status !== 'restored' && result.status !== 'unchanged') {
    return fail(result.status ?? 'draftRestorePaths failed');
  }
  const replaced = replaceModuleBlock(currentJson, publishedJson, project, moduleName);
  if (replaced.changed) {
    const saved = await effects.saveL5File(project, 'config', replaced.content, `discard module ${moduleName}`);
    if (!saved) return fail('saveL5File refused l5/config.json');
  }
  const failures: string[] = [];
  for (const file of moduleLocalFiles(effects.storFiles, project, moduleName)) {
    try {
      await effects.undoFile(file);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const label = shortPathOf(file);
      console.error('[draftPanel]', `undoFile ${label}: ${message}`);
      failures.push(`${label}: ${message}`);
    }
  }
  if (failures.length > 0) return fail(failures.join('; '));
  try {
    await effects.reloadLive();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[draftPanel]', `reloadLive: ${message}`);
    return fail(message);
  }
}

/** `DRAFT_CONFLICT: <files>` — the panel turns this into `syncConflict`. */
export async function syncWithPublished(
  effects: IReloadEffects,
  project: number,
  slug: string,
): Promise<void> {
  const result = await callExec(effects.fetchImpl, 'draftSync', { project, draft: slug });
  if (!result.ok) {
    if (result.code === 'DRAFT_CONFLICT') {
      return fail(`DRAFT_CONFLICT: ${(result.files ?? []).join(', ')}`);
    }
    return fail(result.code);
  }
  if (
    result.status === 'fast_forwarded'
    || result.status === 'merged'
    || result.status === 'up_to_date'
  ) {
    effects.reload();
    return;
  }
  return fail(result.status ?? 'draftSync failed');
}

/**
 * Dirty files of one project: `inLocalStorage` or `status === 'deleted'`, and `project !== 0`.
 * Same filter as serviceSave's save list — not the localDB prefix scan.
 */
export function collectEditedFiles<T extends IPanelStorFile>(
  storFiles: Readonly<Record<string, T | null | undefined>>,
  project: number,
): T[] {
  const edited: T[] = [];
  for (const file of Object.values(storFiles)) {
    if (!file) continue;
    if (!file.inLocalStorage && file.status !== 'deleted') continue;
    if (file.project === 0 || file.project !== project) continue;
    edited.push(file);
  }
  return edited;
}

/** `l<level>/<folder/>shortName<extension>`. With no level, folder, or extension, the short name. */
function shortPathOf(file: IPanelStorFile): string {
  const name = file.shortName ?? '';
  const folder = file.folder ?? '';
  const extension = file.extension ?? '';
  if (file.level === undefined && folder === '' && extension === '') return name;
  const levelPart = file.level === undefined ? '' : `l${file.level}/`;
  const folderPart = folder === '' ? '' : `${folder}/`;
  return `${levelPart}${folderPart}${name}${extension}`;
}

/** Browser edits of one project: same files as `collectEditedFiles`, as short path + error mark. */
export function localEdits(
  storFiles: Readonly<Record<string, IPanelStorFile | null | undefined>>,
  project: number,
): ILocalEdit[] {
  return collectEditedFiles(storFiles, project).map((file) => ({
    shortPath: shortPathOf(file),
    hasError: file.hasError === true,
  }));
}

export interface IPanelModelInput {
  local: readonly ILocalEdit[];
  /** `current.files` of the open draft. `null` when `loadPanel` has no current draft. */
  draft: readonly string[] | null;
  published: IPublishedRecord | null;
  /** Id from the release ping, or null when the ping has none. */
  release: string | null;
}

export interface IPanelModel {
  local: { count: number; files: ILocalEdit[] };
  draft: { count: number; files: string[] };
  published: { count: number; files: string[]; release: string | null };
}

/** The three blocks, in order: browser, this draft, published. Counts come from the lists. */
export function panelModel(input: IPanelModelInput): IPanelModel {
  const localFiles = input.local.map((file) => ({ shortPath: file.shortPath, hasError: file.hasError }));
  const draftFiles = input.draft === null ? [] : [...input.draft];
  const publishedFiles = input.published === null ? [] : [...input.published.files];
  return {
    local: { count: localFiles.length, files: localFiles },
    draft: { count: draftFiles.length, files: draftFiles },
    published: { count: publishedFiles.length, files: publishedFiles, release: input.release },
  };
}

/** One pending path. The same path can sit in the browser and in the draft. */
export interface IPendingFile {
  path: string;
  inBrowser: boolean;
  inDraft: boolean;
  hasError: boolean;
  /** Compiler text for a browser file. Draft-only paths have none. */
  error?: string;
}

export type DraftTreeKind = 'root' | 'person' | 'group' | 'level' | 'module' | 'folder' | 'file';

/** Level, then module, then folders, then the file. Counts cover every file under the node. */
export interface IDraftTreeNode {
  id: string;
  name: string;
  kind: DraftTreeKind;
  count: number;
  inBrowser: number;
  inDraft: number;
  withError: number;
  /** False on another person's subtree: the panel prints only the total. */
  showUnsaved: boolean;
  branch: string;
  ahead: number;
  behind: number;
  /** Short path of a file node. Empty on every other kind. */
  path: string;
  /** Compiler text of a file node. Empty when there is none. */
  error: string;
  children: IDraftTreeNode[];
}

/** One person under the draft root. `mine` is the open draft; the rest come from `listDrafts`. */
export interface IPanelPersonInput {
  id: string;
  name: string;
  mine: boolean;
  branch: string;
  ahead: number;
  behind: number;
  files: readonly IPendingFile[];
  /** `listDrafts.owner`. Null has no owner. Omitted means the caller already named an owned person. */
  owner?: string | null;
}

/** A row the panel may paint. Closed nodes contribute no children. */
export interface IVisibleTreeRow {
  id: string;
  name: string;
  kind: DraftTreeKind;
  depth: number;
  count: number;
  inBrowser: number;
  inDraft: number;
  withError: number;
  showUnsaved: boolean;
  expandable: boolean;
}

export type DraftNodeAction = 'makeDefault' | 'syncPublished' | 'discardModule' | 'undoFile' | 'view' | 'experiment';

export interface IActionCounts {
  save: number;
  publish: number;
  discard: number;
}

interface IMutableTreeNode {
  id: string;
  name: string;
  kind: DraftTreeKind;
  files: IPendingFile[];
  children: Map<string, IMutableTreeNode>;
}

function rememberPending(byPath: Map<string, IPendingFile>, path: string, fromDraft: boolean, hasError: boolean, error = ''): void {
  if (path.trim() === '') {
    console.error('[draftPanel] pending file has an empty path');
    return;
  }
  const found = byPath.get(path);
  if (found) {
    if (fromDraft) found.inDraft = true;
    else found.inBrowser = true;
    if (hasError) found.hasError = true;
    if (error && !found.error) found.error = error;
    return;
  }
  const created: IPendingFile = {
    path,
    inBrowser: !fromDraft,
    inDraft: fromDraft,
    hasError,
  };
  if (error) created.error = error;
  byPath.set(path, created);
}

/** Browser edits and draft paths, one entry per path. */
export function pendingFiles(local: readonly ILocalEdit[], draftPaths: readonly string[]): IPendingFile[] {
  const byPath = new Map<string, IPendingFile>();
  for (const file of local) rememberPending(byPath, file.shortPath, false, file.hasError, file.error ?? '');
  for (const path of draftPaths) rememberPending(byPath, path, true, false);
  return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function childOf(parent: IMutableTreeNode, name: string, kind: DraftTreeKind): IMutableTreeNode {
  const found = parent.children.get(name);
  if (found) return found;
  const id = parent.id === '' ? name : `${parent.id}/${name}`;
  const created: IMutableTreeNode = { id, name, kind, files: [], children: new Map() };
  parent.children.set(name, created);
  return created;
}

function tally(files: readonly IPendingFile[]): Pick<IDraftTreeNode, 'count' | 'inBrowser' | 'inDraft' | 'withError'> {
  let inBrowser = 0;
  let inDraft = 0;
  let withError = 0;
  for (const file of files) {
    if (file.inBrowser) inBrowser += 1;
    if (file.inDraft) inDraft += 1;
    if (file.hasError) withError += 1;
  }
  return { count: files.length, inBrowser, inDraft, withError };
}

function freezeNode(node: IMutableTreeNode): IDraftTreeNode {
  const children = [...node.children.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => freezeNode(child));
  const error = node.kind === 'file'
    ? node.files.map((file) => file.error ?? '').filter((text) => text !== '').join('\n')
    : '';
  return {
    id: node.id,
    name: node.name,
    kind: node.kind,
    ...tally(node.files),
    showUnsaved: true,
    branch: '',
    ahead: 0,
    behind: 0,
    path: node.kind === 'file' ? (node.files[0]?.path ?? '') : '',
    error,
    children,
  };
}

function attachPending(root: IMutableTreeNode, file: IPendingFile): void {
  const parts = file.path.split('/').filter((part) => part !== '');
  if (parts.length === 0) return;
  if (parts.length === 1) {
    const leaf = childOf(root, parts[0], 'file');
    leaf.files.push(file);
    return;
  }
  const level = childOf(root, parts[0], 'level');
  level.files.push(file);
  if (parts.length === 2) {
    const leaf = childOf(level, parts[1], 'file');
    leaf.files.push(file);
    return;
  }
  const moduleNode = childOf(level, parts[1], 'module');
  moduleNode.files.push(file);
  let parent = moduleNode;
  for (let index = 2; index < parts.length - 1; index += 1) {
    const folder = childOf(parent, parts[index], 'folder');
    folder.files.push(file);
    parent = folder;
  }
  const leaf = childOf(parent, parts[parts.length - 1], 'file');
  leaf.files.push(file);
}

/** `lN` → module → folders → file. A path with no folder under the level is a file of that level. */
export function buildDraftTree(files: readonly IPendingFile[]): IDraftTreeNode[] {
  const root: IMutableTreeNode = { id: '', name: '', kind: 'folder', files: [], children: new Map() };
  for (const file of files) attachPending(root, file);
  return [...root.children.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((node) => freezeNode(node));
}

/** Rows for the open set. A closed node does not add its children. */
export function visibleTreeRows(roots: readonly IDraftTreeNode[], open: ReadonlySet<string>): IVisibleTreeRow[] {
  const rows: IVisibleTreeRow[] = [];
  const walk = (nodes: readonly IDraftTreeNode[], depth: number): void => {
    for (const node of nodes) {
      rows.push({
        id: node.id,
        name: node.name,
        kind: node.kind,
        depth,
        count: node.count,
        inBrowser: node.inBrowser,
        inDraft: node.inDraft,
        withError: node.withError,
        showUnsaved: node.showUnsaved,
        expandable: node.children.length > 0,
      });
      if (open.has(node.id)) walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);
  return rows;
}

function scopeTree(nodes: readonly IDraftTreeNode[], prefix: string, showUnsaved: boolean): IDraftTreeNode[] {
  return nodes.map((node) => ({
    ...node,
    id: `${prefix}/${node.id}`,
    showUnsaved,
    children: scopeTree(node.children, prefix, showUnsaved),
  }));
}

function personNode(person: IPanelPersonInput): IDraftTreeNode {
  return {
    id: person.id,
    name: person.name,
    kind: 'person',
    ...tally(person.files),
    showUnsaved: person.mine,
    branch: person.branch,
    ahead: person.ahead,
    behind: person.behind,
    path: '',
    error: '',
    children: scopeTree(buildDraftTree(person.files), person.id, person.mine),
  };
}

function unownedGroup(name: string, people: readonly IPanelPersonInput[]): IDraftTreeNode {
  return {
    id: 'unowned',
    name,
    kind: 'group',
    count: people.length,
    inBrowser: 0,
    inDraft: 0,
    withError: 0,
    showUnsaved: false,
    branch: '',
    ahead: 0,
    behind: 0,
    path: '',
    error: '',
    children: people.map((person) => personNode(person)),
  };
}

/**
 * `Draft` → people → the st45 tree. Mine keeps unsaved counts; another person does not.
 * Another draft with no files is omitted. Drafts with files and no owner become one closed group.
 */
export function buildPanelTree(
  rootName: string,
  people: readonly IPanelPersonInput[],
  unownedName: string,
): IDraftTreeNode {
  const kept: IPanelPersonInput[] = [];
  const unowned: IPanelPersonInput[] = [];
  for (const person of people) {
    if (!person.mine && person.files.length === 0) continue;
    if (!person.mine && person.owner === null) {
      unowned.push(person);
      continue;
    }
    kept.push(person);
  }
  if (unowned.length > 0 && unownedName.trim() === '') {
    console.error('[draftPanel] unowned drafts have no group name');
  }
  const children = kept.map((person) => personNode(person));
  if (unowned.length > 0) children.push(unownedGroup(unownedName, unowned));
  const files = [...kept, ...unowned].flatMap((person) => person.files);
  return {
    id: 'draft',
    name: rootName,
    kind: 'root',
    ...tally(files),
    showUnsaved: true,
    branch: '',
    ahead: 0,
    behind: 0,
    path: '',
    error: '',
    children,
  };
}

/**
 * `(unsaved / total)` on mine, `(total)` on another person. Total is the number of distinct files:
 * one saved and edited again counts once, not once per source.
 */
export function draftCountText(node: Pick<IDraftTreeNode, 'count' | 'inBrowser' | 'showUnsaved'>): string {
  if (!node.showUnsaved) return `(${node.count})`;
  return `(${node.inBrowser} / ${node.count})`;
}

export function findDraftNode(nodes: readonly IDraftTreeNode[], id: string): IDraftTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findDraftNode(node.children, id);
    if (found) return found;
  }
  return null;
}

/** Actions of one selected node. The four top buttons are not repeated here. */
export function draftNodeActions(node: IDraftTreeNode): DraftNodeAction[] {
  if (node.kind === 'person' && node.showUnsaved) {
    const actions: DraftNodeAction[] = ['makeDefault'];
    if (node.behind > 0) actions.push('syncPublished');
    return actions;
  }
  if (node.kind === 'person') return ['view', 'experiment'];
  if (node.kind === 'module' && node.showUnsaved) return ['discardModule'];
  if (node.kind === 'file' && node.showUnsaved && node.inBrowser > 0) return ['undoFile'];
  return [];
}

/** Save counts browser files, publish counts draft paths, discard counts the union. */
export function actionCounts(local: readonly ILocalEdit[], draftPaths: readonly string[] | null): IActionCounts {
  const draft = draftPaths ?? [];
  return {
    save: local.length,
    publish: draft.length,
    discard: pendingFiles(local, draft).length,
  };
}

const blockedReasons = new WeakMap<IPanelStorFile, string>();

export interface ISaveToDraftOptions {
  /** Panel language. `en` when omitted. */
  lang?: DraftPanelLang;
  /** `{path}`, `{size}`, `{limit}`. The English sentence when omitted. */
  fileTooBig?: string;
  /** `{path}`, `{reason}`. The English sentence when omitted. `reason` is the server text. */
  fileRefused?: string;
}

/**
 * Files with `hasError` stay out of the write unless they are deletions (the server must see
 * the delete). `setContents` is called only with the clean files, and only when there is one.
 * Each clean file is sent with `inLocalStorage` false so the write hits the server driver.
 * Success calls `clearLocal` once per clean file. A refused `result`, or a throw that is not a
 * setContents ceiling or part refusal, restores every flag. A ceiling or part refusal means the
 * driver already wrote the other files: the named files go back to the browser, and `clearLocal`
 * runs for the rest.
 */
export async function saveToDraft<T extends IPanelStorFile>(
  files: readonly T[],
  comment: string,
  setContents: (clean: T[], comment: string) => Promise<readonly ISetContentsResult[]>,
  clearLocal: (file: T) => unknown,
  options?: ISaveToDraftOptions,
): Promise<{ blocked: T[] }> {
  const blocked: T[] = [];
  const clean: T[] = [];
  for (const file of files) {
    blockedReasons.delete(file);
    if (file.hasError && file.status !== 'deleted') blocked.push(file);
    else clean.push(file);
  }
  if (clean.length === 0) return { blocked };
  const flags = clean.map((file) => file.inLocalStorage);
  const restoreFlags = (which: readonly T[] = clean): void => {
    for (const file of which) {
      const index = clean.indexOf(file);
      if (index < 0) continue;
      file.inLocalStorage = flags[index];
    }
  };
  for (const file of clean) file.inLocalStorage = false;
  let results: readonly ISetContentsResult[];
  try {
    results = await setContents(clean, comment);
  } catch (err) {
    const failure = parseSetContentsFailure(err);
    if (!failure) {
      restoreFlags();
      throw err;
    }
    const lang = options?.lang ?? 'en';
    const saved: T[] = [];
    const matched = new Set<string>();
    for (const file of clean) {
      const hit = failure.oversized.find((item) => sameOversizedPath(file, item.path));
      const refusal = failure.refused.find((item) => sameOversizedPath(file, item.path));
      if (hit) {
        matched.add(hit.path);
        restoreFlags([file]);
        const message = draftFileTooBigMessage(hit.path, hit.bytes, hit.limit, lang, options?.fileTooBig);
        blockedReasons.set(file, message);
        blocked.push(file);
        console.error(`[draftPanel] ${message}`);
        continue;
      }
      if (refusal) {
        matched.add(refusal.path);
        restoreFlags([file]);
        const message = draftFileRefusedMessage(refusal.path, refusal.reason, options?.fileRefused);
        blockedReasons.set(file, message);
        blocked.push(file);
        console.error(`[draftPanel] ${message}`);
        continue;
      }
      saved.push(file);
    }
    for (const item of failure.oversized) {
      if (!matched.has(item.path)) console.error(`[draftPanel] oversized file was not in this save: ${item.path}`);
    }
    for (const item of failure.refused) {
      if (!matched.has(item.path)) console.error(`[draftPanel] refused file was not in this save: ${item.path}`);
    }
    for (const file of saved) await clearLocal(file);
    const firstSaved = saved[0];
    if (firstSaved) dispatchDraftSaved(firstSaved.project, saved.map((file) => shortPathOf(file)));
    return { blocked };
  }
  if (results.some((row) => !row.result)) {
    restoreFlags();
    return fail('setContents refused the draft save');
  }
  for (const file of clean) await clearLocal(file);
  const first = clean[0];
  if (first) dispatchDraftSaved(first.project, clean.map((file) => shortPathOf(file)));
  return { blocked };
}

/** What `afterDraftSave` asks the caller to clear. The default talks to `mls`; tests pass fakes. */
export interface IAfterDraftSaveDeps {
  setLocal: (file: IPanelStorFile, content: null) => unknown;
  setCache: (file: IPanelStorFile, content: null) => unknown;
  deleteModels: (file: IPanelStorFile) => unknown;
  removeFromFiles: (file: IPanelStorFile) => unknown;
  resetRenameOrigin: (file: IPanelStorFile) => unknown;
}

/** The panel file is a subset of `IFileInfo`. The default deps only run on a real stor file. */
function asStorFile(file: IPanelStorFile): mls.stor.IFileInfo {
  if (
    file.level === undefined
    || file.shortName === undefined
    || file.folder === undefined
    || file.extension === undefined
  ) {
    return fail('afterDraftSave: file is missing level, shortName, folder, or extension');
  }
  return file as mls.stor.IFileInfo;
}

const defaultAfterSaveDeps: IAfterDraftSaveDeps = {
  setLocal: (file) => mls.stor.localStor.setContent(asStorFile(file), { contentType: 'string', content: null }),
  setCache: (file, content) => mls.stor.cache.setContent(asStorFile(file), content),
  deleteModels: (file) => {
    const info = asStorFile(file);
    return mls.editor.deleteModels(info.project, info.shortName, info.folder, true, info.level);
  },
  removeFromFiles: (file) => {
    const info = asStorFile(file);
    const key = mls.stor.getKeyToFiles(info.project, info.level, info.shortName, info.folder, info.extension);
    delete mls.stor.files[key];
  },
  resetRenameOrigin: (file) => {
    if (file.shortName === undefined || file.folder === undefined) {
      console.warn('afterDraftSave: renamed file is missing shortName or folder');
      return;
    }
    const mmodel: mls.editor.IModels | undefined = mls.editor.getModels(file.project, file.shortName, file.folder);
    if (!mmodel || !mmodel.ts) return;
    mmodel.ts.originalProject = undefined;
    mmodel.ts.originalShortName = undefined;
    mmodel.ts.originalCRC = mls.common.crc.crc32(mmodel.ts.model.getValue()).toString(16);
  },
};

const capturedDraftText = new WeakMap<IPanelStorFile, string>();

/** Why a file is in `blocked` when the reason is not a compiler error. */
export function draftBlockReason(file: IPanelStorFile): string | undefined {
  return blockedReasons.get(file);
}

export type DraftPanelLang = 'en' | 'pt' | 'es';

/** English sentence. The panel passes `fileTooBig` from its own en/pt/es catalogs. */
const FILE_TOO_BIG_EN = '{path} is {size}; the limit per send is {limit}. The file stays in the browser.';

/** English sentence. The panel passes `fileRefused` from its own en/pt/es catalogs. */
const FILE_REFUSED_EN = '{path} was not saved: {reason}.';

/** One decimal, dropped when the value is whole. `en` uses a dot; `pt` and `es` use a comma. */
export function formatDraftMegabytes(bytes: number, lang: DraftPanelLang): string {
  const rounded = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  const digits = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  const shown = lang === 'en' ? digits : digits.replace('.', ',');
  return `${shown} MB`;
}

export function draftFileTooBigMessage(
  path: string,
  bytes: number,
  limitBytes: number,
  lang: DraftPanelLang,
  template = FILE_TOO_BIG_EN,
): string {
  return template
    .replaceAll('{path}', path)
    .replaceAll('{size}', formatDraftMegabytes(bytes, lang))
    .replaceAll('{limit}', formatDraftMegabytes(limitBytes, lang));
}

export function draftFileRefusedMessage(path: string, reason: string, template = FILE_REFUSED_EN): string {
  return template.replaceAll('{path}', path).replaceAll('{reason}', reason);
}

/** One large file the driver is sending in parts. `part` counts from 1. */
export interface IDraftUploadProgress {
  project: number;
  shortPath: string;
  part: number;
  total: number;
}

/** What `collabDraftUpload` carries. `done` ends the line; `failed` means the file was not saved. */
export interface ICollabDraftUploadDetail {
  project: number;
  shortPath: string;
  part: number;
  total: number;
  done: boolean;
  failed?: boolean;
}

/**
 * The line the panel shows while a part is in flight. `done` clears it.
 * A bad detail is logged and the previous line stays.
 */
export function applyDraftUpload(
  current: IDraftUploadProgress | null,
  detail: ICollabDraftUploadDetail | null | undefined,
): IDraftUploadProgress | null {
  if (!detail || typeof detail.shortPath !== 'string' || detail.shortPath === '') {
    console.error('[draftPanel] collabDraftUpload has no file');
    return current;
  }
  if (detail.done) {
    if (current && current.shortPath !== detail.shortPath) return current;
    return null;
  }
  if (!Number.isInteger(detail.part) || !Number.isInteger(detail.total) || detail.part < 1 || detail.total < 1 || detail.part > detail.total) {
    console.error('[draftPanel] collabDraftUpload has a bad part count', detail.shortPath, detail.part, detail.total);
    return current;
  }
  return { project: detail.project, shortPath: detail.shortPath, part: detail.part, total: detail.total };
}

/** `{file}`, `{part}`, `{total}`. The panel passes the en/pt/es sentence. */
export function draftUploadLine(progress: IDraftUploadProgress, template: string): string {
  return template
    .replaceAll('{file}', progress.shortPath)
    .replaceAll('{part}', String(progress.part))
    .replaceAll('{total}', String(progress.total));
}

/**
 * One phrase of the error `DriverVm.setContents` throws after the files that fit were written
 * (`mls-102033/l2/cbe/driverVm.ts`). Phrases are separated by `; ` and each starts with `setContents: `.
 * The ceiling detail is `path (bytes bytes)` joined by `, `.
 */
const OVERSIZED_SAVE = /^setContents: file exceeds the (\d+) byte limit: (.*)$/;
const PART_REFUSED = /^setContents: (.+?) part (\d+)\/(\d+) refused: (.*); not sent$/;
const FILE_REFUSED = /^setContents: (.+?) refused: (.*); not sent$/;
const PARTS_DO_NOT_FIT = /^setContents: (.+?) does not fit in (\d+) parts under the (\d+) byte limit; not sent$/;

interface IOversizedFile {
  path: string;
  bytes: number;
  limit: number;
}

interface IRefusedFile {
  path: string;
  reason: string;
}

function parseOversizedList(listed: string, limit: number): IOversizedFile[] | null {
  const files: IOversizedFile[] = [];
  for (const part of listed.split(', ')) {
    const file = /^(.*) \((\d+) bytes\)$/.exec(part);
    if (!file?.[1] || !file[2]) return null;
    const bytes = Number(file[2]);
    if (!Number.isFinite(bytes)) return null;
    files.push({ path: file[1], bytes, limit });
  }
  return files.length > 0 ? files : null;
}

function parseSetContentsFailure(err: unknown): { oversized: IOversizedFile[]; refused: IRefusedFile[] } | null {
  if (!(err instanceof Error)) return null;
  const phrases = err.message
    .split(/(?=setContents: )/u)
    .map((phrase) => phrase.trim().replace(/;$/u, ''))
    .filter((phrase) => phrase.startsWith('setContents: '));
  if (phrases.length === 0) return null;
  const oversized: IOversizedFile[] = [];
  const refused: IRefusedFile[] = [];
  for (const phrase of phrases) {
    const over = OVERSIZED_SAVE.exec(phrase);
    if (over?.[1] && over[2]) {
      const limit = Number(over[1]);
      if (!Number.isFinite(limit)) return null;
      const files = parseOversizedList(over[2], limit);
      if (!files) return null;
      oversized.push(...files);
      continue;
    }
    const part = PART_REFUSED.exec(phrase);
    if (part?.[1] && part[4] !== undefined) {
      refused.push({ path: part[1], reason: part[4] });
      continue;
    }
    const fit = PARTS_DO_NOT_FIT.exec(phrase);
    if (fit?.[1] && fit[2]) {
      refused.push({ path: fit[1], reason: `does not fit in ${fit[2]} parts` });
      continue;
    }
    const whole = FILE_REFUSED.exec(phrase);
    if (whole?.[1] && whole[2] !== undefined) {
      refused.push({ path: whole[1], reason: whole[2] });
      continue;
    }
    return null;
  }
  return oversized.length > 0 || refused.length > 0 ? { oversized, refused } : null;
}

/**
 * Path as `toShortPath` in `mls-102033/l2/cbe/driverVm.ts`: level 0 has no prefix,
 * a missing dot on the extension is added. `shortPathOf` differs on level 0.
 */
function driverShortPath(file: IPanelStorFile): string {
  const name = file.shortName ?? '';
  const folder = (file.folder ?? '').replace(/\\/gu, '/');
  const extension = file.extension ?? '';
  if (file.level === undefined && folder === '' && extension === '') return name;
  const folderSep = folder === '' || folder.endsWith('/') ? '' : '/';
  const extSep = extension === '' || extension.startsWith('.') ? '' : '.';
  const levelPath = file.level === undefined || file.level === 0 ? '' : `l${file.level}/`;
  return `${levelPath}${folder}${folderSep}${name}${extSep}${extension}`;
}

function sameOversizedPath(file: IPanelStorFile, path: string): boolean {
  return path === shortPathOf(file) || path === driverShortPath(file);
}

/** Text captured before `setContents`. `afterDraftSave` compares the model with it. */
export function holdCapturedDraftText(file: IPanelStorFile, text: string): void {
  capturedDraftText.set(file, text);
}

/**
 * Write the text captured for this send into the local record.
 * The draft driver reads that record during `setContents`. False when the write does not land.
 */
export async function storeCapturedDraftText(file: IPanelStorFile, text: string): Promise<boolean> {
  if (
    file.level === undefined
    || file.shortName === undefined
    || file.folder === undefined
    || file.extension === undefined
  ) {
    console.error('[draftPanel] captured text but the file has no path', file.shortName);
    return false;
  }
  try {
    const stored = await mls.stor.localStor.setContent(file as mls.stor.IFileInfo, {
      contentType: 'string',
      content: text,
    });
    if (stored) return true;
    console.error('[draftPanel] could not store the captured text', file.shortName);
    return false;
  } catch (err) {
    console.error('[draftPanel] could not store the captured text', file.shortName, err);
    return false;
  }
}

/** Drop a capture when the send does not reach `afterDraftSave`. */
export function dropCapturedDraftText(file: IPanelStorFile): void {
  capturedDraftText.delete(file);
}

function takeCapturedDraftText(file: IPanelStorFile): string | undefined {
  const text = capturedDraftText.get(file);
  capturedDraftText.delete(file);
  return text;
}

/**
 * Post-save for one draft file, same cleanup as `serviceSave.afterUpdate`.
 * `inLocalStorage` goes false. A deletion clears local, cache, models, and the index.
 * A renamed file resets the model origin, then clears local.
 * `changed`, `new`, and `renamed` stay as they are until publish.
 * A capture that no longer matches the model keeps the local copy: the send wrote the old text.
 */
export async function afterDraftSave(
  file: IPanelStorFile,
  deps: IAfterDraftSaveDeps = defaultAfterSaveDeps,
): Promise<void> {
  file.inLocalStorage = false;
  const captured = takeCapturedDraftText(file);
  if (file.status === 'deleted') {
    await deps.setLocal(file, null);
    await deps.setCache(file, null);
    await deps.deleteModels(file);
    deps.removeFromFiles(file);
    return;
  }
  if (file.status === 'renamed') await deps.resetRenameOrigin(file);
  if (captured !== undefined && localTextMoved(file, captured)) {
    file.inLocalStorage = true;
    console.warn('afterDraftSave: text changed during the send; keeping the local copy', file.shortName);
    return;
  }
  await deps.setLocal(file, null);
}

function localTextMoved(file: IPanelStorFile, captured: string): boolean {
  if (
    file.level === undefined
    || file.shortName === undefined
    || file.folder === undefined
    || file.extension === undefined
  ) {
    console.error('afterDraftSave: captured text but the file has no path', file.shortName);
    return true;
  }
  return modelTextDiffers({
    project: file.project,
    level: file.level,
    shortName: file.shortName,
    folder: file.folder,
    extension: file.extension,
  }, captured);
}
