/// <mls fileReference="_102020_/l2/dsMatch/buildGlobalCss.ts" enhancement="_blank" />

// Design-System FORM-MODEL contract (Phase B styling).
//
// These interfaces describe the authoring shape used by the Design System plugin form,
// the AI generator (generateDsCore/agentGenerateDs) and the ds<->theme conversion in
// buildDesignSystemTs. The CSS tokens themselves live in `_<project>_/l2/designSystem.ts`
// (classic IDesignSystemTokens shape) — this module no longer emits any stylesheet.

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
