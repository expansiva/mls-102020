/// <mls fileReference="_102020_/l2/aura/services/serviceMarketplace.ts" enhancement="_102027_/l2/enhancementLit"/>

// Marketplace prototype (collabMyFiles/marketplaceIdea.md): jobs and component packs in one list,
// with a "Mostrar" filter. All data is fictitious and lives in memory (marketplaceMock.ts);
// nothing is written to server, project, stor or localStorage, and no pack is really installed.

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import * as mk from '/_102020_/l2/aura/helpers/marketplaceMock.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Marketplace',
    prototype: 'Prototype · fictitious data',
    tabExplore: 'Explore',
    tabMine: 'Mine',
    search: 'Search…',
    newJob: '+ New job',
    fromTask: 'Create from a task',
    show: 'Show',
    showAll: 'All',
    showJobs: 'Jobs',
    showPacks: 'Components',
    kind: 'Type',
    category: 'Category',
    price: 'Price',
    allM: 'All',
    allF: 'All',
    free: 'Free',
    paid: 'Paid',
    perMonth: '/mo',
    nothingFound: 'Nothing found',
    clearFilters: 'Clear filters',
    stripJob: 'JOB',
    stripPack: 'COMPONENTS',
    badgeNew: 'NEW',
    badgeMine: 'MINE',
    nda: 'NDA',
    youGet: 'you get',
    youPay: 'you pay',
    toAgree: 'to be agreed',
    until: 'until',
    proposalsN: (n: number) => `${n} proposal${n === 1 ? '' : 's'}`,
    groupsN: (n: number) => `${n} group${n === 1 ? '' : 's'}`,
    moleculesN: (n: number) => `${n} molecule${n === 1 ? '' : 's'}`,
    installsN: (n: number) => `${n} installs`,
    reviewsN: (n: number) => `${n} reviews`,
    compatible: '✓ compatible',
    incompatible: 'incompatible with your project',
    added: 'Added',
    seeJob: 'See job',
    seePack: 'See pack',
    back: '← Back',
    by: 'by',
    version: 'version',
    updatedOn: 'updated on',
    components: 'Components',
    addToProject: 'Add to project',
    addedBtn: '✓ Added',
    noProject: 'Open a project to add this pack.',
    packAdded: (project: number) => `Pack added to project ${project} (simulation)`,
    light: 'Light',
    dark: 'Dark',
    selectMolecule: 'Choose a molecule to see its preview.',
    previewNote: 'Simulated preview (blocks). In the future, the real molecule.',
    published: 'published',
    today: 'today',
    yesterday: 'yesterday',
    daysAgo: (n: number) => `${n} days ago`,
    description: 'Description',
    scope: 'Scope',
    modulesOf: 'modules',
    readyWhen: 'Ready when',
    skills: 'Skills',
    createdFrom: 'Created from',
    invitedOnly: 'Invited only',
    yourProposal: 'Your proposal',
    jobTerms: 'Job terms. Counter-proposals are not available yet.',
    deliverUntil: 'Delivery until',
    openPriceHint: 'This job is "to be agreed": tell the value.',
    plan: 'How I will do it',
    questions: 'Questions',
    acceptNda: 'I read and accept the confidentiality term (NDA)',
    send: 'Send proposal',
    errRequired: 'Required',
    errPastDate: 'The date must be in the future',
    errInvalidPrice: 'Invalid value',
    errNda: 'Accept the term to send',
    sentOn: 'Sent on',
    edit: 'Edit',
    withdraw: 'Withdraw',
    jobIsYours: 'This job is yours',
    receivedN: (n: number) => `${n} proposal${n === 1 ? '' : 's'} received`,
    newJobTitle: 'New job',
    sec1: '1 · What needs to be done',
    sec2: '2 · Where',
    sec3: '3 · Ready when',
    sec4: '4 · Terms',
    fTitle: 'Title',
    fKind: 'Type',
    fDescription: 'Description',
    fModules: 'Modules',
    fCriteria: 'Criteria',
    fDeadline: 'Deadline',
    fPrice: 'Value',
    fixed: 'Fixed',
    fSkills: 'Skills',
    fVisibility: 'Who sees it',
    public: 'Public',
    invited: 'Invited only',
    fNda: 'Requires a confidentiality term',
    typeEnter: 'type + Enter',
    cancel: 'Cancel',
    publish: 'Publish',
    cardPreview: 'Card preview',
    chooseTask: 'Choose a task',
    searchTask: 'Search task',
    useTask: 'Use this task',
    noTasks: 'No task found',
    severalModules: '(several)',
    mineJobs: 'Jobs I published',
    mineProposals: 'My proposals',
    minePacks: 'Added packs',
    emptyMineJobs: 'You have not published jobs yet. Use + New job.',
    emptyMineProposals: 'You have not sent proposals yet. Open a job in Explore.',
    emptyMinePacks: 'You have not added packs yet. Open a pack in Explore.',
    project: 'project',
    myCompany: 'My company',
    kinds: {
        bug: 'Bug', newScreen: 'New screen', integration: 'Integration',
        visual: 'Visual tweak', backend: 'Backend', spec: 'Spec',
    } as Record<mk.JobKind, string>,
    categories: {
        forms: 'Forms', tables: 'Tables', charts: 'Charts',
        calendar: 'Calendar', cards: 'Cards', navigation: 'Navigation',
    } as Record<mk.PackCategory, string>,
    sources: {
        pin: 'Pins', error: 'Errors', route: 'Routes', pipeline: 'Pipeline', component: 'Components',
    } as Record<mk.TaskSource, string>,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Marketplace',
        prototype: 'Protótipo · dados fictícios',
        tabExplore: 'Explorar',
        tabMine: 'Meus',
        search: 'Buscar…',
        newJob: '+ Novo job',
        fromTask: 'Criar a partir de uma task',
        show: 'Mostrar',
        showAll: 'Tudo',
        showJobs: 'Jobs',
        showPacks: 'Componentes',
        kind: 'Tipo',
        category: 'Categoria',
        price: 'Preço',
        allM: 'Todos',
        allF: 'Todas',
        free: 'Grátis',
        paid: 'Pagos',
        perMonth: '/mês',
        nothingFound: 'Nada encontrado',
        clearFilters: 'Limpar filtros',
        stripJob: 'JOB',
        stripPack: 'COMPONENTES',
        badgeNew: 'NOVO',
        badgeMine: 'MEU',
        nda: 'NDA',
        youGet: 'você recebe',
        youPay: 'você paga',
        toAgree: 'a combinar',
        until: 'até',
        proposalsN: (n: number) => `${n} proposta${n === 1 ? '' : 's'}`,
        groupsN: (n: number) => `${n} grupo${n === 1 ? '' : 's'}`,
        moleculesN: (n: number) => `${n} molécula${n === 1 ? '' : 's'}`,
        installsN: (n: number) => `${n} instalações`,
        reviewsN: (n: number) => `${n} avaliações`,
        compatible: '✓ compatível',
        incompatible: 'incompatível com seu projeto',
        added: 'Adicionado',
        seeJob: 'Ver job',
        seePack: 'Ver pacote',
        back: '← Voltar',
        by: 'por',
        version: 'versão',
        updatedOn: 'atualizado em',
        components: 'Componentes',
        addToProject: 'Adicionar ao projeto',
        addedBtn: '✓ Adicionado',
        noProject: 'Abra um projeto para adicionar este pacote.',
        packAdded: (project: number) => `Pacote adicionado ao projeto ${project} (simulação)`,
        light: 'Claro',
        dark: 'Escuro',
        selectMolecule: 'Escolha uma molécula para ver a prévia.',
        previewNote: 'Prévia simulada (blocos). No futuro, a molécula de verdade.',
        published: 'publicado',
        today: 'hoje',
        yesterday: 'ontem',
        daysAgo: (n: number) => `há ${n} dias`,
        description: 'Descrição',
        scope: 'Escopo',
        modulesOf: 'módulos',
        readyWhen: 'Pronto quando',
        skills: 'Habilidades',
        createdFrom: 'Criado a partir de',
        invitedOnly: 'Só convidados',
        yourProposal: 'Sua proposta',
        jobTerms: 'Condições do job. Contraproposta ainda não está disponível.',
        deliverUntil: 'Entrega até',
        openPriceHint: 'Este job é "a combinar": informe o valor.',
        plan: 'Como vou fazer',
        questions: 'Perguntas',
        acceptNda: 'Li e aceito o termo de confidencialidade (NDA)',
        send: 'Enviar proposta',
        errRequired: 'Obrigatório',
        errPastDate: 'A data precisa ser no futuro',
        errInvalidPrice: 'Valor inválido',
        errNda: 'Aceite o termo para enviar',
        sentOn: 'Enviada em',
        edit: 'Editar',
        withdraw: 'Retirar',
        jobIsYours: 'Este job é seu',
        receivedN: (n: number) => `${n} proposta${n === 1 ? '' : 's'} recebida${n === 1 ? '' : 's'}`,
        newJobTitle: 'Novo job',
        sec1: '1 · O que precisa ser feito',
        sec2: '2 · Onde',
        sec3: '3 · Pronto quando',
        sec4: '4 · Condições',
        fTitle: 'Título',
        fKind: 'Tipo',
        fDescription: 'Descrição',
        fModules: 'Módulos',
        fCriteria: 'Critérios',
        fDeadline: 'Prazo',
        fPrice: 'Valor',
        fixed: 'Fixo',
        fSkills: 'Habilidades',
        fVisibility: 'Quem vê',
        public: 'Público',
        invited: 'Só convidados',
        fNda: 'Exige termo de confidencialidade',
        typeEnter: 'digite + Enter',
        cancel: 'Cancelar',
        publish: 'Publicar',
        cardPreview: 'Prévia do cartão',
        chooseTask: 'Escolher uma task',
        searchTask: 'Buscar task',
        useTask: 'Usar esta task',
        noTasks: 'Nenhuma task encontrada',
        severalModules: '(vários)',
        mineJobs: 'Jobs que publiquei',
        mineProposals: 'Minhas propostas',
        minePacks: 'Pacotes adicionados',
        emptyMineJobs: 'Você ainda não publicou jobs. Use + Novo job.',
        emptyMineProposals: 'Você ainda não enviou propostas. Abra um job em Explorar.',
        emptyMinePacks: 'Você ainda não adicionou pacotes. Abra um pacote em Explorar.',
        project: 'projeto',
        myCompany: 'Minha empresa',
        kinds: {
            bug: 'Bug', newScreen: 'Nova tela', integration: 'Integração',
            visual: 'Ajuste visual', backend: 'Backend', spec: 'Spec',
        },
        categories: {
            forms: 'Formulários', tables: 'Tabelas', charts: 'Gráficos',
            calendar: 'Agenda', cards: 'Cartões', navigation: 'Navegação',
        },
        sources: {
            pin: 'Pins', error: 'Erros', route: 'Rotas', pipeline: 'Pipeline', component: 'Componentes',
        },
    },
};
/// **collab_i18n_end**

// ─── Look ────────────────────────────────────────────────────────────

const KIND_CLASS: Record<mk.JobKind, string> = {
    bug: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    newScreen: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    integration: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    visual: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
    backend: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    spec: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
};

const SOURCE_ICON: Record<mk.TaskSource, string> = {
    pin: '📌', error: '⚠', route: '🔌', pipeline: '⛓', component: '🧩',
};

type Shape = 'form' | 'chart' | 'table' | 'calendar' | 'cards' | 'nav' | 'rate' | 'metric';

const CATEGORY_SHAPE: Record<mk.PackCategory, Shape> = {
    forms: 'form', charts: 'chart', tables: 'table', calendar: 'calendar', cards: 'cards', navigation: 'nav',
};

interface IPalette { bg: string; soft: string; accent: string; line: string; text: string }

/** Follows the studio theme (cards). */
const PAL_THEME: IPalette = {
    bg: 'bg-gray-50 dark:bg-gray-800', soft: 'bg-gray-200 dark:bg-gray-600',
    accent: 'bg-sky-400 dark:bg-sky-500', line: 'border-gray-300 dark:border-gray-600', text: 'text-amber-400',
};
/** Forced light/dark (molecule preview toggle). */
const PAL_LIGHT: IPalette = { bg: 'bg-white', soft: 'bg-gray-200', accent: 'bg-sky-400', line: 'border-gray-300', text: 'text-amber-400' };
const PAL_DARK: IPalette = { bg: 'bg-gray-900', soft: 'bg-gray-600', accent: 'bg-sky-500', line: 'border-gray-600', text: 'text-amber-300' };

const INPUT = 'w-full text-xs border border-gray-300 dark:border-gray-700 rounded px-2 py-1.5 bg-white dark:bg-gray-900 focus:outline-none focus:border-cyan-500';
const BTN = 'px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed';
const BTN2 = 'px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 text-xs hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed';
const LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400';

type Screen = 'explore' | 'mine' | 'job' | 'pack' | 'newJob';
type TagField = 'modules' | 'criteria' | 'skills';

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-marketplace-102020')
export class ServiceMarketplace102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf07a',
        state: 'foreground',
        position: 'right',
        tooltip: 'Marketplace',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceMarketplace',
        level: [6],
    };

    public onClickMain(_op: string): void { }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        // The open project may have changed (pack "Adicionado" depends on it).
        this.requestUpdate();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;
    private _locale = 'en-US';

    @state() private _screen: Screen = 'explore';
    @state() private _returnTab: 'explore' | 'mine' = 'explore';

    @state() private _search = '';
    @state() private _show: mk.OfferShow = 'all';
    @state() private _jobKind: mk.JobKind | 'all' = 'all';
    @state() private _packCategory: mk.PackCategory | 'all' = 'all';
    @state() private _packPriceFilter: mk.PackPriceFilter = 'all';

    @state() private _jobId = '';
    @state() private _packId = '';

    @state() private _proposal: mk.IProposalDraft = mk.emptyProposalDraft();
    @state() private _proposalErrors: mk.ProposalErrors = {};
    @state() private _proposalTried = false;
    @state() private _editingProposal = false;

    @state() private _draft: mk.IJobDraft = mk.emptyDraft();
    @state() private _draftErrors: mk.DraftErrors = {};
    @state() private _draftTried = false;
    @state() private _tagText: Record<TagField, string> = { modules: '', criteria: '', skills: '' };

    @state() private _pickerOpen = false;
    @state() private _taskSearch = '';
    @state() private _taskSource: mk.TaskSource | 'all' = 'all';
    @state() private _taskId = '';

    @state() private _expanded = new Set<string>();
    @state() private _molecule = '';
    @state() private _previewDark = false;

    @state() private _highlightId = '';
    @state() private _toast = '';
    @state() private _width = 0;

    private _ro?: ResizeObserver;
    private _timers: number[] = [];

    // ─── Lifecycle ────────────────────────────────────────────────────

    createRenderRoot() { return this; }

    firstUpdated() {
        const root = this.querySelector('[data-mk-root]');
        if (!root || typeof ResizeObserver === 'undefined') return;
        this._ro = new ResizeObserver((entries) => {
            const w = Math.round(entries[0]?.contentRect.width || 0);
            if (w && w !== this._width) this._width = w;
        });
        this._ro.observe(root);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._ro?.disconnect();
        this._ro = undefined;
        this._timers.forEach((t) => clearTimeout(t));
        this._timers = [];
    }

    private _later(fn: () => void, ms: number) {
        this._timers.push(window.setTimeout(fn, ms));
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private get _today(): mk.DayString { return mk.toDay(new Date()); }
    private get _cols(): number { return this._width >= 900 ? 3 : this._width >= 520 ? 2 : 1; }
    private get _wide(): boolean { return this._width >= 720; }
    private get _project(): number { return Number(mls.actualProject) || 0; }

    private _money(n: number): string {
        return new Intl.NumberFormat(this._locale, {
            style: 'currency', currency: 'BRL',
            minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2,
        }).format(n);
    }

    private _jobPrice(price: number | null): string {
        return price === null ? this.msg.toAgree : this._money(price);
    }

    private _packPrice(p: mk.IPack): string {
        if (p.price === 0) return this.msg.free;
        return this._money(p.price) + (p.billing === 'monthly' ? this.msg.perMonth : '');
    }

    private _day(day: mk.DayString): string {
        const d = mk.parseDay(day);
        return d ? d.toLocaleDateString(this._locale, { day: '2-digit', month: '2-digit' }) : '—';
    }

    private _ago(day: mk.DayString): string {
        const n = mk.daysBetween(day, this._today);
        return n <= 0 ? this.msg.today : n === 1 ? this.msg.yesterday : this.msg.daysAgo(n);
    }

    private _rating(r: number): string {
        return `★${r.toLocaleString(this._locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
    }

    private _err(e?: mk.FieldError, ndaText = false) {
        if (!e) return nothing;
        const text = ndaText ? this.msg.errNda
            : e === 'pastDate' ? this.msg.errPastDate
                : e === 'invalidPrice' ? this.msg.errInvalidPrice : this.msg.errRequired;
        return html`<div class="text-[11px] text-red-500 mt-0.5">${text}</div>`;
    }

    private _pill(label: string, active: boolean, onClick: () => void) {
        return html`<button
            class="px-2.5 py-1 rounded-full text-xs border whitespace-nowrap ${active
                ? 'bg-cyan-600 border-cyan-600 text-white'
                : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}"
            @click=${onClick}>${label}</button>`;
    }

    private _chip(text: string, cls = 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300') {
        return html`<span class="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}">${text}</span>`;
    }

    private _flash(text: string) {
        this._toast = text;
        this._later(() => { if (this._toast === text) this._toast = ''; }, 3500);
    }

    // ─── Navigation ───────────────────────────────────────────────────

    private _goTab(tab: 'explore' | 'mine') {
        this._screen = tab;
        this._returnTab = tab;
    }

    private _back() {
        this._screen = this._returnTab;
    }

    private _openJob(id: string) {
        if (this._screen === 'explore' || this._screen === 'mine') this._returnTab = this._screen;
        this._jobId = id;
        this._proposal = mk.emptyProposalDraft();
        this._proposalErrors = {};
        this._proposalTried = false;
        this._editingProposal = false;
        this._screen = 'job';
    }

    private _openPack(id: string) {
        if (this._screen === 'explore' || this._screen === 'mine') this._returnTab = this._screen;
        this._packId = id;
        const pack = mk.getPack(id);
        this._expanded = new Set(pack?.groups.slice(0, 1).map((g) => g.name) || []);
        this._molecule = pack?.groups[0]?.molecules[0] || '';
        this._previewDark = false;
        this._screen = 'pack';
    }

    private _openNewJob(draft: mk.IJobDraft = mk.emptyDraft()) {
        if (this._screen === 'explore' || this._screen === 'mine') this._returnTab = this._screen;
        this._draft = draft;
        this._draftErrors = {};
        this._draftTried = false;
        this._tagText = { modules: '', criteria: '', skills: '' };
        this._screen = 'newJob';
    }

    private _clearFilters() {
        this._search = '';
        this._show = 'all';
        this._jobKind = 'all';
        this._packCategory = 'all';
        this._packPriceFilter = 'all';
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang] || message_en;
        this._locale = lang === 'pt' ? 'pt-BR' : 'en-US';

        return html`
            <div data-mk-root class="relative h-full min-h-full flex flex-col bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderHeader()}
                <div class="flex-1 overflow-y-auto p-3">
                    ${this._renderScreen()}
                </div>
                ${this._pickerOpen ? this._renderTaskPicker() : nothing}
                ${this._toast ? html`
                    <div class="absolute bottom-3 right-3 z-30 max-w-xs px-3 py-2 rounded shadow-lg bg-gray-900 text-white text-xs dark:bg-gray-100 dark:text-gray-900">${this._toast}</div>
                ` : nothing}
            </div>
        `;
    }

    private _renderScreen() {
        switch (this._screen) {
            case 'mine': return this._renderMine();
            case 'job': return this._renderJobDetail();
            case 'pack': return this._renderPackDetail();
            case 'newJob': return this._renderNewJob();
            default: return this._renderExplore();
        }
    }

    private _renderHeader() {
        const tab = (id: 'explore' | 'mine', label: string) => {
            const active = this._returnTab === id;
            return html`<button
                class="px-3 py-1.5 text-xs font-medium border-b-2 ${active
                    ? 'border-cyan-600 text-cyan-700 dark:text-cyan-300'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}"
                @click=${() => this._goTab(id)}>${label}</button>`;
        };
        const showSearch = this._screen === 'explore' || this._screen === 'mine';
        return html`
            <div class="flex flex-wrap items-center gap-2 px-3 pt-2 border-b border-gray-200 dark:border-gray-800">
                <div class="flex items-baseline gap-2 mr-2 pb-1.5">
                    <span class="text-sm font-semibold">${this.msg.svcTitle}</span>
                    <span class="text-[10px] text-gray-400">${this.msg.prototype}</span>
                </div>
                <div class="flex">
                    ${tab('explore', this.msg.tabExplore)}
                    ${tab('mine', this.msg.tabMine)}
                </div>
                <div class="flex-1"></div>
                ${showSearch ? html`
                    <input class="${INPUT} !w-48 mb-1.5" type="search" placeholder="🔍 ${this.msg.search}"
                        .value=${this._search}
                        @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}>
                ` : nothing}
                <button class="${BTN} mb-1.5" @click=${() => this._openNewJob()}>${this.msg.newJob}</button>
            </div>
        `;
    }

    // ─── Explorar ─────────────────────────────────────────────────────

    private _renderExplore() {
        const counts = mk.offerCounts(this._search);
        const offers = mk.getOffers({
            show: this._show, search: this._search, jobKind: this._jobKind,
            packCategory: this._packCategory, packPrice: this._packPriceFilter,
        });
        const grid = this._cols === 3 ? 'grid-cols-3' : this._cols === 2 ? 'grid-cols-2' : 'grid-cols-1';

        return html`
            <div class="flex flex-col gap-2 mb-3">
                <div class="flex flex-wrap items-center gap-1.5">
                    <span class="${LABEL} mr-1">${this.msg.show}</span>
                    ${this._pill(`${this.msg.showAll} (${counts.jobs + counts.packs})`, this._show === 'all', () => { this._show = 'all'; })}
                    ${this._pill(`💼 ${this.msg.showJobs} (${counts.jobs})`, this._show === 'jobs', () => { this._show = 'jobs'; })}
                    ${this._pill(`🧩 ${this.msg.showPacks} (${counts.packs})`, this._show === 'packs', () => { this._show = 'packs'; })}
                    <div class="flex-1"></div>
                    <button class="${BTN2}" @click=${() => this._openPicker()}>${this.msg.fromTask}</button>
                </div>
                ${this._show === 'jobs' ? html`
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="${LABEL} mr-1">${this.msg.kind}</span>
                        ${this._pill(this.msg.allM, this._jobKind === 'all', () => { this._jobKind = 'all'; })}
                        ${mk.JOB_KINDS.map((k) => this._pill(this.msg.kinds[k], this._jobKind === k, () => { this._jobKind = k; }))}
                    </div>
                ` : nothing}
                ${this._show === 'packs' ? html`
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="${LABEL} mr-1">${this.msg.category}</span>
                        ${this._pill(this.msg.allF, this._packCategory === 'all', () => { this._packCategory = 'all'; })}
                        ${mk.PACK_CATEGORIES.map((c) => this._pill(this.msg.categories[c], this._packCategory === c, () => { this._packCategory = c; }))}
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <span class="${LABEL} mr-1">${this.msg.price}</span>
                        ${this._pill(this.msg.allM, this._packPriceFilter === 'all', () => { this._packPriceFilter = 'all'; })}
                        ${this._pill(this.msg.free, this._packPriceFilter === 'free', () => { this._packPriceFilter = 'free'; })}
                        ${this._pill(this.msg.paid, this._packPriceFilter === 'paid', () => { this._packPriceFilter = 'paid'; })}
                    </div>
                ` : nothing}
            </div>

            ${offers.length ? html`
                <div class="grid ${grid} gap-3">
                    ${offers.map((o) => o.kind === 'job' ? this._renderJobCard(o.job) : this._renderPackCard(o.pack))}
                </div>
            ` : html`
                <div class="flex flex-col items-center gap-2 py-12 text-sm text-gray-400">
                    <span>${this.msg.nothingFound}</span>
                    <button class="${BTN2}" @click=${() => this._clearFilters()}>${this.msg.clearFilters}</button>
                </div>
            `}
        `;
    }

    private _renderJobCard(job: mk.IJob, opts: { preview?: boolean } = {}) {
        const highlight = this._highlightId === job.id;
        const open = opts.preview ? undefined : () => this._openJob(job.id);
        return html`
            <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-shadow ${open ? 'cursor-pointer hover:shadow-md' : ''} ${highlight ? 'ring-2 ring-amber-400 shadow-md' : ''}"
                @click=${open || nothing}>
                <div class="w-1.5 shrink-0 bg-amber-500"></div>
                <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex items-center justify-between gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-300">
                        <span>💼 ${this.msg.stripJob}</span>
                        <span class="flex gap-1">
                            ${job.isNew ? this._chip(this.msg.badgeNew, 'bg-amber-500 text-white') : nothing}
                            ${job.mine ? this._chip(this.msg.badgeMine, 'bg-cyan-600 text-white') : nothing}
                        </span>
                    </div>
                    <div class="flex-1 flex flex-col gap-1.5 p-3">
                        <div class="flex flex-wrap gap-1">
                            ${this._chip(this.msg.kinds[job.kind], KIND_CLASS[job.kind])}
                            ${job.nda ? this._chip(`🔒 ${this.msg.nda}`) : nothing}
                        </div>
                        <div class="text-sm font-semibold leading-snug break-words">${job.title || '…'}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${job.company}${job.companyRating ? ` · ${this._rating(job.companyRating)}` : ''}
                        </div>
                        ${job.skills.length ? html`
                            <div class="flex flex-wrap gap-1">${job.skills.map((s) => this._chip(s))}</div>
                        ` : nothing}
                        <div class="mt-auto pt-1 text-xs text-gray-500 dark:text-gray-400">
                            ${this.msg.until} ${this._day(job.deadline)} · ${this.msg.proposalsN(job.proposals)}
                        </div>
                        <div class="flex items-end justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                            <div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youGet}</div>
                                <div class="text-sm font-semibold text-amber-700 dark:text-amber-300">${this._jobPrice(job.price)}</div>
                            </div>
                            ${open ? html`<button class="${BTN2}">${this.msg.seeJob}</button>` : nothing}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private _renderPackCard(pack: mk.IPack) {
        const installed = this._project ? mk.isInstalled(pack.id, this._project) : false;
        return html`
            <div class="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:shadow-md transition-shadow"
                @click=${() => this._openPack(pack.id)}>
                <div class="w-1.5 shrink-0 bg-sky-500"></div>
                <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex items-center justify-between gap-2 px-3 py-1 bg-sky-50 dark:bg-sky-950/40 text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300">
                        <span>🧩 ${this.msg.stripPack}</span>
                        ${installed ? this._chip(this.msg.added, 'bg-emerald-600 text-white') : nothing}
                    </div>
                    <div class="flex-1 flex flex-col gap-1.5 p-3">
                        <div class="h-20 rounded overflow-hidden">${this._renderBlocks(CATEGORY_SHAPE[pack.category], PAL_THEME)}</div>
                        <div class="text-sm font-semibold leading-snug">${pack.name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">${pack.author} · ${this.msg.categories[pack.category]}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                            ${this.msg.groupsN(pack.groups.length)} · ${this.msg.moleculesN(mk.moleculeCount(pack))}
                        </div>
                        <div class="mt-auto text-xs text-gray-500 dark:text-gray-400">
                            ${this._rating(pack.rating)} · ${this.msg.installsN(pack.installs)}
                        </div>
                        <div class="flex items-end justify-between gap-2 pt-1 border-t border-gray-100 dark:border-gray-800">
                            <div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youPay}</div>
                                <div class="text-sm font-semibold text-sky-700 dark:text-sky-300">${this._packPrice(pack)}</div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span class="text-[10px] ${pack.compatible ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}">
                                    ${pack.compatible ? this.msg.compatible : this.msg.incompatible}
                                </span>
                                <button class="${BTN2}">${this.msg.seePack}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Block previews (prototype: no real molecule) ─────────────────

    private _shapeOfMolecule(name: string, pack: mk.IPack): Shape {
        if (/chart/.test(name)) return 'chart';
        if (/metric/.test(name)) return 'metric';
        if (/table/.test(name)) return 'table';
        if (/calendar/.test(name)) return 'calendar';
        if (/rate/.test(name)) return 'rate';
        if (/card/.test(name)) return 'cards';
        if (/nav/.test(name)) return 'nav';
        if (/input|textarea|search/.test(name)) return 'form';
        return CATEGORY_SHAPE[pack.category];
    }

    private _renderBlocks(shape: Shape, p: IPalette): TemplateResult {
        const box = `h-full w-full p-2 ${p.bg}`;
        switch (shape) {
            case 'form':
                return html`<div class="${box} flex flex-col justify-center gap-1.5">
                    ${[0, 1, 2].map((i) => html`<div class="flex flex-col gap-0.5">
                        <div class="h-1 rounded ${p.soft}" style="width:${30 + i * 10}%"></div>
                        <div class="h-3 rounded border ${p.line}"></div>
                    </div>`)}
                </div>`;
            case 'chart':
                return html`<div class="${box} flex items-end gap-1">
                    ${[40, 65, 50, 85, 70, 95, 60].map((h) => html`<div class="flex-1 rounded-t ${p.accent}" style="height:${h}%"></div>`)}
                </div>`;
            case 'table':
                return html`<div class="${box} flex flex-col gap-1">
                    <div class="h-2 rounded ${p.accent}"></div>
                    ${[0, 1, 2, 3].map(() => html`<div class="flex gap-1">
                        <div class="h-1.5 flex-[2] rounded ${p.soft}"></div>
                        <div class="h-1.5 flex-1 rounded ${p.soft}"></div>
                        <div class="h-1.5 flex-1 rounded ${p.soft}"></div>
                    </div>`)}
                </div>`;
            case 'calendar':
                return html`<div class="${box} grid grid-cols-7 gap-0.5 content-center">
                    ${Array.from({ length: 28 }, (_, i) => html`<div class="h-2.5 rounded-sm ${[3, 9, 10, 17, 24].includes(i) ? p.accent : p.soft}"></div>`)}
                </div>`;
            case 'cards':
                return html`<div class="${box} grid grid-cols-3 gap-1 items-center">
                    ${[0, 1, 2].map(() => html`<div class="flex flex-col gap-0.5 rounded border ${p.line} p-0.5">
                        <div class="h-5 rounded-sm ${p.accent}"></div>
                        <div class="h-1 rounded ${p.soft}"></div>
                        <div class="h-1 w-2/3 rounded ${p.soft}"></div>
                    </div>`)}
                </div>`;
            case 'nav':
                return html`<div class="${box} flex flex-col gap-1">
                    <div class="flex gap-1">
                        ${[0, 1, 2, 3].map((i) => html`<div class="h-2.5 flex-1 rounded ${i === 0 ? p.accent : p.soft}"></div>`)}
                    </div>
                    <div class="flex-1 rounded border ${p.line}"></div>
                </div>`;
            case 'rate':
                return html`<div class="${box} flex items-center justify-center gap-0.5 text-lg ${p.text}">★★★★<span class="opacity-30">★</span></div>`;
            case 'metric':
                return html`<div class="${box} flex flex-col justify-center gap-1">
                    <div class="h-1.5 w-1/3 rounded ${p.soft}"></div>
                    <div class="h-4 w-1/2 rounded ${p.accent}"></div>
                    <div class="flex items-end gap-0.5 h-4">
                        ${[30, 50, 40, 70, 60, 90].map((h) => html`<div class="w-1.5 rounded-t ${p.soft}" style="height:${h}%"></div>`)}
                    </div>
                </div>`;
        }
    }

    // ─── Detalhe do pacote ────────────────────────────────────────────

    private _renderPackDetail() {
        const pack = mk.getPack(this._packId);
        if (!pack) return this._renderMissing();
        const project = this._project;
        const installed = project ? mk.isInstalled(pack.id, project) : false;

        let action: TemplateResult;
        if (!pack.compatible) {
            action = html`<div class="flex flex-col items-end gap-1">
                <button class="${BTN}" disabled>${this.msg.addToProject}</button>
                <span class="text-[11px] text-red-500 max-w-xs text-right">${this.msg.incompatible}: ${pack.incompatibleReason || ''}</span>
            </div>`;
        } else if (!project) {
            action = html`<div class="flex flex-col items-end gap-1">
                <button class="${BTN}" disabled>${this.msg.addToProject}</button>
                <span class="text-[11px] text-gray-500">${this.msg.noProject}</span>
            </div>`;
        } else if (installed) {
            action = html`<button class="${BTN} !bg-emerald-600" disabled>${this.msg.addedBtn}</button>`;
        } else {
            action = html`<button class="${BTN}" @click=${() => this._install(pack)}>${this.msg.addToProject}</button>`;
        }

        const molecule = this._molecule;
        return html`
            <button class="${BTN2} mb-3" @click=${() => this._back()}>${this.msg.back}</button>
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div class="px-3 py-1 bg-sky-50 dark:bg-sky-950/40 text-[10px] font-bold tracking-wider text-sky-700 dark:text-sky-300 border-l-[6px] border-sky-500">🧩 ${this.msg.stripPack}</div>
                <div class="p-4 flex flex-col gap-3">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div class="text-lg font-semibold">${pack.name}</div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                                ${this.msg.by} ${pack.author} · ${this._rating(pack.rating)} (${this.msg.reviewsN(pack.reviews)})
                                · ${this.msg.version} ${pack.version} · ${this.msg.updatedOn} ${this._day(pack.updatedAt)}
                            </div>
                        </div>
                        <div class="flex items-start gap-3">
                            <div class="text-right">
                                <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youPay}</div>
                                <div class="text-base font-semibold text-sky-700 dark:text-sky-300">${this._packPrice(pack)}</div>
                            </div>
                            ${action}
                        </div>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-300">${pack.description}</p>

                    <div class="${LABEL}">${this.msg.components} (${this.msg.groupsN(pack.groups.length)} · ${this.msg.moleculesN(mk.moleculeCount(pack))})</div>
                    <div class="flex ${this._wide ? 'flex-row' : 'flex-col'} gap-3">
                        <div class="${this._wide ? 'w-1/2' : ''} flex flex-col rounded border border-gray-200 dark:border-gray-800">
                            ${pack.groups.map((g) => {
            const open = this._expanded.has(g.name);
            return html`
                                    <button class="flex items-center justify-between px-3 py-1.5 text-xs font-semibold font-mono bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
                                        @click=${() => this._toggleGroup(g.name)}>
                                        <span>${open ? '▾' : '▸'} ${g.name}</span>
                                        <span class="font-normal text-gray-400">${g.molecules.length}</span>
                                    </button>
                                    ${open ? g.molecules.map((m) => html`
                                        <button class="text-left pl-7 pr-3 py-1 text-xs font-mono border-b border-gray-100 dark:border-gray-900 ${m === molecule
                    ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                                            @click=${() => { this._molecule = m; }}>${m}</button>
                                    `) : nothing}
                                `;
        })}
                        </div>
                        <div class="${this._wide ? 'w-1/2' : ''} flex flex-col gap-2 rounded border border-gray-200 dark:border-gray-800 p-3">
                            ${molecule ? html`
                                <div class="flex items-center justify-between gap-2">
                                    <span class="text-xs font-mono font-semibold">${molecule}</span>
                                    <span class="flex">
                                        <button class="px-2 py-0.5 text-[11px] rounded-l border border-gray-300 dark:border-gray-700 ${!this._previewDark ? 'bg-gray-200 dark:bg-gray-700' : ''}"
                                            @click=${() => { this._previewDark = false; }}>☀ ${this.msg.light}</button>
                                        <button class="px-2 py-0.5 text-[11px] rounded-r border border-l-0 border-gray-300 dark:border-gray-700 ${this._previewDark ? 'bg-gray-200 dark:bg-gray-700' : ''}"
                                            @click=${() => { this._previewDark = true; }}>☾ ${this.msg.dark}</button>
                                    </span>
                                </div>
                                <div class="h-40 rounded overflow-hidden border border-gray-200 dark:border-gray-800">
                                    ${this._renderBlocks(this._shapeOfMolecule(molecule, pack), this._previewDark ? PAL_DARK : PAL_LIGHT)}
                                </div>
                                <div class="text-[11px] text-gray-400">${this.msg.previewNote}</div>
                            ` : html`<div class="text-xs text-gray-400">${this.msg.selectMolecule}</div>`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private _toggleGroup(name: string) {
        const next = new Set(this._expanded);
        if (next.has(name)) next.delete(name); else next.add(name);
        this._expanded = next;
    }

    private _install(pack: mk.IPack) {
        const project = this._project;
        if (mk.installPack(pack.id, project, this._today) === 'installed') this._flash(this.msg.packAdded(project));
        this.requestUpdate();
    }

    private _renderMissing() {
        return html`
            <button class="${BTN2} mb-3" @click=${() => this._back()}>${this.msg.back}</button>
            <div class="text-sm text-gray-400">${this.msg.nothingFound}</div>
        `;
    }

    // ─── Detalhe do job e proposta ────────────────────────────────────

    private _renderJobDetail() {
        const job = mk.getJob(this._jobId);
        if (!job) return this._renderMissing();

        return html`
            <button class="${BTN2} mb-3" @click=${() => this._back()}>${this.msg.back}</button>
            <div class="flex ${this._wide ? 'flex-row items-start' : 'flex-col'} gap-3">
                <div class="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div class="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-[10px] font-bold tracking-wider text-amber-700 dark:text-amber-300 border-l-[6px] border-amber-500">💼 ${this.msg.stripJob}</div>
                    <div class="p-4 flex flex-col gap-3">
                        <div>
                            <div class="text-lg font-semibold leading-snug">${job.title}</div>
                            <div class="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                ${this._chip(this.msg.kinds[job.kind], KIND_CLASS[job.kind])}
                                <span>${this.msg.published} ${this._ago(job.publishedAt)}</span>
                                ${job.nda ? this._chip(`🔒 ${this.msg.nda}`) : nothing}
                                ${job.visibility === 'invited' ? this._chip(this.msg.invitedOnly) : nothing}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                ${job.company}${job.companyRating ? ` · ${this._rating(job.companyRating)}` : ''}
                            </div>
                        </div>
                        <div class="flex gap-6">
                            <div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youGet}</div>
                                <div class="text-base font-semibold text-amber-700 dark:text-amber-300">${this._jobPrice(job.price)}</div>
                            </div>
                            <div>
                                <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.deliverUntil}</div>
                                <div class="text-base font-semibold">${this._day(job.deadline)}</div>
                            </div>
                        </div>
                        <div>
                            <div class="${LABEL}">${this.msg.description}</div>
                            <p class="text-sm whitespace-pre-line mt-1">${job.description}</p>
                        </div>
                        ${job.modules.length ? html`
                            <div>
                                <div class="${LABEL}">${this.msg.scope}</div>
                                <div class="text-sm mt-1">${this.msg.modulesOf}: ${job.modules.join(', ')}</div>
                            </div>
                        ` : nothing}
                        ${job.criteria.length ? html`
                            <div>
                                <div class="${LABEL}">${this.msg.readyWhen}</div>
                                <ul class="text-sm mt-1 flex flex-col gap-0.5">
                                    ${job.criteria.map((c) => html`<li>✓ ${c}</li>`)}
                                </ul>
                            </div>
                        ` : nothing}
                        ${job.skills.length ? html`
                            <div>
                                <div class="${LABEL}">${this.msg.skills}</div>
                                <div class="flex flex-wrap gap-1 mt-1">${job.skills.map((s) => this._chip(s))}</div>
                            </div>
                        ` : nothing}
                        ${job.fromTask ? html`
                            <div class="text-xs text-gray-500 dark:text-gray-400">${this.msg.createdFrom}: <span class="font-mono">${job.fromTask.id}</span> · ${job.fromTask.title}</div>
                        ` : nothing}
                    </div>
                </div>
                <div class="${this._wide ? 'w-80 shrink-0' : ''} rounded-lg border border-gray-200 dark:border-gray-800 p-4">
                    ${this._renderProposalSide(job)}
                </div>
            </div>
        `;
    }

    private _renderProposalSide(job: mk.IJob) {
        if (job.mine) {
            return html`
                <div class="text-sm font-semibold">${this.msg.jobIsYours}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${this.msg.receivedN(job.proposals)}</div>
            `;
        }
        const sent = mk.proposalFor(job.id);
        if (sent && !this._editingProposal) {
            return html`
                <div class="text-sm font-semibold mb-2">${this.msg.yourProposal}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">${this.msg.sentOn} ${this._day(sent.sentAt)}</div>
                <div class="flex gap-6 mb-2">
                    <div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youGet}</div>
                        <div class="text-sm font-semibold">${this._money(sent.price)}</div>
                    </div>
                    <div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.deliverUntil}</div>
                        <div class="text-sm font-semibold">${this._day(sent.deadline)}</div>
                    </div>
                </div>
                <div class="${LABEL}">${this.msg.plan}</div>
                <p class="text-xs whitespace-pre-line mb-2">${sent.plan}</p>
                ${sent.questions ? html`
                    <div class="${LABEL}">${this.msg.questions}</div>
                    <p class="text-xs whitespace-pre-line mb-2">${sent.questions}</p>
                ` : nothing}
                <div class="flex gap-2 mt-3">
                    <button class="${BTN2}" @click=${() => this._editProposal(job, sent)}>${this.msg.edit}</button>
                    <button class="${BTN2} !text-red-600" @click=${() => this._withdraw(job.id)}>${this.msg.withdraw}</button>
                </div>
            `;
        }

        const d = this._proposal;
        const e = this._proposalErrors;
        return html`
            <div class="text-sm font-semibold mb-2">${this.msg.yourProposal}</div>
            <div class="flex flex-col gap-3">
                ${job.price === null ? html`
                    <div>
                        <div class="${LABEL}">${this.msg.youGet} *</div>
                        <input class="${INPUT} mt-1" placeholder="R$" .value=${d.priceText}
                            @input=${(ev: Event) => this._setProposal({ priceText: (ev.target as HTMLInputElement).value }, job)}>
                        <div class="text-[11px] text-gray-400 mt-0.5">${this.msg.openPriceHint}</div>
                        ${this._err(e.price)}
                    </div>
                ` : html`
                    <div class="flex gap-6">
                        <div>
                            <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.youGet}</div>
                            <div class="text-sm font-semibold">${this._money(job.price)}</div>
                        </div>
                        <div>
                            <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.deliverUntil}</div>
                            <div class="text-sm font-semibold">${this._day(job.deadline)}</div>
                        </div>
                    </div>
                `}
                ${job.price === null ? html`
                    <div>
                        <div class="text-[10px] uppercase tracking-wide text-gray-400">${this.msg.deliverUntil}</div>
                        <div class="text-sm font-semibold">${this._day(job.deadline)}</div>
                    </div>
                ` : nothing}
                <div class="text-[11px] text-gray-400 -mt-1">${this.msg.jobTerms}</div>
                <div>
                    <div class="${LABEL}">${this.msg.plan} *</div>
                    <textarea class="${INPUT} mt-1 min-h-[80px]" .value=${d.plan}
                        @input=${(ev: Event) => this._setProposal({ plan: (ev.target as HTMLTextAreaElement).value }, job)}></textarea>
                    ${this._err(e.plan)}
                </div>
                <div>
                    <div class="${LABEL}">${this.msg.questions}</div>
                    <textarea class="${INPUT} mt-1 min-h-[50px]" .value=${d.questions}
                        @input=${(ev: Event) => this._setProposal({ questions: (ev.target as HTMLTextAreaElement).value }, job)}></textarea>
                </div>
                ${job.nda ? html`
                    <div>
                        <label class="flex items-start gap-2 text-xs cursor-pointer">
                            <input type="checkbox" class="mt-0.5" .checked=${d.ndaAccepted}
                                @change=${(ev: Event) => this._setProposal({ ndaAccepted: (ev.target as HTMLInputElement).checked }, job)}>
                            <span>${this.msg.acceptNda}</span>
                        </label>
                        ${this._err(e.nda, true)}
                    </div>
                ` : nothing}
                <div class="flex justify-end gap-2">
                    ${sent ? html`<button class="${BTN2}" @click=${() => { this._editingProposal = false; }}>${this.msg.cancel}</button>` : nothing}
                    <button class="${BTN}" @click=${() => this._sendProposal(job)}>${this.msg.send}</button>
                </div>
            </div>
        `;
    }

    private _setProposal(patch: Partial<mk.IProposalDraft>, job: mk.IJob) {
        this._proposal = { ...this._proposal, ...patch };
        if (this._proposalTried) this._proposalErrors = mk.validateProposal(job, this._proposal);
    }

    private _sendProposal(job: mk.IJob) {
        this._proposalTried = true;
        this._proposalErrors = mk.validateProposal(job, this._proposal);
        if (Object.keys(this._proposalErrors).length) return;
        mk.sendProposal(job, this._proposal, this._today);
        this._editingProposal = false;
        this._proposalTried = false;
        this.requestUpdate();
    }

    private _editProposal(job: mk.IJob, sent: mk.IProposal) {
        this._proposal = mk.proposalDraftFrom(sent, job);
        this._proposalErrors = {};
        this._proposalTried = false;
        this._editingProposal = true;
    }

    private _withdraw(jobId: string) {
        mk.withdrawProposal(jobId);
        this._proposal = mk.emptyProposalDraft();
        this._editingProposal = false;
        this.requestUpdate();
    }

    // ─── Novo job ─────────────────────────────────────────────────────

    private _renderNewJob() {
        const d = this._draft;
        const e = this._draftErrors;
        const field = (label: string, required: boolean, body: TemplateResult, err?: TemplateResult | typeof nothing) => html`
            <div class="flex flex-col gap-1">
                <div class="${LABEL}">${label}${required ? ' *' : ''}</div>
                ${body}
                ${err || nothing}
            </div>
        `;
        const section = (title: string, body: TemplateResult) => html`
            <div class="flex flex-col gap-3">
                <div class="text-xs font-semibold text-cyan-700 dark:text-cyan-300">${title}</div>
                ${body}
            </div>
        `;
        const radio = (name: string, checked: boolean, label: string, onPick: () => void) => html`
            <label class="flex items-center gap-1 text-xs cursor-pointer">
                <input type="radio" name=${name} .checked=${checked} @change=${onPick}> ${label}
            </label>
        `;

        return html`
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                <button class="${BTN2}" @click=${() => this._back()}>${this.msg.back}</button>
                <button class="${BTN2}" @click=${() => this._openPicker()}>${this.msg.fromTask}</button>
            </div>
            <div class="flex ${this._wide ? 'flex-row items-start' : 'flex-col'} gap-3">
                <div class="flex-1 min-w-0 rounded-lg border border-gray-200 dark:border-gray-800 p-4 flex flex-col gap-5">
                    <div class="text-base font-semibold">${this.msg.newJobTitle}</div>
                    ${d.fromTask ? html`
                        <div class="flex items-center justify-between gap-2 px-3 py-2 rounded bg-cyan-50 dark:bg-cyan-950/40 text-xs">
                            <span>${this.msg.createdFrom}: <span class="font-mono">${d.fromTask.id}</span> · ${d.fromTask.title}</span>
                            <button class="text-gray-500 hover:text-red-500" title="×" @click=${() => this._setDraft({ fromTask: undefined })}>✕</button>
                        </div>
                    ` : nothing}

                    ${section(this.msg.sec1, html`
                        ${field(this.msg.fTitle, true, html`
                            <input class="${INPUT}" .value=${d.title}
                                @input=${(ev: Event) => this._setDraft({ title: (ev.target as HTMLInputElement).value })}>
                        `, this._err(e.title))}
                        ${field(this.msg.fKind, true, html`
                            <div class="flex flex-wrap gap-1.5">
                                ${mk.JOB_KINDS.map((k) => this._pill(this.msg.kinds[k], d.kind === k, () => this._setDraft({ kind: k })))}
                            </div>
                        `, this._err(e.kind))}
                        ${field(this.msg.fDescription, true, html`
                            <textarea class="${INPUT} min-h-[80px]" .value=${d.description}
                                @input=${(ev: Event) => this._setDraft({ description: (ev.target as HTMLTextAreaElement).value })}></textarea>
                        `, this._err(e.description))}
                    `)}

                    ${section(this.msg.sec2, field(this.msg.fModules, false, this._renderTags('modules')))}

                    ${section(this.msg.sec3, field(this.msg.fCriteria, false, this._renderTags('criteria')))}

                    ${section(this.msg.sec4, html`
                        ${field(this.msg.fDeadline, true, html`
                            <input type="date" class="${INPUT} !w-44" min=${mk.addDays(this._today, 1)} .value=${d.deadline}
                                @input=${(ev: Event) => this._setDraft({ deadline: (ev.target as HTMLInputElement).value })}>
                        `, this._err(e.deadline))}
                        ${field(this.msg.fPrice, d.priceMode === 'fixed', html`
                            <div class="flex flex-wrap items-center gap-3">
                                ${radio('mk-price', d.priceMode === 'fixed', this.msg.fixed, () => this._setDraft({ priceMode: 'fixed' }))}
                                <input class="${INPUT} !w-32" placeholder="R$" ?disabled=${d.priceMode !== 'fixed'} .value=${d.priceText}
                                    @input=${(ev: Event) => this._setDraft({ priceText: (ev.target as HTMLInputElement).value })}>
                                ${radio('mk-price', d.priceMode === 'open', this.msg.toAgree, () => this._setDraft({ priceMode: 'open' }))}
                            </div>
                        `, this._err(e.price))}
                        ${field(this.msg.fSkills, false, this._renderTags('skills'))}
                        ${field(this.msg.fVisibility, false, html`
                            <div class="flex flex-wrap gap-3">
                                ${radio('mk-vis', d.visibility === 'public', this.msg.public, () => this._setDraft({ visibility: 'public' }))}
                                ${radio('mk-vis', d.visibility === 'invited', this.msg.invited, () => this._setDraft({ visibility: 'invited' }))}
                            </div>
                        `)}
                        <label class="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" .checked=${d.nda}
                                @change=${(ev: Event) => this._setDraft({ nda: (ev.target as HTMLInputElement).checked })}>
                            ${this.msg.fNda}
                        </label>
                    `)}

                    <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                        <button class="${BTN2}" @click=${() => this._cancelDraft()}>${this.msg.cancel}</button>
                        <button class="${BTN}" @click=${() => this._publish()}>${this.msg.publish}</button>
                    </div>
                </div>
                <div class="${this._wide ? 'w-72 shrink-0 sticky top-0' : ''} flex flex-col gap-2">
                    <div class="${LABEL}">${this.msg.cardPreview}</div>
                    ${this._renderJobCard(mk.previewJob(d, this.msg.myCompany, this._today), { preview: true })}
                </div>
            </div>
        `;
    }

    private _renderTags(fieldName: TagField) {
        const values = this._draft[fieldName];
        return html`
            <div class="flex flex-wrap items-center gap-1 px-1.5 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:border-cyan-500">
                ${values.map((v, i) => html`
                    <span class="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                        ${v}
                        <button class="text-gray-400 hover:text-red-500" @click=${() => this._removeTag(fieldName, i)}>×</button>
                    </span>
                `)}
                <input class="flex-1 min-w-[120px] text-xs bg-transparent px-1 py-0.5 focus:outline-none"
                    placeholder=${this.msg.typeEnter}
                    .value=${this._tagText[fieldName]}
                    @input=${(ev: Event) => { this._tagText = { ...this._tagText, [fieldName]: (ev.target as HTMLInputElement).value }; }}
                    @keydown=${(ev: KeyboardEvent) => this._onTagKey(ev, fieldName)}>
            </div>
        `;
    }

    private _onTagKey(ev: KeyboardEvent, fieldName: TagField) {
        const text = this._tagText[fieldName];
        if (ev.key === 'Enter') {
            ev.preventDefault();
            const value = text.trim();
            if (value && !this._draft[fieldName].includes(value)) {
                this._setDraft({ [fieldName]: [...this._draft[fieldName], value] });
            }
            this._tagText = { ...this._tagText, [fieldName]: '' };
        } else if (ev.key === 'Backspace' && !text && this._draft[fieldName].length) {
            this._removeTag(fieldName, this._draft[fieldName].length - 1);
        }
    }

    private _removeTag(fieldName: TagField, index: number) {
        this._setDraft({ [fieldName]: this._draft[fieldName].filter((_, i) => i !== index) });
    }

    private _setDraft(patch: Partial<mk.IJobDraft>) {
        this._draft = { ...this._draft, ...patch };
        if (this._draftTried) this._draftErrors = mk.validateDraft(this._draft, this._today);
    }

    private _cancelDraft() {
        this._draft = mk.emptyDraft();
        this._draftErrors = {};
        this._draftTried = false;
        this._back();
    }

    private _publish() {
        this._draftTried = true;
        this._draftErrors = mk.validateDraft(this._draft, this._today);
        if (Object.keys(this._draftErrors).length) return;
        const job = mk.publishJob(this._draft, this.msg.myCompany, this._today);
        this._draft = mk.emptyDraft();
        this._draftTried = false;
        this._clearFilters();
        this._show = 'jobs';
        this._goTab('explore');
        this._highlightId = job.id;
        this._later(() => { if (this._highlightId === job.id) this._highlightId = ''; }, 4000);
    }

    // ─── Escolher task (simulação) ────────────────────────────────────

    private _openPicker() {
        this._taskSearch = '';
        this._taskSource = 'all';
        this._taskId = '';
        this._pickerOpen = true;
    }

    private _useTask() {
        const task = mk.getTasks().find((t) => t.id === this._taskId);
        if (!task) return;
        this._pickerOpen = false;
        this._openNewJob(mk.draftFromTask(task));
    }

    private _renderTaskPicker() {
        const tasks = mk.filterTasks(mk.getTasks(), this._taskSearch, this._taskSource);
        return html`
            <div class="absolute inset-0 z-20 flex items-center justify-center p-4 bg-black/40"
                @click=${(ev: Event) => { if (ev.target === ev.currentTarget) this._pickerOpen = false; }}>
                <div class="w-full max-w-xl max-h-full flex flex-col rounded-lg shadow-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                    <div class="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800">
                        <span class="text-sm font-semibold">${this.msg.chooseTask}</span>
                        <button class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" @click=${() => { this._pickerOpen = false; }}>✕</button>
                    </div>
                    <div class="flex flex-col gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
                        <input class="${INPUT}" type="search" placeholder="🔍 ${this.msg.searchTask}" .value=${this._taskSearch}
                            @input=${(ev: Event) => { this._taskSearch = (ev.target as HTMLInputElement).value; }}>
                        <div class="flex flex-wrap gap-1.5">
                            ${this._pill(this.msg.allF, this._taskSource === 'all', () => { this._taskSource = 'all'; })}
                            ${mk.TASK_SOURCES.map((s) => this._pill(`${SOURCE_ICON[s]} ${this.msg.sources[s]}`, this._taskSource === s, () => { this._taskSource = s; }))}
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto">
                        ${tasks.length ? tasks.map((t) => html`
                            <div class="flex gap-2 px-4 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-800 ${t.id === this._taskId
                ? 'bg-cyan-50 dark:bg-cyan-950/50'
                : 'hover:bg-gray-50 dark:hover:bg-gray-800'}"
                                @click=${() => { this._taskId = t.id; }}
                                @dblclick=${() => { this._taskId = t.id; this._useTask(); }}>
                                <span class="w-5 shrink-0">${SOURCE_ICON[t.source]}</span>
                                <div class="min-w-0">
                                    <div class="text-xs font-medium">${t.title}</div>
                                    <div class="text-[11px] text-gray-500 dark:text-gray-400">
                                        ${[t.screen, t.module || this.msg.severalModules].filter(Boolean).join(' · ')}
                                    </div>
                                </div>
                            </div>
                        `) : html`<div class="px-4 py-6 text-xs text-gray-400 text-center">${this.msg.noTasks}</div>`}
                    </div>
                    <div class="flex justify-end gap-2 px-4 py-2 border-t border-gray-200 dark:border-gray-800">
                        <button class="${BTN2}" @click=${() => { this._pickerOpen = false; }}>${this.msg.cancel}</button>
                        <button class="${BTN}" ?disabled=${!this._taskId} @click=${() => this._useTask()}>${this.msg.useTask}</button>
                    </div>
                </div>
            </div>
        `;
    }

    // ─── Meus ─────────────────────────────────────────────────────────

    private _renderMine() {
        const q = this._search.trim().toLowerCase();
        const has = (text: string) => !q || text.toLowerCase().includes(q);
        const jobs = mk.filterJobs(mk.getJobs().filter((j) => j.mine), this._search, 'all');
        const proposals = mk.getProposals().filter((p) => has(mk.getJob(p.jobId)?.title || ''));
        const installs = mk.getInstalls().filter((i) => has(mk.getPack(i.packId)?.name || ''));

        const section = (title: string, count: number, empty: string, body: () => TemplateResult) => html`
            <div class="flex flex-col gap-2">
                <div class="${LABEL}">${title} (${count})</div>
                ${count ? body() : html`<div class="text-xs text-gray-400 px-3 py-3 rounded border border-dashed border-gray-300 dark:border-gray-700">${empty}</div>`}
            </div>
        `;
        const row = 'flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded border border-gray-200 dark:border-gray-800';

        return html`
            <div class="flex flex-col gap-5">
                ${section(this.msg.mineJobs, jobs.length, this.msg.emptyMineJobs, () => html`
                    ${jobs.map((j) => html`
                        <div class="${row} border-l-4 !border-l-amber-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" @click=${() => this._openJob(j.id)}>
                            <div class="min-w-0">
                                <div class="text-sm font-medium">💼 ${j.title}</div>
                                <div class="text-xs text-gray-500 dark:text-gray-400">${this.msg.kinds[j.kind]} · ${this.msg.until} ${this._day(j.deadline)} · ${this._jobPrice(j.price)}</div>
                            </div>
                            <span class="text-xs text-gray-500">${this.msg.receivedN(j.proposals)}</span>
                        </div>
                    `)}
                `)}
                ${section(this.msg.mineProposals, proposals.length, this.msg.emptyMineProposals, () => html`
                    ${proposals.map((p) => {
            const job = mk.getJob(p.jobId);
            return html`
                            <div class="${row}">
                                <div class="min-w-0 cursor-pointer" @click=${() => this._openJob(p.jobId)}>
                                    <div class="text-sm font-medium hover:underline">💼 ${job?.title || p.jobId}</div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">
                                        ${this._money(p.price)} · ${this.msg.until} ${this._day(p.deadline)} · ${this.msg.sentOn} ${this._day(p.sentAt)}
                                    </div>
                                </div>
                                <button class="${BTN2} !text-red-600" @click=${() => this._withdraw(p.jobId)}>${this.msg.withdraw}</button>
                            </div>
                        `;
        })}
                `)}
                ${section(this.msg.minePacks, installs.length, this.msg.emptyMinePacks, () => html`
                    ${installs.map((i) => {
            const pack = mk.getPack(i.packId);
            return html`
                            <div class="${row} cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" @click=${() => this._openPack(i.packId)}>
                                <div class="min-w-0">
                                    <div class="text-sm font-medium">🧩 ${pack?.name || i.packId}</div>
                                    <div class="text-xs text-gray-500 dark:text-gray-400">${this.msg.project} ${i.project} · ${this._day(i.installedAt)}</div>
                                </div>
                                ${pack ? html`<span class="text-xs text-sky-700 dark:text-sky-300">${this._packPrice(pack)}</span>` : nothing}
                            </div>
                        `;
        })}
                `)}
            </div>
        `;
    }
}
