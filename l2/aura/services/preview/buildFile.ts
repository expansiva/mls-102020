/// <mls fileReference="_102020_/l2/aura/services/preview/buildFile.ts" enhancement="_blank"/>

import { getTokensCss, getGlobalCss } from '/_102027_/l2/designSystemBase.js';
import { getPath } from '/_102027_/l2/utils';
import { convertFileToTag, resolveTagToFile } from '/_102020_/l2/utils';
import { themeByIndex } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';


export interface IJSONDependence {
    file: string,
    wcComponents: string[],
    importsMap: string[],
    importsJs: string[],
    importsLinks: { ref: string, rel: string }[],
    tokens: string | undefined,
    globalCss: string,
    errors: { tag: string, error: string }[]
}


export function getDependenciesByHtml(file: mls.stor.IFileInfo, html: string, theme: string, withCss: boolean = false): Promise<IJSONDependence> {
    return new Promise<IJSONDependence>(async (resolve, reject) => {
        try {
            const ret = await getDependencies(file, 'byHtml', html, theme, withCss);
            resolve(ret)
        } catch (e) {
            reject(e);
        }
    });
}

async function getDependencies(storFile: mls.stor.IFileInfo, fileName: string, html: string, theme: string, withCss: boolean = false) {

    const { project, shortName, folder } = storFile;
    let wcComponents = extractTagsCustom(html);

    const tag = convertFileToTag({ project, shortName, folder });
    if (!wcComponents.includes(tag)) wcComponents.push(tag);

    const importsMap: string[] = [];
    const importsJs: string[] = [];
    const importsLinks: { ref: string, rel: string }[] = [];
    const errors: { tag: string, error: string }[] = [];
    const modules = {};

    await getCompileInfo(
        wcComponents,
        importsMap,
        importsJs,
        importsLinks,
        errors,
        modules,
    );

    const previewEditorL3Import = '/_102020_/l2/aura/services/preview/previewEditorL3.js';
    if (!importsJs.includes(previewEditorL3Import)) {
        importsJs.push(previewEditorL3Import);
    }

    // A page variation folder encodes its DS as `page<layout><ds>`; the generated
    // designSystem.ts keys that DS's tokens entry by the DS NAME (themeName). Pages
    // without a DS entry (e.g. default DS) fall back to the editor's active theme.
    const pageDs = pageDsFromFolder(folder);
    const dsTheme = pageDs ? await dsNameFromIndex(project, pageDs) : null;
    let tokens: string | undefined = dsTheme ? await getTokensCss(project, dsTheme) : '';
    if (!tokens) tokens = await getTokensCss(project, theme);
    let globalCss: string | undefined = await getGlobalCss(project, theme);

    return {
        file: fileName,
        wcComponents,
        importsMap: Array.from(new Set(importsMap)),
        importsJs: Array.from(new Set(importsJs)),
        importsLinks: Array.from(new Set(importsLinks)),
        globalCss,
        tokens,
        errors
    }

}

/**
 * The theme (DS name) a file's tokens should use, derived from its folder: page variation
 * folders encode the DS index (`page<layout><ds>`), which matches the `dsIndex` of an entry
 * in designSystem.ts. Null when the folder is not a page variation or the DS has no entry
 * (caller falls back to the editor's active theme).
 */
export async function dsThemeForFolder(project: number, folder: string): Promise<string | null> {
    const pageDs = pageDsFromFolder(folder);
    return pageDs ? dsNameFromIndex(project, pageDs) : null;
}

/** DS index → DS name (the `themeName` of its entry in designSystem.ts, matched by dsIndex). */
async function dsNameFromIndex(project: number, ds: string): Promise<string | null> {
    try {
        const theme = await themeByIndex(project, ds);
        return theme?.themeName ?? null;
    } catch {
        return null;
    }
}


/**
 * The DS index of a page variation, parsed from a `page<layout><ds>` folder segment
 * (layout is a single digit, ds is the rest — same convention as derivePaths/genome).
 * Returns null when the folder is not a page variation.
 */
function pageDsFromFolder(folder: string): string | null {
    const m = (folder || '').match(/(?:^|\/)page(\d)(\d+)(?=\/|$)/);
    return m ? m[2] : null;
}

function extractTagsCustom(html: string): string[] {

    const container = document.createElement('div');
    container.innerHTML = html;

    const customTags: Set<string> = new Set();
    const tagsException: Set<string> = new Set([]);

    const allElements = container.querySelectorAll('*');

    allElements.forEach(element => {
        const tagName = element.tagName.toLowerCase();
        const isCustomTag = tagName.includes('-');
        const isInCodeBlock = element.closest('code') !== null;
        if (
            isCustomTag &&
            !tagsException.has(tagName) &&
            !isInCodeBlock
        ) {
            customTags.add(tagName);
        }
    });

    return Array.from(customTags);
}

async function getCompileInfo(
    tags: string[],
    myImportsMap: string[],
    myImports: string[],
    myLinks: { ref: string; rel: string }[],
    myErrors: { tag: string; error: string }[],
    myModules: Record<string, { jsMap: boolean; mModule: any }>,
): Promise<void> {

    for (const tag of tags) {
        try {

            const info = resolveTagToFile(tag);
            if (!info?.project || !info?.shortName) continue;

            const { project, shortName, folder } = info;
            const lv = mls.actualLevel === 1 ? 1 : 2;
            const key = mls.stor.getKeyToFiles(project, lv, shortName, folder, '.ts');
            const file = mls.stor.files[key];

            const ipath: mls.stor.IFileInfoBase = {
                project,
                shortName,
                folder: file?.folder ?? folder,
            } as mls.stor.IFileInfoBase;

            const enhancementName = await getEnhancementFromFetch(ipath);
            if (!enhancementName) throw new Error('enhancementName not valid');

            if (enhancementName === '_blank') {
                await getJSBlank(myImports, ipath);
                continue;
            }

            if (!myModules[enhancementName]) {
                const pathInfo = getPath(enhancementName);
                if (!pathInfo) throw new Error(`[] Not found path: ${enhancementName}`);

                myModules[enhancementName] = {
                    jsMap: false,
                    mModule: await mls.l2.enhancement.getEnhancementModule(pathInfo),
                };
            }

            await getJSImporMap(myImportsMap, enhancementName, myModules);
            await getJSImportEnhancement(myImports, enhancementName, myModules);
            await getJS(myImports, enhancementName, ipath, myModules);
            await getLinks(myLinks, enhancementName, myModules);

        } catch (e: any) {
            myErrors.push({ tag, error: e.message });
        }
    }
}

async function getEnhancementFromFetch(file: { project: number, shortName: string, folder: string }) {

    const url = getImportUrl(file as mls.stor.IFileInfoBase);
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const txt = await response.text();
    const lines = txt.replace(/\r\n/g, '\n').split('\n');
    const mlsLine = lines.find(line => line.trim().startsWith('/// <mls '));;

    if (!mlsLine) {
        throw new Error(`Not found tag 'mls' in ${url}`);
    }

    const enhancementMatch = mlsLine.match(/enhancement="([^"]+)"/);
    if (!enhancementMatch) {
        throw new Error('Not found attr "enhancement" in ' + url);
    }

    return enhancementMatch[1];

}

function getImportUrl(info: mls.stor.IFileInfoBase): string {
    let url = `/_${info.project}_/l2/${info.shortName}`;
    if (info.folder) {
        url = `/_${info.project}_/l2/${info.folder}/${info.shortName}`
    }
    return url;
}

async function getJSImportEnhancement(myImports: string[], enhacementName: string, myModules: any) {

    if (!myModules[enhacementName]) throw new Error('Enhacement not found ');
    const mmodule = myModules[enhacementName].mModule as mls.l2.enhancement.IEnhancementInstance;

    if (!mmodule || !mmodule.requires) return;
    const aRequire = mmodule.requires;

    aRequire.forEach((i) => {
        if (i.type !== 'import') return;
        myImports.push(i.ref);
    });

}
async function getJSImporMap(myImportsMap: string[], enhacementName: string, myModules: any) {

    if (!myModules[enhacementName]) throw new Error('Enhacement not found ');

    if (myModules[enhacementName].jsMap) return;
    myModules[enhacementName].jsMap = true;
    const mmodule = myModules[enhacementName].mModule as mls.l2.enhancement.IEnhancementInstance;

    if (!mmodule || !mmodule.requires) return;
    const aRequire = mmodule.requires;

    aRequire.forEach((i) => {
        if (i.type !== 'cdn') return;
        myImportsMap.push(`"${i.name}": "${i.ref}"`);
    });

}

async function getJSBlank(myImports: string[], mfile: mls.stor.IFileInfoBase) {
    let key = getImportUrl(mfile);
    if (myImports.includes(key)) return;
    myImports.push(key);
}

async function getJS(myImports: string[], enhacementName: string, mfile: mls.stor.IFileInfoBase, myModules: any) {
    if (!myModules[enhacementName]) throw new Error('Enhacement not found ');
    let key = getImportUrl(mfile);
    if (myImports.includes(key)) return;
    myImports.push(key);
}

async function getLinks(myLinks: { ref: string, rel: string }[], enhacementName: string, myModules: any) {
    if (!myModules[enhacementName]) throw new Error('Enhacement not found ');

    const mmodule = myModules[enhacementName].mModule as mls.l2.enhancement.IEnhancementInstance;
    if (!mmodule || !mmodule.requires) return;
    const aRequire = mmodule.requires;

    aRequire.forEach((i: any) => {
        if (i.type !== 'link') return;
        myLinks.push({ rel: i.args, ref: i.ref });
    });
}