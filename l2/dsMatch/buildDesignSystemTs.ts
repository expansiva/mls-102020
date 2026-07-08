/// <mls fileReference="_102020_/l2/dsMatch/buildDesignSystemTs.ts" enhancement="_blank" />

// Tokens-module library — unified model, NO conversion.
//
// `_<project>_/l2/designSystem.ts` is the SINGLE home of the design systems: identity
// (themeName/description), the styling tokens (color/typography/global maps, dark via the
// `_dark-` key prefix) and the font-loading declarations (`fonts`). Each entry carries a
// `dsIndex` that correlates it with the GENERATION config bucket `designSystems[dsIndex]`
// in l5/project.json (skill/rules/overrides/tokenReconciliation) and with the
// `page<layout><ds>` variation folders. Entries without `dsIndex` (older files) resolve
// to their array position + 1.
//
// The Design System plugin edits the entries directly (token names are free-form — the
// file IS the model); the reconciliation agent writes the entry's `tokenReconciliation`
// (--ml-* → --ds-* map); the runtime (`_102029_/l2/designSystemBase.getTokensCss`) renders
// the selected entry as CSS, applying the reconciliation map at :root.

import { createStorFile } from '/_102027_/l2/libStor.js';
import { replaceTokensBlock, getTokens } from '/_102027_/l2/designSystemBase.js';
import { IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

/** Canonical file reference of the tokens module — ONE file per project. */
export const designSystemTsRef = (project: number): string => `_${project}_/l2/designSystem.ts`;

/** Effective dsIndex of an entry (explicit field, or array position + 1 for older files). */
export const themeDsIndex = (theme: IDesignSystemTokens, position: number): string =>
    theme.dsIndex ?? String(position + 1);

/** The project's theme entries, from the compiled designSystem.js (empty when absent). */
export async function readThemes(project: number): Promise<IDesignSystemTokens[]> {
    try {
        const themes = await getTokens(project);
        return Array.isArray(themes) ? themes : [];
    } catch {
        return [];
    }
}

/** One entry by its dsIndex (the key used by page folders and the generation config). */
export async function themeByIndex(project: number, ds: number | string): Promise<IDesignSystemTokens | null> {
    const themes = await readThemes(project);
    const key = String(ds);
    const idx = themes.findIndex((t, i) => themeDsIndex(t, i) === key);
    return idx >= 0 ? themes[idx] : null;
}

/** dsIndex → themeName for every entry (knob labels, folder→name resolution). */
export async function dsIndexNameMap(project: number): Promise<Record<string, string>> {
    const themes = await readThemes(project);
    const map: Record<string, string> = {};
    themes.forEach((t, i) => { map[themeDsIndex(t, i)] = t.themeName; });
    return map;
}

/**
 * Replace/insert ONE theme entry in the project's designSystem.ts, matched by dsIndex.
 * The entry is written exactly as given — the caller owns the whole entry (the plugin
 * form shows every token, including ml-*).
 */
export async function writeTheme(project: number, theme: IDesignSystemTokens): Promise<void> {
    const themes = await readThemes(project);
    const key = themeDsIndex(theme, themes.length);
    const idx = themes.findIndex((t, i) => themeDsIndex(t, i) === key);
    // stamp the effective dsIndex so the entry stays addressable after reordering
    const entry: IDesignSystemTokens = { ...theme, dsIndex: key };
    if (idx >= 0) themes[idx] = entry;
    else themes.push(entry);
    await writeThemes(project, themes);
}

function renderThemes(themes: IDesignSystemTokens[]): string {
    return themes.map(t => JSON.stringify(t, null, 4)).join(',\n\n');
}

/** Self-heal: keep only the FIRST `/// <mls …>` file-reference line, drop any duplicates.
 *  A duplicated header (once introduced) is otherwise carried forward by every block rewrite. */
function dedupeHeader(code: string): string {
    let seen = false;
    return code.split('\n').filter(line => {
        if (/^\s*\/\/\/\s*<mls\s/.test(line)) {
            if (seen) return false;
            seen = true;
        }
        return true;
    }).join('\n');
}

/** Full source of the designSystem.ts (also the initial file of new Aura projects). */
export function renderDesignSystemSource(project: number, themes: IDesignSystemTokens[]): string {
    return `/// <mls fileReference="_${project}_/l2/designSystem.ts" enhancement="_blank" />

// Design systems of this project — identity + styling tokens, one entry per DS
// (dark values use the \`_dark-\` key prefix; \`fonts\` declares font loading).
// Editable via the Design System plugin; generation config lives in l5/project.json.

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
    
    const libModel = await import('/_102027_/l2/libModel.js');
    const models = await libModel.createAllModels(storFile);
    if (!models || !models.ts) throw new Error(`[writeThemes] Invalid models for file: ${project}_designSystem`);

    const oldCode = models.ts.model.getValue();
    const hasBlock = /export\s+const\s+tokens\s*:\s*IDesignSystemTokens\[\]\s*=\s*\[/.test(oldCode);
    const newCode = dedupeHeader(hasBlock
        ? replaceTokensBlock(oldCode, `\n${renderThemes(themes)}\n`)
        : renderDesignSystemSource(project, themes));
    if (newCode === oldCode) return;
    models.ts.model.setValue(newCode);
}
