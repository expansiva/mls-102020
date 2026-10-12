/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  branchForSlug,
  callExec,
  collectEditedFiles,
  discard,
  experimentDraft,
  loadPanel,
  localEdits,
  panelModel,
  publish,
  readPublished,
  saveDefaultDraft,
  saveToDraft,
  slugForBranch,
  viewDiff,
  type FetchImpl,
  type IDraftWaitResult,
  type IListedDraft,
  type IPanelStorFile,
  type IPublishEffects,
  type ListLocalFiles,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';

function jsonResponse(body: unknown, status = 200): { status: number; json: () => Promise<unknown> } {
  return { status, json: async () => body };
}

function draft(branch: string, files: string[]): IListedDraft {
  return {
    branch,
    ahead: 1,
    behind: 0,
    author: 'Ada',
    email: 'ada@example.com',
    date: '2026-10-12',
    message: 'wip',
    files,
  };
}

test('branchForSlug and slugForBranch round-trip, ambiguous local-part is null', () => {
  assert.equal(branchForSlug('team-102047'), 'team/102047');
  assert.equal(slugForBranch('team/102047'), 'team-102047');
  assert.equal(branchForSlug(slugForBranch('team/102047') ?? ''), 'team/102047');

  assert.equal(branchForSlug('user-ada_example_com'), 'user/ada@example.com');
  assert.equal(slugForBranch('user/ada@example.com'), 'user-ada_example_com');
  assert.equal(branchForSlug('user-ada_example_com'), branchForSlug(slugForBranch('user/ada@example.com') ?? ''));

  assert.equal(slugForBranch('user/a.b@c.com'), null);
  assert.equal(slugForBranch('user/a_b@c.com'), null);
  assert.equal(branchForSlug('not a slug'), null);
  assert.equal(slugForBranch('main'), null);
});

test('loadPanel picks the current branch and leaves the rest as others', async () => {
  const current = draft('team/102047', ['l2/a.ts']);
  const other = draft('user/ada@example.com', ['l2/b.ts']);
  const fetchImpl: FetchImpl = async (input, init) => {
    assert.equal(input, '/exec');
    assert.equal(init.credentials, 'same-origin');
    const body = JSON.parse(init.body) as { action: string; project: number };
    assert.equal(body.action, 'listDrafts');
    assert.equal(body.project, 102047);
    return jsonResponse({ statusCode: 200, status: 'listed', drafts: [other, current] });
  };

  const withCurrent = await loadPanel(fetchImpl, 102047, 'team-102047');
  assert.equal(withCurrent.current, current);
  assert.deepEqual(withCurrent.others, [other]);

  const missing = await loadPanel(fetchImpl, 102047, 'team-9');
  assert.equal(missing.current, null);
  assert.deepEqual(missing.others.map((item) => item.branch), ['user/ada@example.com', 'team/102047']);
});

test('publish merged waits then reloads, in that order', async () => {
  const calls: string[] = [];
  const fetchImpl: FetchImpl = async (_input, init) => {
    calls.push('promote');
    const body = JSON.parse(init.body) as { action: string; target: string; draft: string; comment: string };
    assert.equal(body.action, 'promote');
    assert.equal(body.target, 'production');
    assert.equal(body.draft, 'team-102047');
    assert.equal(body.comment, 'ship it');
    return jsonResponse({ statusCode: 200, status: 'merged', ref: 'abc', release: 'scheduled' });
  };
  const waitForNew = async (): Promise<IDraftWaitResult> => {
    calls.push('waitForNew');
    return { changed: true, reason: 'released' };
  };
  const reload = (): void => { calls.push('reload'); };

  const result = await publish({ fetchImpl, waitForNew, reload }, 102047, 'team-102047', 'ship it');
  assert.deepEqual(result, { outcome: 'merged' });
  assert.deepEqual(calls, ['promote', 'waitForNew', 'reload']);
});

test('nothing_to_promote does not wait and does not reload', async () => {
  const calls: string[] = [];
  const fetchImpl: FetchImpl = async () => {
    calls.push('promote');
    return jsonResponse({ statusCode: 200, status: 'nothing_to_promote' });
  };
  const result = await publish({
    fetchImpl,
    waitForNew: async () => { calls.push('waitForNew'); return { changed: true, reason: 'released' }; },
    reload: () => { calls.push('reload'); },
  }, 102047, 'team-102047', '');
  assert.deepEqual(result, { outcome: 'nothing' });
  assert.deepEqual(calls, ['promote']);
});

test('409 DRAFT_CONFLICT returns the files and does not reload', async () => {
  const calls: string[] = [];
  const fetchImpl: FetchImpl = async () => jsonResponse(
    { statusCode: 409, code: 'DRAFT_CONFLICT', files: ['l2/a.ts', 'l2/b.ts'] },
    409,
  );
  const result = await publish({
    fetchImpl,
    waitForNew: async () => { calls.push('waitForNew'); return { changed: true, reason: 'released' }; },
    reload: () => { calls.push('reload'); },
  }, 102047, 'team-102047', 'ship');
  assert.deepEqual(result, { outcome: 'conflict', files: ['l2/a.ts', 'l2/b.ts'] });
  assert.deepEqual(calls, []);
});

test('waitForNew changed:false is an error and does not reload', async () => {
  for (const reason of ['timeout', 'build-failed'] as const) {
    const calls: string[] = [];
    await assert.rejects(
      () => publish({
        fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'merged' }),
        waitForNew: async () => { calls.push('waitForNew'); return { changed: false, reason }; },
        reload: () => { calls.push('reload'); },
      }, 102047, 'team-102047', ''),
      (err: unknown) => err instanceof Error && err.message === reason,
    );
    assert.deepEqual(calls, ['waitForNew']);
  }
});

test('MAIN_DIRTY, REBUILD_BUSY and other codes throw the code', async () => {
  for (const code of ['MAIN_DIRTY', 'REBUILD_BUSY', 'BAD_DRAFT']) {
    await assert.rejects(
      () => publish({
        fetchImpl: async () => jsonResponse({ statusCode: 409, code }, 409),
        waitForNew: async () => { throw new Error('wait should not run'); },
        reload: () => { throw new Error('reload should not run'); },
      }, 102047, 'team-102047', ''),
      (err: unknown) => err instanceof Error && err.message === code,
    );
  }
});

test('callExec turns a network failure and a non-JSON body into an error', async () => {
  await assert.rejects(
    () => callExec(async () => { throw new Error('offline'); }, 'ping', {}),
    /offline/,
  );
  const notJson: FetchImpl = async () => ({
    status: 200,
    json: async () => { throw new SyntaxError('Unexpected token'); },
  });
  await assert.rejects(() => callExec(notJson, 'ping', {}), /Unexpected token/);
});

test('discard reloads only after discardDraft succeeds', async () => {
  const calls: string[] = [];
  await discard({
    fetchImpl: async (_input, init) => {
      calls.push('discardDraft');
      const body = JSON.parse(init.body) as { action: string; draft: string };
      assert.equal(body.action, 'discardDraft');
      assert.equal(body.draft, 'team-102047');
      return jsonResponse({ statusCode: 200, status: 'discarded' });
    },
    reload: () => { calls.push('reload'); },
  }, 102047, 'team-102047');
  assert.deepEqual(calls, ['discardDraft', 'reload']);

  const refused: string[] = [];
  await assert.rejects(
    () => discard({
      fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'BAD_DRAFT' }, 400),
      reload: () => { refused.push('reload'); },
    }, 102047, 'nope'),
    /BAD_DRAFT/,
  );
  assert.deepEqual(refused, []);
});

test('collectEditedFiles keeps the project dirty files; saveToDraft writes only the clean ones', async () => {
  const cleanA = { project: 102047, inLocalStorage: true, shortName: 'a' };
  const cleanB = { project: 102047, status: 'deleted' as const, shortName: 'b', inLocalStorage: undefined as boolean | undefined };
  const broken = { project: 102047, inLocalStorage: true, hasError: true, shortName: 'c' };
  const other = { project: 102099, inLocalStorage: true, shortName: 'd' };
  const untouched = { project: 102047, shortName: 'e' };
  const storFiles = {
    a: cleanA,
    b: cleanB,
    c: broken,
    d: other,
    e: untouched,
  };
  // `satisfies` keeps the file fields; the annotation is the injected `listLocalFiles`.
  const listLocalFiles = (() => storFiles) satisfies ListLocalFiles;

  const edited = collectEditedFiles(listLocalFiles(), 102047);
  assert.deepEqual(edited.map((file) => file.shortName), ['a', 'b', 'c']);

  let written: IPanelStorFile[] | null = null;
  const cleared: string[] = [];
  const saved = await saveToDraft(edited, 'draft comment', async (clean, comment) => {
    assert.equal(comment, 'draft comment');
    assert.equal(cleanA.inLocalStorage, false);
    assert.equal(cleanB.inLocalStorage, false);
    written = clean;
    return clean.map(() => ({ result: true }));
  }, async (file) => {
    cleared.push(file.shortName ?? '');
  });
  assert.deepEqual(written, [cleanA, cleanB]);
  assert.deepEqual(cleared, ['a', 'b']);
  assert.deepEqual(saved.blocked, [broken]);
});

test('saveToDraft sends a deleted file even when it has an error, and skips setContents when nothing is clean', async () => {
  const deleted = { project: 102047, status: 'deleted' as const, hasError: true, shortName: 'gone', inLocalStorage: undefined as boolean | undefined };
  let count = 0;
  const cleared: string[] = [];
  const saved = await saveToDraft([deleted], 'remove', async (clean) => {
    count += 1;
    assert.equal(deleted.inLocalStorage, false);
    assert.deepEqual(clean, [deleted]);
    return [{ result: true }];
  }, async (file) => {
    cleared.push(file.shortName ?? '');
  });
  assert.equal(count, 1);
  assert.deepEqual(cleared, ['gone']);
  assert.deepEqual(saved.blocked, []);

  let called = false;
  let clearedBlocked = false;
  const blocked = await saveToDraft(
    [{ project: 102047, inLocalStorage: true, hasError: true }],
    'nope',
    async () => { called = true; return [{ result: true }]; },
    async () => { clearedBlocked = true; },
  );
  assert.equal(called, false);
  assert.equal(clearedBlocked, false);
  assert.equal(blocked.blocked.length, 1);
});

test('viewDiff requests draftDiff with the slug of the branch', async () => {
  const fetchImpl: FetchImpl = async (input, init) => {
    assert.equal(input, '/exec');
    assert.equal(init.credentials, 'same-origin');
    const body = JSON.parse(init.body) as { action: string; project: number; draft: string };
    assert.equal(body.action, 'draftDiff');
    assert.equal(body.project, 102047);
    assert.equal(body.draft, 'user-ada_example_com');
    return jsonResponse({ statusCode: 200, status: 'diff', text: 'diff --git a/l2/b.ts' });
  };
  assert.equal(await viewDiff(fetchImpl, 102047, 'user/ada@example.com'), 'diff --git a/l2/b.ts');

  let called = false;
  const refused: FetchImpl = async () => {
    called = true;
    return jsonResponse({ statusCode: 200, status: 'diff', text: '' });
  };
  await assert.rejects(() => viewDiff(refused, 102047, 'user/a.b@c.com'), /no draft slug/);
  assert.equal(called, false);
});

test('experimentDraft writes the draft cookie and then reloads', () => {
  const calls: string[] = [];
  experimentDraft({
    setCookie: (cookie) => { calls.push(cookie); },
    reload: () => { calls.push('reload'); },
  }, 'team-102047', true);
  assert.deepEqual(calls, [
    'collab-draft=team-102047; Path=/; SameSite=Lax; Secure',
    'reload',
  ]);

  const skipped: string[] = [];
  assert.throws(
    () => experimentDraft({
      setCookie: (cookie) => { skipped.push(cookie); },
      reload: () => { skipped.push('reload'); },
    }, 'not a slug', false),
    /invalid draft slug/,
  );
  assert.deepEqual(skipped, []);
});

test('saveDefaultDraft writes studio.defaultDraft and leaves the rest of l5/config.json', async () => {
  const current = JSON.stringify({
    name: 'app',
    n: 1,
    studio: { theme: 'plain', defaultDraft: 'team-1' },
  });
  const writes: { project: number; shortName: string; content: string; comment: string }[] = [];
  await saveDefaultDraft(current, 102047, 'user-ada_example_com', 'set default', async (project, shortName, content, comment) => {
    writes.push({ project, shortName, content, comment });
    return true;
  });
  const saved = writes[0];
  assert.ok(saved);
  assert.equal(saved.project, 102047);
  assert.equal(saved.shortName, 'config');
  assert.equal(saved.comment, 'set default');
  assert.deepEqual(JSON.parse(saved.content), {
    name: 'app',
    n: 1,
    studio: { theme: 'plain', defaultDraft: 'user-ada_example_com' },
  });

  let called = false;
  await assert.rejects(
    () => saveDefaultDraft(current, 102047, 'nope', 'x', async () => { called = true; return true; }),
    /invalid/,
  );
  assert.equal(called, false);

  await assert.rejects(
    () => saveDefaultDraft('{', 102047, 'team-102047', 'x', async () => true),
    /not JSON/,
  );
  await assert.rejects(
    () => saveDefaultDraft(current, 102047, 'team-102047', 'x', async () => false),
    /refused/,
  );
});

test('saveToDraft throws when setContents reports a refusal', async () => {
  const file = { project: 102047, inLocalStorage: true as boolean | undefined };
  let cleared = 0;
  await assert.rejects(
    () => saveToDraft(
      [file],
      'x',
      async (clean) => {
        assert.equal(clean[0]?.inLocalStorage, false);
        return [{ result: false }];
      },
      async () => { cleared += 1; },
    ),
    /setContents refused the draft save/,
  );
  assert.equal(file.inLocalStorage, true);
  assert.equal(cleared, 0);
});

test('saveToDraft restores inLocalStorage when setContents throws and does not clear', async () => {
  const file = { project: 102047, inLocalStorage: true as boolean | undefined };
  let cleared = 0;
  await assert.rejects(
    () => saveToDraft(
      [file],
      'x',
      async (clean) => {
        assert.equal(clean[0]?.inLocalStorage, false);
        throw new Error('network down');
      },
      async () => { cleared += 1; },
    ),
    /network down/,
  );
  assert.equal(file.inLocalStorage, true);
  assert.equal(cleared, 0);
});

test('localEdits is empty, one file, or many, and a deletion counts', () => {
  assert.deepEqual(localEdits({}, 102047), []);
  assert.deepEqual(localEdits({
    untouched: { project: 102047, shortName: 'e' },
    other: { project: 102099, inLocalStorage: true, shortName: 'd' },
  }, 102047), []);

  assert.deepEqual(localEdits({
    a: { project: 102047, inLocalStorage: true, shortName: 'a' },
  }, 102047), [{ shortPath: 'a', hasError: false }]);

  assert.deepEqual(localEdits({
    a: {
      project: 102047,
      inLocalStorage: true,
      level: 2,
      folder: 'aura',
      shortName: 'a',
      extension: '.ts',
    },
    gone: { project: 102047, status: 'deleted', shortName: 'gone' },
    broken: {
      project: 102047,
      inLocalStorage: true,
      hasError: true,
      level: 1,
      shortName: 'c',
      extension: '.less',
    },
  }, 102047), [
    { shortPath: 'l2/aura/a.ts', hasError: false },
    { shortPath: 'gone', hasError: false },
    { shortPath: 'l1/c.less', hasError: true },
  ]);
});

test('publish merged remembers the files after the wait and before reload', async () => {
  const calls: string[] = [];
  let recorded: { files: string[]; at: number } | undefined;
  const files = ['l2/a.ts', 'l2/b.ts'];
  const before = Date.now();
  const result = await publish({
    fetchImpl: async () => {
      calls.push('promote');
      return jsonResponse({ statusCode: 200, status: 'merged' });
    },
    waitForNew: async () => {
      calls.push('waitForNew');
      return { changed: true, reason: 'released' };
    },
    rememberPublished: (record) => {
      calls.push('remember');
      recorded = record;
    },
    reload: () => { calls.push('reload'); },
  }, 102047, 'team-102047', 'ship it', files);
  const after = Date.now();
  assert.deepEqual(result, { outcome: 'merged' });
  assert.deepEqual(calls, ['promote', 'waitForNew', 'remember', 'reload']);
  assert.deepEqual(recorded?.files, files);
  assert.ok(recorded !== undefined && recorded.at >= before && recorded.at <= after);
  files.push('l2/c.ts');
  assert.deepEqual(recorded?.files, ['l2/a.ts', 'l2/b.ts']);
});

test('publish does not remember on nothing, conflict, or failure', async () => {
  const remembered: string[] = [];
  const effects = (fetchImpl: FetchImpl): IPublishEffects => ({
    fetchImpl,
    waitForNew: async () => { throw new Error('wait should not run'); },
    rememberPublished: () => { remembered.push('remember'); },
    reload: () => { throw new Error('reload should not run'); },
  });

  const nothing = await publish(
    effects(async () => jsonResponse({ statusCode: 200, status: 'nothing_to_promote' })),
    102047,
    'team-102047',
    '',
    ['l2/a.ts'],
  );
  assert.deepEqual(nothing, { outcome: 'nothing' });

  const conflict = await publish(
    effects(async () => jsonResponse({ statusCode: 409, code: 'DRAFT_CONFLICT', files: ['l2/a.ts'] }, 409)),
    102047,
    'team-102047',
    'ship',
    ['l2/a.ts'],
  );
  assert.deepEqual(conflict, { outcome: 'conflict', files: ['l2/a.ts'] });

  await assert.rejects(
    () => publish(
      effects(async () => jsonResponse({ statusCode: 409, code: 'MAIN_DIRTY' }, 409)),
      102047,
      'team-102047',
      '',
      ['l2/a.ts'],
    ),
    /MAIN_DIRTY/,
  );

  await assert.rejects(
    () => publish({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'merged' }),
      waitForNew: async () => ({ changed: false, reason: 'timeout' }),
      rememberPublished: () => { remembered.push('remember'); },
      reload: () => { throw new Error('reload should not run'); },
    }, 102047, 'team-102047', '', ['l2/a.ts']),
    /timeout/,
  );
  assert.deepEqual(remembered, []);
});

test('readPublished returns the record, and invalid JSON is null', () => {
  assert.equal(readPublished(null), null);
  assert.equal(readPublished('not json'), null);
  assert.equal(readPublished('{"files":"no","at":1}'), null);
  assert.deepEqual(readPublished('{"files":["l2/a.ts"],"at":10,"extra":true}'), {
    files: ['l2/a.ts'],
    at: 10,
  });
});

test('panelModel: draft block is current.files, empty when current is null; published needs a record', () => {
  const current = draft('team/102047', ['l2/a.ts', 'l2/b.ts']);
  const empty = panelModel({
    local: [],
    draft: null,
    published: null,
    release: 'rel-1',
  });
  assert.deepEqual(empty.local, { count: 0, files: [] });
  assert.deepEqual(empty.draft, { count: 0, files: [] });
  assert.deepEqual(empty.published, { count: 0, files: [], release: 'rel-1' });

  const full = panelModel({
    local: [
      { shortPath: 'l2/a.ts', hasError: false },
      { shortPath: 'l1/c.less', hasError: true },
    ],
    draft: current.files,
    published: { files: ['l2/a.ts'], at: 10 },
    release: 'rel-9',
  });
  assert.deepEqual(full.local, {
    count: 2,
    files: [
      { shortPath: 'l2/a.ts', hasError: false },
      { shortPath: 'l1/c.less', hasError: true },
    ],
  });
  assert.deepEqual(full.draft, { count: 2, files: current.files });
  assert.deepEqual(full.published, { count: 1, files: ['l2/a.ts'], release: 'rel-9' });

  const noRelease = panelModel({
    local: [],
    draft: [],
    published: { files: ['l2/a.ts'], at: 10 },
    release: null,
  });
  assert.deepEqual(noRelease.published, { count: 1, files: ['l2/a.ts'], release: null });
});
