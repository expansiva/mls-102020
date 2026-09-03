/// <mls fileReference="_102020_/l2/aura/plugins/helpers/headerPluginCore.ts" enhancement="_blank"/>

// Pure core of the header editor (pluginHeaderEditor): reads what the project has, turns a
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
  isProjectHeaderTag,
  variantFromTag,
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
  /** Locales the header offers (`props.locales`); empty = every language of the project. */
  locales: string[];
  /** Routes the header links (`props.navLinks`); empty = no links in the band. */
  navLinks: string[];
  /** True when the profile points at the project's own generated header (not the master's). */
  isProjectHeader: boolean;
  /** Which shell document the app boots (`clientShell.mode`) — the preview's boot config mirrors it. */
  shellMode: string;
  /** Variant slug of this header, or undefined for the project's default one. */
  variant?: string;
  /** True when this is the profile the shell boots (`activeProfile`) — the app's default header. */
  isActive: boolean;
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

  const props = isRecord(profile.props) ? profile.props : undefined;
  const actions = Array.isArray(props?.actions) ? (props.actions as AppHeaderAction[]) : [];
  const stringList = (value: unknown) => (Array.isArray(value)
    ? value.map(readString).filter(Boolean)
    : []);

  return {
    profileName: name,
    profileNames: Object.keys(header.profiles),
    shellMode: readString(clientShell?.mode) || 'spa',
    variant: variantFromTag(readString(profile.renderer?.tag), projectId),
    isActive: name === (header.activeProfile || DEFAULT_HEADER_PROFILE),
    tag: readString(profile.renderer?.tag),
    entrypoint: readString(profile.renderer?.entrypoint),
    source: readString(profile.renderer?.source) || undefined,
    heightPx: typeof profile.heightPx === 'number' ? profile.heightPx : undefined,
    brand: isRecord(profile.brand) ? profile.brand as unknown as AppHeaderBrand : undefined,
    actions,
    locales: stringList(props?.locales),
    navLinks: stringList(props?.navLinks),
    // Any header this project generated counts — the default one and every variant.
    isProjectHeader: isProjectHeaderTag(readString(profile.renderer?.tag), projectId),
  };
}

/**
 * Re-scopes compiled design-system tokens from the document root onto one container.
 *
 * The preview renders inside the STUDIO's document, so the project's tokens cannot be dropped on
 * `:root` — they would repaint the studio itself. `tokensCssFromTheme` emits exactly two selector
 * shapes (`:root` for light, `[data-theme="dark"], :root.dark` for dark), so both are rewritten to
 * live under `scope` while keeping the dark switch working from an ancestor.
 *
 * @param css - The compiled token CSS (`tokensCssFromTheme`).
 * @param scope - Selector of the container that holds the band, e.g. `[data-token-scope="102051"]`.
 */
export function scopeTokensCss(css: string, scope: string): string {
  if (!css.trim() || !scope.trim()) return '';
  return css
    .replace(/\[data-theme="dark"\]\s*,\s*:root\.dark/gu, `[data-theme="dark"] ${scope}, .dark ${scope}`)
    .replace(/:root\.dark/gu, `.dark ${scope}`)
    .replace(/:root/gu, scope);
}

export interface ProjectHeaderEntry {
  /** Profile name in `clientShell.regions.header.profiles`. */
  profileName: string;
  /** Variant slug, or undefined for the project's default header. */
  variant?: string;
  tag: string;
  /** Client-relative source path, when the profile records one. */
  source?: string;
  /** The one the shell boots (`activeProfile`). */
  isActive: boolean;
  /** False for a profile pointing at a master's header (e.g. `studio`). */
  isProjectHeader: boolean;
  brand?: AppHeaderBrand;
  actions: AppHeaderAction[];
  locales: string[];
  navLinks: string[];
  heightPx?: number;
}

/**
 * Every header the project has, in config order — what the knob lists and what the panel renders.
 *
 * Profiles that point at a master's header (`studio`) are kept in the result with
 * `isProjectHeader: false`: the caller decides whether to show them, and hiding them here would make
 * "why does Ctrl+Alt+S cycle into something I cannot see" unanswerable.
 */
export function listProjectHeaders(config: unknown, projectId: number): ProjectHeaderEntry[] {
  if (!isRecord(config)) return [];
  const clientShell = isRecord(config.clientShell)
    ? config.clientShell as unknown as ProjectClientShellConfig
    : undefined;
  const header = clientShell?.regions?.header;
  if (!header?.profiles) return [];

  const active = header.activeProfile || DEFAULT_HEADER_PROFILE;
  return Object.entries(header.profiles).map(([profileName, raw]) => {
    const profile = raw as ProjectDynamicRegionConfig;
    const props = isRecord(profile.props) ? profile.props : undefined;
    const stringList = (value: unknown) => (Array.isArray(value) ? value.map(readString).filter(Boolean) : []);
    const tag = readString(profile.renderer?.tag);
    return {
      profileName,
      variant: variantFromTag(tag, projectId),
      tag,
      source: readString(profile.renderer?.source) || undefined,
      isActive: profileName === active,
      isProjectHeader: isProjectHeaderTag(tag, projectId),
      brand: isRecord(profile.brand) ? profile.brand as unknown as AppHeaderBrand : undefined,
      actions: Array.isArray(props?.actions) ? (props.actions as AppHeaderAction[]) : [],
      locales: stringList(props?.locales),
      navLinks: stringList(props?.navLinks),
      heightPx: typeof profile.heightPx === 'number' ? profile.heightPx : undefined,
    };
  });
}

/**
 * Makes a profile the one the shell boots. Only `activeProfile` moves — the renderer, brand and
 * props of each profile are already in place, which is the whole point of having variants.
 */
export function activateHeaderProfile(config: unknown, profileName: string): Record<string, unknown> {
  if (!isRecord(config)) throw new Error('l5/config.json not found or not an object');
  const name = readString(profileName);
  if (!name) throw new Error('activate needs a profile name');
  const next = clone(config) as Record<string, unknown>;
  const header = (next.clientShell as ProjectClientShellConfig | undefined)?.regions?.header;
  if (!header?.profiles?.[name]) throw new Error(`there is no header profile "${name}" to activate`);
  header.activeProfile = name;
  return next;
}

/**
 * Writes the brand TEXTS of one header profile: title and subtitle, nothing else.
 *
 * The brand is one object in the config (`title`, `subtitle`, `logoSvg`) and this is the single
 * writer of its texts — the mark has its own path (`applyLogoToBrand`), and these two must never
 * both claim the title, or one silently undoes the other.
 *
 * @param subtitle - Empty REMOVES the key: the band renders a subtitle only when there is one, and
 * an empty string would reserve the space for nothing.
 * @throws When the title is empty (`renderBrand()` with no title is a band with no identity) or the
 * profile does not exist.
 */
export function applyBrandTexts(
  config: unknown,
  options: { profileName?: string; title: string; subtitle?: string },
): { config: Record<string, unknown>; profileName: string } {
  if (!isRecord(config)) throw new Error('l5/config.json not found or not an object');
  const title = readString(options.title);
  if (!title) throw new Error('the brand needs a title — the band renders it as its identity');

  const next = clone(config) as Record<string, unknown>;
  const header = (next.clientShell as ProjectClientShellConfig | undefined)?.regions?.header;
  if (!header?.profiles) throw new Error('no header region in l5/config.json');

  const profileName = readString(options.profileName) || header.activeProfile || DEFAULT_HEADER_PROFILE;
  const profile = header.profiles[profileName] as ProjectDynamicRegionConfig | undefined;
  if (!profile) {
    throw new Error(`header profile "${profileName}" does not exist (available: ${Object.keys(header.profiles).join(', ') || 'none'})`);
  }

  const brand = (isRecord(profile.brand) ? profile.brand : (profile.brand = {})) as Record<string, unknown>;
  brand.title = title;
  const subtitle = readString(options.subtitle);
  if (subtitle) brand.subtitle = subtitle;
  else delete brand.subtitle;

  return { config: next, profileName };
}

// ─── the form → the agent request ───────────────────────────────────────────

export interface HeaderFormState {
  brief: string;
  actions: AppHeaderAction[];
  /**
   * Routes the band links, by href. EMPTY = no links, which stays the default: the aside owns the
   * menu, and a header that repeats it shows the same list twice.
   */
  navLinks: string[];
  /** Locales the header speaks: the i18n block it generates AND what its switcher offers. */
  locales: string[];
  /**
   * What to do about the mark. The screen always sends `keep`: the mark is edited in its own section
   * (file / pasted markup / agentGenerateLogo), not as a side effect of regenerating the header.
   * `generate`/`none` stay for console callers of the agent.
   */
  logo: 'keep' | 'generate' | 'none';
  logoStyle: string;
  logoBrief: string;
  profileName: string;
  /**
   * Which header of the project this request is for: '' = the default one, a slug = that variant.
   * It decides the FILE, the tag and the class, so it cannot be inferred later.
   */
  variant: string;
}

export function emptyHeaderForm(): HeaderFormState {
  return {
    brief: '',
    actions: [],
    navLinks: [],
    locales: [],
    logo: 'keep',
    logoStyle: '',
    logoBrief: '',
    profileName: '',
    variant: '',
  };
}

/**
 * Pre-fills the form from what the project already has, so a regeneration is a small edit.
 *
 * @param languages - Every language the project declares; used as the default selection, since a
 * header with no `props.locales` speaks all of them.
 */
export function formFromProfile(
  view: HeaderProfileView | undefined,
  languages: readonly string[] = [],
): HeaderFormState {
  const form = emptyHeaderForm();
  form.locales = [...languages];
  if (!view) return form;
  // The brand is NOT copied into the form: it is edited in its own section, straight into the config.
  form.actions = [...view.actions];
  form.navLinks = [...view.navLinks];
  if (view.locales.length) form.locales = view.locales.filter((locale) => !languages.length || languages.includes(locale));
  form.profileName = view.profileName;
  form.variant = view.variant ?? '';
  return form;
}

/** Languages the project declares (`l5/project.json > languages`). */
export function readProjectLanguages(projectConfig: unknown): Array<{ code: string; name: string }> {
  if (!isRecord(projectConfig) || !Array.isArray(projectConfig.languages)) return [];
  return projectConfig.languages
    .filter(isRecord)
    .map((entry) => ({ code: readString(entry.language), name: readString(entry.name) }))
    .filter((entry) => Boolean(entry.code));
}

/** How many design-system themes the project declares — the switcher hides itself below two. */
export function countProjectDesignSystems(projectConfig: unknown): number {
  if (!isRecord(projectConfig) || !Array.isArray(projectConfig.designSystems)) return 0;
  return projectConfig.designSystems.filter(isRecord).length;
}

/**
 * Routes of the app, from `l5/config.json > projects[].modules[].navigation` — the same list the
 * shell hands the aside, and the only hrefs a header is allowed to link.
 */
export function readProjectRoutes(
  config: unknown,
  projectId: number,
): Array<{ label: string; href: string; description?: string }> {
  if (!isRecord(config) || !isRecord(config.projects)) return [];
  const projects = config.projects as Record<string, unknown>;
  const owners = isRecord(projects[String(projectId)]) ? [projects[String(projectId)]] : Object.values(projects);
  const routes: Array<{ label: string; href: string; description?: string }> = [];
  const seen = new Set<string>();
  for (const owner of owners) {
    const modules = isRecord(owner) && Array.isArray(owner.modules) ? owner.modules : [];
    for (const module of modules) {
      const navigation = isRecord(module) && Array.isArray(module.navigation) ? module.navigation : [];
      for (const entry of navigation) {
        if (!isRecord(entry)) continue;
        const href = readString(entry.href);
        const label = readString(entry.label) || href;
        if (!href || seen.has(href)) continue;
        seen.add(href);
        routes.push({ href, label, description: readString(entry.description) || undefined });
      }
    }
  }
  return routes;
}

/**
 * Builds the request the agent receives. Always a DRAFT (`commit: false`): the plugin previews first
 * and writes only when the reviewer accepts — that is the whole point of the screen.
 */
/**
 * @param brand - The profile's brand, so the model knows the title it has to lay out. It comes from
 * the CONFIG (the Brand section owns it), never from a field typed twice.
 */
export function buildHeaderRequest(
  projectId: number,
  form: HeaderFormState,
  requestId: string,
  brand?: AppHeaderBrand,
): GenerateHeaderRequest {
  const brandTitle = readString(brand?.title);
  const raw: Record<string, unknown> = {
    projectId,
    brief: readString(form.brief) || undefined,
    actions: form.actions,
    // A list of hrefs, not a flag: the agent links exactly these and validates against them.
    navLinks: [...form.navLinks],
    locales: [...form.locales],
    logo: form.logo,
    logoStyle: readString(form.logoStyle) || undefined,
    logoBrief: readString(form.logoBrief) || undefined,
    profileName: readString(form.profileName) || undefined,
    variant: readString(form.variant) || undefined,
    requestId,
    commit: false,
  };
  if (brandTitle) {
    raw.brand = { title: brandTitle, subtitle: readString(brand?.subtitle) || undefined };
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
  const paths = headerPaths(input.projectId, { variant: input.form.variant || undefined });

  const written = pointHeaderProfileAtProject(input.config, {
    paths,
    // No brand here on purpose: absent = keep. The Brand section owns it, and a regeneration must
    // not cost the app its identity.
    actions: input.form.actions,
    // Both are DATA in the profile: changing which links or locales the header offers is a config
    // edit afterwards, with no regeneration.
    navLinks: input.form.navLinks,
    locales: input.form.locales,
    // A variant does not go on the air by being written: it is activated on purpose, from the list.
    activate: !readString(input.form.variant),
    profileName: readString(input.form.profileName) || undefined,
    dropLogo: input.form.logo === 'none',
  });

  const projectConfig = clearDraft(input.projectConfig, 'headerDraft');
  // Only worth a backup when there IS a previous project header to go back to.
  if (view?.isProjectHeader && readString(input.previousSource)) {
    const previousProfile = (input.config as { clientShell?: ProjectClientShellConfig }).clientShell
      ?.regions?.header?.profiles?.[view.profileName];
    // One slot PER PROFILE: with several headers in the project, a single slot would let a variant's
    // rollback overwrite the default header's.
    const slots = isRecord(projectConfig.headerBackup) ? { ...projectConfig.headerBackup } : {};
    slots[view.profileName] = {
      source: readString(input.previousSource),
      profile: previousProfile ? clone(previousProfile) : undefined,
      profileName: view.profileName,
      at: input.at,
    };
    projectConfig.headerBackup = slots;
  }

  return {
    paths,
    source: buildSource(input.parts),
    config: written.config,
    projectConfig,
    profileName: written.profileName,
  };
}

/**
 * The rollback slot of one profile.
 *
 * The slot used to be a single object for the whole project; it is now keyed by profile name. Both
 * shapes are read (the old one answers for the profile it recorded), so a project mid-flight does not
 * lose its rollback.
 *
 * @param profileName - Whose slot to read; the default header's when omitted.
 */
export function readHeaderBackup(projectConfig: unknown, profileName?: string): HeaderBackup | undefined {
  if (!isRecord(projectConfig)) return undefined;
  const raw = projectConfig.headerBackup;
  if (!isRecord(raw)) return undefined;
  const wanted = readString(profileName);

  // Legacy single slot: it carries its own profileName.
  const legacy = readString(raw.source) && isRecord(raw.profile) ? raw : undefined;
  const entry = legacy
    ? ((!wanted || readString(legacy.profileName) === wanted || (!readString(legacy.profileName) && wanted === DEFAULT_HEADER_PROFILE))
      ? legacy
      : undefined)
    : (isRecord(raw[wanted || DEFAULT_HEADER_PROFILE]) ? raw[wanted || DEFAULT_HEADER_PROFILE] as Record<string, unknown> : undefined);

  if (!entry || !readString(entry.source) || !isRecord(entry.profile)) return undefined;
  return {
    source: readString(entry.source),
    profile: entry.profile as unknown as ProjectDynamicRegionConfig,
    profileName: readString(entry.profileName) || wanted || DEFAULT_HEADER_PROFILE,
    at: readString(entry.at),
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
  profileName?: string,
): RestoreHeaderResult {
  const backup = readHeaderBackup(projectConfig, profileName);
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
  // Restoring CONSUMES the slot of this profile, so a second "go back" does not resurrect an older
  // one — the other profiles keep theirs.
  const slots = nextProject.headerBackup;
  if (isRecord(slots) && !readString(slots.source)) {
    delete (slots as Record<string, unknown>)[backup.profileName];
    if (Object.keys(slots).length === 0) delete nextProject.headerBackup;
  } else {
    delete nextProject.headerBackup;
  }

  return {
    // The file to rewrite is the one THIS profile points at: a variant restores its own file.
    paths: headerPaths(projectId, { variant: variantFromTag(readString(backup.profile.renderer?.tag), projectId) }),
    source: backup.source,
    config: next,
    projectConfig: nextProject,
    profileName: backup.profileName,
  };
}
