/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  afterDraftSave,
  branchForSlug,
  callExec,
  collectEditedFiles,
  COLLAB_DRAFT_SAVED,
  discard,
  discardModule,
  resetDraftDatabase,
  loadPanel,
  modulePendingCount,
  localEdits,
  actionCounts,
  buildDraftTree,
  buildPanelTree,
  draftCountText,
  draftNodeActions,
  findDraftNode,
  panelModel,
  pendingFiles,
  publish,
  visibleTreeRows,
  readPublished,
  saveDefaultDraft,
  saveToDraft,
  slugForBranch,
  storeCapturedDraftText,
  syncWithPublished,
  viewDiff,
  type FetchImpl,
  type ICollabDraftSavedDetail,
  type IDraftWaitResult,
  type IListedDraft,
  type IPanelPersonInput,
  type IPanelStorFile,
  type IPendingFile,
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

function fileKey(file: IPanelStorFile): string {
  return `File_${file.project}_${file.level ?? 0}_${file.shortName ?? ''}_${file.extension ?? ''}`;
}

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
    storFiles: {},
    clearLocal: async () => { calls.push('clear'); },
  }, 102047, 'team-102047');
  assert.deepEqual(calls, ['discardDraft', 'reload']);

  const refused: string[] = [];
  await assert.rejects(
    () => discard({
      fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'BAD_DRAFT' }, 400),
      reload: () => { refused.push('reload'); },
      storFiles: {},
      clearLocal: async () => { refused.push('clear'); },
    }, 102047, 'nope'),
    /BAD_DRAFT/,
  );
  assert.deepEqual(refused, []);
});

test('resetDraftDatabase calls draftResetDatabase and surfaces the cause', async () => {
  const calls: string[] = [];
  const reset = await resetDraftDatabase(async (_input, init) => {
    calls.push('draftResetDatabase');
    const body = JSON.parse(init.body) as { action: string; project: number; draft: string };
    assert.equal(body.action, 'draftResetDatabase');
    assert.equal(body.project, 102047);
    assert.equal(body.draft, 'team-102047');
    return jsonResponse({ statusCode: 200, status: 'reset', database: 'draft_db' });
  }, 102047, 'team-102047');
  assert.deepEqual(reset, { database: 'draft_db' });
  assert.deepEqual(calls, ['draftResetDatabase']);

  await assert.rejects(
    () => resetDraftDatabase(
      async () => jsonResponse({ statusCode: 500, cause: 'drop refused' }, 500),
      102047,
      'team-102047',
    ),
    (err: unknown) => err instanceof Error && err.message === 'drop refused',
  );
  await assert.rejects(
    () => resetDraftDatabase(
      async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
      102047,
      'team-102047',
    ),
    (err: unknown) => err instanceof Error && err.message === 'draft.not_owner',
  );
});

test('discard clears the project local copies and tempObjects before reload', async () => {
  const projectFile: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'a', level: 2, folder: '', extension: '.ts',
  };
  const deleted: IPanelStorFile = {
    project: 102047, status: 'deleted', shortName: 'b', level: 2, folder: '', extension: '.ts',
  };
  const other: IPanelStorFile = {
    project: 102099, inLocalStorage: true, shortName: 'd', level: 2, folder: '', extension: '.ts',
  };
  const storFiles = { a: projectFile, b: deleted, d: other };
  const tempObjects: Record<string, string> = {
    [fileKey(projectFile)]: 'local-a',
    [fileKey(deleted)]: 'local-b',
    [fileKey(other)]: 'local-d',
  };
  const calls: string[] = [];
  await discard({
    fetchImpl: async () => {
      calls.push('discardDraft');
      return jsonResponse({ statusCode: 200, status: 'discarded' });
    },
    reload: () => { calls.push('reload'); },
    storFiles,
    clearLocal: async (file) => {
      calls.push(`clear:${file.shortName}`);
      file.inLocalStorage = false;
      file.status = 'nochange';
      delete tempObjects[fileKey(file)];
    },
  }, 102047, 'team-102047');
  assert.deepEqual(calls, ['discardDraft', 'clear:a', 'clear:b', 'reload']);
  assert.equal(projectFile.inLocalStorage, false);
  assert.equal(deleted.inLocalStorage, false);
  assert.equal(other.inLocalStorage, true);
  assert.deepEqual(Object.keys(tempObjects), [fileKey(other)]);
});

test('discard logs a failed local clear with the file and still reloads', async () => {
  const dirty: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'a', level: 2, folder: 'aura', extension: '.ts',
  };
  const calls: string[] = [];
  const logs: string[] = [];
  const orig = console.error;
  console.error = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  try {
    await discard({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'discarded' }),
      reload: () => { calls.push('reload'); },
      storFiles: { a: dirty },
      clearLocal: async () => { throw new Error('idb down'); },
    }, 102047, 'team-102047');
  } finally {
    console.error = orig;
  }
  assert.deepEqual(calls, ['reload']);
  assert.ok(logs.some((line) => line.includes('l2/aura/a.ts') && line.includes('idb down')));
  assert.equal(dirty.inLocalStorage, true);
});

test('syncWithPublished reloads on merged and rejects DRAFT_CONFLICT with the files', async () => {
  for (const status of ['fast_forwarded', 'merged', 'up_to_date']) {
    const calls: string[] = [];
    await syncWithPublished({
      fetchImpl: async (_input, init) => {
        calls.push('draftSync');
        const body = JSON.parse(init.body) as { action: string; project: number; draft: string };
        assert.equal(body.action, 'draftSync');
        assert.equal(body.project, 102047);
        assert.equal(body.draft, 'team-102047');
        return jsonResponse({ statusCode: 200, status });
      },
      reload: () => { calls.push('reload'); },
    }, 102047, 'team-102047');
    assert.deepEqual(calls, ['draftSync', 'reload']);
  }

  const refused: string[] = [];
  await assert.rejects(
    () => syncWithPublished({
      fetchImpl: async () => jsonResponse(
        { statusCode: 409, code: 'DRAFT_CONFLICT', files: ['l2/a.ts'] },
        409,
      ),
      reload: () => { refused.push('reload'); },
    }, 102047, 'team-102047'),
    (err: unknown) => err instanceof Error && err.message.includes('l2/a.ts'),
  );
  assert.deepEqual(refused, []);

  const otherCode: string[] = [];
  await assert.rejects(
    () => syncWithPublished({
      fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'BAD_DRAFT' }, 400),
      reload: () => { otherCode.push('reload'); },
    }, 102047, 'team-102047'),
    (err: unknown) => err instanceof Error && err.message === 'BAD_DRAFT',
  );
  assert.deepEqual(otherCode, []);
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

test('saveToDraft dispatches collabDraftSaved once with the sent paths', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const target = new EventTarget();
  host.window = target;
  const events: ICollabDraftSavedDetail[] = [];
  const listener = (event: Event): void => {
    events.push((event as CustomEvent<ICollabDraftSavedDetail>).detail);
  };
  target.addEventListener(COLLAB_DRAFT_SAVED, listener);
  try {
    const config: IPanelStorFile = {
      project: 102047,
      inLocalStorage: true,
      level: 5,
      folder: '',
      shortName: 'config',
      extension: '.json',
    };
    await saveToDraft([config], 'save config', async () => [{ result: true }], async () => {});
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { project: 102047, paths: ['l5/config.json'] });

    const page: IPanelStorFile = {
      project: 102047,
      inLocalStorage: true,
      level: 2,
      folder: '',
      shortName: 'page',
      extension: '.ts',
    };
    await saveToDraft([page], 'save page', async () => [{ result: true }], async () => {});
    assert.equal(events.length, 2);
    assert.deepEqual(events[1], { project: 102047, paths: ['l2/page.ts'] });

    await assert.rejects(
      () => saveToDraft([config], 'refused', async () => [{ result: false }], async () => {}),
      /setContents refused the draft save/,
    );
    assert.equal(events.length, 2);
  } finally {
    target.removeEventListener(COLLAB_DRAFT_SAVED, listener);
    if (previous) host.window = previous;
    else delete host.window;
  }
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

test('afterDraftSave clears a deleted file and keeps changed and new after the send', async () => {
  const deleted = {
    project: 102047,
    status: 'deleted',
    inLocalStorage: true as boolean | undefined,
    level: 2,
    folder: 'aura',
    shortName: 'gone',
    extension: '.ts',
  };
  const untouched = { project: 102047, shortName: 'keep' };
  const storFiles: Record<string, IPanelStorFile | undefined> = { gone: deleted, keep: untouched };
  const calls: string[] = [];
  await afterDraftSave(deleted, {
    setLocal: async (file, content) => { calls.push(`setLocal:${file.shortName}:${String(content)}`); },
    setCache: async (file, content) => { calls.push(`setCache:${file.shortName}:${String(content)}`); },
    deleteModels: (file) => { calls.push(`deleteModels:${file.shortName}`); },
    removeFromFiles: (file) => {
      calls.push(`removeFromFiles:${file.shortName}`);
      delete storFiles[file.shortName ?? ''];
    },
    resetRenameOrigin: () => { calls.push('resetRenameOrigin'); },
  });
  assert.equal(deleted.inLocalStorage, false);
  assert.deepEqual(calls, [
    'setLocal:gone:null',
    'setCache:gone:null',
    'deleteModels:gone',
    'removeFromFiles:gone',
  ]);
  assert.deepEqual(collectEditedFiles(storFiles, 102047), []);

  const changed = {
    project: 102047,
    status: 'changed',
    inLocalStorage: true as boolean | undefined,
    shortName: 'a',
  };
  const changedCalls: string[] = [];
  await afterDraftSave(changed, {
    setLocal: async (file, content) => { changedCalls.push(`setLocal:${file.shortName}:${String(content)}`); },
    setCache: async () => { changedCalls.push('setCache'); },
    deleteModels: () => { changedCalls.push('deleteModels'); },
    removeFromFiles: () => { changedCalls.push('removeFromFiles'); },
    resetRenameOrigin: () => { changedCalls.push('resetRenameOrigin'); },
  });
  assert.deepEqual(changedCalls, ['setLocal:a:null']);
  assert.equal(changed.status, 'changed');
  assert.equal(changed.inLocalStorage, false);

  const created = {
    project: 102047,
    status: 'new',
    inLocalStorage: true as boolean | undefined,
    shortName: 'b',
  };
  await afterDraftSave(created, {
    setLocal: async () => {},
    setCache: async () => {},
    deleteModels: () => {},
    removeFromFiles: () => {},
    resetRenameOrigin: () => {},
  });
  assert.equal(created.status, 'new');
  assert.equal(created.inLocalStorage, false);
});

test('afterDraftSave resets the origin of a renamed file and keeps it renamed', async () => {
  const renamed = {
    project: 102047,
    status: 'renamed',
    inLocalStorage: true as boolean | undefined,
    shortName: 'card',
  };
  const calls: string[] = [];
  await afterDraftSave(renamed, {
    setLocal: async (file, content) => { calls.push(`setLocal:${file.shortName}:${String(content)}`); },
    setCache: async () => { calls.push('setCache'); },
    deleteModels: () => { calls.push('deleteModels'); },
    removeFromFiles: () => { calls.push('removeFromFiles'); },
    resetRenameOrigin: (file) => { calls.push(`resetRenameOrigin:${file.shortName}`); },
  });
  assert.deepEqual(calls, ['resetRenameOrigin:card', 'setLocal:card:null']);
  assert.equal(renamed.status, 'renamed');
  assert.equal(renamed.inLocalStorage, false);
});

test('storeCapturedDraftText writes the captured string and reports a failed write', async () => {
  const host = globalThis as unknown as {
    mls: { stor: { localStor?: { setContent: (file: IPanelStorFile, value: { contentType?: string; content: string | null }) => Promise<boolean> } } };
  };
  const previous = host.mls.stor.localStor;
  const file: IPanelStorFile = {
    project: 102047,
    level: 2,
    shortName: 'page',
    folder: 'web',
    extension: '.ts',
    status: 'nochange',
  };
  const written: string[] = [];
  const logged: unknown[][] = [];
  const previousError = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  host.mls.stor.localStor = {
    setContent: async (_file, value) => {
      assert.equal(value.contentType, 'string');
      if (value.content !== null) written.push(value.content);
      return true;
    },
  };
  try {
    assert.equal(await storeCapturedDraftText(file, 'published'), true);
    assert.deepEqual(written, ['published']);
    assert.equal(file.status, 'nochange');
    host.mls.stor.localStor = { setContent: async () => false };
    assert.equal(await storeCapturedDraftText(file, 'published'), false);
    host.mls.stor.localStor = {
      setContent: async () => { throw new Error('Object not found in IndexedDB'); },
    };
    assert.equal(await storeCapturedDraftText(file, 'published'), false);
    assert.equal(logged.length, 2);
    assert.ok(logged.every((args) => args[1] === 'page'));
  } finally {
    console.error = previousError;
    host.mls.stor.localStor = previous;
  }
});

function moduleConfig(ordersNav: string, extraModule: boolean): string {
  const modules: unknown[] = [
    {
      moduleId: 'orders',
      navigation: [{ id: 'orders', label: ordersNav }],
      shellMode: 'spa',
    },
    {
      moduleId: 'billing',
      navigation: [{ id: 'billing', label: 'Billing' }],
    },
  ];
  if (!extraModule) modules.splice(1, 1);
  return JSON.stringify({
    studio: { defaultDraft: 'team-102047' },
    projects: {
      '102047': {
        root: '../mls-102047',
        modules,
        persistenceModules: [{ moduleId: 'orders', tableDefsDir: './keep' }],
      },
      '102099': { modules: [{ moduleId: 'other', navigation: [{ id: 'other' }] }] },
    },
  });
}

test('discardModule sends the four paths, swaps only that module block, and undoes its local copies', async () => {
  const current = moduleConfig('Draft orders', true);
  const published = moduleConfig('Published orders', true);
  const publishedParsed = JSON.parse(published) as {
    projects: { '102047': { modules: { moduleId: string; navigation: { label: string }[] }[] } };
  };
  publishedParsed.projects['102047'].modules[0]?.navigation.push({ id: 'extra', label: 'Published extra' });
  const publishedJson = JSON.stringify(publishedParsed);

  const oldNew: IPanelStorFile = {
    project: 102047, status: 'new', shortName: 'agent', level: 1, folder: 'orders_old', extension: '.ts',
  };
  const localChanged: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders/pipeline', extension: '.ts',
  };
  const otherModule: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'bill', level: 2, folder: 'billing', extension: '.ts',
  };
  const clean: IPanelStorFile = {
    project: 102047, status: 'nochange', shortName: 'kept', level: 2, folder: 'orders', extension: '.ts',
  };
  const storFiles: Record<string, IPanelStorFile> = {
    old: oldNew,
    local: localChanged,
    other: otherModule,
    clean,
  };
  const calls: string[] = [];
  let saved = '';
  await discardModule({
    fetchImpl: async (_input, init) => {
      calls.push('restore');
      const body = JSON.parse(init.body) as { action: string; project: number; draft: string; ref: string; paths: string[] };
      assert.equal(body.action, 'draftRestorePaths');
      assert.equal(body.project, 102047);
      assert.equal(body.draft, 'team-102047');
      assert.equal(body.ref, 'main');
      assert.deepEqual(body.paths, ['l1/orders', 'l1/orders_old', 'l2/orders', 'l4/orders']);
      return jsonResponse({ statusCode: 200, status: 'restored', paths: body.paths, head: 'abc' });
    },
    saveL5File: async (project, shortName, content, comment) => {
      calls.push('save');
      assert.equal(project, 102047);
      assert.equal(shortName, 'config');
      assert.equal(comment, 'discard module orders');
      saved = content;
      return true;
    },
    undoFile: async (file) => {
      calls.push(`undo:${file.level}/${file.folder}/${file.shortName}`);
      if (file.status === 'new') delete storFiles.old;
      file.inLocalStorage = false;
      file.status = 'nochange';
    },
    storFiles,
    reloadLive: async () => { calls.push('reload'); },
  }, 102047, 'team-102047', 'orders', current, publishedJson);

  assert.deepEqual(calls, [
    'restore',
    'save',
    'undo:1/orders_old/agent',
    'undo:2/orders/pipeline/page',
    'reload',
  ]);
  assert.equal(storFiles.old, undefined);
  assert.equal(otherModule.inLocalStorage, true);
  assert.equal(clean.status, 'nochange');
  const written = JSON.parse(saved) as {
    studio: { defaultDraft: string };
    projects: Record<string, {
      root?: string;
      persistenceModules?: { moduleId: string }[];
      modules: { moduleId: string; navigation: unknown; shellMode?: string }[];
    }>;
  };
  const project = written.projects['102047'];
  assert.ok(project);
  assert.equal(written.studio.defaultDraft, 'team-102047');
  assert.equal(project.root, '../mls-102047');
  assert.deepEqual(project.persistenceModules, [{ moduleId: 'orders', tableDefsDir: './keep' }]);
  assert.deepEqual(project.modules[0], {
    moduleId: 'orders',
    navigation: [{ id: 'orders', label: 'Published orders' }, { id: 'extra', label: 'Published extra' }],
    shellMode: 'spa',
  });
  assert.deepEqual(project.modules[1], {
    moduleId: 'billing',
    navigation: [{ id: 'billing', label: 'Billing' }],
  });
  assert.deepEqual(written.projects['102099'], JSON.parse(current).projects['102099']);
  assert.equal(modulePendingCount([
    { path: 'l2/orders/pipeline/a.ts', inBrowser: true, inDraft: false, hasError: false },
    { path: 'l1/orders_old/agent.ts', inBrowser: true, inDraft: true, hasError: false },
    { path: 'l2/billing/bill.ts', inBrowser: false, inDraft: true, hasError: false },
    { path: 'l2/ordersExtra/no.ts', inBrowser: true, inDraft: false, hasError: false },
  ], 'orders'), 2);
});

test('discardModule shows the server reason and does not touch config or local copies', async () => {
  const calls: string[] = [];
  await assert.rejects(
    () => discardModule({
      fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
      saveL5File: async () => { calls.push('save'); return true; },
      undoFile: async () => { calls.push('undo'); },
      storFiles: {
        a: { project: 102047, status: 'new', shortName: 'agent', level: 1, folder: 'orders_old', extension: '.ts' },
      },
      reloadLive: async () => { calls.push('reload'); },
    }, 102047, 'user-ada_example_com', 'orders', moduleConfig('Draft', true), moduleConfig('Published', true)),
    /draft\.not_owner/,
  );
  assert.deepEqual(calls, []);
});

test('1016 pipeline files open closed, one level line, and only the children of an open node', () => {
  const files = Array.from({ length: 1016 }, (_, index) => ({
    shortPath: `l2/comandaRestaurante/pipeline/agentDefsL2/file${index}.ts`,
    hasError: false,
  }));
  const pending = pendingFiles(files, []);
  const tree = buildDraftTree(pending);
  assert.equal(tree.length, 1);
  assert.equal(tree[0].name, 'l2');
  assert.equal(tree[0].kind, 'level');
  assert.equal(tree[0].count, 1016);
  assert.equal(tree[0].inBrowser, 1016);
  assert.equal(tree[0].children[0].kind, 'module');
  assert.equal(tree[0].children[0].name, 'comandaRestaurante');

  const closed = visibleTreeRows(tree, new Set());
  assert.equal(closed.length, 1);
  assert.equal(closed[0].name, 'l2');
  assert.equal(closed.filter((row) => row.kind === 'file').length, 0);

  const opened = visibleTreeRows(tree, new Set(['l2']));
  assert.deepEqual(opened.map((row) => row.name), ['l2', 'comandaRestaurante']);

  const moduleOpen = visibleTreeRows(tree, new Set(['l2', 'l2/comandaRestaurante']));
  assert.deepEqual(moduleOpen.map((row) => row.name), ['l2', 'comandaRestaurante', 'pipeline']);
  assert.equal(moduleOpen.filter((row) => row.kind === 'file').length, 0);

  const folderOpen = visibleTreeRows(tree, new Set([
    'l2',
    'l2/comandaRestaurante',
    'l2/comandaRestaurante/pipeline',
    'l2/comandaRestaurante/pipeline/agentDefsL2',
  ]));
  assert.equal(folderOpen.filter((row) => row.kind === 'file').length, 1016);

  assert.deepEqual(actionCounts(files, []), { save: 1016, publish: 0, discard: 1016 });

  const twoLevels = buildDraftTree(pendingFiles(
    [{ shortPath: 'l2/comandaRestaurante/pipeline/a.ts', hasError: true }],
    ['l4/outro/b.ts', 'l2/comandaRestaurante/pipeline/a.ts'],
  ));
  const levelLines = visibleTreeRows(twoLevels, new Set());
  assert.deepEqual(levelLines.map((row) => row.name), ['l2', 'l4']);
  assert.equal(levelLines[0].withError, 1);
  assert.equal(levelLines[0].inBrowser, 1);
  assert.equal(levelLines[0].inDraft, 1);
  assert.equal(levelLines[1].inDraft, 1);
  assert.equal(levelLines[1].inBrowser, 0);
  assert.deepEqual(
    actionCounts(
      [{ shortPath: 'l2/comandaRestaurante/pipeline/a.ts', hasError: true }],
      ['l4/outro/b.ts', 'l2/comandaRestaurante/pipeline/a.ts'],
    ),
    { save: 1, publish: 2, discard: 2 },
  );
});

test('1016 in the browser and 234 in the draft: Meu (1016 / 1250), l1 (238 / 472), actions on the selected node', () => {
  const browser = [
    ...Array.from({ length: 238 }, (_, index) => ({ shortPath: `l1/orders/b${index}.ts`, hasError: false })),
    ...Array.from({ length: 778 }, (_, index) => ({ shortPath: `l2/orders/b${index}.ts`, hasError: false })),
  ];
  const draft = Array.from({ length: 234 }, (_, index) => `l1/orders/d${index}.ts`);
  const mineFiles = pendingFiles(browser, draft);
  const otherFiles = pendingFiles([], ['l4/menu/a.ts', 'l4/menu/b.ts']);
  const tree = buildPanelTree('Rascunho', [
    {
      id: 'mine',
      name: 'Meu',
      mine: true,
      branch: 'user/ada@example.com',
      ahead: 4,
      behind: 2,
      files: mineFiles,
    },
    {
      id: 'user/santiago@example.com',
      name: 'Santiago',
      mine: false,
      branch: 'user/santiago@example.com',
      ahead: 1,
      behind: 0,
      owner: 'santiago@example.com',
      files: otherFiles,
    },
  ], 'Rascunhos sem dono');

  const closed = visibleTreeRows([tree], new Set(['draft']));
  assert.deepEqual(closed.map((row) => row.name), ['Rascunho', 'Meu', 'Santiago']);
  const meu = closed.find((row) => row.name === 'Meu');
  assert.ok(meu);
  assert.equal(draftCountText(meu), '(1016 / 1250)');
  const santiago = closed.find((row) => row.name === 'Santiago');
  assert.ok(santiago);
  assert.equal(draftCountText(santiago), '(2)');
  assert.equal(santiago.showUnsaved, false);

  const opened = visibleTreeRows([tree], new Set(['draft', 'mine']));
  const l1 = opened.find((row) => row.name === 'l1');
  assert.ok(l1);
  assert.equal(draftCountText(l1), '(238 / 472)');
  assert.equal(opened.some((row) => row.name === 'orders'), false);

  const mine = findDraftNode([tree], 'mine');
  assert.ok(mine);
  assert.equal(mine.branch, 'user/ada@example.com');
  assert.deepEqual(draftNodeActions(mine), ['makeDefault', 'syncPublished']);

  const moduleNode = findDraftNode([tree], 'mine/l1/orders');
  assert.ok(moduleNode);
  assert.equal(moduleNode.kind, 'module');
  assert.deepEqual(draftNodeActions(moduleNode), ['discardModule']);

  const other = findDraftNode([tree], 'user/santiago@example.com');
  assert.ok(other);
  assert.deepEqual(draftNodeActions(other), ['view', 'experiment']);
  assert.equal(draftCountText(other), '(2)');
});

function pendingPaths(prefix: string, count: number): IPendingFile[] {
  return pendingFiles([], Array.from({ length: count }, (_, index) => `${prefix}/f${index}.ts`));
}

function personInput(
  id: string,
  name: string,
  owner: string | null,
  files: IPendingFile[],
): IPanelPersonInput {
  return { id, name, mine: false, branch: id, ahead: 0, behind: 0, owner, files };
}

test('empty other drafts hide, and drafts without an owner become one closed group', () => {
  const mine: IPanelPersonInput = {
    id: 'mine',
    name: 'Meu',
    mine: true,
    branch: 'user/me',
    ahead: 0,
    behind: 0,
    owner: 'me@example.com',
    files: [],
  };
  const tree = buildPanelTree('Rascunho', [
    mine,
    personInput('user/membro', 'membro.102047@runtime.test', 'membro.102047@runtime.test', []),
    personInput('user/old-a', 'Pessoa desconhecida', null, []),
    personInput('user/old-b', 'Pessoa desconhecida', null, []),
    personInput('user/old-c', 'Pessoa desconhecida', null, pendingPaths('l2/c', 139)),
    personInput('user/old-d', 'Pessoa desconhecida', null, pendingPaths('l2/d', 139)),
    personInput('user/old-e', 'Pessoa desconhecida', null, pendingPaths('l2/e', 139)),
    personInput('team/102047', 'Time', 'team', []),
  ], 'Rascunhos sem dono');

  const closed = visibleTreeRows([tree], new Set(['draft']));
  const below = closed.filter((row) => row.depth === 1);
  assert.deepEqual(
    below.map((row) => `${row.name} ${draftCountText(row)}`),
    ['Meu (0 / 0)', 'Rascunhos sem dono (3)'],
  );
  assert.equal(below[1].expandable, true);

  const group = findDraftNode([tree], 'unowned');
  assert.ok(group);
  assert.equal(group.kind, 'group');
  assert.deepEqual(draftNodeActions(group), []);
  assert.deepEqual(group.children.map((child) => child.name), [
    'Pessoa desconhecida',
    'Pessoa desconhecida',
    'Pessoa desconhecida',
  ]);
  assert.deepEqual(group.children.map((child) => draftCountText(child)), ['(139)', '(139)', '(139)']);
  for (const child of group.children) {
    assert.deepEqual(draftNodeActions(child), ['view', 'experiment']);
  }

  const opened = visibleTreeRows([tree], new Set(['draft', 'unowned']));
  assert.equal(opened.filter((row) => row.depth === 2).length, 3);
});

test('a person with an owner shows the email, and a team with changes stays', () => {
  const tree = buildPanelTree('Rascunho', [
    {
      id: 'mine',
      name: 'Meu',
      mine: true,
      branch: 'user/me',
      ahead: 0,
      behind: 0,
      files: [],
    },
    personInput('user/membro', 'membro.102047@runtime.test', 'membro.102047@runtime.test', pendingPaths('l2/m', 2)),
    personInput('team/102047', 'Time', 'team', pendingPaths('l2/t', 1)),
  ], 'Rascunhos sem dono');
  const closed = visibleTreeRows([tree], new Set(['draft']));
  assert.deepEqual(
    closed.filter((row) => row.depth === 1).map((row) => row.name),
    ['Meu', 'membro.102047@runtime.test', 'Time'],
  );
  const email = findDraftNode([tree], 'user/membro');
  assert.ok(email);
  assert.deepEqual(draftNodeActions(email), ['view', 'experiment']);
  assert.equal(findDraftNode([tree], 'unowned'), null);
});

test('draftCountText counts a file edited after a save once in the total', () => {
  const tree = buildPanelTree('Draft', [{
    id: 'mine',
    name: 'Mine',
    mine: true,
    branch: 'user/ada',
    ahead: 0,
    behind: 0,
    files: [
      { path: 'l2/orders/a.ts', inBrowser: true, inDraft: true, hasError: false },
      { path: 'l2/orders/b.ts', inBrowser: true, inDraft: false, hasError: false },
      { path: 'l2/orders/c.ts', inBrowser: false, inDraft: true, hasError: false },
    ],
  }], 'Drafts without owner');
  const mine = findDraftNode([tree], 'mine');
  assert.ok(mine);
  assert.equal(draftCountText(mine), '(2 / 3)');
});
