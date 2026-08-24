/// <mls fileReference="_102020_/l2/aura/plugins/helpers/headerPluginCore.ts" enhancement="_blank"/>

// Pure core of the "Header" project plugin (pluginProjectHeader): reads what the project has, turns a
// form into the agent's request, and computes the config/backup writes. No DOM and no mls calls, so
// every rule here is testable in node — the widget stays a thin shell around it.
//
// Two documents are involved and it matters which is which:
//   * `l5/config.json`  — the RUNTIME document: `clientShell.regions.header.profiles[...]` (renderer,
//     heightPx, brand, props.actions). This is what the shell boots from.
//   * `l5/project.json` — the STUDIO document: one-shot drafts (`headerDraft`, `logoDraft`) and the
//     rollback slot (`headerBackup`). The runtime never reads these.

import {
  DEFAULT_HEADER_PROFILE,
  headerPaths,
  normalizeHeaderRequest,
  pointHeaderProfileAtProject,
  type GenerateHeaderRequest,
  type GeneratedHeaderParts,
  type HeaderPaths,
} from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import type {
  AppHeaderAction,
  AppHeaderBrand,
  ProjectClientShellConfig,
  ProjectDynamicRegionConfig,
} from '/_102029_/l2/runtimeConfigTypes.js';

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ─── what the plugin shows about the applied header ──────────────────────────

export interface HeaderProfileView {
  profileName: string;
  /** Every profile of the header region, so the plugin can say which one it is editing. */
  profileNames: string[];
  tag: string;
  entrypoint: string;
  /** Client-relative source path, when the profile points at a project file. */
  source?: string;
  heightPx?: number;
  brand?: AppHeaderBrand;
  actions: AppHeaderAction[];
  /** True when the profile points at the project's own generated header (not the master's). */
  isProjectHeader: boolean;
  /** Which shell document the app boots (`clientShell.mode`). */
  shellMode: string;
  /** URL of that shell document, when the config declares `shellTemplates` — the preview reuses it. */
  shellTemplate?: string;
}

/**
 * URL of the shell document the app actually boots (`shellTemplates[clientShell.mode]`).
 *
 * The preview needs it because the band only looks real inside the app's own environment: the
 * app's stylesheets and the lit import map live in that document, not in the studio's.
 * Template paths are written relative (`./_102033_/…`) and served absolute.
 */
export function resolveShellTemplateUrl(config: unknown): { mode: string; url?: string } {
  if (!isRecord(config)) return { mode: 'spa' };
  const clientShell = isRecord(config.clientShell) ? config.clientShell : undefined;
  const mode = readString(clientShell?.mode) || 'spa';
  const templates = isRecord(config.shellTemplates) ? config.shellTemplates : undefined;
  const raw = readString(templates?.[mode]);
  if (!raw) return { mode };
  return { mode, url: raw.replace(/^\.?\//u, '/') };
}

/** Reads the header region of `l5/config.json` for display. Returns undefined when there is none. */
export function readHeaderProfileView(
  config: unknown,
  projectId: number,
  profileName?: string,
): HeaderProfileView | undefined {
  if (!isRecord(config)) return undefined;
  const clientShell = isRecord(config.clientShell)
    ? config.clientShell as unknown as ProjectClientShellConfig
    : undefined;
  const header = clientShell?.regions?.header;
  if (!header?.profiles) return undefined;

  const name = readString(profileName) || header.activeProfile || DEFAULT_HEADER_PROFILE;
  const profile = header.profiles[name] as ProjectDynamicRegionConfig | undefined;
  if (!profile) return undefined;

  const actions = isRecord(profile.props) && Array.isArray(profile.props.actions)
    ? (profile.props.actions as AppHeaderAction[])
    : [];

  const shell = resolveShellTemplateUrl(config);
  return {
    profileName: name,
    profileNames: Object.keys(header.profiles),
    shellMode: shell.mode,
    shellTemplate: shell.url,
    tag: readString(profile.renderer?.tag),
    entrypoint: readString(profile.renderer?.entrypoint),
    source: readString(profile.renderer?.source) || undefined,
    heightPx: typeof profile.heightPx === 'number' ? profile.heightPx : undefined,
    brand: isRecord(profile.brand) ? profile.brand as unknown as AppHeaderBrand : undefined,
    actions,
    isProjectHeader: readString(profile.renderer?.tag) === headerPaths(projectId).tag,
  };
}

// ─── the form → the agent request ───────────────────────────────────────────

export interface HeaderFormState {
  brief: string;
  brandTitle: string;
  brandSubtitle: string;
  actions: AppHeaderAction[];
  navLinks: boolean;
  language: string;
  logo: 'keep' | 'generate' | 'none';
  logoStyle: string;
  logoBrief: string;
  profileName: string;
}

export function emptyHeaderForm(): HeaderFormState {
  return {
    brief: '',
    brandTitle: '',
    brandSubtitle: '',
    actions: [],
    navLinks: false,
    language: '',
    logo: 'keep',
    logoStyle: '',
    logoBrief: '',
    profileName: '',
  };
}

/** Pre-fills the form from what the project already has, so a regeneration is a small edit. */
export function formFromProfile(view: HeaderProfileView | undefined): HeaderFormState {
  const form = emptyHeaderForm();
  if (!view) return form;
  form.brandTitle = readString(view.brand?.title);
  form.brandSubtitle = readString(view.brand?.subtitle);
  form.actions = [...view.actions];
  form.profileName = view.profileName;
  return form;
}

/**
 * Builds the request the agent receives. Always a DRAFT (`commit: false`): the plugin previews first
 * and writes only when the reviewer accepts — that is the whole point of the screen.
 */
export function buildHeaderRequest(
  projectId: number,
  form: HeaderFormState,
  requestId: string,
): GenerateHeaderRequest {
  const brandTitle = readString(form.brandTitle);
  const raw: Record<string, unknown> = {
    projectId,
    brief: readString(form.brief) || undefined,
    actions: form.actions,
    navLinks: form.navLinks === true,
    language: readString(form.language) || undefined,
    logo: form.logo,
    logoStyle: readString(form.logoStyle) || undefined,
    logoBrief: readString(form.logoBrief) || undefined,
    profileName: readString(form.profileName) || undefined,
    requestId,
    commit: false,
  };
  if (brandTitle) {
    raw.brand = { title: brandTitle, subtitle: readString(form.brandSubtitle) || undefined };
  }
  // normalizeHeaderRequest is the same gate the agent applies, so the plugin fails fast and locally
  // (missing brief AND brand, unknown action, …) instead of after a round trip.
  return normalizeHeaderRequest(raw);
}

// ─── drafts (l5/project.json) ───────────────────────────────────────────────

export interface HeaderDraft {
  requestId: string;
  source: string;
  parts?: GeneratedHeaderParts;
  notes?: string;
  profileName?: string;
  createdAt?: string;
}

/** The one-shot draft the agent parked, when it is the one this screen asked for. */
export function readHeaderDraft(projectConfig: unknown, requestId?: string): HeaderDraft | undefined {
  if (!isRecord(projectConfig)) return undefined;
  const draft = projectConfig.headerDraft;
  if (!isRecord(draft) || !readString(draft.source)) return undefined;
  if (requestId && readString(draft.requestId) !== requestId) return undefined;
  return {
    requestId: readString(draft.requestId),
    source: readString(draft.source),
    parts: isRecord(draft.parts) ? draft.parts as unknown as GeneratedHeaderParts : undefined,
    notes: readString(draft.notes) || undefined,
    profileName: readString(draft.profileName) || undefined,
    createdAt: readString(draft.createdAt) || undefined,
  };
}

export function readLogoDraft(projectConfig: unknown, requestId?: string): { svg: string; notes?: string } | undefined {
  if (!isRecord(projectConfig)) return undefined;
  const draft = projectConfig.logoDraft;
  if (!isRecord(draft) || !readString(draft.svg)) return undefined;
  if (requestId && readString(draft.requestId) !== requestId) return undefined;
  return { svg: readString(draft.svg), notes: readString(draft.notes) || undefined };
}

/** Drops a consumed draft. Returns a copy — the caller decides when to persist. */
export function clearDraft(projectConfig: unknown, key: 'headerDraft' | 'logoDraft'): Record<string, unknown> {
  const next = isRecord(projectConfig) ? clone(projectConfig) : {};
  delete next[key];
  return next;
}

// ─── apply / rollback ───────────────────────────────────────────────────────

export interface HeaderBackup {
  /** Source of the header that was applied before — what "go back" rewrites. */
  source: string;
  /** The profile block as it was, so the renderer/brand/actions come back together. */
  profile: ProjectDynamicRegionConfig;
  profileName: string;
  at: string;
}

export interface ApplyHeaderInput {
  projectId: number;
  /** The runtime document (l5/config.json). */
  config: unknown;
  /** The studio document (l5/project.json), where the backup slot lives. */
  projectConfig: unknown;
  parts: GeneratedHeaderParts;
  form: HeaderFormState;
  /** Source of the header currently applied, when there is one (for the backup slot). */
  previousSource?: string;
  at: string;
}

export interface ApplyHeaderResult {
  /** File to write with the real tag/path. */
  paths: HeaderPaths;
  source: string;
  /** Patched runtime document. */
  config: Record<string, unknown>;
  /** Patched studio document: draft consumed, backup stored. */
  projectConfig: Record<string, unknown>;
  profileName: string;
}

/**
 * Everything the "Apply" button writes, computed in one place: the real source, the repointed profile,
 * the consumed draft and the rollback slot.
 *
 * The backup is taken from the profile as it is NOW plus the source currently on disk — that pair is
 * what "go back to the previous header" needs, and regenerating would not reproduce it.
 */
export function applyHeaderDraft(input: ApplyHeaderInput, buildSource: (parts: GeneratedHeaderParts) => string): ApplyHeaderResult {
  const view = readHeaderProfileView(input.config, input.projectId, input.form.profileName);
  const paths = headerPaths(input.projectId);
  const brandTitle = readString(input.form.brandTitle);

  const written = pointHeaderProfileAtProject(input.config, {
    paths,
    brand: brandTitle
      ? { title: brandTitle, subtitle: readString(input.form.brandSubtitle) || undefined }
      : undefined,
    actions: input.form.actions,
    profileName: readString(input.form.profileName) || undefined,
    dropLogo: input.form.logo === 'none',
  });

  const projectConfig = clearDraft(input.projectConfig, 'headerDraft');
  // Only worth a backup when there IS a previous project header to go back to.
  if (view?.isProjectHeader && readString(input.previousSource)) {
    const previousProfile = (input.config as { clientShell?: ProjectClientShellConfig }).clientShell
      ?.regions?.header?.profiles?.[view.profileName];
    projectConfig.headerBackup = {
      source: readString(input.previousSource),
      profile: previousProfile ? clone(previousProfile) : undefined,
      profileName: view.profileName,
      at: input.at,
    };
  }

  return {
    paths,
    source: buildSource(input.parts),
    config: written.config,
    projectConfig,
    profileName: written.profileName,
  };
}

export function readHeaderBackup(projectConfig: unknown): HeaderBackup | undefined {
  if (!isRecord(projectConfig)) return undefined;
  const backup = projectConfig.headerBackup;
  if (!isRecord(backup) || !readString(backup.source) || !isRecord(backup.profile)) return undefined;
  return {
    source: readString(backup.source),
    profile: backup.profile as unknown as ProjectDynamicRegionConfig,
    profileName: readString(backup.profileName) || DEFAULT_HEADER_PROFILE,
    at: readString(backup.at),
  };
}

export interface RestoreHeaderResult {
  paths: HeaderPaths;
  source: string;
  config: Record<string, unknown>;
  projectConfig: Record<string, unknown>;
  profileName: string;
}

/** Puts the previous header back: the source file AND the profile block it came with. */
export function restoreHeaderBackup(
  projectId: number,
  config: unknown,
  projectConfig: unknown,
): RestoreHeaderResult {
  const backup = readHeaderBackup(projectConfig);
  if (!backup) throw new Error('there is no previous header to restore');
  if (!isRecord(config)) throw new Error('l5/config.json not found or not an object');

  const next = clone(config) as Record<string, unknown>;
  const clientShell = (isRecord(next.clientShell) ? next.clientShell : (next.clientShell = {})) as unknown as ProjectClientShellConfig;
  const regions = (isRecord(clientShell.regions) ? clientShell.regions : (clientShell.regions = {}));
  const header = regions.header ?? (regions.header = { activeProfile: backup.profileName, profiles: {} });
  if (!isRecord(header.profiles)) header.profiles = {};
  header.profiles[backup.profileName] = clone(backup.profile);
  header.activeProfile = backup.profileName;

  const nextProject = isRecord(projectConfig) ? clone(projectConfig) : {};
  // The slot is single: restoring consumes it, so a second "go back" does not resurrect an older one.
  delete nextProject.headerBackup;

  return {
    paths: headerPaths(projectId),
    source: backup.source,
    config: next,
    projectConfig: nextProject,
    profileName: backup.profileName,
  };
}
