/// <mls fileReference="_102020_/l2/auraState.ts" enhancement="_blank" />

import { getState, setState, initState } from '/_102027_/l2/collabState.js';

export interface IAuraState {
    actualProject: number | null;
    actualModule: string | null;
    actualLanguage: string | null;
    actualDevice: string | null;
    actualLayout: number | null;
    actualDesignSystem: number | null;
}

const STATE_KEY = 'aura';

function getActualProject(): number | null {
    return mls.actualProject || null;
}

function getActualModule(): string | null {
    return loadAuraProject(getActualProject())?.actualModule ?? null;
}

function getActualLanguage(): string | null {
    return loadAuraProject(getActualProject())?.actualLanguage ?? null;
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

export function AuraInitState(): void {
    if (getAuraState()) return;
    initState(STATE_KEY, {
        actualProject: getActualProject(),
        actualModule: getActualModule(),
        actualLanguage: getActualLanguage(),
        actualDevice: getActualDevice(),
        actualLayout: getActualLayout(),
        actualDesignSystem: getActualDesignSystem(),
    } satisfies IAuraState);
}

export function getAuraState(): IAuraState {
    return getState(STATE_KEY) as IAuraState;
}

export function setAuraState<K extends keyof IAuraState>(key: K, value: IAuraState[K]): void {
    setState(`${STATE_KEY}.${key}`, value);
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
        actualDevice: state.actualDevice,
        actualLayout: state.actualLayout,
        actualDesignSystem: state.actualDesignSystem,
    };
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
    (Object.keys(entry) as (keyof IAuraProjectEntry)[]).forEach(key => {
        setAuraState(key, entry[key]);
    });
}
