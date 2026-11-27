/// <mls fileReference="_102020_/l2/aura/helpers/marketplaceMock.ts" enhancement="_blank" />

// Marketplace prototype (collabMyFiles/marketplaceIdea.md): fictitious jobs, component packs and
// tasks, kept in memory for the page's lifetime. Pure: no Lit, no mls.stor, no localStorage.
// The store lives in this module (not in the service) so that closing and reopening the service
// keeps what was created in the session. Reloading the page goes back to the initial data.

// ─── Types ───────────────────────────────────────────────────────────

export const JOB_KINDS = ['bug', 'newScreen', 'integration', 'visual', 'backend', 'spec'] as const;
export type JobKind = typeof JOB_KINDS[number];

export const PACK_CATEGORIES = ['forms', 'tables', 'charts', 'calendar', 'cards', 'navigation'] as const;
export type PackCategory = typeof PACK_CATEGORIES[number];

export const TASK_SOURCES = ['pin', 'error', 'route', 'pipeline', 'component'] as const;
export type TaskSource = typeof TASK_SOURCES[number];

/** Dates are local calendar days, `YYYY-MM-DD`. */
export type DayString = string;

export interface ITaskRef {
    id: string;
    title: string;
}

export interface IJob {
    id: string;
    title: string;
    kind: JobKind;
    description: string;
    company: string;
    companyRating: number;
    modules: string[];
    criteria: string[];
    skills: string[];
    deadline: DayString;
    /** null = "a combinar" (to be agreed): the proposal says the value. */
    price: number | null;
    nda: boolean;
    visibility: 'public' | 'invited';
    proposals: number;
    publishedAt: DayString;
    /** Published by the person in this session. */
    mine: boolean;
    /** Created in this session. */
    isNew: boolean;
    fromTask?: ITaskRef;
}

export interface IPackGroup {
    name: string;
    molecules: string[];
}

export interface IPack {
    id: string;
    name: string;
    author: string;
    category: PackCategory;
    description: string;
    /** 0 = free. */
    price: number;
    billing: 'once' | 'monthly';
    rating: number;
    reviews: number;
    installs: number;
    version: string;
    updatedAt: DayString;
    compatible: boolean;
    incompatibleReason?: string;
    groups: IPackGroup[];
}

export interface ITask {
    id: string;
    source: TaskSource;
    title: string;
    detail: string;
    screen?: string;
    /** null = several modules ("vários"). */
    module: string | null;
    suggestedKind: JobKind;
    skills: string[];
    criteria: string[];
}

export interface IProposal {
    jobId: string;
    /** The job's price, or the value the person gave when the job is "a combinar". */
    price: number;
    /** Always the job's deadline (no counter-proposal in this version). */
    deadline: DayString;
    plan: string;
    questions: string;
    ndaAccepted: boolean;
    sentAt: DayString;
}

export interface IInstall {
    packId: string;
    project: number;
    installedAt: DayString;
}

export interface IJobDraft {
    title: string;
    kind: JobKind | '';
    description: string;
    modules: string[];
    criteria: string[];
    deadline: DayString;
    priceMode: 'fixed' | 'open';
    priceText: string;
    skills: string[];
    visibility: 'public' | 'invited';
    nda: boolean;
    fromTask?: ITaskRef;
}

export interface IProposalDraft {
    /** Only used when the job is "a combinar". */
    priceText: string;
    plan: string;
    questions: string;
    ndaAccepted: boolean;
}

export type FieldError = 'required' | 'pastDate' | 'invalidPrice';
export type DraftErrors = Partial<Record<'title' | 'kind' | 'description' | 'deadline' | 'price', FieldError>>;
export type ProposalErrors = Partial<Record<'price' | 'plan' | 'nda', FieldError>>;

export type OfferShow = 'all' | 'jobs' | 'packs';
export type PackPriceFilter = 'all' | 'free' | 'paid';

export interface IOfferFilter {
    show: OfferShow;
    search: string;
    jobKind: JobKind | 'all';
    packCategory: PackCategory | 'all';
    packPrice: PackPriceFilter;
}

export type IOffer =
    | { kind: 'job'; date: DayString; job: IJob }
    | { kind: 'pack'; date: DayString; pack: IPack };

// ─── Dates ───────────────────────────────────────────────────────────

export function toDay(date: Date): DayString {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function parseDay(day: DayString): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
    if (!m) return null;
    const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(date.getTime()) ? null : date;
}

export function addDays(day: DayString, n: number): DayString {
    const date = parseDay(day) || new Date();
    date.setDate(date.getDate() + n);
    return toDay(date);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: DayString, to: DayString): number {
    const a = parseDay(from);
    const b = parseDay(to);
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ─── Price ───────────────────────────────────────────────────────────

/** Brazilian or plain number: `1.500,50` → 1500.5, `1500.5` → 1500.5, `2.500` → 2500. NaN when invalid. */
export function parsePrice(text: string): number {
    let t = String(text || '').replace(/R\$/gi, '').replace(/\s+/g, '');
    if (!t) return NaN;
    if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return Number(t);
}

// ─── Initial data (generic, invented names) ──────────────────────────

function initialPacks(today: DayString): IPack[] {
    return [
        {
            id: 'pk-forms', name: 'Forms Essentials', author: 'Estúdio Aurora', category: 'forms',
            description: 'Campos de texto, valor e data prontos para formulários, com validação e máscara.',
            price: 0, billing: 'once', rating: 4.7, reviews: 61, installs: 230, version: '1.4.2',
            updatedAt: addDays(today, -6), compatible: true,
            groups: [
                { name: 'groupEnterText', molecules: ['ml-input-text', 'ml-textarea', 'ml-input-mask'] },
                { name: 'groupEnterMoney', molecules: ['ml-input-money', 'ml-input-percent'] },
                { name: 'groupEnterDate', molecules: ['ml-input-date', 'ml-input-time', 'ml-input-datetime'] },
            ],
        },
        {
            id: 'pk-charts', name: 'Charts Pro', author: 'Pixel & Co', category: 'charts',
            description: 'Gráficos de linha, barra, pizza e funil com tema claro e escuro, legendas e dicas ao passar o mouse.',
            price: 49, billing: 'monthly', rating: 4.9, reviews: 88, installs: 412, version: '2.3.0',
            updatedAt: addDays(today, -3), compatible: true,
            groups: [
                { name: 'groupViewChart', molecules: ['ml-chart-line', 'ml-chart-bar', 'ml-chart-pie', 'ml-chart-funnel'] },
                { name: 'groupViewMetric', molecules: ['ml-metric-card', 'ml-metric-trend', 'ml-metric-gauge'] },
            ],
        },
        {
            id: 'pk-tables', name: 'Data Tables', author: 'Grid Labs', category: 'tables',
            description: 'Tabelas com ordenação, paginação, seleção de linhas e busca com filtros.',
            price: 290, billing: 'once', rating: 4.5, reviews: 37, installs: 158, version: '3.0.1',
            updatedAt: addDays(today, -12), compatible: true,
            groups: [
                { name: 'groupViewTable', molecules: ['ml-table-basic', 'ml-table-paged', 'ml-table-selectable', 'ml-table-tree'] },
                { name: 'groupSearchContent', molecules: ['ml-search-box', 'ml-search-filters'] },
            ],
        },
        {
            id: 'pk-agenda', name: 'Agenda Kit', author: 'TimeBox', category: 'calendar',
            description: 'Agenda de dia, semana e mês, com arrastar para remarcar e seleção de intervalos.',
            price: 190, billing: 'once', rating: 4.3, reviews: 24, installs: 97, version: '0.9.0',
            updatedAt: addDays(today, -20), compatible: false,
            incompatibleReason: 'Exige o design system 2.x; o seu projeto usa o 1.x.',
            groups: [
                { name: 'groupViewCalendar', molecules: ['ml-calendar-day', 'ml-calendar-week', 'ml-calendar-month'] },
                { name: 'groupEnterDateInterval', molecules: ['ml-input-date-range', 'ml-input-time-range'] },
            ],
        },
        {
            id: 'pk-cards', name: 'Card Gallery', author: 'Estúdio Aurora', category: 'cards',
            description: 'Cartões de produto, perfil e destaque, com avaliação por estrelas.',
            price: 0, billing: 'once', rating: 4.4, reviews: 45, installs: 301, version: '1.1.0',
            updatedAt: addDays(today, -9), compatible: true,
            groups: [
                { name: 'groupViewCard', molecules: ['ml-card-product', 'ml-card-profile', 'ml-card-highlight'] },
                { name: 'groupRateItem', molecules: ['ml-rate-stars', 'ml-rate-thumbs'] },
            ],
        },
        {
            id: 'pk-nav', name: 'Navigation Suite', author: 'Rota Design', category: 'navigation',
            description: 'Menu principal, passos de assistente e abas de seção, responsivos.',
            price: 29, billing: 'monthly', rating: 4.6, reviews: 52, installs: 189, version: '2.0.4',
            updatedAt: addDays(today, -1), compatible: true,
            groups: [
                { name: 'groupNavigateMain', molecules: ['ml-nav-sidebar', 'ml-nav-topbar'] },
                { name: 'groupNavigateSteps', molecules: ['ml-nav-steps', 'ml-nav-wizard'] },
                { name: 'groupNavigateSection', molecules: ['ml-nav-tabs', 'ml-nav-anchors'] },
            ],
        },
    ];
}

function initialJobs(today: DayString): IJob[] {
    const base = { mine: false, isNew: false, visibility: 'public' as const };
    return [
        {
            ...base, id: 'job-1', title: 'Integrar o cadastro de clientes com o ERP', kind: 'integration',
            description: 'O cadastro de clientes precisa ficar igual ao do ERP. A sincronização roda a cada hora e não pode duplicar clientes.',
            company: 'Distribuidora Sol', companyRating: 4.8, modules: ['cadastros'],
            criteria: ['Testes do módulo passando', 'Sem erros de compilação', 'Sincroniza a cada 1h'],
            skills: ['L1', 'Integração'], deadline: addDays(today, 19), price: 2500, nda: true,
            proposals: 4, publishedAt: addDays(today, -2),
        },
        {
            ...base, id: 'job-2', title: 'Tela de aprovação em lote', kind: 'newScreen',
            description: 'Uma tela para aprovar vários pedidos de exame de uma vez, com filtro por data e por médico.',
            company: 'Clínica Vida', companyRating: 4.6, modules: ['exames'],
            criteria: ['Aprova e reprova em lote', 'Funciona no celular'],
            skills: ['L2', 'Lit'], deadline: addDays(today, 12), price: 1200, nda: false,
            proposals: 2, publishedAt: addDays(today, -1),
        },
        {
            ...base, id: 'job-3', title: 'Corrigir total errado no fechamento', kind: 'bug',
            description: 'O total do fechamento do caixa soma os descontos duas vezes quando há mais de uma forma de pagamento.',
            company: 'Restaurante Brasa', companyRating: 4.1, modules: ['caixa'],
            criteria: ['Total confere com o relatório', 'Teste que reproduz o erro'],
            skills: ['L1'], deadline: addDays(today, 5), price: 400, nda: false,
            proposals: 7, publishedAt: addDays(today, -4),
        },
        {
            ...base, id: 'job-4', title: 'Ajustar o visual do painel para a marca nova', kind: 'visual',
            description: 'Cores, fontes e logotipo novos em todas as telas do painel. O manual da marca é enviado após o termo.',
            company: 'Frota Express', companyRating: 4.5, modules: ['painel'],
            criteria: ['Tema claro e escuro', 'Sem texto cortado'],
            skills: ['Design system', 'CSS'], deadline: addDays(today, 27), price: null, nda: true,
            proposals: 1, publishedAt: addDays(today, -6),
        },
        {
            ...base, id: 'job-5', title: 'Revisar a spec do módulo de contratos', kind: 'spec',
            description: 'Ler a spec do módulo de contratos e apontar regras que faltam ou se contradizem.',
            company: 'Imobiliária Lar', companyRating: 4.7, modules: ['contratos'],
            criteria: ['Lista de pontos com sugestão', 'Spec revisada'],
            skills: ['Spec', 'Regras de negócio'], deadline: addDays(today, 9), price: 800, nda: true,
            proposals: 3, publishedAt: addDays(today, -3),
        },
    ];
}

function initialTasks(): ITask[] {
    return [
        {
            id: 'tk-1', source: 'pin', title: '"O botão salvar devia ficar no topo"',
            detail: 'Comentário do cliente na tela: o botão salvar fica escondido no fim do formulário.',
            screen: 'Pedidos › Novo pedido', module: 'pedidos', suggestedKind: 'visual',
            skills: ['L2'], criteria: ['Pin resolvido'],
        },
        {
            id: 'tk-2', source: 'error', title: 'Arquivo de página não encontrado',
            detail: 'A página de movimentações está na rota, mas o arquivo da página não existe.',
            screen: 'Estoque › Movimentações', module: 'estoque', suggestedKind: 'bug',
            skills: ['L2'], criteria: ['Página abre sem erro', 'Sem erros de compilação'],
        },
        {
            id: 'tk-3', source: 'route', title: 'Rota sem backend: financeiro.contas.baixarTitulo',
            detail: 'A tela chama a rota, mas não há controlador nem caso de uso para ela.',
            module: 'financeiro', suggestedKind: 'backend',
            skills: ['L1'], criteria: ['Rota responde', 'Testes do módulo passando'],
        },
        {
            id: 'tk-4', source: 'pipeline', title: 'Passo rules40 reprovado pelo juiz',
            detail: 'O passo de regras do pipeline foi reprovado: faltam regras de desconto.',
            module: 'compras', suggestedKind: 'spec',
            skills: ['Spec', 'Regras de negócio'], criteria: ['Passo aprovado pelo juiz'],
        },
        {
            id: 'tk-5', source: 'component', title: 'Atualizar as telas que usam ml-button-group',
            detail: 'O componente mudou de versão e as telas que o usam precisam ser ajustadas.',
            module: null, suggestedKind: 'visual',
            skills: ['L2', 'Lit'], criteria: ['Todas as telas atualizadas', 'Sem erros de compilação'],
        },
        {
            id: 'tk-6', source: 'pin', title: '"Não consigo remarcar arrastando"',
            detail: 'Comentário do cliente na tela: arrastar o horário na semana não remarca a consulta.',
            screen: 'Agenda › Semana', module: 'agenda', suggestedKind: 'bug',
            skills: ['L2'], criteria: ['Pin resolvido', 'Remarca arrastando'],
        },
    ];
}

// ─── Store (module scope: lives while the page is open) ───────────────

interface IStore {
    jobs: IJob[];
    packs: IPack[];
    tasks: ITask[];
    proposals: IProposal[];
    installs: IInstall[];
    nextJob: number;
}

let store: IStore = createStore(toDay(new Date()));

function createStore(today: DayString): IStore {
    return { jobs: initialJobs(today), packs: initialPacks(today), tasks: initialTasks(), proposals: [], installs: [], nextJob: 1 };
}

/** Back to the initial data. `today` anchors the relative dates of the fictitious data (tests). */
export function resetMarketplace(today: DayString = toDay(new Date())): void {
    store = createStore(today);
}

// ─── Reads ───────────────────────────────────────────────────────────

function byDateDesc<T>(date: (item: T) => DayString) {
    return (a: T, b: T) => date(b).localeCompare(date(a));
}

/** Most recent first; within the same day, the last created first. */
export function getJobs(): IJob[] {
    return store.jobs.map((job, i) => ({ job, i }))
        .sort((a, b) => b.job.publishedAt.localeCompare(a.job.publishedAt) || b.i - a.i)
        .map(({ job }) => job);
}

export function getJob(id: string): IJob | undefined {
    return store.jobs.find((j) => j.id === id);
}

export function getPacks(): IPack[] {
    return [...store.packs];
}

export function getPack(id: string): IPack | undefined {
    return store.packs.find((p) => p.id === id);
}

export function getTasks(): ITask[] {
    return [...store.tasks];
}

export function getProposals(): IProposal[] {
    return [...store.proposals].sort(byDateDesc((p) => p.sentAt));
}

export function proposalFor(jobId: string): IProposal | undefined {
    return store.proposals.find((p) => p.jobId === jobId);
}

export function getInstalls(): IInstall[] {
    return [...store.installs].sort(byDateDesc((i) => i.installedAt));
}

export function isInstalled(packId: string, project: number): boolean {
    return store.installs.some((i) => i.packId === packId && i.project === project);
}

export function moleculeCount(pack: IPack): number {
    return pack.groups.reduce((n, g) => n + g.molecules.length, 0);
}

// ─── Filters ─────────────────────────────────────────────────────────

function matches(search: string, fields: (string | undefined)[]): boolean {
    const q = normalize(search);
    if (!q) return true;
    return fields.some((f) => normalize(f || '').includes(q));
}

function normalize(text: string): string {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function filterJobs(jobs: IJob[], search: string, kind: JobKind | 'all'): IJob[] {
    return jobs.filter((j) =>
        (kind === 'all' || j.kind === kind)
        && matches(search, [j.title, j.description, j.company, ...j.skills, ...j.modules]));
}

export function filterPacks(packs: IPack[], search: string, category: PackCategory | 'all', price: PackPriceFilter): IPack[] {
    return packs.filter((p) =>
        (category === 'all' || p.category === category)
        && (price === 'all' || (price === 'free' ? p.price === 0 : p.price > 0))
        && matches(search, [p.name, p.author, p.description, ...p.groups.map((g) => g.name)]));
}

export function filterTasks(tasks: ITask[], search: string, source: TaskSource | 'all' = 'all'): ITask[] {
    return tasks.filter((t) =>
        (source === 'all' || t.source === source)
        && matches(search, [t.title, t.detail, t.screen, t.module || undefined]));
}

/** The single list of the Explorar tab. The secondary filters only apply to their own kind. */
export function getOffers(filter: IOfferFilter): IOffer[] {
    const offers: IOffer[] = [];
    if (filter.show !== 'packs') {
        for (const job of filterJobs(getJobs(), filter.search, filter.jobKind)) offers.push({ kind: 'job', date: job.publishedAt, job });
    }
    if (filter.show !== 'jobs') {
        for (const pack of filterPacks(getPacks(), filter.search, filter.packCategory, filter.packPrice)) offers.push({ kind: 'pack', date: pack.updatedAt, pack });
    }
    // Stable sort: jobs of the same day keep getJobs' order.
    return offers.sort((a, b) => b.date.localeCompare(a.date));
}

/** Counts for the "Mostrar" pills: the search applies, the secondary filters do not. */
export function offerCounts(search: string): { jobs: number; packs: number } {
    return {
        jobs: filterJobs(getJobs(), search, 'all').length,
        packs: filterPacks(getPacks(), search, 'all', 'all').length,
    };
}

// ─── Job draft ───────────────────────────────────────────────────────

export function emptyDraft(): IJobDraft {
    return {
        title: '', kind: '', description: '', modules: [], criteria: [], deadline: '',
        priceMode: 'fixed', priceText: '', skills: [], visibility: 'public', nda: false,
    };
}

function stripQuotes(text: string): string {
    return text.trim().replace(/^["“”']+|["“”']+$/g, '').trim();
}

export function draftFromTask(task: ITask): IJobDraft {
    const where = [task.screen, task.module].filter(Boolean).join(' · ');
    return {
        ...emptyDraft(),
        title: stripQuotes(task.title),
        kind: task.suggestedKind,
        description: where ? `${task.detail}\n\n${where}` : task.detail,
        modules: task.module ? [task.module] : [],
        criteria: [...task.criteria],
        skills: [...task.skills],
        fromTask: { id: task.id, title: stripQuotes(task.title) },
    };
}

export function validateDraft(draft: IJobDraft, today: DayString): DraftErrors {
    const errors: DraftErrors = {};
    if (!draft.title.trim()) errors.title = 'required';
    if (!draft.kind) errors.kind = 'required';
    if (!draft.description.trim()) errors.description = 'required';
    if (!draft.deadline) errors.deadline = 'required';
    else if (!parseDay(draft.deadline)) errors.deadline = 'required';
    else if (draft.deadline <= today) errors.deadline = 'pastDate';
    if (draft.priceMode === 'fixed') {
        if (!draft.priceText.trim()) errors.price = 'required';
        else if (!(parsePrice(draft.priceText) > 0)) errors.price = 'invalidPrice';
    }
    return errors;
}

function draftPrice(draft: IJobDraft): number | null {
    if (draft.priceMode === 'open') return null;
    const price = parsePrice(draft.priceText);
    return price > 0 ? price : null;
}

/** The job as the card will show it, while the draft is being typed. */
export function previewJob(draft: IJobDraft, company: string, today: DayString): IJob {
    return {
        id: 'preview',
        title: draft.title.trim(),
        kind: draft.kind || 'bug',
        description: draft.description.trim(),
        company,
        companyRating: 0,
        modules: [...draft.modules],
        criteria: [...draft.criteria],
        skills: [...draft.skills],
        deadline: draft.deadline,
        price: draftPrice(draft),
        nda: draft.nda,
        visibility: draft.visibility,
        proposals: 0,
        publishedAt: today,
        mine: true,
        isNew: true,
        fromTask: draft.fromTask ? { ...draft.fromTask } : undefined,
    };
}

/** Creates the person's job in the store. The caller validates first; an invalid draft throws. */
export function publishJob(draft: IJobDraft, company: string, today: DayString = toDay(new Date())): IJob {
    if (Object.keys(validateDraft(draft, today)).length) throw new Error('publishJob: invalid draft');
    const job: IJob = { ...previewJob(draft, company, today), id: `job-new-${store.nextJob++}` };
    store.jobs.push(job);
    return job;
}

// ─── Proposal (accepts the job's terms; no counter-proposal) ─────────

export function emptyProposalDraft(): IProposalDraft {
    return { priceText: '', plan: '', questions: '', ndaAccepted: false };
}

export function proposalDraftFrom(proposal: IProposal, job: IJob): IProposalDraft {
    return {
        priceText: job.price === null ? String(proposal.price).replace('.', ',') : '',
        plan: proposal.plan,
        questions: proposal.questions,
        ndaAccepted: proposal.ndaAccepted,
    };
}

export function validateProposal(job: IJob, draft: IProposalDraft): ProposalErrors {
    const errors: ProposalErrors = {};
    if (job.price === null) {
        if (!draft.priceText.trim()) errors.price = 'required';
        else if (!(parsePrice(draft.priceText) > 0)) errors.price = 'invalidPrice';
    }
    if (!draft.plan.trim()) errors.plan = 'required';
    if (job.nda && !draft.ndaAccepted) errors.nda = 'required';
    return errors;
}

/** Sends (or replaces) the proposal for the job. The caller validates first; an invalid draft throws. */
export function sendProposal(job: IJob, draft: IProposalDraft, today: DayString = toDay(new Date())): IProposal {
    if (Object.keys(validateProposal(job, draft)).length) throw new Error('sendProposal: invalid draft');
    const proposal: IProposal = {
        jobId: job.id,
        price: job.price === null ? parsePrice(draft.priceText) : job.price,
        deadline: job.deadline,
        plan: draft.plan.trim(),
        questions: draft.questions.trim(),
        ndaAccepted: job.nda ? draft.ndaAccepted : false,
        sentAt: today,
    };
    const i = store.proposals.findIndex((p) => p.jobId === job.id);
    if (i >= 0) {
        store.proposals[i] = proposal;
    } else {
        store.proposals.push(proposal);
        const stored = getJob(job.id);
        if (stored) stored.proposals++;
    }
    return proposal;
}

export function withdrawProposal(jobId: string): boolean {
    const i = store.proposals.findIndex((p) => p.jobId === jobId);
    if (i < 0) return false;
    store.proposals.splice(i, 1);
    const job = getJob(jobId);
    if (job && job.proposals > 0) job.proposals--;
    return true;
}

// ─── Pack "install" (only remembered) ────────────────────────────────

export type InstallResult = 'installed' | 'already' | 'incompatible' | 'unknown' | 'noProject';

export function installPack(packId: string, project: number, today: DayString = toDay(new Date())): InstallResult {
    const pack = getPack(packId);
    if (!pack) return 'unknown';
    if (!project) return 'noProject';
    if (!pack.compatible) return 'incompatible';
    if (isInstalled(packId, project)) return 'already';
    store.installs.push({ packId, project, installedAt: today });
    pack.installs++;
    return 'installed';
}
