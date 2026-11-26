/// <mls fileReference="_102020_/l2/aura/plugins/helpers/assetsMediaCore.ts" enhancement="_blank"/>

// Pure rules of the L5 "Assets → Media" panel: where the project's media lives, which files are
// accepted and how an uploaded file name becomes a stor file name.
//
// Where: `l3/assets/...` of the project — media belongs to the project, not to a module, so every
// module app and the Design System share one logo / font / icon. The server serves it as
// `/_<project>_/l3/assets/<file>` from any app of the project.

export type MediaCategory = 'image' | 'icon' | 'video' | 'audio' | 'font' | 'document' | 'other';

export const ASSETS_LEVEL = 3;

/** Largest file the panel accepts. The stor keeps the bytes in IndexedDB and the VM publish sends them as base64. */
export const MAX_UPLOAD_BYTES = 64 * 1024 * 1024;

export const EXTENSION_MAP: Readonly<Record<string, MediaCategory>> = {
    '.png': 'image', '.jpg': 'image', '.jpeg': 'image', '.gif': 'image',
    '.webp': 'image', '.avif': 'image', '.bmp': 'image', '.tiff': 'image', '.tif': 'image',
    '.svg': 'icon', '.ico': 'icon',
    '.mp4': 'video', '.webm': 'video', '.mov': 'video', '.avi': 'video',
    '.mkv': 'video', '.wmv': 'video', '.m4v': 'video', '.flv': 'video',
    '.mp3': 'audio', '.wav': 'audio', '.ogg': 'audio', '.flac': 'audio',
    '.aac': 'audio', '.m4a': 'audio', '.opus': 'audio', '.wma': 'audio',
    '.woff': 'font', '.woff2': 'font', '.ttf': 'font', '.otf': 'font',
    '.pdf': 'document',
};

/** Value for `<input type="file" accept>`: the same list the panel validates against. */
export const ACCEPT_ATTR = Object.keys(EXTENSION_MAP).join(',');

export function categoryOf(extension: string): MediaCategory {
    return EXTENSION_MAP[extension.toLowerCase()] ?? 'other';
}

export function isMediaExtension(extension: string): boolean {
    return extension.toLowerCase() in EXTENSION_MAP;
}

/** Categories whose thumbnail is the file itself. */
export function hasImagePreview(category: MediaCategory): boolean {
    return category === 'image' || category === 'icon';
}

/** Stor folder of the project's media (level 3). */
export const ASSETS_FOLDER = 'assets';

export interface IAssetsLocation {
    project: number;
    level: number;
    folder: string;
}

export function assetsLocation(project: number): IAssetsLocation {
    return { project, level: ASSETS_LEVEL, folder: ASSETS_FOLDER };
}

/** URL the page and the Design System write: the same in the Studio and in the published app. */
export function assetUrl(project: number, folder: string, shortName: string, extension: string): string {
    return `/_${project}_/l${ASSETS_LEVEL}/${folder}/${shortName}${extension}`;
}

export interface IStorFileLike {
    project: number;
    level: number;
    folder: string;
    extension?: string;
    status?: string;
}

/** True when a stor file is a live media file of the project (subfolders of `assets` included). */
export function isProjectMediaFile(file: IStorFileLike, project: number): boolean {
    if (file.project !== project || file.level !== ASSETS_LEVEL) return false;
    if (file.status === 'deleted') return false;
    if (file.folder !== ASSETS_FOLDER && !file.folder.startsWith(`${ASSETS_FOLDER}/`)) return false;
    return isMediaExtension(file.extension ?? '');
}

/**
 * Upload file name → stor `shortName` + `extension`. The name ends up in a URL, so accents are
 * dropped, spaces become `-` and anything outside `[A-Za-z0-9_-]` goes. The extension is the last
 * dot, lowercased. Returns null when nothing usable is left.
 */
export function toStorName(fileName: string): { shortName: string; extension: string } | null {
    const dot = fileName.lastIndexOf('.');
    if (dot <= 0 || dot === fileName.length - 1) return null;
    const extension = fileName.slice(dot).toLowerCase();
    const shortName = fileName.slice(0, dot)
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^A-Za-z0-9_-]/g, '')
        .replace(/-{2,}/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!shortName) return null;
    return { shortName, extension };
}

export type UploadCheck =
    | { ok: true; shortName: string; extension: string; category: MediaCategory }
    | { ok: false; reason: 'name' | 'extension' | 'size' };

export function checkUpload(file: { name: string; size: number }): UploadCheck {
    const parsed = toStorName(file.name);
    if (!parsed) return { ok: false, reason: 'name' };
    if (!isMediaExtension(parsed.extension)) return { ok: false, reason: 'extension' };
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: 'size' };
    return { ok: true, ...parsed, category: categoryOf(parsed.extension) };
}

export function formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
