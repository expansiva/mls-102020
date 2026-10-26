/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/plan.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mergeChangeEffort } from '/_102035_/l2/solution/gates/changeEffort/gate.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';

const MASTER = '102020';

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

type Answer = {
  master: { project: string };
  create: Array<{ kind: string; id: string; path: string }>;
  regenerateDefs: Array<{ kind: string; id: string; path: string }>;
  materialize: Array<{ kind: string; id: string; path: string }>;
  contract: string;
};

type EffortFile = {
  perItem: Array<{ answers: Answer[] }>;
  merged: unknown;
  status: string;
};

function retie(effort: EffortFile): EffortFile {
  effort.merged = mergeChangeEffort(effort.perItem as never);
  const answers = effort.perItem.flatMap(row => row.answers);
  effort.status = answers.some(answer => answer.contract === 'change') ? 'contract' : 'simple';
  return effort;
}

test('R1 only materializes the named page and ignores the other master', () => {
  assert.deepEqual(planNewReleaseL2(fixture('r1'), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['minhas_tarefas'],
    materializeOnly: [],
    commands: [],
    sharedPages: [],
    bffPages: [],
  });
});

test('pages stay in first-seen order without repetition', () => {
  assert.deepEqual(planNewReleaseL2(fixture('order'), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['segunda', 'primeira'],
    materializeOnly: [],
    commands: [],
    sharedPages: [],
    bffPages: [],
  });
});

test('R3 regenerateDefs of contract and shared rebuilds those pages', () => {
  const effort = fixture('r3') as EffortFile;
  const answer = effort.perItem[0].answers[0];
  answer.regenerateDefs = [
    { kind: 'contract', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
    { kind: 'shared', id: 'inicio', path: 'l2/tarefas/web/shared/inicio.defs.ts' },
  ];
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['minhas_tarefas', 'inicio'],
    materializeOnly: [],
    commands: [],
    sharedPages: ['minhas_tarefas', 'inicio'],
    bffPages: ['minhas_tarefas'],
  });
});

test('R4 contract change rebuilds the cited page', () => {
  const effort = fixture('r4') as EffortFile;
  const answer = effort.perItem[0].answers[0];
  answer.materialize = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['tarefas_equipe'],
    materializeOnly: [],
    commands: [],
    sharedPages: [],
    bffPages: [],
  });
});

test('R1 and R4 in one file keep the materialize-only page beside the rebuild', () => {
  const r1 = fixture('r1') as EffortFile;
  const effort = fixture('r4') as EffortFile;
  const rebuild = effort.perItem[0].answers[0];
  rebuild.materialize = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  const materializeAnswer = r1.perItem[0].answers.find(answer => answer.master.project === MASTER);
  if (!materializeAnswer) throw new Error('R1 has no answer for this master');
  effort.perItem[0].answers.push(materializeAnswer);
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'regenerate',
    pages: ['tarefas_equipe'],
    materializeOnly: ['minhas_tarefas'],
    commands: [],
    sharedPages: [],
    bffPages: [],
  });
});

test('abend refuses with the master reason', () => {
  assert.deepEqual(planNewReleaseL2(fixture('abend'), MASTER), {
    ok: false,
    reason: 'not in this release step: field:prioridade abend: module has no declared languages',
  });
});

test('nothing to apply when this master has no page', () => {
  assert.deepEqual(planNewReleaseL2(fixture('nothing'), MASTER), { ok: false, reason: 'nothing to apply' });
});

test('R1 materializes this master when the client project is a different number', () => {
  const previous = mls.actualProject;
  mls.actualProject = 102047;
  try {
    assert.equal(String(mls.actualProject), '102047');
    assert.deepEqual(planNewReleaseL2(fixture('r1'), MASTER), {
      ok: true,
      mode: 'materialize',
      pages: ['minhas_tarefas'],
      materializeOnly: [],
      commands: [],
    sharedPages: [],
    bffPages: [],
    });
  } finally {
    mls.actualProject = previous;
  }
});

test('an effort whose answers are only from another master is a refusal', () => {
  const effort = fixture('r1') as EffortFile;
  for (const row of effort.perItem) {
    for (const answer of row.answers) answer.master.project = '102021';
  }
  for (const master of (effort as EffortFile & { masters: Array<{ project: string }> }).masters) {
    master.project = '102021';
  }
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: false,
    reason: 'change effort has no answer from master 102020',
  });
});

const LANG_COMMAND = '@@agentAddLanguage [{"languages":[{"code":"pt","name":"pt"}],"projectId":102047,"moduleName":"tarefas"}]';

function withCommands(name: string, commands: string[][]): EffortFile {
  const effort = fixture(name) as EffortFile & {
    request: { items: Array<{ changeId: string; kind: string; op: string; entity: string; source: string }> };
  };
  const source = effort.perItem[0].answers.find(answer => answer.master.project === MASTER);
  if (!source) throw new Error('missing master answer');
  (source as Answer & { runAgents: Array<{ agent: string; command: string }> }).runAgents =
    (commands[0] || []).map(command => ({ agent: 'agentAddLanguage', command }));
  const other = effort.perItem[0].answers.find(answer => answer.master.project !== MASTER);
  if (other) {
    (other as Answer & { runAgents: Array<{ agent: string; command: string }> }).runAgents = [
      { agent: 'agentAddLanguage', command: '@@agentAddLanguage [{"languages":[{"code":"es","name":"es"}]}]' },
    ];
  }
  effort.perItem[0].item = 'field:prazo';
  for (const answer of effort.perItem[0].answers) answer.item = 'field:prazo';
  effort.request.items = [{
    changeId: 'field:prazo',
    kind: 'field',
    op: 'changed',
    entity: 'Tarefa',
    source: 'l4/tarefas/ontology.defs.ts',
  }];
  return effort;
}

test('a text field with runAgents is accepted and the command is returned once', () => {
  const effort = withCommands('r1', [[LANG_COMMAND]]);
  const answer = effort.perItem[0].answers.find(row => row.master.project === MASTER);
  if (!answer) throw new Error('missing master answer');
  answer.item = 'field:prazo';
  answer.materialize = [
    { kind: 'page', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
  ];
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['minhas_tarefas', 'tarefas_equipe'],
    materializeOnly: [],
    commands: [LANG_COMMAND],
    sharedPages: [],
    bffPages: [],
  });
});

test('the same command on two answers of this master is returned once, in answer order', () => {
  const effort = withCommands('r1', [[LANG_COMMAND]]) as EffortFile & {
    request: { items: Array<{ changeId: string; kind: string; op: string; entity: string; source: string }> };
  };
  const first = effort.perItem[0].answers.find(row => row.master.project === MASTER);
  if (!first) throw new Error('missing master answer');
  const second = structuredClone(first);
  second.item = 'field:titulo';
  (second as Answer & { runAgents: Array<{ agent: string; command: string }> }).runAgents = [
    { agent: 'agentAddLanguage', command: LANG_COMMAND },
    { agent: 'agentAddLanguage', command: '@@agentAddLanguage [{"languages":[{"code":"en","name":"en"}]}]' },
  ];
  effort.perItem.push({ item: 'field:titulo', answers: [second] });
  effort.request.items.push({
    changeId: 'field:titulo',
    kind: 'field',
    op: 'changed',
    entity: 'Tarefa',
    source: 'l4/tarefas/ontology.defs.ts',
  });
  assert.deepEqual(planNewReleaseL2(retie(effort), MASTER), {
    ok: true,
    mode: 'materialize',
    pages: ['minhas_tarefas'],
    materializeOnly: [],
    commands: [LANG_COMMAND, '@@agentAddLanguage [{"languages":[{"code":"en","name":"en"}]}]'],
    sharedPages: [],
    bffPages: [],
  });
});

test('M1B pages: contract is in bffPages, page plus shared without contract is not', () => {
  const effort = fixture('r1') as EffortFile;
  const answer = effort.perItem[0].answers.find(row => row.master.project === MASTER);
  if (!answer) throw new Error('missing master answer');
  answer.materialize = [];
  answer.regenerateDefs = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
    { kind: 'shared', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
    { kind: 'page', id: 'minhas_tarefas', path: 'l2/tarefas/web/shared/minhas_tarefas.defs.ts' },
    { kind: 'contract', id: 'minhas_tarefas', path: 'l2/tarefas/web/contracts/minhas_tarefas.defs.ts' },
  ];
  const plan = planNewReleaseL2(retie(effort), MASTER);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.equal(plan.bffPages.includes('tarefas_equipe'), false);
  assert.deepEqual(plan.bffPages, ['minhas_tarefas']);
  assert.deepEqual(plan.sharedPages, ['tarefas_equipe', 'minhas_tarefas']);
});

test('a created page is in bffPages and shared in materialize is in sharedPages', () => {
  const effort = fixture('r1') as EffortFile;
  const answer = effort.perItem[0].answers.find(row => row.master.project === MASTER);
  if (!answer) throw new Error('missing master answer');
  answer.create = [{ kind: 'page', id: 'nova', path: 'l2/tarefas/web/contracts/nova.defs.ts' }];
  answer.materialize = [
    { kind: 'page', id: 'tarefas_equipe', path: 'l2/tarefas/web/contracts/tarefas_equipe.defs.ts' },
    { kind: 'shared', id: 'tarefas_equipe', path: 'l2/tarefas/web/shared/tarefas_equipe.defs.ts' },
  ];
  const plan = planNewReleaseL2(retie(effort), MASTER);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  assert.deepEqual(plan.bffPages, ['nova']);
  assert.deepEqual(plan.sharedPages, ['tarefas_equipe']);
});

test('invalid file refuses with the gate reason', () => {
  const plan = planNewReleaseL2(fixture('invalid'), MASTER);
  assert.equal(plan.ok, false);
  if (plan.ok) return;
  assert.match(plan.reason, /^changeEffort rejected by gate: /);
  assert.match(plan.reason, /schema:schemaVersion/);
});
