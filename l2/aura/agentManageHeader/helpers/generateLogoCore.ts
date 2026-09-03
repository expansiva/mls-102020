/// <mls fileReference="_102020_/l2/aura/agentManageHeader/helpers/generateLogoCore.ts" enhancement="_blank"/>

// Pure core of agentGenerateLogo: the request, the prompt, the SVG validation and the write into the
// header profile's `brand`. No I/O — the agent does the reading and writing.
//
// The mark is stored as MARKUP in the config (`brand.logoSvg`), not as a file: the header inlines it,
// which is the only way it inherits `currentColor` and follows the design system in light and dark
// (an external `<img src="*.svg">` never sees the page's CSS). Because it is inlined, the markup is
// executable surface — `isSafeLogoSvg`, shared with the runtime, is what keeps it honest.

import { isSafeLogoSvg, MAX_LOGO_SVG_BYTES } from '/_102033_/l2/shared/layout/auraHeaderCore.js';
import { DEFAULT_HEADER_PROFILE } from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';
import type {
  AppHeaderBrand,
  ProjectClientShellConfig,
  ProjectDynamicRegionConfig,
} from '/_102029_/l2/runtimeConfigTypes.js';

/** Mark shapes an LLM draws reliably; figurative art is deliberately not on the list. */
export type LogoStyle = 'monogram' | 'mark' | 'wordmark';

export interface GenerateLogoRequest {
  projectId: number;
  /** Brand name the mark stands for; read from the profile when the caller omits it. */
  brandTitle?: string;
  /** What the mark should evoke, in the user's words. */
  brief?: string;
  style?: LogoStyle;
  /** Header profile whose brand receives the mark; the active one by default. */
  profileName?: string;
  requestId?: string;
  /** true = write brand.logoSvg into l5/config.json; false/absent = draft only. */
  commit?: boolean;
}

const STYLES: readonly LogoStyle[] = ['monogram', 'mark', 'wordmark'];

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates and normalizes the agent entry. Throws with an actionable message. */
export function normalizeLogoRequest(raw: unknown): GenerateLogoRequest {
  if (!isRecord(raw)) throw new Error('entry must be a JSON object');
  const projectId = Number(raw.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) throw new Error('entry needs { projectId }');

  const style = STYLES.find((candidate) => candidate === raw.style);
  return {
    projectId,
    brandTitle: readString(raw.brandTitle) || undefined,
    brief: readString(raw.brief) || undefined,
    // No default: forcing a style is how a 'cup and bean' brief came back as the letter C.
    style,
    profileName: readString(raw.profileName) || undefined,
    requestId: readString(raw.requestId) || undefined,
    commit: raw.commit === true,
  };
}

// ─── validation ──────────────────────────────────────────────────────────────


function attr(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`, 'u').exec(tag);
  return match ? match[1].trim() : undefined;
}

/** Why a returned mark was refused, in terms the prompt can act on. Empty = accepted. */
export function validateLogoSvg(markup: string): string[] {
  const svg = readString(markup);
  const errors: string[] = [];

  if (!svg) return ['no svg was returned'];
  if (svg.length > MAX_LOGO_SVG_BYTES) {
    errors.push(`svg is ${svg.length} bytes, over the ${MAX_LOGO_SVG_BYTES} limit — simplify the shape`);
  }

  const lower = svg.toLowerCase();
  if (!lower.startsWith('<svg') || !lower.endsWith('</svg>')) errors.push('svg must be a single <svg> root element');
  if (lower.split('<svg').length > 2) errors.push('svg must contain exactly one <svg> element');
  if (!/\sviewbox\s*=/u.test(lower)) errors.push('svg must declare a viewBox (it is what makes it scale)');
  if (/<(script|foreignobject|iframe|image|use|style|animate)/u.test(lower)) {
    errors.push('svg must be plain shapes: no script/style/image/use/animate/foreignObject');
  }
  if (/\son[a-z]+\s*=/u.test(lower) || lower.includes('javascript:')) {
    errors.push('svg must carry no event handler or javascript: URL');
  }
  // Internal url(#id) is fine (a gradient the markup carries); anything else leaves the page.
  if (/(?:href|src)\s*=/u.test(lower) || lower.includes('xlink:') || /url\(\s*(?!#)/u.test(lower)) {
    errors.push('svg must not reference anything external (url(#id) for an inline gradient is fine)');
  }

  const root = lower.slice(0, lower.indexOf('>') + 1);
  if (/\s(width|height)\s*=/u.test(root)) errors.push('the <svg> root must not declare width/height — the band sizes it');

  // Last word to the runtime's own predicate, so a mark accepted here always renders there.
  if (errors.length === 0 && !isSafeLogoSvg(svg)) errors.push('svg was refused by the runtime sanitizer');
  return errors;
}

export function sanitizeGeneratedLogo(
  result: unknown,
): { ok: boolean; error?: string; value?: { svg: string; notes?: string } } {
  if (!isRecord(result)) return { ok: false, error: 'result is not an object' };
  const svg = readString(result.svg)
    .replace(/^```[a-z]*\s*/iu, '')
    .replace(/```$/u, '')
    .trim();

  const errors = validateLogoSvg(svg);
  if (errors.length > 0) return { ok: false, error: errors.join('; ') };
  return { ok: true, value: { svg, notes: readString(result.notes) || undefined } };
}

// ─── config write ────────────────────────────────────────────────────────────

export interface LogoWrite {
  /** Patched copy of the config document — the input is left untouched. */
  config: Record<string, unknown>;
  profileName: string;
  /** Brand title the mark ends up standing for (also the alt text). */
  brandTitle?: string;
  replaced: boolean;
}

/**
 * Writes `brand.logoSvg` into a header profile of `l5/config.json`, leaving the rest of the brand
 * (title, subtitle, href) alone — the mark is one field of an identity that already exists.
 */
export function applyLogoToBrand(
  config: unknown,
  options: { svg: string; profileName?: string; brandTitle?: string },
): LogoWrite {
  if (!isRecord(config)) throw new Error('l5/config.json not found or not an object');
  const errors = validateLogoSvg(options.svg);
  if (errors.length > 0) throw new Error(`refusing to write an invalid mark: ${errors.join('; ')}`);

  const next = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
  const clientShell = isRecord(next.clientShell)
    ? next.clientShell as unknown as ProjectClientShellConfig
    : undefined;
  const header = clientShell?.regions?.header;
  if (!header?.profiles) {
    throw new Error('no header region in l5/config.json — run agentGenerateHeader first (or register a header profile)');
  }

  const profileName = options.profileName || header.activeProfile || DEFAULT_HEADER_PROFILE;
  const profile = header.profiles[profileName] as ProjectDynamicRegionConfig | undefined;
  if (!profile) {
    throw new Error(`header profile "${profileName}" does not exist (available: ${Object.keys(header.profiles).join(', ') || 'none'})`);
  }

  const brand = (isRecord(profile.brand) ? profile.brand : (profile.brand = {})) as unknown as AppHeaderBrand;
  const replaced = Boolean(readString(brand.logoSvg));
  if (options.brandTitle && !readString(brand.title)) brand.title = options.brandTitle;
  brand.logoSvg = options.svg;

  return { config: next, profileName, brandTitle: readString(brand.title) || options.brandTitle, replaced };
}

/** Brand title already configured on a header profile, so the caller need not repeat it. */
export function readBrandTitle(config: unknown, profileName?: string): string {
  if (!isRecord(config)) return '';
  const clientShell = isRecord(config.clientShell)
    ? config.clientShell as unknown as ProjectClientShellConfig
    : undefined;
  const header = clientShell?.regions?.header;
  const name = profileName || header?.activeProfile || DEFAULT_HEADER_PROFILE;
  const brand = header?.profiles?.[name]?.brand;
  return isRecord(brand) ? readString(brand.title) : '';
}

// ─── prompt ──────────────────────────────────────────────────────────────────

const STYLE_GUIDE: Record<LogoStyle, string> = {
  monogram: 'a monogram built from the initial(s) of the name',
  mark: 'an object/symbol mark — draw the thing, not the letters',
  wordmark: 'the name drawn as letterforms',
};

/**
 * The brief IS the prompt. Style is a hint and only when the caller asked for one; the brand name is
 * context (the header already prints it in text, so the mark does not have to spell it).
 */
export function buildGenerateLogoHumanPrompt(request: GenerateLogoRequest): string {
  const lines = [
    request.brief ? `Draw: ${request.brief}` : '',
    request.brandTitle ? `For the app "${request.brandTitle}" (its name is already written next to the mark).` : '',
    request.style ? `Preferred form: ${STYLE_GUIDE[request.style]}.` : '',
  ].filter(Boolean);
  return lines.join('\n');
}
