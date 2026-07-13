/// <mls fileReference="_102020_/l2/aura/helpers/auraState.ts" enhancement="_blank" />

import { getState, setState, initState } from '/_102029_/l2/collabState.js';

export interface IAuraPage {
    project: number;
    shortName: string;
    folder: string | null;
    level: number;
    extension: string;
}

export interface IAuraState {
    actualProject: number | null;
    actualModule: string | null;
    // Effective language of the actual module. Kept as the pub/sub key ('aura.actualLanguage')
    // and as migration seed for states saved before actualLanguageByModule existed.
    actualLanguage: string | null;
    // Language per module (moduleName → BCP-47 code) — the source of truth since languages
    // moved from project.json to l4/<module>/module.defs.ts.
    actualLanguageByModule: Record<string, string> | null;
    actualDevice: string | null;
    actualLayout: number | null;
    actualDesignSystem: number | null;
    actualPage: IAuraPage | null;
}

const STATE_KEY = 'aura';

function getActualProject(): number | null {
    return mls.actualProject || null;
}

function getActualModule(): string | null {
    return loadAuraProject(getActualProject())?.actualModule ?? null;
}

function getStoredLanguage(): string | null {
    return loadAuraProject(getActualProject())?.actualLanguage ?? null;
}

function getStoredLanguageByModule(): Record<string, string> | null {
    return loadAuraProject(getActualProject())?.actualLanguageByModule ?? null;
}

function getActualDevice(): string | null {
    return loadAuraProject(getActualProject())?.actualDevice ?? null;
}

function getActualLayout(): number | null {
    return loadAuraProject(getActualProject())?.actualLayout ?? null;
}

function getActualDesignSystem(): number | null {
    return loadAuraProject(getActualProject())?.actualDesignSystem ?? null;
}

function getActualPage(): IAuraPage | null {
    return loadAuraProject(getActualProject())?.actualPage ?? null;
}

export function AuraInitState(): void {
    if (getAuraState()) return;
    initState(STATE_KEY, {
        actualProject: getActualProject(),
        actualModule: getActualModule(),
        actualLanguage: getStoredLanguage(),
        actualLanguageByModule: getStoredLanguageByModule(),
        actualDevice: getActualDevice(),
        actualLayout: getActualLayout(),
        actualDesignSystem: getActualDesignSystem(),
        actualPage: getActualPage(),
    } satisfies IAuraState);
}

export function getAuraState(): IAuraState {
    return getState(STATE_KEY) as IAuraState;
}

export function setAuraState<K extends keyof IAuraState>(key: K, value: IAuraState[K]): void {
    setState(`${STATE_KEY}.${key}`, value);
    // Switching module changes the EFFECTIVE language — re-emit 'aura.actualLanguage' so
    // existing subscribers (e.g. servicePreview) keep working without a new key.
    if (key === 'actualModule') {
        const effective = getActualLanguage(value as string | null);
        if (effective) setState(`${STATE_KEY}.actualLanguage`, effective);
    }
}

/**
 * Language of a module (or of the actual module when omitted).
 * Falls back to the legacy single `actualLanguage` when the module has no entry yet
 * (migration seed of states saved before actualLanguageByModule existed).
 * No module resolvable → null (consumer falls back to the 1st language of module.defs).
 */
export function getActualLanguage(module?: string | null): string | null {
    const state = getAuraState();
    if (!state) return null;
    const target = module ?? state.actualModule;
    if (!target) return null;
    return state.actualLanguageByModule?.[target] ?? state.actualLanguage ?? null;
}

export function setActualLanguage(module: string, language: string | null): void {
    const state = getAuraState();
    const byModule = { ...(state?.actualLanguageByModule ?? {}) };
    if (language) byModule[module] = language;
    else delete byModule[module];
    setAuraState('actualLanguageByModule', byModule);
    if (!state?.actualModule || state.actualModule === module) {
        setAuraState('actualLanguage', language);
    }
}

// ─── localStorage ─────────────────────────────────────────────────────

const LS_KEY = 'AuraProjects';

type IAuraProjectEntry = Omit<IAuraState, 'actualProject'>;
type AuraProjectsStore = Record<number, IAuraProjectEntry>;

function readStore(): AuraProjectsStore {
    try {
        return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}');
    } catch {
        return {};
    }
}

function writeStore(store: AuraProjectsStore): void {
    localStorage.setItem(LS_KEY, JSON.stringify(store));
}

export function saveAuraProject(): void {
    const state = getAuraState();
    const project = state.actualProject;
    if (!project) return;
    const store = readStore();
    store[project] = {
        actualModule: state.actualModule,
        actualLanguage: state.actualLanguage,
        actualLanguageByModule: state.actualLanguageByModule,
        actualDevice: state.actualDevice,
        actualLayout: state.actualLayout,
        actualDesignSystem: state.actualDesignSystem,
        actualPage: state.actualPage,
    };
    writeStore(store);
}

export function deleteAuraProject(project: number): void {
    const store = readStore();
    if (!store[project]) return;
    delete store[project];
    writeStore(store);
}

export function loadAuraProject(project: number | null): IAuraProjectEntry | null {
    if (!project) return null;
    const store = readStore();
    return store[project] ?? null;
}

export function restoreAuraProject(project: number): void {
    const entry = loadAuraProject(project);
    if (!entry) return;
    setAuraState('actualProject', project);
    // Entries saved before actualLanguageByModule existed lack the key — reset it
    // explicitly so the previous project's per-module map never leaks across projects.
    if (!('actualLanguageByModule' in entry)) setAuraState('actualLanguageByModule', null);
    (Object.keys(entry) as (keyof IAuraProjectEntry)[]).forEach(key => {
        setAuraState(key, entry[key]);
    });
}
