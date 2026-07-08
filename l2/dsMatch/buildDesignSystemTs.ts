/// <mls fileReference="_102020_/l2/dsMatch/buildDesignSystemTs.ts" enhancement="_blank" />

// Tokens-module library (Phase B styling) — unified model.
//
// `_<project>_/l2/designSystem.ts` is the SINGLE home of the styling tokens (classic MLS
// shape, IDesignSystemTokens[]; one entry per design system, `themeName` = the DS name in
// project.json). project.json keeps only identity + generation config (rules/skill/overrides
// + authoring styleHints like palette/density — things that never become CSS tokens).
//
// This module is the bridge between the two worlds:
//   dsTokensToTheme   form model (DsTokens)  → theme entry   (what the plugin SAVES)
//   themeToDsTokens   theme entry            → form model    (what the plugin LOADS)
//   readThemes        read the project's designSystem.js entries (via collabImport)
//   writeTheme        replace/insert ONE entry in designSystem.ts (editor pipeline write)
//
// Conversion (DsTokens ↔ IDesignSystemTokens):
//   color roles {light,dark}   ↔ `ds-<role>` + `_dark-ds-<role>`   (background ↔ ds-bg)
//   typography.fonts[]         ↔ `ds-font-<name>` tokens + `fonts` field (loading via @import/@font-face)
//   shape.radius/borderWidth   ↔ `ds-radius` / `ds-border-w`
// Keys the converter does not own (ml-* reconciliation, hand-added tokens) are preserved
// on writes — the plugin form never sees or destroys them.

import { createStorFile } from '/_102027_/l2/libStor.js';
import { replaceTokensBlock, getTokens } from '/_102027_/l2/designSystemBase.js';
import { IDesignSystemTokens, DsFont } from '/_102029_/l2/designSystemBase.js';
import { DsTokens } from '/_102020_/l2/dsMatch/buildGlobalCss.js';

/** Canonical file reference of the tokens module — ONE file per project. */
export const designSystemTsRef = (project: number): string => `_${project}_/l2/designSystem.ts`;

// Color role ↔ token name (most roles map 1:1; `background` shortens to `bg`).
const COLOR_TOKEN_ALIAS: Record<string, string> = { background: 'bg' };
const COLOR_TOKEN_ALIAS_BACK: Record<string, string> = { bg: 'background' };
const colorTokenName = (role: string) => `ds-${COLOR_TOKEN_ALIAS[role] ?? role}`;
const colorRoleName = (token: string) => {
    const short = token.replace(/^ds-/, '');
    return COLOR_TOKEN_ALIAS_BACK[short] ?? short;
};

// Semantic radius scale ↔ concrete length (mirrors Tailwind's rounded-* values).
const RADIUS_LENGTH: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    full: '9999px',
};
const RADIUS_NAME: Record<string, string> = Object.fromEntries(Object.entries(RADIUS_LENGTH).map(([k, v]) => [v, k]));

// Token keys the ↔ conversion OWNS per bucket. Anything else (ml-*, custom tokens) is
// preserved untouched by writeTheme's merge and never surfaces in the plugin form.
const OWNED_KEYS: Record<'color' | 'typography' | 'global', RegExp> = {
    color: /^(_dark-)?ds-/,
    typography: /^ds-font-/,
    global: /^(ds-radius|ds-border-w)$/,
};

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

/** Convert one form model (Aura DsTokens) into one theme entry. Only the CSS-materializable
 *  half is converted — palette/scale/density/elevation live in project.json (styleHints). */
export function dsTokensToTheme(name: string, description: string, tokens: DsTokens): IDesignSystemTokens {

    const color: Record<string, string> = {};
    for (const [role, val] of Object.entries(tokens.color ?? {})) {
        if (!val) continue;
        if (typeof val.light === 'string') color[colorTokenName(role)] = val.light;
        if (typeof val.dark === 'string') color[`_dark-${colorTokenName(role)}`] = val.dark;
    }

    const typography: Record<string, string> = {};
    const t = tokens.typography ?? {};
    const fonts: DsFont[] = Array.isArray(t.fonts) ? t.fonts.filter(f => f && f.name && f.family) : [];
    if (fonts.length) {
        for (const f of fonts) typography[`ds-font-${f.name}`] = fontFamilyValue(f.family, f.fallback);
    } else {
        if (t.fontDisplay) typography['ds-font-display'] = t.fontDisplay;
        if (t.fontBody) typography['ds-font-body'] = t.fontBody;
    }

    const global: Record<string, string> = {};
    const radius = tokens.shape?.radius;
    if (radius && RADIUS_LENGTH[radius] != null) global['ds-radius'] = RADIUS_LENGTH[radius];
    const bw = borderWidthLength(tokens.shape?.borderWidth);
    if (bw) global['ds-border-w'] = bw;

    const theme: IDesignSystemTokens = { themeName: name, description, color, typography, global };
    if (fonts.length) theme.fonts = fonts;
    return theme;
}

/** Reverse conversion: one theme entry → the form model (CSS-materializable half only). */
export function themeToDsTokens(theme: IDesignSystemTokens): DsTokens {

    const color: NonNullable<DsTokens['color']> = {};
    for (const [key, light] of Object.entries(theme.color ?? {})) {
        if (!/^ds-/.test(key)) continue;
        const role = colorRoleName(key);
        const dark = theme.color?.[`_dark-${key}`];
        color[role] = { light, dark: typeof dark === 'string' ? dark : light };
    }

    const typography: NonNullable<DsTokens['typography']> = {};
    if (Array.isArray(theme.fonts) && theme.fonts.length) {
        typography.fonts = theme.fonts.map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined }));
    } else {
        const display = theme.typography?.['ds-font-display'];
        const body = theme.typography?.['ds-font-body'];
        if (display) typography.fontDisplay = display;
        if (body) typography.fontBody = body;
    }

    const shape: NonNullable<DsTokens['shape']> = {};
    const radius = theme.global?.['ds-radius'];
    if (radius) shape.radius = RADIUS_NAME[radius] ?? radius;
    const bw = theme.global?.['ds-border-w'];
    if (bw) shape.borderWidth = bw.replace(/px$/, '');

    return { color, typography, shape };
}

/** The project's theme entries, from the compiled designSystem.js (empty when absent). */
export async function readThemes(project: number): Promise<IDesignSystemTokens[]> {
    try {
        const themes = await getTokens(project);
        return Array.isArray(themes) ? themes : [];
    } catch {
        return [];
    }
}

/**
 * Replace/insert ONE theme entry in the project's designSystem.ts (matched by
 * `previousName ?? theme.themeName` — pass previousName on rename). With `merge` (default),
 * keys the converter does not own (ml-* reconciliation, hand-added tokens) are carried over
 * from the old entry; with `merge: false` the entry is written exactly as given.
 */
export async function writeTheme(
    project: number,
    theme: IDesignSystemTokens,
    opts?: { previousName?: string; merge?: boolean },
): Promise<void> {

    const themes = await readThemes(project);
    const matchName = opts?.previousName ?? theme.themeName;
    const idx = themes.findIndex(t => t.themeName === matchName);

    let entry = theme;
    if (idx >= 0 && (opts?.merge ?? true)) {
        const old = themes[idx];
        entry = { ...theme };
        for (const bucket of ['color', 'typography', 'global'] as const) {
            const preserved: Record<string, string> = {};
            for (const [k, v] of Object.entries(old[bucket] ?? {})) {
                if (!OWNED_KEYS[bucket].test(k)) preserved[k] = v;
            }
            entry[bucket] = { ...preserved, ...(theme[bucket] ?? {}) };
        }
    }

    if (idx >= 0) themes[idx] = entry;
    else themes.push(entry);

    await writeThemes(project, themes);
}

function renderThemes(themes: IDesignSystemTokens[]): string {
    return themes.map(t => JSON.stringify(t, null, 4)).join(',\n\n');
}

/** Full source of the designSystem.ts (also the initial file of new Aura projects, with an empty list). */
export function renderDesignSystemSource(project: number, themes: IDesignSystemTokens[]): string {
    return `/// <mls fileReference="_${project}_/l2/designSystem.ts" enhancement="_blank" />

// Styling tokens of this project — one entry per design system (themeName = DS name).
// Managed by the Design System plugin; identity/generation config lives in l5/project.json.

import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

export const tokens: IDesignSystemTokens[] = [
${renderThemes(themes)}
];
`;
}

/** Rewrite the whole tokens block through the editor pipeline (undo/compile consistent). */
async function writeThemes(project: number, themes: IDesignSystemTokens[]): Promise<void> {

    const key = mls.stor.getKeyToFiles(project, 2, 'designSystem', '', '.ts');
    const storFile = mls.stor.files[key];

    if (!storFile) {
        await createStorFile({
            project, shortName: 'designSystem', folder: '', level: 2,
            extension: '.ts', source: renderDesignSystemSource(project, themes), status: 'new',
        }, true, true, false);
        return;
    }

    // Existing file (possibly open in the editor): same path as _102027_ serializeTokens.
    const libCommon = await import('/_102027_/l2/libCommom.js');
    await libCommon.forceServiceInstance(2, '_100554_serviceSource');
    const serviceSource = mls.services['100554_serviceSource_left'];
    if (!serviceSource) throw new Error('[writeThemes] Service source is not instancied');

    const libModel = await import('/_102027_/l2/libModel.js');
    const models = await libModel.createAllModels(storFile);
    if (!models || !models.ts) throw new Error(`[writeThemes] Invalid models for file: ${project}_designSystem`);

    const oldCode = models.ts.model.getValue();
    const hasBlock = /export\s+const\s+tokens\s*:\s*IDesignSystemTokens\[\]\s*=\s*\[/.test(oldCode);
    const newCode = hasBlock
        ? replaceTokensBlock(oldCode, `\n${renderThemes(themes)}\n`)
        : renderDesignSystemSource(project, themes);
    if (newCode === oldCode) return;

    serviceSource.setValueInModeKeepingUndo(models.ts.model, newCode, true);
}
