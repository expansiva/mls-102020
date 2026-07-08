/// <mls fileReference="_102020_/l2/dsMatch/buildDesignSystemTs.ts" enhancement="_blank" />

// Deterministic Design-System generator (Phase B styling) — unified model.
//
// Reads every `designSystems[*].tokens` from project.json and (re)generates the project's
// `_<project>_/l2/designSystem.ts` in the classic MLS shape (IDesignSystemTokens[]):
// one theme entry per design system, `themeName` = designSystems[k].name. The runtime then
// builds the CSS dynamically — dev preview and the production bootstrap both call
// `getTokensCss` from `_102029_/l2/designSystemBase` over the compiled designSystem.js,
// so there is NO static stylesheet output anymore (replaces buildGlobalCss).
//
// Conversion (DsTokens → IDesignSystemTokens):
//   color roles {light,dark}   → `ds-<role>` + `_dark-ds-<role>`   (background → ds-bg)
//   typography.fonts[]         → `ds-font-<name>` tokens + `fonts` field (loading via @import/@font-face)
//   shape.radius/borderWidth   → `ds-radius` / `ds-border-w`
//   tokenReconciliation        → `ml-*` tokens valued `var(--ds-*)` (pinned overrides win)
//
// Pure token→code transform — no LLM. Runs on Design System plugin save and at the
// genome `register` terminal step. A DS without `tokens` (e.g. the default DS) is omitted.

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { createStorFile } from '/_102027_/l2/libStor.js';
import { replaceTokensBlock } from '/_102027_/l2/designSystemBase.js';
import { IDesignSystemTokens, DsFont } from '/_102029_/l2/designSystemBase.js';
import { DsTokens } from '/_102020_/l2/dsMatch/buildGlobalCss.js';
import type { DsTokenReconciliation } from '/_102020_/l2/dsMatch/mlTokenVocab.js';

/** Canonical file reference of the generated tokens module — ONE file per project. */
export const designSystemTsRef = (project: number): string => `_${project}_/l2/designSystem.ts`;

// Color role → token name (most roles map 1:1; `background` shortens to `bg`).
const COLOR_TOKEN_ALIAS: Record<string, string> = { background: 'bg' };
const colorTokenName = (role: string) => `ds-${COLOR_TOKEN_ALIAS[role] ?? role}`;

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

/** CSS family value with fallback (family quoted when it contains spaces). */
function fontFamilyValue(family: string, fallback?: string): string {
    const fam = /\s/.test(family) ? `'${family}'` : family;
    return fallback ? `${fam}, ${fallback}` : fam;
}

/** Convert one Aura DS (project.json shape) into one classic theme entry. */
export function dsTokensToTheme(name: string, description: string, tokens: DsTokens, recon?: DsTokenReconciliation): IDesignSystemTokens {

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

    // Reconciled molecule tokens (--ml-* → var(--ds-*)); pinned overrides win, null = keep default.
    const mlMap: Record<string, string | null> = recon ? { ...(recon.map ?? {}), ...(recon.pinned ?? {}) } : {};
    for (const [k, v] of Object.entries(mlMap)) {
        if (typeof v !== 'string' || !v.trim()) continue;
        global[k.replace(/^--/, '')] = v;
    }

    const theme: IDesignSystemTokens = { themeName: name, description, color, typography, global };
    if (fonts.length) theme.fonts = fonts;
    return theme;
}

function renderThemes(themes: IDesignSystemTokens[]): string {
    return themes.map(t => JSON.stringify(t, null, 4)).join(',\n\n');
}

/** Full source of the generated designSystem.ts (also used as the initial file of new Aura projects, with an empty themes list). */
export function renderDesignSystemSource(project: number, themes: IDesignSystemTokens[]): string {
    return `/// <mls fileReference="_${project}_/l2/designSystem.ts" enhancement="_blank" />

// AUTO-GENERATED from l5/project.json (designSystems[*].tokens) by dsMatch/buildDesignSystemTs.
// Do not edit by hand — edit via the Design System plugin; this file is regenerated on save.

import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

export const tokens: IDesignSystemTokens[] = [
${renderThemes(themes)}
];
`;
}

/**
 * Regenerate the project's `designSystem.ts` from project.json. The file carries ALL design
 * systems (one theme entry each), so any DS change regenerates the whole tokens block.
 * Idempotent; does nothing when no DS has styling tokens.
 */
export async function buildDesignSystemTs(project: number): Promise<void> {

    const config: any = await getConfigProject(project);
    const designSystems = (config?.designSystems && typeof config.designSystems === 'object')
        ? config.designSystems
        : {};

    const themes: IDesignSystemTokens[] = [];
    for (const k of Object.keys(designSystems)) {
        const ds = designSystems[k];
        if (!ds?.tokens || typeof ds.tokens !== 'object') continue; // DS without styling tokens (e.g. default) → omitted
        themes.push(dsTokensToTheme(ds.name || String(k), ds.description || '', ds.tokens, ds.tokenReconciliation));
    }
    if (!themes.length) return;

    const key = mls.stor.getKeyToFiles(project, 2, 'designSystem', '', '.ts');
    const storFile = mls.stor.files[key];

    if (!storFile) {
        await createStorFile({
            project, shortName: 'designSystem', folder: '', level: 2,
            extension: '.ts', source: renderDesignSystemSource(project, themes), status: 'new',
        }, true, true, false);
        return;
    }

    // Existing file (possibly open in the editor): go through the editor pipeline so
    // undo/compile stay consistent — same path as _102027_ designSystemBase.serializeTokens.
    const libCommon = await import('/_102027_/l2/libCommom.js');
    await libCommon.forceServiceInstance(2, '_100554_serviceSource');
    const serviceSource = mls.services['100554_serviceSource_left'];
    if (!serviceSource) throw new Error('[buildDesignSystemTs] Service source is not instancied');

    const libModel = await import('/_102027_/l2/libModel.js');
    const models = await libModel.createAllModels(storFile);
    if (!models || !models.ts) throw new Error(`[buildDesignSystemTs] Invalid models for file: ${project}_designSystem`);

    const oldCode = models.ts.model.getValue();
    const hasBlock = /export\s+const\s+tokens\s*:\s*IDesignSystemTokens\[\]\s*=\s*\[/.test(oldCode);
    const newCode = hasBlock
        ? replaceTokensBlock(oldCode, `\n${renderThemes(themes)}\n`)
        : renderDesignSystemSource(project, themes);
    if (newCode === oldCode) return;

    serviceSource.setValueInModeKeepingUndo(models.ts.model, newCode, true);
}
