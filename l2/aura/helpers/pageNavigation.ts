/// <mls fileReference="_102020_/l2/aura/helpers/pageNavigation.ts" enhancement="_blank" />
// Takes the RUNNING APP to the screen of a page file.
//
// Lived inside serviceGenome (`_routeOfPage` + `_navigateApp`) while the genome was the only one
// doing it. The serviceSource "Abrir página" action needs the same two steps, and a copy would be a
// second reading of `l5/config.json` drifting away from the first — so both call this.
//
// The matching itself (which `frontend.pages[]` entry is this file, and what of the route travels)
// stays in pageRoutes.ts, pure and tested. This file is the part that touches the stor and the shell.

import { routeForSource, sourceOfPageFile } from '/_102020_/l2/aura/helpers/pageRoutes.js';

/** The page file as the editors know it — `mls.actual[2][position]` and an IFileInfo both fit. */
export interface IPageFile {
    project?: number;
    folder?: string;
    shortName?: string;
}

interface ICachedConfig {
    file: mls.stor.IFileInfo;
    versionRef: string;
    config: unknown;
}

// Parsed `l5/config.json` per project. The serviceSource asks on every file it opens; rereading and
// reparsing the config each time is wasted work while the file did not change. A config being edited
// (`inLocalStorage`) is never cached: its versionRef does not move while the content does.
const configCache = new Map<number, ICachedConfig>();

async function readConfig(project: number): Promise<unknown> {
    const key = mls.stor.getKeyToFiles(project, 5, 'config', '', '.json');
    const configFile = mls.stor.files[key];
    if (!configFile) return undefined;

    const cached = configCache.get(project);
    if (cached && cached.file === configFile && cached.versionRef === configFile.versionRef && !configFile.inLocalStorage) {
        return cached.config;
    }

    let config: unknown;
    try {
        config = JSON.parse(String(await configFile.getContent()));
    } catch (error) {
        console.warn('[pageNavigation] l5/config.json did not parse', error);
        return undefined;
    }
    configCache.set(project, { file: configFile, versionRef: configFile.versionRef, config });
    return config;
}

/**
 * The route of a page file, or '' when it is not a page.
 *
 * "Is a page" and "has a route in the config" are the same condition: the route is declared per page
 * under `projects[<id>].modules[].frontend.pages[]`, matched by the exact `source`.
 *
 * @param fallbackProject used when the file carries no project
 */
export async function routeOfPageFile(file: IPageFile, fallbackProject?: number): Promise<string> {
    const project = file.project || fallbackProject;
    if (!project || !file.shortName) return '';
    const config = await readConfig(project);
    if (!config) return '';
    return routeForSource(config, project, sourceOfPageFile(file));
}

/**
 * Navigates the app to the page file. Returns false when the file has no route (nothing happens).
 *
 * The navigation is the SAME call the apps menu makes (`openProgramUnified`, mls-102033): pushState +
 * popstate for a page of the current app, a nav3 tab for anything else. Copying that logic here would
 * be a second implementation of the shell's own routing, and the two would drift.
 */
export async function navigateAppToPage(file: IPageFile, fallbackProject?: number): Promise<boolean> {
    const route = await routeOfPageFile(file, fallbackProject);
    if (!route) {
        console.info(`[pageNavigation] no route declared for ${file.folder}/${file.shortName}: the app stays where it is`);
        return false;
    }
    try {
        const { openProgramUnified } = await import('/_102033_/l2/cbe/runtimeMessagesEnvironment.js');
        await openProgramUnified({ url: route, pageName: file.shortName });
    } catch (error) {
        console.warn('[pageNavigation] could not navigate the app', error);
    }
    return true;
}
