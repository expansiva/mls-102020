/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { saveL5File } from '/_102033_/l2/cbe/l5Save.js';
import { activeDraft, enterDraft, isVmDriver, postDraftEnter, requestModeChange, sendServiceWorkerMode } from '/_102033_/l2/cbe/studioDraft.js';
import { loadProjectDefinitions } from '/_102033_/l2/cbe/initStudio.js';
import { discardModuleInStudio } from '/_102020_/l2/aura/helpers/draftModuleDiscard.js';
import {
    branchForSlug,
    actionCounts,
    buildPanelTree,
    collectEditedFiles,
    discard,
    resetDraftDatabase,
    loadPanel,
    localEdits,
    rememberOpenedDraftText,
    modulePendingCount,
    panelModel,
    draftCountText,
    draftNodeActions,
    findDraftNode,
    pendingFiles,
    visibleTreeRows,
    publish,
    readPublished,
    saveDefaultDraft,
    applyDraftUpload,
    COLLAB_DRAFT_UPLOAD,
    draftBlockReason,
    formatDraftBlockReason,
    draftUploadLine,
    slugForBranch,
    syncWithPublished,
    viewDiff,
    type FetchImpl,
    type ICollabDraftUploadDetail,
    type IDraftUploadProgress,
    type IDraftWaitResult,
    type DraftNodeAction,
    type IActionCounts,
    type IDraftTreeNode,
    type IListedDraft,
    type ILocalEdit,
    type IPanelPersonInput,
    type IPendingFile,
    type IPublishedRecord,
    type IVisibleTreeRow,
    type DraftPanelLang,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';
import {
    bindDraftSaveHost,
    listedOwner,
    releaseDraftSaveHost,
    runDraftSave,
    subscribeDraftFiles,
    type IDraftSaveHost,
    type IDraftSaveOutcome,
} from '/_102020_/l2/aura/studio/studioEditTool.js';
import { lockedDraftWrite } from '/_102020_/l2/aura/studio/studioModuleLock.js';

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
    saveAll: 'Save all ({count})',
    publishAll: 'Publish ({count})',
    discardAll: 'Discard all ({count})',
    markBrowser: 'in the browser',
    markDraft: 'in the draft',
    discardModule: 'Discard this module ({count})',
    askComment: 'Message',
    confirmPublish: 'Publish your {count} changes?',
    confirmDiscard: 'Discard your {count} source changes and keep the test data?',
    resetDatabase: 'Reset test database',
    confirmResetDatabase: 'Delete the draft test data and recreate it from the seed?',
    databaseReset: 'Test database reset: {database}.',
    promoting: 'Publishing the draft…',
    rebuilding: 'Rebuilding the release…',
    blocked: 'Not saved because of errors:',
    fileTooBig: '{path} is {size}; the limit per send is {limit}. The file stays in the browser.',
    fileRefused: '{path} was not saved: {reason}.',
    uploadingPart: 'Sending {file} (part {part} of {total})',
    conflict: 'Publish conflict.',
    nothingToPromote: 'Nothing to publish.',
    emptyComment: 'A message is required.',
    noProject: 'No project is open.',
    noReleaseHelper: 'The release watcher is not available.',
    mine: 'Mine',
    unownedDrafts: 'Drafts without owner',
    team: 'Team',
    others: 'Other drafts',
    noOthers: 'No other drafts.',
    unknownPerson: 'Unknown person',
    view: 'View',
    experiment: 'Try',
    experimentDisabled: 'This draft cannot be tried: its address does not round-trip.',
    experimentFailed: 'Could not try this draft.',
    bring: 'Bring',
    bringDisabled: 'Bringing another draft is not available yet.',
    makeDefault: 'Project default',
    defaultSaved: 'Saved as the project default.',
    configMissing: 'The project config could not be read.',
    noActiveDraft: 'There is no active draft.',
    noDiff: 'No differences.',
    localTitle: 'In your browser (not saved)',
    oneFile: '{count} file',
    manyFiles: '{count} files',
    withError: 'with error',
    undoLocal: 'Undo',
    confirmUndo: 'Discard the local copy of {file}?',
    confirmDiscardModule: 'Discard {count} changes in {module}?',
    moduleDiscarded: 'Discarded module {module}.',
    draftRefInvalid: 'The published version to restore is not valid.',
    draftRefNotAncestor: 'That version is not an ancestor of this draft.',
    draftPathInvalid: 'A module path is not valid.',
    draftPathOutsideLayers: 'A module path is outside the project layers.',
    draftPathLocal: 'A module path is local-only and cannot be restored.',
    draftPathsRequired: 'The module has no paths to restore.',
    draftNotOwner: 'This draft belongs to someone else.',
    draftBadSlug: 'This draft address is not valid.',
    draftTitle: 'In draft {slug} (saved, not published)',
    publishedTitle: 'Published',
    release: 'Release',
    noLocal: 'No files in the browser.',
    noPublished: 'Nothing published from this browser yet.',
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
        saveAll: 'Salvar tudo ({count})',
        publishAll: 'Publicar ({count})',
        discardAll: 'Descartar tudo ({count})',
        markBrowser: 'no navegador',
        markDraft: 'no rascunho',
        discardModule: 'Descartar este módulo ({count})',
        askComment: 'Mensagem',
        confirmPublish: 'Publicar as suas {count} alterações?',
        confirmDiscard: 'Descartar as suas {count} alterações de fontes e manter os dados de teste?',
        resetDatabase: 'Reiniciar BD de teste',
        confirmResetDatabase: 'Apagar os dados de teste do rascunho e recriá-los com a semente?',
        databaseReset: 'BD de teste reiniciado: {database}.',
        promoting: 'Publicando o rascunho…',
        rebuilding: 'Reconstruindo a release…',
        blocked: 'Não salvos por causa de erro:',
        fileTooBig: '{path} tem {size}; o limite por envio é {limit}. O arquivo continua no navegador.',
        fileRefused: '{path} não foi salvo: {reason}.',
        uploadingPart: 'Enviando {file} (parte {part} de {total})',
        conflict: 'Conflito ao publicar.',
        nothingToPromote: 'Nada para publicar.',
        emptyComment: 'A mensagem é obrigatória.',
        noProject: 'Nenhum projeto aberto.',
        noReleaseHelper: 'O observador da release não está disponível.',
        mine: 'Meu',
        unownedDrafts: 'Rascunhos sem dono',
        team: 'Time',
        others: 'Outros rascunhos',
        noOthers: 'Nenhum outro rascunho.',
        unknownPerson: 'Pessoa desconhecida',
        view: 'Ver',
        experiment: 'Experimentar',
        experimentDisabled: 'Este rascunho não pode ser experimentado: o endereço não faz ida e volta.',
        experimentFailed: 'Não foi possível experimentar este rascunho.',
        bring: 'Trazer',
        bringDisabled: 'Trazer outro rascunho ainda não está disponível.',
        makeDefault: 'Padrão do projeto',
        defaultSaved: 'Gravado como padrão do projeto.',
        configMissing: 'Não foi possível ler o config do projeto.',
        noActiveDraft: 'Não há rascunho ativo.',
        noDiff: 'Sem diferenças.',
        localTitle: 'No seu navegador (não salvo)',
        oneFile: '{count} arquivo',
        manyFiles: '{count} arquivos',
        withError: 'com erro',
        undoLocal: 'Desfazer',
        confirmUndo: 'Descartar a cópia local de {file}?',
        confirmDiscardModule: 'Descartar {count} alterações do módulo {module}?',
        moduleDiscarded: 'Módulo {module} descartado.',
        draftRefInvalid: 'A versão publicada para restaurar não é válida.',
        draftRefNotAncestor: 'Essa versão não é ancestral deste rascunho.',
        draftPathInvalid: 'Um caminho do módulo não é válido.',
        draftPathOutsideLayers: 'Um caminho do módulo está fora das camadas do projeto.',
        draftPathLocal: 'Um caminho do módulo é só local e não pode ser restaurado.',
        draftPathsRequired: 'O módulo não tem caminhos para restaurar.',
        draftNotOwner: 'Este rascunho é de outra pessoa.',
        draftBadSlug: 'O endereço deste rascunho não é válido.',
        draftTitle: 'No rascunho {slug} (salvo, não publicado)',
        publishedTitle: 'Publicado',
        release: 'Release',
        noLocal: 'Nenhum arquivo no navegador.',
        noPublished: 'Nada publicado a partir deste navegador.',
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
        saveAll: 'Guardar todo ({count})',
        publishAll: 'Publicar ({count})',
        discardAll: 'Descartar todo ({count})',
        markBrowser: 'en el navegador',
        markDraft: 'en el borrador',
        discardModule: 'Descartar este módulo ({count})',
        askComment: 'Mensaje',
        confirmPublish: '¿Publicar sus {count} cambios?',
        confirmDiscard: '¿Descartar sus {count} cambios de fuentes y mantener los datos de prueba?',
        resetDatabase: 'Reiniciar BD de prueba',
        confirmResetDatabase: '¿Borrar los datos de prueba del borrador y recrearlos con la semilla?',
        databaseReset: 'BD de prueba reiniciado: {database}.',
        promoting: 'Publicando el borrador…',
        rebuilding: 'Reconstruyendo la release…',
        blocked: 'No se guardaron por errores:',
        fileTooBig: '{path} tiene {size}; el límite por envío es {limit}. El archivo sigue en el navegador.',
        fileRefused: '{path} no se guardó: {reason}.',
        uploadingPart: 'Enviando {file} (parte {part} de {total})',
        conflict: 'Conflicto al publicar.',
        nothingToPromote: 'Nada que publicar.',
        emptyComment: 'El mensaje es obligatorio.',
        noProject: 'No hay un proyecto abierto.',
        noReleaseHelper: 'El observador de la release no está disponible.',
        mine: 'Mío',
        unownedDrafts: 'Borradores sin dueño',
        team: 'Equipo',
        others: 'Otros borradores',
        noOthers: 'Ningún otro borrador.',
        unknownPerson: 'Persona desconocida',
        view: 'Ver',
        experiment: 'Probar',
        experimentDisabled: 'Este borrador no se puede probar: la dirección no hace ida y vuelta.',
        experimentFailed: 'No se pudo probar este borrador.',
        bring: 'Traer',
        bringDisabled: 'Traer otro borrador todavía no está disponible.',
        makeDefault: 'Predeterminado del proyecto',
        defaultSaved: 'Guardado como predeterminado del proyecto.',
        configMissing: 'No se pudo leer la config del proyecto.',
        noActiveDraft: 'No hay un borrador activo.',
        noDiff: 'Sin diferencias.',
        localTitle: 'En su navegador (no guardado)',
        oneFile: '{count} archivo',
        manyFiles: '{count} archivos',
        withError: 'con error',
        undoLocal: 'Deshacer',
        confirmUndo: '¿Descartar la copia local de {file}?',
        confirmDiscardModule: '¿Descartar {count} cambios del módulo {module}?',
        moduleDiscarded: 'Módulo {module} descartado.',
        draftRefInvalid: 'La versión publicada para restaurar no es válida.',
        draftRefNotAncestor: 'Esa versión no es antepasada de este borrador.',
        draftPathInvalid: 'Una ruta del módulo no es válida.',
        draftPathOutsideLayers: 'Una ruta del módulo está fuera de las capas del proyecto.',
        draftPathLocal: 'Una ruta del módulo es solo local y no se puede restaurar.',
        draftPathsRequired: 'El módulo no tiene rutas para restaurar.',
        draftNotOwner: 'Este borrador es de otra persona.',
        draftBadSlug: 'La dirección de este borrador no es válida.',
        draftTitle: 'En el borrador {slug} (guardado, no publicado)',
        publishedTitle: 'Publicado',
        release: 'Release',
        noLocal: 'Ningún archivo en el navegador.',
        noPublished: 'Nada publicado desde este navegador.',
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

// Same strings as the Studio header buttons. Duplicated here so this panel does not add a shared module.
const BUTTON = 'rounded-md border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm cursor-pointer'
  + ' hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed';
const BUTTON_PRIMARY = 'rounded-md bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-sm text-white cursor-pointer'
  + ' disabled:opacity-50 disabled:cursor-not-allowed';

function publishedStorageKey(project: number): string {
    return `collab-draft-published-${project}`;
}

type SiteMode = 'studio' | 'production';

function sitesModeApi(): { getMode?: () => SiteMode | undefined; setMode?: (mode: SiteMode) => Promise<void> } {
    return (mls.sites as { getMode?: () => SiteMode | undefined; setMode?: (mode: SiteMode) => Promise<void> } | undefined) ?? {};
}

let reportedMissingMode = false;

function siteMode(): SiteMode | undefined {
    const getMode = sitesModeApi().getMode;
    if (typeof getMode !== 'function') {
        if (!reportedMissingMode) {
            reportedMissingMode = true;
            console.error('[serviceDraft] mls.sites.getMode is missing');
        }
        return undefined;
    }
    return getMode();
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

const reportedFileErrors = new Set<string>();
let reportedMissingEditor = false;

function diagnosticText(messageText: unknown): string {
    if (typeof messageText === 'string') return messageText.trim();
    if (typeof messageText === 'object' && messageText !== null && 'messageText' in messageText) {
        const inner = (messageText as { messageText?: unknown }).messageText;
        return typeof inner === 'string' ? inner.trim() : '';
    }
    return '';
}

/** Compiler text of an open model. Empty when the file is not open or the editor has no message. */
function fileErrorMessage(file: mls.stor.IFileInfo): string {
    const getKeyModel = mls.editor?.getKeyModel;
    const models = mls.editor?.models;
    if (typeof getKeyModel !== 'function' || !models) {
        if (!reportedMissingEditor) {
            reportedMissingEditor = true;
            console.error('[serviceDraft] mls.editor is missing; a file error has no message');
        }
        return '';
    }
    let key = '';
    try {
        key = getKeyModel(file.project, file.shortName, file.folder, file.level);
    } catch (err) {
        console.error('[serviceDraft] could not read the model key', file.shortName, err);
        return '';
    }
    const slot = models[key];
    if (!slot) return '';
    const lines: string[] = [];
    for (const model of [slot.ts, slot.test, slot.defs]) {
        const errors = model?.compilerResults?.errors;
        if (!errors) continue;
        for (const item of errors) {
            const text = diagnosticText(item.messageText);
            if (text) lines.push(text);
        }
    }
    return lines.join('\n');
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
    private _saveHost: IDraftSaveHost | null = null;
    private _pingTimer = 0;
    private _unsubDraftFiles: (() => void) | undefined;
    @state() private _upload: IDraftUploadProgress | null = null;
    @state() private _open = new Set<string>(['draft']);
    @state() private _selected = '';

    connectedCallback(): void {
        super.connectedCallback();
        this._saveHost = {
            project: () => this._projectId,
            driver: () => this._driver,
            messages: () => this.msg,
            apply: (outcome) => this.applyDraftSave(outcome),
        };
        bindDraftSaveHost(this._saveHost);
        this._unsubDraftFiles = subscribeDraftFiles(() => { this.requestUpdate(); });
        window.addEventListener(COLLAB_DRAFT_UPLOAD, this._onDraftUpload);
        void this._load();
    }

    disconnectedCallback(): void {
        window.removeEventListener(COLLAB_DRAFT_UPLOAD, this._onDraftUpload);
        if (this._saveHost) releaseDraftSaveHost(this._saveHost);
        this._saveHost = null;
        this._unsubDraftFiles?.();
        this._unsubDraftFiles = undefined;
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

    private _toggleNode(id: string): void {
        const next = new Set(this._open);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this._open = next;
    }

    private _selectNode(id: string): void {
        this._selected = id;
    }

    private _withFileErrors(edited: readonly mls.stor.IFileInfo[], local: readonly ILocalEdit[]): ILocalEdit[] {
        return local.map((edit, index) => {
            const file = edited[index];
            if (!file || !edit.hasError) return edit;
            const error = fileErrorMessage(file);
            return error ? { ...edit, error } : edit;
        });
    }

    private _renderPanel() {
        const project = this._projectId;
        const edited = project ? collectEditedFiles(mls.stor.files, project) : [];
        const listed = project ? localEdits(mls.stor.files, project) : [];
        if (edited.length !== listed.length) {
            console.error('[serviceDraft] local list and localEdits diverged', edited.length, listed.length);
        }
        const local = this._withFileErrors(edited, listed);
        const model = panelModel({
            local,
            draft: this._current ? this._current.files : null,
            published: project ? readStoredPublished(project) : null,
            release: this._releaseId,
        });
        const mineFiles = pendingFiles(model.local.files, model.draft.files);
        const tree = buildPanelTree(this.msg.svcTitle, this._panelPeople(mineFiles), this.msg.unownedDrafts);
        const rows = visibleTreeRows([tree], this._open);
        const counts = actionCounts(model.local.files, model.draft.files);
        const byPath = new Map<string, mls.stor.IFileInfo>();
        const paired = Math.min(edited.length, local.length);
        for (let index = 0; index < paired; index += 1) {
            const edit = local[index];
            const file = edited[index];
            if (edit && file) byPath.set(edit.shortPath, file);
        }
        const busy = this._phase === 'loading' || this._phase === 'publishing';
        const uploadLine = this._upload ? draftUploadLine(this._upload, this.msg.uploadingPart) : '';
        return html`
            <div class="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderActions(counts, busy)}
                ${uploadLine ? html`<p class="px-4 py-2 text-amber-700 dark:text-amber-300">${uploadLine}</p>` : nothing}
                ${this._phase === 'loading' ? html`<p class="px-4 py-4">${this.msg.loading}</p>` : nothing}
                ${this._phase === 'publishing' ? html`<p class="px-4 py-4">${this._pingText()}</p>` : nothing}
                ${this._phase === 'error' ? html`<p class="px-4 py-4 text-amber-700 dark:text-amber-300">${this._error}</p>` : nothing}
                ${this._errorFiles.length
                    ? html`<div class="flex flex-col gap-0.5 px-4">${this._errorFiles.map((file) => html`<div>${file}</div>`)}</div>`
                    : nothing}
                ${this._blocked.length
                    ? html`<div class="flex flex-col gap-0.5 px-4 py-3">
                        <p class="text-amber-700 dark:text-amber-300">${this.msg.blocked}</p>
                        ${this._blocked.map((file) => html`<div>${this._blockedLine(file)}</div>`)}
                    </div>`
                    : nothing}
                ${this._renderTree(rows)}
                ${this._renderNodeBox(findDraftNode([tree], this._selected), busy, byPath)}
                ${this._note ? html`<p class="px-4 py-4">${this._note}</p>` : nothing}
            </div>
        `;
    }

    private _renderActions(counts: IActionCounts, busy: boolean) {
        const save = this.msg.saveAll.replace('{count}', String(counts.save));
        const publish = this.msg.publishAll.replace('{count}', String(counts.publish));
        const discard = this.msg.discardAll.replace('{count}', String(counts.discard));
        return html`
            <div class="draft-actions flex flex-wrap gap-3 px-4 py-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                <button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onSave(); }}>${save}</button>
                <button class=${BUTTON_PRIMARY} ?disabled=${busy} @click=${() => { void this._onPublish(); }}>${publish}</button>
                <button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onDiscard(); }}>${discard}</button>
                <button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onResetDatabase(); }}>${this.msg.resetDatabase}</button>
            </div>
        `;
    }

    private _renderTree(rows: readonly IVisibleTreeRow[]) {
        return html`
            <div class="draft-tree px-4 py-3">
                ${rows.map((row) => this._renderTreeRow(row))}
            </div>
        `;
    }

    private _renderTreeRow(row: IVisibleTreeRow) {
        const selected = this._selected === row.id ? 'bg-indigo-50 dark:bg-indigo-950' : '';
        return html`
            <div class="draft-tree-row ${selected}" style="padding-left: ${row.depth * 12}px">
                ${row.expandable
                    ? html`<button type="button" class="cursor-pointer" @click=${() => { this._toggleNode(row.id); }}>${this._open.has(row.id) ? '▾' : '▸'}</button>`
                    : nothing}
                <button type="button" class="text-left cursor-pointer" @click=${() => { this._selectNode(row.id); }}>${row.name} ${draftCountText(row)}</button>
            </div>
        `;
    }

    private readonly _onDraftUpload = (event: Event): void => {
        const detail = (event as CustomEvent<ICollabDraftUploadDetail>).detail;
        const next = applyDraftUpload(this._upload, detail);
        if (next === this._upload) return;
        this._upload = next;
    };

    private _panelPeople(mineFiles: readonly IPendingFile[]): IPanelPersonInput[] {
        const current = this._current;
        const mine: IPanelPersonInput = {
            id: 'mine',
            name: this.msg.mine,
            mine: true,
            branch: current?.branch ?? this._branch ?? '',
            ahead: current ? current.ahead : 0,
            behind: current ? current.behind : 0,
            files: mineFiles,
        };
        const others = [...this._others].sort((a, b) => this._personName(a).localeCompare(this._personName(b)));
        return [
            mine,
            ...others.map((item) => ({
                id: item.branch,
                name: this._personName(item),
                mine: false,
                branch: item.branch,
                ahead: item.ahead,
                behind: item.behind,
                owner: listedOwner(item),
                files: pendingFiles([], item.files ?? []),
            })),
        ];
    }

    /** Team drafts use the team label. Anyone else uses `listDrafts.owner`, never the slug. */
    private _personName(item: IListedDraft): string {
        if (item.branch.startsWith('team/')) return this.msg.team;
        return this.draftPerson(item);
    }

    private _renderNodeBox(node: IDraftTreeNode | null, busy: boolean, byPath: ReadonlyMap<string, mls.stor.IFileInfo>) {
        if (!node) return nothing;
        const actions = draftNodeActions(node);
        const info = node.kind === 'person' && node.showUnsaved;
        const fileError = node.kind === 'file' && node.withError > 0;
        if (actions.length === 0 && !info && !fileError) return nothing;
        return html`
            <div class="draft-node-box px-4 py-3 border-t border-gray-200 dark:border-gray-800">
                ${info ? html`
                    <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.branch}</span><span>${node.branch}</span></div>
                    <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.ahead}</span><span>${node.ahead}</span></div>
                    <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.behind}</span><span>${node.behind}</span></div>
                    <div class="flex items-center gap-3"><span class="text-gray-400 dark:text-gray-600">${this.msg.release}</span><span>${this._releaseId ?? ''}</span></div>
                ` : nothing}
                ${actions.length
                    ? html`<div class="flex flex-wrap gap-3">${actions.map((action) => this._renderNodeAction(action, node, busy, byPath))}</div>`
                    : nothing}
                ${fileError ? html`<p class="text-amber-700 dark:text-amber-300">${this._fileErrorLine(node)}</p>` : nothing}
                ${node.kind === 'person' && !node.showUnsaved && this._diffBranch === node.branch && this._diffText !== null
                    ? html`<pre class="diff">${this._diffText || this.msg.noDiff}</pre>`
                    : nothing}
            </div>
        `;
    }

    private _fileErrorLine(node: IDraftTreeNode): string {
        if (node.error) return node.error;
        if (!reportedFileErrors.has(node.path)) {
            reportedFileErrors.add(node.path);
            console.error('[serviceDraft] file has an error with no message', node.path || node.id);
        }
        return this.msg.withError;
    }

    private _renderNodeAction(action: DraftNodeAction, node: IDraftTreeNode, busy: boolean, byPath: ReadonlyMap<string, mls.stor.IFileInfo>) {
        if (action === 'makeDefault') {
            return html`<button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onSetDefault(); }}>${this.msg.makeDefault}</button>`;
        }
        if (action === 'syncPublished') {
            return html`<button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onSyncPublished(); }}>${this.msg.syncPublished}</button>`;
        }
        if (action === 'discardModule') {
            const label = this.msg.discardModule.replace('{count}', String(node.count));
            return html`<button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onModuleDiscard(node.name); }}>${label}</button>`;
        }
        if (action === 'undoFile') {
            const file = byPath.get(node.path);
            return html`<button class=${BUTTON} ?disabled=${busy || !file} @click=${() => { if (file) void this._onUndoLocal(file, node.path); }}>${this.msg.undoLocal}</button>`;
        }
        if (action === 'view') {
            return html`<button class=${BUTTON} ?disabled=${busy} @click=${() => { void this._onView(node.branch); }}>${this.msg.view}</button>`;
        }
        const slug = slugForBranch(node.branch);
        return html`<button
            class=${BUTTON}
            ?disabled=${busy || slug === null}
            title=${slug === null ? this.msg.experimentDisabled : nothing}
            @click=${() => { if (slug) void this._onExperiment(slug); }}
        >${this.msg.experiment}</button>`;
    }

    /** Person from `listDrafts.owner`. Never the slug. */
    private draftPerson(item: IListedDraft): string {
        return listedOwner(item) ?? this.msg.unknownPerson;
    }

    private _warnMissingOwners(items: readonly IListedDraft[]): void {
        for (const item of items) {
            if (listedOwner(item) === null) console.warn('[serviceDraft] listDrafts owner is missing');
        }
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

        const mode = siteMode();
        const active = mode === 'studio' ? activeDraft() : undefined;
        if (mode === 'studio' && !active) console.error('[serviceDraft] studio mode has no active draft');
        const slug = active ?? `team-${project}`;
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
            this._warnMissingOwners(panel.others);
            if (!panel.current) console.warn('[serviceDraft] listDrafts has no row for', slug);
        } catch (err) {
            console.error('[serviceDraft] loadPanel failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
            return;
        }
        await this._readRelease();
        await this._rememberLocalText();
        this._rememberBlockedReasons(project);
        this._phase = 'idle';
    }

    /** The unsaved count reads the open model, or the local copy when the model is closed. */
    private async _rememberLocalText(): Promise<void> {
        const opened: mls.stor.IFileInfo[] = [];
        for (const file of Object.values(mls.stor.files)) {
            if (file) opened.push(file);
        }
        await rememberOpenedDraftText(opened);
    }

    /** Sentence in the panel language. The reason itself has no language. */
    private _blockedLine(file: mls.stor.IFileInfo): string {
        const block = draftBlockReason(file);
        if (!block) return fileLabel(file);
        const key = this.getMessageKey(messages);
        const lang: DraftPanelLang = key === 'pt' || key === 'es' ? key : 'en';
        return formatDraftBlockReason(block, lang, this.msg.fileTooBig, this.msg.fileRefused);
    }

    /** A reload keeps files the auto-save refused. The reason map is filled by `saveToDraft`. */
    private _rememberBlockedReasons(project: number): void {
        const extra: mls.stor.IFileInfo[] = [];
        const seen = new Set(this._blocked);
        for (const file of Object.values(mls.stor.files)) {
            if (!file || file.project !== project || seen.has(file)) continue;
            if (!draftBlockReason(file)) continue;
            seen.add(file);
            extra.push(file);
        }
        if (extra.length === 0) return;
        this._blocked = [...this._blocked, ...extra];
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
        const saved = await runDraftSave(project, this.msg, this._driver);
        await this.applyDraftSave(saved);
    }

    /** What the panel shows after Save. The window request uses the same outcome when this panel is open. */
    private async applyDraftSave(saved: IDraftSaveOutcome): Promise<void> {
        if (saved.kind === 'idle') return;
        if (saved.kind === 'failed') {
            this._error = saved.message;
            this._phase = 'error';
            return;
        }
        if (saved.kind === 'error') {
            this._blocked = [];
            this._error = saved.message;
            this._phase = 'error';
            return;
        }
        this._blocked = saved.blocked;
        await this._load(true);
        if (saved.refused && this._phase !== 'error') {
            this._error = saved.refused;
            this._phase = 'error';
        }
    }

    private async _onUndoLocal(file: mls.stor.IFileInfo, shortPath: string): Promise<void> {
        const refused = lockedDraftWrite(file);
        if (refused) {
            this._error = refused;
            this._phase = 'error';
            return;
        }
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
        const n = this._current ? this._current.files.length : 0;
        if (!confirm(this.msg.confirmPublish.replace('{count}', String(n)))) return;
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
                storFiles: mls.stor.files,
                clearLocal: async (file) => {
                    await mls.stor.localStor.setContent(file as mls.stor.IFileInfo, { content: null });
                    file.status = 'nochange';
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

    private async _onExperiment(slug: string): Promise<void> {
        if (!isVmDriver(this._driver)) return;
        const project = this._projectId;
        if (!project) {
            console.error('[serviceDraft] experiment has no project');
            return;
        }
        const mode = siteMode();
        if (mode !== 'studio' && mode !== 'production') {
            this._error = this.msg.experimentFailed;
            this._phase = 'error';
            return;
        }
        const setMode = sitesModeApi().setMode;
        try {
            if (mode !== 'studio') {
                if (typeof setMode !== 'function') {
                    console.error('[serviceDraft] mls.sites.setMode is missing');
                    this._error = this.msg.experimentFailed;
                    this._phase = 'error';
                    return;
                }
                await setMode('studio');
                if (siteMode() !== 'studio') {
                    console.error('[serviceDraft] experiment did not enter studio');
                    this._error = this.msg.experimentFailed;
                    this._phase = 'error';
                    return;
                }
            }
            const outcome = await requestModeChange('studio', 'studio', {
                project,
                resolveDraft: async () => slug,
                enterDraft: (id, draft) => enterDraft(id, draft, { postExec: postDraftEnter }),
                sendToServiceWorker: (message) => sendServiceWorkerMode(message),
                reportError: (message) => console.error('[serviceDraft]', message),
            });
            if (outcome.mode !== 'studio' || activeDraft() !== slug) {
                console.error('[serviceDraft] experiment did not activate', slug);
                this._error = this.msg.experimentFailed;
                this._phase = 'error';
                return;
            }
            try {
                await loadProjectDefinitions(project);
            } catch (err) {
                console.error('[serviceDraft] experiment failed:', err);
                this._error = this.msg.experimentFailed;
                this._phase = 'error';
                return;
            }
            await this._load();
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

    private _moduleCount(moduleName: string): number {
        const project = this._projectId;
        if (!project) return 0;
        const local = localEdits(mls.stor.files, project);
        const draft = this._current ? this._current.files : [];
        return modulePendingCount(pendingFiles(local, draft), moduleName);
    }

    /** Known `draft.*` reasons from the restore route. Anything else stays as the server sent it. */
    private _draftReason(reason: string): string {
        const known: Record<string, string> = {
            'draft.ref_invalid': this.msg.draftRefInvalid,
            'draft.ref_not_ancestor': this.msg.draftRefNotAncestor,
            'draft.path_invalid': this.msg.draftPathInvalid,
            'draft.path_outside_layers': this.msg.draftPathOutsideLayers,
            'draft.path_local': this.msg.draftPathLocal,
            'draft.paths_required': this.msg.draftPathsRequired,
            'draft.not_owner': this.msg.draftNotOwner,
            'draft.bad_slug': this.msg.draftBadSlug,
            'draft.no_active_draft': this.msg.noActiveDraft,
            'draft.config_missing': this.msg.configMissing,
        };
        return known[reason] ?? reason;
    }

    private async _onModuleDiscard(moduleName: string): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        const count = this._moduleCount(moduleName);
        const question = this.msg.confirmDiscardModule.replace('{count}', String(count)).replace('{module}', moduleName);
        if (!confirm(question)) return;
        this._error = '';
        this._note = '';
        this._phase = 'loading';
        try {
            await discardModuleInStudio(project, moduleName);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[serviceDraft] discard module failed:', message);
            this._error = this._draftReason(message);
            this._phase = 'error';
            return;
        }
        await this._load(true);
        this._noteModuleDiscarded(moduleName);
    }

    /** `_load` clears the note. Put it back only when the refresh itself did not fail. */
    private _noteModuleDiscarded(moduleName: string): void {
        if (this._phase === 'error') return;
        this._note = this.msg.moduleDiscarded.replace('{module}', moduleName);
    }

    private async _onDiscard(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        const n = this._current ? this._current.files.length : 0;
        if (!confirm(this.msg.confirmDiscard.replace('{count}', String(n)))) return;
        try {
            await discard({
                fetchImpl,
                reload: () => location.reload(),
                storFiles: mls.stor.files,
                clearLocal: async (file) => {
                    await mls.stor.localStor.setContent(file as mls.stor.IFileInfo, { content: null });
                    file.status = 'nochange';
                },
            }, project, this._slug);
        } catch (err) {
            console.error('[serviceDraft] discard failed:', err);
            this._error = err instanceof Error ? err.message : String(err);
            this._phase = 'error';
        }
    }

    private async _onResetDatabase(): Promise<void> {
        const project = this._projectId;
        if (!project || !this._slug || !isVmDriver(this._driver)) return;
        if (!confirm(this.msg.confirmResetDatabase)) return;
        this._error = '';
        this._note = '';
        this._phase = 'loading';
        let database = '';
        try {
            const reset = await resetDraftDatabase(fetchImpl, project, this._slug);
            database = reset.database;
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error('[serviceDraft] reset test database failed:', message);
            this._error = this._draftReason(message);
            this._phase = 'error';
            return;
        }
        await this._load(true);
        this._noteDatabaseReset(database);
    }

    /** `_load` clears the note. Put it back only when the refresh itself did not fail. */
    private _noteDatabaseReset(database: string): void {
        if (this._phase === 'error') return;
        this._note = this.msg.databaseReset.replace('{database}', database);
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
