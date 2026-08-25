/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e10/publishable.ts" enhancement="_blank"/>
// The l5 a module needs in order to PUBLISH — derived, validated, and never invented.
//
// The delivery used to merge only what E10 knows (modules/navigation) into whatever l5/config.json was
// already there. On a virgin project the platform blocks simply were not there, and the run that first
// published a module had `workspaceDependencies`, `projects` and the publish confs typed in by hand. A
// hand-written block is not a bug in itself; the bug is that nothing SAID it was missing, and the failure
// only appeared hours later, inside the publish.
//
// Pure on purpose: everything here is a function of the dependency list and the existing config, so the
// step stays a thin wiring layer and the rules are unit-tested.

export type PublishableIssue = string;

/** Canonical project kind. Lives in each project's `l5/project.json` as `projectType`. */
export const PROJECT_TYPES = ['lib', 'master frontend', 'master backend', 'client'] as const;
export type PublishableProjectType = typeof PROJECT_TYPES[number];

export function isPublishableProjectType(value: unknown): value is PublishableProjectType {
  return typeof value === 'string' && (PROJECT_TYPES as readonly string[]).includes(value);
}

/** The `projectType` field of an l5/project.json, or '' when absent/invalid. */
export function readProjectTypeFromProjectJson(projectJson: unknown): PublishableProjectType | '' {
  if (!isRecord(projectJson)) return '';
  return isPublishableProjectType(projectJson.projectType) ? projectJson.projectType : '';
}

/** `102029` -> `{ root: '../mls-102029', type: … }` */
export const PROJECT_ROOT_PREFIX = '../mls-';

/**
 * The platform blocks E10 must NOT invent, with the default the platform ships.
 *
 * Kept here as ONE source (the step copies, never re-types them) and applied only when the block is
 * absent: a publisher who tuned `publication` or `clientShell` keeps their version, and the finding tells
 * them a default was filled in.
 */
export const PLATFORM_BLOCK_DEFAULTS: Record<string, unknown> = {
  shellTemplates: {
    spa: './_102033_/l2/shared/spa/index.html',
    pwa: './_102033_/l2/shared/pwa/index.html',
  },
  publication: {
    defaultTarget: 'web',
    targets: { web: { assetBaseUrl: '', serveStaticFromServer: true, minify: false, sourcemap: true } },
  },
  clientShell: {
    mode: 'spa',
    activeProfile: 'defaultAura',
    regions: { header: { entrypoint: './_102033_/l2/shared/layout/aura-header.js', tag: 'collab-aura-header' } },
  },
};

/** The module a generated project is born in: test database, curated seeds, badge on screen. */
export const DEFAULT_PROJECT_APP_ENV = 'presentation';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/**
 * `workspaceDependencies` as the API reports it — the list is never written by hand and never filtered:
 * the build on the VM consumes exactly this to know which projects to fetch.
 */
export function buildWorkspaceDependencies(dependencies: readonly number[]): string[] {
  return [...new Set(dependencies.map(id => String(id)).filter(Boolean))];
}

export interface ProjectsBlockResult {
  projects: Record<string, unknown>;
  issues: PublishableIssue[];
}

/**
 * `projects` covering every dependency plus the module's own project.
 *
 * The platform API still has no project kind (`IPrj_settings` is name/owner/dependencies). The
 * canonical source is `projectType` on that project's `l5/project.json`. Order: a type already in
 * this config is PRESERVED, then `typeById` (read from that project's project.json), then the
 * module's own project is `client`, else `lib` plus a finding. Guessing master frontend/backend
 * silently is what would produce a wrong root in the build.
 */
export function buildProjectsBlock(
  existing: unknown,
  projectId: number,
  dependencies: readonly number[],
  typeById: Readonly<Record<string, string>> = {},
): ProjectsBlockResult {
  const previous = isRecord(existing) ? existing : {};
  const projects: Record<string, unknown> = {};
  const issues: PublishableIssue[] = [];
  const ids = [...new Set([projectId, ...dependencies])].filter(id => Number.isFinite(id) && id > 0);
  for (const id of ids) {
    const key = String(id);
    const before = isRecord(previous[key]) ? previous[key] as Record<string, unknown> : undefined;
    const declaredType = typeof before?.type === 'string' && before.type ? before.type : '';
    const fromJson = isPublishableProjectType(typeById[key]) ? typeById[key] : '';
    const type = declaredType || fromJson || (id === projectId ? 'client' : 'lib');
    if (!declaredType && !fromJson && id !== projectId) {
      issues.push(`projects.${key}: no type in config.projects nor in mls-${key}/l5/project.json projectType, assumed 'lib' — set projectType on that project.json if this dependency is a master frontend/backend`);
    }
    projects[key] = { ...(before ?? {}), root: `${PROJECT_ROOT_PREFIX}${key}`, type };
  }
  return { projects, issues };
}

export interface PlatformBlocksResult {
  config: Record<string, unknown>;
  issues: PublishableIssue[];
}

/** Fill an ABSENT platform block from the single source above, and say so. Present blocks are untouched. */
export function applyPlatformBlockDefaults(config: Record<string, unknown>): PlatformBlocksResult {
  const next = { ...config };
  const issues: PublishableIssue[] = [];
  for (const [block, value] of Object.entries(PLATFORM_BLOCK_DEFAULTS)) {
    if (isRecord(next[block])) continue;
    next[block] = value;
    issues.push(`config.${block} was missing and the platform default was written — review it before publishing`);
  }
  return { config: next, issues };
}

/**
 * `appEnv` in l5/project.json: written ONLY when absent. A publisher who moved a project to
 * `homologation` must not have it reset to `presentation` by the next generation.
 */
export function ensureProjectAppEnv(projectJson: unknown): { projectJson: Record<string, unknown>; changed: boolean } {
  const json = isRecord(projectJson) ? { ...projectJson } : {};
  if (typeof json.appEnv === 'string' && json.appEnv) return { projectJson: json, changed: false };
  json.appEnv = DEFAULT_PROJECT_APP_ENV;
  return { projectJson: json, changed: true };
}

/**
 * `projectType` on the CURRENT project's l5/project.json: written ONLY when absent.
 * E10 of a generated module writes `client`. It never overwrites a type already set.
 */
export function ensureProjectType(
  projectJson: unknown, type: PublishableProjectType,
): { projectJson: Record<string, unknown>; changed: boolean } {
  const json = isRecord(projectJson) ? { ...projectJson } : {};
  if (isPublishableProjectType(json.projectType)) return { projectJson: json, changed: false };
  json.projectType = type;
  return { projectJson: json, changed: true };
}

/** The module has to be listed in l5/project.json.modules — the studio reads that list, not the config. */
export function collectProjectJsonIssues(projectJson: unknown, moduleName: string): PublishableIssue[] {
  if (!isRecord(projectJson)) return ['l5/project.json is missing or unreadable: the module cannot be published without it'];
  const modules = Array.isArray(projectJson.modules) ? projectJson.modules : [];
  const listed = modules.some(item => (typeof item === 'string' && item === moduleName)
    || (isRecord(item) && (item.moduleId === moduleName || item.name === moduleName)));
  return listed ? [] : [`l5/project.json: modules[] does not list '${moduleName}' — add it (the studio reads this list)`];
}

/**
 * The closing checklist: what a publish needs, checked at delivery time instead of failing later inside
 * the publish with no name attached.
 */
export function collectPublishableConfigIssues(
  config: unknown,
  moduleName: string,
  dependencies: readonly number[],
): PublishableIssue[] {
  if (!isRecord(config)) return ['l5/config.json is missing or unreadable'];
  const issues: PublishableIssue[] = [];
  const declared = Array.isArray(config.workspaceDependencies) ? config.workspaceDependencies.map(String) : [];
  const expected = buildWorkspaceDependencies(dependencies);
  const missing = expected.filter(id => !declared.includes(id));
  if (missing.length) issues.push(`config.workspaceDependencies is missing ${missing.join(', ')} — it must equal what the platform reports`);
  const projects = isRecord(config.projects) ? config.projects : {};
  const uncovered = expected.filter(id => !isRecord(projects[id]));
  if (uncovered.length) issues.push(`config.projects does not cover ${uncovered.join(', ')} — every dependency needs its root and type`);
  for (const block of Object.keys(PLATFORM_BLOCK_DEFAULTS)) {
    if (!isRecord(config[block])) issues.push(`config.${block} is absent — the publish has no ${block}`);
  }
  const modules = Array.isArray(config.modules) ? config.modules : [];
  const clientKey = Object.keys(projects).find(key => isRecord(projects[key]) && projects[key].type === 'client');
  const clientModules = clientKey && isRecord(projects[clientKey]) && Array.isArray((projects[clientKey] as Record<string, unknown>).modules)
    ? (projects[clientKey] as { modules: unknown[] }).modules
    : [];
  const named = [...modules, ...clientModules].some(item => isRecord(item) && item.moduleId === moduleName);
  if (!named) issues.push(`config: module '${moduleName}' is not listed in modules[] (neither at the root nor under its client project)`);
  return issues;
}

/** The publish confs are ENVIRONMENT (hosts, keys): the generator emits examples, never the real ones. */
export const PUBLISH_CONF_EXAMPLES: Record<string, string> = {
  'publishLocal.conf.example': [
    '# Copy to publishLocal.conf and fill in. NEVER commit the real file: it points at your machine.',
    'HOST=<ssh-host-or-alias>',
    'REMOTE_DIR=<absolute path on that host>',
    'SSH_KEY=<path to the private key>',
    '',
  ].join('\n'),
  'publishRemote.conf.example': [
    '# Copy to publishRemote.conf and fill in. NEVER commit the real file: it carries the target server.',
    'HOST=<server host or IP>',
    'REMOTE_DIR=<absolute path on the server>',
    'SSH_KEY=<path to the private key>',
    'SERVER_PROJECT_ID=<id of the project that serves this app>',
    '',
  ].join('\n'),
};
