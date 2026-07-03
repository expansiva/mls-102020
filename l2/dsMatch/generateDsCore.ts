/// <mls fileReference="_102020_/l2/dsMatch/generateDsCore.ts" enhancement="_blank" />

// Pure core of "generate a Design System with the LLM" (task 12). The agent
// (agents/designSystem/agentGenerateDs.ts) sends {brief?, palette?} and the LLM answers a
// complete DsTokens draft; this module holds the closed vocabulary, builds the human prompt
// and deterministically sanitizes the LLM output (clamp enums, validate hex, enforce the
// input palette). No storage/framework imports — testable in isolation.

import type { DsTokens, DsColorRole, DsFont } from '/_102020_/l2/dsMatch/buildGlobalCss.js';

// ─── Closed vocabulary (single source of truth; the plugin renders these) ────────

export const CANONICAL_ROLES = ['primary', 'accent', 'background', 'surface', 'text', 'muted', 'border', 'success', 'danger'] as const;
export const REQUIRED_ROLES = ['primary', 'background', 'surface', 'text', 'border'] as const;

export const FONT_SOURCES = ['system', 'google', 'custom'] as const;
export const FALLBACKS = ['sans-serif', 'serif', 'monospace'] as const;
export const SCALES = ['compact', 'comfortable', 'spacious'] as const;
export const WEIGHTS = ['400', '500', '600', '700'] as const;
export const TRACKINGS = ['tight', 'normal', 'wide'] as const;
export const RADII = ['none', 'sm', 'md', 'lg', 'full'] as const;
export const BORDERS = ['0', '1', '2'] as const;
export const DENSITIES = ['compact', 'cozy', 'comfortable'] as const;
export const ELEVATIONS = ['none', 'soft', 'strong'] as const;

/** Curated Google-Fonts suggestions — the LLM (and the plugin combobox) may use any family. */
export const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'DM Sans', 'Manrope', 'Work Sans', 'Plus Jakarta Sans', 'Source Sans 3',
    'Space Grotesk', 'Bricolage Grotesque', 'Fraunces', 'Playfair Display', 'Lora', 'Merriweather',
    'JetBrains Mono', 'IBM Plex Mono',
];

// ─── Request / result contracts ───────────────────────────────────────────────

/** The plugin's generation request (JSON on the agent prompt + echoed via longMemory). */
export interface GenerateDsRequest {
    projectId: number;
    brief?: string;              // free-text description of brand/mood/use (mode 2)
    palette?: string[];          // brand colors to preserve as the source palette (mode 3)
    nameHint?: string;           // user-typed name, if any (LLM may propose one otherwise)
    language?: string;           // 'en' | 'pt' | 'es' — language of name/description
    requestId?: string;          // one-shot correlation id: plugin ↔ config.dsDraft
}

/** Sanitized generation output — ready for the plugin's _loadDraft + save path. */
export interface GeneratedDs {
    name: string;
    description: string;
    tokens: DsTokens;
}

// ─── Human prompt ─────────────────────────────────────────────────────────────

export function buildGenerateDsHumanPrompt(req: GenerateDsRequest): string {
    const parts: string[] = [];
    if (req.brief?.trim()) parts.push(`## Brief (what this design system is for)\n${req.brief.trim()}`);
    if (req.palette?.length) {
        parts.push([
            `## Brand palette (SOURCE — copy verbatim into tokens.palette)`,
            req.palette.map(c => `- ${c}`).join('\n'),
            `Derive every color role from these brand colors. Do NOT invent a different palette.`,
        ].join('\n'));
    }
    if (req.nameHint?.trim()) parts.push(`## Name\nThe design system is named "${req.nameHint.trim()}" (keep it).`);
    parts.push(`## Language\nWrite "name" and "description" in language: ${req.language || 'en'}.`);
    return parts.join('\n\n');
}

// ─── Sanitization (deterministic — the LLM output never reaches config unchecked) ─

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

/** '#abc' / '#A1B2C3' → '#AABBCC'; anything else → null. */
export function normalizeHex(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const v = raw.trim();
    if (HEX6.test(v)) return v.toUpperCase();
    if (HEX3.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toUpperCase();
    return null;
}

const slug = (raw: unknown): string =>
    String(raw ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const pick = (raw: unknown, allowed: readonly string[], fallback: string): string => {
    const v = String(raw ?? '').trim().toLowerCase();
    return (allowed as readonly string[]).includes(v) ? v : fallback;
};

// Plain interface (not a discriminated union): the repo compiles with strictNullChecks off,
// where union narrowing on `ok` does not kick in.
export interface SanitizeDsResult { ok: boolean; error?: string; value?: GeneratedDs; }

/**
 * Validate + clamp the LLM's raw `result` into a safe GeneratedDs.
 * - roles: only valid #RRGGBB light/dark pairs survive; REQUIRED_ROLES must remain.
 * - palette: the request palette (when given) OVERRIDES whatever the LLM returned.
 * - enums (scale/radius/…): clamped to the closed vocabulary with sensible defaults.
 * - fonts: name+family required, source/fallback clamped; none valid → system-ui pair.
 */
export function sanitizeGeneratedDs(raw: any, req: GenerateDsRequest): SanitizeDsResult {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'LLM result is not an object' };
    const t = raw.tokens;
    if (!t || typeof t !== 'object') return { ok: false, error: 'LLM result has no tokens object' };

    // color roles
    const color: Record<string, DsColorRole> = {};
    for (const [roleRaw, val] of Object.entries((t.color ?? {}) as Record<string, any>)) {
        const role = slug(roleRaw);
        const light = normalizeHex(val?.light);
        const dark = normalizeHex(val?.dark);
        if (!role || !light || !dark) continue;
        color[role] = { light, dark };
    }
    const missing = REQUIRED_ROLES.filter(r => !color[r]);
    if (missing.length) return { ok: false, error: `missing/invalid required color roles: ${missing.join(', ')}` };
    if (color.background.light === color.background.dark) {
        return { ok: false, error: 'background.light equals background.dark — no real light/dark themes' };
    }

    // palette — the user's brand colors win; else the LLM's valid ones; else derive from roles
    const reqPalette = (req.palette ?? []).map(normalizeHex).filter((c): c is string => !!c);
    const llmPalette = (Array.isArray(t.palette) ? t.palette : []).map(normalizeHex).filter((c: any): c is string => !!c);
    const palette = (reqPalette.length ? reqPalette : llmPalette).slice(0, 8);
    if (!palette.length) palette.push(color.primary.light, color.background.light, color.text.light);

    // typography
    const rawFonts = Array.isArray(t.typography?.fonts) ? t.typography.fonts : [];
    const fonts: DsFont[] = rawFonts
        .map((f: any): DsFont | null => {
            const name = slug(f?.name);
            const family = typeof f?.family === 'string' ? f.family.trim() : '';
            if (!name || !family) return null;
            const source = pick(f?.source, FONT_SOURCES, 'google') as DsFont['source'];
            const out: DsFont = { name, source, family, fallback: pick(f?.fallback, FALLBACKS, 'sans-serif') };
            if (source !== 'system') {
                const weights = (Array.isArray(f?.weights) ? f.weights : [])
                    .map((w: any) => parseInt(String(w), 10))
                    .filter((w: number) => Number.isFinite(w) && w >= 100 && w <= 900);
                if (weights.length) out.weights = [...new Set<number>(weights)].sort((a, b) => a - b);
            }
            if (source === 'custom' && typeof f?.url === 'string' && f.url.trim()) out.url = f.url.trim();
            return out;
        })
        .filter((f: DsFont | null): f is DsFont => !!f);
    if (!fonts.length) {
        fonts.push(
            { name: 'display', source: 'system', family: 'system-ui', fallback: 'sans-serif' },
            { name: 'body', source: 'system', family: 'system-ui', fallback: 'sans-serif' },
        );
    }

    const tokens: DsTokens = {
        palette,
        color,
        typography: {
            fonts,
            scale: pick(t.typography?.scale, SCALES, 'comfortable'),
            weightHeading: pick(t.typography?.weightHeading, WEIGHTS, '600'),
            tracking: pick(t.typography?.tracking, TRACKINGS, 'normal'),
        },
        shape: {
            radius: pick(t.shape?.radius, RADII, 'md'),
            borderWidth: pick(t.shape?.borderWidth, BORDERS, '1'),
        },
        density: pick(t.density, DENSITIES, 'cozy'),
        elevation: pick(t.elevation, ELEVATIONS, 'soft'),
    };

    const name = (typeof raw.name === 'string' ? raw.name : '').trim() || (req.nameHint ?? '').trim();
    const description = (typeof raw.description === 'string' ? raw.description : '').trim();
    return { ok: true, value: { name, description, tokens } };
}
