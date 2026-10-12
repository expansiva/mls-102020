/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { saveL5File } from '/_102033_/l2/cbe/l5Save.js';
import { isVmDriver, readDraftCookie } from '/_102033_/l2/cbe/studioDraft.js';
import {
    branchForSlug,
    collectEditedFiles,
    discard,
    experimentDraft,
    loadPanel,
    publish,
    saveDefaultDraft,
    saveToDraft,
    slugForBranch,
    viewDiff,
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
    @state() private _diffBranch = '';
    @state() private _diffText: string | null = null;

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
                <button ?disabled=${busy} @click=${() => { void this._onSetDefault(); }}>${this.msg.makeDefault}</button>
            </div>
            ${this._note ? html`<p class="note">${this._note}</p>` : nothing}
            ${this._renderOthers(busy)}
        `;
    }

    private _renderOthers(busy: boolean) {
        return html`
            <div class="others">
                <div class="row"><span class="label">${this.msg.others}</span></div>
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
            <div class="other">
                <div class="row"><span class="label">${this.msg.branch}</span><span>${item.branch}</span></div>
                <div class="row"><span class="label">${this.msg.ahead}</span><span>${item.ahead}</span></div>
                <div class="row"><span class="label">${this.msg.behind}</span><span>${item.behind}</span></div>
                <div class="row"><span class="label">${this.msg.touched}</span></div>
                ${files.length
                    ? html`<ul class="files">${files.map((file) => html`<li>${file}</li>`)}</ul>`
                    : html`<p class="no-files">${this.msg.noFiles}</p>`}
                <div class="actions">
                    <button ?disabled=${busy} @click=${() => { void this._onView(item.branch); }}>${this.msg.view}</button>
                    <button
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
