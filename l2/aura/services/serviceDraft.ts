/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { isVmDriver, readDraftCookie } from '/_102033_/l2/cbe/studioDraft.js';
import {
    branchForSlug,
    collectEditedFiles,
    discard,
    loadPanel,
    publish,
    saveToDraft,
    type FetchImpl,
    type IDraftWaitResult,
    type IListedDraft,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';

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
    },
};
/// **collab_i18n_end**

interface IDriverView {
    driverVersion?: string;
    shortName?: string;
}

/** Fields `collabRelease()` may report while a promote is in flight. */
interface IDraftPing {
    promoting?: boolean;
    rebuilding?: boolean;
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
    return { promoting: ping.promoting === true, rebuilding: ping.rebuilding === true };
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
    @state() private _blocked: mls.stor.IFileInfo[] = [];
    @state() private _error = '';
    @state() private _errorFiles: string[] = [];
    @state() private _ping: IDraftPing | null = null;

    private _projectId: number | undefined;
    private _pingTimer = 0;

    connectedCallback(): void {
        super.connectedCallback();
        void this._load();
    }

    disconnectedCallback(): void {
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
            return html`<p class="not-vm">${this.msg.notVm.replace('{driver}', driver)}</p>`;
        }
        return this._renderPanel();
    }

    private _renderPanel() {
        const current = this._current;
        const branch = current?.branch ?? this._branch ?? '';
        const files = current?.files ?? [];
        const busy = this._phase === 'loading' || this._phase === 'publishing';
        return html`
            ${this._phase === 'loading' ? html`<p class="loading">${this.msg.loading}</p>` : nothing}
            ${this._phase === 'publishing' ? html`<p class="ping">${this._pingText()}</p>` : nothing}
            ${this._phase === 'error' ? html`<p class="error">${this._error}</p>` : nothing}
            ${this._errorFiles.length
                ? html`<ul class="files">${this._errorFiles.map((file) => html`<li>${file}</li>`)}</ul>`
                : nothing}
            <div class="row"><span class="label">${this.msg.slug}</span><span>${this._slug}</span></div>
            <div class="row"><span class="label">${this.msg.branch}</span><span>${branch}</span></div>
            <div class="row"><span class="label">${this.msg.ahead}</span><span>${current ? current.ahead : ''}</span></div>
            <div class="row"><span class="label">${this.msg.behind}</span><span>${current ? current.behind : ''}</span></div>
            <div class="row"><span class="label">${this.msg.touched}</span></div>
            ${files.length
                ? html`<ul class="files">${files.map((file) => html`<li>${file}</li>`)}</ul>`
                : html`<p class="no-files">${this.msg.noFiles}</p>`}
            ${this._blocked.length
                ? html`<p class="blocked">${this.msg.blocked}</p>
                    <ul class="files">${this._blocked.map((file) => html`<li>${fileLabel(file)}</li>`)}</ul>`
                : nothing}
            <div class="actions">
                <button ?disabled=${busy} @click=${() => { void this._onSave(); }}>${this.msg.save}</button>
                <button ?disabled=${busy} @click=${() => { void this._onPublish(); }}>${this.msg.publish}</button>
                <button ?disabled=${busy} @click=${() => { void this._onDiscard(); }}>${this.msg.discard}</button>
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
            if (!panel.current) console.warn('[serviceDraft] listDrafts has no row for', slug);
        } catch (err) {
            console.error('[serviceDraft] loadPanel failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        this._phase = 'idle';
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
            const saved = await saveToDraft(files, comment, (clean, text) => mls.stor.setContents(clean, text));
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
        try {
            const result = await publish({
                fetchImpl,
                waitForNew: () => release.waitForNew({
                    onTick: (ping) => { this._ping = readPing(ping); },
                }),
                reload: () => location.reload(),
            }, project, this._slug, comment);
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

    private _startPing(): void {
        const release = collabReleaseApi();
        if (!release) return;
        const tick = async (): Promise<void> => {
            if (this._phase !== 'publishing') return;
            try {
                const ping = await release();
                if (this._phase === 'publishing') this._ping = readPing(ping);
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
