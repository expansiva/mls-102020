/// <mls fileReference="_102020_/l2/serviceGenome.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { AuraInitState, getAuraState, setAuraState, saveAuraProject, IAuraPage } from '/_102020_/l2/auraState.js';
import { skills as listOfGroups } from '/_102020_/l2/skills/molecules/index.js';
import { replaceComponentTag } from '/_102020_/l2/previewTextEditor.js';
import { convertFileToTag, isPageFile } from '/_102020_/l2/utils.js';
import { getLastOpenedFiles, saveOpenedFile } from '/_102027_/l2/libCommom.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';

import '/_102027_/l2/collabSelectKnob.js';
import '/_102020_/l2/plugins/selectPage.js';
import '/_102020_/l2/plugins/selectLayout.js';
import '/_102020_/l2/plugins/selectLayoutRules.js';
import '/_102020_/l2/plugins/selectDesignSystem.js';
import '/_102020_/l2/plugins/selectMolecule.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Genome',
    page: 'Pages',
    layout: 'Layout',
    designSystem: 'Design System',
    molecules: 'Molecules',
    noPageSelected: 'No page selected',
    notAPage: 'Current file is not a page',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Genome',
        page: 'Páginas',
        layout: 'Layout',
        designSystem: 'Design System',
        molecules: 'Moléculas',
        noPageSelected: 'Nenhuma página selecionada',
        notAPage: 'O arquivo atual não é uma página',
    },
    es: {
        svcTitle: 'Genome',
        page: 'Páginas',
        layout: 'Layout',
        designSystem: 'Design System',
        molecules: 'Moléculas',
        noPageSelected: 'Ninguna página seleccionada',
        notAPage: 'El archivo actual no es una página',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

interface IKnobConfig {
    key: string;
    min: number;
    max: number;
    labels: Record<number, string>;
    disabled?: boolean;
}

// ─── Static configs ───────────────────────────────────────────────────

const DISABLED_CONFIG = (key: string): IKnobConfig => ({
    key,
    min: 1,
    max: 1,
    labels: {},
    disabled: true,
});

// ─── Service ─────────────────────────────────────────────────────────

@customElement('service-genome-102020')
export class ServiceGenome102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf568',
        state: 'foreground',
        position: 'right',
        tooltip: 'Genome',
        visible: true,
        widget: '_102020_serviceGenome',
        level: [3],
    };

    public onClickMain(_op: string): void { }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    async onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        this._initLayoutKnob();
        this._initDsKnob();
        this._pageReloadToken += 1; // re-scan the page list on each service (re)open
        const file = await this._getActual3File();
        await this._trySetActualModule(file);
        this._updateCurrentPage(file);
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _layoutValue: number | null = 0;
    @state() private _currentPageFile: mls.stor.IFileInfo | null = null;
    @state() private _isPageContext: boolean = true;
    @state() private _dsValue: number | null = 1;
    @state() private _moleculesValue: number | null = null;
    @state() private _selectedKnob: string = 'page';

    @state() private _pageValue: number | null = 0;
    @state() private _pageConfig: IKnobConfig = { key: 'page', min: 0, max: 1, labels: { 0: 'All', 1: '+' } };
    @state() private _pageReloadToken: number = 0;
    private _pageEntries: Array<{ name: string; file: mls.stor.IFileInfo }> = [];

    @state() private _layoutConfig: IKnobConfig = DISABLED_CONFIG('layout');
    @state() private _dsConfig: IKnobConfig = DISABLED_CONFIG('designSystem');

    @state() private _moleculesConfig: IKnobConfig = DISABLED_CONFIG('molecules');
    @state() private _selectedMoleculeGroup: string = '';
    @state() private _selectedMoleculeGroupDescription: string = '';
    @state() private _selectedMoleculeFiles: mls.stor.IFileInfo[] = [];
    @state() private _oldSelectedTag: string = '';
    @state() private _moleculeError: string = '';
    @state() private _moleculeReplaceMode: 'selected' | 'all' = 'selected';
    @state() private _actualPage: mls.editor.IModelBase | null = null;

    // ─── Preview state subscription ───────────────────────────────────

    handleIcaStateChange(key: string, value: any) {
        if (key === 'previewL3.selectedTagName') {
            this._oldSelectedTag = getState('previewL3.selectedTagName');
            this._onPreviewSelectedElementChanged(value);
        }
    }

    // ─── Layout & Design System init from project.js ─────────────────

    private async _loadProjectConfig(): Promise<any> {
        const project = getAuraState().actualProject;
        if (!project) return null;
        try {
            return await getConfigProject(project) ?? null;
        } catch { return null; }
    }

    private async _initLayoutKnob() {
        const config = await this._loadProjectConfig();
        const layoutsMap: Record<number, { name: string }> = config?.layouts ?? {};
        const keys = Object.keys(layoutsMap).map(Number).sort((a, b) => a - b);
        if (!keys.length) return;

        const labels: Record<number, string> = { 0: 'All' };
        keys.forEach(k => { labels[k] = layoutsMap[k].name; });
        // Last slot = "+ Add layout".
        const addSlot = keys[keys.length - 1] + 1;
        labels[addSlot] = '+';

        this._layoutConfig = { key: 'layout', min: 0, max: addSlot, labels };
        const stateLayout = getAuraState().actualLayout;
        this._layoutValue = (stateLayout !== null && stateLayout > 0 && stateLayout < addSlot) ? stateLayout : 0;
        // @ts-ignore
        this.requestUpdate();
    }

    private async _initDsKnob() {
        const config = await this._loadProjectConfig();
        const dsMap: Record<number, { name: string }> = config?.designSystems ?? {};
        const keys = Object.keys(dsMap).map(Number).sort((a, b) => a - b);
        if (!keys.length) return;
        const labels: Record<number, string> = { 0: 'All' };
        keys.forEach(k => { labels[k] = dsMap[k].name; });
        const customKey = keys[keys.length - 1] + 1;
        labels[customKey] = '+';
        this._onDsConfig(new CustomEvent('ds-config', {
            detail: { min: 0, max: customKey, labels },
        }));
    }

    private _onDsConfig(e: CustomEvent) {
        this._dsConfig = { key: 'designSystem', min: e.detail.min, max: e.detail.max, labels: e.detail.labels };
        const actualDs = getAuraState().actualDesignSystem;
        if (actualDs !== null && actualDs > 0 && actualDs <= e.detail.max
            && e.detail.labels[actualDs] !== '+') {
            this._dsValue = actualDs;
        } else if (this._dsValue === null || this._dsValue > this._dsConfig.max) {
            this._dsValue = 0;
        }
        // @ts-ignore
        this.requestUpdate();
    }

    // ─── Molecule Logic ───────────────────────────────────────────────

    private _getMolecules(): Map<string, any[]> {
        const files = Object.values(mls.stor.files) as any[];
        const htmlFiles = files.filter(
            (f) => f.extension === '.html' && f.folder.startsWith('molecules') && f.shortName !== 'index'
        );
        const folderMap = new Map<string, any[]>();
        for (const f of htmlFiles) {
            const key = f.folder.replace(/^molecules\//, '').toLowerCase();
            if (!folderMap.has(key)) folderMap.set(key, []);
            folderMap.get(key)!.push(f);
        }
        return folderMap;
    }

    private _isWebComponent(tag: string): boolean {
        return !!(tag && typeof tag === 'string' && tag.includes('-'));
    }

    private _extractGroupFromTag(tag: string): string | null {
        if (!tag.includes('-')) return null;
        return tag.split('-')[0];
    }

    private _onPreviewSelectedElementChanged(tag: string) {
        const isWC = this._isWebComponent(tag);
        const groupsMolecules = this._getMolecules();
        const actualGroup = this._extractGroupFromTag(tag);

        if (!isWC || !actualGroup || !groupsMolecules.get(actualGroup)) {
            this._moleculesConfig = DISABLED_CONFIG('molecules');
            this._moleculesValue = null;
            this._selectedMoleculeGroup = '';
            this._selectedMoleculeGroupDescription = '';
            this._selectedMoleculeFiles = [];
            this._moleculeError = '';
            if (this._selectedKnob === 'molecules') this._selectedKnob = 'layout';
            // @ts-ignore
            this.requestUpdate();
            return;
        }

        const widgetsFromGroup = groupsMolecules.get(actualGroup)!;
        const groupDescription = (listOfGroups as any[]).find(
            (item: any) => item.name.toLowerCase() === actualGroup
        )?.description || '';

        const labels: Record<number, string> = {};
        widgetsFromGroup.forEach((item, i) => { labels[i + 1] = item.shortName; });

        this._moleculesConfig = {
            key: 'molecules',
            min: 1,
            max: widgetsFromGroup.length,
            labels,
            disabled: false,
        };

        const currentMoleculeName = tag.replace(`${actualGroup}-`, '');
        let currentIndex = widgetsFromGroup.findIndex(
            (item) => item.shortName.toLowerCase() === currentMoleculeName.toLowerCase()
        );
        if (currentIndex === -1) {
            currentIndex = widgetsFromGroup.findIndex(
                (item) =>
                    currentMoleculeName.toLowerCase().includes(item.shortName.toLowerCase()) ||
                    item.shortName.toLowerCase().includes(currentMoleculeName.toLowerCase())
            );
        }
        if (currentIndex !== -1) {
            this._moleculesValue = currentIndex + 1;
        } else if (this._moleculesValue === null || !labels[this._moleculesValue]) {
            this._moleculesValue = 1;
        }

        this._selectedMoleculeGroup = actualGroup;
        this._selectedMoleculeGroupDescription = groupDescription;
        this._selectedMoleculeFiles = widgetsFromGroup;
        this._moleculeError = '';
        // @ts-ignore
        this.requestUpdate();
    }

    private async _onMoleculesChanged(value: number | null) {

        const file = await this._getActual3File();
        if (!file) return;
        const storFiles = await mls.stor.getFiles({ ...file, level: 2, loadContent: false })
        if (storFiles.ts) this._actualPage = await storFiles.ts.getOrCreateModel();

        if (!value || !this._actualPage) return;
        const selectedFile = this._selectedMoleculeFiles[value - 1];
        if (!selectedFile) return;

        this._moleculeError = '';

        const selector = getState('previewL3.selectedElement');
        const newTag = convertFileToTag(selectedFile);
        const tsModel = this._actualPage;
        const source = tsModel.model.getValue();

        const result = replaceComponentTag(
            this._oldSelectedTag,
            newTag,
            source,
            selector,
            this._moleculeReplaceMode
        );

        if (!result.success) {
            this._moleculeError = 'Could not replace the molecule in the source.';
            // @ts-ignore
            this.requestUpdate();
            return;
        }

        tsModel.model.pushEditOperations(
            [],
            [{ range: tsModel.model.getFullModelRange(), text: result.newSource || source }],
            () => null,
        );

        this._oldSelectedTag = newTag;
        setState('preview.pendingReselect', newTag);
        mls.editor.forceModelUpdate(tsModel.model)

    }

    // ─── Knob helpers ─────────────────────────────────────────────────

    private get _knobValues(): Record<string, number | null> {
        return {
            page: this._pageValue,
            layout: this._layoutValue,
            designSystem: this._dsValue,
            molecules: this._moleculesValue,
        };
    }

    private _getKnobConfig(key: string): IKnobConfig {
        switch (key) {
            case 'page': return this._pageConfig;
            case 'layout': return this._layoutConfig;
            case 'designSystem': return this._dsConfig;
            case 'molecules': return this._moleculesConfig;
            default: return DISABLED_CONFIG(key);
        }
    }

    private _setKnobValue(key: string, value: number | null) {
        switch (key) {
            case 'page': {
                this._pageValue = value;
                // Selecting via the knob opens the page (the plugin's cards fire
                // select-page with the file; the knob only knows the index).
                const entry = value !== null && value > 0 && value <= this._pageEntries.length
                    ? this._pageEntries[value - 1] : null;
                if (entry?.file) this._openPage(entry.file);
                break;
            }
            case 'layout':
                this._layoutValue = value;
                // Real layouts only (1..max-1); the last slot (max) is "+ Add layout".
                if (value !== null && value > 0 && value < this._layoutConfig.max) {
                    setAuraState('actualLayout', value);
                    saveAuraProject();
                    this._repaintPageForCombination();
                }
                break;
            case 'designSystem':
                this._dsValue = value;
                // The "+" slot (new DS, only at project scope) must not be persisted;
                // every real DS up to and including max is a valid selection.
                if (value !== null && value > 0 && value <= this._dsConfig.max
                    && this._dsConfig.labels[value] !== '+') {
                    setAuraState('actualDesignSystem', value);
                    saveAuraProject();
                    this._repaintPageForCombination();
                }
                break;
            case 'molecules':
                this._moleculesValue = value;
                this._onMoleculesChanged(value);
                return;
        }
        this.requestUpdate();
    }

    private async _onLayoutCreated(value: number) {
        // A new layout was persisted to project.json. Rebuild the layout knob so it
        // includes the new entry (and a fresh "+ Add" slot), then select it.
        await this._initLayoutKnob();
        this._setKnobValue('layout', value);
    }

    private async _onDsCreated(value: number) {
        // A new design system was persisted. Rebuild the DS knob (new entry + fresh "+"
        // slot), then select it.
        await this._initDsKnob();
        this._setKnobValue('designSystem', value);
    }

    private _onKnobChange(key: string, e: CustomEvent) {
        this._selectedKnob = key;
        this._setKnobValue(key, e.detail.value);
    }

    // ─── Page knob (selectPage plugin) ────────────────────────────────

    private _onPageConfig(e: CustomEvent) {
        const { min, max, labels, pages } = e.detail;
        this._pageConfig = { key: 'page', min, max, labels };
        if (pages) this._pageEntries = pages;
        this.requestUpdate();
    }

    private _onPageSelect(e: CustomEvent) {
        this._pageValue = e.detail.value;
        const file = e.detail.file as mls.stor.IFileInfo | null;
        if (file) this._openPage(file);
        this.requestUpdate();
    }

    private _onKnobClick(key: string) {
        this._selectedKnob = key;
        this.requestUpdate();
    }

    // ─── Lifecycle ────────────────────────────────────────────────────

    private async setLastOpenedFileIfNeeded() {
        if (!mls.actual[3].path) return;
        const lastFileOpened = getLastOpenedFiles(mls.actualProject || 0);
        if (!lastFileOpened || !lastFileOpened[3]) return;
        mls.actual[3].setFullName(lastFileOpened[3] as string);
    }

    private async _getActual3File(): Promise<mls.stor.IFileInfo | null> {
        const fromStore = await mls.actual[3].getStorFile() ?? null;
        if (fromStore) return fromStore;
        const path: string = mls.actual[3]?.path ?? '';
        if (!path) return null;
        const lastSlash = path.lastIndexOf('/');
        if (lastSlash < 0) return null;
        const folder = path.substring(0, lastSlash);
        const shortName = path.substring(lastSlash + 1);
        if (!folder || !shortName) return null;
        return { project: mls.actual[3].project, folder, shortName, level: 3, extension: '.ts' } as mls.stor.IFileInfo;
    }

    private async _trySetActualModule(file: mls.stor.IFileInfo | null): Promise<void> {
        if (!file) return;
        const project: number = mls.actualProject as number;
        if (!project) return;
        let modules: IModule[] = [];
        try {
            const mod = await import(`/_${project}_/l2/project.js`);
            modules = mod?.projectConfig?.modules ?? [];
        } catch { return; }
        const firstSegment = (file.folder ?? '').split('/')[0];
        if (!firstSegment) return;
        if (modules.some((m: IModule) => m.name === firstSegment)) mls.setActualModule(firstSegment);
    }

    private async _updateCurrentPage(file: mls.stor.IFileInfo | null) {
        this._currentPageFile = file;
        if (!file) {
            this._actualPage = null;
            this._isPageContext = false;
            return;
        }
        this._isPageContext = isPageFile(file.folder ?? '');

    }

    // ─── Repaint preview on layout/DS change ──────────────────────────

    /** Current page file with its variation segment (page<L><D>) set to the current layout/DS. */
    private _variationPageFile(): mls.stor.IFileInfo | null {
        const base = this._currentPageFile;
        if (!base || !base.folder) return null;
        if (!/page\d+(\/|$)/.test(base.folder)) return null; // no variation segment to swap
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        const folder = base.folder.replace(/page\d+(\/|$)/, `page${layout}${ds}$1`);
        return { ...base, folder } as mls.stor.IFileInfo;
    }

    /** If the page exists for the current layout/DS combination, open it so the preview repaints. */
    private async _repaintPageForCombination(): Promise<void> {
        const file = this._variationPageFile();
        if (!file) return;
        // Already showing this combination → nothing to repaint.
        if (this._currentPageFile && file.folder === this._currentPageFile.folder) return;
        const storFiles = await mls.stor.getFiles({ project: file.project, shortName: file.shortName, folder: file.folder, loadContent: false });
        if (!storFiles.ts) return; // combination not generated → keep the current preview
        await this._openPage(file, storFiles);
    }

    /**
     * Force the CURRENT page to re-render (e.g. after a DS save changed global.css).
     * Unlike _repaintPageForCombination, this has no "same folder" guard — it re-fires
     * the open action for the page already in view so the preview rebuilds (and re-reads
     * the regenerated global.css via buildFile).
     */
    private _repaintCurrentPage(): void {
        const file = this._currentPageFile;
        if (!file) return;
        const params: any = {
            action: 'open',
            level: mls.actualLevel,
            project: file.project,
            shortName: file.shortName,
            extension: file.extension,
            folder: file.folder,
            position: this.position,
        };
        mls.events.fire([mls.actualLevel], ['FileAction'], JSON.stringify(params), 0);
    }

    /** Open a page into the preview — mirrors servicePage._setActualPage. */
    private async _openPage(file: mls.stor.IFileInfo, storFiles?: any): Promise<void> {
        let name = `_${file.project}_${file.shortName}`;
        if (file.folder) name = `_${file.project}_${file.folder}/${file.shortName}`;
        for (const lv of [3, 4]) {
            mls.actual[lv].setFullName(name);
            mls.actual[lv][this.position as ('right' | 'left')] = file;
        }

        const files = storFiles ?? await mls.stor.getFiles({ project: file.project, shortName: file.shortName, folder: file.folder, loadContent: false });
        if ([1, 2, 3, 4].includes(mls.actualLevel) && files.ts) await createModel(files.ts);
        if ([2, 3, 4].includes(mls.actualLevel) && files.less) await createModel(files.less);
        if ([2, 3, 4].includes(mls.actualLevel) && files.html) await createModel(files.html);

        saveOpenedFile(file.project, 4, mls.actual[4].getFullName());
        saveOpenedFile(file.project, 3, mls.actual[3].getFullName());

        const pageRef: IAuraPage = { project: file.project, shortName: file.shortName, folder: file.folder, level: file.level, extension: file.extension };
        setAuraState('actualPage', pageRef);
        saveAuraProject();

        this._updateCurrentPage(file);

        const params: any = {
            action: 'open',
            level: mls.actualLevel,
            project: file.project,
            shortName: file.shortName,
            extension: file.extension,
            folder: file.folder,
            position: this.position,
        };
        mls.events.fire([mls.actualLevel], ['FileAction'], JSON.stringify(params), 0);
        this.requestUpdate();
    }

    private _onFileActionGenome = async (ev: mls.events.IEvent) => {
        if (!ev.desc) return;
        try {
            const fa = JSON.parse(ev.desc) as mls.events.IFileAction;
            if (fa.action !== 'open' || fa.position !== 'left') return;
            const file = await this._getActual3File();
            this._updateCurrentPage(file);
            this.requestUpdate();
        } catch { /* ignore */ }
    };

    async connectedCallback() {
        super.connectedCallback();
        AuraInitState();
        subscribe('previewL3.selectedTagName', this);
        this._initLayoutKnob();
        this._initDsKnob();
        await this.setLastOpenedFileIfNeeded();
        mls.events.addEventListener([this.level], ['FileAction'], this._onFileActionGenome);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        unsubscribe('previewL3.selectedTagName', this);
        // @ts-ignore
        mls.events.removeEventListener([this.level], ['FileAction'], this._onFileActionGenome);
    }

    async firstUpdated() {
        const file = await this._getActual3File();
        await this._trySetActualModule(file);
        this._updateCurrentPage(file);
    }

    // ─── Render ───────────────────────────────────────────────────────

    createRenderRoot() { return this; }

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderKnobRow()}
                ${this._renderDetailsRow()}
            </div>
        `;
    }

    // ─── Knob Row ─────────────────────────────────────────────────────

    private _renderKnobRow() {
        return html`
            <div class="
                flex items-center justify-center
                px-2 py-3
                border-b border-gray-200 dark:border-gray-800
                gap-0
            " style="--knob-scale: 0.5">
                ${this._renderKnobItem('page')}
                ${this._renderKnobItem('layout')}
                ${this._renderKnobItem('designSystem')}
                ${this._renderKnobItem('molecules')}
            </div>
        `;
    }

    private _renderKnobItem(key: string) {
        const config = this._getKnobConfig(key);
        const value = this._knobValues[key];
        const isContext = this._selectedKnob === key;
        const isDisabled = config.disabled ?? false;
        // Page is always operable (it's how a page gets selected in the first place);
        // the other knobs only make sense with a page in context.
        const noContext = key !== 'page' && !this._isPageContext;

        const label = this.msg[key as keyof MessageType] || key;

        return html`
            <div class="flex flex-col items-center gap-0.5 ${isDisabled ? 'opacity-30' : ''} ${noContext ? 'opacity-30 pointer-events-none' : ''}">
                <collab-select-knob-102027
                    .min=${config.min}
                    .max=${config.max}
                    .value=${value}
                    .step=${1}
                    .active=${true}
                    .disabled=${isDisabled}
                    .selected=${isContext}
                    .showTicks=${false}
                    @knob-change=${(e: CustomEvent) => this._onKnobChange(key, e)}
                ></collab-select-knob-102027>

                <div
                    class="flex flex-col items-center gap-0.5 cursor-pointer"
                    @click=${() => this._onKnobClick(key)}
                >
                    <span class="
                        text-[9px] font-semibold uppercase tracking-wider
                        ${isContext
                ? 'text-gray-700 dark:text-gray-200'
                : 'text-gray-400 dark:text-gray-600'}
                        transition-colors duration-200
                    ">${label}</span>

                    <div class="
                        w-full h-0.5 rounded-full
                        transition-all duration-200
                        ${isContext
                ? 'bg-cyan-400 shadow-[0_0_4px_1px_rgba(34,211,238,0.6),0_0_8px_2px_rgba(34,211,238,0.3)]'
                : 'bg-transparent'}
                    "></div>
                </div>
            </div>
        `;
    }

    // ─── Details Row ──────────────────────────────────────────────────

    private _renderDetailsRow() {
        return html`
            <div class="flex flex-col flex-1">
                <div class="flex flex-col gap-3 px-4 py-4 flex-1"
                    @select-page=${(e: CustomEvent) => this._onPageSelect(e)}
                    @page-config=${(e: CustomEvent) => this._onPageConfig(e)}
                    @select-layout=${(e: CustomEvent) => this._setKnobValue('layout', e.detail.value)}
                    @layout-created=${(e: CustomEvent) => this._onLayoutCreated(e.detail.value)}
                    @select-molecule=${(e: CustomEvent) => this._setKnobValue('molecules', e.detail.value)}
                    @molecule-replace-mode=${(e: CustomEvent) => { this._moleculeReplaceMode = e.detail.value; this.requestUpdate(); }}
                    @ds-config=${(e: CustomEvent) => this._onDsConfig(e)}
                    @select-ds=${(e: CustomEvent) => this._setKnobValue('designSystem', e.detail.value)}
                    @ds-created=${(e: CustomEvent) => this._onDsCreated(e.detail.value)}
                    @save-ds=${() => this._repaintCurrentPage()}
                >
                    ${this._renderContextStatusArea()}
                </div>
            </div>
        `;
    }

    private _renderContextStatusArea() {
        // The page picker works without a page in context — it's how one gets selected.
        if (this._selectedKnob === 'page') return html`
            <plugins--select-page-102020
                .value=${this._pageValue}
                .reloadToken=${this._pageReloadToken}
            ></plugins--select-page-102020>
        `;
        if (!this._isPageContext) return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                <span class="text-sm text-amber-600 dark:text-amber-400">
                    ${!this._currentPageFile ? this.msg.noPageSelected : this.msg.notAPage}
                </span>
            </div>
        `;
        switch (this._selectedKnob) {
            case 'layout': {
                // Rules now live on the LAYOUT. Picker (structure) + the rule cascade editor
                // for the selected layout (scope base/module/page chosen inside the editor).
                const folder = this._currentPageFile?.folder ?? '';
                const mod = folder.split('/')[0] || null;
                const page = this._currentPageFile?.shortName ?? null;
                // Real layout = 1..max-1; the last slot (max) is "+ Add layout" (handled inside
                // selectLayout). Layout 1 is the default → its rules are read-only.
                const isRealLayout = !!this._layoutValue && this._layoutValue > 0 && this._layoutValue < this._layoutConfig.max;
                return html`
                    <div class="flex flex-col gap-4">
                        <plugins--select-layout-102020
                            .value=${this._layoutValue}
                            .pageFile=${this._currentPageFile}
                        ></plugins--select-layout-102020>
                        ${isRealLayout ? html`
                            <plugins--select-layout-rules-102020
                                .projectId=${getAuraState().actualProject}
                                .layout=${this._layoutValue}
                                .module=${mod}
                                .page=${page}
                                .readOnly=${this._layoutValue === 1}
                            ></plugins--select-layout-rules-102020>
                        ` : nothing}
                    </div>
                `;
            }
            case 'designSystem':
                // Phase B — DS = styling. The editor reads/writes designSystems[ds].tokens and
                // regenerates global.css on save. Knob: 0=All, 1..N=edit, last=Add.
                return html`
                    <plugins--select-design-system-102020
                        .projectId=${getAuraState().actualProject}
                        .value=${this._dsValue}
                    ></plugins--select-design-system-102020>
                `;
            case 'molecules':
                return html`
                    <plugins--select-molecule-102020
                        .group=${this._selectedMoleculeGroup}
                        .description=${this._selectedMoleculeGroupDescription}
                        .files=${this._selectedMoleculeFiles}
                        .value=${this._moleculesValue}
                        .replaceMode=${this._moleculeReplaceMode}
                        .error=${this._moleculeError}
                    ></plugins--select-molecule-102020>
                `;
            default:
                return nothing;
        }
    }
}
