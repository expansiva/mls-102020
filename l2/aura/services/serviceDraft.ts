/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { saveL5File } from '/_102033_/l2/cbe/l5Save.js';
import { isVmDriver, readDraftCookie } from '/_102033_/l2/cbe/studioDraft.js';
import {
    afterDraftSave,
    branchForSlug,
    collectEditedFiles,
    discard,
    experimentDraft,
    loadPanel,
    localEdits,
    panelModel,
    publish,
    readPublished,
    saveDefaultDraft,
    saveToDraft,
    slugForBranch,
    syncWithPublished,
    viewDiff,
    type FetchImpl,
    type IDraftWaitResult,
    type IListedDraft,
    type ILocalEdit,
    type IPanelModel,
    type IPublishedRecord,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import { subscribeAutoSave, type IAutoSavePanelState } from '/_102020_/l2/aura/studio/studioEditTool.js';

/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Draft',
    notVm: 'This project saves on {driver}; the draft is only for projects on the VM.',
    unknownDriver: 'unknown driver',
    loading: 'Loading the draft…',
    slug: 'Draft',
    branch: 'Branch',
    ahead: 'Ahead',
    behind: 'Behind',
    touched: 'Touched files',
    noFiles: 'No touched files.',
    save: 'Save to draft',
    publish: 'Publish',
    discard: 'Discard',
    askComment: 'Message',
    confirmDiscard: 'Discard this draft and return to main?',
    promoting: 'Publishing the draft…',
    rebuilding: 'Rebuilding the release…',
    blocked: 'Not saved because of errors:',
    conflict: 'Publish conflict.',
    nothingToPromote: 'Nothing to publish.',
    emptyComment: 'A message is required.',
    noProject: 'No project is open.',
    noReleaseHelper: 'The release watcher is not available.',
    others: 'Other drafts',
    noOthers: 'No other drafts.',
    view: 'View',
    experiment: 'Try',
    experimentDisabled: 'This draft cannot be tried: its address does not round-trip.',
    bring: 'Bring',
    bringDisabled: 'Bringing another draft is not available yet.',
    makeDefault: 'Project default',
    defaultSaved: 'Saved as the project default.',
    configMissing: 'The project config could not be read.',
    noDiff: 'No differences.',
    localTitle: 'In your browser (not saved)',
    oneFile: '{count} file',
    manyFiles: '{count} files',
    withError: 'with error',
    undoLocal: 'Undo local',
    confirmUndo: 'Discard the local copy of {file}?',
    draftTitle: 'In draft {slug} (saved, not published)',
    publishedTitle: 'Published',
    release: 'Release',
    noLocal: 'No files in the browser.',
    noPublished: 'Nothing published from this browser yet.',
    autoSaveOn: 'Auto-save: on · last send {ago}s ago · {pending} pending',
    autoSaveWaiting: 'Auto-save: on · no send yet · {pending} pending',
    autoSaveOff: 'Auto-save: off',
    autoSaveFailed: 'not saved: {reason}',
    syncPublished: 'Bring in published changes',
    syncConflict: 'Conflicts with the published version in: {files}. Nothing was changed.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Rascunho',
        notVm: 'Este projeto salva no {driver}; o rascunho é só para projetos na VM.',
        unknownDriver: 'driver desconhecido',
        loading: 'Carregando o rascunho…',
        slug: 'Rascunho',
        branch: 'Branch',
        ahead: 'À frente',
        behind: 'Atrás',
        touched: 'Arquivos tocados',
        noFiles: 'Nenhum arquivo tocado.',
        save: 'Salvar no rascunho',
        publish: 'Publicar',
        discard: 'Descartar',
        askComment: 'Mensagem',
        confirmDiscard: 'Descartar este rascunho e voltar à main?',
        promoting: 'Publicando o rascunho…',
        rebuilding: 'Reconstruindo a release…',
        blocked: 'Não salvos por causa de erro:',
        conflict: 'Conflito ao publicar.',
        nothingToPromote: 'Nada para publicar.',
        emptyComment: 'A mensagem é obrigatória.',
        noProject: 'Nenhum projeto aberto.',
        noReleaseHelper: 'O observador da release não está disponível.',
        others: 'Outros rascunhos',
        noOthers: 'Nenhum outro rascunho.',
        view: 'Ver',
        experiment: 'Experimentar',
        experimentDisabled: 'Este rascunho não pode ser experimentado: o endereço não faz ida e volta.',
        bring: 'Trazer',
        bringDisabled: 'Trazer outro rascunho ainda não está disponível.',
        makeDefault: 'Padrão do projeto',
        defaultSaved: 'Gravado como padrão do projeto.',
        configMissing: 'Não foi possível ler o config do projeto.',
        noDiff: 'Sem diferenças.',
        localTitle: 'No seu navegador (não salvo)',
        oneFile: '{count} arquivo',
        manyFiles: '{count} arquivos',
        withError: 'com erro',
        undoLocal: 'Desfazer local',
        confirmUndo: 'Descartar a cópia local de {file}?',
        draftTitle: 'No rascunho {slug} (salvo, não publicado)',
        publishedTitle: 'Publicado',
        release: 'Release',
        noLocal: 'Nenhum arquivo no navegador.',
        noPublished: 'Nada publicado a partir deste navegador.',
        autoSaveOn: 'Auto-save: ligado · último envio há {ago}s · {pending} pendentes',
        autoSaveWaiting: 'Auto-save: ligado · ainda sem envio · {pending} pendentes',
        autoSaveOff: 'Auto-save: desligado',
        autoSaveFailed: 'não salvo: {reason}',
        syncPublished: 'Trazer o publicado',
        syncConflict: 'Conflito com o publicado em: {files}. Nada foi alterado.',
    },
    es: {
        svcTitle: 'Borrador',
        notVm: 'Este proyecto se guarda en {driver}; el borrador es solo para proyectos en la VM.',
        unknownDriver: 'driver desconocido',
        loading: 'Cargando el borrador…',
        slug: 'Borrador',
        branch: 'Rama',
        ahead: 'Por delante',
        behind: 'Por detrás',
        touched: 'Archivos tocados',
        noFiles: 'Ningún archivo tocado.',
        save: 'Guardar en el borrador',
        publish: 'Publicar',
        discard: 'Descartar',
        askComment: 'Mensaje',
        confirmDiscard: '¿Descartar este borrador y volver a main?',
        promoting: 'Publicando el borrador…',
        rebuilding: 'Reconstruyendo la release…',
        blocked: 'No se guardaron por errores:',
        conflict: 'Conflicto al publicar.',
        nothingToPromote: 'Nada que publicar.',
        emptyComment: 'El mensaje es obligatorio.',
        noProject: 'No hay un proyecto abierto.',
        noReleaseHelper: 'El observador de la release no está disponible.',
        others: 'Otros borradores',
        noOthers: 'Ningún otro borrador.',
        view: 'Ver',
        experiment: 'Probar',
        experimentDisabled: 'Este borrador no se puede probar: la dirección no hace ida y vuelta.',
        bring: 'Traer',
        bringDisabled: 'Traer otro borrador todavía no está disponible.',
        makeDefault: 'Predeterminado del proyecto',
        defaultSaved: 'Guardado como predeterminado del proyecto.',
        configMissing: 'No se pudo leer la config del proyecto.',
        noDiff: 'Sin diferencias.',
        localTitle: 'En su navegador (no guardado)',
        oneFile: '{count} archivo',
        manyFiles: '{count} archivos',
        withError: 'con error',
        undoLocal: 'Deshacer local',
        confirmUndo: '¿Descartar la copia local de {file}?',
        draftTitle: 'En el borrador {slug} (guardado, no publicado)',
        publishedTitle: 'Publicado',
        release: 'Release',
        noLocal: 'Ningún archivo en el navegador.',
        noPublished: 'Nada publicado desde este navegador.',
        autoSaveOn: 'Auto-save: activo · último envío hace {ago}s · {pending} pendientes',
        autoSaveWaiting: 'Auto-save: activo · todavía sin envío · {pending} pendientes',
        autoSaveOff: 'Auto-save: apagado',
        autoSaveFailed: 'no guardado: {reason}',
        syncPublished: 'Traer lo publicado',
        syncConflict: 'Conflicto con lo publicado en: {files}. No se cambió nada.',
    },
};
/// **collab_i18n_end**

interface IDriverView {
    driverVersion?: string;
    shortName?: string;
}

/** Fields `collabRelease()` may report while a promote is in flight. */
interface IDraftPing {
    promoting?: unknown;
    rebuilding?: boolean;
    release?: { id?: string } | null;
}

const blockClass = 'flex flex-col gap-3 px-4 py-4 border-b border-gray-200 dark:border-gray-800';
const actionClass = 'text-[9px] font-semibold uppercase tracking-wider px-2 py-3 border border-gray-200 dark:border-gray-800 disabled:opacity-30';

function publishedStorageKey(project: number): string {
    return `collab-draft-published-${project}`;
}

function readStoredPublished(project: number): IPublishedRecord | null {
    try {
        return readPublished(sessionStorage.getItem(publishedStorageKey(project)));
    } catch (err) {
        console.error('[serviceDraft] sessionStorage read failed:', err);
        return null;
    }
}

function releaseIdOf(ping: IDraftPing): string | null {
    const id = ping.release?.id;
    if (typeof id !== 'string' || id.trim() === '') return null;
    return id;
}

interface ICollabRelease {
    (): Promise<IDraftPing>;
    waitForNew: (options?: { onTick?: (ping: IDraftPing) => void }) => Promise<IDraftWaitResult>;
}

const fetchImpl: FetchImpl = (input, init) => fetch(input, init);

function collabReleaseApi(): ICollabRelease | undefined {
    return (window as unknown as { collabRelease?: ICollabRelease }).collabRelease;
}

function readPing(ping: IDraftPing): IDraftPing {
    return { promoting: !!ping.promoting, rebuilding: ping.rebuilding === true };
}

function driverText(driver: IDriverView | null, unknownLabel: string): string {
    const name = driver?.shortName?.trim() ?? '';
    const version = driver?.driverVersion?.trim() ?? '';
    if (name && version) return `${name} (${version})`;
    return name || version || unknownLabel;
}

function fileLabel(file: mls.stor.IFileInfo): string {
    return `${file.folder}/${file.shortName}${file.extension}`;
}

@customElement('aura--services--service-draft-102020')
export class ServiceDraft102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf126',
        state: 'foreground',
        position: 'left',
        tooltip: 'Draft',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceDraft',
        level: [5],
    };

    public onClickMain(op: string): void {
        if (this.menu.setMode) this.menu.setMode('initial');
    }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    @state() private msg: MessageType = message_en;
    @state() private _phase: 'loading' | 'idle' | 'publishing' | 'error' = 'loading';
    @state() private _driverChecked = false;
    @state() private _driver: IDriverView | null = null;
    @state() private _slug = '';
    @state() private _branch: string | null = null;
    @state() private _current: IListedDraft | null = null;
    @state() private _others: IListedDraft[] = [];
    @state() private _blocked: mls.stor.IFileInfo[] = [];
    @state() private _error = '';
    @state() private _errorFiles: string[] = [];
    @state() private _note = '';
    @state() private _ping: IDraftPing | null = null;
    @state() private _releaseId: string | null = null;
    @state() private _diffBranch = '';
    @state() private _diffText: string | null = null;

    private _projectId: number | undefined;
    private _pingTimer = 0;
    private _autoSaveTimer = 0;
    private _unsubAutoSave: (() => void) | undefined;
    @state() private _autoSave: IAutoSavePanelState = { on: false, lastSentAt: null, pending: 0, error: null };

    connectedCallback(): void {
        super.connectedCallback();
        this._unsubAutoSave = subscribeAutoSave((state) => {
            this._autoSave = state;
            this._syncAutoSaveClock(state.on && state.lastSentAt !== null && !state.error);
        });
        void this._load();
    }

    disconnectedCallback(): void {
        this._unsubAutoSave?.();
        this._unsubAutoSave = undefined;
        this._syncAutoSaveClock(false);
        this._stopPing();
        super.disconnectedCallback();
    }

    onServiceClick(visible: boolean, _reinit: boolean, _el: IToolbarContent | null): void {
        if (!visible) return;
        this.msg = messages[this.getMessageKey(messages)] || messages.en;
        this.menu.title = this.msg.svcTitle;
        this.menu.updateTitle?.();
        void this._load();
    }

    render() {
        this.msg = messages[this.getMessageKey(messages)] || messages.en;
        if (this._phase === 'error' && !this._driverChecked) {
            return html`<p class="error">${this._error}</p>`;
        }
        if (!this._driverChecked) {
            return html`<p class="loading">${this.msg.loading}</p>`;
        }
        if (!isVmDriver(this._driver)) {
            const driver = driverText(this._driver, this.msg.unknownDriver);
            return html`<div class="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200"><p class="px-4 py-4">${this.msg.notVm.replace('{driver}', driver)}</p></div>`;
        }
        return this._renderPanel();
    }

    private _countLabel(count: number): string {
        const template = count === 1 ? this.msg.oneFile : this.msg.manyFiles;
        return template.replace('{count}', String(count));
    }

    private _namesSuffix(names: string): string {
        return names ? ` — ${names}` : '';
    }

    private _renderPanel() {
        const project = this._projectId;
        const edited = project ? collectEditedFiles(mls.stor.files, project) : [];
        const local = project ? localEdits(mls.stor.files, project) : [];
        if (edited.length !== local.length) {
            console.error('[serviceDraft] local list and localEdits diverged', edited.length, local.length);
        }
        const model = panelModel({
            local,
            draft: this._current ? this._current.files : null,
            published: project ? readStoredPublished(project) : null,
            release: this._releaseId,
        });
        const busy = this._phase === 'loading' || this._phase === 'publishing';
        return html`
            <div class="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._phase === 'loading' ? html`<p class="px-4 py-4">${this.msg.loading}</p>` : nothing}
                ${this._phase === 'publishing' ? html`<p class="px-4 py-4">${this._pingText()}</p>` : nothing}
                ${this._phase === 'error' ? html`<p class="px-4 py-4 text-amber-700 dark:text-amber-300">${this._error}</p>` : nothing}
                ${this._errorFiles.length
                    ? html`<div class="flex flex-col gap-0.5 px-4">${this._errorFiles.map((file) => html`<div>${file}</div>`)}</div>`
                    : nothing}
                ${this._renderLocal(model, edited, busy)}
                ${this._renderDraft(model, busy)}
                ${this._renderPublished(model)}
                ${this._note ? html`<p class="px-4 py-4">${this._note}</p>` : nothing}
                ${this._renderOthers(busy)}
            </div>
        `;
    }

    private _autoSaveLine(): string {
        const state = this._autoSave;
        if (state.error) return this.msg.autoSaveFailed.replace('{reason}', state.error);
        if (!state.on) return this.msg.autoSaveOff;
        if (state.lastSentAt === null) {
            return this.msg.autoSaveWaiting.replace('{pending}', String(state.pending));
        }
        const ago = String(Math.max(0, Math.floor((Date.now() - state.lastSentAt) / 1000)));
        return this.msg.autoSaveOn.replace('{ago}', ago).replace('{pending}', String(state.pending));
    }

    private _syncAutoSaveClock(running: boolean): void {
        if (!running) {
            if (!this._autoSaveTimer) return;
            clearInterval(this._autoSaveTimer);
            this._autoSaveTimer = 0;
            return;
        }
        if (this._autoSaveTimer) return;
        this._autoSaveTimer = window.setInterval(() => { this.requestUpdate(); }, 1000);
    }

    private _renderLocal(model: IPanelModel, edited: mls.stor.IFileInfo[], busy: boolean) {
        const files = model.local.files;
        const heading = `${this.msg.localTitle}: ${this._countLabel(model.local.count)}${this._namesSuffix(files.map((file) => file.shortPath).join(', '))}`;
        return html`
            <div class=${blockClass}>
                <div class="font-semibold">${heading}</div>
                <p>${this._autoSaveLine()}</p>
                ${files.length === 0
                    ? html`<p class="text-gray-400 dark:text-gray-600">${this.msg.noLocal}</p>`
                    : html`<div class="flex flex-col gap-0.5">
                        ${files.map((file, index) => this._renderLocalFile(file, edited[index], busy))}
                    </div>`}
                ${this._blocked.length
                    ? html`<p class="text-amber-700 dark:text-amber-300">${this.msg.blocked}</p>
                        <div class="flex flex-col gap-0.5">${this._blocked.map((file) => html`<div>${fileLabel(file)}</div>`)}</div>`
                    : nothing}
                <div class="flex flex-wrap gap-3">
                    <button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onSave(); }}>${this.msg.save}</button>
                </div>
            </div>
        `;
    }

    private _renderLocalFile(edit: ILocalEdit, file: mls.stor.IFileInfo | undefined, busy: boolean) {
        return html`
            <div class="flex items-center gap-3">
                <span>${edit.shortPath}</span>
                ${edit.hasError ? html`<span class="text-amber-700 dark:text-amber-300">${this.msg.withError}</span>` : nothing}
                <button
                    class=${actionClass}
                    ?disabled=${busy || !file}
                    @click=${() => { if (file) void this._onUndoLocal(file, edit.shortPath); }}
                >${this.msg.undoLocal}</button>
            </div>
        `;
    }

    private _renderDraft(model: IPanelModel, busy: boolean) {
        const current = this._current;
        const heading = `${this.msg.draftTitle.replace('{slug}', this._slug)}: ${this._countLabel(model.draft.count)}${this._namesSuffix(model.draft.files.join(', '))}`;
        return html`
            <div class=${blockClass}>
                <div class="font-semibold">${heading}</div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.branch}</span><span>${current?.branch ?? this._branch ?? ''}</span></div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.ahead}</span><span>${current ? current.ahead : ''}</span></div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.behind}</span><span>${current ? current.behind : ''}</span></div>
                ${model.draft.files.length === 0
                    ? html`<p class="text-gray-400 dark:text-gray-600">${this.msg.noFiles}</p>`
                    : html`<div class="flex flex-col gap-0.5">${model.draft.files.map((file) => html`<div>${file}</div>`)}</div>`}
                <div class="flex flex-wrap gap-3">
                    <button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onPublish(); }}>${this.msg.publish}</button>
                    <button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onDiscard(); }}>${this.msg.discard}</button>
                    <button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onSetDefault(); }}>${this.msg.makeDefault}</button>
                    ${current && current.behind > 0
                        ? html`<button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onSyncPublished(); }}>${this.msg.syncPublished}</button>`
                        : nothing}
                </div>
            </div>
        `;
    }

    private _renderPublished(model: IPanelModel) {
        const published = model.published;
        const heading = `${this.msg.publishedTitle}: ${this._countLabel(published.count)}${this._namesSuffix(published.files.join(', '))}`;
        return html`
            <div class=${blockClass}>
                <div class="font-semibold">${heading}</div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.release}</span><span>${published.release ?? ''}</span></div>
                ${published.files.length === 0
                    ? html`<p class="text-gray-400 dark:text-gray-600">${this.msg.noPublished}</p>`
                    : html`<div class="flex flex-col gap-0.5">${published.files.map((file) => html`<div>${file}</div>`)}</div>`}
            </div>
        `;
    }

    private _renderOthers(busy: boolean) {
        return html`
            <div class="others flex flex-col gap-3 px-4 py-4">
                <div class="text-[9px] font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-200">${this.msg.others}</div>
                ${this._others.length === 0
                    ? html`<p class="no-files">${this.msg.noOthers}</p>`
                    : this._others.map((item) => this._renderOther(item, busy))}
            </div>
        `;
    }

    private _renderOther(item: IListedDraft, busy: boolean) {
        const slug = slugForBranch(item.branch);
        const files = item.files ?? [];
        return html`
            <div class="other flex flex-col gap-3">
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.branch}</span><span>${item.branch}</span></div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.ahead}</span><span>${item.ahead}</span></div>
                <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.behind}</span><span>${item.behind}</span></div>
                <div class="font-semibold">${this.msg.touched}</div>
                ${files.length
                    ? html`<div class="flex flex-col gap-0.5">${files.map((file) => html`<div>${file}</div>`)}</div>`
                    : html`<p class="text-gray-400 dark:text-gray-600">${this.msg.noFiles}</p>`}
                <div class="flex flex-wrap gap-3">
                    <button class=${actionClass} ?disabled=${busy} @click=${() => { void this._onView(item.branch); }}>${this.msg.view}</button>
                    <button
                        class=${actionClass}
                        ?disabled=${busy || slug === null}
                        title=${slug === null ? this.msg.experimentDisabled : nothing}
                        @click=${() => { if (slug) this._onExperiment(slug); }}
                    >${this.msg.experiment}</button>
                    <button disabled title=${this.msg.bringDisabled}>${this.msg.bring}</button>
                </div>
                ${this._diffBranch === item.branch && this._diffText !== null
                    ? html`<pre class="diff">${this._diffText || this.msg.noDiff}</pre>`
                    : nothing}
            </div>
        `;
    }

    private _pingText(): string {
        if (this._ping?.rebuilding) return this.msg.rebuilding;
        if (this._ping?.promoting) return this.msg.promoting;
        return this.msg.promoting;
    }

    private _project(): number | undefined {
        const project = mls.actualProject;
        if (!project) {
            console.error('[serviceDraft] mls.actualProject is empty');
            this._error = this.msg.noProject;
            this._phase = 'error';
            return undefined;
        }
        return project;
    }

    private async _load(keepBlocked = false): Promise<void> {
        if (this._phase === 'publishing') return;
        if (!keepBlocked) this._blocked = [];
        this._error = '';
        this._errorFiles = [];
        this._note = '';
        this._diffText = null;
        this._diffBranch = '';
        this._phase = 'loading';
        const project = this._project();
        if (!project) return;
        this._projectId = project;

        let driver: IDriverView | null;
        try {
            driver = await mls.stor.others.getDefaultDriver(project);
        } catch (err) {
            console.error('[serviceDraft] getDefaultDriver failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        this._driver = driver;
        this._driverChecked = true;
        if (!isVmDriver(driver)) {
            this._phase = 'idle';
            return;
        }

        const slug = readDraftCookie(document.cookie ?? '') ?? `team-${project}`;
        this._slug = slug;
        const branch = branchForSlug(slug);
        this._branch = branch;
        if (!branch) console.warn('[serviceDraft] slug is not a draft slug:', slug);
        this.menu.title = slug;
        this.menu.updateTitle?.();

        try {
            const panel = await loadPanel(fetchImpl, project, slug);
            this._current = panel.current;
            this._others = panel.others;
            if (!panel.current) console.warn('[serviceDraft] listDrafts has no row for', slug);
        } catch (err) {
            console.error('[serviceDraft] loadPanel failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        await this._readRelease();
        this._phase = 'idle';
    }

    private async _readRelease(): Promise<void> {
        const release = collabReleaseApi();
        if (!release) {
            console.error('[serviceDraft] collabRelease is not installed');
            this._releaseId = null;
            return;
        }
        try {
            const ping = await release();
            this._releaseId = releaseIdOf(ping);
        } catch (err) {
            console.error('[serviceDraft] ping failed:', err);
            this._releaseId = null;
        }
    }

    private _askComment(): string | undefined {
        const comment = prompt(this.msg.askComment);
        if (comment === null) return undefined;
        const trimmed = comment.trim();
        if (!trimmed) {
            console.warn('[serviceDraft] empty message');
            this._error = this.msg.emptyComment;
            this._phase = 'error';
            return undefined;
        }
        return trimmed;
    }

    private async _onSave(): Promise<void> {
        const project = this._projectId;
        if (!project || !isVmDriver(this._driver)) return;
        const comment = this._askComment();
        if (!comment) return;
        const files = collectEditedFiles(mls.stor.files, project);
        if (files.length === 0) {
            console.warn('[serviceDraft] no edited files to save');
            this._blocked = [];
            this._error = this.msg.noFiles;
            this._phase = 'error';
            return;
        }
        try {
            const saved = await saveToDraft(
                files,
                comment,
                (clean, text) => mls.stor.setContents(clean, text),
                (file) => afterDraftSave(file),
            );
            this._blocked = saved.blocked;
            if (saved.blocked.length > 0) {
                console.warn('[serviceDraft] blocked files:', saved.blocked.map(fileLabel));
            }
        } catch (err) {
            console.error('[serviceDraft] save failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        await this._load(true);
    }

    private async _onUndoLocal(file: mls.stor.IFileInfo, shortPath: string): Promise<void> {
        if (!confirm(this.msg.confirmUndo.replace('{file}', shortPath))) return;
        try {
            await mls.stor.localStor.setContent(file, { content: null });
            file.status = 'nochange';
        } catch (err) {
            console.error('[serviceDraft] undo local failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        this.requestUpdate();
    }

    private async _onPublish(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        const release = collabReleaseApi();
        if (!release) {
            console.error('[serviceDraft] collabRelease is not installed');
            this._error = this.msg.noReleaseHelper;
            this._phase = 'error';
            return;
        }
        const comment = this._askComment();
        if (!comment) return;
        this._error = '';
        this._errorFiles = [];
        this._ping = null;
        this._phase = 'publishing';
        this._startPing();
        const draftFiles = this._current ? this._current.files : [];
        try {
            const result = await publish({
                fetchImpl,
                waitForNew: () => release.waitForNew({
                    onTick: (ping) => {
                        this._ping = readPing(ping);
                        this._releaseId = releaseIdOf(ping);
                    },
                }),
                reload: () => location.reload(),
                rememberPublished: (record) => {
                    try {
                        sessionStorage.setItem(publishedStorageKey(project), JSON.stringify(record));
                    } catch (err) {
                        console.error('[serviceDraft] sessionStorage write failed:', err);
                    }
                },
            }, project, this._slug, comment, draftFiles);
            if (result.outcome === 'conflict') {
                console.error('[serviceDraft] promote conflict:', result.files);
                this._error = this.msg.conflict;
                this._errorFiles = result.files;
                this._phase = 'error';
                return;
            }
            if (result.outcome === 'nothing') {
                console.warn('[serviceDraft] nothing to promote');
                this._error = this.msg.nothingToPromote;
                this._phase = 'error';
                return;
            }
        } catch (err) {
            console.error('[serviceDraft] publish failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        } finally {
            this._stopPing();
        }
    }

    private async _onView(branch: string): Promise<void> {
        const project = this._projectId;
        if (!project || !isVmDriver(this._driver)) return;
        try {
            const text = await viewDiff(fetchImpl, project, branch);
            this._diffBranch = branch;
            this._diffText = text;
            this._error = '';
            this._errorFiles = [];
            if (this._phase === 'error') this._phase = 'idle';
        } catch (err) {
            console.error('[serviceDraft] draftDiff failed:', err);
            this._diffText = null;
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        }
    }

    private _onExperiment(slug: string): void {
        if (!isVmDriver(this._driver)) return;
        try {
            experimentDraft({
                setCookie: (cookie) => { document.cookie = cookie; },
                reload: () => location.reload(),
            }, slug, location.protocol === 'https:');
        } catch (err) {
            console.error('[serviceDraft] experiment failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        }
    }

    private async _readConfigJson(project: number): Promise<string> {
        const key = mls.stor.getKeyToFile({ project, level: 5, shortName: 'config', folder: '', extension: '.json' });
        const file = mls.stor.files[key];
        if (!file) {
            console.error('[serviceDraft] l5/config.json is not in stor:', key);
            throw new Error(this.msg.configMissing);
        }
        const content = await file.getContent();
        if (typeof content !== 'string') {
            console.error('[serviceDraft] l5/config.json content is not text');
            throw new Error(this.msg.configMissing);
        }
        return content;
    }

    private async _onSetDefault(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        this._note = '';
        try {
            const current = await this._readConfigJson(project);
            await saveDefaultDraft(
                current,
                project,
                this._slug,
                'studio.defaultDraft',
                (id, shortName, content, comment) => saveL5File(id, shortName, content, comment),
            );
            this._note = this.msg.defaultSaved;
            this._error = '';
            if (this._phase === 'error') this._phase = 'idle';
        } catch (err) {
            console.error('[serviceDraft] default draft save failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        }
    }

    private async _onDiscard(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        if (!confirm(this.msg.confirmDiscard)) return;
        try {
            await discard({
                fetchImpl,
                reload: () => location.reload(),
            }, project, this._slug);
        } catch (err) {
            console.error('[serviceDraft] discard failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        }
    }

    private async _onSyncPublished(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        try {
            await syncWithPublished({
                fetchImpl,
                reload: () => location.reload(),
            }, project, this._slug);
        } catch (err) {
            console.error('[serviceDraft] draft sync failed:', err);
            const message = err instanceof Error ? err.message : String(err);
            const conflictPrefix = 'DRAFT_CONFLICT: ';
            this._error = message.startsWith(conflictPrefix)
                ? this.msg.syncConflict.replace('{files}', message.slice(conflictPrefix.length))
                : message;
            this._phase = 'error';
        }
    }

    private _startPing(): void {
        const release = collabReleaseApi();
        if (!release) return;
        const tick = async (): Promise<void> => {
            if (this._phase !== 'publishing') return;
            try {
                const ping = await release();
                if (this._phase === 'publishing') {
                    this._ping = readPing(ping);
                    this._releaseId = releaseIdOf(ping);
                }
            } catch (err) {
                console.error('[serviceDraft] ping failed:', err);
            }
        };
        void tick();
        this._pingTimer = window.setInterval(() => { void tick(); }, 1000);
    }

    private _stopPing(): void {
        if (!this._pingTimer) return;
        clearInterval(this._pingTimer);
        this._pingTimer = 0;
    }
}
