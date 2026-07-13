/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/generateDsCore.ts" enhancement="_blank" />

// Pure core of "generate a Design System with the LLM" (DS-3). The agent
// (aura/agentManageDesignSystem/agentGenerateDs.ts) sends { name?, description?, palette?, brief? } and
// the LLM answers a compact map of COLOR FAMILY BASES (11 families Ã— {light, dark}). This module
// deterministically EXPANDS those bases into the full mandatory token set (lighter/darker/light/
// dark variants Ã— hover/focus/disabled states + `_dark-` pairs) via HSL math, and fills
// global/typography from the canonical template (`_102029_` â€” single source of truth). No
// storage/framework imports â€” testable in isolation.
//
// Why bases-only: asking the LLM for ~120 hex values is expensive and fragile. It picks the 11
// semantic anchors from the brand palette; the code derives every shade coherently and ALWAYS
// produces a complete, valid entry (missing/invalid family â†’ template default for that family).

import type { IKeyValueToken, IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import {
    MANDATORY_COLOR_FAMILIES, MANDATORY_TOKEN_KEYS, defaultTokensTemplate,
    type MandatoryColorFamily,
} from '/_102029_/l2/designSystemBase.js';

// â”€â”€â”€ Request / result contracts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** The plugin's generation request (JSON on the agent prompt + echoed via longMemory). */
export interface GenerateDsRequest {
    projectId: number;
    palette?: string[];          // brand colors â€” the SOURCE the LLM maps to family bases
    brief?: string;              // optional free-text mood/use (extra context)
    nameHint?: string;           // user-typed name, if any (LLM may propose one otherwise)
    language?: string;           // 'en' | 'pt' | 'es' â€” language of name/description
    requestId?: string;          // one-shot correlation id: plugin â†” config.dsDraft
}

/** One color family's anchor colors, as returned by the LLM. */
export interface FamilyBase { light: string; dark: string; }

/** Sanitized generation output â€” the tokens portion the plugin loads into its Add form. */
export interface GeneratedDs {
    name: string;
    description: string;
    tokens: Pick<IDesignSystemTokens, 'color' | 'typography' | 'global'>;
}

// â”€â”€â”€ Color math (pure HSL) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#[0-9a-fA-F]{3}$/;

/** '#abc' / '#A1B2C3' â†’ '#aabbcc' (lowercase, 6-digit); anything else â†’ null. */
export function normalizeHex(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const v = raw.trim();
    if (HEX6.test(v)) return v.toLowerCase();
    if (HEX3.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
    return null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    const d = max - min;
    if (d !== 0) {
        s = d / (1 - Math.abs(2 * l - 1));
        switch (max) {
            case r: h = ((g - b) / d) % 6; break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4; break;
        }
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
    s = Math.max(0, Math.min(100, s)) / 100;
    l = Math.max(0, Math.min(100, l)) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    const to2 = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/** Shift a color's lightness (percentage points) and optionally scale saturation. */
function shade(hex: string, dl: number, satScale = 1): string {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s * satScale, l + dl);
}

// â”€â”€â”€ Family â†’ mandatory keys expansion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Lightness deltas (percentage points) that turn a family BASE into each variant/state.
// Tuned to yield distinct, readable shades â€” not to reproduce the template's hand-authored
// values (the point is brand-derived coherence; the user can fine-tune afterwards).
const VARIANT_DL: Record<string, number> = { lighter: 12, light: 8, '': 0, dark: -8, darker: -12 };
const STATE_DL: Record<string, number> = { '': 0, hover: 6, focus: -6, disabled: 16 };

interface ParsedColorKey { dark: boolean; family: string; variant: string; state: string; }

/** Parse a mandatory color key into (family, variant, state, dark). Returns null if unrecognized. */
export function parseColorKey(key: string): ParsedColorKey | null {
    let rest = key;
    const dark = rest.startsWith('_dark-');
    if (dark) rest = rest.slice('_dark-'.length);
    const family = (MANDATORY_COLOR_FAMILIES as readonly string[]).find(f => rest === `${f}-color` || rest.startsWith(`${f}-color-`));
    if (!family) return null;
    let tail = rest.slice(`${family}-color`.length); // '' | '-lighter' | '-darker-hover' | â€¦
    let state = '';
    for (const st of ['hover', 'focus', 'disabled']) {
        if (tail.endsWith(`-${st}`)) { state = st; tail = tail.slice(0, -(st.length + 1)); break; }
    }
    const variant = tail ? tail.slice(1) : ''; // strip leading '-'
    return { dark, family, variant, state };
}

/** Value for one mandatory color key given its family's base {light,dark}. */
function colorForKey(parsed: ParsedColorKey, base: FamilyBase): string {
    const src = parsed.dark ? base.dark : base.light;
    const dl = (VARIANT_DL[parsed.variant] ?? 0) + (STATE_DL[parsed.state] ?? 0);
    return shade(src, dl, parsed.state === 'disabled' ? 0.6 : 1);
}

/**
 * Build the full mandatory color record from per-family bases. Every mandatory color key is
 * emitted (light + `_dark-`), computed from its family base; families absent/invalid in `bases`
 * keep the canonical template default so the entry is ALWAYS complete.
 */
export function expandColorTokens(bases: Partial<Record<MandatoryColorFamily, FamilyBase>>): IKeyValueToken {
    const template = defaultTokensTemplate().color;
    const out: IKeyValueToken = {};
    for (const key of MANDATORY_TOKEN_KEYS.color) {
        const parsed = parseColorKey(key);
        const base = parsed ? bases[parsed.family as MandatoryColorFamily] : undefined;
        out[key] = (parsed && base) ? colorForKey(parsed, base) : template[key];
    }
    return out;
}

// â”€â”€â”€ Human prompt â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function buildGenerateDsHumanPrompt(req: GenerateDsRequest): string {
    const parts: string[] = [];
    if (req.brief?.trim()) parts.push(`## Brief (mood / intended use)\n${req.brief.trim()}`);
    if (req.palette?.length) {
        parts.push([
            `## Brand palette (SOURCE â€” map these to the family bases)`,
            req.palette.map(c => `- ${c}`).join('\n'),
            `Derive every family base from these brand colors. Do NOT invent an unrelated palette.`,
        ].join('\n'));
    }
    if (req.nameHint?.trim()) parts.push(`## Name\nThe design system is named "${req.nameHint.trim()}" (keep it).`);
    parts.push(`## Families to return (each needs light + dark hex)\n${MANDATORY_COLOR_FAMILIES.map(f => `- ${f}`).join('\n')}`);
    parts.push(`## Language\nWrite "name" and "description" in language: ${req.language || 'en'}.`);
    return parts.join('\n\n');
}

// â”€â”€â”€ Sanitization (deterministic â€” the LLM output never reaches the entry unchecked) â”€

const slugName = (raw: unknown): string => String(raw ?? '').trim();

// Plain interface (not a discriminated union): the repo compiles with strictNullChecks off.
export interface SanitizeDsResult { ok: boolean; error?: string; value?: GeneratedDs; }

/**
 * Validate the LLM's raw `result` into a complete GeneratedDs.
 * - families: each valid #hex light/dark pair seeds its family expansion; invalid/missing â†’ default.
 * - color: ALWAYS the full mandatory set (expandColorTokens), so the entry is never partial.
 * - typography/global: fixed from the canonical template (the AI focuses on colors).
 */
export function sanitizeGeneratedDs(raw: any, req: GenerateDsRequest): SanitizeDsResult {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'LLM result is not an object' };

    const rawFamilies = (raw.families && typeof raw.families === 'object') ? raw.families : {};
    const bases: Partial<Record<MandatoryColorFamily, FamilyBase>> = {};
    for (const family of MANDATORY_COLOR_FAMILIES) {
        const f = rawFamilies[family];
        const light = normalizeHex(f?.light);
        const dark = normalizeHex(f?.dark);
        if (light && dark) bases[family] = { light, dark };
    }

    const template = defaultTokensTemplate();
    const tokens = {
        color: expandColorTokens(bases),
        typography: template.typography,
        global: template.global,
    };

    const name = slugName(raw.name) || (req.nameHint ?? '').trim();
    const description = slugName(raw.description);
    return { ok: true, value: { name, description, tokens } };
}
