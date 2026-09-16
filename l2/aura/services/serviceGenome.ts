/// <mls fileReference="_102020_/l2/aura/services/serviceGenome.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { getState, setState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { AuraInitState, getAuraState, getAuraEdit, setAuraState, saveAuraProject, moduleScopeTitle, IAuraPage, type IAuraEditSelection } from '/_102020_/l2/aura/helpers/auraState.js';
import { skills as listOfGroups } from '/_102020_/l2/aura/molecules/skills/index.js';
import { replaceComponentTag } from '/_102020_/l2/aura/services/preview/previewTextEditor.js';
import { convertFileToTag, isPageFile } from '/_102020_/l2/utils.js';
import { getLastOpenedFiles, saveOpenedFile } from '/_102027_/l2/libCommom.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { routeForSource, sourceOfPageFile } from '/_102020_/l2/aura/helpers/pageRoutes.js';
import { compileAndApplyLiveUpdate } from '/_102020_/l2/aura/studio/studioLiveUpdate.js';
import { findPageElement, resolveEditTarget, targetForFile, type IStudioEditTarget } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import { currentEditHost } from '/_102033_/l2/cbe/studioEditSlot.js';

import '/_102020_/l2/aura/widgets/auraSelectKnob.js';
import '/_102020_/l2/aura/plugins/selectPage.js';
import '/_102020_/l2/aura/plugins/selectLayout.js';
import '/_102020_/l2/aura/plugins/selectLayoutRules.js';
import '/_102020_/l2/aura/plugins/selectMolecule.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
// Display-only: the "layout" knob reads UX (full name on the tooltip). Internally everything is
// still layout (config keys, folders, args). The UI (design system) knob lives at project scope
// (l6 · serviceExploreProjects) — the genome only READS the selected DS.
const message_en = {
    svcTitle: 'Genome',
    page: 'Pages',
    layout: 'UX',
    layoutFull: 'User Experience (layout)',
    molecules: 'Molecules',
    noPageSelected: 'No page selected',
    notAPage: 'Current file is not a page',
    // Why a knob is off. A dimmed control that says nothing sends the user looking for the defect in
    // the wrong place — every one of these is a different cause with a different fix.
    offNoProject: 'No project in context',
    offNoLayouts: 'This project declares no layout in project.json',
    offNoSelection: 'Nothing selected in the preview',
    offNotAMolecule: 'The selected element is not a molecule',
    offNoGroupMolecules: 'No molecule of this group was loaded (mls-102040)',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Genome',
        page: 'Páginas',
        layout: 'UX',
        layoutFull: 'User Experience (layout)',
        molecules: 'Moléculas',
        noPageSelected: 'Nenhuma página selecionada',
        notAPage: 'O arquivo atual não é uma página',
        offNoProject: 'Nenhum projeto em contexto',
        offNoLayouts: 'Este projeto não declara nenhum layout no project.json',
        offNoSelection: 'Nada selecionado no preview',
        offNotAMolecule: 'O elemento selecionado não é uma molécula',
        offNoGroupMolecules: 'Nenhuma molécula deste grupo foi carregada (mls-102040)',
    },
    es: {
        svcTitle: 'Genome',
        page: 'Páginas',
        layout: 'UX',
        layoutFull: 'User Experience (layout)',
        molecules: 'Moléculas',
        noPageSelected: 'Ninguna página seleccionada',
        notAPage: 'El archivo actual no es una página',
        offNoProject: 'Ningún proyecto en contexto',
        offNoLayouts: 'Este proyecto no declara ningún layout en project.json',
        offNoSelection: 'Nada seleccionado en la vista previa',
        offNotAMolecule: 'El elemento seleccionado no es una molécula',
        offNoGroupMolecules: 'Ninguna molécula de este grupo fue cargada (mls-102040)',
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
    /** Message key explaining why it is off — the tooltip, and the console line next to it. */
    reason?: keyof MessageType;
}

// ─── Static configs ───────────────────────────────────────────────────

const DISABLED_CONFIG = (key: string, reason?: keyof MessageType): IKnobConfig => ({
    key,
    min: 1,
    max: 1,
    labels: {},
    disabled: true,
    reason,
});

/**
 * The project whose molecules this service offers.
 *
 * Its files have to be IN `mls.stor.files` for `_getMolecules` to find anything, and the stor only
 * carries the projects of the app that is running — which does not necessarily depend on this one.
 */
const MOLECULES_PROJECT = 102040;

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-genome-102020')
export class ServiceGenome102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf568',
        state: 'foreground',
        position: 'right',
        tooltip: 'Genome',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceGenome',
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
        this._pageReloadToken += 1; // re-scan the page list on each service (re)open
        const file = await this._getActual3File();
        // BEFORE the layout knob, and that order is the fix: `_initLayoutKnob` reads the project, and
        // the project of this service is settled by the file in the l3 and the module it implies.
        // Running it first asked a question nobody had answered yet, once per service open.
        await this._trySetActualModule(file);
        await this._updateCurrentPage(file);
        await this._initLayoutKnob();
        // The DS is chosen at project scope (l5) — reconcile whatever was picked/edited there.
        await this._syncWithProjectDs();
        await this._diagnose('onServiceClick');
    }

    /** nav-3 menu title: project + module this service is acting on. Prefers the module of the
     *  page ON SCREEN (fresher than aura state, which only follows the l5 module knob) — but a
     *  folder's first segment is only a MODULE when the ACTIVE project declares it, the same
     *  guard _trySetActualModule uses. A leftover l3 file from another project would otherwise
     *  print a module that does not belong to this project. */
    private _updateMenuTitle(): void {
        const segment = (this._currentPageFile?.folder ?? '').split('/')[0];
        const fromPage = segment && this._moduleNames.includes(segment) ? segment : null;
        this.menu.title = moduleScopeTitle(fromPage);
        this.menu.updateTitle?.();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _layoutValue: number | null = 0;
    @state() private _currentPageFile: mls.stor.IFileInfo | null = null;
    @state() private _isPageContext: boolean = true;
    @state() private _moleculesValue: number | null = null;
    @state() private _selectedKnob: string = 'page';

    @state() private _pageValue: number | null = 0;
    @state() private _pageConfig: IKnobConfig = { key: 'page', min: 0, max: 1, labels: { 0: 'All', 1: '+' } };
    @state() private _pageReloadToken: number = 0;
    private _pageEntries: Array<{ name: string; file: mls.stor.IFileInfo }> = [];
    private _moduleNames: string[] = [];
    private _moduleNamesProject: number | null = null;

    @state() private _layoutConfig: IKnobConfig = DISABLED_CONFIG('layout');

    @state() private _moleculesConfig: IKnobConfig = DISABLED_CONFIG('molecules');
    @state() private _selectedMoleculeGroup: string = '';
    @state() private _selectedMoleculeGroupDescription: string = '';
    @state() private _selectedMoleculeFiles: mls.stor.IFileInfo[] = [];
    @state() private _oldSelectedTag: string = '';
    @state() private _moleculeError: string = '';
    @state() private _moleculeReplaceMode: 'selected' | 'all' = 'selected';
    @state() private _actualPage: mls.editor.IModelBase | null = null;

    // ─── Selection: TWO channels, because the surface moved ───────────
    //
    // The molecule knob was born reading `previewL3.selectedTagName`, written by the L3 preview
    // component (servicePreview). The selection now happens IN THE APP — the in-place editor
    // (studioEditor) publishes `aura.edit.selection` instead, and nobody writes the old key any more.
    // So the knob sat there disabled: not because the element was not a molecule, but because
    // nothing ever told it anything was selected.
    //
    // Both are kept. The old one still works wherever the L3 preview is still mounted, and the new
    // one carries more than a tag — the page's own file and WHICH occurrence of the tag it is, which
    // is what the swap needs to rewrite the right one.

    /** The last selection published by the in-place editor, when that is the live channel. */
    @state() private _studioSelection: IAuraEditSelection | null = null;

    handleIcaStateChange(key: string, value: any) {
        if (key === 'previewL3.selectedTagName') {
            this._studioSelection = null;
            this._oldSelectedTag = getState('previewL3.selectedTagName');
            void this._onPreviewSelectedElementChanged(value);
        }
        if (key === 'aura.edit.selection') {
            const selection = (value ?? getAuraEdit().selection) as IAuraEditSelection | null;
            this._studioSelection = selection;
            this._oldSelectedTag = selection?.tag ?? '';
            void this._onPreviewSelectedElementChanged(selection?.tag ?? '');
        }
    }

    // ─── Layout init from project.js ─────────────────────────────────

    /**
     * The project this service is acting on, and the config it declares.
     *
     * `getAuraState().actualProject` is written by the KNOBS (and seeded on studio entry), so it is
     * empty whenever nobody went through one — while `mls.actualProject` is the platform's own and is
     * always there. Reading only the first one is why the layout knob could stay disabled on a
     * perfectly normal project: the config never loaded, and nothing said so. `_loadModuleNames`, two
     * methods below, already used `mls.actualProject`; this aligns them.
     */
    private async _loadProjectConfig(): Promise<any> {
        const project = getAuraState().actualProject || mls.actualProject;
        if (!project) {
            console.warn('[serviceGenome] no project in context: the layout knob stays off');
            return null;
        }
        try {
            return await getConfigProject(project) ?? null;
        } catch (error) {
            console.warn(`[serviceGenome] could not read the config of ${project}`, error);
            return null;
        }
    }

    private async _initLayoutKnob() {
        const config = await this._loadProjectConfig();
        const layoutsMap: Record<number, { name: string }> = config?.layouts ?? {};
        const keys = Object.keys(layoutsMap).map(Number).sort((a, b) => a - b);
        if (!keys.length) {
            // It used to `return` here, leaving whatever config was there — which on the first run is
            // the disabled one, with no word about it. Two different causes, two different sentences,
            // and both on screen in the tooltip.
            this._layoutConfig = DISABLED_CONFIG('layout', config ? 'offNoLayouts' : 'offNoProject');
            console.warn(`[serviceGenome] layout knob off: ${config ? 'the project declares no layouts' : 'no project config'}`);
            // @ts-ignore
            this.requestUpdate();
            return;
        }

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

    // ─── Molecule Logic ───────────────────────────────────────────────

    /**
     * Puts the molecule project's file list in the stor before anything looks for it.
     *
     * `_getMolecules` reads `mls.stor.files`, and the stor carries the projects of the app that is
     * RUNNING. The molecules live in another project, which the app under preview does not
     * necessarily depend on — so the scan came back empty and the knob stayed off as if the element
     * were not a molecule. Same call `resolveEditTarget` makes for the page's own project:
     * idempotent, and cheap once it is there.
     */
    private async _ensureMoleculesLoaded(): Promise<void> {
        try {
            await mls.stor.server.loadProjectInfoIfNeeded(MOLECULES_PROJECT);
        } catch (error) {
            console.warn(`[serviceGenome] could not load the file list of ${MOLECULES_PROJECT}`, error);
        }
    }

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

    private async _onPreviewSelectedElementChanged(tag: string) {
        await this._ensureMoleculesLoaded();
        const isWC = this._isWebComponent(tag);
        const groupsMolecules = this._getMolecules();
        const actualGroup = this._extractGroupFromTag(tag);

        if (!isWC || !actualGroup || !groupsMolecules.get(actualGroup)) {
            // THREE causes, three sentences: nothing is selected, what is selected is not a molecule,
            // or it is one and the catalog of its group did not load. Only the middle one is about
            // the element — saying it for the third sent the user looking at their markup.
            const reason: keyof MessageType = !tag
                ? 'offNoSelection'
                : (!isWC || !actualGroup) ? 'offNotAMolecule' : 'offNoGroupMolecules';
            if (reason === 'offNoGroupMolecules') {
                console.warn(`[serviceGenome] <${tag}> is a molecule of '${actualGroup}', but no molecule of that group is in the stor`);
            }
            this._moleculesConfig = DISABLED_CONFIG('molecules', reason);
            this._moleculesValue = null;
            this._selectedMoleculeGroup = '';
            this._selectedMoleculeGroupDescription = '';
            this._selectedMoleculeFiles = [];
            this._moleculeError = '';
            if (this._selectedKnob === 'molecules') this._selectedKnob = 'layout';
            // @ts-ignore
            this.requestUpdate();
            void this._diagnose('selection changed (no molecule)');
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
        void this._diagnose('selection changed');
    }

    private async _onMoleculesChanged(value: number | null) {

        // The FILE: the in-place editor already resolved which file renders the selection, so when it
        // is the live channel that answer is used directly. The l3 route stays for the L3 preview,
        // where the selection carries no file of its own.
        const studio = this._studioSelection;
        const file = studio?.file
            ? { project: studio.file.project, shortName: studio.file.shortName, folder: studio.file.folder }
            : await this._getActual3File();
        if (!file) return;
        const storFiles = await mls.stor.getFiles({ ...file, level: 2, loadContent: false })
        // Bound to a local so the live-update call at the end of this method still knows it is there:
        // `storFiles.ts` is optional, and the assignment below narrows nothing for later statements.
        const pageStorFile = storFiles.ts;
        if (pageStorFile) this._actualPage = await pageStorFile.getOrCreateModel();

        if (!value || !this._actualPage) return;
        const selectedFile = this._selectedMoleculeFiles[value - 1];
        if (!selectedFile) return;

        this._moleculeError = '';

        const selector = this._selectorForSwap();
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
            // The replacer says exactly what went wrong (`tag not found in any template`, `oldTag and
            // newTag are the same`, …) and that was being thrown away for one sentence that fits
            // every failure and helps with none.
            this._moleculeError = result.error || 'Could not replace the molecule in the source.';
            console.warn(`[serviceGenome] molecule swap refused: ${result.error ?? '(no reason given)'}`
                + ` — ${this._oldSelectedTag} -> ${newTag}, mode ${this._moleculeReplaceMode}`);
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

        if (pageStorFile) await this._applyToRunningPage(targetForFile(pageStorFile, tsModel));

    }

    /**
     * Puts the swap in the RUNNING page, and says so when it cannot.
     *
     * WHY THIS IS NOT LEFT TO THE WATCHER. Writing the Monaco model does eventually reach the page:
     * libModel's debounce compiles and fires `statusOrErrorChanged`, which StudioLiveUpdateWatcher
     * listens to. But "eventually" is the whole problem — the knob had no way to know whether
     * anything happened, and every refusal the live update produced (the edited file registers no
     * element, the swap is not armed in this session, the compile has TypeScript errors) died inside
     * a trigger with nowhere to show it. A swap that quietly does nothing is indistinguishable from
     * one that worked, which is exactly how this went unnoticed in real use.
     *
     * The duplicate the debounce then produces costs nothing: `compileAndApplyLiveUpdate` dedups on
     * the edited source, so the second arrival answers "already applied" instead of throwing the page
     * node away and building it again.
     *
     * Silent with no host ON PURPOSE: in the L3 preview route there is no running app to update, and
     * the preview re-renders on its own.
     */
    private async _applyToRunningPage(edited: IStudioEditTarget): Promise<void> {
        const host = currentEditHost()?.host;
        if (!host) return;

        const pageEl = findPageElement(host);
        const resolved = await resolveEditTarget(host);
        if (!pageEl || !resolved.ok) return;

        const live = await compileAndApplyLiveUpdate({
            edited,
            page: resolved.target,
            pageTag: pageEl.tagName.toLowerCase(),
        });

        // The knob already has somewhere to speak: the same line the replacer's refusals use.
        this._moleculeError = live.ok ? '' : live.message;
        // @ts-ignore
        this.requestUpdate();
    }

    // ─── Diagnosis ────────────────────────────────────────────────────
    //
    // WHY A DUMP AND NOT MORE WARNINGS
    // Each knob is off for one of several reasons, and every one of them is the END of a chain: the
    // project comes from one place, the module from another, the page context from a regex over a
    // folder, the molecule list from a scan of the stor. A warning at the point of failure says WHICH
    // step gave up and nothing about the step before it — and when the failure is upstream (no
    // project, no file in the l3) the warning does not fire at all, which reads as "no log, no
    // problem". This prints the whole chain, with the values, on every entry point.
    //
    // `window.auraGenomeDiagnose()` runs it on demand: select an element, then ask.

    /** Files of a project currently in `mls.stor.files` — the scans below all depend on this. */
    private _storCount(project: number): number {
        return (Object.values(mls.stor.files) as any[])
            .filter((f) => f && f.project === project).length;
    }

    /**
     * Whether the file `getConfigProject` reads is in the stor at all.
     *
     * It returns `undefined` when the file is missing and when the content does not parse, and those
     * are different problems — this separates them without touching the lib.
     */
    private _configInStor(): boolean {
        const project = (getAuraState().actualProject || mls.actualProject) as number;
        if (!project) return false;
        return Boolean(mls.stor.files[mls.stor.getKeyToFiles(project, 5, 'project', '', '.json')]);
    }

    /** The two halves of `isPageFile`, separately — an unset module fails EVERY folder. */
    private _pageContextDetail(folder: string): Record<string, unknown> {
        const match = folder.match(/^(.+?)\/(web\/desktop|web\/mobile|android|ios)\/page\d+$/);
        return {
            folder: folder || '(none)',
            'folder looks like a page': Boolean(match),
            'module in the folder': match?.[1] ?? '(no match)',
            'mls.actualModule': mls.actualModule || '(unset)',
            'both agree': Boolean(match && match[1] === mls.actualModule),
        };
    }

    private async _diagnose(where: string): Promise<void> {
        const aura = getAuraState();
        const file = this._currentPageFile;
        const tag = this._studioSelection?.tag ?? String(getState('previewL3.selectedTagName') ?? '');
        const config = await this._loadProjectConfig();
        const groups = this._getMolecules();
        const group = this._extractGroupFromTag(tag);

        /* eslint-disable no-console */
        console.groupCollapsed(`[serviceGenome] diagnosis @ ${where}`);
        console.table({
            'mls.actualProject': { value: String(mls.actualProject ?? '(unset)') },
            'auraState.actualProject': { value: String(aura.actualProject ?? '(unset)') },
            'mls.actualModule': { value: String(mls.actualModule ?? '(unset)') },
            'modules declared (l5/project.json)': { value: this._moduleNames.join(', ') || '(none loaded)' },
            'l5/project.json in the stor': { value: String(this._configInStor()) },
            'l3 file': { value: file ? `${file.project}:${file.folder}/${file.shortName}` : '(none)' },
            'page in context': { value: String(this._isPageContext) },
        });
        console.log('page context, step by step:', this._pageContextDetail(file?.folder ?? ''));
        console.log('LAYOUT knob:', {
            'project config read': Boolean(config),
            'layouts declared': config?.layouts ? Object.keys(config.layouts).join(', ') : '(none)',
            disabled: this._layoutConfig.disabled ?? false,
            reason: this._layoutConfig.reason ?? '(none)',
            'min..max': `${this._layoutConfig.min}..${this._layoutConfig.max}`,
            value: this._layoutValue,
            'dimmed by page context': !this._isPageContext,
        });
        console.log('MOLECULES knob:', {
            'selection channel': this._studioSelection
                ? 'aura.edit.selection (in-place editor)'
                : (getState('previewL3.selectedTagName') ? 'previewL3 (l3 preview)' : '(nothing has spoken yet)'),
            'studio selection': this._studioSelection
                ? `<${this._studioSelection.tag}> #${this._studioSelection.occurrence} in ${this._studioSelection.file?.shortName ?? '(no file)'}`
                : '(none)',
            'selected tag': tag || '(nothing selected)',
            'is a web component': this._isWebComponent(tag),
            'group from the tag': group ?? '(none)',
            [`files of ${MOLECULES_PROJECT} in the stor`]: this._storCount(MOLECULES_PROJECT),
            'molecule groups found': groups.size,
            'groups (first 8)': [...groups.keys()].slice(0, 8).join(', ') || '(none)',
            'this group found': group ? Boolean(groups.get(group)) : false,
            disabled: this._moleculesConfig.disabled ?? false,
            reason: this._moleculesConfig.reason ?? '(none)',
            'dimmed by page context': !this._isPageContext,
        });
        console.groupEnd();
        /* eslint-enable no-console */
    }

    /**
     * WHICH occurrence of the tag the swap rewrites, in the shape `replaceComponentTag` reads.
     *
     * That function only looks at the last segment of the selector and pulls an `:nth-of-type(N)` out
     * of it — so a selector is, in practice, an occurrence index with CSS punctuation around it. The
     * in-place editor publishes that index directly (position among the elements with the same tag on
     * screen), and this puts it back in the shape the existing contract parses, instead of changing
     * the contract for one caller.
     *
     * THE LIMIT, and it is the same one the L3 selector always had: the index is of the ELEMENT on
     * screen, and `replaceComponentTag` uses it as an index of the occurrence in the SOURCE. One
     * source occurrence inside a `.map()` renders N elements, and the two stop lining up — out of
     * range it falls back to the first occurrence. Swapping "all" is the honest answer there, and it
     * is already an option in the panel.
     */
    private _selectorForSwap(): string | undefined {
        const studio = this._studioSelection;
        if (!studio) return getState('previewL3.selectedElement');
        if (!studio.tag) return undefined;
        return studio.occurrence > 0 ? `${studio.tag}:nth-of-type(${studio.occurrence + 1})` : studio.tag;
    }

    // ─── Knob helpers ─────────────────────────────────────────────────

    private get _knobValues(): Record<string, number | null> {
        return {
            page: this._pageValue,
            layout: this._layoutValue,
            molecules: this._moleculesValue,
        };
    }

    private _getKnobConfig(key: string): IKnobConfig {
        switch (key) {
            case 'page': return this._pageConfig;
            case 'layout': return this._layoutConfig;
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
                    this._notifySitesPage();
                    this._repaintPageForCombination();
                    this._pageReloadToken += 1; // page list re-scans for the new variation
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

    /**
     * Module names declared by the ACTIVE project, cached per project.
     *
     * THIS LIST IS WHAT SWITCHES BOTH KNOBS ON. It is the guard `_trySetActualModule` uses, so an
     * empty list means `mls.actualModule` is never set, `isPageFile` answers false for EVERY folder,
     * `_isPageContext` goes false and the layout and molecules knobs render dimmed and unclickable.
     *
     * It used to read `l2/project.js` -> `projectConfig.modules`, and that array is `[]` in every
     * real project (checked on 2026-09-11 across 102043/45/46/47/48/49/50/51): the modules live in
     * `l5/project.json`, which is where the Module knob of serviceProject reads them from, with the
     * shape `{ moduleName, backend, … }`. Two services, two sources, one of them empty by
     * construction — so this one now reads the same file as the other, and keeps the old source as a
     * fallback for whatever project still fills it in.
     */
    private async _loadModuleNames(): Promise<string[]> {
        const project = (getAuraState().actualProject || mls.actualProject) as number;
        if (!project) return [];
        if (this._moduleNamesProject === project) return this._moduleNames;

        const names: string[] = [];
        try {
            const config: any = await getConfigProject(project);
            for (const entry of (config?.modules ?? []) as any[]) {
                const name = entry?.moduleName ?? entry?.name ?? '';
                if (name) names.push(String(name));
            }
        } catch (error) {
            console.warn(`[serviceGenome] could not read the modules of ${project}`, error);
        }

        if (!names.length) {
            try {
                const mod = await import(`/_${project}_/l2/project.js`);
                for (const entry of (mod?.projectConfig?.modules ?? []) as IModule[]) {
                    if (entry?.name) names.push(entry.name);
                }
            } catch { /* the l5 answer is the one that counts; this is the fallback */ }
        }

        if (!names.length) {
            console.warn(`[serviceGenome] project ${project} declares no module: the layout and molecules knobs stay dimmed (no page context)`);
            return [];  // NOT cached: a project whose config is still loading has to be asked again
        }

        this._moduleNames = names;
        this._moduleNamesProject = project;
        return this._moduleNames;
    }

    private async _trySetActualModule(file: mls.stor.IFileInfo | null): Promise<void> {
        if (!file) return;
        const names = await this._loadModuleNames();
        const firstSegment = (file.folder ?? '').split('/')[0];
        if (!firstSegment) return;
        if (names.includes(firstSegment)) mls.setActualModule(firstSegment);
    }

    private async _updateCurrentPage(file: mls.stor.IFileInfo | null) {
        this._currentPageFile = file;
        this._updateMenuTitle(); // single choke point for the page in context
        if (!file) {
            this._actualPage = null;
            this._isPageContext = false;
            console.info('[serviceGenome] no l3 file in context: layout and molecules knobs stay off');
            return;
        }
        this._isPageContext = isPageFile(file.folder ?? '');
        // This ONE flag dims both the layout and the molecules knobs (and makes them unclickable), so
        // when it is false it has to say which half failed: `isPageFile` wants a folder shaped
        // `<module>/web/<device>/page<NN>` AND `mls.actualModule` set to that same module — an unset
        // module turns every file into "not a page".
        if (!this._isPageContext) {
            console.info(`[serviceGenome] '${file.folder}' is not a page of '${mls.actualModule || '(no module)'}': layout and molecules knobs stay off`);
        }
    }

    // ─── Repaint preview on layout/DS change ──────────────────────────

    /** Tell the runtime shell (mls.sites) which content variation is active — page21 →
     *  setPage(21). No-op until the base registers its handlers; fired even when the
     *  preview repaint is skipped (same folder), so the shell never drifts. */
    private _notifySitesPage(): void {
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        try { mls.sites.setPage(Number(`${layout}${ds}`)); } catch { /* base not registered */ }
    }

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

    /** Repaint the preview for the current layout/DS combination — ALWAYS, even when the
     *  page doesn't exist for it yet (the preview shows its own "not found" state; keeping
     *  the old variation on screen reads as if the knob change did nothing). */
    private async _repaintPageForCombination(): Promise<void> {
        const file = this._variationPageFile();
        if (!file) return;
        // Already showing this combination → nothing to repaint.
        if (this._currentPageFile && file.folder === this._currentPageFile.folder) return;
        await this._openPage(file);
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

    /**
     * Reconcile the preview with the DS picked at PROJECT scope (l6 · serviceExploreProjects).
     * The genome has no DS knob, so (re)entering the service is when we pick up whatever was
     * selected — or edited — there: a different variation folder is opened, and the SAME folder
     * is repainted anyway, since the DS tokens (and therefore global.css) may have changed.
     */
    private async _syncWithProjectDs(): Promise<void> {
        this._notifySitesPage();
        if (!this._isPageContext) return;
        const file = this._variationPageFile();
        if (!file) return;
        if (this._currentPageFile && file.folder !== this._currentPageFile.folder) {
            await this._repaintPageForCombination();
        } else {
            this._repaintCurrentPage();
        }
    }

    /** Open a page into the preview (single implementation since the Page knob moved here). */
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
        await this._navigateApp(file);
        this.requestUpdate();
    }

    /**
     * Takes the RUNNING APP to the page the knob selected.
     *
     * `_openPage` above opens the file in the l3/l4 editors — which is what the knob used to do, and
     * the whole of it: the editors changed and the app on screen stayed on whatever page it was
     * rendering. Two different things were being called "open the page".
     *
     * The app navigates by URL, and the route of each page is declared in `l5/config.json` under
     * `projects[<id>].modules[].frontend.pages[]`, keyed by the very file this knob holds (`source`).
     * The navigation itself is the SAME call the apps menu makes (`openProgramUnified`, mls-102033):
     * pushState + popstate for a page of the current app, a nav3 tab for anything else, plain
     * navigation as the fallback. Copying that logic here would be a second implementation of the
     * shell's own routing, and the two would drift.
     */
    private async _navigateApp(file: mls.stor.IFileInfo): Promise<void> {
        const route = await this._routeOfPage(file);
        if (!route) {
            console.info(`[serviceGenome] no route declared for ${file.folder}/${file.shortName}: the app stays where it is`);
            return;
        }
        try {
            const { openProgramUnified } = await import('/_102033_/l2/cbe/runtimeMessagesEnvironment.js');
            await openProgramUnified({ url: route, pageName: file.shortName });
        } catch (error) {
            console.warn('[serviceGenome] could not navigate the app', error);
        }
    }

    /** Reads `l5/config.json` out of the stor and asks `routeForSource` which route this file has. */
    private async _routeOfPage(file: mls.stor.IFileInfo): Promise<string> {
        const project = file.project || (getAuraState().actualProject || mls.actualProject) as number;
        if (!project) return '';
        const key = mls.stor.getKeyToFiles(project, 5, 'config', '', '.json');
        const configFile = mls.stor.files[key];
        if (!configFile) return '';

        let config: any;
        try {
            config = JSON.parse(String(await configFile.getContent()));
        } catch (error) {
            console.warn('[serviceGenome] l5/config.json did not parse', error);
            return '';
        }

        return routeForSource(config, project, sourceOfPageFile(file));
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
        subscribe('aura.edit.selection', this);
        await this._loadModuleNames(); // warm the guard used by the menu title — BEFORE the knob
        await this.setLastOpenedFileIfNeeded();
        await this._initLayoutKnob();
        mls.events.addEventListener([this.level], ['FileAction'], this._onFileActionGenome);
        // On demand, from the console: select an element in the preview and ask.
        (window as unknown as Record<string, unknown>).auraGenomeDiagnose = () => this._diagnose('manual');
        await this._diagnose('connectedCallback');
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        delete (window as unknown as Record<string, unknown>).auraGenomeDiagnose;
        unsubscribe('previewL3.selectedTagName', this);
        unsubscribe('aura.edit.selection', this);
        // @ts-ignore
        mls.events.removeEventListener([this.level], ['FileAction'], this._onFileActionGenome);
    }

    async firstUpdated() {
        const file = await this._getActual3File();
        await this._trySetActualModule(file);
        await this._updateCurrentPage(file);
        // Same order as onServiceClick: the module has to be set before the project config is read.
        await this._initLayoutKnob();
        await this._syncWithProjectDs();
        await this._diagnose('firstUpdated');
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
        const fullLabel = this.msg[`${key}Full` as keyof MessageType] || label; // tooltip: name in full
        // WHY it is off, under the name. `noContext` wins when both apply: with no page in context
        // the knob would not operate even if its own list were fine.
        const off = noContext
            ? (this._currentPageFile ? this.msg.notAPage : this.msg.noPageSelected)
            : (isDisabled && config.reason ? this.msg[config.reason] : '');
        const title = off ? `${fullLabel} — ${off}` : fullLabel;

        return html`
            <div title=${title} class="flex flex-col items-center gap-0.5 ${isDisabled ? 'opacity-30' : ''} ${noContext ? 'opacity-30 pointer-events-none' : ''}">
                <aura--widgets--aura-select-knob-102020
                    .min=${config.min}
                    .max=${config.max}
                    .value=${value}
                    .step=${1}
                    .active=${true}
                    .disabled=${isDisabled}
                    .selected=${isContext}
                    .showTicks=${false}
                    @knob-change=${(e: CustomEvent) => this._onKnobChange(key, e)}
                ></aura--widgets--aura-select-knob-102020>

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
                >
                    ${this._renderContextStatusArea()}
                </div>
            </div>
        `;
    }

    private _renderContextStatusArea() {
        // The page picker works without a page in context — it's how one gets selected.
        if (this._selectedKnob === 'page') return html`
            <aura--plugins--select-page-102020
                .value=${this._pageValue}
                .reloadToken=${this._pageReloadToken}
            ></aura--plugins--select-page-102020>
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
                // selectLayout). Every real layout is configurable — layout 1 included.
                const isRealLayout = !!this._layoutValue && this._layoutValue > 0 && this._layoutValue < this._layoutConfig.max;
                return html`
                    <div class="flex flex-col gap-4">
                        <aura--plugins--select-layout-102020
                            .value=${this._layoutValue}
                        ></aura--plugins--select-layout-102020>
                        ${isRealLayout ? html`
                            <aura--plugins--select-layout-rules-102020
                                .projectId=${getAuraState().actualProject}
                                .layout=${this._layoutValue}
                                .module=${mod}
                                .page=${page}
                            ></aura--plugins--select-layout-rules-102020>
                        ` : nothing}
                    </div>
                `;
            }
            case 'molecules':
                return html`
                    <aura--plugins--select-molecule-102020
                        .group=${this._selectedMoleculeGroup}
                        .description=${this._selectedMoleculeGroupDescription}
                        .files=${this._selectedMoleculeFiles}
                        .value=${this._moleculesValue}
                        .replaceMode=${this._moleculeReplaceMode}
                        .error=${this._moleculeError}
                    ></aura--plugins--select-molecule-102020>
                `;
            default:
                return nothing;
        }
    }
}
