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
    style: style ?? 'monogram',
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

/**
 * The "black blob" failure mode, mechanically.
 *
 * Two ways a mark comes out as a solid square at 28px: a shape that fills the whole viewBox, or a
 * shape with no paint of its own while the root does not declare fill="none" (SVG's default fill is
 * black, so it inherits a solid). Both are cheap to detect and both are fatal to legibility.
 */
function findBlobRisks(svg: string): string[] {
  const errors: string[] = [];
  const rootTag = svg.slice(0, svg.indexOf('>') + 1);
  const viewBox = (attr(rootTag, 'viewBox') ?? '').split(/[\s,]+/u).map(Number);
  const [, , boxWidth, boxHeight] = viewBox.length === 4 && viewBox.every((n) => Number.isFinite(n))
    ? viewBox
    : [0, 0, 0, 0];
  const rootFill = attr(rootTag, 'fill');

  for (const shape of svg.matchAll(/<(rect|circle|ellipse|path|polygon|polyline|line)\b[^>]*>/gu)) {
    const [tag, name] = [shape[0], shape[1]];
    const fill = attr(tag, 'fill');
    const stroke = attr(tag, 'stroke');

    // Inheriting a non-"none" fill means inheriting black.
    if (!fill && name !== 'line' && name !== 'polyline' && rootFill !== 'none') {
      errors.push(`<${name}> declares no fill and the root does not set fill="none" — it inherits solid black; state fill="none" or fill="currentColor" on every shape`);
      break;
    }
    if (!fill && !stroke && (name === 'line' || name === 'polyline')) {
      errors.push(`<${name}> has neither fill nor stroke — it draws nothing`);
      break;
    }

    const painted = (fill ?? rootFill ?? 'black') !== 'none';
    if (!painted || !boxWidth || !boxHeight) continue;

    if (name === 'rect') {
      const width = Number(attr(tag, 'width') ?? 0);
      const height = Number(attr(tag, 'height') ?? 0);
      if (width >= boxWidth * 0.9 && height >= boxHeight * 0.9) {
        errors.push('a filled <rect> covering the whole viewBox reads as a solid square at 28px — make the container an outline (fill="none" + stroke)');
        break;
      }
    }
    if (name === 'circle' || name === 'ellipse') {
      const radiusX = Number(attr(tag, name === 'circle' ? 'r' : 'rx') ?? 0);
      const radiusY = Number(attr(tag, name === 'circle' ? 'r' : 'ry') ?? 0);
      if (radiusX >= boxWidth * 0.45 && radiusY >= boxHeight * 0.45) {
        errors.push(`a filled <${name}> covering the whole viewBox reads as a solid blob at 28px — make the container an outline (fill="none" + stroke)`);
        break;
      }
    }
  }

  return errors;
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
  if (lower.includes('href=') || lower.includes('xlink:') || lower.includes('url(')) {
    errors.push('svg must not reference anything external');
  }

  const root = lower.slice(0, lower.indexOf('>') + 1);
  if (/\s(width|height)\s*=/u.test(root)) errors.push('the <svg> root must not declare width/height — the band sizes it');

  if (/#[0-9a-f]{3,8}/u.test(lower) || /(rgb|rgba|hsl|hsla)\(/u.test(lower)) {
    errors.push('the mark must be monochrome: no literal color, paint with currentColor');
  }
  for (const paint of lower.matchAll(/(?:fill|stroke)\s*=\s*"([^"]*)"/gu)) {
    const value = paint[1].trim();
    if (value && value !== 'currentcolor' && value !== 'none') {
      errors.push(`fill/stroke "${paint[1]}" is not allowed — use currentColor or none`);
      break;
    }
  }

  // Legibility, not safety: a mark that renders as a solid block is worse than no mark.
  if (errors.length === 0) errors.push(...findBlobRisks(svg));

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
  monogram: 'a monogram: the initial(s) of the name as geometry, inside or against a simple container shape',
  mark: 'an abstract mark: 2 to 4 geometric shapes evoking the activity, with no letters',
  wordmark: 'a compact wordmark: the name drawn as paths, no wider than 12 characters',
};

export function buildGenerateLogoHumanPrompt(request: GenerateLogoRequest): string {
  const style = request.style ?? 'monogram';
  return [
    `Brand: ${request.brandTitle || '(unnamed)'}`,
    `Style: ${style} — ${STYLE_GUIDE[style]}`,
    request.brief ? `What it should evoke: ${request.brief}` : '',
    'It renders 28px tall in an app header band, so it must read at that size: few shapes, no hairlines,'
      + ' and nothing thinner than 1 unit in a 32-unit viewBox.',
  ].filter(Boolean).join('\n');
}
