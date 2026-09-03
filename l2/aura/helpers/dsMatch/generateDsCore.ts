/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/generateDsCore.ts" enhancement="_blank" />

// Pure core of "generate a Design System with the LLM" (DS-3). The agent
// (aura/agentManageDesignSystem/agentGenerateDs.ts) sends { name?, description?, palette?, brief? } and
// the LLM answers a compact map of COLOR ROLE BASES (44 roles x {light, dark}). This module
// deterministically EXPANDS those bases into the full mandatory token set (each role x
// hover/focus/disabled states + `_dark-` twins) via HSL math, and fills global/typography from
// the canonical template (`_102029_` = single source of truth). No storage/framework imports,
// so it is testable in isolation.
//
// Why bases-only: asking the LLM for 352 hex values is expensive and fragile. It picks the 44
// role anchors from the brand palette; the code derives every state coherently and ALWAYS
// produces a complete, valid entry (missing/invalid role = template default for that role).

import type { IKeyValueToken, IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';
import {
    MANDATORY_COLOR_ROLES, MANDATORY_TOKEN_KEYS, defaultTokensTemplate,
    type MandatoryColorRole,
} from '/_102029_/l2/designSystemBase.js';

// â”€â”€â”€ Request / result contracts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** The plugin's generation request (JSON on the agent prompt + echoed via longMemory). */
export interface GenerateDsRequest {
    projectId: number;
    palette?: string[];          // brand colors â€” the SOURCE the LLM maps to role bases
    brief?: string;              // optional free-text mood/use (extra context)
    nameHint?: string;           // user-typed name, if any (LLM may propose one otherwise)
    language?: string;           // 'en' | 'pt' | 'es' â€” language of name/description
    requestId?: string;          // one-shot correlation id: plugin â†” config.dsDraft
}

/** One color role's anchor colors, as returned by the LLM. */
export interface RoleBase { light: string; dark: string; }

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

/** Scale a color's lightness by a factor (1 = unchanged, 0.93 = 7% darker). */
function scaleLightness(hex: string, factor: number): string {
    const { h, s, l } = hexToHsl(hex);
    return hslToHex(h, s, l * factor);
}

/** Mix `hex` toward `target` by `amount` (0 = hex, 1 = target), channel-wise. */
function mixToward(hex: string, target: string, amount: number): string {
    const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    const to2 = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return '#' + [0, 1, 2].map(i => to2(ch(hex, i) + (ch(target, i) - ch(hex, i)) * amount)).join('');
}

// --- Role -> mandatory keys expansion ---------------------------------------------

// How a role BASE becomes each state. Derived from the reference model
// (`_102045_/l2/designSystem.ts`, entry "Default"), which is MULTIPLICATIVE in lightness: an
// additive delta would be a no-op on the many near-white roles (surface-bg #ffffff), leaving
// hover invisible. `disabled` washes toward a light neutral, which is what the reference does
// for both dark text (#111827 -> #8b8f98) and saturated fills (#1273d4 -> #8bb8e6).
const STATE_LIGHTNESS: Record<string, number> = { '': 1, hover: 0.93, focus: 0.87 };
const DISABLED_TARGET = '#f6f7fa';
const DISABLED_MIX = 0.55;

interface ParsedColorKey { dark: boolean; role: string; state: string; }

/**
 * Parse a mandatory color key into (role, state, dark). Unambiguous: no role name ends in a
 * state word, so the state suffix is stripped first and the remainder must be a known role.
 */
export function parseColorKey(key: string): ParsedColorKey | null {
    let rest = key;
    const dark = rest.startsWith('_dark-');
    if (dark) rest = rest.slice('_dark-'.length);
    let state = '';
    for (const st of ['hover', 'focus', 'disabled']) {
        if (rest.endsWith(`-${st}`)) { state = st; rest = rest.slice(0, -(st.length + 1)); break; }
    }
    if (!(MANDATORY_COLOR_ROLES as readonly string[]).includes(rest)) return null;
    return { dark, role: rest, state };
}

/** Value for one mandatory color key given its role's base {light,dark}. */
function colorForKey(parsed: ParsedColorKey, base: RoleBase): string {
    const src = parsed.dark ? base.dark : base.light;
    if (parsed.state === 'disabled') return mixToward(src, DISABLED_TARGET, DISABLED_MIX);
    return scaleLightness(src, STATE_LIGHTNESS[parsed.state] ?? 1);
}

/**
 * Build the full mandatory color record from per-role bases. Every mandatory color key is
 * emitted (light + `_dark-`), computed from its role base; roles absent/invalid in `bases`
 * keep the canonical template default so the entry is ALWAYS complete.
 */
export function expandColorTokens(bases: Partial<Record<MandatoryColorRole, RoleBase>>): IKeyValueToken {
    const template = defaultTokensTemplate().color;
    const out: IKeyValueToken = {};
    for (const key of MANDATORY_TOKEN_KEYS.color) {
        const parsed = parseColorKey(key);
        const base = parsed ? bases[parsed.role as MandatoryColorRole] : undefined;
        out[key] = (parsed && base) ? colorForKey(parsed, base) : template[key];
    }
    return out;
}

// --- Human prompt -----------------------------------------------------------------

export function buildGenerateDsHumanPrompt(req: GenerateDsRequest): string {
    const parts: string[] = [];
    if (req.brief?.trim()) parts.push(`## Brief (mood / intended use)\n${req.brief.trim()}`);
    if (req.palette?.length) {
        parts.push([
            `## Brand palette (SOURCE â€” map these to the role bases)`,
            req.palette.map(c => `- ${c}`).join('\n'),
            `Derive every role base from these brand colors. Do NOT invent an unrelated palette.`,
        ].join('\n'));
    }
    if (req.nameHint?.trim()) parts.push(`## Name\nThe design system is named "${req.nameHint.trim()}" (keep it).`);
    parts.push(`## Roles to return (each needs light + dark hex)\n${MANDATORY_COLOR_ROLES.map(r => `- ${r}`).join('\n')}`);
    parts.push(`## Language\nWrite "name" and "description" in language: ${req.language || 'en'}.`);
    return parts.join('\n\n');
}

// â”€â”€â”€ Sanitization (deterministic â€” the LLM output never reaches the entry unchecked) â”€

const slugName = (raw: unknown): string => String(raw ?? '').trim();

// Plain interface (not a discriminated union): the repo compiles with strictNullChecks off.
export interface SanitizeDsResult { ok: boolean; error?: string; value?: GeneratedDs; }

/**
 * Validate the LLM's raw `result` into a complete GeneratedDs.
 * - roles: each valid #hex light/dark pair seeds its role expansion; invalid or missing falls
 *   back to the template default.
 * - color: ALWAYS the full mandatory set (expandColorTokens), so the entry is never partial.
 * - typography/global: fixed from the canonical template (the AI focuses on colors).
 */
export function sanitizeGeneratedDs(raw: any, req: GenerateDsRequest): SanitizeDsResult {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'LLM result is not an object' };

    const rawRoles = (raw.roles && typeof raw.roles === 'object') ? raw.roles : {};
    const bases: Partial<Record<MandatoryColorRole, RoleBase>> = {};
    for (const role of MANDATORY_COLOR_ROLES) {
        const r = rawRoles[role];
        const light = normalizeHex(r?.light);
        const dark = normalizeHex(r?.dark);
        if (light && dark) bases[role] = { light, dark };
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
