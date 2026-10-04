/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { parseD2Page11Definition, type D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import type { D2PageRequestsInput } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { gateD2SharedV2, parseD2SharedV2, sharedFromDerived, type D2SharedV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { beforePromptStep, reusableD2Shared, sharedSchemaFor } from '/_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.js';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { skill as sharedSkill } from '/_102020_/l2/agentDefsL2/skills/genD2SharedDefinition.js';
import {
  approveD2SharedUnit, applyD2SharedLlm, buildD2SharedContext, buildD2SharedPrompt, d2SharedRefusal, d2SharedRefusedMessage, d2SharedShapeIssues, d2SharedValidSources,
  settleD2Shared, sharedUnitInputHash,
  type D2SharedContext, type D2SharedLlmResponse, type D2SharedRefusal, type D2SharedWriter,
} from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';
import { sharedWorkerSteps } from '/_102020_/l2/agentDefsL2/steps/shared60/agentD2Shared.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureRoot = join(here, '../../helpers/fixtures');
const promptText = readFileSync(join(here, 'prompt.md'), 'utf8');
const categories = (JSON.parse(readFileSync(new URL('../../../../l4/collabux/templates/categoryList.json', import.meta.url), 'utf8')) as { categories: D2PageRequestsInput['categories'] }).categories;

function loadPack(folder: string) {
  const root = join(fixtureRoot, folder);
  const menu = JSON.parse(readFileSync(join(root, 'menu.json'), 'utf8')) as D2PageRequestsInput['menu'];
  const needs = JSON.parse(readFileSync(join(root, 'needs.json'), 'utf8')) as { pages: D2PageRequestsInput['needsPages'] };
  const access = JSON.parse(readFileSync(join(root, 'access.json'), 'utf8')) as { grants: D2PageRequestsInput['access']['grants'] };
  const rules = JSON.parse(readFileSync(join(root, 'rules.json'), 'utf8')) as D2PageRequestsInput['rules'];
  const entities: Record<string, Ns5OntologyAnyEntity> = {};
  for (const file of readdirSync(join(root, 'ontology'))) {
    const row = JSON.parse(readFileSync(join(root, 'ontology', file), 'utf8')) as Ns5OntologyAnyEntity;
    entities[(row as { entityId: string }).entityId] = row;
  }
  const pages = readdirSync(join(root, 'page11/desktop')).map(name => name.replace(/\.defs\.ts$/u, ''));
  const siblings = pages.map(pageId => ({
    pageId,
    desktop: parseD2Page11Definition(readFileSync(join(root, 'page11/desktop', `${pageId}.defs.ts`), 'utf8')).definition,
    mobile: parseD2Page11Definition(readFileSync(join(root, 'page11/mobile', `${pageId}.defs.ts`), 'utf8')).definition,
    draftDesktop: buildD2Page11Needs(JSON.parse(readFileSync(join(root, 'page11Needs', `${pageId}Desktop.json`), 'utf8'))),
    draftMobile: buildD2Page11Needs(JSON.parse(readFileSync(join(root, 'page11Needs', `${pageId}Mobile.json`), 'utf8'))),
    desktopText: readFileSync(join(root, 'page11/desktop', `${pageId}.defs.ts`), 'utf8'),
    mobileText: readFileSync(join(root, 'page11/mobile', `${pageId}.defs.ts`), 'utf8'),
    draftDesktopText: readFileSync(join(root, 'page11Needs', `${pageId}Desktop.json`), 'utf8'),
    draftMobileText: readFileSync(join(root, 'page11Needs', `${pageId}Mobile.json`), 'utf8'),
  }));
  return { menu, needs, access, rules, entities, siblings };
}

function renameDeep(value: unknown): unknown {
  const map: Record<string, string> = {
    controleEstoque: 'alphaWarehouse', produtos: 'catalogItems', movimentacoes: 'stockMoves',
    Produto: 'CatalogItem', MovimentacaoEstoque: 'StockMove', produto: 'catalogItem',
    estoquista: 'clerk', gerenciarEstoque: 'manageStock',
  };
  const rewrite = (text: string): string => {
    let next = text;
    for (const [from, to] of Object.entries(map)) next = next.split(from).join(to);
    return next;
  };
  if (typeof value === 'string') return rewrite(value);
  if (Array.isArray(value)) return value.map(renameDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[rewrite(key)] = renameDeep(item);
    return out;
  }
  return value;
}

function contextFrom(pack: ReturnType<typeof loadPack>, pageId: string, moduleName: string): D2SharedContext {
  const sibling = pack.siblings.find(item => item.pageId === pageId);
  if (!sibling) throw new Error(pageId);
  const input: D2PageRequestsInput = {
    module: moduleName, pageId,
    desktop: sibling.desktop, mobile: sibling.mobile,
    draftDesktop: sibling.draftDesktop, draftMobile: sibling.draftMobile,
    siblings: pack.siblings, needsPages: pack.needs.pages, menu: pack.menu,
    entities: pack.entities, access: pack.access, rules: pack.rules, categories,
  };
  return buildD2SharedContext(input, {
    identity: { project: 102047, module: moduleName }, inputHash: 'sha256:fixture',
    page11: { desktop: sibling.desktop, mobile: sibling.mobile },
    page11Text: { desktop: sibling.desktopText, mobile: sibling.mobileText },
    drafts: { desktop: sibling.draftDesktop, mobile: sibling.draftMobile },
    draftText: { desktop: sibling.draftDesktopText, mobile: sibling.draftMobileText },
    skill: sharedSkill, prompt: promptText,
  });
}

function answer(data: D2SharedContext, patch?: Partial<D2SharedLlmResponse>): D2SharedLlmResponse {
  const page = data.page11.desktop;
  const load = data.derived.requests.find(item => item.id === 'load');
  const command = data.derived.requests.find(item => item.kind === 'cmd');
  const navigate = Object.values(page.organisms).flatMap(item => item.intents).find(item => item.kind === 'navigate');
  const steps = data.input.needsPages.find(item => item.pageId === data.input.pageId)?.reads.flatMap(item => item.from.filter(ref => ref.startsWith('journey:')).map(ref => ref.slice('journey:'.length))) ?? [];
  const uniqueSteps = [...new Set(steps)];
  const firstOrganism = Object.keys(page.organisms)[0];
  const returnKey = load?.returns[0] ?? '';
  const extraKeys = load?.returns.slice(1) ?? [];
  // A list key already has its fixed state (same id); other loaded keys get a state of their own.
  const listKeys = new Set(data.derived.requests.flatMap(request => request.lists.map(list => list.key)));
  const stateOf = (key: string): string => listKeys.has(key) ? key : key === returnKey ? 'rows' : `${key}Rows`;
  const rowsId = stateOf(returnKey);
  const camel = (value: string) => value[0].toLowerCase() + value.slice(1);
  const commandReturns = command ? [...new Set([...command.returns, ...Object.values(load?.returnEntities ?? {}).map(camel)])] : [];
  const selectTargets = [...new Set(Object.values(data.drafts.desktop.organisms).map(row => row.selects).filter(Boolean))];
  const carried = Object.entries(data.derived.entry.params).find(([, param]) => param.effect.startsWith('select:'));
  const functions: D2SharedLlmResponse['functions'] = [
    { id: 'load', description: 'Load the page.' },
    ...data.derived.requests.flatMap(request => request.lists.flatMap(list => [
      { id: list.filter, sets: stateOf(list.key), description: 'Filter the loaded list.' },
      { id: list.loadMore, sets: stateOf(list.key), description: 'Load another page of the list.' },
    ])),
    ...(selectTargets.length ? [{ id: 'chooseRow', sets: 'selected', description: 'Choose a row.' }] : []),
    ...(command ? [{ id: command.id, ...(returnKey ? { updates: [rowsId, ...extraKeys.map(stateOf)] } : {}), description: 'Submit the form.' }] : []),
    ...(navigate ? [{ id: navigate.id, navigate: navigate.to, ...(carried ? { carries: { [carried[0]]: 'selected.id' } } : {}), description: 'Open the related page.' }] : []),
  ];
  const base: D2SharedLlmResponse = {
    states: [
      ...(returnKey ? [
        { id: rowsId, source: `load.${returnKey}`, description: 'Rows loaded for the page.' },
        { id: 'narrowed', source: rowsId, description: 'Rows narrowed from the loaded rows.' },
        ...extraKeys.map(key => ({ id: stateOf(key), source: `load.${key}`, description: 'Other rows loaded for the page.' })),
      ] : []),
      ...(selectTargets.length ? [{ id: 'selected', source: 'chooseRow', description: 'Row chosen on the page.' }] : []),
      ...(command ? [{ id: 'draft', source: `${command.id}.input`, description: 'Values captured by the form.' }] : []),
    ],
    functions,
    journeys: uniqueSteps.map(step => ({ step, organisms: [firstOrganism], functions: ['load'] })),
    commandReturns: command ? [{ requestId: command.id, returns: commandReturns }] : [],
    requestRules: Object.entries(data.derived.rules).map(([requestId, rules]) => ({ requestId, rules })),
    formChoices: (() => {
      const taken = new Set<string>();
      return Object.values(data.derived.forms).filter(item => item.ambiguous).map(item => {
        const organism = Object.entries(data.drafts.desktop.organisms).find(([id, row]) => !taken.has(id) && row.edits.some(path => path.split('.')[0] === item.entity))?.[0] ?? '';
        if (organism) taken.add(organism);
        return { submit: item.submit, organism };
      });
    })(),
  };
  return { ...base, ...patch };
}

function memoryWriter(): { writer: D2SharedWriter; writes: Map<string, unknown> } {
  const writes = new Map<string, unknown>();
  const writer: D2SharedWriter = {
    writeSource: async (info, source) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, source); },
    writeJson: async (info, value) => { writes.set(`${info.folder}/${info.shortName}${info.extension}`, value); },
  };
  return { writer, writes };
}

void test('products fixture renders shared v2 and refuses gates 1 to 4 before writing', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const pageId = pack.siblings.find(item => item.pageId === 'produtos')!.pageId;
  const data = contextFrom(pack, pageId, moduleName);
  const { writer, writes } = memoryWriter();
  const receipt = await approveD2SharedUnit(data, answer(data), 1200, 0, writer);
  assert.equal(writes.size, 2);
  const source = writes.get(`${moduleName}/web/shared/${pageId}.defs.ts`);
  assert.equal(typeof source, 'string');
  const parsed = parseD2SharedV2(source as string);
  assert.equal(parsed.location.pageId, pageId);
  assert.deepEqual(Object.keys(parsed.definition.requests).sort(), data.derived.requests.map(item => item.id).sort());
  const rowsId = parsed.definition.states.narrowed.source;
  assert.equal(parsed.definition.states[rowsId].source.startsWith('load.'), true);
  assert.equal(parsed.definition.states.selected.source, 'chooseRow');
  assert.equal(parsed.definition.functions.chooseRow.sets, 'selected');
  assert.equal(parsed.definition.states.draft.source.endsWith('.input'), true);
  const commandId = data.derived.requests.find(item => item.kind === 'cmd')?.id ?? '';
  assert.deepEqual(parsed.definition.functions[commandId].updates, [rowsId]);
  const need = data.input.needsPages.find(item => item.pageId === pageId)!;
  assert.deepEqual(gateD2SharedV2(parsed.definition, {
    page11: data.page11.desktop, draft: data.drafts.desktop, needs: need, menu: data.input.menu, derived: data.derived,
  }), []);
  assert.equal(receipt.schemaVersion.includes('shared-v2'), true);
  assert.equal(receipt.promptChars, 1200);
  assert.equal(typeof receipt.page11Hashes.desktop, 'string');
  const again = applyD2SharedLlm(data, answer(data));
  assert.deepEqual(Object.keys(again.states), Object.keys(parsed.definition.states));
  assert.deepEqual(Object.keys(again.functions), Object.keys(parsed.definition.functions));

  const refuse = async (patch: Partial<D2SharedLlmResponse>, code: RegExp) => {
    const sink = memoryWriter();
    await assert.rejects(() => approveD2SharedUnit(data, answer(data, patch), 1200, 0, sink.writer), code);
    assert.equal(sink.writes.size, 0);
  };
  const steps = answer(data).journeys.map(item => item.step);
  const firstOrganism = Object.keys(data.page11.desktop.organisms)[0];
  await refuse({ journeys: [] }, /D2_SHARED_V2_JOURNEY_UNSERVED/u);
  await refuse({ journeys: [{ step: steps[0], organisms: [], functions: ['load'] }, ...steps.slice(1).map(step => ({ step, organisms: [firstOrganism], functions: ['load'] }))] }, /D2_SHARED_V2_JOURNEY_UNSERVED/u);
  await refuse({ journeys: [...answer(data).journeys, { step: 'missingJourney/missingStep', organisms: [firstOrganism], functions: ['load'] }] }, /D2_SHARED_V2_JOURNEY_INVENTED/u);
  await refuse({ journeys: [...answer(data).journeys, { step: `${steps[0].split('/')[0]}/missingStep`, organisms: [firstOrganism], functions: ['load'] }] }, /D2_SHARED_V2_JOURNEY_INVENTED/u);
  await refuse({ functions: answer(data).functions.filter(item => item.navigate === undefined) }, /D2_SHARED_V2_FUNCTION_MISSING/u);
  await refuse({ states: [...answer(data).states, { id: 'ghostRows', source: 'missing', description: 'no source' }] }, /D2_SHARED_V2_STATE_SOURCE/u);
  await refuse({ states: [...answer(data).states, { id: 'ghostRows', source: 'qualquerInput', description: 'substring is not a source' }] }, /D2_SHARED_V2_STATE_SOURCE/u);
  // The fixed list state cannot be redefined, and no other state repeats its source.
  await refuse({ states: [...answer(data).states.filter(row => row.id !== rowsId), { id: rowsId, source: 'narrowed', description: 'moved' }] }, /D2_SHARED_STATE_FIXED/u);
  await refuse({ states: [...answer(data).states, { id: 'secondList', source: `load.${rowsId}`, description: 'again' }] }, /D2_SHARED_V2_STATE_DUPLICATE/u);
  const command = data.derived.requests.find(item => item.kind === 'cmd');
  assert.ok(command);
  // An organism that reads but no request serves stays unbound.
  const orphanPage = structuredClone(data.page11.desktop);
  orphanPage.organisms.orphanReader = { kind: 'detail', text: 'orphan', intents: [] };
  const orphanDraft = structuredClone(data.drafts.desktop);
  orphanDraft.organisms.orphanReader = { reads: [`${Object.values(data.derived.requests[0].returnEntities)[0]}.id`], edits: [], selects: '', submits: [] };
  assert.equal(gateD2SharedV2(parsed.definition, { page11: orphanPage, draft: orphanDraft, needs: need, menu: data.input.menu, derived: data.derived })
    .some(item => item.code === 'D2_SHARED_V2_ORGANISM_UNBOUND' && item.path === 'organisms.orphanReader'), true);
  await refuse({ states: [] }, /D2_SHARED_V2_FUNCTION_SET/u);
  await refuse({ functions: answer(data).functions.map(item => item.id === command.id ? { ...item, updates: ['missingState'] } : item) }, /D2_SHARED_V2_FUNCTION_UPDATE/u);
  const navigate = answer(data).functions.find(item => item.navigate)?.navigate;
  assert.ok(navigate);
  const [actorKey, actorPages] = Object.entries(data.input.menu.authorities)[0];
  const locked = contextFrom(pack, pageId, moduleName);
  locked.input = { ...locked.input, menu: { ...locked.input.menu, authorities: { [actorKey]: actorPages.filter(id => id !== navigate) } } };
  const lockedSink = memoryWriter();
  await assert.rejects(() => approveD2SharedUnit(locked, answer(locked), 1200, 0, lockedSink.writer), /D2_SHARED_V2_FUNCTION_NAVIGATE/u);
  assert.equal(lockedSink.writes.size, 0);
  await refuse({ commandReturns: [{ requestId: command.id, returns: ['notRead'] }] }, /D2_SHARED_V2_RETURNS/u);
});

void test('renamed and synthetic fixtures keep structure and accept one form choice', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const original = contextFrom(pack, 'produtos', moduleName);
  const renamedPack = renameDeep(pack) as ReturnType<typeof loadPack>;
  const renamed = contextFrom(renamedPack, 'catalogItems', 'alphaWarehouse');
  const left = memoryWriter();
  const right = memoryWriter();
  await approveD2SharedUnit(original, answer(original), 10, 0, left.writer);
  await approveD2SharedUnit(renamed, answer(renamed), 10, 0, right.writer);
  const leftSource = [...left.writes.values()].find(item => typeof item === 'string') as string;
  const rightSource = [...right.writes.values()].find(item => typeof item === 'string') as string;
  assert.equal(renameDeep(leftSource), rightSource);

  const base = original.input;
  const sample = Object.values((base.draftDesktop as D2Page11Needs).organisms).flatMap(item => item.edits);
  const written = sample[0].split('.')[0];
  const leftEdit = sample[0];
  const rightEdit = sample[1] ?? sample[0];
  const molecule = Object.values((base.desktop as D2Page11Definition).molecules)[0];
  const loose = structuredClone(base.desktop as D2Page11Definition);
  loose.sections = [{ id: 'banner', priority: 'primary', purpose: 'banner', organisms: ['banner'] }];
  loose.organisms = {
    banner: { kind: 'summary', text: 'banner', intents: [] },
    formLeft: { kind: 'form', text: 'left', intents: [] },
    sendLeft: { kind: 'actions', text: 'send', intents: [{ id: 'sendLeft', kind: 'submit' }] },
    formRight: { kind: 'form', text: 'right', intents: [] },
    sendRight: { kind: 'actions', text: 'send', intents: [{ id: 'sendRight', kind: 'submit' }] },
  };
  loose.molecules = { formLeft: molecule, formRight: molecule };
  const looseDraft: D2Page11Needs = { organisms: {
    banner: { reads: [], edits: [], selects: '', submits: [] },
    formLeft: { reads: [], edits: [leftEdit], selects: '', submits: [] },
    sendLeft: { reads: [], edits: [], selects: '', submits: [{ intentId: 'sendLeft', write: `${written}.create` }] },
    formRight: { reads: [], edits: [rightEdit], selects: '', submits: [] },
    sendRight: { reads: [], edits: [], selects: '', submits: [{ intentId: 'sendRight', write: `${written}.create` }] },
  } };
  const synthetic = buildD2SharedContext({
    ...base, desktop: loose, mobile: loose, draftDesktop: looseDraft, draftMobile: looseDraft,
    siblings: base.siblings.map(item => item.pageId === base.pageId ? { ...item, desktop: loose, mobile: loose, draftDesktop: looseDraft, draftMobile: looseDraft } : item),
  }, { ...original, page11: { desktop: loose, mobile: loose }, drafts: { desktop: looseDraft, mobile: looseDraft }, page11Text: { desktop: 'left', mobile: 'left' }, draftText: { desktop: '{}', mobile: '{}' } });
  assert.equal(Object.values(synthetic.derived.forms).every(item => item.ambiguous), true);
  const chosen = applyD2SharedLlm(synthetic, answer(synthetic));
  assert.equal(chosen.forms.sendLeft.organism, 'formLeft');
  assert.equal(chosen.forms.sendRight.organism, 'formRight');
  await assert.rejects(async () => applyD2SharedLlm(synthetic, answer(synthetic, { formChoices: [
    { submit: 'sendLeft', organism: 'formLeft' }, { submit: 'sendRight', organism: 'formLeft' },
  ] })), /D2_SHARED_FORM_REUSE/u);
  await assert.rejects(async () => applyD2SharedLlm(synthetic, answer(synthetic, { formChoices: [
    { submit: 'sendLeft', organism: 'banner' }, { submit: 'sendRight', organism: 'formRight' },
  ] })), /D2_SHARED_FORM_ENTITY/u);

  // Own-record page: one form with create and update of the same record, no list.
  const own = structuredClone(base.desktop as D2Page11Definition);
  own.sections = [{ id: 'current', priority: 'primary', purpose: 'current', organisms: ['ownDetail'] }, { id: 'edit', priority: 'main', purpose: 'edit', organisms: ['ownForm', 'ownActions'] }];
  own.organisms = {
    ownDetail: { kind: 'detail', text: 'own', intents: [] },
    ownForm: { kind: 'form', text: 'own', intents: [] },
    ownActions: { kind: 'actions', text: 'own', intents: [{ id: 'createOwn', kind: 'submit' }, { id: 'updateOwn', kind: 'submit' }] },
  };
  own.molecules = { ownForm: molecule };
  const ownDraft: D2Page11Needs = { organisms: {
    ownDetail: { reads: [`${written}.id`, leftEdit], edits: [], selects: '', submits: [] },
    ownForm: { reads: [`${written}.id`], edits: [leftEdit], selects: '', submits: [] },
    ownActions: { reads: [], edits: [], selects: '', submits: [{ intentId: 'createOwn', write: `${written}.create` }, { intentId: 'updateOwn', write: `${written}.update` }] },
  } };
  const ownData = buildD2SharedContext({
    ...base, desktop: own, mobile: own, draftDesktop: ownDraft, draftMobile: ownDraft,
    needsPages: base.needsPages.map(page => page.pageId === base.pageId ? { ...page, writes: [...page.writes, { entity: written, operation: 'update' }] } : page),
    siblings: base.siblings.map(item => item.pageId === base.pageId ? { ...item, desktop: own, mobile: own, draftDesktop: ownDraft, draftMobile: ownDraft } : item),
  }, { ...original, page11: { desktop: own, mobile: own }, drafts: { desktop: ownDraft, mobile: ownDraft }, page11Text: { desktop: 'own', mobile: 'own' }, draftText: { desktop: '{}', mobile: '{}' } });
  assert.deepEqual(ownData.derived.requests.filter(item => item.kind === 'cmd').map(item => item.id).sort(), ['createOwn', 'updateOwn']);
  const ownAnswer = answer(ownData);
  // The live repair shape: the create function also sets the loaded record.
  ownAnswer.functions = [...ownAnswer.functions.filter(row => row.id !== 'createOwn' && row.id !== 'updateOwn'),
    { id: 'createOwn', sets: 'rows', description: 'Create the own record.' }, { id: 'updateOwn', updates: ['rows'], description: 'Update the own record.' }];
  const ownShared = applyD2SharedLlm(ownData, ownAnswer);
  assert.deepEqual(Object.keys(ownShared.forms).sort(), ['createOwn', 'updateOwn']);
  assert.equal(ownShared.functions.createOwn.calls, 'createOwn');
  const ownIssues = gateD2SharedV2(ownShared, {
    page11: own, draft: ownDraft, needs: ownData.input.needsPages.find(item => item.pageId === ownData.input.pageId)!, menu: ownData.input.menu, derived: ownData.derived,
  }).map(item => item.code);
  assert.equal(ownIssues.some(code => code === 'D2_SHARED_V2_FUNCTION_DUPLICATE' || code === 'D2_SHARED_V2_FUNCTION_MISSING' || code === 'D2_SHARED_V2_ORGANISM_UNBOUND'), false, ownIssues.join(','));
});

void test('same inputs reuse without an LLM and a sibling change keeps the other page', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const products = contextFrom(pack, 'produtos', moduleName);
  const moves = contextFrom(pack, 'movimentacoes', moduleName);
  const hash = await sharedUnitInputHash(products);
  assert.equal(await sharedUnitInputHash(products), hash);
  const stored = memoryWriter();
  const receipt = await approveD2SharedUnit(products, answer(products), 80, 0, stored.writer);
  const source = stored.writes.get(`${moduleName}/web/shared/produtos.defs.ts`);
  assert.equal(typeof source, 'string');
  const reused = await reusableD2Shared({ project: 102047, module: moduleName }, 'produtos', {
    readReceipt: async () => receipt,
    context: async () => products,
    readShared: async () => source as string,
  });
  assert.equal(reused, true);
  const changed = { ...products, draftText: { ...products.draftText, desktop: `${products.draftText.desktop}\n` } };
  assert.equal(await reusableD2Shared({ project: 102047, module: moduleName }, 'produtos', {
    readReceipt: async () => receipt, context: async () => changed, readShared: async () => source as string,
  }), false);
  const sibling = structuredClone(moves);
  sibling.page11Text = { desktop: `${moves.page11Text.desktop}\n`, mobile: moves.page11Text.mobile };
  assert.equal(await sharedUnitInputHash(products), hash);
  assert.notEqual(await sharedUnitInputHash(sibling), await sharedUnitInputHash(moves));
  const data = products;
  const port = { reusable: async () => true, context: async () => data, settle: () => ({ pageIds: async () => ['produtos', 'movimentacoes'], reusable: async () => false, refusal: async () => null }) };
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'shared', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2SharedPage', prompt: JSON.stringify({ project: 102047, module: moduleName, pageId: 'produtos', attempt: 1 }), rags: [],
    planning: { planId: 'shared60-produtos-1', dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const parent = { ...step, stepId: 1 } as mls.msg.AIAgentStep;
  const execution = { message: { orderAt: 'message-1', threadId: 'thread-1' }, task: { PK: 'task-1' }, isTest: true } as mls.msg.ExecutionContext;
  const intents = await beforePromptStep({ agentName: 'agentD2SharedPage' } as Parameters<typeof beforePromptStep>[0], execution, parent, step, 1, port);
  assert.equal(intents.length, 1);
  assert.equal(intents[0].type, 'update-status');
  assert.match((intents[0] as { traceMsg?: string }).traceMsg ?? '', /reused without an LLM/u);
});

void test('prompt declares the reasoning model and the largest drafted page stays within 160k', async () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  // The largest drafted page of the frozen fixture pack (the runtime project is regenerated by other fronts).
  let best = { bytes: -1, pageId: '' };
  for (const sibling of pack.siblings) {
    const bytes = sibling.desktopText.length + sibling.mobileText.length + sibling.draftDesktopText.length + sibling.draftMobileText.length;
    if (bytes > best.bytes) best = { bytes, pageId: sibling.pageId };
  }
  assert.ok(best.pageId);
  const data = contextFrom(pack, best.pageId, moduleName);
  const built = buildD2SharedPrompt(data);
  const fixedIds = Object.keys(sharedFromDerived(data.derived).functions);
  const human = JSON.parse(built.humanPrompt) as { fixedFunctions: Array<{ id: string; calls?: string }> };
  assert.deepEqual(human.fixedFunctions.map(item => item.id), fixedIds);
  for (const id of fixedIds) assert.equal(built.humanPrompt.includes(`"id":"${id}"`), true);
  assert.equal(built.chars <= 160_000, true);
  assert.ok(built.chars > 0);
  assert.equal(built.systemPrompt.startsWith('<!-- modelType: reasoning -->'), true);
  assert.match(built.systemPrompt, /<!-- reasoningEffort: high -->/u);
  assert.match(built.systemPrompt, /<!-- x-tool-strict: true -->/u);
  const port = { reusable: async () => false, context: async () => data, settle: () => ({ pageIds: async () => [], reusable: async () => true, refusal: async () => null }) };
  const step = {
    type: 'agent', stepId: 2, interaction: null, stepTitle: 'shared', status: 'waiting_human_input', nextSteps: [],
    agentName: 'agentD2SharedPage', prompt: JSON.stringify({ project: 102047, module: moduleName, pageId: best.pageId, attempt: 1 }), rags: [],
    planning: { planId: 'shared60', dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  const intents = await beforePromptStep({ agentName: 'agentD2SharedPage' } as Parameters<typeof beforePromptStep>[0], { message: { orderAt: 'm', threadId: 't' }, task: { PK: 'k' }, isTest: true } as mls.msg.ExecutionContext, { ...step, stepId: 1 } as mls.msg.AIAgentStep, step, 1, port);
  const ready = intents[0] as mls.msg.AgentIntentPromptReady;
  assert.equal(ready.type, 'prompt_ready');
  assert.equal(ready.tools?.[0]?.function.name, 'submitD2Shared');
  const parameters = JSON.stringify(ready.tools?.[0]?.function.parameters ?? {});
  assert.equal(parameters.includes('"sets":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9]*$"}'), true);
  assert.equal(parameters.includes('"source":{"type":"string","pattern":"^[A-Za-z][A-Za-z0-9]*(\\\\.[A-Za-z][A-Za-z0-9]*)*$"}'), true);
  assert.equal(built.humanPrompt.includes(data.page11.desktop.organisms[Object.keys(data.page11.desktop.organisms)[0]].text), false);
  assert.equal(built.chars <= 160_000, true);
  assert.equal(built.chars, 11738);
  const ruled = JSON.parse(built.humanPrompt) as { ruleCandidates: Record<string, string[]>; ruleTexts: Record<string, string> };
  assert.deepEqual(ruled.ruleCandidates, data.derived.rules);
  for (const id of Object.values(data.derived.rules).flat()) assert.equal(ruled.ruleTexts[id], data.input.rules.rules[id]);
  assert.equal(parameters.includes('"requestRules"'), true);
  const keyed = JSON.parse(built.humanPrompt) as { commandReturnKeys: string[] };
  const readKeys = data.input.needsPages.find(item => item.pageId === data.input.pageId)!.reads.map(read => read.entity[0].toLowerCase() + read.entity.slice(1));
  assert.deepEqual(keyed.commandReturnKeys, [...new Set(readKeys)]);
});

void test('live answers accept entry params and refuse prose or a multi-id sets', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const moves = contextFrom(pack, 'movimentacoes', moduleName);
  const products = contextFrom(pack, 'produtos', moduleName);
  const allRules = (data: D2SharedContext) => Object.entries(data.derived.rules).map(([requestId, rules]) => ({ requestId, rules }));
  const liveMoves = { ...JSON.parse(readFileSync(join(here, 'fixtures/liveResponseMovimentacoes.json'), 'utf8')), requestRules: allRules(moves) } as D2SharedLlmResponse;
  const liveProducts = { ...JSON.parse(readFileSync(join(here, 'fixtures/liveResponseProdutos.json'), 'utf8')), requestRules: allRules(products) } as D2SharedLlmResponse;
  const gateOf = (data: D2SharedContext, raw: D2SharedLlmResponse) => {
    const definition = applyD2SharedLlm(data, raw);
    const need = data.input.needsPages.find(item => item.pageId === data.input.pageId)!;
    return gateD2SharedV2(definition, { page11: data.page11.desktop, draft: data.drafts.desktop, needs: need, menu: data.input.menu, derived: data.derived });
  };
  const productIssues = gateOf(products, liveProducts);
  assert.ok(productIssues.some(item => item.code === 'D2_SHARED_V2_STATE_SOURCE' && item.message.includes('validSources')));
  const moveIssues = gateOf(moves, liveMoves);
  assert.deepEqual([...new Set(moveIssues.map(item => item.code))].sort(), ['D2_SHARED_V2_FUNCTION_SET', 'D2_SHARED_V2_RETURNS_DERIVED', 'D2_SHARED_V2_UPDATES_RETURNS']);
  const setIssues = moveIssues.filter(item => item.code === 'D2_SHARED_V2_FUNCTION_SET');
  assert.equal(setIssues.every(item => item.message.includes('validSources') && item.message.includes('movimentacoes, produtos')), true);
  const fixed: D2SharedLlmResponse = { ...liveMoves, functions: liveMoves.functions.map(item => item.sets === 'movimentacoes, produtos'
    ? { ...item, sets: undefined, updates: ['movimentacoes', 'produtos'] }
    : item.calls === 'load' && item.id !== 'load' ? { ...item, sets: 'movimentacoes' } : item), commandReturns: liveMoves.commandReturns.map(row => ({ ...row, returns: [...row.returns, 'produto'] })) };
  assert.deepEqual(gateOf(moves, fixed), []);
  const human = JSON.parse(buildD2SharedPrompt(products).humanPrompt) as { validSources: string[] };
  assert.deepEqual(human.validSources, d2SharedValidSources(products.derived));
  assert.equal(human.validSources.some(item => item.startsWith('entry.params.')), true);
  assert.equal(human.validSources.some(item => item.endsWith('.input')), true);
  assert.equal(human.validSources.some(item => item.includes(' ')), false);
  const missing = answer(moves);
  missing.states = [...missing.states, { id: 'ghost', source: 'entry.params.missingParam', description: 'absent parameter' }];
  const missingIssues = gateOf(moves, missing);
  assert.equal(missingIssues.some(item => item.code === 'D2_SHARED_V2_STATE_SOURCE' && item.message.includes('entry.params.missingParam')), true);
});

void test('live shared with duplicated fixed ids and a bare carry is refused, and the reused form passes', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const products = contextFrom(pack, 'produtos', moduleName);
  const source = readFileSync(join(here, '../../../../../../todo/gerarApp/l2/certificacao/runs/live2_artifacts/produtos.defs.ts'), 'utf8');
  const definition = parseD2SharedV2(source).definition;
  const asResponse = (functions: D2SharedV2Definition['functions']): D2SharedLlmResponse => ({
    states: Object.entries(definition.states).map(([id, row]) => ({ id, source: row.source, description: row.description })),
    functions: Object.entries(functions).map(([id, row]) => ({ id, description: row.description, calls: row.calls, sets: row.sets, updates: row.updates, navigate: row.navigate, carries: row.carries })),
    journeys: definition.journeys,
    commandReturns: Object.entries(definition.requests).filter(([, row]) => row.kind === 'cmd').map(([requestId, row]) => ({ requestId, returns: row.returns })),
    requestRules: Object.entries(products.derived.rules).map(([requestId, rules]) => ({ requestId, rules: definition.rules[requestId] ?? rules })),
  });
  const need = products.input.needsPages.find(item => item.pageId === 'produtos')!;
  const gateOf = (raw: D2SharedLlmResponse) => gateD2SharedV2(applyD2SharedLlm(products, raw), {
    page11: products.page11.desktop, draft: products.drafts.desktop, needs: need, menu: products.input.menu, derived: products.derived,
  });
  const refused = gateOf(asResponse(definition.functions));
  assert.equal(refused.some(item => item.code === 'D2_SHARED_V2_FUNCTION_DUPLICATE'), true);
  assert.equal(refused.some(item => item.code === 'D2_SHARED_V2_DESCRIPTION_EMPTY'), true);
  assert.equal(refused.some(item => item.code === 'D2_SHARED_V2_CARRIES_PATH'), true);
  assert.equal(refused.some(item => item.code === 'D2_SHARED_V2_NAVIGATE_SETS'), true);
  // d2_63: produtosFiltrados <- filtrarListaProdutos (no calls) is now a selection of the one selected entity.
  assert.equal(refused.some(item => item.code === 'D2_SHARED_V2_UPDATES_RETURNS' && item.message.includes('produtosFiltrados')), false);
  const fixedFunctions: D2SharedV2Definition['functions'] = {};
  for (const [id, row] of Object.entries(definition.functions)) {
    if (id === 'carregarProdutos') continue;
    fixedFunctions[id] = id === 'abrirMovimentacoes' && row.carries
      ? { description: row.description, navigate: row.navigate, carries: Object.fromEntries(Object.entries(row.carries).map(([key, value]) => [key, value.includes('.') ? value : `${value}.id`])) }
      : { ...row, description: row.description.trim() ? row.description : `Use ${id}.`, ...(row.updates ? { updates: row.updates.filter(item => item !== 'produtosFiltrados') } : {}),
        ...(id === 'filterListaProdutos' || id === 'loadMoreListaProdutos' ? { sets: 'produtos' } : {}) };
  }
  assert.deepEqual(gateOf(asResponse(fixedFunctions)), []);
});

void test('live 3 shared: command returns, carries, navigation and rules are refused by name and pass once fixed', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const asResponse = (definition: D2SharedV2Definition): D2SharedLlmResponse => ({
    states: Object.entries(definition.states).map(([id, row]) => ({ id, source: row.source, description: row.description })),
    functions: Object.entries(definition.functions).map(([id, row]) => ({ id, description: row.description, calls: row.calls, sets: row.sets, updates: row.updates, navigate: row.navigate, carries: row.carries })),
    journeys: definition.journeys,
    commandReturns: Object.entries(definition.requests).filter(([, row]) => row.kind === 'cmd').map(([requestId, row]) => ({ requestId, returns: row.returns })),
    requestRules: Object.entries(definition.rules).map(([requestId, rules]) => ({ requestId, rules })),
  });
  const read = (name: string) => parseD2SharedV2(readFileSync(join(here, 'fixtures', name), 'utf8')).definition;
  const gateOf = (data: D2SharedContext, raw: D2SharedLlmResponse) => gateD2SharedV2(applyD2SharedLlm(data, raw), {
    page11: data.page11.desktop, draft: data.drafts.desktop, needs: data.input.needsPages.find(item => item.pageId === data.input.pageId)!, menu: data.input.menu, derived: data.derived,
  });
  const codes = (data: D2SharedContext, raw: D2SharedLlmResponse) => [...new Set(gateOf(data, raw).map(item => item.code))].sort();
  // d2_65: the list state is fixed (id = list key); a live answer that named it otherwise is renamed to it.
  const onFixedState = (raw: D2SharedLlmResponse, from: string, to: string): D2SharedLlmResponse => {
    const swap = (id: string | undefined) => id === from ? to : id;
    return {
      ...raw,
      states: raw.states.map(row => ({ ...row, id: swap(row.id)!, source: swap(row.source)! })),
      functions: raw.functions.map(row => ({ ...row, sets: swap(row.sets), updates: row.updates?.map(id => swap(id)!),
        ...(row.carries ? { carries: Object.fromEntries(Object.entries(row.carries).map(([key, value]) => [key, value.startsWith(`${from}.`) ? `${to}${value.slice(from.length)}` : value])) } : {}) })),
    };
  };

  const moves = contextFrom(pack, 'movimentacoes', moduleName);
  const liveMoves = read('live3Movimentacoes.defs.ts');
  const movesRaw = asResponse(liveMoves);
  // The live rules predate the list request; it takes the candidates of its own entity.
  movesRaw.requestRules.push({ requestId: 'loadMovimentacoes', rules: moves.derived.rules.loadMovimentacoes });
  assert.deepEqual(codes(moves, movesRaw), ['D2_SHARED_V2_CARRIES_OUTSIDE', 'D2_SHARED_V2_CARRIES_TYPE', 'D2_SHARED_V2_DESCRIPTION_EMPTY', 'D2_SHARED_V2_RETURNS_DERIVED', 'D2_SHARED_V2_STATE_DUPLICATE', 'D2_SHARED_V2_UPDATES_RETURNS']);
  assert.equal(gateOf(moves, movesRaw).some(item => item.code === 'D2_SHARED_V2_UPDATES_RETURNS' && item.message.includes('produtos')), true);
  const movesRenamed = onFixedState(movesRaw, 'historicoMovimentacoes', 'movimentacoes');
  const movesFixed: D2SharedLlmResponse = {
    ...movesRenamed,
    functions: movesRenamed.functions.map(({ carries: _carries, ...row }) => row),
    commandReturns: movesRaw.commandReturns.map(row => ({ ...row, returns: [...row.returns, 'produto'] })),
    requestRules: movesRaw.requestRules.map(row => row.requestId === 'load' ? { ...row, rules: ['saldoAtualProduto', 'avisoSaldoMinimoProduto'] } : row),
  };
  assert.deepEqual(gateOf(moves, movesFixed), []);
  // Live 4 repair: produtos dropped from updates instead of returning produto; the saldo shown goes stale.
  const live4 = asResponse(read('live4Movimentacoes.defs.ts'));
  assert.deepEqual(codes(moves, live4), ['D2_SHARED_V2_RETURNS_DERIVED']);
  const live4Fixed: D2SharedLlmResponse = {
    ...live4,
    functions: live4.functions.map(row => row.id === 'registrarMovimentacao' ? { ...row, updates: [...(row.updates ?? []), 'produtos'] } : row),
    commandReturns: live4.commandReturns.map(row => ({ ...row, returns: [...row.returns, 'produto'] })),
  };
  assert.deepEqual(gateOf(moves, live4Fixed), []);
  assert.deepEqual(codes(moves, { ...live4Fixed, functions: live4.functions }), ['D2_SHARED_V2_RETURNS_DERIVED']);
  const movesShared = applyD2SharedLlm(moves, movesFixed);
  assert.equal(movesShared.functions.filterHistoricoMovimentacoes.calls, 'loadMovimentacoes');
  assert.equal(movesShared.functions.loadMoreHistoricoMovimentacoes.calls, 'loadMovimentacoes');
  assert.deepEqual(movesShared.requests.registrarMovimentacao.returns, ['movimentacaoEstoque', 'produto']);
  assert.deepEqual(movesShared.rules.load, ['saldoAtualProduto', 'avisoSaldoMinimoProduto']);
  const ruleCodes = (patch: Record<string, string[]>) => codes(moves, { ...movesFixed, requestRules: movesFixed.requestRules.map(row => row.requestId in patch ? { ...row, rules: patch[row.requestId] } : row) });
  assert.deepEqual(ruleCodes({ loadMovimentacoes: ['saldoAtualProduto'] }), ['D2_SHARED_V2_RULE_OUTSIDE']);
  assert.deepEqual(ruleCodes({ registrarMovimentacao: [] }), ['D2_SHARED_V2_RULE_COMMAND']);
  assert.deepEqual(codes(moves, { ...movesFixed, requestRules: movesFixed.requestRules.filter(row => row.requestId !== 'load') }), ['D2_SHARED_V2_RULE_REQUEST']);
  assert.throws(() => applyD2SharedLlm(moves, { ...movesFixed, requestRules: [...movesFixed.requestRules, { requestId: 'load', rules: [] }] }), /D2_SHARED_RULES_REQUEST/u);
  assert.throws(() => applyD2SharedLlm(moves, { ...movesFixed, requestRules: [...movesFixed.requestRules, { requestId: 'missingRequest', rules: [] }] }), /D2_SHARED_RULES_REQUEST/u);

  const products = contextFrom(pack, 'produtos', moduleName);
  const liveProducts = read('live3Produtos.defs.ts');
  const productsRaw = asResponse(liveProducts);
  productsRaw.requestRules.push({ requestId: 'loadProdutos', rules: products.derived.rules.loadProdutos });
  assert.deepEqual(codes(products, productsRaw), ['D2_SHARED_V2_DESCRIPTION_EMPTY', 'D2_SHARED_V2_NAVIGATE_SETS', 'D2_SHARED_V2_STATE_DUPLICATE', 'D2_SHARED_V2_STATE_NAVIGATE']);
  const productsRenamed = onFixedState(productsRaw, 'listaProdutos', 'produtos');
  const productsFixed: D2SharedLlmResponse = {
    ...productsRenamed,
    states: productsRenamed.states.filter(row => row.id !== 'movimentacoesProduto'),
    functions: productsRenamed.functions.map(row => row.navigate ? { id: row.id, description: row.description, navigate: row.navigate, carries: row.carries } : row),
  };
  assert.deepEqual(gateOf(products, productsFixed), []);
  const productsShared = applyD2SharedLlm(products, productsFixed);
  assert.deepEqual(productsShared.functions.abrirMovimentacoes, { description: liveProducts.functions.abrirMovimentacoes.description, navigate: 'movimentacoes', carries: { produtoId: 'produtoSelecionado.id' } });
  assert.equal(productsShared.states.produtoSelecionado.source, 'entry.params.produtoId');
  assert.equal(productsShared.entry.params.produtoId.effect.startsWith('select:'), true);
  // Live 5: filter/loadMore wrote a second list state fed by load<Key>, splitting the list load opened.
  const live5 = asResponse(read('live5Produtos.defs.ts'));
  assert.deepEqual(codes(products, live5), ['D2_SHARED_V2_LIST_STATE']);
  // filter/loadMore now keep the fixed list state, so only the extra state is refused.
  assert.equal(gateOf(products, live5).filter(item => item.code === 'D2_SHARED_V2_LIST_STATE').length, 1);
  const live5Fixed: D2SharedLlmResponse = {
    ...live5,
    states: live5.states.filter(row => row.id !== 'listaProdutos'),
    functions: live5.functions.map(row => row.calls === 'loadProdutos' ? { ...row, sets: 'produtos' } : row.updates ? { ...row, updates: row.updates.filter(item => item !== 'listaProdutos') } : row),
  };
  assert.deepEqual(gateOf(products, live5Fixed), []);
  assert.equal(buildD2SharedPrompt(products).humanPrompt.includes('"loadProdutos.produtos"'), false);
  const carry = (carries: Record<string, string>) => codes(products, { ...productsFixed, functions: productsFixed.functions.map(row => row.navigate ? { ...row, carries } : row) });
  assert.deepEqual(carry({ produtoId: 'produtos.id' }), ['D2_SHARED_V2_CARRIES_TYPE']);
  assert.deepEqual(carry({ produtoId: 'filtroBuscaProdutos.id' }), ['D2_SHARED_V2_CARRIES_TYPE']);
  assert.deepEqual(carry({ outroId: 'produtoSelecionado.id' }), ['D2_SHARED_V2_CARRIES_TYPE']);
  assert.deepEqual(carry({ produtoId: 'produtoSelecionado.campoAusente' }), ['D2_SHARED_V2_CARRIES_TYPE']);
});

void test('a selection without calls takes the entity of the select targets; an unknown one refuses its carry', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const data = contextFrom(pack, 'produtos', moduleName);
  const need = data.input.needsPages.find(item => item.pageId === data.input.pageId)!;
  const gate = (definition: D2SharedV2Definition, draft = data.drafts.desktop) => gateD2SharedV2(definition, {
    page11: data.page11.desktop, draft, needs: need, menu: data.input.menu, derived: data.derived,
  });
  const navigateId = Object.values(data.page11.desktop.organisms).flatMap(item => item.intents).find(item => item.kind === 'navigate')!.id;
  const withKey = (key: string) => answer(data, { functions: answer(data).functions.map(row => row.id === navigateId ? { ...row, carries: { [key]: 'selected.id' } } : row) });
  const selectedEntity = Object.values(data.drafts.desktop.organisms).map(row => row.selects).filter(Boolean).map(target => data.drafts.desktop.organisms[target].reads[0].split('.')[0])[0];
  const idKey = `${selectedEntity[0].toLowerCase()}${selectedEntity.slice(1)}Id`;
  assert.deepEqual(gate(applyD2SharedLlm(data, withKey(idKey))), []);
  const other = Object.keys(data.input.entities).find(id => id !== selectedEntity)!;
  const wrong = gate(applyD2SharedLlm(data, withKey(`${other[0].toLowerCase()}${other.slice(1)}Id`)));
  assert.deepEqual(wrong.map(item => item.code), ['D2_SHARED_V2_CARRIES_TYPE']);

  // Two select targets of different entities: the selection has no single entity.
  const twoTargets = structuredClone(data.drafts.desktop);
  twoTargets.organisms.otherPicker = { reads: [`${other}.id`], edits: [], selects: 'otherTarget', submits: [] };
  twoTargets.organisms.otherTarget = { reads: [`${other}.id`], edits: [], selects: '', submits: [] };
  const definition = applyD2SharedLlm(data, withKey(idKey));
  const ambiguous = gate(definition, twoTargets).filter(item => item.code === 'D2_SHARED_V2_CARRIES_TYPE');
  const selectParam = Object.entries(definition.entry.params).find(([, param]) => param.effect.startsWith('select:'))![0];
  assert.equal(ambiguous.length, 1);
  assert.match(ambiguous[0].message, new RegExp(`Source selected from entry\\.params\\.${selectParam}\\.`, 'u'));
  const noSelect = structuredClone(definition);
  for (const [name, param] of Object.entries(noSelect.entry.params)) if (param.effect.startsWith('select:')) delete noSelect.entry.params[name];
  const dropped = gate(noSelect, twoTargets).filter(item => item.code === 'D2_SHARED_V2_CARRIES_TYPE');
  assert.equal(dropped.length, 1);
  assert.match(dropped[0].message, new RegExp(`Drop the carry ${idKey}\\.`, 'u'));
  // Without a carry, a state of unknown entity stays accepted.
  const noCarry = structuredClone(definition);
  delete noCarry.functions[navigateId].carries;
  assert.equal(gate(noCarry, twoTargets).some(item => item.code.startsWith('D2_SHARED_V2_CARRIES')), false);
});

void test('d2_64: a refused page does not stop its siblings; the stage fails once, then only it is redone', async () => {
  const identity = { project: 102047, module: 'mod' };
  const pages = ['pageA', 'pageB', 'pageC'];
  const accepted = new Set<string>();
  const refusals = new Map<string, D2SharedRefusal>();
  const port = { pageIds: async () => pages, reusable: async (pageId: string) => accepted.has(pageId), refusal: async (pageId: string) => refusals.get(pageId) ?? null };

  // Task one: B is refused while A and C are still in flight; the stage waits for them.
  refusals.set('pageB', d2SharedRefusal(identity, 'pageB', 'task1', 'D2_SHARED_REPAIR_LIMIT: D2_SHARED_V2_FUNCTION_DUPLICATE: dup'));
  assert.deepEqual(await settleD2Shared('task1', port), { state: 'pending', pending: ['pageA', 'pageC'] });
  accepted.add('pageA');
  accepted.add('pageC');
  const once = await settleD2Shared('task1', port);
  assert.equal(once.state, 'refused');
  const message = d2SharedRefusedMessage(once.state === 'refused' ? once.refusals : []);
  assert.match(message, /^D2_SHARED_PAGES_REFUSED: pageB: D2_SHARED_REPAIR_LIMIT: D2_SHARED_V2_FUNCTION_DUPLICATE/u);
  assert.equal(/pageA|pageC/u.test(message), false);

  // A refusal is never a receipt.
  assert.equal(await reusableD2Shared(identity, 'pageB', {
    readReceipt: async () => refusals.get('pageB') as never, context: async () => { throw new Error('not reached'); }, readShared: async () => '',
  }), false);

  // Task two: only B is dispatched (0 LLM for A and C); its old refusal does not end the stage early.
  const pending = pages.filter(pageId => !accepted.has(pageId));
  assert.deepEqual(sharedWorkerSteps(identity, pending).map(step => JSON.parse(step.prompt as string).pageId), ['pageB']);
  assert.deepEqual(await settleD2Shared('task2', port), { state: 'pending', pending: ['pageB'] });
  accepted.add('pageB');
  assert.deepEqual(await settleD2Shared('task2', port), { state: 'ready', pageIds: pages });

  // Two refusals with different codes: one message cites both.
  accepted.clear();
  accepted.add('pageA');
  refusals.set('pageB', d2SharedRefusal(identity, 'pageB', 'task3', 'D2_SHARED_REPAIR_LIMIT: D2_SHARED_V2_RULE_COMMAND: rules'));
  refusals.set('pageC', d2SharedRefusal(identity, 'pageC', 'task3', 'D2_REQUESTS_SUBMIT_UNBOUND: no form'));
  const both = await settleD2Shared('task3', port);
  assert.equal(both.state, 'refused');
  const bothMessage = d2SharedRefusedMessage(both.state === 'refused' ? both.refusals : []);
  assert.match(bothMessage, /pageB: D2_SHARED_REPAIR_LIMIT: D2_SHARED_V2_RULE_COMMAND/u);
  assert.match(bothMessage, /pageC: D2_REQUESTS_SUBMIT_UNBOUND/u);
});

void test('d2_65: snake_case pages give camelCase keys and the prompt names entity and list of each key', () => {
  // Renamed copy of a real module whose page ids are snake_case (helpers/fixtures/clinic).
  const pack = loadPack('clinic');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'clinic/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  for (const pageId of ['consultas_recepcao', 'profissionais_recepcao', 'meu_cadastro_profissional']) {
    const data = contextFrom(pack, pageId, moduleName);
    for (const request of data.derived.requests) {
      assert.match(request.id, /^[a-z][A-Za-z0-9]*$/u, request.id);
      for (const key of request.returns) assert.match(key, /^[a-z][A-Za-z0-9]*$/u, `${pageId} ${key}`);
    }
    const human = JSON.parse(buildD2SharedPrompt(data).humanPrompt) as {
      requests: Array<{ id: string; returns: string[]; returnEntities: Record<string, string>; lists: Array<{ key: string; filter: string; loadMore: string; organismId: string }> }>;
      validSources: string[]; fixedStates: Array<{ id: string; source: string }>;
    };
    for (const request of human.requests) {
      for (const key of request.returns) assert.ok(request.returnEntities[key], `${pageId} ${request.id}.${key} names its entity`);
    }
    assert.equal(human.validSources.some(token => token.includes('_')), false, human.validSources.join(','));
    const load = human.requests.find(item => item.id === 'load');
    for (const list of load?.lists ?? []) {
      assert.ok(load!.returnEntities[list.key], `${pageId} list ${list.key} names its entity`);
      assert.ok(human.fixedStates.some(state => state.id === list.key && state.source === `load.${list.key}`));
    }
  }
  const lists = contextFrom(pack, 'consultas_recepcao', moduleName).derived.requests.find(item => item.id === 'load')?.lists ?? [];
  assert.ok(lists.some(list => list.key === 'consultasRecepcao'), JSON.stringify(lists));
});

void test('d2_67: request ids, targets, steps, organisms, return keys and rules are enums of the shared schema', () => {
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const data = contextFrom(pack, 'produtos', moduleName);
  const schema = sharedSchemaFor(data) as { properties: Record<string, { items: { properties: Record<string, { enum?: string[]; items?: { enum?: string[] } }> } }> };
  const fields = (name: string) => schema.properties[name].items.properties;
  assert.deepEqual(fields('functions').calls.enum, data.derived.requests.map(item => item.id));
  assert.ok(fields('functions').navigate.enum?.includes('movimentacoes'));
  assert.deepEqual(fields('journeys').organisms.items?.enum, Object.keys(data.page11.desktop.organisms));
  assert.deepEqual(fields('commandReturns').requestId.enum, data.derived.requests.filter(item => item.kind === 'cmd').map(item => item.id));
  assert.deepEqual(fields('requestRules').rules.items?.enum, [...new Set(Object.values(data.derived.rules).flat())]);
  // No ambiguous form: the form choice stays free and unused.
  assert.equal(fields('formChoices').submit.enum, undefined);
  // The enums add no lint finding: the only one is the carries map of the base schema.
  assert.deepEqual(lintToolSchema(JSON.stringify(schema)), ['/properties/functions/items/properties/carries: additionalProperties must be false']);
  // An answer inside the enums still passes the gate.
  const need = data.input.needsPages.find(item => item.pageId === data.input.pageId)!;
  assert.deepEqual(gateD2SharedV2(applyD2SharedLlm(data, answer(data)), { page11: data.page11.desktop, draft: data.drafts.desktop, needs: need, menu: data.input.menu, derived: data.derived }), []);
});

void test('d2_70: the derived shape passes its own gate on every fixture page; a hub page has no load', () => {
  const renamedPack = renameDeep(loadPack('controleEstoque')) as ReturnType<typeof loadPack>;
  const packs: Array<[ReturnType<typeof loadPack>, string]> = [
    [loadPack('controleEstoque'), (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName],
    [renamedPack, 'alphaWarehouse'],
    [loadPack('clinic'), (JSON.parse(readFileSync(join(fixtureRoot, 'clinic/menu.json'), 'utf8')) as { moduleName: string }).moduleName],
  ];
  let pages = 0;
  for (const [pack, moduleName] of packs) {
    for (const sibling of pack.siblings) {
      // buildD2SharedContext already refuses a failing shape; the explicit call names the page if it ever does.
      assert.deepEqual(d2SharedShapeIssues(contextFrom(pack, sibling.pageId, moduleName)), [], `${moduleName}/${sibling.pageId}`);
      pages += 1;
    }
  }
  assert.equal(pages, 10);

  // Synthetic hub: no read, no write, one navigation.
  const pack = loadPack('controleEstoque');
  const moduleName = (JSON.parse(readFileSync(join(fixtureRoot, 'controleEstoque/menu.json'), 'utf8')) as { moduleName: string }).moduleName;
  const base = contextFrom(pack, 'produtos', moduleName);
  const hub = structuredClone(base.page11.desktop);
  const target = Object.values(base.page11.desktop.organisms).flatMap(item => item.intents).find(item => item.kind === 'navigate')!.to!;
  hub.sections = [{ id: 'entry', priority: 'primary', purpose: 'entry', organisms: ['shortcuts'] }];
  hub.organisms = { shortcuts: { kind: 'actions', text: 'shortcuts', intents: [{ id: 'openTarget', kind: 'navigate', to: target }] } };
  hub.molecules = {};
  const hubDraft: D2Page11Needs = { organisms: { shortcuts: { reads: [], edits: [], selects: '', submits: [] } } };
  const hubData = buildD2SharedContext({
    ...base.input, desktop: hub, mobile: hub, draftDesktop: hubDraft, draftMobile: hubDraft,
    siblings: base.input.siblings.map(item => item.pageId === base.input.pageId ? { ...item, desktop: hub, mobile: hub, draftDesktop: hubDraft, draftMobile: hubDraft } : item),
  }, { ...base, page11: { desktop: hub, mobile: hub }, drafts: { desktop: hubDraft, mobile: hubDraft } });
  assert.deepEqual(hubData.derived.requests, []);
  const hubShared = sharedFromDerived(hubData.derived);
  assert.equal('load' in hubShared.functions, false);
  assert.deepEqual(d2SharedShapeIssues(hubData), []);
  // An answer with only descriptions and the navigation is approved.
  const approved = applyD2SharedLlm(hubData, { states: [], functions: [{ id: 'openTarget', navigate: target, description: 'Open the target page.' }], journeys: [], commandReturns: [], requestRules: [] });
  const hubNeed = hubData.input.needsPages.find(item => item.pageId === hubData.input.pageId)!;
  const codes = gateD2SharedV2(approved, { page11: hub, draft: hubDraft, needs: hubNeed, menu: hubData.input.menu, derived: hubData.derived }).map(item => item.code);
  assert.equal(codes.some(code => code === 'D2_SHARED_V2_FUNCTION_CALL' || code === 'D2_SHARED_V2_FUNCTION_MISSING'), false, codes.join(','));
});

void test('agent sources do not name the fixture module', () => {
  const root = join(here, '../..');
  const hits: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (name === 'fixtures' || name === 'README.md' || name === 'CHANGELOG.md' || name.endsWith('.test.ts')) continue;
      if (statSync(path).isDirectory()) { walk(path); continue; }
      if (!name.endsWith('.ts') && !name.endsWith('.md')) continue;
      const text = readFileSync(path, 'utf8');
      if (/controleEstoque|produto|movimenta|estoque/iu.test(text)) hits.push(path);
    }
  };
  walk(root);
  assert.deepEqual(hits, []);
});
