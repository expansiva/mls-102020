/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/steps.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { createAgent } from '/_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CHECK_PLAN,
  NR_CLOSE_PLAN,
  NR_DEFS_AGENT,
  NR_DEFS_PLAN,
  NR_DEFS_SCOPE,
  NR_HELP,
  NR_MARKS_DIFFER,
  NR_MATERIALIZE_AGENT,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  buildRegenerateSteps,
  changeEffortInfo,
  closeNotice,
  commandLines,
  stepsPhaseNote,
  currentProjectNumber,
  deleteGeneratedFiles,
  generatedFilesOf,
  markedPageIds,
  marksDifferMessage,
  materializerOutcome,
  NR_NOTHING_TO_APPLY,
  parseNrInvocation,
  poolEffortInfo,
  releasePages,
  reviewDefsRun,
  runInfo,
  snapshotInfo,
  statusIntents,
  statusText,
  type NrListedFile,
  type NrRunPhaseLine,
} from '/_102020_/l2/agentNewReleaseL2/helpers/steps.js';

function fixture(name: string): { masters: Array<{ project: string }> } {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

test('each status exit returns the message and a terminal result step with the motive', () => {
  const cases: Array<{ message: string; kind: 'done' | 'refused' | 'failed' }> = [
    { message: NR_HELP, kind: 'done' },
    { message: 'The current project is unavailable.', kind: 'refused' },
    { message: 'changeEffort.json is missing at l2/alpha/pool/l4/changeEffort.json', kind: 'refused' },
    { message: 'changeEffort.json at l2/alpha/pool/l4/changeEffort.json is not valid JSON', kind: 'refused' },
    { message: 'changeEffort rejected by gate: schema:perItem', kind: 'refused' },
    { message: 'not in this release step: item remove', kind: 'refused' },
    { message: NR_NOTHING_TO_APPLY, kind: 'done' },
    { message: `${NR_MARKS_DIFFER}: marked [beta]; planned [beta, delta]`, kind: 'refused' },
    { message: 'pool effort unreadable', kind: 'failed' },
  ];
  for (const item of cases) {
    const text = statusText(item.message, item.kind);
    const intents = statusIntents(NR_AGENT_NAME, 'thread-1', '@@agentNewReleaseL2 alpha', item.message, item.kind);
    const message = intents.find(intent => intent.type === 'add-message-ai');
    const step = intents.find(intent => intent.type === 'add-step');
    assert.equal(intents.length, 2);
    assert.equal(message?.type, 'add-message-ai');
    if (message?.type !== 'add-message-ai' || step?.type !== 'add-step' || step.step.type !== 'result') {
      assert.fail('status exit is missing the message or the result step');
    }
    assert.equal(message.request.inputAI[0]?.content, text);
    assert.equal(message.request.taskTitle, NR_AGENT_NAME);
    assert.equal(step.step.status, 'completed');
    assert.equal(step.step.planning?.executionMode, 'manual_later');
    assert.equal(step.step.result, text);
    assert.ok(text.startsWith(`${item.kind}: `));
    assert.ok(step.step.stepTitle.startsWith(`${item.kind}: `));
    assert.ok(step.step.stepTitle.length <= 72);
    assert.ok(text.startsWith(step.step.stepTitle.replace(/\.\.\.$/u, '')));
  }
});

test('invocation accepts one module and refuses a missing or extra argument', () => {
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2 alpha'), { ok: true, module: 'alpha' });
  assert.deepEqual(parseNrInvocation('alpha'), { ok: true, module: 'alpha' });
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2'), { ok: false, help: NR_HELP });
  assert.deepEqual(parseNrInvocation(''), { ok: false, help: NR_HELP });
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2 alpha extra'), { ok: false, help: NR_HELP });
});

function listed(folder: string, shortName: string, extension: string, project = 102047, status = 'changed'): NrListedFile {
  return { project, level: 2, folder, shortName, extension, status };
}

test('the materializer step is the whole module, and close depends on it and lists the deleted files', () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const effort = fixture('r1');
    assert.equal(currentProjectNumber(), 102047);
    const plan = planNewReleaseL2(effort, '102020');
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const project = currentProjectNumber();
    const deleted = ['l2/tarefas/web/shared/minhas_tarefas.ts'];
    const [materialize, close] = buildApplySteps(project, 'tarefas', deleted);
    assert.equal(materialize.agentName, NR_MATERIALIZE_AGENT);
    assert.equal(materialize.planning?.planId, NR_MATERIALIZE_PLAN);
    assert.deepEqual(JSON.parse(materialize.prompt || ''), {
      project,
      module: 'tarefas',
      scope: {},
    });
    assert.equal(Object.hasOwn(JSON.parse(materialize.prompt || ''), 'pages'), false);
    assert.equal(close.agentName, NR_AGENT_NAME);
    assert.equal(close.planning?.planId, NR_CLOSE_PLAN);
    assert.deepEqual(close.planning?.dependsOn, [NR_MATERIALIZE_PLAN]);
    assert.equal(closeNotice('pages written', deleted), 'pages written; deleted: l2/tarefas/web/shared/minhas_tarefas.ts');
    const command = '@@agentAddLanguage [{"languages":[{"code":"pt","name":"pt"}]}]';
    assert.equal(
      closeNotice('pages written', deleted, [command], true),
      `pages written; deleted: l2/tarefas/web/shared/minhas_tarefas.ts\n${command}`,
    );
    assert.equal(closeNotice('pages written', deleted, [command], false), 'pages written; deleted: l2/tarefas/web/shared/minhas_tarefas.ts');
    assert.equal(stepsPhaseNote(2, [command]), `2 steps; ${command}`);
    assert.deepEqual(commandLines(JSON.stringify({ commands: [command] })), [command]);
    assert.deepEqual(plan.pages, ['minhas_tarefas']);
  } finally {
    mls.actualProject = previous;
  }
});

test('R1 deletes only the generated files of minhas_tarefas and never a defs file', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const plan = planNewReleaseL2(fixture('r1'), '102020');
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    const web = 'tarefas/web';
    const files: NrListedFile[] = [
      listed(`${web}/shared`, 'minhas_tarefas', '.ts'),
      listed(`${web}/shared`, 'minhas_tarefasDts', '.txt'),
      listed(`${web}/shared`, 'minhas_tarefas', '.defs.ts'),
      listed(`${web}/desktop/page11`, 'minhas_tarefas', '.ts'),
      listed(`${web}/desktop/page11`, 'minhas_tarefas', '.defs.ts'),
      listed(`${web}/mobile/page11`, 'minhas_tarefas', '.ts'),
      listed(`${web}/mobile/page11`, 'minhas_tarefas', '.defs.ts'),
      listed(`${web}/shared`, 'outra', '.ts'),
      listed(`${web}/desktop/page11`, 'outra', '.ts'),
      listed(`${web}/desktop/page11`, 'minhas_tarefas', '.ts', 102099),
      listed(`${web}/shared`, 'minhas_tarefas', '.ts', 102047, 'deleted'),
    ];
    const removed: string[] = [];
    const result = await deleteGeneratedFiles('tarefas', releasePages(plan.pages, plan.materializeOnly), files, async (file) => {
      removed.push(`${file.folder}/${file.shortName}${file.extension}`);
    }, plan.sharedPages);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(removed, [
      `${web}/desktop/page11/minhas_tarefas.ts`,
      `${web}/mobile/page11/minhas_tarefas.ts`,
    ]);
    assert.deepEqual(result.paths, removed.map(path => `l2/${path}`));
    assert.equal(removed.some(path => path.endsWith('.defs.ts')), false);
    const [materialize] = buildApplySteps(102047, 'tarefas', result.paths);
    assert.equal('pages' in JSON.parse(materialize.prompt || '').scope, false);
  } finally {
    mls.actualProject = previous;
  }
});

test('M3 tarefas_equipe materialize without shared deletes both page11 files and keeps shared', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const effort = fixture('r1') as {
      perItem: Array<{ answers: Array<{ master: { project: string }; materialize: Array<{ kind: string; id: string; path: string }> }> }>;
      merged: unknown;
    };
    const answer = effort.perItem[0].answers.find(row => row.master.project === '102020');
    if (!answer) throw new Error('missing master answer');
    answer.materialize = [
      { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
    ];
    effort.merged = mergeChangeEffort(effort.perItem as never);
    const plan = planNewReleaseL2(effort, '102020');
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.sharedPages, []);
    const web = 'tarefas/web';
    const files: NrListedFile[] = [
      listed(`${web}/shared`, 'tarefas_equipe', '.ts'),
      listed(`${web}/shared`, 'tarefas_equipeDts', '.txt'),
      listed(`${web}/desktop/page11`, 'tarefas_equipe', '.ts'),
      listed(`${web}/mobile/page11`, 'tarefas_equipe', '.ts'),
    ];
    const removed: string[] = [];
    const result = await deleteGeneratedFiles('tarefas', releasePages(plan.pages, plan.materializeOnly), files, async (file) => {
      removed.push(`${file.folder}/${file.shortName}${file.extension}`);
    }, plan.sharedPages);
    assert.equal(result.ok, true);
    assert.deepEqual(removed, [
      `${web}/desktop/page11/tarefas_equipe.ts`,
      `${web}/mobile/page11/tarefas_equipe.ts`,
    ]);
  } finally {
    mls.actualProject = previous;
  }
});

test('shared named in regenerateDefs deletes the two page11 files and the shared pair', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const effort = fixture('r3') as {
      perItem: Array<{ answers: Array<{ regenerateDefs: Array<{ kind: string; id: string; path: string }> }> }>;
      merged: unknown;
      status: string;
    };
    effort.perItem[0].answers[0].regenerateDefs = [
      { kind: 'shared', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
      { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
    ];
    effort.merged = mergeChangeEffort(effort.perItem as never);
    effort.status = 'simple';
    const plan = planNewReleaseL2(effort, '102020');
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.sharedPages, ['tarefas_equipe']);
    const web = 'tarefas/web';
    const files: NrListedFile[] = [
      listed(`${web}/shared`, 'tarefas_equipe', '.ts'),
      listed(`${web}/shared`, 'tarefas_equipeDts', '.txt'),
      listed(`${web}/desktop/page11`, 'tarefas_equipe', '.ts'),
      listed(`${web}/mobile/page11`, 'tarefas_equipe', '.ts'),
      listed(`${web}/desktop/page11`, 'tarefas_equipe', '.defs.ts'),
    ];
    const removed: string[] = [];
    const result = await deleteGeneratedFiles('tarefas', plan.pages, files, async (file) => {
      removed.push(`${file.folder}/${file.shortName}${file.extension}`);
    }, plan.sharedPages);
    assert.equal(result.ok, true);
    assert.deepEqual(removed, [
      `${web}/desktop/page11/tarefas_equipe.ts`,
      `${web}/mobile/page11/tarefas_equipe.ts`,
      `${web}/shared/tarefas_equipe.ts`,
      `${web}/shared/tarefas_equipeDts.txt`,
    ]);
  } finally {
    mls.actualProject = previous;
  }
});

test('page plus contract in regenerateDefs deletes the shared pair', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const effort = fixture('r3') as {
      perItem: Array<{ answers: Array<{ regenerateDefs: Array<{ kind: string; id: string; path: string }> }> }>;
      merged: unknown;
      status: string;
    };
    effort.perItem[0].answers[0].regenerateDefs = [
      { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
      { kind: 'contract', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
    ];
    effort.merged = mergeChangeEffort(effort.perItem as never);
    effort.status = 'simple';
    const plan = planNewReleaseL2(effort, '102020');
    assert.equal(plan.ok, true);
    if (!plan.ok) return;
    assert.deepEqual(plan.sharedPages, ['tarefas_equipe']);
    const web = 'tarefas/web';
    const files: NrListedFile[] = [
      listed(`${web}/shared`, 'tarefas_equipe', '.ts'),
      listed(`${web}/shared`, 'tarefas_equipeDts', '.txt'),
      listed(`${web}/desktop/page11`, 'tarefas_equipe', '.ts'),
      listed(`${web}/mobile/page11`, 'tarefas_equipe', '.ts'),
    ];
    const removed: string[] = [];
    const result = await deleteGeneratedFiles('tarefas', plan.pages, files, async (file) => {
      removed.push(`${file.folder}/${file.shortName}${file.extension}`);
    }, plan.sharedPages);
    assert.equal(result.ok, true);
    assert.deepEqual(removed, [
      `${web}/desktop/page11/tarefas_equipe.ts`,
      `${web}/mobile/page11/tarefas_equipe.ts`,
      `${web}/shared/tarefas_equipe.ts`,
      `${web}/shared/tarefas_equipeDts.txt`,
    ]);
  } finally {
    mls.actualProject = previous;
  }
});

test('a delete failure names the path and does not build the materializer step', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    const files = [listed('tarefas/web/desktop/page11', 'minhas_tarefas', '.ts')];
    const result = await deleteGeneratedFiles('tarefas', ['minhas_tarefas'], files, async () => {
      throw new Error('disk full');
    }, []);
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /l2\/tarefas\/web\/desktop\/page11\/minhas_tarefas\.ts/u);
    assert.equal(generatedFilesOf('tarefas', 'minhas_tarefas', files, []).length, 1);
  } finally {
    mls.actualProject = previous;
  }
});

test('regenerate adds the defs generator with scope all, and the check waits on it', () => {
  const project = currentProjectNumber();
  const [defs, check] = buildRegenerateSteps(project, 'alpha', ['beta']);
  assert.equal(defs.agentName, NR_DEFS_AGENT);
  assert.equal(defs.planning?.planId, NR_DEFS_PLAN);
  assert.deepEqual(JSON.parse(defs.prompt || ''), { project, module: 'alpha', scope: NR_DEFS_SCOPE, bffPages: ['beta'] });
  assert.equal(check.agentName, NR_AGENT_NAME);
  assert.equal(check.planning?.planId, NR_CHECK_PLAN);
  assert.deepEqual(check.planning?.dependsOn, [NR_DEFS_PLAN]);
});

test('a clean regenerate materializes the whole module and the close step keeps the deleted paths', () => {
  const project = currentProjectNumber();
  const [materialize, close] = buildApplySteps(project, 'alpha', ['l2/alpha/web/shared/beta.ts']);
  assert.deepEqual(JSON.parse(materialize.prompt || ''), {
    project,
    module: 'alpha',
    scope: {},
  });
  assert.deepEqual(JSON.parse(close.prompt || '').deleted, ['l2/alpha/web/shared/beta.ts']);
  assert.deepEqual(releasePages(['beta'], ['gamma']), ['beta', 'gamma']);
});

test('pool marks must be the same set as the planned pages', () => {
  const effort = { screens: [
    { pageId: 'beta', status: 'toUpdate' },
    { pageId: 'gamma', status: 'done' },
    { pageId: 'delta', status: 'toCreate' },
  ] };
  assert.deepEqual(markedPageIds(effort), ['beta', 'delta']);
  assert.equal(marksDifferMessage(['delta', 'beta'], ['beta', 'delta']), null);
  const message = marksDifferMessage(['beta'], ['beta', 'delta']);
  assert.equal(message, `${NR_MARKS_DIFFER}: marked [beta]; planned [beta, delta]`);
});

test('an outside path fails the check and does not add the materializer', () => {
  const outside = reviewDefsRun(
    { status: 'completed', message: 'defs written' },
    { created: [], changed: ['l2/alpha/web/shared/other.defs.ts'], deleted: [], outside: ['l2/alpha/web/shared/other.defs.ts'] },
  );
  assert.equal(outside.addMaterialize, false);
  assert.equal(outside.status, 'failed');
  assert.match(outside.message, /outside: l2\/alpha\/web\/shared\/other\.defs\.ts/u);
  const failedDefs = reviewDefsRun({ status: 'failed', message: 'generator stopped' }, {
    created: [], changed: [], deleted: [], outside: [],
  });
  assert.deepEqual(failedDefs, { status: 'failed', message: 'generator stopped', addMaterialize: false });
  const clean = reviewDefsRun({ status: 'completed', message: 'defs written' }, {
    created: [], changed: [], deleted: [], outside: [],
  });
  assert.equal(clean.addMaterialize, true);
});

test('close copies the materializer status and its message', () => {
  const completed = {
    type: 'agent',
    status: 'completed',
    interaction: { input: [], cost: 0, trace: ['pages written'], payload: null },
    nextSteps: [],
  } as mls.msg.AIAgentStep;
  assert.deepEqual(materializerOutcome(completed), { status: 'completed', message: 'pages written' });
  const failed = {
    type: 'result',
    status: 'failed',
    interaction: null,
    nextSteps: [],
    result: 'page id missing',
  } as mls.msg.AIResultStep;
  assert.deepEqual(materializerOutcome(failed), { status: 'failed', message: 'agentMaterializeL2 failed' });
  const nested = {
    ...completed,
    status: 'failed' as const,
    interaction: null,
    nextSteps: [{ type: 'result', status: 'failed', interaction: null, nextSteps: [], stepId: 0, stepTitle: 'Done', result: 'page id missing' } as mls.msg.AIResultStep],
  };
  assert.deepEqual(materializerOutcome(nested), { status: 'failed', message: 'page id missing' });
});

function r4Effort(pageId: string): unknown {
  const effort = JSON.parse(readFileSync(new URL('./fixtures/r4.json', import.meta.url), 'utf8')) as {
    perItem: Array<{ answers: Array<{ materialize: Array<{ id: string }> }> }>;
    merged: { materialize: Array<{ id: string }> };
  };
  effort.perItem[0].answers[0].materialize[0].id = pageId;
  effort.merged.materialize[0].id = pageId;
  return effort;
}

function fileKey(info: { project: number; level: number; folder: string; shortName: string; extension: string }): string {
  return [info.project, info.level, info.folder, info.shortName, info.extension].join('|');
}

function plantJson(info: { project: number; level: number; folder: string; shortName: string; extension: string }, content: string): void {
  const file = {
    ...info,
    status: 'changed',
    content,
    getValueInfo: async () => ({ content: file.content }),
    getContent: async () => file.content,
  };
  mls.stor.files[fileKey(info)] = file as unknown as mls.stor.IFileInfo;
}

function installRunStor(project: number): void {
  mls.actualProject = project;
  mls.stor.files = {};
  mls.stor.getKeyToFile = fileKey as typeof mls.stor.getKeyToFile;
  mls.stor.localStor = {
    setContent: async (file: { content?: string }, payload: { content?: string }) => {
      file.content = payload.content;
    },
  } as typeof mls.stor.localStor;
}

function resultOf(intents: mls.msg.AgentIntent[]): string {
  const step = intents.find(intent => intent.type === 'add-step');
  if (step?.type !== 'add-step' || step.step.type !== 'result') assert.fail('missing result step');
  assert.equal(step.step.status, 'completed');
  assert.equal(step.step.planning?.executionMode, 'manual_later');
  return String(step.step.result || '');
}

test('the R4 regenerate path refuses when the pool marks are a wider set', async () => {
  const previous = mls.actualProject;
  const project = 102047;
  installRunStor(project);
  const answer = r4Effort('tarefas_equipe');
  const marked = ['inicio', 'listas_tarefas', 'minhas_tarefas', 'painel_tarefas', 'participantes', 'tarefas_equipe'];
  plantJson(changeEffortInfo('tarefas'), JSON.stringify(answer));
  plantJson(poolEffortInfo('tarefas'), JSON.stringify({
    screens: marked.map(pageId => ({ pageId, status: 'toCreate' })),
  }));
  plantJson(runInfo('tarefas'), '{}\n');
  try {
    const agent = createAgent();
    const intents = await agent.beforePromptImplicit(agent, {
      message: { threadId: 'thread-r4', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    } as mls.msg.ExecutionContext, '@@agentNewReleaseL2 tarefas');
    const expected = `${NR_MARKS_DIFFER}: marked [${marked.join(', ')}]; planned [tarefas_equipe]`;
    assert.equal(resultOf(intents), `refused: ${expected}`);
    const log = JSON.parse((mls.stor.files[fileKey(runInfo('tarefas'))] as { content?: string }).content || '') as { phases: NrRunPhaseLine[] };
    assert.deepEqual(log.phases.map(line => line.phase), ['effort-read', 'plan', 'marks']);
    assert.equal(log.phases[2].status, 'refused');
    assert.equal(log.phases[2].note, expected);
  } finally {
    mls.actualProject = previous;
  }
});

test('a rejected pool read still closes with the error on the result step', async () => {
  const previous = mls.actualProject;
  installRunStor(102047);
  plantJson(changeEffortInfo('tarefas'), JSON.stringify(r4Effort('tarefas_equipe')));
  const pool = poolEffortInfo('tarefas');
  mls.stor.files[fileKey(pool)] = {
    ...pool,
    status: 'changed',
    getValueInfo: async () => {
      throw new Error('pool effort unreadable');
    },
    getContent: async () => '',
  } as unknown as mls.stor.IFileInfo;
  plantJson(runInfo('tarefas'), '{}\n');
  try {
    const agent = createAgent();
    const intents = await agent.beforePromptImplicit(agent, {
      message: { threadId: 'thread-x', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    } as mls.msg.ExecutionContext, '@@agentNewReleaseL2 tarefas');
    assert.equal(resultOf(intents), 'failed: pool effort unreadable');
    const log = JSON.parse((mls.stor.files[fileKey(runInfo('tarefas'))] as { content?: string }).content || '') as { phases: NrRunPhaseLine[] };
    assert.equal(log.phases.at(-1)?.phase, 'marks');
    assert.equal(log.phases.at(-1)?.status, 'failed');
    assert.equal(log.phases.at(-1)?.note, 'pool effort unreadable');
  } finally {
    mls.actualProject = previous;
  }
});

test('a second run on the same module keeps only that run in run.json', async () => {
  const previous = mls.actualProject;
  const project = 102047;
  installRunStor(project);
  const answer = r4Effort('tarefas_equipe');
  const marked = ['inicio', 'tarefas_equipe'];
  plantJson(changeEffortInfo('tarefas'), JSON.stringify(answer));
  plantJson(poolEffortInfo('tarefas'), JSON.stringify({
    screens: marked.map(pageId => ({ pageId, status: 'toCreate' })),
  }));
  plantJson(runInfo('tarefas'), JSON.stringify({
    phases: [
      { phase: 'effort-read', status: 'ok', note: 'stale' },
      { phase: 'plan', status: 'ok', note: 'stale' },
      { phase: 'marks', status: 'refused', note: 'stale' },
    ],
  }));
  const context = {
    message: { threadId: 'thread-r2', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
  } as mls.msg.ExecutionContext;
  try {
    const agent = createAgent();
    await agent.beforePromptImplicit(agent, context, '@@agentNewReleaseL2 tarefas');
    const intents = await agent.beforePromptImplicit(agent, context, '@@agentNewReleaseL2 tarefas');
    const expected = `${NR_MARKS_DIFFER}: marked [${marked.join(', ')}]; planned [tarefas_equipe]`;
    assert.equal(resultOf(intents), `refused: ${expected}`);
    const log = JSON.parse((mls.stor.files[fileKey(runInfo('tarefas'))] as { content?: string }).content || '') as { phases: NrRunPhaseLine[] };
    assert.deepEqual(log.phases, [
      { phase: 'effort-read', status: 'ok', note: 'read' },
      { phase: 'plan', status: 'ok', note: 'regenerate tarefas_equipe', bffPages: [], sharedPages: [] },
      { phase: 'marks', status: 'refused', note: expected },
    ]);
  } finally {
    mls.actualProject = previous;
  }
});

const FIELD_COMMAND = '@@agentAddLanguage [{"languages":[{"code":"pt","name":"pt"}],"projectId":102047,"moduleName":"tarefas"}]';

function textFieldEffort(): unknown {
  const effort = fixture('r1') as {
    request: { items: Array<{ changeId: string }> };
    perItem: Array<{ item: string; answers: Array<{ master: { project: string }; item: string; materialize: Array<{ kind: string; id: string; path: string }>; runAgents: Array<{ agent: string; command: string }> }> }>;
    merged: { runAgents: unknown[] };
  };
  const answer = effort.perItem[0].answers.find(row => row.master.project === '102020');
  if (!answer) throw new Error('missing master answer');
  effort.request.items[0].changeId = 'field:prazo';
  effort.perItem[0].item = 'field:prazo';
  for (const row of effort.perItem[0].answers) row.item = 'field:prazo';
  answer.materialize = [
    { kind: 'page', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  answer.runAgents = [{ agent: 'agentAddLanguage', command: FIELD_COMMAND }];
  effort.merged = mergeChangeEffort(effort.perItem as never);
  return effort;
}

test('materialize records the returned command and the close step carries it', async () => {
  const previous = mls.actualProject;
  installRunStor(102047);
  plantJson(changeEffortInfo('tarefas'), JSON.stringify(textFieldEffort()));
  plantJson(runInfo('tarefas'), '{}\n');
  try {
    const agent = createAgent();
    const intents = await agent.beforePromptImplicit(agent, {
      message: { threadId: 'thread-m1', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    } as mls.msg.ExecutionContext, '@@agentNewReleaseL2 tarefas');
    const added = intents.filter(intent => intent.type === 'add-step');
    const close = added.find(intent => intent.step.planning?.planId === NR_CLOSE_PLAN);
    if (close?.type !== 'add-step') assert.fail('missing close step');
    assert.ok(added.every(intent => intent.type === 'add-step' && intent.parentStepId === 1 && intent.messageId === '' && intent.taskId === ''));
    assert.deepEqual(commandLines(close.step.prompt || ''), [FIELD_COMMAND]);
    const log = JSON.parse((mls.stor.files[fileKey(runInfo('tarefas'))] as { content?: string }).content || '') as { phases: NrRunPhaseLine[] };
    assert.equal(log.phases.find(line => line.phase === 'steps')?.note, stepsPhaseNote(2, [FIELD_COMMAND]));
    const planLine = log.phases.find(line => line.phase === 'plan');
    assert.deepEqual(planLine?.bffPages, []);
    assert.deepEqual(planLine?.sharedPages, []);
  } finally {
    mls.actualProject = previous;
  }
});

test('the defs step carries bffPages and the plan phase records both lists', async () => {
  const previous = mls.actualProject;
  installRunStor(102047);
  const effort = fixture('r3') as {
    perItem: Array<{ answers: Array<{ regenerateDefs: Array<{ kind: string; id: string; path: string }> }> }>;
    merged: unknown;
  };
  effort.perItem[0].answers[0].regenerateDefs = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
    { kind: 'shared', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
    { kind: 'page', id: 'minhas_tarefas', path: 'l2/tarefas/web/shared/minhas_tarefas.defs.ts' },
    { kind: 'contract', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
  ];
  effort.merged = mergeChangeEffort(effort.perItem as never);
  plantJson(changeEffortInfo('tarefas'), JSON.stringify(effort));
  plantJson(poolEffortInfo('tarefas'), JSON.stringify({
    screens: [
      { pageId: 'tarefas_equipe', status: 'toUpdate' },
      { pageId: 'minhas_tarefas', status: 'toUpdate' },
    ],
  }));
  plantJson(runInfo('tarefas'), '{}\n');
  plantJson(snapshotInfo('tarefas'), '{}\n');
  try {
    const agent = createAgent();
    const intents = await agent.beforePromptImplicit(agent, {
      message: { threadId: 'thread-bff', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    } as mls.msg.ExecutionContext, '@@agentNewReleaseL2 tarefas');
    const defs = intents.find(intent => intent.type === 'add-step' && intent.step.agentName === NR_DEFS_AGENT);
    if (defs?.type !== 'add-step') assert.fail('missing defs step');
    assert.deepEqual(JSON.parse(defs.step.prompt || '').bffPages, ['minhas_tarefas']);
    const log = JSON.parse((mls.stor.files[fileKey(runInfo('tarefas'))] as { content?: string }).content || '') as { phases: NrRunPhaseLine[] };
    const planLine = log.phases.find(line => line.phase === 'plan');
    assert.deepEqual(planLine?.bffPages, ['minhas_tarefas']);
    assert.deepEqual(planLine?.sharedPages, ['tarefas_equipe', 'minhas_tarefas']);
  } finally {
    mls.actualProject = previous;
  }
});

test('the close text lists the command after a completed materializer and hides it after a failure', async () => {
  const agent = createAgent();
  const deleted = ['l2/tarefas/web/shared/minhas_tarefas.ts'];
  const [, close] = buildApplySteps(102047, 'tarefas', deleted, [FIELD_COMMAND]);
  close.stepId = 2;
  const parent = { stepId: 1 } as mls.msg.AIAgentStep;
  const materialize = {
    type: 'agent',
    stepId: 3,
    status: 'completed',
    interaction: { input: [], cost: 0, trace: ['pages written'], payload: null },
    nextSteps: [],
    planning: { planId: NR_MATERIALIZE_PLAN, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
    agentName: NR_MATERIALIZE_AGENT,
    prompt: '',
    rags: [],
    stepTitle: 'Materialize module',
  } as mls.msg.AIAgentStep;
  const context = {
    message: { threadId: 'thread-close', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    task: { PK: 'task', iaCompressed: { nextSteps: [materialize, close] } },
  } as mls.msg.ExecutionContext;
  if (!agent.beforePromptStep) assert.fail('missing beforePromptStep');
  const done = await agent.beforePromptStep(agent, context, parent, close, 0);
  const doneUpdate = done[0];
  if (doneUpdate?.type !== 'update-status') assert.fail('missing close update');
  assert.equal(doneUpdate.traceMsg, statusText(closeNotice('pages written', deleted, [FIELD_COMMAND], true), 'done'));
  assert.match(doneUpdate.traceMsg || '', new RegExp(`^done: pages written; deleted: ${deleted[0]}\\n`));
  assert.equal(doneUpdate.traceMsg?.split('\n')[1], FIELD_COMMAND);
  materialize.status = 'failed';
  materialize.interaction = null;
  const failed = await agent.beforePromptStep(agent, context, parent, close, 0);
  const failedUpdate = failed[0];
  if (failedUpdate?.type !== 'update-status') assert.fail('missing failed update');
  assert.equal(failedUpdate.status, 'failed');
  assert.equal(failedUpdate.traceMsg?.includes(FIELD_COMMAND), false);
  assert.match(failedUpdate.traceMsg || '', /^failed: /);
});

function terminalStepIds(steps: readonly mls.msg.AIPayload[]): Set<number> {
  const ids = new Set<number>();
  const queue = [...steps];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    if (current.status === 'completed' || current.status === 'failed') ids.add(current.stepId);
    if (current.nextSteps) queue.push(...current.nextSteps);
  }
  return ids;
}

/** Root 1 is already completed. The check (step 3) is still running under it. */
function conferenceTree(
  defs: mls.msg.AIAgentStep,
  check: mls.msg.AIAgentStep,
  memory: Record<string, string>,
): { context: mls.msg.ExecutionContext; root: mls.msg.AIAgentStep; check: mls.msg.AIAgentStep } {
  defs.stepId = 4;
  defs.parentStepId = 1;
  check.stepId = 3;
  check.status = 'in_progress';
  check.parentStepId = 1;
  const root = {
    type: 'agent',
    stepId: 1,
    status: 'completed',
    parentStepId: 0,
    nextSteps: [defs, check],
    agentName: NR_AGENT_NAME,
    prompt: '',
    rags: [],
    interaction: null,
    stepTitle: 'release',
  } as mls.msg.AIAgentStep;
  const context = {
    message: { threadId: 'thread-gen', content: '@@agentNewReleaseL2 tarefas', orderAt: '1' },
    task: { PK: 'task', iaCompressed: { nextSteps: [root], longMemory: memory } },
  } as mls.msg.ExecutionContext;
  return { context, root, check };
}

test('the generator check hangs the materializer and the close step on the open check', async () => {
  const previous = mls.actualProject;
  installRunStor(102047);
  plantJson(snapshotInfo('tarefas'), '{}\n');
  const [defs, check] = buildRegenerateSteps(102047, 'tarefas', ['minhas_tarefas']);
  defs.status = 'completed';
  defs.interaction = { input: [], cost: 0, trace: ['defs written'], payload: null };
  const { context, root, check: running } = conferenceTree(defs, check, {
    moduleName: 'tarefas',
    nrPages: 'minhas_tarefas,tarefas_equipe',
    nrMaterializeOnly: '',
    nrCommands: JSON.stringify([FIELD_COMMAND]),
  });
  try {
    const agent = createAgent();
    if (!agent.beforePromptStep) assert.fail('missing beforePromptStep');
    const intents = await agent.beforePromptStep(agent, context, root, running, 0);
    const terminal = terminalStepIds(context.task?.iaCompressed?.nextSteps || []);
    const added = intents.filter(intent => intent.type === 'add-step');
    assert.ok(added.length > 0);
    assert.ok(added.every(intent => intent.parentStepId === 3 && !terminal.has(intent.parentStepId)));
    const checkUpdate = intents.at(-1);
    if (checkUpdate?.type !== 'update-status') assert.fail('missing check update');
    assert.equal(checkUpdate.stepId, 3);
    assert.equal(checkUpdate.status, 'completed');
    assert.equal(checkUpdate.traceMsg, 'done: defs stayed inside the planned pages');
    assert.equal(intents.slice(0, -1).every(intent => intent.type === 'add-step'), true);
    const close = added.find(intent => intent.step.planning?.planId === NR_CLOSE_PLAN);
    if (close?.type !== 'add-step') assert.fail('missing close step');
    assert.equal(close.messageId, '1');
    assert.equal(close.taskId, 'task');
    assert.deepEqual(commandLines(close.step.prompt || ''), [FIELD_COMMAND]);
    const materialize = {
      type: 'agent',
      stepId: 8,
      status: 'completed',
      parentStepId: 3,
      interaction: { input: [], cost: 0, trace: ['pages written'], payload: null },
      nextSteps: [],
      planning: { planId: NR_MATERIALIZE_PLAN, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
      agentName: NR_MATERIALIZE_AGENT,
      prompt: '',
      rags: [],
      stepTitle: 'Materialize module',
    } as mls.msg.AIAgentStep;
    running.nextSteps = [materialize];
    const closeStep = close.step as mls.msg.AIAgentStep;
    closeStep.stepId = 9;
    closeStep.parentStepId = 3;
    const done = await agent.beforePromptStep(agent, context, running, closeStep, 0);
    const doneUpdate = done[0];
    if (doneUpdate?.type !== 'update-status') assert.fail('missing close update');
    assert.equal(doneUpdate.status, 'completed');
    assert.match(doneUpdate.traceMsg || '', /^done: pages written/);
  } finally {
    mls.actualProject = previous;
  }
});

test('an outside path closes the check with the motive and adds no child', async () => {
  const previous = mls.actualProject;
  installRunStor(102047);
  plantJson(snapshotInfo('tarefas'), JSON.stringify({ 'l2/tarefas/web/shared/other.defs.ts': 'abc' }));
  const [defs, check] = buildRegenerateSteps(102047, 'tarefas', ['minhas_tarefas']);
  defs.status = 'completed';
  defs.interaction = { input: [], cost: 0, trace: ['defs written'], payload: null };
  const { context, root, check: running } = conferenceTree(defs, check, {
    moduleName: 'tarefas',
    nrPages: 'minhas_tarefas,tarefas_equipe',
    nrMaterializeOnly: '',
    nrCommands: '[]',
  });
  try {
    const agent = createAgent();
    if (!agent.beforePromptStep) assert.fail('missing beforePromptStep');
    const intents = await agent.beforePromptStep(agent, context, root, running, 0);
    assert.equal(intents.length, 1);
    assert.equal(intents.some(intent => intent.type === 'add-step'), false);
    const update = intents[0];
    if (update?.type !== 'update-status') assert.fail('missing failed update');
    assert.equal(update.stepId, 3);
    assert.equal(update.status, 'failed');
    assert.match(update.traceMsg || '', /outside: l2\/tarefas\/web\/shared\/other\.defs\.ts/);
  } finally {
    mls.actualProject = previous;
  }
});
