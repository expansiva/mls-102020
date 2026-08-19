/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.ts" enhancement="_blank"/>

// Pure core of agentGenerateHeader: paths/tag derivation, the prompt, and the assembly + validation
// of the generated project header. No I/O, no mls calls — the agent does the writing.
//
// The LLM does NOT author the whole file. It returns only the two parts it should own — the band's
// markup (`bandHtml`) and the band's extra CSS (`bandCss`) — and this module wraps them in the
// deterministic skeleton (mls header, imports, class name, tag, customElements.define). Everything
// the shell depends on stays out of the model's reach, and the validation below can be narrow and
// mechanical instead of "read the whole file and hope".

import { AURA_HEADER_HEIGHT_PX } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import type {
  AppHeaderAction,
  AppHeaderBrand,
  ProjectClientShellConfig,
  ProjectDynamicRegionConfig,
} from '/_102029_/l2/runtimeConfigTypes.js';

export interface GenerateHeaderRequest {
  projectId: number;
  /** What the header should look/feel like, in the user's words. */
  brief?: string;
  /** Brand identity — stored in the CONFIG profile, never inlined in the generated file. */
  brand?: AppHeaderBrand;
  actions?: AppHeaderAction[];
  /** Language of the copy the header renders (i18n block + notes). */
  language?: string;
  /** Navigation entries available to the header (label + href), for reference only. */
  navigation?: Array<{ label: string; href: string }>;
  /** DS role tokens the project's design system exposes. */
  tokens?: string[];
  requestId?: string;
  /** Header profile of l5/config.json to take over; `defaultAura` by default. */
  profileName?: string;
  /** true = write the header file + point the config profile at it; false/absent = draft only. */
  commit?: boolean;
}

/** What the LLM returns (see the Output type of the agent's prompt). */
export interface GeneratedHeaderParts {
  bandHtml: string;
  bandCss?: string;
  /** locale -> key -> text; the first locale defines the message type. */
  messages?: Record<string, Record<string, string>>;
  notes?: string;
}

export interface HeaderPaths {
  fileReference: string;
  /** Client-relative source path recorded in the config profile. */
  source: string;
  entrypoint: string;
  tag: string;
  className: string;
}

const HEADER_FOLDER = 'layout';
const HEADER_SHORT_NAME = 'appHeader';
/** Header profile the generated header takes over in `l5/config.json`. */
export const DEFAULT_HEADER_PROFILE = 'defaultAura';
/** The placeholder the generated CSS scopes itself with (bound to `this.localName`). */
export const TAG_PLACEHOLDER = '${tag}';

const KNOWN_ACTIONS: readonly AppHeaderAction[] = ['language', 'designSystem', 'modules', 'search', 'user'];
/** Actions AuraHeaderBase implements itself; the rest are the subclass's to render. */
const BASE_ACTIONS: readonly AppHeaderAction[] = ['language', 'designSystem', 'modules'];

function toKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
}

/**
 * Paths, tag and class name of a project's header.
 *
 * The tag follows the same rule as mls-102041 `convertFileToTag` (and cfePageSkeleton):
 * kebab(folder) with '/' -> '--', then '--' + kebab(shortName) + '-' + project.
 */
export function headerPaths(projectId: number): HeaderPaths {
  return {
    fileReference: `_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.ts`,
    source: `l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.ts`,
    entrypoint: `/_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.js`,
    tag: `${toKebab(HEADER_FOLDER)}--${toKebab(HEADER_SHORT_NAME)}-${projectId}`,
    className: `AppHeader${projectId}`,
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ─── config.json (header profile) ────────────────────────────────────────────

export interface HeaderProfileWrite {
  /** Patched copy of the config document — the input is left untouched. */
  config: Record<string, unknown>;
  profileName: string;
  /** Where the profile pointed before, so the agent can log it (and a human can undo it). */
  previousTag?: string;
}

export interface HeaderProfileOptions {
  paths: HeaderPaths;
  brand?: AppHeaderBrand;
  actions?: AppHeaderAction[];
  /** Profile to take over; the master's own `defaultAura` by default. */
  profileName?: string;
}

/**
 * Points a header profile of `l5/config.json` at the project's own header.
 *
 * By default it takes over `defaultAura` — the profile the shell boots with — so the generated
 * header IS the app's header, with no composer or extra registration in between. The band height
 * stays on the shared constant (a profile that disagrees shifts the page when switched), and the
 * remaining profiles (e.g. `studio`) are untouched so Ctrl+Alt+S keeps working.
 */
export function pointHeaderProfileAtProject(config: unknown, options: HeaderProfileOptions): HeaderProfileWrite {
  if (!isRecord(config)) throw new Error('l5/config.json not found or not an object');

  const next = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const profileName = options.profileName || DEFAULT_HEADER_PROFILE;

  const clientShell = (isRecord(next.clientShell) ? next.clientShell : (next.clientShell = {})) as unknown as ProjectClientShellConfig;
  if (!clientShell.mode) clientShell.mode = 'spa';
  const regions = (isRecord(clientShell.regions) ? clientShell.regions : (clientShell.regions = {}));
  const header = regions.header ?? (regions.header = { activeProfile: profileName, switchWithoutRouteReload: true, profiles: {} });
  if (!isRecord(header.profiles)) header.profiles = {};

  const previous = header.profiles[profileName] as ProjectDynamicRegionConfig | undefined;
  const profile: ProjectDynamicRegionConfig = {
    ...(previous ?? {}),
    renderer: {
      entrypoint: options.paths.entrypoint,
      source: options.paths.source,
      tag: options.paths.tag,
    },
    heightPx: AURA_HEADER_HEIGHT_PX,
  };

  // Brand and actions are config, not code: absent in the request means absent in the profile,
  // otherwise a regeneration would keep a stale brand around.
  if (options.brand) profile.brand = { ...options.brand };
  else delete profile.brand;
  if (options.actions?.length) profile.props = { ...(isRecord(previous?.props) ? previous.props : {}), actions: [...options.actions] };
  else if (isRecord(profile.props)) delete (profile.props as Record<string, unknown>).actions;

  header.profiles[profileName] = profile;
  header.activeProfile = profileName;

  return { config: next, profileName, previousTag: previous?.renderer?.tag };
}

// ─── request ─────────────────────────────────────────────────────────────────

/** Validates and normalizes the agent entry. Throws with an actionable message. */
export function normalizeHeaderRequest(raw: unknown): GenerateHeaderRequest {
  if (!isRecord(raw)) throw new Error('entry must be a JSON object');
  const projectId = Number(raw.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) throw new Error('entry needs { projectId }');

  const brief = readString(raw.brief);
  const brand = isRecord(raw.brand) ? raw.brand : undefined;
  const brandTitle = readString(brand?.title);
  if (!brief && !brandTitle) throw new Error('entry needs a brief and/or a brand.title');

  const actions = Array.isArray(raw.actions)
    ? KNOWN_ACTIONS.filter((action) => (raw.actions as unknown[]).includes(action))
    : undefined;

  const navigation = Array.isArray(raw.navigation)
    ? raw.navigation
      .filter(isRecord)
      .map((entry) => ({ label: readString(entry.label), href: readString(entry.href) }))
      .filter((entry) => entry.label && entry.href)
    : undefined;

  const tokens = Array.isArray(raw.tokens)
    ? raw.tokens.filter((token): token is string => typeof token === 'string' && token.startsWith('--ds-'))
    : undefined;

  return {
    projectId,
    brief: brief || undefined,
    brand: brandTitle
      ? {
        title: brandTitle,
        subtitle: readString(brand?.subtitle) || undefined,
        logoUrl: readString(brand?.logoUrl) || undefined,
        logoAlt: readString(brand?.logoAlt) || undefined,
        href: readString(brand?.href) || undefined,
      }
      : undefined,
    actions: actions?.length ? actions : undefined,
    language: readString(raw.language) || undefined,
    navigation: navigation?.length ? navigation : undefined,
    tokens: tokens?.length ? tokens : undefined,
    requestId: readString(raw.requestId) || undefined,
    profileName: readString(raw.profileName) || undefined,
    commit: raw.commit === true,
  };
}

// ─── validation ──────────────────────────────────────────────────────────────

// `${tag}` and any other `${…}` carry braces of their own, so they are masked out before the CSS
// is split on `{` — otherwise every interpolation reads as the start of a rule.
const TAG_TOKEN = '\u0001';
const EXPR_TOKEN = '\u0002';

function maskCss(css: string): string {
  return css
    .replace(/\$\{\s*tag\s*\}/gu, TAG_TOKEN)
    .replace(/\$\{[^}]*\}/gu, EXPR_TOKEN);
}

function unmask(text: string): string {
  return text.split(TAG_TOKEN).join(TAG_PLACEHOLDER).split(EXPR_TOKEN).join('${…}');
}

/** Selector chunks of a CSS text: everything that precedes a `{`. */
function cssSelectors(css: string): string[] {
  return maskCss(css)
    .split('{')
    .slice(0, -1)
    .map((chunk) => {
      const start = Math.max(chunk.lastIndexOf('}'), chunk.lastIndexOf(';'));
      return chunk.slice(start + 1).trim();
    })
    .filter(Boolean);
}

/** Declarations of the rule whose selector is exactly the host tag placeholder. */
function hostRuleBody(css: string): string {
  const match = new RegExp(`(^|[}\\n])\\s*${TAG_TOKEN}\\s*\\{([^}]*)\\}`, 'u').exec(maskCss(css));
  return match ? match[2] : '';
}

function hasLiteralColor(text: string): boolean {
  const withoutTokens = text.replace(/var\([^)]*\)/gu, '');
  return /#[0-9a-f]{3,8}\b/iu.test(withoutTokens) || /\b(rgb|rgba|hsl|hsla)\(/u.test(withoutTokens);
}

/**
 * Mechanical checks of the header contract (skills/headerContract.ts). Returns the violations;
 * an empty array means the parts can be assembled.
 */
export function validateHeaderParts(parts: GeneratedHeaderParts): string[] {
  const errors: string[] = [];
  const bandHtml = readString(parts.bandHtml);
  const bandCss = readString(parts.bandCss);

  if (!bandHtml) errors.push('bandHtml is empty');

  // The skeleton is ours: the model must not reach for the element's plumbing.
  for (const forbidden of ['createRenderRoot', 'attachShadow', 'static styles', 'customElements.define']) {
    if (bandHtml.includes(forbidden)) errors.push(`bandHtml must not contain "${forbidden}"`);
  }
  // A class declaration or an import means the model wrote the file instead of the band.
  if (/(^|\n)\s*(import|export)\s/u.test(bandHtml) || /\bclass\s+[A-Z]\w*\s+extends\b/u.test(bandHtml)) {
    errors.push('bandHtml must be the band markup only — no imports, exports or class declaration');
  }
  for (const forbidden of ['<style', '<script']) {
    if (bandHtml.includes(forbidden)) errors.push(`bandHtml must not contain a "${forbidden}" tag (use bandCss)`);
  }

  // Without the toggle, a mobile user has no way to open the aside.
  if (!bandHtml.includes('this.renderAsideToggle()')) {
    errors.push('bandHtml must render this.renderAsideToggle()');
  }

  // Raw hrefs break the SPA and leave the shell's expected-navigation promise pending.
  if (/<a[\s>]/u.test(bandHtml) && !/this\.(handleNavigate|navigateTo)/u.test(bandHtml)) {
    errors.push('every <a> must navigate through this.handleNavigate / this.navigateTo');
  }
  if (bandHtml.includes('window.location')) {
    errors.push('bandHtml must not touch window.location (use this.navigateTo)');
  }

  // The fragments are inlined into template literals — unbalanced backticks break the file.
  for (const [name, text] of [['bandHtml', bandHtml], ['bandCss', bandCss]] as const) {
    if ((text.match(/`/gu)?.length ?? 0) % 2 !== 0) errors.push(`${name} has an unbalanced backtick`);
  }

  if (hasLiteralColor(bandHtml)) errors.push('bandHtml has a literal color; use var(--ds-*, fallback)');

  if (bandCss) {
    if (hasLiteralColor(bandCss)) errors.push('bandCss has a literal color outside a var(--ds-*, fallback)');

    for (const selector of cssSelectors(bandCss)) {
      if (selector.startsWith('@')) continue;
      if (!selector.includes(TAG_TOKEN)) {
        errors.push(`bandCss selector "${unmask(selector)}" must be scoped with ${TAG_PLACEHOLDER}`);
      }
    }

    // A height on the host fights the shell's fixed band; fixed positioning escapes it entirely.
    if (/(^|[\s;])(height|min-height|max-height)\s*:/u.test(hostRuleBody(bandCss))) {
      errors.push(`bandCss must not declare a height on the host rule (${TAG_PLACEHOLDER})`);
    }
    if (/position\s*:\s*fixed/u.test(bandCss)) {
      errors.push('bandCss must not use position: fixed (it escapes the header band)');
    }
  }

  // i18n: fixed copy belongs in the message block, and the block must be complete.
  if (bandHtml.includes('this.localized(messages)') && !parts.messages) {
    errors.push('bandHtml uses this.localized(messages) but no messages block was returned');
  }
  if (parts.messages) {
    const locales = Object.keys(parts.messages);
    if (locales.length === 0) {
      errors.push('messages block is empty');
    } else {
      const reference = Object.keys(parts.messages[locales[0]] ?? {}).sort().join(',');
      for (const locale of locales.slice(1)) {
        const keys = Object.keys(parts.messages[locale] ?? {}).sort().join(',');
        if (keys !== reference) errors.push(`messages.${locale} does not have the same keys as messages.${locales[0]}`);
      }
      if (!bandHtml.includes('this.localized(messages)')) {
        errors.push('a messages block was returned but bandHtml never reads this.localized(messages)');
      }
    }
  }

  return errors;
}

// ─── assembly ────────────────────────────────────────────────────────────────

function stripFences(value: string): string {
  return readString(value).replace(/^```[a-z]*\s*/iu, '').replace(/```$/u, '').trim();
}

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : line))
    .join('\n');
}

/** Same as {@link indentBlock}, but the first line joins the line that opens it (`pt: {`). */
function indentTail(text: string, spaces: number): string {
  return indentBlock(text, spaces).trimStart();
}

function messagesBlock(messages: Record<string, Record<string, string>>): string {
  const locales = Object.keys(messages);
  const first = locales[0];
  const literal = (locale: string) => `{\n${Object.entries(messages[locale])
    .map(([key, text]) => `  ${key}: ${JSON.stringify(text)},`)
    .join('\n')}\n}`;

  const lines = [
    '/// **collab_i18n_start**',
    `const message_${first} = ${literal(first)};`,
    `type MessageType = typeof message_${first};`,
    `const messages: Record<string, MessageType> = {`,
    ...locales.map((locale) => `  ${locale}: ${locale === first ? `message_${first}` : indentTail(literal(locale), 2)},`),
    '};',
    '/// **collab_i18n_end**',
  ];
  return lines.join('\n');
}

/** Assembles the final header source from the model's fragments. */
export function buildHeaderSource(projectId: number, parts: GeneratedHeaderParts): string {
  const paths = headerPaths(projectId);
  const bandHtml = stripFences(parts.bandHtml);
  const bandCss = stripFences(parts.bandCss ?? '');
  const imports = ['html', ...(bandHtml.includes('nothing') ? ['nothing'] : [])].join(', ');

  const blocks: string[] = [
    `/// <mls fileReference="${paths.fileReference}" enhancement="_blank" />`,
    '',
    `// Project header generated by agentGenerateHeader (_102020_/l2/aura/agentManageHeader).`,
    '//',
    '// The band, its fixed height, the brand, the mobile aside toggle and SPA navigation all come',
    '// from AuraHeaderBase — this file only fills the band. The brand lives in the config profile',
    '// (clientShell.regions.header.profiles[...].brand), so regenerating this file cannot lose it.',
    '',
    `import { ${imports} } from 'lit';`,
    `import { AuraHeaderBase } from '/_102033_/l2/shared/layout/aura-header-base.js';`,
    '',
  ];

  if (parts.messages) {
    blocks.push(messagesBlock(parts.messages), '');
  }

  blocks.push(`export class ${paths.className} extends AuraHeaderBase {`);

  if (bandCss) {
    blocks.push(
      '  protected bandCss(): string {',
      '    const tag = this.localName;',
      '    return `',
      bandCss,
      '`;',
      '  }',
      '',
    );
  }

  blocks.push(
    '  protected renderBand() {',
    '    return html`',
    indentBlock(bandHtml, 6),
    '    `;',
    '  }',
    '}',
    '',
    `customElements.define('${paths.tag}', ${paths.className});`,
    '',
  );

  return blocks.join('\n');
}

/** Validates the LLM payload and returns the assembled source. */
export function sanitizeGeneratedHeader(
  result: unknown,
  request: GenerateHeaderRequest,
): { ok: boolean; error?: string; value?: { parts: GeneratedHeaderParts; source: string; paths: HeaderPaths } } {
  if (!isRecord(result)) return { ok: false, error: 'result is not an object' };

  const parts: GeneratedHeaderParts = {
    bandHtml: stripFences(String(result.bandHtml ?? '')),
    bandCss: stripFences(String(result.bandCss ?? '')) || undefined,
    messages: isRecord(result.messages) ? (result.messages as Record<string, Record<string, string>>) : undefined,
    notes: readString(result.notes) || undefined,
  };

  const errors = validateHeaderParts(parts);
  if (errors.length > 0) return { ok: false, error: errors.join('; ') };

  return {
    ok: true,
    value: {
      parts,
      source: buildHeaderSource(request.projectId, parts),
      paths: headerPaths(request.projectId),
    },
  };
}

// ─── prompt ──────────────────────────────────────────────────────────────────

/** The human turn: what this project's header must look like and what it may use. */
export function buildGenerateHeaderHumanPrompt(request: GenerateHeaderRequest): string {
  const paths = headerPaths(request.projectId);
  const actions = request.actions ?? [];
  const baseHandled = actions.filter((action) => BASE_ACTIONS.includes(action));
  const ownHandled = actions.filter((action) => !BASE_ACTIONS.includes(action));

  const lines = [
    `Project: ${request.projectId}`,
    `Header tag: ${paths.tag} (already defined by the skeleton — do not emit it)`,
    request.brief ? `Brief: ${request.brief}` : '',
    request.brand?.title ? `Brand title: ${request.brand.title} (read it as this.brand.title — never hardcode)` : '',
    request.brand?.logoUrl ? `Brand logo: ${request.brand.logoUrl} (rendered by this.renderBrand())` : '',
    baseHandled.length ? `Actions provided by the base (call this.renderActions()): ${baseHandled.join(', ')}` : '',
    ownHandled.length ? `Actions YOU must render in the band: ${ownHandled.join(', ')}` : '',
    request.navigation?.length
      ? `Navigation entries available (render with this.renderNavLinks()): ${request.navigation.map((entry) => entry.label).join(', ')}`
      : 'No navigation entries: do not invent links.',
    request.tokens?.length
      ? `DS role tokens available: ${request.tokens.join(', ')}`
      : 'DS role tokens follow the --ds-color-<role>[-bg|-text] convention (nav-bg, nav-text, nav-active-bg, border-default, text-muted, surface-bg, button-primary-bg/text).',
    request.language ? `Write any fixed copy in: ${request.language}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}
