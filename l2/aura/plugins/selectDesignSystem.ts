/// <mls fileReference="_102020_/l2/aura/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { IDesignSystemTokens, DsFont, isMandatoryToken, defaultTokensTemplate, tokensCssFromTheme } from '/_102029_/l2/designSystemBase.js';
import { readThemes, writeTheme, themeDsIndex } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';
import { expandRoleStates, normalizeHex } from '/_102020_/l2/aura/helpers/dsMatch/generateDsCore.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { ITask, setTask, getTask, getTasksByScope, hasRunning, clearScope, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import { canPreview, createLivePreview } from '/_102020_/l2/aura/plugins/helpers/dsLivePreview.js';
import { collectUsedTokens, pageRegion } from '/_102020_/l2/aura/plugins/helpers/dsUsedTokens.js';
import { groupColorRows, splitState, type ColorGroup } from '/_102020_/l2/aura/plugins/helpers/dsColorGroups.js';
import { createHighlighter, elementsUsingTokens, tokensForElement } from '/_102020_/l2/aura/plugins/helpers/dsTokenInspect.js';
import { baseName, colorRowsToMap, countByKind, diffTokens, tokenStatus, valueRowsToMap, type ChangeKind, type KeyChange, type TokenMaps, type TokenSection } from '/_102020_/l2/aura/plugins/helpers/dsDiff.js';
import { parseTokenQuery, rowMatchesQuery, type SearchableRow } from '/_102020_/l2/aura/plugins/helpers/dsTokenSearch.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// DESIGN SYSTEM = the entries of `_<project>_/l2/designSystem.ts` — the SINGLE home of
// identity + styling tokens. This plugin edits those entries DIRECTLY (token names are
// free-form; a `_dark-<token>` key is the dark value of `<token>`; `fonts` declares font
// loading). l5/project.json only keeps the per-DS GENERATION config (skill/rules/…),
// correlated by `dsIndex`. The DS knob mirrors the layout knob: 0 = All, dsIndex… = edit,
// last slot = Add.

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'UI · User Interface',
    desc: 'The design systems of this project — tokens live in designSystem.ts.',
    needsProject: 'Select a project first to see its design systems.',
    allTitle: 'All Design Systems',
    allDesc: 'Design systems found in this project\'s designSystem.ts.',
    addTitle: 'New Design System',
    addDesc: 'Create a design system: name it and edit its tokens.',
    noDs: 'No design systems yet — designSystem.ts has no entries.',
    loading: 'Loading design systems…',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. sunset',
    nameRequired: 'Give the design system a name.',
    descLabel: 'Description',
    descPlaceholder: 'What this design system is for (optional)',
    colorsTitle: 'Colors',
    colorsTag: 'light / dark',
    tokenCol: 'Token',
    valueCol: 'Value',
    light: 'Light',
    dark: 'Dark',
    darkHint: 'empty = no dark value (light is used in both modes)',
    addToken: '+ Add token',
    typographyTitle: 'Typography',
    typographyTag: 'tokens',
    fontsTitle: 'Font loading',
    fontsTag: '@import / @font-face',
    fontsHint: 'Families that must be LOADED (google/custom). The family value itself is a normal typography token.',
    addFont: '+ Add font',
    fontRolePlaceholder: 'role (e.g. display)',
    fontSource: 'Source',
    fontFamily: 'Family',
    fontFamilyPlaceholder: 'Type any Google font…',
    fontFallback: 'Fallback',
    fontWeights: 'Weights',
    fontUrl: 'Font URL',
    fontUrlPlaceholder: 'https://…/font.css',
    fontUrlHint: 'Stylesheet URL (@import) or a font file. External domains must be reachable.',
    globalTitle: 'Global',
    globalTag: 'spacing · misc',
    save: 'Save design system',
    create: 'Create design system',
    saving: 'Saving…',
    saveError: 'Could not save the design system.',
    tokensSuffix: 'tokens',
    paletteTitle: 'Palette',
    paletteTag: 'brand',
    paletteHint: 'Brand colors. Click a swatch to edit, + to add, hover to remove. Used by "Generate with AI".',
    aiTitle: 'Generate with AI',
    aiTag: 'palette → tokens',
    aiHint: 'The AI maps the palette (and optional brief) to the mandatory tokens and fills this form as a draft — review and save.',
    aiBriefPlaceholder: 'optional: sophisticated law firm, dark tones, serif display…',
    aiUsePalette: 'Use the palette above as brand colors',
    aiGenerate: 'Generate',
    aiGenerating: 'Generating…',
    aiError: 'Could not generate the design system. Try again.',
    mandatoryHint: 'Mandatory token — value editable, cannot be removed.',
    aiDraftReady: 'Draft generated — review the tokens below and save.',
    followTask: 'Follow task',
    unsavedChanges: 'Unsaved changes',
    saveNow: 'Save now',
    savedOk: 'Design system saved.',
    discardDraft: 'Discard draft',
    undoChanges: 'Undo changes',
    scopeNote: 'Tokens are shared: a change here applies to every module and page of this project that uses this design system.',
    livePreviewOn: 'Live preview on — the app already shows your edits; save to keep them.',
    livePreviewOff: 'This is not the design system active in the app — edits show only after saving and activating it.',
    usedOnPage: 'Used on the current page',
    onlyUsed: 'Only tokens used on this page',
    useFont: 'Use font',
    useFontIn: 'Apply to',
    fontInUse: 'In use',
    statesLabel: 'states',
    recalcStates: 'Recalculate states',
    recalcAll: 'Recalculate all states',
    recalcNeedsHex: 'Needs a hex base color (#rrggbb) — states are derived from it.',
    recalcHint: 'Rewrites hover/focus/disabled (light and dark) from the base color.',
    searchPlaceholder: 'Search token…  (=value)',
    searchHint: 'Name substring. Start with = to search values (e.g. =#1273d4). Esc clears, Ctrl+F focuses.',
    searchOf: 'of',
    noMatch: 'No tokens match',
    viewGrouped: 'Grouped',
    viewFlat: 'List',
    viewHint: 'Grouped: one row per role, states inside. List: every token on its own row.',
    inspect: 'Inspect',
    inspectHint: 'Click an element of the page to see the tokens it reads. Esc exits.',
    inspectPick: 'Click an element of the page…',
    inspectOwn: 'Own',
    inspectInherited: 'Inherited',
    inspectNone: 'No design-system token on this element.',
    hoverHint: 'Hover a token to outline where the page uses it.',
    identityTitle: 'Identification',
    filterTitle: 'Filter tokens',
    inspectTitle: 'Inspect page',
    changedN: 'changed',
    addedN: 'new',
    removedN: 'removed',
    revertRow: 'Back to the saved value',
    removedTitle: 'Removed',
    restore: 'Restore',
    newBadge: 'new',
    diffHint: 'Show what changed',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'UI · User Interface',
        desc: 'Os design systems deste projeto — os tokens moram no designSystem.ts.',
        needsProject: 'Selecione um projeto primeiro para ver os design systems.',
        allTitle: 'Todos os Design Systems',
        allDesc: 'Design systems encontrados no designSystem.ts do projeto.',
        addTitle: 'Novo Design System',
        addDesc: 'Crie um design system: dê um nome e edite os tokens.',
        noDs: 'Nenhum design system ainda — o designSystem.ts não tem entradas.',
        loading: 'Carregando design systems…',
        nameLabel: 'Nome',
        namePlaceholder: 'ex.: sunset',
        nameRequired: 'Dê um nome ao design system.',
        descLabel: 'Descrição',
        descPlaceholder: 'Para que serve este design system (opcional)',
        colorsTitle: 'Cores',
        colorsTag: 'light / dark',
        tokenCol: 'Token',
        valueCol: 'Valor',
        light: 'Light',
        dark: 'Dark',
        darkHint: 'vazio = sem valor dark (o light vale nos dois modos)',
        addToken: '+ Adicionar token',
        typographyTitle: 'Tipografia',
        typographyTag: 'tokens',
        fontsTitle: 'Carregamento de fontes',
        fontsTag: '@import / @font-face',
        fontsHint: 'Famílias que precisam ser CARREGADAS (google/custom). O valor da família é um token normal de tipografia.',
        addFont: '+ Adicionar fonte',
        fontRolePlaceholder: 'papel (ex.: display)',
        fontSource: 'Origem',
        fontFamily: 'Família',
        fontFamilyPlaceholder: 'Digite qualquer fonte do Google…',
        fontFallback: 'Fallback',
        fontWeights: 'Pesos',
        fontUrl: 'URL da fonte',
        fontUrlPlaceholder: 'https://…/font.css',
        fontUrlHint: 'URL de stylesheet (@import) ou arquivo de fonte. O domínio externo precisa estar acessível.',
        globalTitle: 'Global',
        globalTag: 'espaçamento · outros',
        save: 'Salvar design system',
        create: 'Criar design system',
        saving: 'Salvando…',
        saveError: 'Não foi possível salvar o design system.',
        tokensSuffix: 'tokens',
        paletteTitle: 'Paleta',
        paletteTag: 'marca',
        paletteHint: 'Cores da marca. Clique num quadro para editar, + adiciona, passe o mouse para remover. Usada pelo "Gerar com IA".',
        aiTitle: 'Gerar com IA',
        aiTag: 'paleta → tokens',
        aiHint: 'A IA mapeia a paleta (e um brief opcional) para os tokens obrigatórios e preenche este formulário como rascunho — revise e salve.',
        aiBriefPlaceholder: 'opcional: escritório de advocacia sofisticado, tons escuros, display serifada…',
        aiUsePalette: 'Usar a paleta acima como cores da marca',
        aiGenerate: 'Gerar',
        aiGenerating: 'Gerando…',
        aiError: 'Não foi possível gerar o design system. Tente novamente.',
        mandatoryHint: 'Token obrigatório — valor editável, não pode ser removido.',
        aiDraftReady: 'Rascunho gerado — revise os tokens abaixo e salve.',
        followTask: 'Acompanhar task',
        unsavedChanges: 'Alterações não salvas',
        saveNow: 'Salvar agora',
        savedOk: 'Design system salvo.',
        discardDraft: 'Descartar rascunho',
        undoChanges: 'Desfazer alterações',
        scopeNote: 'Os tokens são compartilhados: alterar aqui vale para todos os módulos e páginas deste projeto que usam este design system.',
        livePreviewOn: 'Prévia ao vivo ligada — o app já mostra as alterações; salve para mantê-las.',
        livePreviewOff: 'Este não é o design system ativo no app — as alterações só aparecem depois de salvar e ativá-lo.',
        usedOnPage: 'Usado na página atual',
        onlyUsed: 'Só os usados nesta página',
        useFont: 'Usar fonte',
        useFontIn: 'Aplicar em',
        fontInUse: 'Em uso',
        statesLabel: 'estados',
        recalcStates: 'Recalcular estados',
        recalcAll: 'Recalcular todos os estados',
        recalcNeedsHex: 'Precisa de uma cor base em hex (#rrggbb) — os estados são derivados dela.',
        recalcHint: 'Reescreve hover/focus/disabled (light e dark) a partir da cor base.',
        searchPlaceholder: 'Buscar token…  (=valor)',
        searchHint: 'Parte do nome. Comece com = para buscar pelo valor (ex.: =#1273d4). Esc limpa, Ctrl+F foca.',
        searchOf: 'de',
        noMatch: 'Nenhum token encontrado',
        viewGrouped: 'Agrupado',
        viewFlat: 'Lista',
        viewHint: 'Agrupado: uma linha por papel, estados dentro. Lista: cada token na sua linha.',
        inspect: 'Inspecionar',
        inspectHint: 'Clique num elemento da página para ver os tokens que ele usa. Esc sai.',
        inspectPick: 'Clique num elemento da página…',
        inspectOwn: 'Próprios',
        inspectInherited: 'Herdados',
        inspectNone: 'Nenhum token do design system neste elemento.',
        hoverHint: 'Passe o mouse num token para contornar onde a página o usa.',
        identityTitle: 'Identificação',
        filterTitle: 'Filtrar tokens',
        inspectTitle: 'Inspecionar página',
        changedN: 'alterados',
        addedN: 'novos',
        removedN: 'removidos',
        revertRow: 'Voltar ao valor salvo',
        removedTitle: 'Removidos',
        restore: 'Restaurar',
        newBadge: 'novo',
        diffHint: 'Ver o que mudou',
    },
    es: {
        title: 'UI · User Interface',
        desc: 'Los design systems de este proyecto — los tokens viven en designSystem.ts.',
        needsProject: 'Seleccione un proyecto primero para ver sus design systems.',
        allTitle: 'Todos los Design Systems',
        allDesc: 'Design systems encontrados en el designSystem.ts del proyecto.',
        addTitle: 'Nuevo Design System',
        addDesc: 'Cree un design system: póngale nombre y edite sus tokens.',
        noDs: 'Aún no hay design systems — designSystem.ts no tiene entradas.',
        loading: 'Cargando design systems…',
        nameLabel: 'Nombre',
        namePlaceholder: 'ej.: sunset',
        nameRequired: 'Dale un nombre al design system.',
        descLabel: 'Descripción',
        descPlaceholder: 'Para qué sirve este design system (opcional)',
        colorsTitle: 'Colores',
        colorsTag: 'light / dark',
        tokenCol: 'Token',
        valueCol: 'Valor',
        light: 'Light',
        dark: 'Dark',
        darkHint: 'vacío = sin valor dark (light vale en ambos modos)',
        addToken: '+ Agregar token',
        typographyTitle: 'Tipografía',
        typographyTag: 'tokens',
        fontsTitle: 'Carga de fuentes',
        fontsTag: '@import / @font-face',
        fontsHint: 'Familias que deben CARGARSE (google/custom). El valor de la familia es un token normal de tipografía.',
        addFont: '+ Agregar fuente',
        fontRolePlaceholder: 'rol (ej.: display)',
        fontSource: 'Origen',
        fontFamily: 'Familia',
        fontFamilyPlaceholder: 'Escribe cualquier fuente de Google…',
        fontFallback: 'Fallback',
        fontWeights: 'Pesos',
        fontUrl: 'URL de la fuente',
        fontUrlPlaceholder: 'https://…/font.css',
        fontUrlHint: 'URL de stylesheet (@import) o archivo de fuente. El dominio externo debe ser accesible.',
        globalTitle: 'Global',
        globalTag: 'espaciado · otros',
        save: 'Guardar design system',
        create: 'Crear design system',
        saving: 'Guardando…',
        saveError: 'No se pudo guardar el design system.',
        tokensSuffix: 'tokens',
        paletteTitle: 'Paleta',
        paletteTag: 'marca',
        paletteHint: 'Colores de marca. Clic en un cuadro para editar, + agrega, pasa el mouse para quitar. Usada por "Generar con IA".',
        aiTitle: 'Generar con IA',
        aiTag: 'paleta → tokens',
        aiHint: 'La IA mapea la paleta (y un brief opcional) a los tokens obligatorios y llena este formulario como borrador — revisa y guarda.',
        aiBriefPlaceholder: 'opcional: bufete de abogados sofisticado, tonos oscuros, display con serifa…',
        aiUsePalette: 'Usar la paleta de arriba como colores de marca',
        aiGenerate: 'Generar',
        aiGenerating: 'Generando…',
        aiError: 'No se pudo generar el design system. Inténtalo de nuevo.',
        mandatoryHint: 'Token obligatorio — valor editable, no se puede eliminar.',
        aiDraftReady: 'Borrador generado — revise los tokens abajo y guarde.',
        followTask: 'Seguir tarea',
        unsavedChanges: 'Cambios no guardados',
        saveNow: 'Guardar ahora',
        savedOk: 'Design system guardado.',
        discardDraft: 'Descartar borrador',
        undoChanges: 'Deshacer cambios',
        scopeNote: 'Los tokens son compartidos: un cambio aquí vale para todos los módulos y páginas de este proyecto que usan este design system.',
        livePreviewOn: 'Vista previa en vivo activa — la app ya muestra los cambios; guarde para mantenerlos.',
        livePreviewOff: 'Este no es el design system activo en la app — los cambios solo aparecen después de guardarlo y activarlo.',
        usedOnPage: 'Usado en la página actual',
        onlyUsed: 'Solo los usados en esta página',
        useFont: 'Usar fuente',
        useFontIn: 'Aplicar en',
        fontInUse: 'En uso',
        statesLabel: 'estados',
        recalcStates: 'Recalcular estados',
        recalcAll: 'Recalcular todos los estados',
        recalcNeedsHex: 'Necesita un color base en hex (#rrggbb) — los estados se derivan de él.',
        recalcHint: 'Reescribe hover/focus/disabled (light y dark) a partir del color base.',
        searchPlaceholder: 'Buscar token…  (=valor)',
        searchHint: 'Parte del nombre. Empiece con = para buscar por valor (ej.: =#1273d4). Esc limpia, Ctrl+F enfoca.',
        searchOf: 'de',
        noMatch: 'Ningún token encontrado',
        viewGrouped: 'Agrupado',
        viewFlat: 'Lista',
        viewHint: 'Agrupado: una fila por rol, estados dentro. Lista: cada token en su fila.',
        inspect: 'Inspeccionar',
        inspectHint: 'Haga clic en un elemento de la página para ver los tokens que usa. Esc sale.',
        inspectPick: 'Haga clic en un elemento de la página…',
        inspectOwn: 'Propios',
        inspectInherited: 'Heredados',
        inspectNone: 'Ningún token del design system en este elemento.',
        hoverHint: 'Pase el mouse sobre un token para resaltar dónde lo usa la página.',
        identityTitle: 'Identificación',
        filterTitle: 'Filtrar tokens',
        inspectTitle: 'Inspeccionar página',
        changedN: 'cambiados',
        addedN: 'nuevos',
        removedN: 'eliminados',
        revertRow: 'Volver al valor guardado',
        removedTitle: 'Eliminados',
        restore: 'Restaurar',
        newBadge: 'nuevo',
        diffHint: 'Ver qué cambió',
    },
};
/// **collab_i18n_end**

// ─── Types ────────────────────────────────────────────────────────────

interface IDsEntry { key: number; dsIndex: string; name: string; description: string; skill: string; theme: IDesignSystemTokens; }
interface IColorRow { name: string; light: string; dark: string; }   // dark '' = no dark value
interface IValueRow { name: string; value: string; }

// Per-DS skill slot (generation config, kept in project.json — correlated by dsIndex).
const DS_SKILL_DEFAULT = '_102020_/l2/aura/agentImplementGenome/skills/genCfePageDesignSystem.ts';

const FONT_SOURCES = ['system', 'google', 'custom'];
const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'DM Sans', 'Manrope', 'Work Sans', 'Plus Jakarta Sans', 'Source Sans 3',
    'Space Grotesk', 'Bricolage Grotesque', 'Fraunces', 'Playfair Display', 'Lora', 'Merriweather',
    'JetBrains Mono', 'IBM Plex Mono',
];
const SYSTEM_FONTS = ['system-ui', 'Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Verdana', 'Courier New'];
const FALLBACKS = ['sans-serif', 'serif', 'monospace'];

// Suggested brand palette to seed the Add view (fully editable; the AI maps it to the tokens).
const STARTER_PALETTE = ['#3B82F6', '#1E293B', '#F8FAFC', '#E2E8F0', '#22C55E'];

// ─── Draft cache (module level, survives DOM re-creation) ─────────────
// An AI-generated draft is NOT persisted until [save]. Leaving the panel (following the task,
// switching knobs) destroys this element, so the draft is kept here and restored on re-entry —
// losing an LLM generation to a navigation is worse than a stale draft the user can discard.
interface IDsDraftCache {
    projectId: number;
    stamp: number;      // bumped on every write — lets a fresh instance spot a draft it has not applied
    name: string; desc: string;
    colors: IColorRow[]; typo: IValueRow[]; global: IValueRow[]; fonts: DsFont[];
    palette: string[]; brief: string;
}
const COLOR_VIEW_KEY = 'aura-ds-editor-color-view';

function readColorView(): 'grouped' | 'flat' {
    try { return localStorage.getItem(COLOR_VIEW_KEY) === 'flat' ? 'flat' : 'grouped'; } catch { return 'grouped'; }
}

function writeColorView(view: 'grouped' | 'flat'): void {
    try { localStorage.setItem(COLOR_VIEW_KEY, view); } catch { /* storage blocked — the choice lasts this session only */ }
}

let _draftCache: IDsDraftCache | null = null;
let _draftStamp = 0;

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-design-system-102020')
export class PluginSelectDesignSystem extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) value: number | null = 0;

    @state() private _entries: IDsEntry[] = [];
    @state() private _loading = false;

    // ── working model (edit + add share it) — mirrors ONE theme entry ──
    @state() private _name = '';
    @state() private _desc = '';
    @state() private _skill = DS_SKILL_DEFAULT;
    @state() private _colors: IColorRow[] = [];
    @state() private _typo: IValueRow[] = [];
    @state() private _global: IValueRow[] = [];
    @state() private _fonts: DsFont[] = [];

    @state() private _editingKey: number | null = null;   // which DS the form is synced to
    @state() private _nameError = false;
    @state() private _saving = false;
    @state() private _saveError = '';
    // Nothing here is persisted until [save] — track it so the sticky bar can SAY so (the save
    // button used to sit at the very bottom of a long form and was easy to miss).
    @state() private _dirty = false;
    @state() private _saved = false;
    // Which DS the confirmation belongs to: saving a NEW DS re-syncs the form to the fresh entry
    // (value changes → _loadFromEntry), and the confirmation must survive that round trip.
    private _savedKey: number | null = null;

    // ── AI generation (Add view): palette → agentGenerateDs → draft loaded into this form ──
    @state() private _palette: string[] = [];
    @state() private _aiBrief = '';
    @state() private _aiUsePalette = true;
    @state() private _generating = false;
    @state() private _genError = '';
    private _threadCache = new Map<string, Promise<any>>();
    private _unsubTasks: (() => void) | undefined;
    private _appliedStamp = 0;   // last draft stamp this instance has in the form

    // ── live preview: edits of the app's ACTIVE DS repaint the app before [save] ──
    private _live = createLivePreview(document);
    private _liveTimer: ReturnType<typeof setTimeout> | undefined;

    // ── tokens the page on screen reads (CSSOM scan of the app's content region) ──
    @state() private _used: Set<string> = new Set();
    @state() private _onlyUsed = false;
    // Color roles expanded to show their -hover/-focus/-disabled rows (UI only, keyed by base name).
    @state() private _openGroups: Set<string> = new Set();
    // Colors view: one row per role (states inside) or the flat list of every token. Per-viewer preference.
    @state() private _colorView: 'grouped' | 'flat' = readColorView();
    // Token ↔ page element: hover a row to outline its elements; inspect mode picks an element.
    private _hl = createHighlighter(document);
    @state() private _inspecting = false;
    @state() private _inspected: { label: string; own: string[]; inherited: string[] } | null = null;
    private _inspectedEl: Element | null = null;
    // What changed since the DS was loaded/saved: the form as loaded is the baseline (null in Add — all new).
    private _baseline: { colors: IColorRow[]; typo: IValueRow[]; global: IValueRow[]; maps: TokenMaps; name: string; desc: string; fonts: string } | null = null;
    private _formVersion = 0;
    private _diffMemo: { version: number; changes: KeyChange[]; status: Record<TokenSection, Map<string, ChangeKind>>; counts: Record<ChangeKind, number> } | null = null;
    @state() private _showDiff = false;
    // Token search (name; `=` prefix = value). Combines (AND) with "only used on this page".
    @state() private _query = '';
    private _usedObserver: MutationObserver | undefined;
    private _usedTimer: ReturnType<typeof setTimeout> | undefined;

    connectedCallback() {
        super.connectedCallback();
        // The sticky save bar needs a block-level host: the custom element is unknown to the
        // browser (light DOM render root), so it would default to `display:inline`.
        this.style.display = 'block';
        this._unsubTasks = subscribeTaskManager(() => { this._adoptDraft(); this.requestUpdate(); });
        if (this.projectId) this._load(this.projectId);
        this._startUsedScan();
        this.addEventListener('keydown', this._onEditorKeydown);
    }

    /** Ctrl/Cmd+F while focus is INSIDE the editor jumps to the token search (the browser's find elsewhere). */
    private _onEditorKeydown = (e: KeyboardEvent) => {
        if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'f') return;
        const input = this.querySelector<HTMLInputElement>('[data-ds-search]');
        if (!input) return;
        e.preventDefault();
        input.focus();
        input.select();
    };

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
        this._revertLivePreview();
        this._stopUsedScan();
        this.removeEventListener('keydown', this._onEditorKeydown);
        this._stopInspect();
        this._hl.destroy();
    }

    // ── token ↔ element ────────────────────────────────────────────────
    private get _tokensCss(): string { return document.getElementById('ds-tokens')?.textContent ?? ''; }

    /** Outline the page elements that read these tokens (a row hover). Inspect mode owns the overlay. */
    private _hoverTokens(names: string[]): void {
        if (this._inspecting) return;
        const region = pageRegion(document);
        const wanted = names.map(n => n.trim()).filter(Boolean);
        if (!region || !wanted.length) return;
        try {
            this._hl.show(elementsUsingTokens(region, document, wanted, this._tokensCss), 'hover');
        } catch (err) {
            console.debug('[selectDesignSystem] token highlight skipped', err);
        }
    }

    private _unhoverTokens(): void {
        if (this._inspecting) return;
        this._hl.clear();
    }

    private _toggleInspect(): void {
        if (this._inspecting) this._stopInspect();
        else this._startInspect();
    }

    // Window + capture: runs BEFORE the studio editor's own capture listeners on the page host, so while
    // inspecting a click picks an element here instead of selecting it there.
    private _startInspect(): void {
        if (this._inspecting || !pageRegion(document)) return;
        this._inspecting = true;
        this._hl.clear();
        for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click'] as const) window.addEventListener(type, this._onInspectPointer, true);
        window.addEventListener('mousemove', this._onInspectMove, true);
        window.addEventListener('keydown', this._onInspectKey, true);
    }

    private _stopInspect(): void {
        if (!this._inspecting) return;
        this._inspecting = false;
        for (const type of ['pointerdown', 'mousedown', 'mouseup', 'click'] as const) window.removeEventListener(type, this._onInspectPointer, true);
        window.removeEventListener('mousemove', this._onInspectMove, true);
        window.removeEventListener('keydown', this._onInspectKey, true);
        this._inspectedEl = null;
        this._inspected = null;
        this._hl.clear();
    }

    /** The page element under an event, or null when the event is outside the page (the studio, this panel). */
    private _pageTarget(e: Event): Element | null {
        const region = pageRegion(document);
        const t = e.target;
        return region && t instanceof Element && region.contains(t) ? t : null;
    }

    private _onInspectPointer = (e: Event) => {
        const el = this._pageTarget(e);
        if (!el) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type === 'click') this._inspectElement(el);
    };

    private _onInspectMove = (e: MouseEvent) => {
        const el = this._pageTarget(e);
        if (el) this._hl.show([el], el === this._inspectedEl ? 'pick' : 'hover');
        else if (this._inspectedEl?.isConnected) this._hl.show([this._inspectedEl], 'pick');
        else this._hl.clear();
    };

    private _onInspectKey = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this._stopInspect();
    };

    private _inspectElement(el: Element): void {
        const region = pageRegion(document);
        if (!region) return;
        // Only tokens of THIS design system — Tailwind internals (--tw-*) and app vars are noise here.
        const dsNames = new Set([...this._colors, ...this._typo, ...this._global].map(r => r.name.trim()).filter(Boolean));
        try {
            const { own, inherited } = tokensForElement(el, region, document, this._tokensCss);
            const cls = (el.getAttribute('class') ?? '').trim().split(/\s+/).filter(Boolean)[0];
            const label = `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls.length > 28 ? cls.slice(0, 27) + '…' : cls}` : ''}>`;
            this._inspectedEl = el;
            this._inspected = { label, own: own.filter(n => dsNames.has(n)), inherited: inherited.filter(n => dsNames.has(n)) };
            this._hl.show([el], 'pick');
        } catch (err) {
            console.debug('[selectDesignSystem] inspect skipped', err);
        }
    }

    /** Bring a token row into view: lift the filters hiding it, open its group/section, focus it. */
    private async _revealToken(name: string): Promise<void> {
        const row = [...this._colors, ...this._typo, ...this._global].find(r => r.name.trim() === name);
        if (!row) return;
        if (!this._rowVisible(row)) { this._query = ''; this._onlyUsed = false; }
        const split = splitState(name);
        if (split && this._colorView === 'grouped' && this._colors.some(r => r.name.trim() === split.base)) {
            this._openGroups = new Set([...this._openGroups, split.base]);
        }
        await this.updateComplete;
        const input = this.querySelector<HTMLInputElement>(`[data-ds-token="${CSS.escape(name)}"]`);
        if (!input) return;
        const details = input.closest('details');
        if (details && !details.open) details.open = true;
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
        input.focus({ preventScroll: true });
        input.animate([{ boxShadow: '0 0 0 3px rgba(236,72,153,.75)' }, { boxShadow: '0 0 0 0 rgba(236,72,153,0)' }], { duration: 1400 });
    }

    // ── used-on-page scan ──────────────────────────────────────────────
    /** Scan now and again whenever the page region changes (navigation, re-render, class swaps). */
    private _startUsedScan(): void {
        const region = pageRegion(document);
        if (!region) return;   // studio without the app — nothing to mark
        this._usedObserver = new MutationObserver(() => this._scheduleUsedScan());
        this._usedObserver.observe(region, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
        this._scheduleUsedScan();
    }

    private _stopUsedScan(): void {
        this._usedObserver?.disconnect();
        this._usedObserver = undefined;
        clearTimeout(this._usedTimer);
    }

    private _scheduleUsedScan(): void {
        clearTimeout(this._usedTimer);
        this._usedTimer = setTimeout(() => this._scanUsed(), 500);
    }

    private _scanUsed(): void {
        const region = pageRegion(document);
        if (!region) { this._used = new Set(); return; }
        try {
            const tokensCss = document.getElementById('ds-tokens')?.textContent ?? '';
            const used = collectUsedTokens(region, document, tokensCss);
            // Re-render only when the set really changed — the observer fires on every page repaint.
            if (used.size !== this._used.size || [...used].some(n => !this._used.has(n))) this._used = used;
        } catch (err) {
            console.debug('[selectDesignSystem] used-token scan skipped', err);
        }
    }

    private _isUsed(name: string): boolean { return this._used.has(name.trim()); }

    /** Any row filter on (search or "only used") — sections/groups open themselves to show the hits. */
    private get _filtering(): boolean { return this._onlyUsed || parseTokenQuery(this._query) !== null; }

    /** One rule for every section: "only used" AND the search. */
    private _rowVisible(row: SearchableRow): boolean {
        if (this._onlyUsed && !this._isUsed(row.name)) return false;
        return rowMatchesQuery(row, parseTokenQuery(this._query));
    }

    private _countVisible(rows: SearchableRow[]): number {
        let n = 0;
        for (const r of rows) if (this._rowVisible(r)) n++;
        return n;
    }

    /** Form rows (all sections) the page reads — drives the filter label and its visibility. */
    private get _usedRowCount(): number {
        let n = 0;
        for (const r of this._colors) if (this._isUsed(r.name)) n++;
        for (const r of this._typo) if (this._isUsed(r.name)) n++;
        for (const r of this._global) if (this._isUsed(r.name)) n++;
        return n;
    }

    // ── what changed (diff vs the loaded/saved form) ──────────────────
    private _currentMaps(): TokenMaps {
        return { color: colorRowsToMap(this._colors), typography: valueRowsToMap(this._typo), global: valueRowsToMap(this._global) };
    }

    private _snapshotBaseline(): void {
        this._baseline = {
            colors: this._colors.map(r => ({ ...r })),
            typo: this._typo.map(r => ({ ...r })),
            global: this._global.map(r => ({ ...r })),
            maps: this._currentMaps(),
            name: this._name.trim(),
            desc: this._desc.trim(),
            fonts: JSON.stringify(this._fonts),
        };
        this._formVersion++;
    }

    /** Memoized by form version — 352 keys are not diffed on every render. */
    private get _diff() {
        if (!this._baseline) return null;
        if (this._diffMemo?.version !== this._formVersion) {
            const changes = diffTokens(this._baseline.maps, this._currentMaps());
            const status = tokenStatus(this._baseline.maps, changes);
            this._diffMemo = { version: this._formVersion, changes, status, counts: countByKind(status) };
        }
        return this._diffMemo;
    }

    /** Status of the token(s) a row stands for: `added` for a new row, `changed` if any of `names` differs. */
    private _rowKind(section: TokenSection, name: string, names?: string[]): ChangeKind | undefined {
        const status = this._diff?.status[section];
        if (!status) return undefined;
        const own = status.get(name.trim());
        if (own === 'added') return 'added';
        return own ?? ((names ?? []).some(n => status.has(n.trim())) ? 'changed' : undefined);
    }

    private _rowsOf(section: TokenSection): (IColorRow | IValueRow)[] {
        return section === 'color' ? this._colors : section === 'typography' ? this._typo : this._global;
    }

    /** Put these tokens back as saved: values restored, a NEW row removed. */
    private _revertTokens(section: TokenSection, names: string[]): void {
        const base = this._baseline;
        if (!base) return;
        const wanted = new Set(names.map(n => n.trim()));
        const savedRows: (IColorRow | IValueRow)[] = section === 'color' ? base.colors : section === 'typography' ? base.typo : base.global;
        const kept = this._rowsOf(section).filter(row => {
            const n = row.name.trim();
            if (!wanted.has(n)) return true;
            const saved = savedRows.find(r => r.name.trim() === n);
            if (!saved) return false;                     // added since load → reverting removes it
            Object.assign(row, saved);
            return true;
        });
        this._setRows(section, kept);
        this._touch();
        this._settleDirty();
    }

    /** Bring a removed token back, at (about) its saved position. */
    private _restoreRemoved(section: TokenSection, name: string): void {
        const base = this._baseline;
        if (!base) return;
        const savedRows: (IColorRow | IValueRow)[] = section === 'color' ? base.colors : section === 'typography' ? base.typo : base.global;
        const at = savedRows.findIndex(r => r.name.trim() === name);
        if (at < 0) return;
        const rows = [...this._rowsOf(section)];
        rows.splice(Math.min(at, rows.length), 0, { ...savedRows[at] });
        this._setRows(section, rows);
        this._touch();
        this._settleDirty();
    }

    private _setRows(section: TokenSection, rows: (IColorRow | IValueRow)[]): void {
        if (section === 'color') this._colors = rows as IColorRow[];
        else if (section === 'typography') this._typo = rows as IValueRow[];
        else this._global = rows as IValueRow[];
    }

    /** Everything back to the saved values by hand → not dirty any more. */
    private _settleDirty(): void {
        const base = this._baseline;
        const d = this._diff;
        if (!base || !d || d.changes.length) return;
        if (this._name.trim() !== base.name || this._desc.trim() !== base.desc || JSON.stringify(this._fonts) !== base.fonts) return;
        this._dirty = false;
        this._showDiff = false;
    }

    /** "Removed (N)" chips at the end of a section, each one restorable. */
    private _renderRemoved(section: TokenSection) {
        const status = this._diff?.status[section];
        const removed = status ? [...status].filter(([, k]) => k === 'removed').map(([n]) => n) : [];
        if (!removed.length) return nothing;
        return html`
            <div class="flex flex-wrap items-center gap-1 text-[11px]">
                <span class="font-semibold text-red-500 dark:text-red-400">${this.msg.removedTitle} (${removed.length}):</span>
                ${removed.map(n => html`
                    <button class="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 line-through hover:no-underline hover:border-red-400 cursor-pointer"
                        title=${this.msg.restore} @click=${() => this._restoreRemoved(section, n)}>${n} <span class="no-underline">↺</span></button>`)}
            </div>
        `;
    }

    /** Left bar + "↺" / "new" for a row whose token differs from the saved one. */
    private _changeMark(section: TokenSection, name: string, names?: string[]) {
        const kind = this._rowKind(section, name, names);
        if (kind === 'added') return html`<span class="shrink-0 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">${this.msg.newBadge}</span>`;
        if (kind !== 'changed') return nothing;
        return html`
            <button class="shrink-0 w-4 text-[12px] leading-none text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                title=${this.msg.revertRow} @click=${() => this._revertTokens(section, names ?? [name])}>↺</button>`;
    }

    private _changeBar(section: TokenSection, name: string, names?: string[]): string {
        const kind = this._rowKind(section, name, names);
        return kind === 'added' ? 'border-emerald-500' : kind === 'changed' ? 'border-amber-400' : 'border-transparent';
    }

    /** Throw the unsaved edits away: the form goes back to the saved entry, the app to its tokens. */
    private _undoChanges(): void {
        const entry = this._selectedEntry;
        if (!entry) return;
        this._revertLivePreview();
        this._loadFromEntry(entry);
        this.requestUpdate();
    }

    /**
     * Any edit to the working model — flips the "unsaved" indicator on the sticky save bar.
     * `slow`: free-typed font fields — every preview of a half-typed Google family is a font request.
     */
    private _touch(slow = false): void {
        this._formVersion++;
        this._dirty = true;
        this._saved = false;
        this._savedKey = null;
        // Keep the cached AI draft in sync with the user's review edits.
        if (this._isAdd && _draftCache) this._cacheDraft();
        this._scheduleLivePreview(slow ? 600 : 150);
    }

    // ── live preview ───────────────────────────────────────────────────
    private _scheduleLivePreview(delay: number): void {
        clearTimeout(this._liveTimer);
        this._liveTimer = setTimeout(() => this._applyLivePreview(), delay);
    }

    /** Repaint the app with the form's tokens — only for the app's active DS of this project. */
    private _applyLivePreview(): void {
        const entry = this._selectedEntry;
        if (!entry || this._isAdd || this._editingKey !== entry.key) return;
        if (!canPreview({ editorProjectId: this.projectId, bootProjectId: window.collabBoot?.projectId, entryName: entry.name, doc: document })) return;
        try {
            this._live.apply(tokensCssFromTheme(this._buildTheme(entry.dsIndex, this._name.trim() || entry.name, this._desc.trim())));
        } catch (err) {
            // A half-typed value must never break the form — the last good CSS stays on screen.
            console.debug('[selectDesignSystem] live preview skipped', err);
        }
    }

    /** The edit ended unsaved — put the app's tokens back. */
    private _revertLivePreview(): void {
        clearTimeout(this._liveTimer);
        this._liveTimer = undefined;
        this._live.restore();
    }

    /** A generation that finished in a previous (destroyed) instance still lands on the cache. */
    private _adoptDraft(): void {
        if (!this._isAdd || !_draftCache || _draftCache.projectId !== this.projectId) return;
        if (_draftCache.stamp === this._appliedStamp) return;
        this._restoreDraft(_draftCache);
    }

    private _cacheDraft(): void {
        if (!this.projectId) return;
        _draftCache = {
            projectId: this.projectId,
            stamp: ++_draftStamp,
            name: this._name, desc: this._desc,
            colors: this._colors.map(r => ({ ...r })),
            typo: this._typo.map(r => ({ ...r })),
            global: this._global.map(r => ({ ...r })),
            fonts: this._fonts.map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined })),
            palette: [...this._palette], brief: this._aiBrief,
        };
        this._appliedStamp = _draftCache.stamp;
    }

    private _restoreDraft(cache: IDsDraftCache): void {
        this._name = cache.name; this._desc = cache.desc;
        this._colors = cache.colors.map(r => ({ ...r }));
        this._typo = cache.typo.map(r => ({ ...r }));
        this._global = cache.global.map(r => ({ ...r }));
        this._fonts = cache.fonts.map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined }));
        this._palette = [...cache.palette]; this._aiBrief = cache.brief;
        this._dirty = true; this._saved = false;
        this._appliedStamp = cache.stamp;
    }

    /** Throw the cached draft away and go back to the canonical starter template. */
    private _discardDraft(): void {
        _draftCache = null;
        this._loadStarter();
        this.requestUpdate();
    }

    willUpdate(changed: Map<string, unknown>) {
        // Leaving the DS being edited (knob, project) without saving drops its live preview.
        if (changed.has('projectId') || changed.has('value')) this._revertLivePreview();
        if (changed.has('projectId')) {
            this._entries = [];
            this._editingKey = null;
            if (this.projectId) this._load(this.projectId);
        }
        if (changed.has('value')) this._editingKey = null; // re-sync the form to the new target
        this._syncForm();
    }

    // ── knob math (0=All, dsIndex…=DS, customKey=Add) ─────────────────
    private get _lastKey(): number { return this._entries.length ? this._entries[this._entries.length - 1].key : 0; }
    private get _customKey(): number { return this._lastKey + 1; }
    private get _maxValue(): number { return this._customKey; }
    private get _isAll(): boolean { return (this.value ?? 0) === 0; }
    private get _isAdd(): boolean { return this.value === this._customKey; }
    private get _selectedEntry(): IDsEntry | null {
        if (this.value === null || this.value <= 0) return null;
        return this._entries.find(e => e.key === this.value) ?? null;
    }

    private get msg(): MessageType { return messages[this.getMessageKey(messages)]; }

    // ── loading (designSystem.ts = identity + tokens; project.json = skill) ──
    private async _load(projectId: number): Promise<void> {
        this._loading = true;
        this.requestUpdate();
        try {
            const themes = await readThemes(projectId);
            const config: any = await getConfigProject(projectId).catch(() => null);
            const dsMap: Record<string, any> = (config?.designSystems && typeof config.designSystems === 'object' && !Array.isArray(config.designSystems))
                ? config.designSystems : {};
            this._entries = themes
                .map((theme, i) => {
                    const dsIndex = themeDsIndex(theme, i);
                    return {
                        key: Number(dsIndex),
                        dsIndex,
                        name: theme.themeName,
                        description: theme.description ?? '',
                        skill: dsMap[dsIndex]?.skill ?? DS_SKILL_DEFAULT,
                        theme,
                    };
                })
                .sort((a, b) => a.key - b.key);
        } catch {
            this._entries = [];
        }
        this._loading = false;
        this.requestUpdate();
    }

    // ── form sync ──────────────────────────────────────────────────────
    private _syncForm(): void {
        if (!this.projectId || this._loading) return;
        if (this._isAdd) {
            if (this._editingKey !== this._customKey) { this._loadStarter(); this._editingKey = this._customKey; }
        } else if (this.value !== null && this.value > 0) {
            const entry = this._selectedEntry;
            if (entry && this._editingKey !== entry.key) { this._loadFromEntry(entry); this._editingKey = entry.key; }
        }
    }

    private _loadStarter(): void {
        this._name = '';
        this._desc = '';
        this._skill = DS_SKILL_DEFAULT;
        // A new DS starts from the canonical mandatory template (all tokens present, editable).
        const template = defaultTokensTemplate();
        this._colors = this._colorRowsFrom(template.color);
        this._typo = this._valueRowsFrom(template.typography);
        this._global = this._valueRowsFrom(template.global);
        this._fonts = [];
        this._palette = [...STARTER_PALETTE];
        this._aiBrief = ''; this._genError = ''; this._generating = false;
        this._nameError = false; this._saveError = ''; this._saving = false;
        this._dirty = false; this._saved = false; this._savedKey = null;
        this._baseline = null; this._formVersion++;
        // An unsaved AI draft for this project wins over the blank template.
        if (_draftCache && _draftCache.projectId === this.projectId) this._restoreDraft(_draftCache);
    }

    private _loadFromEntry(entry: IDsEntry): void {
        const t = entry.theme;
        this._name = entry.name;
        this._desc = entry.description;
        this._skill = entry.skill || DS_SKILL_DEFAULT;
        // Seed the mandatory template UNDER the entry's own values: mandatory tokens are always
        // present to edit (heals the legacy default DS, which was persisted with empty tokens),
        // while the entry's real values — and any custom tokens — win. No-op for DSes that
        // already carry the full template.
        const template = defaultTokensTemplate();
        this._colors = this._colorRowsFrom({ ...template.color, ...(t.color ?? {}) });
        this._typo = this._valueRowsFrom({ ...template.typography, ...(t.typography ?? {}) });
        this._global = this._valueRowsFrom({ ...template.global, ...(t.global ?? {}) });
        this._fonts = (t.fonts ?? []).map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined }));
        this._palette = [];
        this._aiBrief = ''; this._genError = ''; this._generating = false;
        this._nameError = false; this._saveError = ''; this._saving = false;
        this._dirty = false; this._saved = this._savedKey === entry.key;
        this._snapshotBaseline();
    }

    /** Load an AI-generated draft's tokens into the form (name/desc kept if the user typed them). */
    private _loadDraftTokens(tokens: { color?: Record<string, string>; typography?: Record<string, string>; global?: Record<string, string> }, name: string, desc: string): void {
        this._colors = this._colorRowsFrom(tokens.color ?? {});
        this._typo = this._valueRowsFrom(tokens.typography ?? {});
        this._global = this._valueRowsFrom(tokens.global ?? {});
        if (name) this._name = name;
        if (desc) this._desc = desc;
        this._touch();     // the draft is NOT persisted — the save bar must say so
        this._cacheDraft(); // …and it must survive leaving the panel
    }

    /** color map → rows, pairing `<token>` + `_dark-<token>` into light/dark columns. */
    private _colorRowsFrom(color: Record<string, string>): IColorRow[] {
        return Object.entries(color)
            .filter(([k]) => !k.startsWith('_dark-'))
            .map(([name, light]) => ({ name, light, dark: color[`_dark-${name}`] ?? '' }));
    }

    private _valueRowsFrom(map: Record<string, string>): IValueRow[] {
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.projectId) return this._renderNeedsProject();
        if (this._loading) return this._renderLoading();
        if (this._isAll) return this._renderAll();
        if (this._isAdd) return this._renderAdd();
        return this._renderEdit();
    }

    // ── scenario: ALL ───────────────────────────────────────────────────
    private _renderAll() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(this.msg.allTitle, this.msg.allDesc, 0)}
                ${this._entries.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noDs}</span>`
                    : html`<div class="grid grid-cols-2 gap-2">${this._entries.map(e => this._renderDsCard(e))}</div>`}
                ${this._renderAddCard()}
            </div>
        `;
    }

    private _renderDsCard(entry: IDsEntry) {
        const t = entry.theme;
        const lightColors = Object.entries(t.color ?? {}).filter(([k]) => !k.startsWith('_dark-')).map(([, v]) => v).slice(0, 6);
        const tokenCount = Object.keys(t.color ?? {}).filter(k => !k.startsWith('_dark-')).length
            + Object.keys(t.typography ?? {}).length + Object.keys(t.global ?? {}).length;
        return html`
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 flex flex-col gap-2 cursor-pointer transition-colors"
                @click=${() => this._dispatchSelect(entry.key)}>
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">${entry.name}</span>
                    <span class="ml-auto shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">ds ${entry.dsIndex}</span>
                </div>
                ${entry.description
                    ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-2">${entry.description}</span>`
                    : nothing}
                <div class="flex h-6 rounded-md overflow-hidden border border-black/5">
                    ${lightColors.length
                        ? lightColors.map(c => html`<span class="flex-1" style="background:${c}"></span>`)
                        : html`<span class="flex-1 bg-gray-100 dark:bg-gray-800"></span>`}
                </div>
                <div class="flex gap-2 flex-wrap text-[10px] text-gray-400 dark:text-gray-500">
                    <span>${tokenCount} ${this.msg.tokensSuffix}</span>
                    ${t.fonts?.length ? html`<span>${t.fonts.length} fonts</span>` : nothing}
                </div>
            </div>
        `;
    }

    private _renderAddCard() {
        return html`
            <div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-indigo-500 transition-colors min-h-23"
                @click=${() => this._dispatchSelect(this._customKey)}>
                <span class="text-2xl leading-none">+</span>
                <span class="text-xs font-semibold">${this.msg.addTitle}</span>
            </div>
        `;
    }

    // ── scenario: EDIT / ADD ────────────────────────────────────────────
    private _renderEdit() {
        const entry = this._selectedEntry;
        if (!entry) return nothing;
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(entry.name, this.msg.desc, this.value ?? 0)}
                ${this._renderStatusBar()}
                ${this._renderScopeNote(entry)}
                ${this._renderIdentityPanel()}
                ${this._renderFilterBar()}
                ${this._renderInspectPanel()}
                ${this._renderEditor()}
                ${this._renderSave(this.msg.save)}
            </div>
        `;
    }

    private _renderAdd() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(this.msg.addTitle, this.msg.addDesc, this._customKey)}
                ${this._renderStatusBar()}
                ${this._renderIdentityPanel()}
                ${this._renderPaletteSection()}
                ${this._renderAiSection()}
                ${this._renderFilterBar()}
                ${this._renderInspectPanel()}
                ${this._renderEditor()}
                ${this._renderSave(this.msg.create)}
            </div>
        `;
    }

    // ── palette + AI generation (Add view) ──────────────────────────────
    private _renderPaletteSection() {
        return this._section(this.msg.paletteTitle, this.msg.paletteTag, true, html`
            <p class="text-[11px] text-gray-400 dark:text-gray-500">${this.msg.paletteHint}</p>
            <div class="flex flex-wrap gap-2 items-center">
                ${this._palette.map((hex, i) => this._renderSwatch(hex, i))}
                <button class="w-11 h-11 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 hover:text-indigo-500 hover:border-indigo-400 text-xl cursor-pointer"
                    @click=${() => { this._palette = [...this._palette, '#888888']; }}>+</button>
            </div>
        `);
    }

    private _renderSwatch(hex: string, i: number) {
        return html`
            <label class="relative w-11 h-11 rounded-lg border border-black/10 overflow-hidden cursor-pointer group" style="background:${hex}">
                <input type="color" class="absolute inset-0 opacity-0 cursor-pointer" .value=${hex}
                    @input=${(e: Event) => { const v = (e.target as HTMLInputElement).value.toUpperCase(); this._palette = this._palette.map((c, j) => j === i ? v : c); }} />
                <span class="absolute inset-x-0 bottom-0 text-[7px] text-center bg-black/40 text-white font-mono">${hex}</span>
                <button class="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 text-white text-[10px] leading-none hidden group-hover:grid place-items-center cursor-pointer"
                    @click=${(e: Event) => { e.preventDefault(); this._palette = this._palette.filter((_, j) => j !== i); }}>×</button>
            </label>
        `;
    }

    private _renderAiSection() {
        const busy = this._generating || hasRunning('ds:generate');
        const canGenerate = !busy && (this._aiUsePalette ? this._palette.length > 0 : this._aiBrief.trim().length > 0);
        return this._section(this.msg.aiTitle, this.msg.aiTag, true, html`
            <p class="text-[11px] text-gray-400 dark:text-gray-500">${this.msg.aiHint}</p>
            <textarea rows="2"
                class="w-full text-[11px]! px-2.5 py-1.5 rounded-md resize-y border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder=${this.msg.aiBriefPlaceholder} .value=${this._aiBrief}
                ?disabled=${busy}
                @input=${(e: Event) => { this._aiBrief = (e.target as HTMLTextAreaElement).value; }}></textarea>
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" class="accent-indigo-500" .checked=${this._aiUsePalette}
                    ?disabled=${busy}
                    @change=${(e: Event) => { this._aiUsePalette = (e.target as HTMLInputElement).checked; }} />
                <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.aiUsePalette}</span>
                <span class="flex h-3.5 w-12 rounded overflow-hidden border border-black/10 ${this._aiUsePalette ? '' : 'opacity-40'}">
                    ${this._palette.slice(0, 6).map(c => html`<span class="flex-1" style="background:${c}"></span>`)}
                </span>
            </label>
            ${this._genError ? html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5"><span class="text-[11px] text-red-600 dark:text-red-400">${this._genError}</span></div>` : nothing}
            <button class="self-start flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                ?disabled=${!canGenerate} @click=${() => this._onGenerate()}>
                ${busy ? this._renderSpinner('border-white') : nothing}
                ${busy ? this.msg.aiGenerating : this.msg.aiGenerate}</button>
            ${this._renderGenTasks()}
        `);
    }

    /** Generation feedback: running / done / error per task, each with "follow task". */
    private _renderGenTasks() {
        const tasks = getTasksByScope('ds:generate');
        if (tasks.size === 0) return nothing;
        return html`
            <div class="flex flex-col gap-1">
                ${[...tasks.values()].map(task => html`
                    <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-md
                        ${task.status === 'running' ? 'bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700'
                        : task.status === 'done'    ? 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700'
                        :                             'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700'}
                    ">
                        ${task.status === 'running' ? this._renderSpinner() : nothing}
                        ${task.status === 'done' ? html`<span class="text-xs text-emerald-500 dark:text-emerald-400">✓</span>` : nothing}
                        ${task.status === 'error' ? html`<span class="text-xs text-red-500 dark:text-red-400">✕</span>` : nothing}
                        <span class="text-[11px] leading-snug
                            ${task.status === 'running' ? 'text-indigo-600 dark:text-indigo-400'
                            : task.status === 'done'    ? 'text-emerald-600 dark:text-emerald-400'
                            :                             'text-red-600 dark:text-red-400'}
                        ">${task.status === 'running' ? this.msg.aiGenerating
                            : task.status === 'done'   ? this.msg.aiDraftReady
                            :                            (task.message || this.msg.aiError)}</span>
                        ${task.taskData ? html`
                            <button class="ml-auto shrink-0 text-[11px] text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${() => this._openTaskInfo(task)}>${this.msg.followTask}</button>` : nothing}
                    </div>
                `)}
            </div>
        `;
    }

    /** Open the agent's task in the details pane — the draft survives via the module-level cache. */
    private async _openTaskInfo(task: ITask): Promise<void> {
        if (!task.taskData) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', task.messageId ?? '');
        if (task.taskData.PK) el.setAttribute('taskId', task.taskData.PK);
        (el as any)['task'] = task.taskData;
        (el as any)['message'] = task.taskMessage;
        openElementInServiceDetails(el);
    }

    private _renderSpinner(color: string = 'border-indigo-500 dark:border-indigo-400') {
        return html`<div class="w-3 h-3 border-2 ${color} border-t-transparent rounded-full animate-spin shrink-0"></div>`;
    }

    private async _onGenerate(): Promise<void> {
        if (!this.projectId || this._generating || hasRunning('ds:generate')) return;
        const brief = this._aiBrief.trim();
        const palette = this._aiUsePalette ? this._palette.filter(c => /^#[0-9a-fA-F]{6}$/.test(c)) : [];
        if (!brief && palette.length === 0) return;

        // One-shot correlation id: the agent echoes it on config.dsDraft — a missing/mismatched
        // id after the task means the generation failed (or an older draft is lying around).
        const requestId = `dsgen-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
        const prompt = JSON.stringify({
            projectId: this.projectId,
            brief: brief || undefined,
            palette: palette.length ? palette : undefined,
            nameHint: this._name.trim() || undefined,
            language: this.getMessageKey(messages),
            requestId,
        });

        // Task card (running → done/error) so the end of the generation is VISIBLE, and the
        // agent's task can be followed in the details pane while it runs.
        const taskKey = `ds:generate:${requestId}`;
        clearScope('ds:generate');
        setTask(taskKey, { status: 'running', startedAt: Date.now() });

        this._generating = true;
        this._genError = '';
        try {
            await this._executeAgent('agentGenerateDs', prompt, data => {
                // Park the task on the store (not on `this`) so "follow task" keeps working
                // after the panel is re-created.
                setTask(taskKey, {
                    ...getTask(taskKey)!,
                    taskId: data.taskId, taskData: data.task,
                    taskMessage: data.message, messageId: data.message?.createAt,
                });
            });
            const config: any = await getConfigProject(this.projectId);
            const draft = config?.dsDraft;
            if (!draft || draft.requestId !== requestId || !draft.tokens) throw new Error('generation produced no draft');
            this._loadDraftTokens(draft.tokens, this._name.trim() || draft.name || '', this._desc.trim() || draft.description || '');
            delete config.dsDraft; // consume the one-shot draft
            await updateConfigProject(this.projectId, config);
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (err: any) {
            console.error('[selectDesignSystem] generate failed', err);
            this._genError = this.msg.aiError;
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: err?.message });
        }
        this._generating = false;
    }

    private async _executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
    ): Promise<void> {
        const fullName = '_102020_/l2/serviceExploreProjects';
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
        if (!userId || !threadId) throw new Error('no user/thread for agent execution');

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            // consume the whole lifecycle (LLM + afterPromptStep) — result lands on config.dsDraft
            if (event.type === 'task-created') onTaskCreated?.({ taskId: event.taskId, task: event.task, message: event.message });
        }
    }

    // ── the editor (colors + typography/fonts + global) ────────────────
    private _renderEditor() {
        return html`
            <datalist id="ds-google-fonts">${GOOGLE_FONTS.map(f => html`<option value=${f}></option>`)}</datalist>
            <div class="flex flex-col gap-2.5">
                ${this._renderColorsSection()}
                ${this._renderTypographySection()}
                ${this._renderGlobalSection()}
            </div>
            ${this._saveError ? this._renderSaveError() : nothing}
        `;
    }

    private _renderSaveError() {
        return html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5"><span class="text-[11px] text-red-600 dark:text-red-400">${this._saveError}</span></div>`;
    }

    /** `hits` (filtering only): the section opens itself when it has matches and shows how many. */
    private _section(title: string, tag: string | null, open: boolean, body: unknown, hits: number | null = null) {
        const filtering = hits !== null && this._filtering;
        return html`
            <details class="group rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden" ?open=${filtering ? hits! > 0 : open}>
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2.5 flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${title}</span>
                    ${filtering ? html`<span class="text-[10px] font-semibold rounded px-1.5 py-0.5 ${hits ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800'}">${hits}</span>` : nothing}
                    ${tag ? html`<span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">${tag}</span>` : nothing}
                    <svg class="ml-auto w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </summary>
                <div class="px-3 pb-3 pt-2 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800/70">${body}</div>
            </details>
        `;
    }

    // colors: token | light | dark (dark may be empty = no _dark- pair)
    private _renderColorsSection() {
        const hits = this._countVisible(this._colors);
        const grouped = this._colorView === 'grouped';
        return this._section(this.msg.colorsTitle, this.msg.colorsTag, true, html`
            <div class="self-start flex rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden text-[11px] font-semibold" title=${this.msg.viewHint}>
                ${(['grouped', 'flat'] as const).map(v => html`
                    <button class="px-2.5 py-1 cursor-pointer transition-colors ${this._colorView === v
                        ? 'bg-indigo-500 dark:bg-indigo-600 text-white'
                        : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-indigo-500'}"
                        @click=${() => { this._colorView = v; writeColorView(v); }}>${v === 'grouped' ? this.msg.viewGrouped : this.msg.viewFlat}</button>`)}
            </div>
            <div class="grid grid-cols-[minmax(0,1fr)_24px_24px_18px] gap-1.5 items-center text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-l-2 border-transparent pl-1">
                <span>${this.msg.tokenCol}</span><span>${this.msg.light}</span><span>${this.msg.dark}</span><span></span>
            </div>
            <div class="flex flex-col gap-1.5">
                ${grouped
                    ? groupColorRows(this._colors).map(g => this._renderColorGroup(g))
                    : this._colors.map((r, i) => this._rowVisible(r) ? this._renderColorRow(r, i) : nothing)}
                ${this._filtering && !hits ? this._renderNoMatch() : nothing}
            </div>
            ${this._renderRemoved('color')}
            <span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.darkHint}</span>
            <div class="flex items-center gap-2 flex-wrap">
                <button class="text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                    @click=${() => { this._colors = [...this._colors, { name: '', light: '#888888', dark: '' }]; this._touch(); }}>${this.msg.addToken}</button>
                <button class="text-xs font-semibold px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                    title=${this.msg.recalcHint} @click=${() => this._recalcAllStates()}>↻ ${this.msg.recalcAll}</button>
            </div>
        `, hits);
    }

    private _renderNoMatch() {
        return html`<span class="text-[11px] text-gray-400 dark:text-gray-500 italic px-0.5">${this.msg.noMatch}</span>`;
    }

    // ── color roles: base + -hover/-focus/-disabled ───────────────────
    private _renderColorGroup(g: ColorGroup<IColorRow>) {
        const members = [g.base, ...g.states];
        if (!members.some(m => this._rowVisible(m.row))) return nothing;
        if (!g.states.length) return this._renderColorRow(g.base.row, g.base.index, html`<span class="w-5 shrink-0"></span>`);

        const key = g.base.row.name.trim();
        // Filtering: a role whose hit is a STATE opens by itself, showing only the matching states.
        const filtering = this._filtering;
        const shownStates = filtering ? g.states.filter(s => this._rowVisible(s.row)) : g.states;
        const open = this._openGroups.has(key) || (filtering && shownStates.length > 0);
        const canRecalc = !!(normalizeHex(g.base.row.light) || normalizeHex(g.base.row.dark));
        const toggle = html`
            <button class="shrink-0 w-5 h-6 flex items-center gap-0.5 text-gray-400 hover:text-indigo-500 cursor-pointer"
                title=${`${g.states.map(s => s.state).join(' / ')} — ${g.states.length} ${this.msg.statesLabel}`}
                @click=${() => this._toggleGroup(key)}>
                <svg class="w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                <span class="flex flex-col gap-px">
                    ${g.states.map(s => html`<span class="block w-1.5 h-1.5 rounded-[1px] border border-black/10" style="background:${s.row.light}"></span>`)}
                </span>
            </button>`;
        return html`
            <div class="flex flex-col gap-1.5">
                ${this._renderColorRow(g.base.row, g.base.index, toggle, members.some(m => this._isUsed(m.row.name)), open ? undefined : members.map(m => m.row.name))}
                ${open ? html`
                    <div class="flex flex-col gap-1.5 ml-2.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                        ${(this._openGroups.has(key) ? g.states : shownStates).map(st => this._renderColorRow(st.row, st.index))}
                        <button class="self-start text-[11px] font-semibold px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:text-gray-500"
                            ?disabled=${!canRecalc} title=${canRecalc ? this.msg.recalcHint : this.msg.recalcNeedsHex}
                            @click=${() => { if (this._recalcStates(g)) this._touch(); this.requestUpdate(); }}>↻ ${this.msg.recalcStates}</button>
                    </div>` : nothing}
            </div>
        `;
    }

    private _toggleGroup(key: string): void {
        const next = new Set(this._openGroups);
        if (next.has(key)) next.delete(key); else next.add(key);
        this._openGroups = next;
    }

    /**
     * Rewrite a role's states from its base — the generator's math (expandRoleStates), per mode.
     * Overwrites hand-edited states on purpose: the button is explicit, undo covers regret.
     */
    private _recalcStates(g: ColorGroup<IColorRow>): boolean {
        const derived = expandRoleStates({ light: g.base.row.light, dark: g.base.row.dark });
        if (!derived.light && !derived.dark) return false;
        for (const st of g.states) {
            if (derived.light) st.row.light = derived.light[st.state];
            if (derived.dark) st.row.dark = derived.dark[st.state];
        }
        return true;
    }

    private _recalcAllStates(): void {
        let changed = false;
        for (const g of groupColorRows(this._colors)) if (g.states.length && this._recalcStates(g)) changed = true;
        if (changed) this._touch();
        this.requestUpdate();
    }

    private _renderColorRow(row: IColorRow, i: number, lead: unknown = nothing, used?: boolean, hoverNames?: string[]) {
        const locked = isMandatoryToken('color', row.name);
        return html`
            <div class="grid grid-cols-[minmax(0,1fr)_24px_24px_18px] gap-1.5 items-center border-l-2 pl-1 ${this._changeBar('color', row.name, hoverNames)}"
                @mouseenter=${() => this._hoverTokens(hoverNames ?? [row.name])} @mouseleave=${() => this._unhoverTokens()}>
                ${this._usedMark(row.name, html`<input data-ds-token=${row.name.trim()} class="w-full min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-1.5 py-1.5 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-900 outline-none read-only:opacity-70 read-only:cursor-not-allowed"
                    .value=${row.name} placeholder="token" ?readonly=${locked} title=${locked ? `${row.name} — ${this.msg.mandatoryHint}` : row.name}
                    @input=${(e: Event) => { row.name = (e.target as HTMLInputElement).value.trim(); this._touch(); }} />`, lead, used, this._changeMark('color', row.name, hoverNames))}
                ${this._colorCell(row, 'light')}
                ${this._colorCell(row, 'dark')}
                ${locked ? this._lockCell() : html`
                    <button class="text-gray-400 hover:text-red-500 text-base cursor-pointer rounded h-6 leading-none"
                        @click=${() => { this._colors = this._colors.filter((_, j) => j !== i); this._touch(); }}>×</button>`}
            </div>
        `;
    }

    /** Token-name cell with the "used on the current page" dot. */
    private _usedMark(name: string, input: unknown, lead: unknown = nothing, used = this._isUsed(name), after: unknown = nothing) {
        return html`
            <div class="flex items-center gap-1 min-w-0">
                ${lead}
                <span class="w-1.5 h-1.5 rounded-full shrink-0 ${used ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-transparent'}"
                    title=${used ? this.msg.usedOnPage : ''}></span>
                <div class="flex-1 min-w-0">${input}</div>
                ${after}
            </div>
        `;
    }

    /** What a token edit reaches (every module on this DS) and whether the app previews it live. */
    private _renderScopeNote(entry: IDsEntry) {
        const live = canPreview({ editorProjectId: this.projectId, bootProjectId: window.collabBoot?.projectId, entryName: entry.name, doc: document });
        return html`
            <div class="flex flex-col gap-1 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-2.5 py-2">
                <span class="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">${this.msg.scopeNote}</span>
                <span class="flex items-center gap-1.5 text-[11px] leading-snug ${live ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}">
                    <span class="w-1.5 h-1.5 rounded-full shrink-0 ${live ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}"></span>
                    ${live ? this.msg.livePreviewOn : this.msg.livePreviewOff}
                </span>
            </div>
        `;
    }

    /**
     * Sticky filter bar: token search + "only tokens used on this page" (shown only when the page
     * reads at least one). Both combine; the counter is rows shown / all rows.
     */
    private _renderFilterBar() {
        const usedCount = this._usedRowCount;
        const all = [...this._colors, ...this._typo, ...this._global];
        return html`
            <div class="sticky top-0 z-10 flex flex-col gap-2.5 rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
                ${this._panelTitle(this.msg.filterTitle)}
                <div class="relative flex items-center">
                    <svg class="absolute left-2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input data-ds-search type="search" class="w-full min-w-0 text-[11px]! pl-7 pr-16 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                        .value=${this._query} placeholder=${this.msg.searchPlaceholder} title=${this.msg.searchHint}
                        @input=${(e: Event) => { this._query = (e.target as HTMLInputElement).value; }}
                        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); this._query = ''; } }} />
                    ${this._filtering ? html`
                        <span class="absolute right-2 text-[10px] font-semibold text-gray-400 dark:text-gray-500 pointer-events-none">${this._countVisible(all)} ${this.msg.searchOf} ${all.length}</span>` : nothing}
                </div>
                ${usedCount ? html`
                    <label class="self-start flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                        <input type="checkbox" class="accent-indigo-500 cursor-pointer" .checked=${this._onlyUsed}
                            @change=${(e: Event) => { this._onlyUsed = (e.target as HTMLInputElement).checked; }} />
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400"></span>
                        ${this.msg.onlyUsed} (${usedCount})
                    </label>` : nothing}
            </div>
        `;
    }

    // ── panels ─────────────────────────────────────────────────────────
    private _panelTitle(title: string) {
        return html`<span class="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">${title}</span>`;
    }

    private _panel(title: string, body: unknown) {
        return html`
            <div class="flex flex-col gap-2.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/40 p-3">
                ${this._panelTitle(title)}
                ${body}
            </div>
        `;
    }

    /**
     * Name + description, collapsed by default (rarely edited). Opens by itself where it matters: a
     * new DS (the name starts empty and is required) and a save refused for lack of a name.
     */
    private _renderIdentityPanel() {
        // Same collapsible section as Colors/Typography/Global; the chip shows the current name.
        return this._section(this.msg.identityTitle, this._name.trim() || null, this._isAdd || this._nameError, html`
            ${this._renderNameField()}
            ${this._renderDescField()}
        `);
    }

    /** Token ↔ page: the inspect switch, its hint and what the picked element reads. Only with the app on screen. */
    private _renderInspectPanel() {
        if (!pageRegion(document)) return nothing;
        return this._panel(this.msg.inspectTitle, html`
                    <div class="flex items-center gap-2">
                        <button class="shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border transition-colors cursor-pointer ${this._inspecting
                            ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500'}"
                            title=${this.msg.inspectHint} @click=${() => this._toggleInspect()}>
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="1" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="23"/><line x1="1" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="23" y2="12"/></svg>
                            ${this.msg.inspect}</button>
                        <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this._inspecting ? this.msg.inspectHint : this.msg.hoverHint}</span>
                    </div>
                    ${this._inspecting ? this._renderInspected() : nothing}
        `);
    }

    private _renderInspected() {
        const info = this._inspected;
        if (!info) return html`<span class="text-[11px] text-pink-600 dark:text-pink-400 italic">${this.msg.inspectPick}</span>`;
        const chips = (names: string[]) => names.map(n => html`
            <button class="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-pink-400 hover:text-pink-600 cursor-pointer"
                @click=${() => this._revealToken(n)}>
                <span class="w-2.5 h-2.5 rounded-sm border border-black/10" style="background:var(--${n})"></span>${n}</button>`);
        return html`
            <div class="flex flex-col gap-1.5 rounded-md border border-pink-200 dark:border-pink-800/40 bg-pink-50/60 dark:bg-pink-900/10 px-2 py-1.5">
                <span class="text-[11px] font-mono font-semibold text-pink-700 dark:text-pink-300 truncate">${info.label}</span>
                ${!info.own.length && !info.inherited.length ? html`<span class="text-[11px] text-gray-500 dark:text-gray-400">${this.msg.inspectNone}</span>` : nothing}
                ${info.own.length ? html`
                    <span class="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">${this.msg.inspectOwn}</span>
                    <div class="flex flex-wrap gap-1">${chips(info.own)}</div>` : nothing}
                ${info.inherited.length ? html`
                    <span class="text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">${this.msg.inspectInherited}</span>
                    <div class="flex flex-wrap gap-1">${chips(info.inherited)}</div>` : nothing}
            </div>
        `;
    }

    /** Lock glyph shown instead of a remove button for mandatory (non-deletable) tokens. */
    private _lockCell() {
        return html`
            <span class="grid place-items-center h-6 text-gray-300 dark:text-gray-600" title=${this.msg.mandatoryHint}>
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </span>
        `;
    }

    // A color cell accepts ANY css value; the picker is a convenience that syncs on valid hex.
    // Compact for the narrow panel: just the swatch; the value field pops over to its LEFT on hover
    // or focus (Tab / touch reach it too) without moving the layout.
    private _colorCell(row: IColorRow, variant: 'light' | 'dark') {
        const value = row[variant];
        const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
        const empty = !value.trim();
        return html`
            <div class="relative flex items-center justify-center h-7 group/cell">
                <label class="relative w-5 h-5 rounded overflow-hidden cursor-pointer shrink-0 border ${empty ? 'border-dashed border-gray-300 dark:border-gray-600' : 'border-black/15 dark:border-white/15'}"
                    style=${empty ? '' : `background:${value}`} title=${empty ? `${variant}: —` : `${variant}: ${value}`}>
                    <input type="color" class="absolute inset-0 opacity-0 cursor-pointer" .value=${isHex ? value : '#888888'}
                        @input=${(e: Event) => { row[variant] = (e.target as HTMLInputElement).value.toUpperCase(); this._touch(); this.requestUpdate(); }} />
                </label>
                <div class="absolute right-full top-1/2 -translate-y-1/2 pr-1 z-20 opacity-0 pointer-events-none transition-opacity
                        group-hover/cell:opacity-100 group-hover/cell:pointer-events-auto group-focus-within/cell:opacity-100 group-focus-within/cell:pointer-events-auto">
                    <input class="w-[92px] text-[10px]! font-mono text-gray-700 dark:text-gray-300 rounded-md px-1.5 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-md outline-none focus:border-indigo-400"
                        .value=${value} placeholder=${variant === 'dark' ? '—' : ''}
                        @input=${(e: Event) => { row[variant] = (e.target as HTMLInputElement).value.trim(); this._touch(); this.requestUpdate(); }} />
                </div>
            </div>
        `;
    }

    // typography: value rows + the font-loading cards
    private _renderTypographySection() {
        const hits = this._countVisible(this._typo);
        return this._section(this.msg.typographyTitle, this.msg.typographyTag, false, html`
            ${this._renderValueRows(this._typo, 'typography', rows => { this._typo = rows; })}
            ${this._filtering ? nothing : html`
            <div class="border-t border-gray-100 dark:border-gray-800/70 pt-3 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontsTitle}</span>
                    <span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">${this.msg.fontsTag}</span>
                </div>
                <p class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this.msg.fontsHint}</p>
                <div class="flex flex-col gap-2">
                    ${this._fonts.map((f, i) => this._renderFontCard(f, i))}
                </div>
                <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                    @click=${() => { this._fonts = [...this._fonts, { name: '', source: 'google', family: '', weights: [400], fallback: 'sans-serif' }]; this._touch(); }}>${this.msg.addFont}</button>
            </div>`}
        `, hits);
    }

    // global: plain token | value rows
    private _renderGlobalSection() {
        return this._section(this.msg.globalTitle, this.msg.globalTag, false,
            this._renderValueRows(this._global, 'global', rows => { this._global = rows; }), this._countVisible(this._global));
    }

    private _renderValueRows(rows: IValueRow[], section: 'typography' | 'global', commit: (rows: IValueRow[]) => void) {
        return html`
            <div class="grid grid-cols-[1fr_1fr_18px] gap-1.5 items-center text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 border-l-2 border-transparent pl-1">
                <span>${this.msg.tokenCol}</span><span>${this.msg.valueCol}</span><span></span>
            </div>
            <div class="flex flex-col gap-1.5">
                ${rows.map((r, i) => {
                    if (!this._rowVisible(r)) return nothing;
                    const locked = isMandatoryToken(section, r.name);
                    return html`
                    <div class="grid grid-cols-[1fr_1fr_18px] gap-1.5 items-center border-l-2 pl-1 ${this._changeBar(section, r.name)}"
                        @mouseenter=${() => this._hoverTokens([r.name])} @mouseleave=${() => this._unhoverTokens()}>
                        ${this._usedMark(r.name, html`<input data-ds-token=${r.name.trim()} class="w-full min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-1.5 py-1.5 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-900 outline-none read-only:opacity-70 read-only:cursor-not-allowed"
                            .value=${r.name} placeholder="token" ?readonly=${locked} title=${locked ? `${r.name} — ${this.msg.mandatoryHint}` : r.name}
                            @input=${(e: Event) => { r.name = (e.target as HTMLInputElement).value.trim(); this._touch(); }} />`, nothing, this._isUsed(r.name), this._changeMark(section, r.name))}
                        <input class="min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-400 rounded-md px-1.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-indigo-400"
                            .value=${r.value} placeholder="value"
                            @input=${(e: Event) => { r.value = (e.target as HTMLInputElement).value; this._touch(); }} />
                        ${locked ? this._lockCell() : html`
                            <button class="text-gray-400 hover:text-red-500 text-base cursor-pointer rounded h-6 leading-none"
                                @click=${() => { commit(rows.filter((_, j) => j !== i)); this._touch(); }}>×</button>`}
                    </div>
                `;})}
            </div>
            ${this._renderRemoved(section)}
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                @click=${() => { commit([...rows, { name: '', value: '' }]); this._touch(); }}>${this.msg.addToken}</button>
        `;
    }

    private _renderFontCard(font: DsFont, i: number) {
        const source = font.source ?? 'system';
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <input class="min-w-0 flex-1 text-[11px]! font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 border border-transparent focus:border-indigo-400 outline-none"
                        .value=${font.name} placeholder=${this.msg.fontRolePlaceholder}
                        @input=${(e: Event) => { font.name = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'); this._touch(); }} />
                    <button class="text-gray-400 hover:text-red-500 text-base leading-none cursor-pointer"
                        @click=${() => { this._fonts = this._fonts.filter((_, j) => j !== i); this._touch(); }}>×</button>
                </div>

                ${this._renderSegField(this.msg.fontSource, FONT_SOURCES, source, v => { font.source = v as DsFont['source']; this._touch(); this.requestUpdate(); })}

                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFamily}</label>
                        ${source === 'system'
                            ? this._renderInlineSelect(SYSTEM_FONTS, font.family, v => { font.family = v; this._touch(); this.requestUpdate(); })
                            : html`<input class="min-w-0 text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                                list=${source === 'google' ? 'ds-google-fonts' : nothing}
                                .value=${font.family} placeholder=${this.msg.fontFamilyPlaceholder}
                                @input=${(e: Event) => { font.family = (e.target as HTMLInputElement).value; this._touch(true); this.requestUpdate(); }} />`}
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFallback}</label>
                        ${this._renderInlineSelect(FALLBACKS, font.fallback ?? 'sans-serif', v => { font.fallback = v; this._touch(); this.requestUpdate(); })}
                    </div>
                </div>

                ${source !== 'system' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontWeights}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                            .value=${(font.weights ?? []).join(', ')} placeholder="400, 600, 700"
                            @change=${(e: Event) => { font.weights = this._parseWeights((e.target as HTMLInputElement).value); this._touch(); }} />
                    </div>` : nothing}

                ${source === 'custom' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontUrl}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400 font-mono"
                            .value=${font.url ?? ''} placeholder=${this.msg.fontUrlPlaceholder}
                            @input=${(e: Event) => { font.url = (e.target as HTMLInputElement).value.trim() || undefined; this._touch(true); }} />
                        <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this.msg.fontUrlHint}</span>
                    </div>` : nothing}

                ${this._renderUseFont(font)}
            </div>
        `;
    }

    // ── "use font": a loaded family only paints once a `font-family-*` typography token points at it ──
    private _fontTargets = new WeakMap<DsFont, string>();

    /** Typography tokens that hold a font family — where a font card can be applied. */
    private get _familyTokens(): string[] {
        return this._typo.map(r => r.name.trim()).filter(n => n.startsWith('font-family'));
    }

    /** CSS value for a font card: the quoted family + its generic fallback. */
    private _fontFamilyValue(font: DsFont): string {
        return `'${font.family.trim().replace(/'/g, '')}', ${font.fallback || 'sans-serif'}`;
    }

    /** Target token of a card: the user's pick, else the one named after the role, else the first. */
    private _fontTarget(font: DsFont): string | undefined {
        const tokens = this._familyTokens;
        const picked = this._fontTargets.get(font);
        if (picked && tokens.includes(picked)) return picked;
        return tokens.find(t => t === `font-family-${font.name.trim()}`) ?? tokens[0];
    }

    private _useFont(font: DsFont, token: string): void {
        const value = this._fontFamilyValue(font);
        const row = this._typo.find(r => r.name.trim() === token);
        if (row) row.value = value;
        else this._typo = [...this._typo, { name: token, value }];
        this._touch();
        this.requestUpdate();
    }

    private _renderUseFont(font: DsFont) {
        if (!font.family.trim()) return nothing;
        const target = this._fontTarget(font);
        if (!target) return nothing;
        const family = font.family.trim().replace(/'/g, '').toLowerCase();
        const inUse = this._typo.filter(r => r.name.startsWith('font-family')
            && r.value.trim().replace(/^['"]/, '').toLowerCase().startsWith(family));
        return html`
            <div class="flex items-center gap-2 border-t border-gray-100 dark:border-gray-800/70 pt-2">
                <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">${this.msg.useFontIn}</span>
                ${this._renderInlineSelect(this._familyTokens, target, v => { this._fontTargets.set(font, v); this.requestUpdate(); })}
                <button class="shrink-0 text-[11px] font-semibold px-2 py-1 rounded bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
                    @click=${() => this._useFont(font, target)}>${this.msg.useFont}</button>
                ${inUse.length ? html`
                    <span class="ml-auto shrink-0 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400" title=${inUse.map(r => r.name).join(', ')}>
                        ✓ ${this.msg.fontInUse}</span>` : nothing}
            </div>
        `;
    }

    private _renderInlineSelect(options: string[], current: string | undefined, onPick: (v: string) => void) {
        return html`
            <select class="min-w-0 text-[11px]! px-1.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                @change=${(e: Event) => onPick((e.target as HTMLSelectElement).value)}>
                ${options.map(o => html`<option ?selected=${o === current}>${o}</option>`)}
            </select>
        `;
    }

    private _renderSegField(label: string, options: string[], current: string, onPick: (v: string) => void) {
        return html`
            <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${label}</label>
                <div class="flex gap-1 p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    ${options.map(o => html`
                        <button class="flex-1 text-[11px] font-semibold capitalize px-1.5 py-1 rounded transition-colors cursor-pointer
                            ${o === current ? 'bg-indigo-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
                            @click=${() => onPick(o)}>${o}</button>
                    `)}
                </div>
            </div>
        `;
    }

    private _parseWeights(raw: string): number[] {
        return raw.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n > 0);
    }

    // ── name + save ─────────────────────────────────────────────────────
    private _renderNameField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.nameLabel}</label>
                <input type="text"
                    class="w-full text-[11px]! px-2.5 py-1.5 rounded-md border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400
                        ${this._nameError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}"
                    data-ds-name
                    placeholder=${this.msg.namePlaceholder} .value=${this._name}
                    @input=${(e: Event) => { this._name = (e.target as HTMLInputElement).value; this._nameError = false; this._touch(); }} />
                ${this._nameError ? html`<span class="text-[11px] text-red-500 dark:text-red-400">${this.msg.nameRequired}</span>` : nothing}
            </div>
        `;
    }

    private _renderDescField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.descLabel}</label>
                <textarea rows="2"
                    class="w-full text-[11px]! px-2.5 py-1.5 rounded-md resize-y border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder=${this.msg.descPlaceholder} .value=${this._desc}
                    @input=${(e: Event) => { this._desc = (e.target as HTMLTextAreaElement).value; this._touch(); }}></textarea>
            </div>
        `;
    }

    /** Top-of-form banner: unsaved work (with a save shortcut) or the save confirmation. */
    private _renderStatusBar() {
        if (this._saved) {
            return html`
                <div class="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/10 px-2.5 py-1.5">
                    <span class="text-xs text-emerald-500 dark:text-emerald-400">✓</span>
                    <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">${this.msg.savedOk}</span>
                </div>
            `;
        }
        if (!this._dirty) return nothing;
        const hasDraft = this._isAdd && !!_draftCache;
        const canUndo = !this._isAdd && !!this._selectedEntry;
        return html`
            <div class="flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                <span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400">${this.msg.unsavedChanges}</span>
                ${hasDraft ? html`
                    <button class="ml-auto shrink-0 text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline cursor-pointer whitespace-nowrap"
                        @click=${() => this._discardDraft()}>${this.msg.discardDraft}</button>` : nothing}
                ${canUndo ? html`
                    <button class="ml-auto shrink-0 text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                        ?disabled=${this._saving} @click=${() => this._undoChanges()}>${this.msg.undoChanges}</button>` : nothing}
                <button class="shrink-0 text-[11px] font-semibold px-2 py-1 rounded bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer
                        ${hasDraft || canUndo ? '' : 'ml-auto'}"
                    ?disabled=${this._saving} @click=${() => this._onSave()}>${this._saving ? this.msg.saving : this.msg.saveNow}</button>
            </div>
        `;
    }

    // Sticky footer: the form is long and the save button used to scroll out of sight — pin it.
    // Two lines for the narrow panel: the state (+ undo) above, the full-width button below.
    private _renderSave(label: string) {
        const dirty = this._dirty && !this._saved;
        const canUndo = dirty && !this._isAdd && !!this._selectedEntry;
        return html`
            <div class="sticky bottom-0 z-10 mt-1 py-2.5 flex flex-col gap-2 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
                ${dirty && this._showDiff ? this._renderDiffList() : nothing}
                ${dirty || this._saved ? html`
                    <div class="flex items-center gap-2 min-w-0">
                        ${dirty ? this._renderDiffToggle() : html`
                            <span class="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">✓ ${this.msg.savedOk}</span>`}
                        ${canUndo ? html`
                            <button class="ml-auto shrink-0 text-[11px] text-gray-500 dark:text-gray-400 hover:text-red-500 hover:underline cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                                ?disabled=${this._saving} @click=${() => this._undoChanges()}>${this.msg.undoChanges}</button>` : nothing}
                    </div>` : nothing}
                <button class="w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                    ?disabled=${this._saving} @click=${() => this._onSave()}>
                    ${this._saving ? this._renderSpinner('border-white') : nothing}
                    ${this._saving ? this.msg.saving : label}</button>
            </div>
        `;
    }

    /** "● Unsaved changes · 2 changed · 1 new ▸" — opens the list above the save button. */
    private _renderDiffToggle() {
        const c = this._diff?.counts;
        const parts = c ? [
            c.changed ? `${c.changed} ${this.msg.changedN}` : '',
            c.added ? `${c.added} ${this.msg.addedN}` : '',
            c.removed ? `${c.removed} ${this.msg.removedN}` : '',
        ].filter(Boolean) : [];
        const label = html`
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            <span class="text-[11px] font-semibold text-amber-600 dark:text-amber-400 truncate">${this.msg.unsavedChanges}${parts.length ? ` · ${parts.join(' · ')}` : ''}</span>`;
        if (!parts.length) return html`<span class="flex items-center gap-1.5 min-w-0">${label}</span>`;
        return html`
            <button class="flex items-center gap-1.5 min-w-0 cursor-pointer hover:underline decoration-amber-400" title=${this.msg.diffHint}
                @click=${() => { this._showDiff = !this._showDiff; }}>
                ${label}
                <svg class="w-3 h-3 shrink-0 text-amber-500 transition-transform ${this._showDiff ? '-rotate-90' : 'rotate-90'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>`;
    }

    /** `token: old → new`, with swatches for colors; the name jumps to the row, ↺ reverts that token. */
    private _renderDiffList() {
        const changes = this._diff?.changes ?? [];
        if (!changes.length) return nothing;
        const swatch = (section: TokenSection, v?: string) => section === 'color' && v
            ? html`<span class="w-2.5 h-2.5 rounded-sm shrink-0 border border-black/10" style="background:${v}"></span>` : nothing;
        const val = (v?: string) => html`<span class="font-mono truncate max-w-[90px]" title=${v ?? ''}>${v?.trim() || '—'}</span>`;
        return html`
            <div class="max-h-48 overflow-y-auto flex flex-col gap-0.5 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-900/10 px-2 py-1.5">
                ${changes.map(c => {
                    const name = baseName(c.key);
                    const dark = c.key !== name;
                    return html`
                        <div class="flex items-center gap-1.5 min-w-0 text-[10px] text-gray-600 dark:text-gray-300">
                            <button class="min-w-0 truncate font-mono font-semibold text-left hover:text-indigo-500 hover:underline cursor-pointer ${c.kind === 'removed' ? 'line-through text-red-500' : ''}"
                                title=${c.key} @click=${() => this._revealToken(name)}>${name}${dark ? html`<span class="font-normal text-gray-400"> (dark)</span>` : nothing}</button>
                            <span class="ml-auto flex items-center gap-1 shrink-0">
                                ${c.kind !== 'added' ? html`${swatch(c.section, c.from)}${val(c.from)}` : html`<span class="text-emerald-600 dark:text-emerald-400 font-semibold">${this.msg.newBadge}</span>`}
                                ${c.kind !== 'removed' ? html`<span class="text-gray-400">→</span>${swatch(c.section, c.to)}${val(c.to)}` : nothing}
                            </span>
                            <button class="shrink-0 w-4 text-[12px] leading-none text-amber-600 dark:text-amber-400 hover:text-amber-700 cursor-pointer"
                                title=${c.kind === 'removed' ? this.msg.restore : this.msg.revertRow}
                                @click=${() => c.kind === 'removed' ? this._restoreRemoved(c.section, name) : this._revertTokens(c.section, [name])}>↺</button>
                        </div>`;
                })}
            </div>
        `;
    }

    // ── persistence ─────────────────────────────────────────────────────
    /** The form rows, back as ONE theme entry (exactly what will live in designSystem.ts). */
    private _buildTheme(dsIndex: string, name: string, description: string): IDesignSystemTokens {
        // Two passes so the entry lists ALL light tokens first, then ALL `_dark-` tokens —
        // not interleaved light/dark/light/dark (matches the canonical entry shape + getCssVars).
        const color: Record<string, string> = {};
        for (const r of this._colors) {
            const n = r.name.trim();
            if (n) color[n] = r.light;
        }
        for (const r of this._colors) {
            const n = r.name.trim();
            if (n && r.dark.trim()) color[`_dark-${n}`] = r.dark.trim();
        }
        const typography: Record<string, string> = {};
        for (const r of this._typo) if (r.name.trim()) typography[r.name.trim()] = r.value;
        const global: Record<string, string> = {};
        for (const r of this._global) if (r.name.trim()) global[r.name.trim()] = r.value;

        const fonts: DsFont[] = this._fonts
            .filter(f => f.name.trim() && f.family.trim())
            .map(f => {
                const out: DsFont = { name: f.name.trim(), source: f.source ?? 'system', family: f.family.trim() };
                if (f.fallback) out.fallback = f.fallback;
                if (f.source !== 'system' && f.weights?.length) out.weights = [...f.weights];
                if (f.source === 'custom' && f.url) out.url = f.url;
                if (f.source === 'custom' && f.faces?.length) out.faces = f.faces;
                return out;
            });

        // Defensive: never let a mandatory token go missing (e.g. a stale entry, or a rename that
        // slipped past the read-only lock) — re-inject the template default for any absent key.
        const template = defaultTokensTemplate();
        for (const k of Object.keys(template.color)) if (!(k in color)) color[k] = template.color[k];
        for (const k of Object.keys(template.typography)) if (!(k in typography)) typography[k] = template.typography[k];
        for (const k of Object.keys(template.global)) if (!(k in global)) global[k] = template.global[k];

        const theme: IDesignSystemTokens = { themeName: name, description, color, typography, global, dsIndex };
        if (fonts.length) theme.fonts = fonts;
        // Carry forward the reconciliation agent's field: it is NOT edited by this form, but
        // writeTheme replaces the whole entry — omitting it here would wipe it on every save.
        const recon = this._selectedEntry?.theme?.tokenReconciliation;
        if (recon) theme.tokenReconciliation = recon;
        return theme;
    }

    private async _onSave(): Promise<void> {
        const name = this._name.trim();
        if (!name) {
            // Saving from the sticky footer: the field that blocks the save is far above — take
            // the user there instead of failing silently.
            this._nameError = true;
            const nameInput = this.querySelector<HTMLElement>('[data-ds-name]');
            const details = nameInput?.closest('details');
            if (details) details.open = true;   // the identity panel is collapsed by default
            nameInput?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            return;
        }
        if (!this.projectId || this._saving) return;

        const isNew = this._isAdd;
        const dsIndex = isNew ? String(this._customKey) : (this._selectedEntry?.dsIndex ?? String(this._customKey));
        const key = Number(dsIndex);

        const skill = this._skill || DS_SKILL_DEFAULT;
        const theme = this._buildTheme(dsIndex, name, this._desc.trim());

        this._saving = true;
        this._saveError = '';
        try {
            // designSystem.ts — identity + tokens (the single home), matched by dsIndex.
            await writeTheme(this.projectId, theme);
            // project.json — only the generation config bucket for this dsIndex.
            await this._persistConfig(this.projectId, dsIndex, skill);
        } catch (err) {
            console.error('[selectDesignSystem] save failed', err);
            this._saveError = this.msg.saveError;
            this._saving = false;
            return;
        }

        // What is on screen IS the saved DS now — keep it (and follow a rename).
        // Flush a pending (debounced) edit first so the screen matches what was written.
        clearTimeout(this._liveTimer);
        if (!isNew) this._applyLivePreview();
        this._live.commit(name);
        await this._load(this.projectId);
        // The compiled designSystem.js lags behind the just-written .ts, so _load can miss a
        // brand-new entry — upsert it optimistically so the list + knob reflect the save now.
        this._ensureEntry(key, dsIndex, name, this._desc.trim(), skill, theme);
        this._saving = false;
        this._dirty = false;
        this._saved = true;
        this._showDiff = false;
        this._snapshotBaseline();   // what is on screen IS the saved DS now
        this._savedKey = key;

        if (isNew) {
            // The draft is now a real entry — drop the cache and the generation cards.
            _draftCache = null;
            clearScope('ds:generate');
            // Notify the host so it rebuilds the DS knob (new entry + fresh "+" slot) and selects it.
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('ds-created', { detail: { value: key }, bubbles: true, composed: true }));
        } else {
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('save-ds', { detail: { key, isNew, name }, bubbles: true, composed: true }));
        }
    }

    /** Optimistically add/replace an entry in the in-memory list (heals stale post-save reads). */
    private _ensureEntry(key: number, dsIndex: string, name: string, description: string, skill: string, theme: IDesignSystemTokens): void {
        const entry: IDsEntry = { key, dsIndex, name, description, skill, theme };
        const idx = this._entries.findIndex(e => e.key === key);
        const next = idx >= 0 ? this._entries.map((e, i) => (i === idx ? entry : e)) : [...this._entries, entry];
        this._entries = next.sort((a, b) => a.key - b.key);
    }

    /** project.json designSystems[dsIndex] = GENERATION config only (no identity, no tokens). */
    private async _persistConfig(projectId: number, dsIndex: string, skill: string): Promise<void> {
        const config: any = await getConfigProject(projectId);
        if (!config) throw new Error('project config not found');
        const current = config.designSystems;
        const designSystems: Record<string, any> =
            (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
        const existing = designSystems[dsIndex] ?? {};
        const entry: Record<string, any> = { ...existing, skill };
        delete entry.name;
        delete entry.description;
        delete entry.tokens;
        delete entry.styleHints;
        designSystems[dsIndex] = entry;
        config.designSystems = designSystems;
        await updateConfigProject(projectId, config);
    }

    // ── shared chrome ───────────────────────────────────────────────────
    private _navHeader(itemName: string, desc: string, value: number) {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${desc}
                .value=${value}
                .min=${0}
                .max=${this._maxValue}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    private _renderNeedsProject() {
        return html`<div class="flex flex-col gap-3">${this._renderHeader(this.msg.title, this.msg.desc)}${this._renderNotice(this.msg.needsProject)}</div>`;
    }

    private _renderLoading() {
        return html`<div class="flex flex-col gap-3">${this._renderHeader(this.msg.title, this.msg.desc)}<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.loading}</span></div>`;
    }

    private _renderHeader(title: string, description: string) {
        return html`
            <div class="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
                <span class="text-base font-semibold text-gray-700 dark:text-gray-200 text-center">${title}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-center">${description}</span>
            </div>
        `;
    }

    private _renderNotice(text: string) {
        return html`<div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5"><span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${text}</span></div>`;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-ds', { detail: { value }, bubbles: true, composed: true }));
    }
}
