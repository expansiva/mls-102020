/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.ts" enhancement="_blank" />
// Pure decisions for the Studio draft panel. No Lit, and no read of window, document, or mls:
// fetch, the release wait, reload, setContents, and the stor snapshot all come in as arguments.
// `listLocalFiles` is the caller's injection — its return value is `storFiles` here.
//
// Branch slugs mirror the server (cbeDraft.parseDraftSlug). The first `_` of a user slug is `@`
// and the remaining `_` are `.`, so an email with `.` or `_` in the local part does not round-trip.

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
}

export interface IDiscardEffects {
  fetchImpl: FetchImpl;
  reload: () => void;
}

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
  effects.reload();
  return { outcome: 'merged' };
}

export async function discard(
  effects: IDiscardEffects,
  project: number,
  slug: string,
): Promise<void> {
  const result = await callExec(effects.fetchImpl, 'discardDraft', { project, draft: slug });
  if (!result.ok) return fail(result.code);
  if (result.status !== 'discarded') return fail(result.status ?? 'discard failed');
  effects.reload();
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

/**
 * Files with `hasError` stay out of the write unless they are deletions (the server must see
 * the delete). `setContents` is called only with the clean files, and only when there is one.
 */
export async function saveToDraft<T extends IPanelStorFile>(
  files: readonly T[],
  comment: string,
  setContents: (clean: T[], comment: string) => Promise<readonly ISetContentsResult[]>,
): Promise<{ blocked: T[] }> {
  const blocked: T[] = [];
  const clean: T[] = [];
  for (const file of files) {
    if (file.hasError && file.status !== 'deleted') blocked.push(file);
    else clean.push(file);
  }
  if (clean.length === 0) return { blocked };
  const results = await setContents(clean, comment);
  if (results.some((row) => !row.result)) return fail('setContents refused the draft save');
  return { blocked };
}
