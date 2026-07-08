/// <mls fileReference="_102020_/l2/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { type DsTokens, type DsColorRole, type DsFont } from '/_102020_/l2/dsMatch/buildGlobalCss.js';
import { buildDesignSystemTs } from '/_102020_/l2/dsMatch/buildDesignSystemTs.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import '/_102020_/l2/plugins/navHeader.js';

// Phase B — DESIGN SYSTEM = STYLING. This plugin presents and edits the visual tokens
// (palette, color roles light/dark, typography, shape, density, elevation) stored on
// designSystems[ds].tokens. The DS knob mirrors the layout knob: 0 = All, 1..N = edit a DS,
// last slot = Add. Tokens are flat per DS (no module/page cascade). Saving regenerates the
// project-wide global.css so the existing servicePreview reflects the change immediately.

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Design System',
    desc: 'Visual tokens (colors, typography, shape) applied when rendering this project.',
    needsProject: 'Select a project first to see its design systems.',
    allTitle: 'All Design Systems',
    allDesc: 'Design systems configured for this project.',
    addTitle: 'New Design System',
    addDesc: 'Create a design system: start from a preset (or custom) and tune the tokens.',
    noDs: 'No design systems configured yet.',
    loading: 'Loading design systems…',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. sunset',
    nameRequired: 'Give the design system a name.',
    descLabel: 'Description',
    descPlaceholder: 'What this design system is for (optional)',
    defaultNote: 'The default design system has no styling tokens — only its name and description.',
    startFrom: 'Start from',
    custom: 'Custom',
    paletteTitle: 'Palette',
    paletteTag: 'source',
    paletteHint: 'Brand colors. Click to edit, + to add, hover to remove.',
    colorsTitle: 'Colors',
    colorsTag: 'roles · light / dark',
    tokenCol: 'Token',
    light: 'Light',
    dark: 'Dark',
    addToken: '+ Add token',
    typography: 'Typography',
    displayFont: 'Display font',
    bodyFont: 'Body font',
    fontsTag: 'fonts · roles',
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
    scale: 'Scale',
    headingWeight: 'Heading weight',
    tracking: 'Tracking',
    shapeDensity: 'Shape & Density',
    radius: 'Radius',
    borderWidth: 'Border width',
    density: 'Density',
    elevation: 'Elevation',
    shadow: 'Shadow',
    save: 'Save design system',
    create: 'Create design system',
    saving: 'Saving…',
    saveError: 'Could not save the design system.',
    tokensSuffix: 'tokens',
    aiTitle: 'Generate with AI',
    aiTag: 'brief · palette',
    aiHint: 'Describe the brand/mood and/or use the palette below as brand colors. The result fills this form as a draft — review and save.',
    aiBriefPlaceholder: 'e.g. sophisticated law firm, dark tones, serif display font…',
    aiUsePalette: 'Use the current palette as brand colors',
    aiGenerate: 'Generate',
    aiGenerating: 'Generating…',
    aiError: 'Could not generate the design system. Try again.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Design System',
        desc: 'Tokens visuais (cores, tipografia, forma) aplicados na renderização deste projeto.',
        needsProject: 'Selecione um projeto primeiro para ver os design systems.',
        allTitle: 'Todos os Design Systems',
        allDesc: 'Design systems configurados neste projeto.',
        addTitle: 'Novo Design System',
        addDesc: 'Crie um design system: comece de um preset (ou custom) e ajuste os tokens.',
        noDs: 'Nenhum design system configurado ainda.',
        loading: 'Carregando design systems…',
        nameLabel: 'Nome',
        namePlaceholder: 'ex.: sunset',
        nameRequired: 'Dê um nome ao design system.',
        descLabel: 'Descrição',
        descPlaceholder: 'Para que serve este design system (opcional)',
        defaultNote: 'O design system padrão não tem tokens de estilização — apenas nome e descrição.',
        startFrom: 'Começar de',
        custom: 'Custom',
        paletteTitle: 'Paleta',
        paletteTag: 'origem',
        paletteHint: 'Cores da marca. Clique para editar, + adiciona, passe o mouse para remover.',
        colorsTitle: 'Cores',
        colorsTag: 'papéis · light / dark',
        tokenCol: 'Token',
        light: 'Light',
        dark: 'Dark',
        addToken: '+ Adicionar token',
        typography: 'Tipografia',
        displayFont: 'Fonte de display',
        bodyFont: 'Fonte de corpo',
        fontsTag: 'fontes · papéis',
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
        scale: 'Escala',
        headingWeight: 'Peso do título',
        tracking: 'Tracking',
        shapeDensity: 'Forma e Densidade',
        radius: 'Raio',
        borderWidth: 'Largura da borda',
        density: 'Densidade',
        elevation: 'Elevação',
        shadow: 'Sombra',
        save: 'Salvar design system',
        create: 'Criar design system',
        saving: 'Salvando…',
        saveError: 'Não foi possível salvar o design system.',
        tokensSuffix: 'tokens',
        aiTitle: 'Gerar com IA',
        aiTag: 'brief · paleta',
        aiHint: 'Descreva a marca/clima e/ou use a paleta abaixo como cores da marca. O resultado preenche este formulário como rascunho — revise e salve.',
        aiBriefPlaceholder: 'ex.: escritório de advocacia sofisticado, tons escuros, display serifada…',
        aiUsePalette: 'Usar a paleta atual como cores da marca',
        aiGenerate: 'Gerar',
        aiGenerating: 'Gerando…',
        aiError: 'Não foi possível gerar o design system. Tente novamente.',
    },
    es: {
        title: 'Design System',
        desc: 'Tokens visuales (colores, tipografía, forma) aplicados al renderizar este proyecto.',
        needsProject: 'Seleccione un proyecto primero para ver sus design systems.',
        allTitle: 'Todos los Design Systems',
        allDesc: 'Design systems configurados en este proyecto.',
        addTitle: 'Nuevo Design System',
        addDesc: 'Cree un design system: empiece desde un preset (o custom) y ajuste los tokens.',
        noDs: 'Aún no hay design systems configurados.',
        loading: 'Cargando design systems…',
        nameLabel: 'Nombre',
        namePlaceholder: 'ej.: sunset',
        nameRequired: 'Dale un nombre al design system.',
        descLabel: 'Descripción',
        descPlaceholder: 'Para qué sirve este design system (opcional)',
        defaultNote: 'El design system por defecto no tiene tokens de estilización — solo nombre y descripción.',
        startFrom: 'Empezar desde',
        custom: 'Custom',
        paletteTitle: 'Paleta',
        paletteTag: 'origen',
        paletteHint: 'Colores de marca. Clic para editar, + agrega, pasa el mouse para quitar.',
        colorsTitle: 'Colores',
        colorsTag: 'roles · light / dark',
        tokenCol: 'Token',
        light: 'Light',
        dark: 'Dark',
        addToken: '+ Agregar token',
        typography: 'Tipografía',
        displayFont: 'Fuente display',
        bodyFont: 'Fuente de cuerpo',
        fontsTag: 'fuentes · roles',
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
        scale: 'Escala',
        headingWeight: 'Peso del título',
        tracking: 'Tracking',
        shapeDensity: 'Forma y Densidad',
        radius: 'Radio',
        borderWidth: 'Ancho del borde',
        density: 'Densidad',
        elevation: 'Elevación',
        shadow: 'Sombra',
        save: 'Guardar design system',
        create: 'Crear design system',
        saving: 'Guardando…',
        saveError: 'No se pudo guardar el design system.',
        tokensSuffix: 'tokens',
        aiTitle: 'Generar con IA',
        aiTag: 'brief · paleta',
        aiHint: 'Describe la marca/tono y/o usa la paleta de abajo como colores de marca. El resultado llena este formulario como borrador — revisa y guarda.',
        aiBriefPlaceholder: 'ej.: bufete de abogados sofisticado, tonos oscuros, display con serifa…',
        aiUsePalette: 'Usar la paleta actual como colores de marca',
        aiGenerate: 'Generar',
        aiGenerating: 'Generando…',
        aiError: 'No se pudo generar el design system. Inténtalo de nuevo.',
    },
};
/// **collab_i18n_end**

// ─── Types & option vocab ─────────────────────────────────────────────

interface IDsEntry { key: number; name: string; description: string; skill: string; tokens: DsTokens; }
interface IRole { name: string; light: string; dark: string; }

// Per-DS skill slot: the rules for this DS's styles/<ds>/global.css. The fixed base render
// skill (genCfePageGenome) is prepended by agentGenDefs — it is NOT stored per DS.
const DS_SKILL_DEFAULT = '_102020_/l2/agentImplementGenome/skills/genCfePageDesignSystem.ts';

// Font sourcing. The curated Google list is only a SUGGESTION — the family field is a
// combobox, so any Google Fonts family works by name. `custom` covers anything else (URL).
const FONT_SOURCES = ['system', 'google', 'custom'];
const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'DM Sans', 'Manrope', 'Work Sans', 'Plus Jakarta Sans', 'Source Sans 3',
    'Space Grotesk', 'Bricolage Grotesque', 'Fraunces', 'Playfair Display', 'Lora', 'Merriweather',
    'JetBrains Mono', 'IBM Plex Mono',
];
const SYSTEM_FONTS = ['system-ui', 'Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Verdana', 'Courier New'];
const FALLBACKS = ['sans-serif', 'serif', 'monospace'];

const SCALES = ['compact', 'comfortable', 'spacious'];
const WEIGHTS = ['400', '500', '600', '700'];
const TRACKINGS = ['tight', 'normal', 'wide'];
const RADII = ['none', 'sm', 'md', 'lg', 'full'];
const BORDERS = ['0', '1', '2'];
const DENSITIES = ['compact', 'cozy', 'comfortable'];
const ELEVATIONS = ['none', 'soft', 'strong'];

// Presets seed the palette + tokens for the Add form.
const PRESETS: Record<string, DsTokens> = {
    earthy: {
        palette: ['#C85A2A', '#F2C57C', '#F6F1EB', '#3B2F2F', '#2E7D32'],
        color: {
            primary: { light: '#C85A2A', dark: '#E0723F' }, accent: { light: '#F2C57C', dark: '#F2C57C' },
            background: { light: '#F6F1EB', dark: '#1B1714' }, surface: { light: '#FFFFFF', dark: '#262019' },
            text: { light: '#3B2F2F', dark: '#F6F1EB' }, muted: { light: '#8A7F75', dark: '#A89A8C' },
            border: { light: '#E4DACE', dark: '#3A322B' }, success: { light: '#2E7D32', dark: '#4CAF50' }, danger: { light: '#C0392B', dark: '#E57368' },
        },
        typography: { fonts: [
            { name: 'display', source: 'google', family: 'Fraunces', weights: [400, 600, 700], fallback: 'serif' },
            { name: 'body', source: 'google', family: 'Inter', weights: [400, 500], fallback: 'sans-serif' },
        ], scale: 'comfortable', weightHeading: '600', tracking: 'tight' },
        shape: { radius: 'lg', borderWidth: '1' }, density: 'cozy', elevation: 'soft',
    },
    ocean: {
        palette: ['#0E7490', '#22D3EE', '#F0F9FF', '#0F172A', '#16A34A'],
        color: {
            primary: { light: '#0E7490', dark: '#22D3EE' }, accent: { light: '#22D3EE', dark: '#67E8F9' },
            background: { light: '#F0F9FF', dark: '#0B1220' }, surface: { light: '#FFFFFF', dark: '#0F172A' },
            text: { light: '#0F172A', dark: '#E2E8F0' }, muted: { light: '#64748B', dark: '#94A3B8' },
            border: { light: '#BAE6FD', dark: '#1E293B' }, success: { light: '#16A34A', dark: '#4ADE80' }, danger: { light: '#DC2626', dark: '#F87171' },
        },
        typography: { fonts: [
            { name: 'display', source: 'google', family: 'Space Grotesk', weights: [400, 600, 700], fallback: 'sans-serif' },
            { name: 'body', source: 'google', family: 'Inter', weights: [400, 500], fallback: 'sans-serif' },
        ], scale: 'compact', weightHeading: '600', tracking: 'normal' },
        shape: { radius: 'md', borderWidth: '1' }, density: 'compact', elevation: 'strong',
    },
    minimal: {
        palette: ['#111827', '#6B7280', '#FFFFFF', '#E5E7EB', '#10B981'],
        color: {
            primary: { light: '#111827', dark: '#F9FAFB' }, accent: { light: '#6B7280', dark: '#9CA3AF' },
            background: { light: '#FFFFFF', dark: '#0A0A0A' }, surface: { light: '#FFFFFF', dark: '#171717' },
            text: { light: '#111827', dark: '#F9FAFB' }, muted: { light: '#6B7280', dark: '#9CA3AF' },
            border: { light: '#E5E7EB', dark: '#262626' }, success: { light: '#10B981', dark: '#34D399' }, danger: { light: '#EF4444', dark: '#F87171' },
        },
        typography: { fonts: [
            { name: 'display', source: 'google', family: 'Inter', weights: [400, 600], fallback: 'sans-serif' },
            { name: 'body', source: 'google', family: 'Inter', weights: [400, 500], fallback: 'sans-serif' },
        ], scale: 'comfortable', weightHeading: '600', tracking: 'normal' },
        shape: { radius: 'sm', borderWidth: '1' }, density: 'comfortable', elevation: 'none',
    },
    vibrant: {
        palette: ['#7C3AED', '#EC4899', '#FAF5FF', '#1E1B2E', '#F59E0B'],
        color: {
            primary: { light: '#7C3AED', dark: '#A78BFA' }, accent: { light: '#EC4899', dark: '#F472B6' },
            background: { light: '#FAF5FF', dark: '#15101F' }, surface: { light: '#FFFFFF', dark: '#221A33' },
            text: { light: '#1E1B2E', dark: '#F3E8FF' }, muted: { light: '#8B7FA3', dark: '#B6A9CC' },
            border: { light: '#EDE0FB', dark: '#3A2E52' }, success: { light: '#10B981', dark: '#34D399' }, danger: { light: '#E11D48', dark: '#FB7185' },
        },
        typography: { fonts: [
            { name: 'display', source: 'google', family: 'Space Grotesk', weights: [400, 700], fallback: 'sans-serif' },
            { name: 'body', source: 'google', family: 'Inter', weights: [400, 500], fallback: 'sans-serif' },
        ], scale: 'spacious', weightHeading: '700', tracking: 'tight' },
        shape: { radius: 'full', borderWidth: '0' }, density: 'cozy', elevation: 'strong',
    },
    custom: {
        palette: ['#888888'],
        color: {
            primary: { light: '#3B82F6', dark: '#60A5FA' }, background: { light: '#FFFFFF', dark: '#0B0B0B' },
            surface: { light: '#FFFFFF', dark: '#171717' }, text: { light: '#111111', dark: '#F5F5F5' }, border: { light: '#E5E7EB', dark: '#262626' },
        },
        typography: { fonts: [
            { name: 'display', source: 'system', family: 'system-ui', fallback: 'sans-serif' },
            { name: 'body', source: 'system', family: 'system-ui', fallback: 'sans-serif' },
        ], scale: 'comfortable', weightHeading: '600', tracking: 'normal' },
        shape: { radius: 'md', borderWidth: '1' }, density: 'cozy', elevation: 'soft',
    },
};

const clone = <T,>(o: T): T => JSON.parse(JSON.stringify(o));

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-design-system-102020')
export class PluginSelectDesignSystem extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) value: number | null = 0;

    @state() private _entries: IDsEntry[] = [];
    @state() private _loading = false;

    // ── working token model (edit + add share it) ─────────────────────
    @state() private _name = '';
    @state() private _desc = '';
    @state() private _skill = DS_SKILL_DEFAULT;
    @state() private _palette: string[] = [];
    @state() private _roles: IRole[] = [];
    @state() private _fonts: DsFont[] = [];                                   // dynamic font roles
    @state() private _typography: NonNullable<DsTokens['typography']> = {};   // scale / weightHeading / tracking
    @state() private _shape: NonNullable<DsTokens['shape']> = {};
    @state() private _density = 'cozy';
    @state() private _elevation = 'soft';

    @state() private _editingKey: number | null = null;   // which DS the form is synced to
    @state() private _addPreset: string | null = null;    // selected preset in Add view
    @state() private _nameError = false;
    @state() private _saving = false;
    @state() private _saveError = '';

    // ── AI generation (Add view; task 12) ──────────────────────────────
    @state() private _aiBrief = '';
    @state() private _aiUsePalette = false;
    @state() private _generating = false;
    @state() private _genError = '';
    private _threadCache = new Map<string, Promise<any>>();

    connectedCallback() {
        super.connectedCallback();
        if (this.projectId) this._loadConfig(this.projectId);
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('projectId')) {
            this._entries = [];
            this._editingKey = null;
            if (this.projectId) this._loadConfig(this.projectId);
        }
        if (changed.has('value')) this._editingKey = null; // re-sync the form to the new target
        this._syncForm();
    }

    // ── knob math (0=All, 1..N=DS, customKey=Add) ─────────────────────
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

    // ── loading ───────────────────────────────────────────────────────
    private async _loadConfig(projectId: number): Promise<void> {
        this._loading = true;
        this.requestUpdate();
        try {
            const config: any = await getConfigProject(projectId);
            const dsMap = (config?.designSystems ?? {}) as Record<string, { name: string; skill?: string; tokens?: DsTokens }>;
            this._entries = Object.keys(dsMap).map(Number).sort((a, b) => a - b).map(k => ({
                key: k,
                name: dsMap[k].name,
                description: (dsMap[k] as any).description ?? '',
                skill: dsMap[k].skill ?? DS_SKILL_DEFAULT,
                tokens: dsMap[k].tokens ?? {},
            }));
        } catch {
            this._entries = [];
        }
        this._loading = false;
        this.requestUpdate();
    }

    // ── form sync ──────────────────────────────────────────────────────
    /** The default DS (lowest key, conventionally 1) carries no styling — name + description only. */
    private get _isDefaultDs(): boolean {
        const entry = this._selectedEntry;
        return !!entry && this._entries.length > 0 && entry.key === this._entries[0].key;
    }

    private _syncForm(): void {
        if (!this.projectId || this._loading) return;
        if (this._isAdd) {
            if (this._editingKey !== this._customKey) { this._loadDraft(PRESETS.earthy, '', '', null); this._editingKey = this._customKey; }
        } else if (this.value !== null && this.value > 0) {
            const entry = this._selectedEntry;
            if (entry && this._editingKey !== entry.key) { this._loadFromEntry(entry); this._editingKey = entry.key; }
        }
    }

    private _loadDraft(tokens: DsTokens, name: string, desc: string, preset: string | null): void {
        const t = clone(tokens);
        this._name = name;
        this._desc = desc;
        this._skill = DS_SKILL_DEFAULT;
        this._palette = [...(t.palette ?? [])];
        this._roles = Object.entries(t.color ?? {}).map(([n, v]) => ({ name: n, light: v.light, dark: v.dark }));
        this._fonts = this._fontsFromTokens(t.typography);
        this._typography = { scale: t.typography?.scale, weightHeading: t.typography?.weightHeading, tracking: t.typography?.tracking };
        this._shape = { ...(t.shape ?? {}) };
        this._density = t.density ?? 'cozy';
        this._elevation = t.elevation ?? 'soft';
        this._addPreset = preset;
        this._nameError = false; this._saveError = ''; this._saving = false;
    }

    private _loadFromEntry(entry: IDsEntry): void {
        this._loadDraft(entry.tokens, entry.name, entry.description, null);
        this._skill = entry.skill || DS_SKILL_DEFAULT;
    }

    /** Font roles from the tokens (new `fonts[]`), falling back to legacy fontDisplay/fontBody. */
    private _fontsFromTokens(t?: DsTokens['typography']): DsFont[] {
        if (t && Array.isArray(t.fonts) && t.fonts.length) return t.fonts.map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined }));
        const legacy: DsFont[] = [];
        if (t?.fontDisplay) legacy.push({ name: 'display', source: 'system', family: t.fontDisplay });
        if (t?.fontBody) legacy.push({ name: 'body', source: 'system', family: t.fontBody });
        return legacy;
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
        const palette = entry.tokens.palette ?? [];
        const tokenCount = Object.keys(entry.tokens.color ?? {}).length;
        return html`
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 flex flex-col gap-2 cursor-pointer transition-colors"
                @click=${() => this._dispatchSelect(entry.key)}>
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">${entry.name}</span>
                    <span class="ml-auto shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">styles/${entry.key}</span>
                </div>
                ${entry.description
                    ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-2">${entry.description}</span>`
                    : nothing}
                <div class="flex h-6 rounded-md overflow-hidden border border-black/5">
                    ${palette.length
                        ? palette.map(c => html`<span class="flex-1" style="background:${c}"></span>`)
                        : html`<span class="flex-1 bg-gray-100 dark:bg-gray-800"></span>`}
                </div>
                <div class="flex gap-2 flex-wrap text-[10px] text-gray-400 dark:text-gray-500">
                    <span>${tokenCount} ${this.msg.tokensSuffix}</span>
                    ${entry.tokens.shape?.radius ? html`<span>radius ${entry.tokens.shape.radius}</span>` : nothing}
                    ${entry.tokens.density ? html`<span>${entry.tokens.density}</span>` : nothing}
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

    // ── scenario: EDIT ──────────────────────────────────────────────────
    private _renderEdit() {
        const entry = this._selectedEntry;
        if (!entry) return nothing;
        // The default DS has no styling tokens — only identity (name + description).
        if (this._isDefaultDs) {
            return html`
                <div class="flex flex-col gap-3">
                    ${this._navHeader(entry.name, this.msg.desc, this.value ?? 0)}
                    ${this._renderDefaultNote()}
                    ${this._renderNameField()}
                    ${this._renderDescField()}
                    ${this._saveError ? this._renderSaveError() : nothing}
                    ${this._renderSave(this.msg.save)}
                </div>
            `;
        }
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(entry.name, this.msg.desc, this.value ?? 0)}
                ${this._renderNameField()}
                ${this._renderDescField()}
                ${this._renderEditor()}
                ${this._renderSave(this.msg.save)}
            </div>
        `;
    }

    // ── scenario: ADD ───────────────────────────────────────────────────
    private _renderAdd() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(this.msg.addTitle, this.msg.addDesc, this._customKey)}
                ${this._renderNameField()}
                ${this._renderDescField()}
                ${this._renderAiSection()}
                ${this._renderPresetPicker()}
                ${this._renderEditor()}
                ${this._renderSave(this.msg.create)}
            </div>
        `;
    }

    private _renderDefaultNote() {
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2">
                <span class="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">${this.msg.defaultNote}</span>
            </div>
        `;
    }

    private _renderPresetPicker() {
        return html`
            <div class="flex flex-col gap-1.5">
                <label class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.startFrom}</label>
                <div class="flex flex-wrap gap-1.5">
                    ${Object.keys(PRESETS).map(key => this._renderPresetChip(key))}
                </div>
            </div>
        `;
    }

    private _renderPresetChip(key: string) {
        const active = this._addPreset === key;
        const palette = (PRESETS[key].palette ?? []).slice(0, 5);
        const label = key === 'custom' ? this.msg.custom : key;
        return html`
            <button
                class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer
                    ${active ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'}"
                @click=${() => this._selectPreset(key)}>
                <span class="flex h-4 w-14 rounded overflow-hidden border border-black/10">
                    ${palette.map(c => html`<span class="flex-1" style="background:${c}"></span>`)}
                </span>
                <span class="text-xs font-semibold capitalize text-gray-600 dark:text-gray-300">${label}</span>
            </button>
        `;
    }

    private _selectPreset(key: string): void {
        const keepName = this._name.trim();
        const keepDesc = this._desc;
        this._loadDraft(PRESETS[key], keepName || (key === 'custom' ? '' : key), keepDesc, key);
    }

    // ── AI generation (Add view; task 12) ───────────────────────────────
    // brief and/or palette → agentGenerateDs → sanitized DsTokens draft loaded into THIS form
    // (nothing committed; the user reviews and clicks "Create design system" as usual).

    private _renderAiSection() {
        const canGenerate = !this._generating && (this._aiBrief.trim().length > 0 || this._aiUsePalette);
        return this._section(this.msg.aiTitle, this.msg.aiTag, true, html`
            <p class="text-[11px] text-gray-400 dark:text-gray-500">${this.msg.aiHint}</p>
            <textarea rows="3"
                class="w-full text-[11px]! px-2.5 py-1.5 rounded-md resize-y border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder=${this.msg.aiBriefPlaceholder} .value=${this._aiBrief}
                ?disabled=${this._generating}
                @input=${(e: Event) => { this._aiBrief = (e.target as HTMLTextAreaElement).value; }}></textarea>
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" class="accent-indigo-500" .checked=${this._aiUsePalette}
                    ?disabled=${this._generating}
                    @change=${(e: Event) => { this._aiUsePalette = (e.target as HTMLInputElement).checked; }} />
                <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.aiUsePalette}</span>
                <span class="flex h-3.5 w-12 rounded overflow-hidden border border-black/10 ${this._aiUsePalette ? '' : 'opacity-40'}">
                    ${this._palette.slice(0, 6).map(c => html`<span class="flex-1" style="background:${c}"></span>`)}
                </span>
            </label>
            ${this._genError ? html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5"><span class="text-[11px] text-red-600 dark:text-red-400">${this._genError}</span></div>` : nothing}
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                ?disabled=${!canGenerate} @click=${() => this._onGenerate()}>
                ${this._generating ? this.msg.aiGenerating : this.msg.aiGenerate}</button>
        `);
    }

    private async _onGenerate(): Promise<void> {
        if (!this.projectId || this._generating) return;
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

        this._generating = true;
        this._genError = '';
        try {
            await this._executeAgent('agentGenerateDs', prompt);
            const config: any = await getConfigProject(this.projectId);
            const draft = config?.dsDraft;
            if (!draft || draft.requestId !== requestId || !draft.tokens) throw new Error('generation produced no draft');
            const keepName = this._name.trim();
            const keepDesc = this._desc.trim();
            this._loadDraft(draft.tokens, keepName || draft.name || '', keepDesc || draft.description || '', null);
            delete config.dsDraft; // consume the one-shot draft
            await updateConfigProject(this.projectId, config);
        } catch (err) {
            console.error('[selectDesignSystem] generate failed', err);
            this._genError = this.msg.aiError;
        }
        this._generating = false;
    }

    private async _executeAgent(agentName: string, prompt: string): Promise<void> {
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
        for await (const _event of executeBeforePromptStream(moduleAgent, context)) {
            // consume the whole lifecycle (LLM + afterPromptStep) — result lands on the config
        }
    }

    // ── the editor (palette + colors + typography + shape + elevation) ──
    private _renderEditor() {
        return html`
            <datalist id="ds-google-fonts">${GOOGLE_FONTS.map(f => html`<option value=${f}></option>`)}</datalist>
            <div class="flex flex-col gap-2.5">
                ${this._renderPaletteSection()}
                ${this._renderColorsSection()}
                ${this._renderTypographySection()}
                ${this._renderShapeSection()}
                ${this._renderElevationSection()}
            </div>
            ${this._saveError ? this._renderSaveError() : nothing}
        `;
    }

    private _renderSaveError() {
        return html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5"><span class="text-[11px] text-red-600 dark:text-red-400">${this._saveError}</span></div>`;
    }

    private _section(title: string, tag: string | null, open: boolean, body: unknown) {
        return html`
            <details class="group rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden" ?open=${open}>
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2.5 flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${title}</span>
                    ${tag ? html`<span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">${tag}</span>` : nothing}
                    <svg class="ml-auto w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </summary>
                <div class="px-3 pb-3 pt-2 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800/70">${body}</div>
            </details>
        `;
    }

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

    private _renderColorsSection() {
        return this._section(this.msg.colorsTitle, this.msg.colorsTag, true, html`
            <div class="grid grid-cols-[58px_1fr_1fr_18px] gap-1.5 items-center text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-0.5">
                <span>${this.msg.tokenCol}</span><span>${this.msg.light}</span><span>${this.msg.dark}</span><span></span>
            </div>
            <div class="flex flex-col gap-1.5">
                ${this._roles.map((r, i) => this._renderRoleRow(r, i))}
            </div>
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                @click=${() => this._addRole()}>${this.msg.addToken}</button>
        `);
    }

    private _renderRoleRow(role: IRole, i: number) {
        return html`
            <div class="grid grid-cols-[58px_1fr_1fr_18px] gap-1.5 items-center">
                <input class="min-w-0 text-[11px]! font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-1.5 py-1.5 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-900 outline-none"
                    .value=${role.name} placeholder="token"
                    @input=${(e: Event) => { role.name = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'); }} />
                ${this._colorField(role, 'light')}
                ${this._colorField(role, 'dark')}
                <button class="text-gray-400 hover:text-red-500 text-base cursor-pointer rounded h-6 leading-none"
                    @click=${() => { this._roles = this._roles.filter((_, j) => j !== i); }}>×</button>
            </div>
        `;
    }

    private _colorField(role: IRole, variant: 'light' | 'dark') {
        const hex = role[variant];
        return html`
            <div class="flex items-center gap-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-md px-1 py-1 bg-white dark:bg-gray-900">
                <label class="relative w-4 h-4 rounded border border-black/10 overflow-hidden cursor-pointer shrink-0" style="background:${hex}">
                    <input type="color" class="absolute inset-0 opacity-0 cursor-pointer" .value=${hex}
                        @input=${(e: Event) => { role[variant] = (e.target as HTMLInputElement).value.toUpperCase(); this.requestUpdate(); }} />
                </label>
                <input class="w-full min-w-0 text-[10px]! font-mono uppercase text-gray-600 dark:text-gray-400 bg-transparent border-0 outline-none p-0"
                    .value=${hex}
                    @change=${(e: Event) => { const v = (e.target as HTMLInputElement).value; if (/^#[0-9a-fA-F]{6}$/.test(v)) { role[variant] = v.toUpperCase(); this.requestUpdate(); } }} />
            </div>
        `;
    }

    private _addRole(): void {
        this._roles = [...this._roles, { name: '', light: '#888888', dark: '#888888' }];
    }

    private _renderTypographySection() {
        const t = this._typography;
        return this._section(this.msg.typography, this.msg.fontsTag, false, html`
            <div class="flex flex-col gap-2">
                ${this._fonts.map((f, i) => this._renderFontCard(f, i))}
            </div>
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                @click=${() => this._addFont()}>${this.msg.addFont}</button>

            <div class="border-t border-gray-100 dark:border-gray-800/70 pt-3 flex flex-col gap-3">
                ${this._renderSegField(this.msg.scale, SCALES, t.scale ?? 'comfortable', v => { this._typography = { ...this._typography, scale: v }; })}
                <div class="grid grid-cols-2 gap-3">
                    ${this._renderSelect(this.msg.headingWeight, WEIGHTS, t.weightHeading ?? '600', v => { this._typography = { ...this._typography, weightHeading: v }; })}
                    ${this._renderSelect(this.msg.tracking, TRACKINGS, t.tracking ?? 'normal', v => { this._typography = { ...this._typography, tracking: v }; })}
                </div>
            </div>
        `);
    }

    private _renderFontCard(font: DsFont, i: number) {
        const source = font.source ?? 'system';
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <input class="min-w-0 flex-1 text-[11px]! font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 border border-transparent focus:border-indigo-400 outline-none"
                        .value=${font.name} placeholder=${this.msg.fontRolePlaceholder}
                        @input=${(e: Event) => { font.name = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'); }} />
                    <span class="text-[9px] font-mono text-gray-400 dark:text-gray-500">--ds-font-${font.name || '?'}</span>
                    <button class="text-gray-400 hover:text-red-500 text-base leading-none cursor-pointer"
                        @click=${() => { this._fonts = this._fonts.filter((_, j) => j !== i); }}>×</button>
                </div>

                ${this._renderSegField(this.msg.fontSource, FONT_SOURCES, source, v => { font.source = v as DsFont['source']; this.requestUpdate(); })}

                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFamily}</label>
                        ${source === 'system'
                            ? this._renderInlineSelect(SYSTEM_FONTS, font.family, v => { font.family = v; this.requestUpdate(); })
                            : html`<input class="min-w-0 text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                                list=${source === 'google' ? 'ds-google-fonts' : nothing}
                                .value=${font.family} placeholder=${this.msg.fontFamilyPlaceholder}
                                @input=${(e: Event) => { font.family = (e.target as HTMLInputElement).value; this.requestUpdate(); }} />`}
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFallback}</label>
                        ${this._renderInlineSelect(FALLBACKS, font.fallback ?? 'sans-serif', v => { font.fallback = v; this.requestUpdate(); })}
                    </div>
                </div>

                ${source !== 'system' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontWeights}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                            .value=${(font.weights ?? []).join(', ')} placeholder="400, 600, 700"
                            @change=${(e: Event) => { font.weights = this._parseWeights((e.target as HTMLInputElement).value); }} />
                    </div>` : nothing}

                ${source === 'custom' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontUrl}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400 font-mono"
                            .value=${font.url ?? ''} placeholder=${this.msg.fontUrlPlaceholder}
                            @input=${(e: Event) => { font.url = (e.target as HTMLInputElement).value.trim() || undefined; }} />
                        <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this.msg.fontUrlHint}</span>
                    </div>` : nothing}
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

    private _parseWeights(raw: string): number[] {
        return raw.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n > 0);
    }

    private _addFont(): void {
        this._fonts = [...this._fonts, { name: '', source: 'google', family: '', weights: [400], fallback: 'sans-serif' }];
    }

    private _renderShapeSection() {
        const s = this._shape;
        return this._section(this.msg.shapeDensity, null, false, html`
            ${this._renderSegField(this.msg.radius, RADII, s.radius ?? 'md', v => { this._shape = { ...this._shape, radius: v }; })}
            <div class="grid grid-cols-2 gap-3">
                ${this._renderSelect(this.msg.borderWidth, BORDERS, s.borderWidth ?? '1', v => { this._shape = { ...this._shape, borderWidth: v }; })}
                ${this._renderSegField(this.msg.density, DENSITIES, this._density, v => { this._density = v; })}
            </div>
        `);
    }

    private _renderElevationSection() {
        return this._section(this.msg.elevation, null, false, html`
            ${this._renderSegField(this.msg.shadow, ELEVATIONS, this._elevation, v => { this._elevation = v; })}
        `);
    }

    private _renderSelect(label: string, options: string[], current: string, onPick: (v: string) => void) {
        return html`
            <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${label}</label>
                <select class="min-w-0 text-[11px]! px-1.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                    @change=${(e: Event) => onPick((e.target as HTMLSelectElement).value)}>
                    ${options.map(o => html`<option ?selected=${o === current}>${o}</option>`)}
                </select>
            </div>
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

    // ── name + save ─────────────────────────────────────────────────────
    private _renderNameField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.nameLabel}</label>
                <input type="text"
                    class="w-full text-[11px]! px-2.5 py-1.5 rounded-md border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400
                        ${this._nameError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}"
                    placeholder=${this.msg.namePlaceholder} .value=${this._name}
                    @input=${(e: Event) => { this._name = (e.target as HTMLInputElement).value; this._nameError = false; }} />
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
                    @input=${(e: Event) => { this._desc = (e.target as HTMLTextAreaElement).value; }}></textarea>
            </div>
        `;
    }

    private _renderSave(label: string) {
        return html`
            <button class="self-start mt-1 text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                ?disabled=${this._saving} @click=${() => this._onSave()}>${this._saving ? this.msg.saving : label}</button>
        `;
    }

    // ── persistence ─────────────────────────────────────────────────────
    private _buildTokens(): DsTokens {
        const color: Record<string, DsColorRole> = {};
        for (const r of this._roles) {
            const n = r.name.trim();
            if (!n) continue;
            color[n] = { light: r.light, dark: r.dark };
        }
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
        return {
            palette: [...this._palette],
            color,
            typography: { fonts, scale: this._typography.scale, weightHeading: this._typography.weightHeading, tracking: this._typography.tracking },
            shape: { ...this._shape },
            density: this._density,
            elevation: this._elevation,
        };
    }

    private async _onSave(): Promise<void> {
        const name = this._name.trim();
        if (!name) { this._nameError = true; return; }
        if (!this.projectId || this._saving) return;

        const isNew = this._isAdd;
        const key = isNew ? this._customKey : (this._selectedEntry?.key ?? this._customKey);
        // The default DS keeps only identity (no styling tokens are written).
        const tokens = this._isDefaultDs ? null : this._buildTokens();

        this._saving = true;
        this._saveError = '';
        try {
            await this._persist(this.projectId, key, name, this._desc.trim(), this._skill || DS_SKILL_DEFAULT, tokens);
            // Regenerate this DS's stylesheet (styles/<ds>/global.css) so servicePreview reflects it.
            await buildDesignSystemTs(this.projectId);
        } catch (err) {
            console.error('[selectDesignSystem] save failed', err);
            this._saveError = this.msg.saveError;
            this._saving = false;
            return;
        }

        await this._loadConfig(this.projectId);
        this._saving = false;

        if (isNew) {
            // Notify the host so it rebuilds the DS knob (new entry + fresh "+" slot) and selects it.
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('ds-created', { detail: { value: key }, bubbles: true, composed: true }));
        } else {
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('save-ds', { detail: { key, isNew, name }, bubbles: true, composed: true }));
        }
    }

    private async _persist(projectId: number, key: number, name: string, description: string, skill: string, tokens: DsTokens | null): Promise<void> {
        const config: any = await getConfigProject(projectId);
        if (!config) throw new Error('project config not found');
        const current = config.designSystems;
        const designSystems: Record<string, any> =
            (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
        const existing = designSystems[key] ?? {};
        // tokens === null → default DS: keep identity only, leave any existing tokens untouched.
        designSystems[key] = tokens === null
            ? { ...existing, name, description, skill }
            : { ...existing, name, description, skill, tokens };
        config.designSystems = designSystems;
        await updateConfigProject(projectId, config);
    }

    // ── shared chrome ───────────────────────────────────────────────────
    private _navHeader(itemName: string, desc: string, value: number) {
        return html`
            <plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${desc}
                .value=${value}
                .min=${0}
                .max=${this._maxValue}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></plugins--nav-header-102020>
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
