/// <mls fileReference="_102020_/l2/aura/plugins/selectAssetsMedia.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { deleteFile } from '/_102027_/l2/libStor.js';
import { notifyAssetChanged } from '/_102033_/l2/cbe/studioAssets.js';
import {
    ACCEPT_ATTR, MAX_UPLOAD_BYTES, assetUrl, assetsLocation, categoryOf, checkUpload, formatSize,
    hasImagePreview, isProjectMediaFile,
    type IAssetsLocation, type MediaCategory,
} from '/_102020_/l2/aura/plugins/helpers/assetsMediaCore.js';
import '/_102020_/l2/aura/plugins/navHeader.js';
import { offerTour, startTour } from '/_102020_/l2/aura/studio/studioTour.js';
import { ASSETS_TOUR } from '/_102020_/l2/aura/studio/studioTours.js';
import { t as tStudio } from '/_102020_/l2/aura/studio/studioMessages.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    category: 'Assets',
    title: 'Media',
    desc: 'Images, icons, fonts, video and audio of the project, shared by every module.',
    searchPlaceholder: 'Search files…',
    addBtn: 'Add',
    uploadSelected: 'Selected file',
    savedAs: 'Saved as',
    uploadBtn: 'Upload',
    clearBtn: 'Clear',
    replaceAsk: 'A file with this name already exists. Replace it?',
    replaceBtn: 'Replace',
    errName: 'The file name has no usable letters or no extension.',
    errExtension: 'This file type is not accepted here.',
    errSize: 'The file is larger than {max}.',
    errSave: 'Could not save the file.',
    errDelete: 'Could not delete the file.',
    noProject: 'Open a project to see its media.',
    noFiles: 'No media files in this project yet.',
    emptyHint: 'Upload images, icons and fonts of the project. Then use them in a molecule or in the Design System.',
    emptyAdd: 'Upload the first file',
    noResults: 'No files match your search.',
    catAll: 'All',
    catImage: 'Images',
    catIcon: 'Icons',
    catVideo: 'Video',
    catAudio: 'Audio',
    catFont: 'Fonts',
    catDocument: 'Documents',
    catOther: 'Other',
    deleteConfirm: 'Click again to delete',
    copyUrl: 'Copy URL',
    copied: 'Copied',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        category: 'Assets',
        title: 'Mídia',
        desc: 'Imagens, ícones, fontes, vídeo e áudio do projeto, comuns a todos os módulos.',
        searchPlaceholder: 'Buscar arquivos…',
        addBtn: 'Adicionar',
        uploadSelected: 'Arquivo selecionado',
        savedAs: 'Salvo como',
        uploadBtn: 'Enviar',
        clearBtn: 'Limpar',
        replaceAsk: 'Já existe um arquivo com este nome. Substituir?',
        replaceBtn: 'Substituir',
        errName: 'O nome do arquivo não tem letras utilizáveis ou não tem extensão.',
        errExtension: 'Este tipo de arquivo não é aceito aqui.',
        errSize: 'O arquivo é maior que {max}.',
        errSave: 'Não foi possível salvar o arquivo.',
        errDelete: 'Não foi possível excluir o arquivo.',
        noProject: 'Abra um projeto para ver a mídia dele.',
        noFiles: 'Nenhum arquivo de mídia neste projeto ainda.',
        emptyHint: 'Envie imagens, ícones e fontes do projeto. Depois é só usar numa molécula ou no Design System.',
        emptyAdd: 'Enviar o primeiro arquivo',
        noResults: 'Nenhum arquivo corresponde à sua busca.',
        catAll: 'Todos',
        catImage: 'Imagens',
        catIcon: 'Ícones',
        catVideo: 'Vídeo',
        catAudio: 'Áudio',
        catFont: 'Fontes',
        catDocument: 'Documentos',
        catOther: 'Outros',
        deleteConfirm: 'Clique de novo para excluir',
        copyUrl: 'Copiar URL',
        copied: 'Copiado',
    },
    es: {
        category: 'Assets',
        title: 'Medios',
        desc: 'Imágenes, iconos, fuentes, video y audio del proyecto, comunes a todos los módulos.',
        searchPlaceholder: 'Buscar archivos…',
        addBtn: 'Agregar',
        uploadSelected: 'Archivo seleccionado',
        savedAs: 'Guardado como',
        uploadBtn: 'Subir',
        clearBtn: 'Limpiar',
        replaceAsk: 'Ya existe un archivo con este nombre. ¿Reemplazarlo?',
        replaceBtn: 'Reemplazar',
        errName: 'El nombre del archivo no tiene letras utilizables o no tiene extensión.',
        errExtension: 'Este tipo de archivo no se acepta aquí.',
        errSize: 'El archivo es mayor que {max}.',
        errSave: 'No se pudo guardar el archivo.',
        errDelete: 'No se pudo eliminar el archivo.',
        noProject: 'Abra un proyecto para ver sus medios.',
        noFiles: 'Todavía no hay archivos multimedia en este proyecto.',
        emptyHint: 'Suba imágenes, íconos y fuentes del proyecto. Luego úselos en una molécula o en el Design System.',
        emptyAdd: 'Subir el primer archivo',
        noResults: 'Ningún archivo coincide con su búsqueda.',
        catAll: 'Todos',
        catImage: 'Imágenes',
        catIcon: 'Iconos',
        catVideo: 'Video',
        catAudio: 'Audio',
        catFont: 'Fuentes',
        catDocument: 'Documentos',
        catOther: 'Otros',
        deleteConfirm: 'Haga clic de nuevo para eliminar',
        copyUrl: 'Copiar URL',
        copied: 'Copiado',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

type ViewMode = 'list' | 'preview' | 'grid';

interface IMediaFile {
    key: string;
    shortName: string;
    extension: string;
    folder: string;
    category: MediaCategory;
}

interface IPendingUpload {
    file: File;
    shortName: string;
    extension: string;
    category: MediaCategory;
    /** Key of the stor file with the same name, when one exists: the upload asks before replacing it. */
    existingKey: string | null;
}

const MY_SLOT = 1;
const ASSETS_MIN = 1;
const ASSETS_MAX = 3;

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-assets-media-102020')
export class PluginSelectAssetsMedia extends StateLitElement {

    /** Passed by the Assets knob like its sibling tabs; media is per project, so it is not used here. */
    @property({ attribute: false }) selectedModule: IModule | null = null;
    @property({ attribute: false }) device: number | null = null;

    @state() private _files: IMediaFile[] = [];
    @state() private _search: string = '';
    @state() private _viewMode: ViewMode = 'list';
    @state() private _activeCategory: MediaCategory | 'all' = 'all';
    @state() private _pending: IPendingUpload | null = null;
    @state() private _uploadLoading: boolean = false;
    @state() private _uploadPreviewUrl: string | null = null;
    @state() private _error: string | null = null;
    @state() private _deleteConfirm: string | null = null;
    @state() private _copiedKey: string | null = null;
    @state() private _thumbs: Map<string, string> = new Map();

    /** Bumped on every list load, so a slow thumbnail read of an older list never lands. */
    private _loadToken = 0;

    connectedCallback() {
        super.connectedCallback();
        this._loadFiles();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._revokePreview();
        this._revokeThumbs();
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    /** Where the project's media lives, or null with no project open. */
    private get _location(): IAssetsLocation | null {
        const project = getAuraState().actualProject;
        return project ? assetsLocation(project) : null;
    }

    // ─── Listing ─────────────────────────────────────────────────────

    private _loadFiles() {
        this._revokeThumbs();
        this._files = [];
        const loc = this._location;
        if (!loc) return;

        const all: IMediaFile[] = Object.entries(mls.stor.files)
            .filter(([_, f]) => isProjectMediaFile(f, loc.project))
            .map(([key, f]) => ({
                key,
                shortName: f.shortName ?? '',
                extension: (f.extension ?? '').toLowerCase(),
                folder: f.folder ?? '',
                category: categoryOf(f.extension ?? ''),
            }));

        this._files = all.sort((a, b) =>
            `${a.shortName}${a.extension}`.localeCompare(`${b.shortName}${b.extension}`)
        );
        void this._loadThumbs(++this._loadToken);
    }

    /** Real thumbnails for images and svg, read from the stor (works before the file is published). */
    private async _loadThumbs(token: number) {
        for (const f of this._files) {
            if (!hasImagePreview(f.category)) continue;
            const sf = mls.stor.files[f.key];
            if (!sf) continue;
            let content: string | Blob | null = null;
            try { content = await sf.getContent(); } catch { content = null; }
            if (token !== this._loadToken) return;
            const blob = typeof content === 'string'
                ? (f.extension === '.svg' ? new Blob([content], { type: 'image/svg+xml' }) : null)
                : content;
            if (!blob) continue;
            const next = new Map(this._thumbs);
            next.set(f.key, URL.createObjectURL(blob));
            this._thumbs = next;
        }
    }

    private _revokeThumbs() {
        for (const url of this._thumbs.values()) URL.revokeObjectURL(url);
        this._thumbs = new Map();
        this._loadToken++;
    }

    private get _filtered(): IMediaFile[] {
        const q = this._search.toLowerCase();
        return this._files.filter(f => {
            if (this._activeCategory !== 'all' && f.category !== this._activeCategory) return false;
            if (!q) return true;
            return `${f.shortName}${f.extension}`.toLowerCase().includes(q);
        });
    }

    private get _counts(): Record<MediaCategory | 'all', number> {
        const c = { all: this._files.length, image: 0, icon: 0, video: 0, audio: 0, font: 0, document: 0, other: 0 };
        for (const f of this._files) c[f.category]++;
        return c;
    }

    createRenderRoot() { return this; }

    render() {
        return html`
            <div class="flex flex-col gap-3">
                <div class="flex items-start gap-1.5">
                    <aura--plugins--nav-header-102020
                        class="flex-1 min-w-0"
                        data-tour="assets-nav"
                        .fixedLabel=${this.msg.category}
                        .itemName=${this.msg.title}
                        .desc=${this.msg.desc}
                        .value=${MY_SLOT}
                        .min=${ASSETS_MIN}
                        .max=${ASSETS_MAX}
                        @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                    ></aura--plugins--nav-header-102020>
                    <button type="button"
                        class="shrink-0 mt-0.5 w-6 h-6 rounded-full border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 cursor-pointer"
                        title=${tStudio('tour.help')}
                        aria-label=${tStudio('tour.help')}
                        @click=${() => startTour(ASSETS_TOUR)}>?</button>
                </div>

                ${this._location ? html`
                    ${this._renderToolbar()}
                    ${this._error ? this._renderError() : nothing}
                    ${this._pending ? this._renderUploadArea() : nothing}
                    ${this._files.length > 0 ? this._renderCategoryTabs() : nothing}
                    ${this._renderContent()}
                ` : html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noProject}</span>`}
            </div>
        `;
    }

    // The first time the media are on screen, their tour is offered (once per version: studioTour remembers).
    private _tourOffered = false;

    updated(changed: Map<string, unknown>) {
        super.updated(changed);
        if (this._tourOffered || !this._location) return;
        this._tourOffered = true;
        setTimeout(() => offerTour(ASSETS_TOUR, { busy: !!this._pending || this._uploadLoading }), 800);
    }

    // ─── Toolbar ─────────────────────────────────────────────────────

    private _renderToolbar() {
        return html`
            <div class="flex items-center gap-1.5" data-tour="assets-toolbar">
                <input
                    type="text"
                    .value=${this._search}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        flex-1 min-w-0 text-sm px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                />
                ${this._renderViewToggle()}
                <button
                    data-tour="assets-add"
                    class="
                        shrink-0 flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-md
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors cursor-pointer whitespace-nowrap
                    "
                    @click=${() => this._openFilePicker()}
                >
                    ${this._svgPlus()}
                    ${this.msg.addBtn}
                </button>
                <input type="file" style="display:none" id="_media_file_input"
                    accept=${ACCEPT_ATTR}
                    @change=${(e: Event) => this._onFileSelected(e)}
                />
            </div>
        `;
    }

    private _renderViewToggle() {
        const btn = (mode: ViewMode, icon: unknown) => html`
            <button
                class="p-1.5 rounded transition-colors cursor-pointer
                    ${this._viewMode === mode
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                        : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'}
                "
                @click=${() => { this._viewMode = mode; }}
            >${icon}</button>
        `;
        return html`
            <div class="flex items-center gap-0.5 rounded-md border border-gray-200 dark:border-gray-700 p-0.5">
                ${btn('list', this._svgList())}
                ${btn('preview', this._svgListPreview())}
                ${btn('grid', this._svgGrid())}
            </div>
        `;
    }

    private _renderError() {
        return html`
            <div class="flex items-start gap-2 rounded-md border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-900/20 px-2.5 py-2">
                <span class="flex-1 text-sm text-red-600 dark:text-red-300">${this._error}</span>
                <button
                    class="shrink-0 p-0.5 rounded text-red-400 hover:text-red-600 dark:hover:text-red-200 cursor-pointer"
                    @click=${() => { this._error = null; }}
                >${this._svgX()}</button>
            </div>
        `;
    }

    // ─── Upload Area ─────────────────────────────────────────────────

    private _renderUploadArea() {
        const p = this._pending!;
        const finalName = `${p.shortName}${p.extension}`;
        const renamed = finalName !== p.file.name;
        const replacing = p.existingKey !== null;
        return html`
            <div class="
                rounded-lg border border-indigo-200 dark:border-indigo-700/50
                bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2.5 flex flex-col gap-2.5
            ">
                <div class="flex items-start gap-3">
                    <div class="
                        shrink-0 w-12 h-12 rounded-md overflow-hidden
                        bg-white dark:bg-gray-800
                        border border-indigo-100 dark:border-indigo-800
                        flex items-center justify-center
                    ">
                        ${this._uploadPreviewUrl
                            ? html`<img src=${this._uploadPreviewUrl} class="w-full h-full object-contain" />`
                            : html`<span class="text-indigo-400 dark:text-indigo-500">${this._svgCategoryIcon(p.category, 24)}</span>`}
                    </div>
                    <div class="flex flex-col flex-1 min-w-0 gap-0.5">
                        <span class="text-xs font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">
                            ${this.msg.uploadSelected}
                        </span>
                        <span class="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">${p.file.name}</span>
                        ${renamed ? html`
                            <span class="text-xs text-gray-500 dark:text-gray-400 truncate">
                                ${this.msg.savedAs} <span class="font-mono">${finalName}</span>
                            </span>
                        ` : nothing}
                        <div class="flex items-center gap-1.5">
                            ${this._renderExtBadge(p.extension)}
                            <span class="text-xs text-gray-400 dark:text-gray-500">${formatSize(p.file.size)}</span>
                        </div>
                    </div>
                    <button
                        class="shrink-0 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                        @click=${() => this._clearUpload()}
                    >${this._svgX()}</button>
                </div>
                ${replacing ? html`
                    <span class="text-sm text-amber-700 dark:text-amber-300">${this.msg.replaceAsk}</span>
                ` : nothing}
                <div class="flex justify-end gap-2">
                    <button
                        class="text-sm px-2.5 py-1 rounded-md text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                        @click=${() => this._clearUpload()}
                    >${this.msg.clearBtn}</button>
                    <button
                        class="
                            flex items-center gap-1.5 text-sm px-3 py-1 rounded-md transition-colors
                            ${this._uploadLoading
                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                                : replacing
                                    ? 'bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 cursor-pointer'
                                    : 'bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer'}
                        "
                        ?disabled=${this._uploadLoading}
                        @click=${() => void this._handleUpload()}
                    >
                        ${this._uploadLoading ? this._svgSpinner() : ''}
                        ${replacing ? this.msg.replaceBtn : this.msg.uploadBtn}
                    </button>
                </div>
            </div>
        `;
    }

    // ─── Category Tabs ────────────────────────────────────────────────

    private _renderCategoryTabs() {
        const counts = this._counts;
        const cats: Array<{ key: MediaCategory | 'all'; label: string }> = [
            { key: 'all' as const,   label: this.msg.catAll   },
            { key: 'image' as const, label: this.msg.catImage },
            { key: 'icon' as const,  label: this.msg.catIcon  },
            { key: 'video' as const, label: this.msg.catVideo },
            { key: 'audio' as const, label: this.msg.catAudio },
            { key: 'font' as const,  label: this.msg.catFont  },
            { key: 'document' as const, label: this.msg.catDocument },
            { key: 'other' as const, label: this.msg.catOther },
        ].filter(c => c.key === 'all' || counts[c.key as MediaCategory] > 0);

        return html`
            <div class="flex items-center gap-1 flex-wrap" data-tour="assets-categories">
                ${cats.map(c => html`
                    <button
                        class="
                            flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors cursor-pointer
                            ${this._activeCategory === c.key
                                ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}
                        "
                        @click=${() => { this._activeCategory = c.key; }}
                    >
                        ${c.label}
                        <span class="font-mono opacity-70">${counts[c.key]}</span>
                    </button>
                `)}
            </div>
        `;
    }

    // ─── Content ─────────────────────────────────────────────────────

    private _renderContent() {
        if (this._files.length === 0) {
            return html`
                <div data-tour="assets-files" class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 px-4 py-5 flex flex-col items-center gap-2 text-center">
                    <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">${this.msg.noFiles}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500">${this.msg.emptyHint}</span>
                    <button type="button"
                        class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
                        @click=${() => this._openFilePicker()}>${this.msg.emptyAdd}</button>
                </div>`;
        }
        const filtered = this._filtered;
        if (filtered.length === 0) {
            return html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`;
        }
        const view = this._viewMode === 'grid' ? this._renderGrid(filtered)
            : this._viewMode === 'preview' ? this._renderListPreview(filtered)
            : this._renderListShort(filtered);
        return html`<div data-tour="assets-files">${view}</div>`;
    }

    private _urlOf(f: IMediaFile): string {
        return assetUrl(this._location?.project ?? 0, f.folder, f.shortName, f.extension);
    }

    private _renderThumb(f: IMediaFile, iconSize: number) {
        const url = this._thumbs.get(f.key);
        if (url) return html`<img src=${url} alt="" class="w-full h-full object-contain" />`;
        return html`<span class="text-gray-400 dark:text-gray-500">${this._svgCategoryIcon(f.category, iconSize)}</span>`;
    }

    private _renderListShort(files: IMediaFile[]) {
        return html`
            <div class="flex flex-col">
                ${files.map(f => html`
                    <div class="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors group">
                        <span class="shrink-0 text-gray-400 dark:text-gray-500">
                            ${this._svgCategoryIcon(f.category, 14)}
                        </span>
                        <span class="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate" title=${this._urlOf(f)}>
                            ${f.shortName}${f.extension}
                        </span>
                        ${this._renderExtBadge(f.extension)}
                        ${this._renderCopyBtn(f)}
                        ${this._renderDeleteBtn(f.key)}
                    </div>
                `)}
            </div>
        `;
    }

    private _renderListPreview(files: IMediaFile[]) {
        return html`
            <div class="flex flex-col gap-1">
                ${files.map(f => html`
                    <div class="
                        flex items-center gap-2.5 px-2.5 py-2 rounded-lg
                        border border-gray-200 dark:border-gray-800
                        bg-gray-50 dark:bg-gray-900/50
                        hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors group
                    ">
                        <div class="
                            shrink-0 w-10 h-10 rounded-md overflow-hidden
                            bg-gray-200 dark:bg-gray-700
                            flex items-center justify-center
                        ">
                            ${this._renderThumb(f, 20)}
                        </div>
                        <div class="flex flex-col flex-1 min-w-0">
                            <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate" title=${this._urlOf(f)}>
                                ${f.shortName}${f.extension}
                            </span>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                ${this._renderExtBadge(f.extension)}
                            </div>
                        </div>
                        ${this._renderCopyBtn(f)}
                        ${this._renderDeleteBtn(f.key)}
                    </div>
                `)}
            </div>
        `;
    }

    private _renderGrid(files: IMediaFile[]) {
        return html`
            <div class="grid grid-cols-2 gap-2">
                ${files.map(f => html`
                    <div class="
                        flex flex-col rounded-xl
                        border border-gray-200 dark:border-gray-800
                        bg-white dark:bg-gray-900
                        overflow-hidden
                        hover:shadow-md dark:hover:shadow-black/30 transition-shadow group
                    ">
                        <div class="flex items-center justify-center bg-gray-100 dark:bg-gray-800/80 h-20 p-1">
                            ${this._renderThumb(f, 32)}
                        </div>
                        <div class="flex items-start gap-1 px-2 py-1.5">
                            <div class="flex-1 min-w-0">
                                <span class="text-xs font-medium text-gray-700 dark:text-gray-300 truncate block" title=${this._urlOf(f)}>
                                    ${f.shortName}${f.extension}
                                </span>
                            </div>
                            ${this._renderCopyBtn(f)}
                        ${this._renderDeleteBtn(f.key)}
                        </div>
                    </div>
                `)}
            </div>
        `;
    }

    // ─── Shared pieces ────────────────────────────────────────────────

    private _renderCopyBtn(f: IMediaFile) {
        const copied = this._copiedKey === f.key;
        return html`
            <button
                title=${copied ? this.msg.copied : this.msg.copyUrl}
                aria-label=${this.msg.copyUrl}
                class="
                    shrink-0 p-1 rounded transition-all cursor-pointer
                    ${copied
                        ? 'text-emerald-500 dark:text-emerald-400'
                        : 'opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400'}
                "
                @click=${(e: Event) => { e.stopPropagation(); void this._copyUrl(f); }}
            >${copied ? this._svgCheck() : this._svgCopy()}</button>
        `;
    }

    private async _copyUrl(f: IMediaFile) {
        const url = this._urlOf(f);
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Clipboard API refused (permissions / insecure context): the textarea fallback still works.
            const area = document.createElement('textarea');
            area.value = url;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
        }
        this._copiedKey = f.key;
        setTimeout(() => { if (this._copiedKey === f.key) this._copiedKey = null; }, 1500);
    }

    private _renderDeleteBtn(key: string) {
        const isPending = this._deleteConfirm === key;
        return html`
            <button
                title=${isPending ? this.msg.deleteConfirm : ''}
                class="
                    shrink-0 p-1 rounded transition-all cursor-pointer
                    ${isPending
                        ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400'}
                "
                @click=${(e: Event) => { e.stopPropagation(); this._handleDeleteClick(key); }}
            >${this._svgTrash()}</button>
        `;
    }

    private _renderExtBadge(ext: string) {
        return html`
            <span class="
                shrink-0 text-[10px] font-mono font-semibold px-1 py-0.5 rounded
                bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase
            ">${ext.replace('.', '')}</span>
        `;
    }

    // ─── Upload ──────────────────────────────────────────────────────

    private _openFilePicker() {
        const input = this.querySelector<HTMLInputElement>('#_media_file_input');
        input?.click();
    }

    private _onFileSelected(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        input.value = '';
        if (!file) return;
        this._clearUpload();
        this._error = null;

        const check = checkUpload(file);
        if (!check.ok) {
            this._error = check.reason === 'name' ? this.msg.errName
                : check.reason === 'extension' ? this.msg.errExtension
                : this.msg.errSize.replace('{max}', formatSize(MAX_UPLOAD_BYTES));
            return;
        }

        const loc = this._location;
        if (!loc) return;
        const key = mls.stor.getKeyToFiles(loc.project, loc.level, check.shortName, loc.folder, check.extension);
        const existing = mls.stor.files[key];
        this._pending = {
            file,
            shortName: check.shortName,
            extension: check.extension,
            category: check.category,
            existingKey: existing && existing.status !== 'deleted' ? key : null,
        };
        if (hasImagePreview(check.category)) this._uploadPreviewUrl = URL.createObjectURL(file);
    }

    /**
     * Writes the bytes into the stor the way the local-folder sync does: a stor entry at
     * l3/<module>/assets + the Blob in local storage. Saving / publishing then carries it like any
     * other changed file (the VM driver sends Blobs as base64).
     */
    private async _handleUpload() {
        const p = this._pending;
        const loc = this._location;
        if (!p || !loc || this._uploadLoading) return;
        this._uploadLoading = true;
        this._error = null;
        try {
            const key = mls.stor.getKeyToFiles(loc.project, loc.level, p.shortName, loc.folder, p.extension);
            let file: mls.stor.IFileInfo | undefined = mls.stor.files[key];
            if (file) {
                // Same name: replacing a file that exists only here keeps it 'new'; anything else
                // (saved, or deleted and coming back) is a change to the saved file.
                file.status = file.status === 'new' ? 'new' : 'changed';
            } else {
                file = await mls.stor.addOrUpdateFile({ ...loc, shortName: p.shortName, extension: p.extension, versionRef: '0' });
                if (!file) throw new Error(`addOrUpdateFile returned nothing for ${key}`);
                file.status = 'new';
            }
            file.updatedAt = new Date().toISOString();
            await mls.stor.localStor.setContent(file, { content: p.file, contentType: 'blob' });
            mls.events.fireFileAction('statusOrErrorChanged', file, 'left', 0);
            mls.events.fireFileAction('statusOrErrorChanged', file, 'right', 0);
            notifyAssetChanged(assetUrl(loc.project, loc.folder, p.shortName, p.extension));
            this._clearUpload();
            this._loadFiles();
        } catch (err) {
            console.error('[assets-media] upload failed', err);
            this._error = this.msg.errSave;
        } finally {
            this._uploadLoading = false;
        }
    }

    // ─── Delete ──────────────────────────────────────────────────────

    private _handleDeleteClick(key: string) {
        if (this._deleteConfirm === key) {
            void this._handleDelete(key);
        } else {
            this._deleteConfirm = key;
            setTimeout(() => {
                if (this._deleteConfirm === key) this._deleteConfirm = null;
            }, 3000);
        }
    }

    private async _handleDelete(key: string) {
        this._deleteConfirm = null;
        const file = mls.stor.files[key];
        if (!file) { this._loadFiles(); return; }
        try {
            await deleteFile(file);
            notifyAssetChanged(assetUrl(file.project, file.folder, file.shortName, file.extension));
        } catch (err) {
            console.error('[assets-media] delete failed', err);
            this._error = this.msg.errDelete;
        }
        this._loadFiles();
    }

    private _clearUpload() {
        this._revokePreview();
        this._pending = null;
        this._uploadPreviewUrl = null;
        this._uploadLoading = false;
    }

    private _revokePreview() {
        if (this._uploadPreviewUrl) URL.revokeObjectURL(this._uploadPreviewUrl);
    }

    // ─── SVG Icons ───────────────────────────────────────────────────

    private _svgCategoryIcon(cat: MediaCategory, size = 16) {
        const s = size;
        switch (cat) {
            case 'image': return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
            case 'icon':  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
            case 'video': return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 8l5-4v16l-5-4V8z"/></svg>`;
            case 'audio': return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
            case 'font':  return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`;
            default:      return html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
        }
    }

    private _svgCopy() {
        return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    }
    private _svgCheck() {
        return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    }
    private _svgPlus() {
        return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
    }
    private _svgTrash() {
        return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;
    }
    private _svgX() {
        return html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    }
    private _svgList() {
        return html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`;
    }
    private _svgListPreview() {
        return html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="5" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/><rect x="3" y="16" width="5" height="5" rx="1"/><line x1="12" y1="6.5" x2="21" y2="6.5"/><line x1="12" y1="12.5" x2="21" y2="12.5"/><line x1="12" y1="18.5" x2="21" y2="18.5"/></svg>`;
    }
    private _svgGrid() {
        return html`<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`;
    }
    private _svgSpinner() {
        return html`<div class="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0"></div>`;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-assets', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
