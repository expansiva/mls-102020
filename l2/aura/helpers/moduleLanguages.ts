/// <mls fileReference="_102020_/l2/aura/helpers/moduleLanguages.ts" enhancement="_blank" />

import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';

// Canonical read/write of a module's languages (BCP-47 codes) in l4/<module>/module.defs.ts.
// The module is the single source of truth for Aura flows; project.json `config.languages`
// survives only as a legacy fallback (and for non-Aura flows like publish/dist).

type FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

export interface IParsedDefs {
    exportName: string;
    data: Record<string, unknown>;
}

// module.defs.ts is not importable as JS — the repo pattern is to read it from mls.stor
// and parse the `export const X = {...} as const` body as pure JSON.
export function parseDefsSource(content: string): IParsedDefs | null {
    const exportMatch = content.match(/export\s+const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/);
    const start = content.indexOf('= ');
    if (!exportMatch || start === -1) return null;
    // Two emission dialects: `} as const;` and `} as const satisfies <Artifact>;` (agentNewSolution,
    // which types every artifact). The type assertion is never part of the value. The first cut wins
    // for a file that appends a second export; the last is the fallback.
    const first = content.indexOf(' as const', start);
    const last = content.lastIndexOf(' as const');
    for (const end of first === last ? [first] : [first, last]) {
        if (end <= start) continue;
        try {
            const parsed = JSON.parse(content.slice(start + 2, end));
            if (isRecord(parsed)) return { exportName: exportMatch[1], data: parsed };
        } catch { /* try the other cut */ }
    }
    return null;
}

/**
 * Replace only the exported value, keeping everything the generator wrote around it: the header, the
 * `import type`, the `satisfies` and the trailing exports. An agent that only flips a status inside
 * a generated file must not rewrite the file's shape.
 */
export function replaceDefsValue(content: string, value: unknown): string | null {
    const start = content.indexOf('= ');
    if (start === -1) return null;
    const first = content.indexOf(' as const', start);
    const last = content.lastIndexOf(' as const');
    for (const end of first === last ? [first] : [first, last]) {
        if (end <= start) continue;
        try {
            JSON.parse(content.slice(start + 2, end));
        } catch { continue; }
        return `${content.slice(0, start + 2)}${JSON.stringify(value, null, 2)}${content.slice(end)}`;
    }
    return null;
}

function moduleDefsFileInfo(project: number, moduleName: string): FileInfo {
    return { project, level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' };
}

/** NS5 v2: `[defaultLanguage, ...productLanguages]` with no repeats. `null` when neither key is present. */
export function moduleLanguagesOf(source: string): string[] | null {
    const parsed = parseDefsSource(source);
    if (!parsed) return null;
    const { data } = parsed;
    const hasDefault = typeof data.defaultLanguage === 'string';
    const hasProduct = Array.isArray(data.productLanguages);
    if (!hasDefault && !hasProduct) return null;

    const out: string[] = [];
    const push = (value: unknown) => {
        if (typeof value !== 'string') return;
        const code = value.trim();
        if (code && !out.includes(code)) out.push(code);
    };
    if (hasDefault) push(data.defaultLanguage);
    if (hasProduct) for (const code of data.productLanguages as unknown[]) push(code);
    return out;
}

/**
 * Replace only `productLanguages`, keeping the rest of the file. NS5 requires `defaultLanguage`
 * to be one of `productLanguages`.
 */
export function withModuleLanguages(source: string, languages: string[]): string {
    const parsed = parseDefsSource(source);
    if (!parsed) throw new Error('[withModuleLanguages] invalid module.defs.ts source');

    const next = languages.map(l => (typeof l === 'string' ? l.trim() : '')).filter(Boolean);
    if (next.length === 0) throw new Error('[withModuleLanguages] productLanguages must not be empty');

    const defaultLanguage = typeof parsed.data.defaultLanguage === 'string' ? parsed.data.defaultLanguage.trim() : '';
    if (!defaultLanguage || !next.includes(defaultLanguage)) {
        throw new Error(`[withModuleLanguages] productLanguages must include defaultLanguage '${defaultLanguage || '(missing)'}'`);
    }

    const replaced = replaceDefsValue(source, { ...parsed.data, productLanguages: next });
    if (!replaced) throw new Error('[withModuleLanguages] could not replace productLanguages');
    return replaced;
}

export async function readModuleLanguages(project: number, moduleName: string): Promise<string[]> {
    let reason = `module.defs.ts for '${moduleName}' (project ${project}) has no productLanguages/defaultLanguage`;
    try {
        const file = mls.stor.files[mls.stor.getKeyToFile(moduleDefsFileInfo(project, moduleName) as mls.stor.IFileInfo)];
        if (!file) {
            reason = `module.defs.ts not found for module '${moduleName}' (project ${project})`;
        } else {
            const languages = moduleLanguagesOf(String(await file.getContent()));
            if (languages && languages.length > 0) return languages;
            if (languages === null) {
                reason = `module.defs.ts for '${moduleName}' (project ${project}) has neither productLanguages nor defaultLanguage`;
            }
        }
    } catch (e) {
        reason = `failed to read module.defs.ts for '${moduleName}' (project ${project}): ${e instanceof Error ? e.message : String(e)}`;
    }

    try {
        const config = await getConfigProject(project);
        const legacy: string[] = ((config as any)?.languages ?? [])
            .map((i: any) => i?.language)
            .filter((l: any): l is string => typeof l === 'string' && !!l.trim());
        if (legacy.length > 0) {
            console.warn(`[readModuleLanguages] ${reason}; falling back to project config.languages`);
            return legacy;
        }
    } catch { /* fall through to ['en'] */ }

    console.warn(`[readModuleLanguages] ${reason}; falling back to ['en']`);
    return ['en'];
}

export async function writeModuleLanguages(project: number, moduleName: string, languages: string[]): Promise<void> {
    const fileInfo = moduleDefsFileInfo(project, moduleName);
    const key = mls.stor.getKeyToFile(fileInfo as mls.stor.IFileInfo);
    const storFile = mls.stor.files[key];
    if (!storFile) throw new Error(`[writeModuleLanguages] module.defs.ts not found for module '${moduleName}' (project ${project})`);

    const source = withModuleLanguages(String(await storFile.getContent()), languages);

    // l4 defs is not an editor file — write through localStor.setContent, not getOrCreateModel.
    if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
    storFile.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
