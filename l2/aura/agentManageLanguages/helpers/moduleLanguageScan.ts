/// <mls fileReference="_102020_/l2/aura/agentManageLanguages/helpers/moduleLanguageScan.ts" enhancement="_blank"/>

/**
 * The IO side of addLanguageCore: reads a module's pages and its module.defs.ts from mls.stor and hands
 * them to the pure decisions. Shared by agentAddLanguage (what to queue) and the selectLanguage plugin
 * (the preview and the re-check after a run), so both follow the same rule.
 */

import {
    isPageCatalogueFileName, isPageCatalogueFolder, planModuleLanguages, repairI18nBlock,
    ModuleLanguagePlan, PageSource,
} from '/_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.js';
import { waitModelIdle } from '/_102027_/l2/libModel.js';
import { readConfigModuleLanguages, readModuleDefsLanguages } from '/_102020_/l2/aura/helpers/moduleLanguages.js';

/** Every page and organism of the module that may hold a catalogue, with its text. */
export async function readModulePageSources(project: number, moduleName: string): Promise<PageSource[]> {
    const pageFiles = Object.values(mls.stor.files).filter((f: mls.stor.IFileInfo) =>
        f.project === project &&
        isPageCatalogueFolder(f.folder, moduleName) &&
        isPageCatalogueFileName(f.shortName, f.extension)
    ) as mls.stor.IFileInfo[];

    const result: PageSource[] = [];
    for (const storFile of pageFiles) {
        const source = await readCurrentSource(storFile);
        if (!source) continue;
        result.push({ fileReference: mls.stor.convertFileToFileReference(storFile), source });
    }
    return result;
}

/**
 * The page as it is NOW. A translation is written through the editor model and `getContent` keeps the
 * previous text until the file is saved — read from it alone, every page just translated looks pending
 * again and a retry re-sends the whole module. So an already open model wins; otherwise `getContent`, never
 * `getOrCreateModel` (a model per file over ~100 files is a Monaco resource nobody releases).
 */
export async function readCurrentSource(storFile: mls.stor.IFileInfo): Promise<string> {
    try {
        const open = mls.editor.getModel(storFile);
        const value = open?.model?.getValue();
        if (typeof value === 'string' && value) return value;
    } catch { /* no editor model: fall back to the stored text */ }
    const content = await storFile.getContent('');
    return typeof content === 'string' ? content : '';
}

export async function scanModuleForLanguages(
    project: number,
    moduleName: string,
    requested: string[],
    force = false,
): Promise<ModuleLanguagePlan> {
    const defsLanguages = await readModuleDefsLanguages(project, moduleName);
    // No defs: ignored before reading ~100 pages.
    const pages = defsLanguages ? await readModulePageSources(project, moduleName) : [];
    const runtimeLanguages = defsLanguages ? await readConfigModuleLanguages(project, moduleName) : null;
    return planModuleLanguages({ moduleName, defsLanguages, requested, pages, force, runtimeLanguages });
}

/**
 * Repairs, in place, the pages whose written block is broken (`isBrokenBlock`: flattened, or a type used but
 * never declared). No model is involved: the translations are kept. Returns how many pages were fixed.
 * Writes like agentAddLanguage does (model + stor), so the Studio editor shows the fixed file.
 */
export async function repairBrokenPages(fileReferences: string[]): Promise<number> {
    let repaired = 0;
    for (const fileReference of fileReferences) {
        const fileInfo = mls.stor.convertFileReferenceToFile(fileReference);
        const files = await mls.stor.getFiles({ ...mls.stor.getPathToFile(fileReference), loadContent: false });
        if (!files.ts) continue;
        const current = await files.ts.getOrCreateModel();
        const fixed = repairI18nBlock(current.model.getValue());
        if (fixed === null) continue;

        // Same params as agentAddLanguage's updateStorFile; the text itself goes through the model below.
        const params = { ...fileInfo, content: fixed, versionRef: new Date().toISOString(), extension: '.ts' };
        const file = await mls.stor.addOrUpdateFile(params);
        if (!file) throw new Error(`[repairBrokenPages] could not write ${fileReference}`);
        const models = await file.getOrCreateModel();
        models.model.pushEditOperations([], [{ range: models.model.getFullModelRange(), text: fixed }], () => null);
        mls.editor.forceModelUpdate(models.model);
        await waitModelIdle(models);
        repaired += 1;
    }
    return repaired;
}
