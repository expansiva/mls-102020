/// <mls fileReference="_102020_/l2/aura/helpers/draftModuleDiscard.ts" enhancement="_blank" />
// Public "discard this module" for screens outside the draft panel.
// The panel keeps the confirm and the translated messages; this function does the work.

import { undoFile } from '/_102027_/l2/libStor.js';
import { saveL5File } from '/_102033_/l2/cbe/l5Save.js';
import { loadProjectDefinitions } from '/_102033_/l2/cbe/initStudio.js';
import { activeDraft } from '/_102033_/l2/cbe/studioDraft.js';
import { draftPublishedCommit, requestDraftDiff } from '/_102033_/l2/cbe/studioDraftFiles.js';
import { discardModule, type FetchImpl } from '/_102020_/l2/aura/helpers/draftPanelCore.js';

const NO_ACTIVE_DRAFT = 'draft.no_active_draft';
const CONFIG_MISSING = 'draft.config_missing';

const fetchImpl: FetchImpl = (input, init) => fetch(input, init);

function configFile(project: number): mls.stor.IFileInfo {
    const key = mls.stor.getKeyToFile({ project, level: 5, shortName: 'config', folder: '', extension: '.json' });
    const file = mls.stor.files[key];
    if (!file) {
        console.error('[draftModuleDiscard] l5/config.json is not in stor:', key);
        throw new Error(CONFIG_MISSING);
    }
    return file;
}

async function readCurrentConfig(project: number): Promise<string> {
    const file = configFile(project);
    const content = await file.getContent();
    if (typeof content !== 'string') {
        console.error('[draftModuleDiscard] l5/config.json content is not text');
        throw new Error(CONFIG_MISSING);
    }
    return content;
}

/**
 * The published commit (`main`) as a sha. `getHistoryContent` takes only a hex commit: any other
 * `ref` (a branch name) comes back as null content. `draftDiff` already hands it back as `main`.
 */
async function publishedCommit(project: number, slug: string): Promise<string> {
    const known = draftPublishedCommit();
    if (known) return known;
    try {
        const diff = await requestDraftDiff(project, slug);
        const main = diff.main ?? draftPublishedCommit();
        if (main) return main;
    } catch (err) {
        console.error('[draftModuleDiscard] draftDiff failed while looking for the published commit:', err);
        throw new Error(CONFIG_MISSING);
    }
    console.error('[draftModuleDiscard] draftDiff has no published commit');
    throw new Error(CONFIG_MISSING);
}

async function readPublishedConfig(project: number, slug: string): Promise<string> {
    const file = configFile(project);
    const ref = await publishedCommit(project, slug);
    let driver: unknown;
    try {
        driver = await mls.stor.others.getDefaultDriver(project);
    } catch (err) {
        console.error('[draftModuleDiscard] getDefaultDriver failed while reading published config:', err);
        throw new Error(CONFIG_MISSING);
    }
    const read = (driver as { getHistoryContent?: (file: mls.stor.IFileInfo, ref: string) => Promise<string | null> }).getHistoryContent;
    if (typeof read !== 'function') {
        console.error('[draftModuleDiscard] getHistoryContent is missing');
        throw new Error(CONFIG_MISSING);
    }
    let content: string | null;
    try {
        content = await read.call(driver, file, ref);
    } catch (err) {
        console.error('[draftModuleDiscard] published l5/config.json failed:', err);
        throw new Error(CONFIG_MISSING);
    }
    if (typeof content !== 'string') {
        console.error('[draftModuleDiscard] published l5/config.json is not text');
        throw new Error(CONFIG_MISSING);
    }
    return content;
}

/**
 * Restores one module on the active draft: the four directories, that module's block
 * in `l5/config.json`, and the local copies. Throws `draft.*` for the caller to show.
 */
export async function discardModuleInStudio(
    project: number,
    moduleName: string,
    draftFiles: readonly string[] = [],
): Promise<void> {
    const slug = activeDraft();
    if (!slug) {
        console.error(`[draftModuleDiscard] no active draft for project ${project}`);
        throw new Error(NO_ACTIVE_DRAFT);
    }
    const current = await readCurrentConfig(project);
    const published = await readPublishedConfig(project, slug);
    await discardModule({
        fetchImpl,
        saveL5File: (id, shortName, content, comment) => saveL5File(id, shortName, content, comment),
        undoFile: (file) => undoFile(file as mls.stor.IFileInfo),
        storFiles: mls.stor.files,
        reloadLive: () => loadProjectDefinitions(project),
    }, project, slug, moduleName, current, published, draftFiles);
}
