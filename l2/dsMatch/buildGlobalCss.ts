/// <mls fileReference="_102020_/l2/dsMatch/buildGlobalCss.ts" enhancement="_blank" />

// Deterministic Design-System stylesheet generator (Phase B styling).
//
// Reads every `designSystems[*].tokens` from project.json and emits ONE project-wide
// stylesheet at `_<project>_/l2/styles/global.css`. Each DS becomes a class-scoped block:
//
//   .ds-<name>      { --ds-*: <light value>; … }   // light (base)
//   .dark .ds-<name>{ --ds-*: <dark value>;  … }   // dark — preview toggles the `.dark` class
//
// A page applies `class="ds-<name>"` on its root; because Aura components render in light DOM
// (createRenderRoot returns this), the `--ds-*` variables cascade into the whole tree, including
// composed molecules and their slot tags. Pure token→CSS transform — no LLM. Run once, project-wide
// (the `register` terminal step of agentImplementGenome). Editing a token value only
// regenerates this file; pages that reference `var(--ds-*)` need no re-generation.

import { createStorFile } from '/_102027_/l2/libStor.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import type { DsTokenReconciliation } from '/_102020_/l2/dsMatch/mlTokenVocab.js';

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

/** Canonical file reference of a DS stylesheet — ONE file per design system, keyed by its
 *  numeric index: `_<project>_/l2/styles/<ds>/global.css`. Single source of truth shared by
 *  the writer, the page-defs `dependsFiles` entry and the preview reader. */
export const dsGlobalCssRef = (project: number, ds: number | string): string =>
    `_${project}_/l2/styles/${ds}/global.css`;

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

/** Slug for the parent class: lowercase, non-alphanumerics collapsed to a dash. */
export function dsClassName(name: string): string {
    const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return `ds-${slug || 'unnamed'}`;
}

function borderWidthLength(value: string | undefined): string | null {
    if (value == null) return null;
    const v = String(value).trim();
    if (!v) return null;
    return /^\d+$/.test(v) ? `${v}px` : v;
}

/** CSS family value with fallback (family quoted when it contains spaces). */
function fontFamilyValue(family: string, fallback?: string): string {
    const fam = /\s/.test(family) ? `'${family}'` : family;
    return fallback ? `${fam}, ${fallback}` : fam;
}

/** Font vars (`--ds-font-<role>`) from the dynamic fonts list, or the legacy display/body. */
function fontVars(tokens: DsTokens): string[] {
    const t = tokens.typography ?? {};
    if (Array.isArray(t.fonts) && t.fonts.length) {
        return t.fonts
            .filter(f => f && f.name && f.family)
            .map(f => `--ds-font-${f.name}: ${fontFamilyValue(f.family, f.fallback)};`);
    }
    const out: string[] = [];
    if (t.fontDisplay) out.push(`--ds-font-display: ${t.fontDisplay};`);
    if (t.fontBody) out.push(`--ds-font-body: ${t.fontBody};`);
    return out;
}

/** Theme-independent vars (fonts, shape) — emitted only in the light/base block. */
function staticVars(tokens: DsTokens): string[] {
    const out: string[] = [...fontVars(tokens)];
    const radius = tokens.shape?.radius;
    if (radius && RADIUS_LENGTH[radius] != null) out.push(`--ds-radius: ${RADIUS_LENGTH[radius]};`);
    const bw = borderWidthLength(tokens.shape?.borderWidth);
    if (bw) out.push(`--ds-border-w: ${bw};`);
    return out;
}

/** Build the Google Fonts css2 import URL from a family + weights. */
function googleImportUrl(family: string, weights?: number[]): string {
    const fam = family.trim().replace(/\s+/g, '+');
    const w = (weights && weights.length) ? `:wght@${[...weights].sort((a, b) => a - b).join(';')}` : '';
    return `https://fonts.googleapis.com/css2?family=${fam}${w}&display=swap`;
}

/**
 * Font-loading CSS for ONE design system: `@import` lines (google + custom URLs) and
 * `@font-face` blocks (custom self-hosted sources). Emitted at the top of the DS file —
 * @import must precede every rule, so this block comes before the `:root` blocks.
 */
function collectFontLoads(tokens: DsTokens): string {
    const imports = new Set<string>();
    const faces: string[] = [];
    const fonts = tokens.typography?.fonts;
    if (Array.isArray(fonts)) {
        for (const f of fonts) {
            if (!f || !f.family) continue;
            if (f.source === 'google') {
                imports.add(googleImportUrl(f.family, f.weights));
            } else if (f.source === 'custom') {
                if (f.url) imports.add(f.url);
                for (const face of f.faces ?? []) {
                    if (!face?.src) continue;
                    const parts = [`font-family: '${f.family}';`, `src: url('${face.src}') format('woff2');`];
                    if (face.weight) parts.push(`font-weight: ${face.weight};`);
                    if (face.style) parts.push(`font-style: ${face.style};`);
                    faces.push(`@font-face { ${parts.join(' ')} }`);
                }
            }
            // system: nothing to load
        }
    }
    return [...[...imports].map(u => `@import url('${u}');`), ...faces].join('\n');
}

/** Color vars for one variant ('light' | 'dark'). */
function colorVars(tokens: DsTokens, variant: 'light' | 'dark'): string[] {
    const color = tokens.color ?? {};
    return Object.entries(color)
        .filter(([, role]) => role && typeof role[variant] === 'string')
        .map(([roleName, role]) => `${colorVar(roleName)}: ${role[variant]};`);
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

/**
 * One DS → `:root` (light) + `:root.dark` (dark) blocks. Each DS lives in its OWN file and a
 * page loads only its DS file, so the variables sit on `:root` (global to the page) — no
 * class wrapper needed. Dark uses `:root.dark` (the Aura preview toggles `.dark` on <html>).
 */
export function tokensToCss(tokens: DsTokens, mlMap?: Record<string, string | null>): string {
    const indent = (lines: string[]) => lines.map(l => `  ${l}`).join('\n');

    // Molecule token reconciliation (--ml-* → --ds-*/derived). Theme-agnostic: it points at
    // --ds-* vars, which swap in :root.dark, so it lives in the light block. null = keep default.
    const mlLines = mlMap
        ? Object.entries(mlMap)
            .filter(([, v]) => typeof v === 'string' && v.trim())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}: ${v};`)
        : [];
    const mlSection = mlLines.length ? ['/* molecule tokens reconciled to the DS */', ...mlLines] : [];

    const light = [...colorVars(tokens, 'light'), ...staticVars(tokens), ...mlSection];
    const dark = colorVars(tokens, 'dark');

    const blocks: string[] = [];
    if (light.length) blocks.push(`:root {\n${indent(light)}\n}`);
    if (dark.length) blocks.push(`:root.dark {\n${indent(dark)}\n}`);
    return blocks.join('\n\n');
}

/** Build the full stylesheet string for ONE design system's tokens (+ optional --ml-* reconciliation). */
export function renderGlobalCss(tokens: DsTokens, mlMap?: Record<string, string | null>): string {
    const header = '/* AUTO-GENERATED by dsMatch/buildGlobalCss — do not edit by hand. */';
    const fontLoads = collectFontLoads(tokens);   // @import / @font-face — must come first
    const body = tokensToCss(tokens, mlMap);
    return [header, fontLoads, body].filter(Boolean).join('\n\n') + '\n';
}

// ─── stor I/O ────────────────────────────────────────────────────────────────────

/**
 * Create or overwrite the generated stylesheet. This is NOT an editor-managed file
 * (a .css has no monaco model), so content is written straight to the local store —
 * the same mechanism updateConfigProject uses for project.json.
 *   - new file  → createStorFile (which persists the initial content)
 *   - existing  → localStor.setContent (overwrite)
 */
async function writeFileByRef(ref: string, src: string): Promise<void> {
    const info = mls.stor.convertFileReferenceToFile(ref);
    const key = mls.stor.getKeyToFile(info);
    const sf = mls.stor.files[key];
    if (!sf) {
        await createStorFile({ ...info, source: src } as any, false);
        return;
    }
    await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
}

/**
 * Regenerate the per-DS stylesheet(s) at `_<project>_/l2/styles/<ds>/global.css`.
 *   - `ds` given → regenerate only that DS's file.
 *   - `ds` omitted → regenerate every DS that has tokens.
 * Idempotent. A DS without `tokens` (e.g. the default DS) writes no file.
 */
export async function buildGlobalCss(project: number, ds?: number | string): Promise<void> {
    const config: any = await getConfigProject(project);
    const designSystems = (config?.designSystems && typeof config.designSystems === 'object')
        ? config.designSystems
        : {};
    const keys = ds != null ? [String(ds)] : Object.keys(designSystems);
    for (const k of keys) {
        const tokens = designSystems[k]?.tokens;
        if (!tokens || typeof tokens !== 'object') continue; // no styling tokens → no file
        // Reconciled --ml-* mapping (agentReconcileTokens). `pinned` overrides win + emit last.
        const recon: DsTokenReconciliation | undefined = designSystems[k]?.tokenReconciliation;
        const mlMap = recon ? { ...(recon.map ?? {}), ...(recon.pinned ?? {}) } : undefined;
        await writeFileByRef(dsGlobalCssRef(project, k), renderGlobalCss(tokens, mlMap));
    }
}

/** Read a DS's generated stylesheet for the preview (empty string when absent). */
export async function readDsGlobalCss(project: number, ds: number | string): Promise<string> {
    try {
        const info = mls.stor.convertFileReferenceToFile(dsGlobalCssRef(project, ds));
        const key = mls.stor.getKeyToFile(info);
        const sf = mls.stor.files[key];
        if (!sf) return '';
        const content = await sf.getContent();
        return typeof content === 'string' ? content : '';
    } catch {
        return '';
    }
}
