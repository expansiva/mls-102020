/// <mls fileReference="_102020_/l2/moduleLanguages.ts" enhancement="_blank" />

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
    const end = content.lastIndexOf(' as const;');
    if (!exportMatch || start === -1 || end === -1 || end <= start) return null;
    try {
        const parsed = JSON.parse(content.slice(start + 2, end));
        return isRecord(parsed) ? { exportName: exportMatch[1], data: parsed } : null;
    } catch { return null; }
}

function moduleDefsFileInfo(project: number, moduleName: string): FileInfo {
    return { project, level: 4, folder: moduleName, shortName: 'module', extension: '.defs.ts' };
}

export async function readModuleLanguages(project: number, moduleName: string): Promise<string[]> {
    try {
        const file = mls.stor.files[mls.stor.getKeyToFile(moduleDefsFileInfo(project, moduleName) as mls.stor.IFileInfo)];
        if (file) {
            const parsed = parseDefsSource(String(await file.getContent()));
            const moduleData = parsed && isRecord(parsed.data.module) ? parsed.data.module : parsed?.data;
            const languages = moduleData && Array.isArray(moduleData.languages)
                ? moduleData.languages.filter((l): l is string => typeof l === 'string' && !!l.trim())
                : [];
            if (languages.length > 0) return [...languages];
        }
    } catch { /* fall through to legacy fallback */ }

    // Legacy module (no `languages` field): fall back to project.json config.languages.
    try {
        const config = await getConfigProject(project);
        const legacy: string[] = ((config as any)?.languages ?? [])
            .map((i: any) => i?.language)
            .filter((l: any): l is string => typeof l === 'string' && !!l.trim());
        if (legacy.length > 0) return legacy;
    } catch { /* ignore */ }

    return ['en'];
}

export async function writeModuleLanguages(project: number, moduleName: string, languages: string[]): Promise<void> {
    const fileInfo = moduleDefsFileInfo(project, moduleName);
    const key = mls.stor.getKeyToFile(fileInfo as mls.stor.IFileInfo);
    const storFile = mls.stor.files[key];
    if (!storFile) throw new Error(`[writeModuleLanguages] module.defs.ts not found for module '${moduleName}' (project ${project})`);

    const parsed = parseDefsSource(String(await storFile.getContent()));
    if (!parsed) throw new Error(`[writeModuleLanguages] invalid module.defs.ts source for module '${moduleName}' (project ${project})`);

    const moduleData = isRecord(parsed.data.module) ? parsed.data.module : {};
    parsed.data.module = { ...moduleData, languages: [...languages] };

    // Re-serialize the whole file (same pattern as cfeCreateShared.saveConstDefault):
    // the body is pure JSON inside the export, safe to re-emit.
    const header = `/// <mls fileReference="_${project}_/l4/${moduleName}/module.defs.ts" enhancement="_blank"/>\n\n`;
    const source = `${header}export const ${parsed.exportName} = ${JSON.stringify(parsed.data, null, 2)} as const;\n\nexport default ${parsed.exportName};\n`;

    // l4 defs is not an editor file — write through localStor.setContent, not getOrCreateModel.
    if (storFile.status !== 'renamed' && storFile.status !== 'new') storFile.status = 'changed';
    storFile.updatedAt = new Date().toISOString();
    await mls.stor.localStor.setContent(storFile, { contentType: 'string', content: source });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
