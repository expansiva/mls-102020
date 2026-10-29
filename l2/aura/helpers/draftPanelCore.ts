/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.ts" enhancement="_blank" />
// Pure decisions for the Studio draft panel. No Lit, and no read of window or document.
// fetch, the release wait, reload, setContents, saveL5File, and the stor
// snapshot all come in as arguments. `listLocalFiles` is the caller's injection — its return
// value is `storFiles` here. `afterDraftSave` is the one default that calls `mls`, the same
// cleanup as serviceSave.afterUpdate; tests pass their own deps.
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
}

/** What `publish` asks the caller to store after a merge. The key itself stays in the service. */
export interface IPublishedRecord {
  files: string[];
  at: number;
}

export interface ISetContentsResult {
  result: boolean;
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

export interface IDiscardEffects {
  fetchImpl: FetchImpl;
  reload: () => void;
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
    return failure;
  }

  const success: IExecSuccess = { ok: true, statusCode };
  if (typeof parsed.status === 'string') success.status = parsed.status;
  if (typeof parsed.ref === 'string') success.ref = parsed.ref;
  if (typeof parsed.release === 'string') success.release = parsed.release;
  if (typeof parsed.msg === 'string') success.msg = parsed.msg;
  if (typeof parsed.text === 'string') success.text = parsed.text;
  if (Array.isArray(parsed.drafts)) success.drafts = parsed.drafts as IListedDraft[];
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
  effects.reload();
}

/** `DRAFT_CONFLICT: <files>` — the panel turns this into `syncConflict`. */
export async function syncWithPublished(
  effects: IDiscardEffects,
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

/**
 * Files with `hasError` stay out of the write unless they are deletions (the server must see
 * the delete). `setContents` is called only with the clean files, and only when there is one.
 * Each clean file is sent with `inLocalStorage` false so the write hits the server driver.
 * Success calls `clearLocal` once per clean file; a throw or a refused `result` restores the flag.
 */
export async function saveToDraft<T extends IPanelStorFile>(
  files: readonly T[],
  comment: string,
  setContents: (clean: T[], comment: string) => Promise<readonly ISetContentsResult[]>,
  clearLocal: (file: T) => unknown,
): Promise<{ blocked: T[] }> {
  const blocked: T[] = [];
  const clean: T[] = [];
  for (const file of files) {
    if (file.hasError && file.status !== 'deleted') blocked.push(file);
    else clean.push(file);
  }
  if (clean.length === 0) return { blocked };
  const flags = clean.map((file) => file.inLocalStorage);
  const restoreFlags = (): void => {
    clean.forEach((file, index) => {
      file.inLocalStorage = flags[index];
    });
  };
  for (const file of clean) file.inLocalStorage = false;
  let results: readonly ISetContentsResult[];
  try {
    results = await setContents(clean, comment);
  } catch (err) {
    restoreFlags();
    throw err;
  }
  if (results.some((row) => !row.result)) {
    restoreFlags();
    return fail('setContents refused the draft save');
  }
  for (const file of clean) await clearLocal(file);
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
