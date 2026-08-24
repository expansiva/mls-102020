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
  /**
   * Locales the header speaks: one message map per locale in the generated i18n block, and the
   * locales its switcher offers (`props.locales`). Empty = the model picks (legacy `language`).
   */
  locales?: string[];
  /** Legacy single-language hint, kept for console callers; folded into `locales`. */
  language?: string;
  /**
   * Which routes the band links. Default FALSE/empty: navigation is the aside's job, and a header
   * that duplicates it shows the same menu twice on screen. A LIST of hrefs links exactly those;
   * `true` means "all of the project's routes" (the old behaviour). When off, the model gets no
   * routes at all, so it cannot link anything.
   */
  navLinks?: boolean | string[];
  /** Navigation entries available to the header (label + href); only read when navLinks is on. */
  navigation?: Array<{ label: string; href: string }>;
  /** Every custom property the project's design system defines (color + global + typography). */
  tokens?: string[];
  /** The COLOR subset of `tokens` — what the nav-family rule applies to. */
  colorTokens?: string[];
  requestId?: string;
  /** Header profile of l5/config.json to take over; `defaultAura` by default. */
  profileName?: string;
  /**
   * What to do about the brand mark: `keep` (default) leaves whatever the profile has, `generate`
   * queues agentGenerateLogo as a child step right after the header is written, `none` drops the
   * mark from the profile.
   */
  logo?: 'keep' | 'generate' | 'none';
  /** Style hint forwarded to agentGenerateLogo (it normalizes an unknown value to monogram). */
  logoStyle?: string;
  /** Brief forwarded to agentGenerateLogo; falls back to the header brief. */
  logoBrief?: string;
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
/** Sibling file the Header plugin previews a draft from, before it is applied. */
const HEADER_PREVIEW_SHORT_NAME = 'appHeaderPreview';
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
export function headerPaths(projectId: number, options: { previewToken?: string } = {}): HeaderPaths {
  const token = readString(options.previewToken).replace(/[^a-z0-9]+/giu, '').toLowerCase();
  if (token) {
    // A preview needs its OWN tag: `customElements.define` runs once per name, so reusing the real
    // tag would break the second preview of a session (and leave the first class registered).
    return {
      fileReference: `_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_PREVIEW_SHORT_NAME}.ts`,
      source: `l2/${HEADER_FOLDER}/${HEADER_PREVIEW_SHORT_NAME}.ts`,
      entrypoint: `/_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_PREVIEW_SHORT_NAME}.js`,
      tag: `${toKebab(HEADER_FOLDER)}--${toKebab(HEADER_PREVIEW_SHORT_NAME)}-${projectId}-${token}`,
      className: `AppHeaderPreview${projectId}_${token}`,
    };
  }
  return {
    fileReference: `_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.ts`,
    source: `l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.ts`,
    entrypoint: `/_${projectId}_/l2/${HEADER_FOLDER}/${HEADER_SHORT_NAME}.js`,
    tag: `${toKebab(HEADER_FOLDER)}--${toKebab(HEADER_SHORT_NAME)}-${projectId}`,
    className: `AppHeader${projectId}`,
  };
}

/** Source of the placeholder that replaces a consumed preview, so nothing dangles in the project. */
export function buildPreviewStub(projectId: number): string {
  const paths = headerPaths(projectId, { previewToken: 'x' });
  return [
    `/// <mls fileReference="${paths.fileReference}" enhancement="_blank" />`,
    '',
    '// Placeholder: the Header plugin writes a real preview here while a draft is being reviewed, and',
    '// puts this back once the draft is applied or discarded. Nothing imports it.',
    '',
    'export {};',
    '',
  ].join('\n');
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
  /** Routes the band links, by href (`props.navLinks`). Empty/absent removes the key. */
  navLinks?: string[];
  /** Locales the header offers (`props.locales`). Empty/absent removes the key = every language. */
  locales?: string[];
  /** Profile to take over; the master's own `defaultAura` by default. */
  profileName?: string;
  /** Drop the mark the profile already had instead of carrying it over. */
  dropLogo?: boolean;
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
  // otherwise a regeneration would keep a stale brand around. The MARK is the exception — it is
  // agentGenerateLogo's artifact, not the header request's, so regenerating the header carries it
  // over instead of wiping it (`dropLogo` is the explicit way out).
  const previousLogoSvg = readString((isRecord(previous?.brand) ? previous.brand.logoSvg : undefined));
  if (options.brand) profile.brand = { ...options.brand };
  else delete profile.brand;
  if (!options.dropLogo && previousLogoSvg) {
    const brand = (isRecord(profile.brand) ? profile.brand : (profile.brand = {})) as Record<string, unknown>;
    if (!readString(brand.logoSvg)) brand.logoSvg = previousLogoSvg;
  }
  // props: same rule as the brand — what the request does not carry does not survive, so a
  // regeneration cannot leave a stale selection behind.
  const props = { ...(isRecord(previous?.props) ? previous.props : {}) } as Record<string, unknown>;
  const setList = (key: string, values?: string[]) => {
    if (values?.length) props[key] = [...values];
    else delete props[key];
  };
  setList('actions', options.actions as string[] | undefined);
  setList('navLinks', options.navLinks);
  setList('locales', options.locales);
  if (Object.keys(props).length) profile.props = props;
  else delete profile.props;

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
    ? raw.tokens.filter((token): token is string => typeof token === 'string' && token.startsWith('--'))
    : undefined;

  // Locales: the list wins; a legacy single `language` becomes a one-entry list so both entries
  // reach the prompt the same way.
  const locales = (Array.isArray(raw.locales) ? raw.locales.map(readString) : [readString(raw.language)])
    .filter(Boolean)
    .filter((locale, index, all) => all.indexOf(locale) === index);

  // navLinks: a list of hrefs (the plugin), `true` for every route (the old flag), off otherwise.
  const navLinks: boolean | string[] = Array.isArray(raw.navLinks)
    ? raw.navLinks.map(readString).filter(Boolean)
    : raw.navLinks === true;

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
    locales: locales.length ? locales : undefined,
    language: readString(raw.language) || undefined,
    navigation: navigation?.length ? navigation : undefined,
    tokens: tokens?.length ? tokens : undefined,
    colorTokens: Array.isArray(raw.colorTokens)
      ? raw.colorTokens.filter((token): token is string => typeof token === 'string' && token.startsWith('--'))
      : undefined,
    requestId: readString(raw.requestId) || undefined,
    profileName: readString(raw.profileName) || undefined,
    navLinks: navLinks,
    logo: raw.logo === 'generate' || raw.logo === 'none' ? raw.logo : 'keep',
    logoStyle: readString(raw.logoStyle) || undefined,
    logoBrief: readString(raw.logoBrief) || undefined,
    commit: raw.commit === true,
  };
}

/** Whether the band may render navigation links at all: `true` or a non-empty list of hrefs. */
export function allowsNavLinks(request: Pick<GenerateHeaderRequest, 'navLinks'>): boolean {
  return request.navLinks === true || (Array.isArray(request.navLinks) && request.navLinks.length > 0);
}

/**
 * Navigation entries the header may link, in the order the project declares them.
 *
 * With a list of hrefs only those entries survive (the LABEL still comes from the project, so the
 * model never invents one); with `true` every entry is allowed; otherwise none.
 */
export function allowedNavEntries(request: Pick<GenerateHeaderRequest, 'navLinks' | 'navigation'>): Array<{ label: string; href: string }> {
  const navigation = request.navigation ?? [];
  if (request.navLinks === true) return navigation;
  if (!Array.isArray(request.navLinks) || request.navLinks.length === 0) return [];
  const wanted = new Set(request.navLinks);
  return navigation.filter((entry) => wanted.has(entry.href));
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
export interface ValidateHeaderOptions {
  /** Routes the header may link to: the project's navigation entries. Anything else is invented. */
  allowedHrefs?: string[];
  /** Whether the band may render navigation links at all (request.navLinks). */
  allowNavLinks?: boolean;
  /** DS custom properties the project actually defines (request.tokens). */
  allowedTokens?: string[];
  /** Which of those are COLORS (request.colorTokens) — the band may only use the nav family. */
  colorTokens?: string[];
  /** Locales the header was asked to speak; the messages block must cover exactly these. */
  locales?: string[];
}

/** Custom properties referenced with var(). */
export function findCssVars(text: string): string[] {
  return [...new Set([...text.matchAll(/var\(\s*(--[a-z0-9-]+)/giu)].map((match) => match[1]))];
}

/**
 * Custom properties the header DECLARES itself (`--letter-index: 3`), in CSS or in an inline style.
 *
 * These are the header's own control variables — animation indexes, computed offsets, a local scale —
 * and they are not design-system tokens: rejecting them would forbid every technique that needs one.
 * A declaration is `--name:` NOT preceded by `var(`, which is what tells it apart from a reference.
 */
export function findDeclaredCssVars(text: string): string[] {
  const declared = new Set<string>();
  for (const match of text.matchAll(/(--[a-z0-9-]+)\s*:/giu)) {
    const before = text.slice(Math.max(0, match.index - 6), match.index);
    if (/var\(\s*$/u.test(before)) continue; // `var(--x, …)` is a reference, not a declaration
    declared.add(match[1]);
  }
  return [...declared];
}

/** Literal routes the band navigates to (href="/x" or navigateTo('/x')), minus the allowed ones. */
export function findInventedRoutes(bandHtml: string, allowedHrefs: readonly string[] = []): string[] {
  const allowed = new Set(allowedHrefs);
  const found = new Set<string>();
  for (const match of bandHtml.matchAll(/(?:href=|navigateTo\(\s*)['"](\/[^'"]*)['"]/gu)) {
    if (!allowed.has(match[1])) found.add(match[1]);
  }
  return [...found];
}

export function validateHeaderParts(parts: GeneratedHeaderParts, options: ValidateHeaderOptions = {}): string[] {
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

  // Injecting markup from a string never works in a lit template (it interpolates TEXT), and the
  // fragment cannot import a directive — the base already does it, sanitized, in renderLogo().
  if (/(?:^|[^.\w])svg`/u.test(bandHtml) || /unsafe(HTML|SVG)/u.test(bandHtml)) {
    errors.push('bandHtml cannot inline markup from a string (svg`...` / unsafeHTML) — use this.renderLogo() or this.renderBrand()');
  }
  if (/this\.brand\.logoSvg/u.test(bandHtml)) {
    errors.push('bandHtml must not touch this.brand.logoSvg — this.renderLogo() renders the mark safely');
  }

  // The user affordance is the base's: it carries the photo -> initials -> silhouette fallback and the
  // identity panel (email + sign out). A hand-rolled button loses both — a real generation shipped an
  // EMPTY span (the initial of a name the session had not answered yet) and a click that did nothing.
  if (/emitHeaderAction\(\s*['"]user['"]/u.test(bandHtml)) {
    errors.push("bandHtml must not build its own user button — call this.renderUserAvatar() (photo/initials/silhouette + identity menu); it is already included by this.renderActions()");
  }
  if (/this\.(userFirstName|userName)/u.test(bandHtml) && /(slice\(|charAt\(|\[0\])/u.test(bandHtml)) {
    errors.push('bandHtml must not derive an avatar initial by hand — this.renderUserAvatar() does it, with a fallback for the empty case');
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

  // Navigation in the header is opt-in: the aside already owns the menu.
  if (options.allowNavLinks !== true && /this\.render(NavLinks|ModuleLinks)\s*\(/u.test(bandHtml)) {
    errors.push('bandHtml renders navigation links but no route was selected — drop this.renderNavLinks() (select the routes, or pass navLinks:true, to allow it)');
  }

  // The model has no way to know which routes exist, so it must not name one: an action with no
  // destination (user, search) goes through this.emitHeaderAction, never a made-up path.
  for (const route of findInventedRoutes(bandHtml, options.allowedHrefs)) {
    errors.push(`bandHtml navigates to "${route}", which is not one of the project's routes — link only the provided navigation entries, or use this.emitHeaderAction('<action>') for an action with no route`);
  }

  // The fragments are inlined into template literals — unbalanced backticks break the file.
  for (const [name, text] of [['bandHtml', bandHtml], ['bandCss', bandCss]] as const) {
    if ((text.match(/`/gu)?.length ?? 0) % 2 !== 0) errors.push(`${name} has an unbalanced backtick`);
  }

  if (hasLiteralColor(bandHtml)) errors.push('bandHtml has a literal color; use a DS token with a fallback');

  // A token that does not exist in the project's design system resolves to the fallback and the
  // theme stops applying — silently. The DS names tokens by ROLE with no prefix (`--nav-text`), so
  // an invented `--ds-color-nav-text` looks right and does nothing.
  const usedVars = [...findCssVars(bandHtml), ...findCssVars(bandCss)];
  // Everything the header declares for itself is its own business (see findDeclaredCssVars).
  const ownVars = new Set([...findDeclaredCssVars(bandHtml), ...findDeclaredCssVars(bandCss)]);
  if (options.allowedTokens?.length) {
    const allowed = new Set(options.allowedTokens);
    for (const name of usedVars) {
      // `--aura-*` belongs to the shell/base, not to the design system.
      if (name.startsWith('--aura-') || allowed.has(name) || ownVars.has(name)) continue;
      errors.push(`${name} is not a token of this project's design system — use one of: ${options.allowedTokens.join(', ')} (a variable the header declares itself is fine, this one is only read)`);
      break;
    }
  }

  // The band IS the nav surface. A color token that exists but belongs to another role (text-default,
  // surface-bg, button-primary-*) paints a page control on the nav strip — and on a dark nav it is a
  // bright box. Non-color scales (radius/space/shadow/font) are free.
  if (options.colorTokens?.length) {
    const colors = new Set(options.colorTokens);
    const offender = usedVars.find((name) => colors.has(name) && !name.startsWith('--nav-') && !ownVars.has(name));
    if (offender) {
      const navFamily = options.colorTokens.filter((name) => name.startsWith('--nav-'));
      errors.push(`${offender} is a color of another role — inside the band paint with the nav family${navFamily.length ? ` (${navFamily.join(', ')})` : ''}`);
    }
  }

  if (bandCss) {
    if (hasLiteralColor(bandCss)) errors.push('bandCss has a literal color outside a var(--ds-*, fallback)');

    for (const selector of cssSelectors(bandCss)) {
      if (selector.startsWith('@')) continue;
      // Keyframe steps (`0%`, `50%`, `from`, `to`) live inside @keyframes and are not selectors —
      // requiring the tag on them would make animation impossible.
      if (/^(from|to|-?\d+(\.\d+)?%)(\s*,\s*(from|to|-?\d+(\.\d+)?%))*$/u.test(selector)) continue;
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
      // The locales are the project's, not the model's choice: a missing one ships a header that
      // falls back to another language at runtime, which is invisible until a user switches.
      for (const wanted of options.locales ?? []) {
        if (!locales.includes(wanted)) errors.push(`messages is missing the locale "${wanted}" (requested locales: ${(options.locales ?? []).join(', ')})`);
      }
      for (const locale of locales) {
        const bad = Object.keys(parts.messages[locale] ?? {}).find((key) => !isIdentifier(key));
        if (bad) {
          errors.push(`messages.${locale} has the key "${bad}", which is not a plain identifier — it is read as this.localized(messages).<key>`);
          break;
        }
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

/**
 * Identifier-safe suffix for a locale: `pt-BR` -> `pt_BR`.
 *
 * A locale is not an identifier — `const message_pt-BR` is a syntax error, and so is an unquoted
 * `pt-BR:` object key. Both shipped once in a generated header. Same rule cfePageSkeleton uses.
 */
function constSuffix(locale: string): string {
  return locale.replace(/[^a-zA-Z0-9]+/gu, '_');
}

/** A message key must be a plain identifier — it is read as `this.localized(messages).<key>`. */
function isIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name);
}

function messagesBlock(messages: Record<string, Record<string, string>>): string {
  const locales = Object.keys(messages);
  const first = locales[0];
  const literal = (locale: string) => `{
${Object.entries(messages[locale])
    .map(([key, text]) => `  ${key}: ${JSON.stringify(text)},`)
    .join('\n')}
}`;

  const lines = [
    '/// **collab_i18n_start**',
    `const message_${constSuffix(first)} = ${literal(first)};`,
    `type MessageType = typeof message_${constSuffix(first)};`,
    `const messages: Record<string, MessageType> = {`,
    // The KEY stays the locale as written (quoted, so 'pt-BR' is legal); the identifier is sanitized.
    ...locales.map((locale) => `  ${JSON.stringify(locale)}: ${locale === first ? `message_${constSuffix(first)}` : indentTail(literal(locale), 2)},`),
    '};',
    '/// **collab_i18n_end**',
  ];
  return lines.join('\n');
}

/** Assembles the final header source from the model's fragments. */
export function buildHeaderSource(
  projectId: number,
  parts: GeneratedHeaderParts,
  options: { previewToken?: string } = {},
): string {
  // With a token the same parts are assembled under the preview tag/file, so the Header plugin can
  // render a draft without touching the applied header.
  const paths = headerPaths(projectId, options);
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

  const errors = validateHeaderParts(parts, {
    allowedHrefs: allowedNavEntries(request).map((entry) => entry.href),
    allowNavLinks: allowsNavLinks(request),
    allowedTokens: request.tokens,
    colorTokens: request.colorTokens,
    locales: request.locales,
  });
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
    ownHandled.length
      ? `Actions YOU must render in the band: ${ownHandled.join(', ')}. They have NO route: render a `
        + `<button> whose @click calls this.emitHeaderAction('<action>') — never this.navigateTo and never an href.`
      : '',
    allowsNavLinks(request)
      ? (allowedNavEntries(request).length
        ? `Navigation entries SELECTED for this header (render them with this.renderNavLinks(), which already receives exactly these): ${allowedNavEntries(request).map((entry) => entry.label).join(', ')}`
        : 'Navigation links were requested but none of the selected routes exists in the project: render no links.')
      : 'NO navigation links in this header: the aside owns the menu. Do not call this.renderNavLinks() and do not write any route.',
    request.tokens?.length
      ? `Design system tokens THIS project defines — use only these, exactly as written: ${request.tokens.join(', ')}`
      : 'No token list was provided: do not invent one, paint with plain CSS values.',
    request.colorTokens?.some((name) => name.startsWith('--nav-'))
      ? `COLOR inside the band comes from the nav family only: ${request.colorTokens.filter((name) => name.startsWith('--nav-')).join(', ')}.`
        + ' Every other color token (text-*, surface-*, button-*, input-*) belongs to the page, not to the header.'
      : '',
    request.locales?.length
      ? `Fixed copy goes in the messages block, with ONE map per locale, exactly these: ${request.locales.join(', ')}.`
        + ` The first one is the reference; every map must have the same keys. Read it with this.localized(messages).`
      : (request.language ? `Write any fixed copy in: ${request.language}` : ''),
  ].filter(Boolean);

  return lines.join('\n');
}
