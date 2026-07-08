/// <mls fileReference="_102020_/l2/dsMatch/buildGlobalCss.ts" enhancement="_blank" />

// Design-System token CONTRACT (Phase B styling) + derived vocabulary helpers.
//
// The static per-DS stylesheet this module used to emit (`styles/<ds>/global.css`) is GONE:
// the unified model generates `_<project>_/l2/designSystem.ts` instead (see buildDesignSystemTs)
// and the CSS is built dynamically at preview/bootstrap by `_102029_/l2/designSystemBase`.
// What remains here is the shape of `designSystems[*].tokens` in project.json and the
// `--ds-*` vocabulary derivation used by the reconciliation agent.

// ─── Token shape (the contract adopted on designSystems[ds].tokens) ──────────────
export interface DsColorRole { light: string; dark: string; }

/** A custom @font-face entry (self-hosted / arbitrary URL). */
export interface DsFontFace { weight?: number; style?: string; src: string; }

/**
 * One font ROLE. `name` is the role (display, body, mono, …) → emitted as `--ds-font-<name>`.
 * `source` decides how the family is LOADED:
 *   - system: already installed (no load)
 *   - google: loaded via `@import` from Google Fonts (URL derived from family + weights)
 *   - custom: loaded from `url` (a stylesheet @import) or `faces` (@font-face blocks)
 */
export interface DsFont {
    name: string;
    source?: 'system' | 'google' | 'custom';
    family: string;
    weights?: number[];
    fallback?: string;                               // serif | sans-serif | monospace | …
    url?: string;                                    // custom: stylesheet URL to @import
    faces?: DsFontFace[];                            // custom: @font-face sources
}

export interface DsTokens {
    palette?: string[];                              // authoring-only; never emitted
    color?: Record<string, DsColorRole>;
    typography?: {
        fonts?: DsFont[];                            // dynamic font roles (preferred)
        fontDisplay?: string;                        // legacy fallback (string family)
        fontBody?: string;                           // legacy fallback (string family)
        scale?: string;                              // applied via Tailwind classes by the render skill
        weightHeading?: string;
        weightBody?: string;
        tracking?: string;
    };
    shape?: { radius?: string; borderWidth?: string };
    density?: string;                                // applied via Tailwind classes
    elevation?: string;                              // applied via Tailwind classes
}

// Color role → CSS var name (most roles map 1:1; `background` shortens to `bg`).
const COLOR_VAR_ALIAS: Record<string, string> = { background: 'bg' };
const colorVar = (role: string) => `--ds-${COLOR_VAR_ALIAS[role] ?? role}`;

// Semantic radius scale → concrete length (mirrors Tailwind's rounded-* values).
const RADIUS_LENGTH: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
};

function borderWidthLength(value: string | undefined): string | null {
    if (value == null) return null;
    const v = String(value).trim();
    if (!v) return null;
    return /^\d+$/.test(v) ? `${v}px` : v;
}

/**
 * Every `--ds-*` var this DS emits (color roles + font roles + shape). Used by the
 * reconciliation agent (as the target vocabulary) and to validate its output.
 */
export function dsVarNames(tokens: DsTokens): string[] {
    const names: string[] = [];
    for (const role of Object.keys(tokens.color ?? {})) names.push(colorVar(role));
    const fonts = tokens.typography?.fonts;
    if (Array.isArray(fonts) && fonts.length) {
        for (const f of fonts) if (f?.name) names.push(`--ds-font-${f.name}`);
    } else {
        if (tokens.typography?.fontDisplay) names.push('--ds-font-display');
        if (tokens.typography?.fontBody) names.push('--ds-font-body');
    }
    if (tokens.shape?.radius && RADIUS_LENGTH[tokens.shape.radius] != null) names.push('--ds-radius');
    if (borderWidthLength(tokens.shape?.borderWidth)) names.push('--ds-border-w');
    return [...new Set(names)];
}
