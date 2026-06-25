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
// (the `register` terminal step of agentImplementsDesignSystem2). Editing a token value only
// regenerates this file; pages that reference `var(--ds-*)` need no re-generation.

import { createStorFile } from '/_102027_/l2/libStor.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';

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

/** Canonical file reference of the project-wide DS stylesheet (single source of truth:
 *  both the writer and the page-defs `dependsFiles` entry use this). */
export const dsGlobalCssRef = (project: number): string => `_${project}_/l2/styles/global.css`;

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
 * Font-loading CSS gathered across ALL design systems: `@import` lines (google + custom URLs)
 * and `@font-face` blocks (custom self-hosted sources). Emitted ONCE at the top of global.css.
 * @import must precede every rule, so this block is placed before the `.ds-*` blocks.
 */
function collectFontLoads(designSystems: Record<string, { tokens?: DsTokens }>): string {
    const imports = new Set<string>();
    const faces: string[] = [];
    for (const ds of Object.values(designSystems ?? {})) {
        const fonts = ds?.tokens?.typography?.fonts;
        if (!Array.isArray(fonts)) continue;
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
    const lines = [...[...imports].map(u => `@import url('${u}');`), ...faces];
    return lines.join('\n');
}

/** Color vars for one variant ('light' | 'dark'). */
function colorVars(tokens: DsTokens, variant: 'light' | 'dark'): string[] {
    const color = tokens.color ?? {};
    return Object.entries(color)
        .filter(([, role]) => role && typeof role[variant] === 'string')
        .map(([roleName, role]) => `${colorVar(roleName)}: ${role[variant]};`);
}

/** One DS → its `.ds-<name>` (light) + `.dark .ds-<name>` (dark) blocks. */
export function tokensToCss(name: string, tokens: DsTokens): string {
    const cls = dsClassName(name);
    const indent = (lines: string[]) => lines.map(l => `  ${l}`).join('\n');

    const light = [...colorVars(tokens, 'light'), ...staticVars(tokens)];
    const dark = colorVars(tokens, 'dark');

    const blocks: string[] = [];
    if (light.length) blocks.push(`.${cls} {\n${indent(light)}\n}`);
    if (dark.length) blocks.push(`.dark .${cls} {\n${indent(dark)}\n}`);
    return blocks.join('\n\n');
}

/** Build the full stylesheet string from a project's designSystems map. */
export function renderGlobalCss(designSystems: Record<string, { name?: string; tokens?: DsTokens }>): string {
    const header = '/* AUTO-GENERATED by dsMatch/buildGlobalCss — do not edit by hand. */';
    const fontLoads = collectFontLoads(designSystems);   // @import / @font-face — must come first
    const entries = Object.entries(designSystems ?? {})
        .filter(([, ds]) => ds && ds.tokens && typeof ds.tokens === 'object')
        .sort(([a], [b]) => Number(a) - Number(b));

    const blocks = entries
        .map(([, ds]) => tokensToCss(ds.name ?? 'default', ds.tokens as DsTokens))
        .filter(Boolean);

    return [header, fontLoads, ...blocks].filter(Boolean).join('\n\n') + '\n';
}

// ─── stor I/O ────────────────────────────────────────────────────────────────────

/** Create or overwrite a file by file reference (mirrors planning.saveFile). */
async function writeFileByRef(ref: string, src: string): Promise<void> {
    const info = mls.stor.convertFileReferenceToFile(ref);
    const key = mls.stor.getKeyToFile(info);
    let sf = mls.stor.files[key];
    if (!sf) {
        sf = await createStorFile({ ...info, source: src } as any, true, true, true);
        await mls.stor.localStor.setContent(sf, { contentType: 'string', content: src });
    } else {
        await createOrGetModel(sf, 'json', src, sf.project);
    }
}

async function createOrGetModel(stor: mls.stor.IFileInfo, editorType: string, src: string, project: number) {
    const uri = getUri(`l5_project-config_${project}}`);
    let model1 = monaco.editor.getModel(uri);
    if (!model1) {
        model1 = monaco.editor.createModel(src, editorType, uri);
        setEventsModel(stor, model1);
    } else {
        model1.setValue(src);
    }
    return model1;
}
function getUri(shortFN: string): monaco.Uri {
    return monaco.Uri.parse(`file://server/${shortFN}}.ts`);
}

function setEventsModel(stor: mls.stor.IFileInfo, model: monaco.editor.ITextModel) {
    model.onDidChangeContent(async (event) => {
        const val = model.getValue();
        await mls.stor.localStor.setContent(stor, {
            contentType: 'string',
            content: val
        });
    });
}

/**
 * Regenerate `_<project>_/l2/styles/global.css` from the project's designSystems tokens.
 * Idempotent — rewrites the whole file. Returns the CSS written.
 */
export async function buildGlobalCss(project: number): Promise<string> {
    const config: any = await getConfigProject(project);
    const designSystems = (config?.designSystems && typeof config.designSystems === 'object')
        ? config.designSystems
        : {};
    const css = renderGlobalCss(designSystems);
    await writeFileByRef(dsGlobalCssRef(project), css);
    return css;
}

/** Read the generated DS stylesheet for the preview (empty string when absent). */
export async function readDsGlobalCss(project: number): Promise<string> {
    try {
        const info = mls.stor.convertFileReferenceToFile(dsGlobalCssRef(project));
        const key = mls.stor.getKeyToFile(info);
        const sf = mls.stor.files[key];
        if (!sf) return '';
        const content = await sf.getContent();
        return typeof content === 'string' ? content : '';
    } catch {
        return '';
    }
}
