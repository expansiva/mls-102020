/// <mls fileReference="_102020_/l2/aura/plugins/selectPage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getAuraEdit, getAuraState, type IAuraEditSelection } from '/_102020_/l2/aura/helpers/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentMaterializeL2/helpers/cfeMaterializeStudio.js';
import { pageDsCheckByDefs, restampPage, layoutHasRules, type PageDsCheck } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { setTask, getTask, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { readGenomeUxBaseChoice } from '/_102020_/l2/aura/agentGenomeUx/genomeUxIo.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Pages',
    desc: 'Pages of the selected module. Filtered by active device when one is selected.',
    allTitle: 'All Pages',
    allDesc: 'All pages found for the selected module and device.',
    customTitle: 'New Page',
    customDesc: 'Create a new page in this module.',
    noModule: 'No module selected.',
    noPages: 'No pages found for this module.',
    noResults: 'No pages match your search.',
    createNew: 'New Page',
    searchPlaceholder: 'Search pages…',
    inDevelopment: 'In development',
    devices: 'Devices',
    notCreated: 'Pages have not been created for this layout / design system combination.',
    generatePages: 'Generate pages',
    outdated: 'Outdated',
    review: 'Review',
    reviewIntro: 'Molecules used by this page changed since it was generated:',
    markReviewed: 'Mark as reviewed',
    saving: 'Saving…',
    staleIntro: 'The selection no longer reflects the design system:',
    staleReasonRules: "The page's rules changed.",
    staleReasonRemoved: 'A molecule it uses was removed.',
    staleReasonIncompatible: 'A molecule it uses is no longer compatible.',
    staleReasonNoStamp: 'The page predates DS versioning.',
    regeneratePage: 'Regenerate page',
    regenerating: 'Regenerating…',
    regenerated: 'Task started',
    followTask: 'Follow task',
    missingVariation: 'This page has not been generated for the current layout / design system yet.',
    generatePage: 'Generate page',
    notGenerated: 'Not generated',
    editPage: 'Change this page',
    editPlaceholder: 'Describe the change (e.g. center the buttons of the list)…',
    editReview: 'Review',
    editPlanning: 'Analyzing…',
    editPlanTitle: 'Confirm the change',
    editPlanApply: 'Apply',
    editPlanCancel: 'Cancel',
    editApplying: 'Applying…',
    editWhatChanged: 'What changed',
    editPageShell: 'page',
    editRevert: 'undo',
    editRecorded: 'Recorded: "Regenerate page" redoes this change. Save to keep it in the project.',
    editNotRecorded: 'Not recorded in this project: "Regenerate page" undoes this change. Save to keep it in the project.',
    editLiveNotApplied: 'The screen was not refreshed ({reason}): reload to see the change.',
    editNoAnswer: 'The agent ended without an answer (the task failed). Open the task to see why.',
    editElement: 'Element',
    editElementIn: 'in',
    editElementRemove: 'Do not send this element',
    editElementElsewhere: 'The selected element is not on this page and device: it will not be sent.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Páginas',
        desc: 'Páginas do módulo selecionado. Filtradas pelo device ativo quando um estiver selecionado.',
        allTitle: 'Todas as Páginas',
        allDesc: 'Todas as páginas encontradas para o módulo e device selecionados.',
        customTitle: 'Nova Página',
        customDesc: 'Crie uma nova página neste módulo.',
        noModule: 'Nenhum módulo selecionado.',
        noPages: 'Nenhuma página encontrada para este módulo.',
        noResults: 'Nenhuma página corresponde à sua busca.',
        createNew: 'Nova Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'Em desenvolvimento',
        devices: 'Dispositivos',
        notCreated: 'As páginas não foram criadas para esta combinação de layout / design system.',
        generatePages: 'Gerar páginas',
        outdated: 'Desatualizada',
        review: 'Revisar',
        reviewIntro: 'Moléculas usadas por esta página mudaram desde a geração:',
        markReviewed: 'Marcar como revisada',
        saving: 'Salvando…',
        staleIntro: 'A seleção não reflete mais o design system:',
        staleReasonRules: 'As regras da página mudaram.',
        staleReasonRemoved: 'Uma molécula usada foi removida.',
        staleReasonIncompatible: 'Uma molécula usada ficou incompatível.',
        staleReasonNoStamp: 'A página é anterior ao versionamento do DS.',
        regeneratePage: 'Refazer página',
        regenerating: 'Refazendo…',
        regenerated: 'Task iniciada',
        followTask: 'Acompanhar task',
        missingVariation: 'Esta página ainda não foi gerada para o layout / design system atual.',
        generatePage: 'Gerar página',
        notGenerated: 'Não gerada',
        editPage: 'Alterar esta página',
        editPlaceholder: 'Descreva a mudança (ex.: centralize os botões da lista)…',
        editReview: 'Revisar',
        editPlanning: 'Analisando…',
        editPlanTitle: 'Confirme a mudança',
        editPlanApply: 'Aplicar',
        editPlanCancel: 'Cancelar',
        editApplying: 'Aplicando…',
        editWhatChanged: 'O que mudou',
        editPageShell: 'página',
        editRevert: 'desfazer',
        editRecorded: 'Registrado: o "Refazer página" refaz esta mudança. Salve para gravar no projeto.',
        editNotRecorded: 'Não registrado neste projeto: o "Refazer página" desfaz esta mudança. Salve para gravar no projeto.',
        editLiveNotApplied: 'A tela não foi atualizada ({reason}): recarregue para ver a mudança.',
        editNoAnswer: 'O agente terminou sem resposta (a task falhou). Abra a task para ver o motivo.',
        editElement: 'Elemento',
        editElementIn: 'em',
        editElementRemove: 'Não enviar este elemento',
        editElementElsewhere: 'O elemento selecionado não é desta página e device: não será enviado.',
    },
    es: {
        title: 'Páginas',
        desc: 'Páginas del módulo seleccionado. Filtradas por dispositivo activo cuando hay uno seleccionado.',
        allTitle: 'Todas las Páginas',
        allDesc: 'Todas las páginas encontradas para el módulo y dispositivo seleccionados.',
        customTitle: 'Nueva Página',
        customDesc: 'Cree una nueva página en este módulo.',
        noModule: 'Ningún módulo seleccionado.',
        noPages: 'No se encontraron páginas para este módulo.',
        noResults: 'Ninguna página coincide con su búsqueda.',
        createNew: 'Nueva Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'En desarrollo',
        devices: 'Dispositivos',
        notCreated: 'Las páginas no se han creado para esta combinación de layout / design system.',
        generatePages: 'Generar páginas',
        outdated: 'Desactualizada',
        review: 'Revisar',
        reviewIntro: 'Las moléculas usadas por esta página cambiaron desde su generación:',
        markReviewed: 'Marcar como revisada',
        saving: 'Guardando…',
        staleIntro: 'La selección ya no refleja el design system:',
        staleReasonRules: 'Las reglas de la página cambiaron.',
        staleReasonRemoved: 'Una molécula usada fue eliminada.',
        staleReasonIncompatible: 'Una molécula usada ya no es compatible.',
        staleReasonNoStamp: 'La página es anterior al versionado del DS.',
        regeneratePage: 'Regenerar página',
        regenerating: 'Regenerando…',
        regenerated: 'Tarea iniciada',
        followTask: 'Seguir tarea',
        missingVariation: 'Esta página aún no fue generada para el layout / design system actual.',
        generatePage: 'Generar página',
        notGenerated: 'No generada',
        editPage: 'Cambiar esta página',
        editPlaceholder: 'Describa el cambio (p. ej. centre los botones de la lista)…',
        editReview: 'Revisar',
        editPlanning: 'Analizando…',
        editPlanTitle: 'Confirme el cambio',
        editPlanApply: 'Aplicar',
        editPlanCancel: 'Cancelar',
        editApplying: 'Aplicando…',
        editWhatChanged: 'Qué cambió',
        editPageShell: 'página',
        editRevert: 'deshacer',
        editRecorded: 'Registrado: "Regenerar página" rehace este cambio. Guarde para conservarlo en el proyecto.',
        editNotRecorded: 'No registrado en este proyecto: "Regenerar página" deshace este cambio. Guarde para conservarlo en el proyecto.',
        editLiveNotApplied: 'La pantalla no se actualizó ({reason}): recargue para ver el cambio.',
        editNoAnswer: 'El agente terminó sin respuesta (la tarea falló). Abra la tarea para ver el motivo.',
        editElement: 'Elemento',
        editElementIn: 'en',
        editElementRemove: 'No enviar este elemento',
        editElementElsewhere: 'El elemento seleccionado no es de esta página y dispositivo: no se enviará.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

interface IPageEntry {
    name: string;
    devices: string[];
    file: mls.stor.IFileInfo;
    // false = listed from the source (page11) but not generated for the current layout/DS variation.
    exists: boolean;
}

// One operation of an agentEditPage plan, as its gate returns it in `PLAN:<json>` (the agent's own type is private to
// its folder; this panel only shows the operations and sends them back verbatim to apply).
interface IEditOperation {
    id: string;
    organism: string | null;
    aspect: string;
    change: string;
    summary: string;
    revert: boolean;
}

// The selected element sent with the request (agentEditPage `element`): what locates it, from `aura.edit.selection`.
interface IEditElement {
    tag: string;
    organism: string | null;
    organismPath: string;
    anchorPath: unknown[] | null;
    literal: string;
}

// What an agentEditPage apply reports in `NOTES:<json>`.
interface IEditNotes {
    notes: string;
    history: 'written' | 'unchanged' | 'disabled' | 'unavailable';
    /** null = the running app shows the change; else why it does not (reload to see it). */
    live?: string | null;
    warnings: string[];
}

// ─── Constants ───────────────────────────────────────────────────────

const DEVICE_SUB_PATHS: Record<number, string> = {
    1: 'web/desktop',
    2: 'web/mobile',
    3: 'android',
    4: 'ios',
};

const DEVICE_LABELS: Record<string, string> = {
    'web/desktop': 'Web Desktop',
    'web/mobile': 'Web Mobile',
    'android': 'Android',
    'ios': 'iOS',
};

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-page-102020')
export class PluginSelectPage extends StateLitElement {

    @property({ attribute: false }) selectedModule: IModule | null = null;
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) reloadToken: number = 0;

    @state() private _pages: IPageEntry[] = [];
    @state() private _search: string = '';
    @state() private _activeDevice: string | null = null;
    @state() private _pagesNotCreated: boolean = false;
    // page name → DS-version check: status ('stale' | 'review' | 'fresh') + what changed / why.
    @state() private _checkByName: Record<string, PageDsCheck> = {};
    // page currently being re-stamped (disables its button).
    @state() private _busyPage: string | null = null;
    // agentEditPage, per page name: the request being written, the plan awaiting confirmation, the phase in flight,
    // the last error and the last result.
    @state() private _editDraft: Record<string, string> = {};
    @state() private _editDevice: Record<string, string> = {};
    @state() private _editPlan: Record<string, { request: string; device: string; operations: IEditOperation[]; element: IEditElement | null }> = {};
    @state() private _editBusy: Record<string, 'plan' | 'apply'> = {};
    @state() private _editError: Record<string, string> = {};
    @state() private _editNotes: Record<string, IEditNotes> = {};
    // The element selected in the Studio (TASK-102020-agent-edit-page-selection). `_selectionOff` = the person removed
    // the chip; `_selectionUsed` = the selection an applied change consumed (the remount made it stale). A NEW
    // selection clears both.
    @state() private _selection: IAuraEditSelection | null = null;
    @state() private _selectionOff: Record<string, boolean> = {};
    private _selectionUsed: IAuraEditSelection | null = null;

    private _threadCache = new Map<string, Promise<any>>();
    private _taskInfoByName = new Map<string, { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }>();
    private _unsubTasks: (() => void) | undefined;

    connectedCallback() {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
        this._selection = getAuraEdit()?.selection ?? null;
        subscribe('aura.edit.selection', this);
        this._loadPages();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
        unsubscribe('aura.edit.selection', this);
    }

    handleIcaStateChange(key: string, value: unknown) {
        if (key !== 'aura.edit.selection') return;
        this._selection = (value ?? getAuraEdit()?.selection ?? null) as IAuraEditSelection | null;
        this._selectionOff = {};
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('selectedModule') || changed.has('reloadToken')) {
            this._search = '';
            this._loadPages();
        }
        if (changed.has('value')) {
            this._search = '';
        }
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean { return this.value === 0; }
    private get _isCustom(): boolean { return this.value !== null && this.value > this._pages.length; }
    private get _selectedPage(): IPageEntry | null {
        if (this.value === null || this.value <= 0 || this.value > this._pages.length) return null;
        return this._pages[this.value - 1];
    }

    // ─── Page Loading ─────────────────────────────────────────────────

    private get _modulePath(): string | null {
        return this.selectedModule?.path ?? getAuraState().actualModule ?? null;
    }

    private get _moduleName(): string | null {
        return this.selectedModule?.name ?? getAuraState().actualModule ?? null;
    }

    private async _loadPages(): Promise<void> {
        this._pages = [];
        this._pagesNotCreated = false;
        const modulePath = this._modulePath;
        if (!modulePath) {
            this._dispatchConfig();
            return;
        }

        const project = getAuraState().actualProject;
        const activeDevicePath = getAuraState().actualDevice;

        this._activeDevice = activeDevicePath ? (DEVICE_LABELS[activeDevicePath] ?? null) : null;

        // The page variation folder is page<layout><designSystem> (e.g. page11 =
        // layout 1, DS 1). Build it from the current aura selection.
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        const variation = `page${layout}${ds}`;

        // Pages live in the project config.json (l0), written by the register step.
        let pages: any[] = [];
        try {
            const content = await getContentByMlsPath(`_${project}_/l0/config.json`);
            if (!content) throw new Error('config.json not found');
            const config = JSON.parse(content);
            const moduleDef = config?.projects?.[String(project)]?.modules
                ?.find((m: any) => m.moduleId === modulePath);
            pages = moduleDef?.frontend?.pages ?? [];
        } catch { /* fall through to the stor scan below */ }

        // Fallback: config.json absent or without this module (register step not run yet) →
        // derive the pages from the physical files in {module}/web/{device}/page11 (always
        // present after create). Synthetic entries mirror the config shape (pageId + source).
        if (!pages.length) pages = this._scanPagesFromStor(project, modulePath);

        const pageMap = new Map<string, { devices: Set<string>; file: mls.stor.IFileInfo; exists: boolean }>();
        let candidateCount = 0;

        for (const page of pages) {
            // source: e.g. "l2/cafeFlow/web/desktop/page11/dashboardGerente.ts"
            const source: string = page.source ?? '';
            const relative = source.replace(/^\.?\//, '').replace(/\.ts$/, '');
            const levelMatch = relative.match(/^l(\d+)\/(.+)$/);
            if (!levelMatch) continue;

            const level = parseInt(levelMatch[1], 10);
            const afterLevel = levelMatch[2];
            const lastSlash = afterLevel.lastIndexOf('/');
            if (lastSlash < 0) continue;

            const rawFolder = afterLevel.substring(0, lastSlash);
            const shortName = afterLevel.substring(lastSlash + 1);
            if (!shortName) continue;

            let devicePath: string | null = null;
            for (const dp of Object.values(DEVICE_SUB_PATHS)) {
                if (rawFolder.includes(`/${dp}/`) || rawFolder.endsWith(`/${dp}`)) { devicePath = dp; break; }
            }
            if (!devicePath) continue;

            if (activeDevicePath && devicePath !== activeDevicePath) continue;

            // Swap the source's variation segment (e.g. page11) for the current one.
            const variationFolder = rawFolder.replace(/page\d+(\/|$)/, `${variation}$1`);
            candidateCount++;

            // The page list is owned by the config (or, without one, by the page11 scan):
            // the source (page11) is the source of truth, so a page not yet generated for
            // the current layout/DS variation still shows. Its file always points at the
            // variation path — selecting a missing one leads the preview to its own
            // "not found" state instead of silently rendering the page11 version.
            const exists = this._fileExists(project, level, variationFolder, shortName);
            if (!exists && !this._fileExists(project, level, rawFolder, shortName)) continue;

            const name = page.pageId || shortName;
            if (!pageMap.has(name)) {
                const file = { project, folder: variationFolder, shortName, level, extension: '.ts' } as mls.stor.IFileInfo;
                pageMap.set(name, { devices: new Set(), file, exists });
            }
            pageMap.get(name)!.devices.add(devicePath);
        }

        this._pages = Array.from(pageMap.entries())
            .map(([name, { devices, file, exists }]) => ({ name, devices: Array.from(devices).sort(), file, exists }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Config lists pages for this module/device, but none exist for the
        // current variation → offer to generate them.
        this._pagesNotCreated = candidateCount > 0 && this._pages.length === 0;

        this._dispatchConfig();
        this.requestUpdate();
        this._autoSelectActivePage();
        this._loadPageStatus();
    }

    /** Fallback page source: scan the stor for {module}/web/{device}/page11/*.ts pages and
     *  return entries in the config.json shape ({ pageId, source }). Used when l0/config.json
     *  is missing or has no entry for the module (frontend register step not run yet). */
    private _scanPagesFromStor(project: number | null, modulePath: string): Array<{ pageId: string; source: string }> {
        if (!project) return [];
        const out: Array<{ pageId: string; source: string }> = [];
        const seen = new Set<string>();
        for (const f of Object.values(mls.stor.files) as any[]) {
            if (!f || f.project !== project || f.level !== 2 || f.status === 'deleted') continue;
            if (f.extension !== '.ts' || typeof f.shortName !== 'string' || !f.shortName) continue;
            const folder = String(f.folder || '');
            if (!folder.startsWith(`${modulePath}/web/`) || !/\/page11$/.test(folder)) continue;
            const key = `${folder}/${f.shortName}`;
            if (seen.has(key)) continue;
            seen.add(key);
            out.push({ pageId: f.shortName, source: `l2/${folder}/${f.shortName}.ts` });
        }
        return out.sort((a, b) => a.pageId.localeCompare(b.pageId));
    }

    // Compute each page's DS-version check (stale / review / fresh + details). Only meaningful
    // for non-default design systems (the default DS / origin pages carry no stamp).
    private async _loadPageStatus(): Promise<void> {
        this._checkByName = {};
        const module = this._modulePath;
        const project = getAuraState().actualProject;
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        if (!module || !project || this._pages.length === 0) return;
        // Gate (L6): only check staleness when the layout actually has rules configured.
        if (!(await layoutHasRules(project, layout))) return;

        const results = await Promise.all(this._pages.filter(p => p.exists).map(async (p) => {
            try {
                const check = await pageDsCheckByDefs(
                    { project: p.file.project, folder: p.file.folder ?? '', shortName: p.file.shortName },
                    module,
                    layout,
                    ds,
                );
                return [p.name, check] as const;
            } catch {
                return [p.name, null] as const;
            }
        }));

        const map: Record<string, PageDsCheck> = {};
        for (const [name, check] of results) if (check) map[name] = check;
        this._checkByName = map;
        this.requestUpdate();
    }

    private _renderStatusBadge(pageName: string) {
        const status = this._checkByName[pageName]?.status;
        if (status === 'stale') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                ${this.msg.outdated}
            </span>`;
        if (status === 'review') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                ${this.msg.review}
            </span>`;
        return nothing;
    }

    // Re-fire the select event for the page already active in the state, so the
    // preview repaints when this component (re)loads.
    private _autoSelectActivePage(): void {
        const activePage = getAuraState().actualPage;
        if (!activePage) return;
        const index = this._pages.findIndex(p =>
            p.file.shortName === activePage.shortName &&
            p.file.project === activePage.project
        );
        if (index < 0) return;
        this._dispatchSelect(index + 1);
    }

    private _fileExists(project: number | null, level: number, folder: string, shortName: string): boolean {
        try {
            if (!project) return false;
            const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension: '.ts' });
            const file = (mls.stor.files as Record<string, any>)[key];
            return !!file && file.status !== 'deleted';
        } catch {
            return false;
        }
    }

    private _dispatchConfig() {
        const labels: Record<number, string> = { 0: 'All' };
        this._pages.forEach((p, i) => { labels[i + 1] = p.name; });
        labels[this._pages.length + 1] = '+';
        this.dispatchEvent(new CustomEvent('page-config', {
            detail: {
                min: 0,
                max: this._pages.length + 1,
                labels,
                pages: this._pages.map(p => ({ name: p.name, file: p.file })),
            },
            bubbles: true,
            composed: true,
        }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this._modulePath) return this._renderNoModule();
        if (this._pagesNotCreated) return this._renderNotCreated();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNoModule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.noModule}</span>
                </div>
            </div>
        `;
    }

    private _renderHeader(value = 0, max = 1) {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${this.msg.allTitle}
                .desc=${this.msg.desc}
                .value=${value}
                .min=${0}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    private _renderSelected() {
        const page = this._selectedPage;
        const max = this._pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${page?.name ?? ''}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                ${page ? this._renderPageDetail(page) : nothing}
            </div>
        `;
    }

    private _renderPageDetail(page: IPageEntry) {
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-baseline gap-1">
                    <span class="text-xs text-gray-400 dark:text-gray-500">${this._moduleName}/</span>
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${page.name}</span>
                    <span class="ml-auto">${this._renderStatusBadge(page.name)}</span>
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-xs text-gray-400 dark:text-gray-600">${this.msg.devices}:</span>
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            ${DEVICE_LABELS[d] ?? d}
                        </span>
                    `)}
                </div>
            </div>
            ${page.exists ? this._renderDsVersionPanel(page) : this._renderMissingPanel(page)}
            ${page.exists ? this._renderEditPanel(page) : nothing}
            ${page.exists ? this._renderClassPicker() : nothing}
        `;
    }

    // ─── Change this page (agentEditPage, TASK-102020-agent-edit-page) ──

    // `<module>/web/<device>/<genome>` of the page on screen; null when the folder is not a generated page folder.
    private _editTarget(page: IPageEntry): { device: string; genome: string } | null {
        const match = /\/web\/(desktop|mobile)\/(page\d\d)$/.exec(page.file?.folder ?? '');
        if (!match) return null;
        return { device: this._editDevice[page.name] ?? match[1], genome: match[2] };
    }

    /**
     * The Studio selection as an agentEditPage `element`, valid only on THIS page and THIS device: its file must be
     * exactly the page `.ts` of `<module>/web/<device>/<genome>`. `element` null with a `reason` = there is a
     * selection but it does not count here; both null = nothing selected (or removed by the person, or consumed).
     */
    private _selectedElement(page: IPageEntry): { element: IEditElement | null; reason: string | null } {
        const selection = this._selection;
        if (!selection || selection === this._selectionUsed || this._selectionOff[page.name]) return { element: null, reason: null };
        const target = this._editTarget(page);
        const folder = page.file?.folder ?? '';
        const base = folder.slice(0, folder.lastIndexOf('/web/'));
        if (!target || !base) return { element: null, reason: null };
        const file = selection.file;
        const samePage = file && file.project === page.file.project && file.shortName === page.file.shortName
            && file.folder === `${base}/web/${target.device}/${target.genome}`;
        if (!samePage) return { element: null, reason: this.msg.editElementElsewhere };
        return {
            element: {
                tag: selection.tag,
                organism: selection.organism ?? null,
                organismPath: selection.organismPath ?? '',
                anchorPath: Array.isArray(selection.anchorPath) ? selection.anchorPath as unknown[] : null,
                literal: selection.literal ?? '',
            },
            reason: null,
        };
    }

    private _renderElementChip(page: IPageEntry, busy: boolean) {
        const { element, reason } = this._selectedElement(page);
        if (reason) return html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${reason}</span>`;
        if (!element) return nothing;
        return html`
            <div class="flex items-center gap-1.5 self-start max-w-full rounded-full border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 pl-2 pr-1 py-0.5 text-[11px] text-indigo-700 dark:text-indigo-300">
                <span class="shrink-0">${this.msg.editElement}:</span>
                <span class="font-mono truncate">${element.tag}</span>
                ${element.organism ? html`<span class="shrink-0 text-indigo-400 dark:text-indigo-500">${this.msg.editElementIn} ${element.organism}</span>` : nothing}
                <button class="shrink-0 px-1 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800/40 cursor-pointer disabled:cursor-not-allowed"
                    title=${this.msg.editElementRemove}
                    aria-label=${this.msg.editElementRemove}
                    ?disabled=${busy}
                    @click=${() => { this._selectionOff = { ...this._selectionOff, [page.name]: true }; }}>✕</button>
            </div>
        `;
    }

    private _renderEditPanel(page: IPageEntry) {
        const target = this._editTarget(page);
        if (!target) return nothing;
        const plan = this._editPlan[page.name];
        if (plan) return this._renderEditConfirm(page, plan);
        const busy = this._editBusy[page.name];
        const error = this._editError[page.name];
        const done = this._editNotes[page.name];
        const devices = page.devices.map(d => d.replace(/^web\//, '')).filter(d => d === 'desktop' || d === 'mobile');
        const inputCls = 'w-full text-xs px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600';
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.editPage}</span>
                    ${devices.length > 1 ? html`
                        <select class="ml-auto text-[10px] px-1 py-0.5 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300"
                            .value=${target.device}
                            ?disabled=${!!busy}
                            @change=${(e: Event) => { this._editDevice = { ...this._editDevice, [page.name]: (e.target as HTMLSelectElement).value }; }}>
                            ${devices.map(d => html`<option value=${d} ?selected=${d === target.device}>${DEVICE_LABELS[`web/${d}`] ?? d}</option>`)}
                        </select>
                    ` : nothing}
                </div>
                ${this._renderElementChip(page, !!busy)}
                <textarea
                    rows="2"
                    class="${inputCls} resize-y"
                    placeholder=${this.msg.editPlaceholder}
                    ?disabled=${!!busy}
                    .value=${this._editDraft[page.name] ?? ''}
                    @input=${(e: Event) => { this._editDraft = { ...this._editDraft, [page.name]: (e.target as HTMLTextAreaElement).value }; }}
                ></textarea>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${!!busy || !(this._editDraft[page.name] ?? '').trim()}
                    @click=${() => this._onPlanEdit(page)}
                >${busy === 'plan' ? this.msg.editPlanning : busy === 'apply' ? this.msg.editApplying : this.msg.editReview}</button>
                ${done ? html`
                    <div class="text-xs text-emerald-700 dark:text-emerald-300 rounded bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5 flex flex-col gap-1">
                        <span><span class="font-semibold">${this.msg.editWhatChanged}:</span> ${done.notes}</span>
                        <span class="text-[10px] text-gray-500 dark:text-gray-400">${done.history === 'written' || done.history === 'unchanged' ? this.msg.editRecorded : this.msg.editNotRecorded}</span>
                        ${done.live ? html`<span class="text-[10px] text-amber-600 dark:text-amber-400">${this.msg.editLiveNotApplied.replace('{reason}', done.live)}</span>` : nothing}
                    </div>
                ` : nothing}
                ${error ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${error}</div>
                ` : nothing}
                ${this._taskInfoByName.get(`edit:${page.name}`)?.task ? html`
                    <button class="self-end text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                        @click=${() => this._openTask(`edit:${page.name}`)}>${this.msg.followTask}</button>
                ` : nothing}
            </div>
        `;
    }

    // The gate's plan, shown for confirmation before anything is written.
    private _renderEditConfirm(page: IPageEntry, plan: { request: string; device: string; operations: IEditOperation[]; element: IEditElement | null }) {
        const busy = this._editBusy[page.name];
        return html`
            <div class="rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300">${this.msg.editPlanTitle}</span>
                <span class="text-[11px] italic text-gray-500 dark:text-gray-400">“${plan.request}”</span>
                ${plan.element ? html`
                    <span class="text-[10px] text-gray-500 dark:text-gray-400">${this.msg.editElement}: <span class="font-mono">${plan.element.tag}</span>${plan.element.organism ? ` ${this.msg.editElementIn} ${plan.element.organism}` : ''}</span>
                ` : nothing}
                <div class="flex flex-col gap-1">
                    ${plan.operations.map(op => html`
                        <div class="flex items-baseline gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                            <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${op.organism ?? this.msg.editPageShell}</span>
                            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">${op.aspect}</span>
                            ${op.revert ? html`<span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">${this.msg.editRevert}</span>` : nothing}
                            <span class="leading-snug">${op.summary}</span>
                        </div>
                    `)}
                </div>
                <div class="flex items-center gap-2">
                    <button
                        class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        ?disabled=${!!busy}
                        @click=${() => this._onApplyPlan(page)}
                    >${busy === 'apply' ? this.msg.editApplying : this.msg.editPlanApply}</button>
                    <button
                        class="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        ?disabled=${!!busy}
                        @click=${() => this._onCancelPlan(page)}
                    >${this.msg.editPlanCancel}</button>
                    ${this._taskInfoByName.get(`edit:${page.name}`)?.task ? html`
                        <button class="ml-auto text-xs text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                            @click=${() => this._openTask(`edit:${page.name}`)}>${this.msg.followTask}</button>
                    ` : nothing}
                </div>
                ${this._editError[page.name] ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${this._editError[page.name]}</div>
                ` : nothing}
            </div>
        `;
    }

    private _editEntry(page: IPageEntry, request: string, device: string, element: IEditElement | null, operations?: IEditOperation[]): string | null {
        const target = this._editTarget(page);
        const module = this._moduleName ?? this._modulePath;
        if (!target || !module) return null;
        return JSON.stringify({
            module, page: page.file?.shortName ?? page.name, device, genome: target.genome, request,
            ...(element ? { element } : {}), ...(operations ? { operations } : {}),
        });
    }

    // Per-page edit state is replaced, never mutated, so @state sees the change.
    private _setEdit(field: '_editBusy' | '_editError' | '_editNotes' | '_editPlan', name: string, value: unknown) {
        const next: Record<string, unknown> = { ...this[field] };
        if (value === undefined) delete next[name];
        else next[name] = value;
        (this as unknown as Record<string, unknown>)[field] = next;
    }

    // Phase PLAN: only the gate runs; the operations come back for confirmation and nothing is written.
    private async _onPlanEdit(page: IPageEntry) {
        const request = (this._editDraft[page.name] ?? '').trim();
        const device = this._editTarget(page)?.device;
        if (!request || !device || this._editBusy[page.name]) return;
        const { element } = this._selectedElement(page);
        const entry = this._editEntry(page, request, device, element);
        if (!entry) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editNotes', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'plan');
        try {
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            if (result.failure) this._setEdit('_editError', page.name, result.failure);
            else if (result.plan?.length) this._setEdit('_editPlan', page.name, { request, device, operations: result.plan, element });
            // A task the system failed (an LLM call that never came back right) emits nothing of ours: say so.
            else this._setEdit('_editError', page.name, this.msg.editNoAnswer);
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    // Phase APPLY: the approved operations go back verbatim; the agent patches the .ts and records the history.
    private async _onApplyPlan(page: IPageEntry) {
        const plan = this._editPlan[page.name];
        if (!plan || this._editBusy[page.name]) return;
        // The element the plan was made with goes back with it, even if the selection moved since.
        const entry = this._editEntry(page, plan.request, plan.device, plan.element, plan.operations);
        if (!entry) return;
        this._setEdit('_editError', page.name, undefined);
        this._setEdit('_editBusy', page.name, 'apply');
        try {
            const result = await this._executeAgent('agentEditPage', entry, data => { this._taskInfoByName.set(`edit:${page.name}`, data); this.requestUpdate(); });
            if (result.failure) this._setEdit('_editError', page.name, result.failure);
            // No notes = the apply never finished (the plan stays, to try again).
            else if (!result.notes) this._setEdit('_editError', page.name, this.msg.editNoAnswer);
            else {
                this._setEdit('_editPlan', page.name, undefined);
                this._editDraft = { ...this._editDraft, [page.name]: '' };
                if (result.notes) this._setEdit('_editNotes', page.name, result.notes);
                // The remount rebuilt the page: the selection that was sent points at nodes that are gone.
                if (plan.element) this._selectionUsed = this._selection;
            }
        } catch (e: any) {
            this._setEdit('_editError', page.name, e?.message ?? String(e));
        } finally {
            this._setEdit('_editBusy', page.name, undefined);
        }
    }

    // Cancel: back to the request, kept so it can be refined.
    private _onCancelPlan(page: IPageEntry) {
        this._setEdit('_editPlan', page.name, undefined);
    }

    // The class picker DOCKED here (pageClassPickerPanel) — a second take on the floating one, kept
    // side by side while we compare. While it is connected the studio editor feeds it AND the floating
    // panel, so both are active on the same selection. Loaded lazily: it pulls the studio's editing core, which this plugin otherwise
    // never needs.
    private _renderClassPicker() {
        void import('/_102020_/l2/aura/studio/pageClassPickerPanel.js');
        return html`
            <div class="border-t border-gray-200 dark:border-gray-800 pt-3">
                <aura--studio--page-class-picker-102020></aura--studio--page-class-picker-102020>
            </div>
        `;
    }

    // Page listed from the source (page11) but absent in the current layout/DS
    // variation: explain why the preview shows nothing and offer to generate it.
    private _renderMissingPanel(page: IPageEntry) {
        const task = getTask(`regenerate:${page.name}`);
        const running = task?.status === 'running';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">${this.msg.missingVariation}</span>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${running}
                    @click=${() => this._onRegenerate(page)}
                >${running ? this.msg.regenerating : this.msg.generatePage}</button>
                ${task && task.status === 'error' ? html`
                    <span class="text-xs text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>
                ` : nothing}
            </div>
        `;
    }

    // ─── DS-version panel (review / stale) ────────────────────────────

    private _renderDsVersionPanel(page: IPageEntry) {
        const check = this._checkByName[page.name];
        if (!check) return nothing;
        if (check.status === 'review') return this._renderReviewPanel(page, check);
        if (check.status === 'stale') return this._renderStalePanel(page, check);
        return nothing;
    }

    private _renderReviewPanel(page: IPageEntry, check: PageDsCheck) {
        return html`
            <div class="rounded-lg border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-sky-700 dark:text-sky-300">${this.msg.reviewIntro}</span>
                <div class="flex flex-col gap-1.5">
                    ${check.changed.map(m => html`
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-700 dark:text-gray-300">${this._humanizeGroup(m.group)}</span>
                            <span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${m.tag}</span>
                        </div>
                    `)}
                </div>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${this._busyPage === page.name}
                    @click=${() => this._onMarkReviewed(page)}
                >${this._busyPage === page.name ? this.msg.saving : this.msg.markReviewed}</button>
            </div>
        `;
    }

    private _renderStalePanel(page: IPageEntry, check: PageDsCheck) {
        const reason = {
            'rules': this.msg.staleReasonRules,
            'molecule-removed': this.msg.staleReasonRemoved,
            'molecule-incompatible': this.msg.staleReasonIncompatible,
            'no-stamp': this.msg.staleReasonNoStamp,
        }[check.staleReason ?? 'no-stamp'];
        const mol = check.staleMolecule;
        const task = getTask(`regenerate:${page.name}`);
        const running = task?.status === 'running';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">${this.msg.staleIntro}</span>
                <span class="text-xs text-amber-600 dark:text-amber-400">${reason}</span>
                ${mol ? html`<span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${mol.tag}</span>` : nothing}
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${running}
                    @click=${() => this._onRegenerate(page)}
                >${running ? this.msg.regenerating : this.msg.regeneratePage}</button>
                ${task ? html`
                    <div class="flex items-center gap-2 text-xs">
                        ${task.status === 'running' ? html`<span class="text-indigo-500 dark:text-indigo-400 italic">${this.msg.regenerating}</span>` : nothing}
                        ${task.status === 'done' ? html`<span class="text-emerald-600 dark:text-emerald-400">✓ ${this.msg.regenerated}</span>` : nothing}
                        ${task.status === 'error' ? html`<span class="text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>` : nothing}
                        ${this._taskInfoByName.get(page.name)?.task ? html`
                            <button class="ml-auto text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${() => this._openTask(page.name)}>${this.msg.followTask}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _humanizeGroup(group: string): string {
        return group.replace(/^group/, '').replace(/([A-Z])/g, ' $1').trim() || group;
    }

    private async _onMarkReviewed(page: IPageEntry) {
        const module = this._modulePath;
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        if (!module) return;
        this._busyPage = page.name;
        this.requestUpdate();
        await restampPage(
            { project: page.file.project, folder: page.file.folder ?? '', shortName: page.file.shortName },
            module,
            layout,
            ds,
            new Date().toISOString(),
        );
        this._busyPage = null;
        await this._loadPageStatus();
    }

    // Regenerate this single page (TASK-102020-genome-ux-3). UX N (2..9): agentGenomeUx writes page{N}1/<page>.defs.ts
    // on both devices and chains agentMaterializeL2 --genome page{N}1 itself (force: even when its receipt is fresh).
    // UX 1 (page11) is agentDefsL2's: only its .ts is regenerated (agentMaterializeL2 --genome page11 --force), unless
    // the page has a UX 1 template choice that differs from page11 (TASK-102020-genome-ux-4): then agentGenomeUx base
    // mode (layout 1) rewrites page11 with it and chains agentMaterializeL2 --genome page11.
    private async _onRegenerate(page: IPageEntry) {
        const module = this._moduleName ?? this._modulePath;
        const layout = Number(getAuraState().actualLayout ?? 1);
        if (!module) return;

        const taskKey = `regenerate:${page.name}`;
        if (getTask(taskKey)?.status === 'running') return;

        // The agents match on page ids (the defs shortName); page.name may be a pageId/path, so send the file shortName.
        const pageShort = page.file?.shortName ?? page.name;
        const genomeUx = Number.isInteger(layout) && layout >= 2 && layout <= 9;
        // Pause the preview while the agent rewrites the defs (avoids repaint thrash); restore after.
        const prevPause = getState('preview.pausePreview');
        setTask(taskKey, { status: 'running', startedAt: Date.now() });
        const trackTask = (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => {
            this._taskInfoByName.set(page.name, data);
            this.requestUpdate(); // surface "Follow task" as soon as the task exists
        };
        try {
            let result: { failure?: string };
            const project = Number(page.file?.project ?? getAuraState().actualProject ?? 0);
            const baseChoice = !genomeUx && project ? await readGenomeUxBaseChoice(project, module, pageShort) : null;
            if (genomeUx) {
                setState('preview.pausePreview', true);
                const entry = { module, layout, pages: [pageShort], force: true, materialize: true };
                result = await this._executeAgent('agentGenomeUx', JSON.stringify(entry), trackTask);
            } else if (baseChoice) {
                // No force: the choice alone makes the page pending; without it the base mode is a no-op.
                setState('preview.pausePreview', true);
                const entry = { module, layout: 1, pages: [pageShort], materialize: true };
                result = await this._executeAgent('agentGenomeUx', JSON.stringify(entry), trackTask);
            } else {
                result = await this._executeAgent('agentMaterializeL2', `${module} --page ${pageShort} --genome page11 --force`, trackTask);
            }
            if (result.failure) throw new Error(result.failure);
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (e: any) {
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: e?.message });
        } finally {
            setState('preview.pausePreview', prevPause ?? false);
            await this._loadPages(); // re-scan: refreshes existence in the variation + DS status
        }
    }

    private async _executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
    ): Promise<{ taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message; failure?: string; plan?: IEditOperation[]; notes?: IEditNotes }> {
        // Thread host: selectPage lives in serviceGenome since the knob move (D4).
        const fullName = '_102020_/l2/serviceGenome';
        let threadPromise = this._threadCache.get(fullName);
        if (!threadPromise) {
            threadPromise = (async () => {
                let thread = await getThreadByName(fullName);
                if (!thread) thread = await createThread(fullName, [], 'company');
                return thread;
            })();
            this._threadCache.set(fullName, threadPromise);
        }
        const thread = await threadPromise;
        const userId = getUserId();
        const threadId = thread?.threadId;
        if (!userId || !threadId) return { taskId: '' };

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);

        let taskId = '';
        let task: mls.msg.TaskData | undefined;
        let message: mls.msg.Message | undefined;
        // The stream drives the WHOLE flow (hooks + intents), not just task creation. Capture the
        // last step failure (mkFail → update-status 'failed' + traceMsg) or a stream error, so callers
        // can surface it instead of silently swallowing it.
        let failure: string | undefined;
        // agentEditPage answers through completed steps: `PLAN:<operations json>` (plan phase) and
        // `NOTES:<json>` (apply phase).
        let plan: IEditOperation[] | undefined;
        let notes: IEditNotes | undefined;
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                taskId = event.taskId; task = event.task; message = event.message;
                onTaskCreated?.({ taskId, task, message });
            } else if (event.type === 'hook-done') {
                for (const intent of event.intents ?? []) {
                    const i = intent as any;
                    if (i?.type !== 'update-status') continue;
                    if (i.status === 'failed' && i.traceMsg) failure = String(i.traceMsg);
                    else if (i.status === 'completed' && typeof i.traceMsg === 'string') {
                        try {
                            if (i.traceMsg.startsWith('PLAN:')) plan = JSON.parse(i.traceMsg.slice(5));
                            else if (i.traceMsg.startsWith('NOTES:')) notes = JSON.parse(i.traceMsg.slice(6));
                        } catch { /* not ours */ }
                    }
                }
            } else if (event.type === 'error') {
                failure = String(event.error);
            }
        }
        return { taskId, task, message, failure, plan, notes };
    }

    private async _openTask(pageName: string) {
        const info = this._taskInfoByName.get(pageName);
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', info.message?.createAt ?? '');
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._pages
            .map((p, i) => ({ p, selectValue: i + 1 }))
            .filter(({ p }) => !q || p.name.toLowerCase().includes(q));
        const max = this._pages.length + 1;
        const activePage = getAuraState().actualPage;

        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.allTitle}
                    .desc=${this.msg.allDesc}
                    .value=${0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <button
                    class="
                        self-end text-sm px-2.5 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchSelect(max)}
                >+ ${this.msg.createNew}</button>

                <input
                    type="text"
                    .value=${this._search}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                />

                ${this._pages.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noPages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ p, selectValue }) => {
                                    const isActive = !!activePage
                                        && p.file.shortName === activePage.shortName
                                        && p.file.project === activePage.project;
                                    return this._renderPageCard(p, selectValue, isActive);
                                })}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this._pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.customTitle}
                    .desc=${this.msg.customDesc}
                    .value=${max}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.inDevelopment}</span>
                </div>
            </div>
        `;
    }

    private _renderNotCreated() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.notCreated}</span>
                </div>

                <button
                    class="
                        self-start text-sm px-3 py-1.5 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchGenerate()}
                >${this.msg.generatePages}</button>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderPageCard(page: IPageEntry, selectValue: number, isActive = false) {
        return html`
            <div
                class="
                    rounded-lg border px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                    ${isActive
                        ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/70'}
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                ${isActive ? html`<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"></div>` : nothing}
                <div class="flex-1 flex items-baseline gap-1 min-w-0">
                    <span class="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">${this._moduleName}/</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">${page.name}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    ${!page.exists ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                            ${this.msg.notGenerated}
                        </span>` : nothing}
                    ${this._renderStatusBadge(page.name)}
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            ${DEVICE_LABELS[d]?.replace('Web ', '') ?? d}
                        </span>
                    `)}
                </div>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        const entry = value > 0 && value <= this._pages.length ? this._pages[value - 1] : null;
        this.dispatchEvent(new CustomEvent('select-page', {
            detail: { value, file: entry?.file ?? null },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchGenerate() {
        this.dispatchEvent(new CustomEvent('generate-pages', {
            detail: {
                module: this._modulePath,
                device: getAuraState().actualDevice,
                layout: getAuraState().actualLayout,
                designSystem: getAuraState().actualDesignSystem,
            },
            bubbles: true,
            composed: true,
        }));
    }
}
