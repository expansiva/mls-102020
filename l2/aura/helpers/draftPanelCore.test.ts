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
  publish,
  saveDefaultDraft,
  saveToDraft,
  slugForBranch,
  viewDiff,
  type FetchImpl,
  type IDraftWaitResult,
  type IListedDraft,
  type IPanelStorFile,
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
  const cleanB = { project: 102047, status: 'deleted' as const, shortName: 'b' };
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
  const saved = await saveToDraft(edited, 'draft comment', async (clean, comment) => {
    assert.equal(comment, 'draft comment');
    written = clean;
    return clean.map(() => ({ result: true }));
  });
  assert.deepEqual(written, [cleanA, cleanB]);
  assert.deepEqual(saved.blocked, [broken]);
});

test('saveToDraft sends a deleted file even when it has an error, and skips setContents when nothing is clean', async () => {
  const deleted = { project: 102047, status: 'deleted' as const, hasError: true, shortName: 'gone' };
  let count = 0;
  const saved = await saveToDraft([deleted], 'remove', async (clean) => {
    count += 1;
    assert.deepEqual(clean, [deleted]);
    return [{ result: true }];
  });
  assert.equal(count, 1);
  assert.deepEqual(saved.blocked, []);

  let called = false;
  const blocked = await saveToDraft(
    [{ project: 102047, inLocalStorage: true, hasError: true }],
    'nope',
    async () => { called = true; return [{ result: true }]; },
  );
  assert.equal(called, false);
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
  await assert.rejects(
    () => saveToDraft(
      [{ project: 102047, inLocalStorage: true }],
      'x',
      async () => [{ result: false }],
    ),
    /setContents refused the draft save/,
  );
});
