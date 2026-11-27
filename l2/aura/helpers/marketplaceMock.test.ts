import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
    addDays, draftFromTask, emptyDraft, emptyProposalDraft, filterJobs, filterPacks, filterTasks,
    getInstalls, getJob, getJobs, getOffers, getPacks, getTasks, installPack, isInstalled, offerCounts,
    parsePrice, proposalFor, publishJob, resetMarketplace, sendProposal, validateDraft, validateProposal,
    withdrawProposal, type IJobDraft, type IOfferFilter,
} from './marketplaceMock.js';

const TODAY = '2026-11-23';

beforeEach(() => resetMarketplace(TODAY));

function validDraft(over: Partial<IJobDraft> = {}): IJobDraft {
    return {
        ...emptyDraft(), title: 'Tela de estoque', kind: 'newScreen', description: 'Uma tela nova',
        deadline: addDays(TODAY, 10), priceText: '1.500,50', ...over,
    };
}

const ALL: IOfferFilter = { show: 'all', search: '', jobKind: 'all', packCategory: 'all', packPrice: 'all' };

test('parsePrice reads Brazilian and plain numbers', () => {
    assert.equal(parsePrice('1.500,50'), 1500.5);
    assert.equal(parsePrice('R$ 2.500'), 2500);
    assert.equal(parsePrice('1500.5'), 1500.5);
    assert.equal(parsePrice('400'), 400);
    assert.ok(Number.isNaN(parsePrice('abc')));
    assert.ok(Number.isNaN(parsePrice('')));
});

test('a published job comes first, as mine and new, with 1.500,50 read as 1500.5', () => {
    const job = publishJob(validDraft(), 'Minha empresa', TODAY);
    const first = getJobs()[0];
    assert.equal(first.id, job.id);
    assert.equal(first.mine, true);
    assert.equal(first.isNew, true);
    assert.equal(first.price, 1500.5);
    assert.equal(first.company, 'Minha empresa');
    assert.equal(first.proposals, 0);
    assert.equal(getOffers(ALL)[0].kind, 'job');
});

test('publishJob refuses an invalid draft', () => {
    assert.throws(() => publishJob(emptyDraft(), 'Minha empresa', TODAY));
});

test('validateDraft points every missing field, a past deadline and an invalid price', () => {
    assert.deepEqual(validateDraft(emptyDraft(), TODAY), {
        title: 'required', kind: 'required', description: 'required', deadline: 'required', price: 'required',
    });
    assert.equal(validateDraft(validDraft({ deadline: TODAY }), TODAY).deadline, 'pastDate');
    assert.equal(validateDraft(validDraft({ deadline: addDays(TODAY, -1) }), TODAY).deadline, 'pastDate');
    assert.equal(validateDraft(validDraft({ priceText: '0' }), TODAY).price, 'invalidPrice');
    assert.equal(validateDraft(validDraft({ priceText: 'muito' }), TODAY).price, 'invalidPrice');
    assert.deepEqual(validateDraft(validDraft(), TODAY), {});
});

test('"a combinar" needs no price and publishes with price null', () => {
    const draft = validDraft({ priceMode: 'open', priceText: '' });
    assert.deepEqual(validateDraft(draft, TODAY), {});
    assert.equal(publishJob(draft, 'Minha empresa', TODAY).price, null);
});

test('a task fills title without quotes, kind, module, skills and criteria', () => {
    const pin = getTasks().find((t) => t.id === 'tk-1')!;
    const draft = draftFromTask(pin);
    assert.equal(draft.title, 'O botão salvar devia ficar no topo');
    assert.equal(draft.kind, pin.suggestedKind);
    assert.deepEqual(draft.modules, ['pedidos']);
    assert.deepEqual(draft.skills, pin.skills);
    assert.deepEqual(draft.criteria, ['Pin resolvido']);
    assert.match(draft.description, /Pedidos › Novo pedido · pedidos/);
    assert.deepEqual(draft.fromTask, { id: 'tk-1', title: 'O botão salvar devia ficar no topo' });
});

test('a task of several modules does not become a module, and the published job keeps the task', () => {
    const several = getTasks().find((t) => t.module === null)!;
    const draft = draftFromTask(several);
    assert.deepEqual(draft.modules, []);
    const job = publishJob({ ...draft, deadline: addDays(TODAY, 5), priceText: '300' }, 'Minha empresa', TODAY);
    assert.equal(getJob(job.id)?.fromTask?.id, several.id);
});

test('filterJobs by kind and by search over title, company, skills and modules', () => {
    const jobs = getJobs();
    assert.deepEqual(filterJobs(jobs, '', 'bug').map((j) => j.id), ['job-3']);
    assert.deepEqual(filterJobs(jobs, 'distribuidora', 'all').map((j) => j.id), ['job-1']);
    assert.deepEqual(filterJobs(jobs, 'CONTRATOS', 'all').map((j) => j.id), ['job-5']);
    assert.deepEqual(filterJobs(jobs, 'integracao', 'all').map((j) => j.id), ['job-1']);
    assert.equal(filterJobs(jobs, 'nada disso', 'all').length, 0);
});

test('filterPacks by category, free/paid and search over groups', () => {
    const all = getPacks();
    assert.equal(filterPacks(all, '', 'all', 'all').length, 6);
    assert.deepEqual(filterPacks(all, '', 'all', 'free').map((p) => p.id).sort(), ['pk-cards', 'pk-forms']);
    assert.equal(filterPacks(all, '', 'all', 'paid').length, 4);
    assert.deepEqual(filterPacks(all, '', 'charts', 'all').map((p) => p.id), ['pk-charts']);
    assert.deepEqual(filterPacks(all, 'groupViewTable', 'all', 'all').map((p) => p.id), ['pk-tables']);
});

test('filterTasks by source and search', () => {
    assert.equal(filterTasks(getTasks(), '').length, 6);
    assert.equal(filterTasks(getTasks(), '', 'pin').length, 2);
    assert.deepEqual(filterTasks(getTasks(), 'baixarTitulo').map((t) => t.id), ['tk-3']);
});

test('getOffers: Tudo brings both kinds, Jobs only jobs, Componentes only packs', () => {
    const all = getOffers(ALL);
    assert.equal(all.length, 11);
    assert.ok(all.some((o) => o.kind === 'job') && all.some((o) => o.kind === 'pack'));
    for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].date >= all[i].date, 'most recent first');
    assert.ok(getOffers({ ...ALL, show: 'jobs' }).every((o) => o.kind === 'job'));
    assert.ok(getOffers({ ...ALL, show: 'packs' }).every((o) => o.kind === 'pack'));
    assert.deepEqual(offerCounts(''), { jobs: 5, packs: 6 });
});

test('getOffers: secondary filters only apply to their own kind', () => {
    const bugsAndPacks = getOffers({ ...ALL, jobKind: 'bug' });
    assert.equal(bugsAndPacks.filter((o) => o.kind === 'job').length, 1);
    assert.equal(bugsAndPacks.filter((o) => o.kind === 'pack').length, 6);
    const jobsAndFree = getOffers({ ...ALL, packPrice: 'free', packCategory: 'forms' });
    assert.equal(jobsAndFree.filter((o) => o.kind === 'job').length, 5);
    assert.equal(jobsAndFree.filter((o) => o.kind === 'pack').length, 1);
});

test('proposal uses the job price and deadline; NDA needs the term', () => {
    const job = getJob('job-1')!;
    const before = job.proposals;
    assert.deepEqual(validateProposal(job, emptyProposalDraft()), { plan: 'required', nda: 'required' });
    const p = sendProposal(job, { ...emptyProposalDraft(), plan: 'Faço assim', ndaAccepted: true }, TODAY);
    assert.equal(p.price, 2500);
    assert.equal(p.deadline, job.deadline);
    assert.equal(getJob('job-1')!.proposals, before + 1);
});

test('"a combinar" job: the proposal must give a value', () => {
    const job = getJob('job-4')!;
    assert.equal(job.price, null);
    assert.equal(validateProposal(job, { ...emptyProposalDraft(), plan: 'x', ndaAccepted: true }).price, 'required');
    assert.equal(validateProposal(job, { ...emptyProposalDraft(), plan: 'x', ndaAccepted: true, priceText: '0' }).price, 'invalidPrice');
    const p = sendProposal(job, { ...emptyProposalDraft(), plan: 'x', ndaAccepted: true, priceText: '3.200' }, TODAY);
    assert.equal(p.price, 3200);
});

test('resending replaces the proposal; withdrawing removes it', () => {
    const job = getJob('job-3')!;
    const before = job.proposals;
    sendProposal(job, { ...emptyProposalDraft(), plan: 'primeira' }, TODAY);
    sendProposal(job, { ...emptyProposalDraft(), plan: 'segunda' }, TODAY);
    assert.equal(proposalFor('job-3')?.plan, 'segunda');
    assert.equal(getJob('job-3')!.proposals, before + 1);
    assert.equal(withdrawProposal('job-3'), true);
    assert.equal(proposalFor('job-3'), undefined);
    assert.equal(getJob('job-3')!.proposals, before);
    assert.equal(withdrawProposal('job-3'), false);
});

test('installing the same pack twice in the same project counts once', () => {
    assert.equal(installPack('pk-forms', 102047, TODAY), 'installed');
    assert.equal(installPack('pk-forms', 102047, TODAY), 'already');
    assert.equal(installPack('pk-forms', 102048, TODAY), 'installed');
    assert.equal(getInstalls().length, 2);
    assert.ok(isInstalled('pk-forms', 102047));
    assert.equal(installPack('pk-agenda', 102047, TODAY), 'incompatible');
    assert.equal(installPack('pk-forms', 0, TODAY), 'noProject');
});

test('the store survives across reads until reset', () => {
    publishJob(validDraft(), 'Minha empresa', TODAY);
    assert.equal(getJobs().length, 6);
    resetMarketplace(TODAY);
    assert.equal(getJobs().length, 5);
});
