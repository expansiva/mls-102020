/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelCore.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { COLLAB_DRAFT_RECOUNT, draftContentCrc, rememberSentCrc } from '/_102033_/l2/cbe/studioDraftFiles.js';
import {
  afterDraftSave,
  branchForSlug,
  callExec,
  collectEditedFiles,
  COLLAB_DRAFT_DISCARD_HOLD,
  COLLAB_DRAFT_DISCARDED,
  COLLAB_DRAFT_SAVED,
  discard,
  discardModule,
  filesByShortPath,
  undoFile,
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
  siteUpdateClock,
  visibleTreeRows,
  readPublished,
  saveDefaultDraft,
  applyDraftUpload,
  draftBlockReason,
  draftFileRefusedMessage,
  draftFileTooBigMessage,
  formatDraftBlockReason,
  draftUploadLine,
  rememberOpenedDraftText,
  saveToDraft,
  slugForBranch,
  holdCapturedDraftText,
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

test('siteUpdateClock is mm:ss', () => {
  assert.equal(siteUpdateClock(0), '00:00');
  assert.equal(siteUpdateClock(59_999), '00:59');
  assert.equal(siteUpdateClock(60_000), '01:00');
  assert.equal(siteUpdateClock(-5), '00:00');
  assert.equal(siteUpdateClock(Number.NaN), '00:00');
});

test('merged clears the local copy and enables buttons before a hanging release wait', async () => {
  const file: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'a', level: 2, folder: '', extension: '.ts',
  };
  let resolveWait: (result: IDraftWaitResult) => void = () => {};
  const wait = new Promise<IDraftWaitResult>((resolve) => { resolveWait = resolve; });
  let releaseHung: () => void = () => {};
  const hung = new Promise<void>((resolve) => { releaseHung = resolve; });
  let buttons: 'busy' | 'active' = 'busy';
  const calls: string[] = [];
  const pending = publish({
    fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'merged' }),
    waitForNew: async () => {
      calls.push('wait');
      releaseHung();
      return wait;
    },
    rememberPublished: () => { calls.push('remember'); },
    onMerged: () => {
      buttons = 'active';
      calls.push('merged');
    },
    reload: () => { calls.push('reload'); },
    storFiles: { a: file },
    clearLocal: async (row) => {
      calls.push('clear');
      row.inLocalStorage = false;
      row.status = 'nochange';
    },
  }, 102047, 'team-102047', 'ship', ['l2/a.ts']);

  await hung;
  assert.equal(file.inLocalStorage, false);
  assert.equal(file.status, 'nochange');
  assert.equal(buttons, 'active');
  assert.deepEqual(calls, ['remember', 'clear', 'merged', 'wait']);

  resolveWait({ changed: true, reason: 'released' });
  assert.deepEqual(await pending, { outcome: 'merged' });
  assert.deepEqual(calls, ['remember', 'clear', 'merged', 'wait', 'reload']);
});

test('timeout and build-failed report that the draft was published and do not reload', async () => {
  for (const reason of ['timeout', 'build-failed'] as const) {
    const file: IPanelStorFile = {
      project: 102047, inLocalStorage: true, shortName: 'a', level: 2, folder: '', extension: '.ts',
    };
    const calls: string[] = [];
    const result = await publish({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'merged' }),
      waitForNew: async () => { calls.push('wait'); return { changed: false, reason }; },
      rememberPublished: () => { calls.push('remember'); },
      onMerged: () => { calls.push('merged'); },
      reload: () => { calls.push('reload'); },
      storFiles: { a: file },
      clearLocal: async (row) => {
        calls.push('clear');
        row.inLocalStorage = false;
      },
    }, 102047, 'team-102047', 'ship', ['l2/a.ts']);
    assert.deepEqual(result, { outcome: 'release-pending', reason });
    assert.equal(file.inLocalStorage, false);
    assert.deepEqual(calls, ['remember', 'clear', 'merged', 'wait']);
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

test('discard asks for a recount only after the server accepts', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const calls: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    calls.push(`recount:${detail.project}`);
  });
  host.window = windowEvents;
  try {
    await assert.rejects(
      () => discard({
        fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'BAD_DRAFT' }, 400),
        reload: () => { calls.push('reload'); },
        storFiles: {},
        clearLocal: async () => {},
      }, 102047, 'nope'),
      /BAD_DRAFT/,
    );
    assert.deepEqual(calls, []);
    await discard({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'discarded' }),
      reload: () => { calls.push('reload'); },
      storFiles: {},
      clearLocal: async () => {},
    }, 102047, 'team-102047');
    assert.deepEqual(calls, ['recount:102047', 'reload']);
  } finally {
    host.window = previous;
  }
});

test('discardModule asks for a recount only after the local undo succeeds', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const calls: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    calls.push(`recount:${detail.project}`);
  });
  host.window = windowEvents;
  const same = moduleConfig('Published', true);
  const orders: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders', extension: '.ts',
  };
  try {
    await assert.rejects(
      () => discardModule({
        fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
        saveL5File: async () => true,
        undoFile: async () => { calls.push('undo'); },
        storFiles: { orders },
        reloadLive: async () => { calls.push('reload'); },
      }, 102047, 'team-102047', 'orders', same, same),
      /draft\.not_owner/,
    );
    assert.deepEqual(calls, []);
    await discardModule({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'restored' }),
      saveL5File: async () => true,
      undoFile: async (file) => {
        calls.push('undo');
        file.inLocalStorage = false;
        file.status = 'nochange';
      },
      storFiles: { orders },
      reloadLive: async () => { calls.push('reload'); },
    }, 102047, 'team-102047', 'orders', same, same);
    assert.deepEqual(calls, ['undo', 'recount:102047', 'reload']);
  } finally {
    host.window = previous;
  }
});

test('st62 s2: accepted discard emits one collabDraftDiscarded; a refusal emits none', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    notices.push(`discarded:${detail.project}`);
  });
  host.window = windowEvents;
  try {
    await assert.rejects(
      () => discard({
        fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'BAD_DRAFT' }, 400),
        reload: () => { notices.push('reload'); },
        storFiles: {},
        clearLocal: async () => {},
      }, 102047, 'nope'),
      /BAD_DRAFT/,
    );
    assert.deepEqual(notices, []);
    await discard({
      fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'discarded' }),
      reload: () => { notices.push('reload'); },
      storFiles: {},
      clearLocal: async () => {},
    }, 102047, 'team-102047');
    assert.deepEqual(notices, ['discarded:102047', 'reload']);
  } finally {
    host.window = previous;
  }
});

test('st62 s2: discardModule holds across saveL5File and emits one collabDraftDiscarded only when it finishes', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARD_HOLD, (ev) => {
    const detail = (ev as CustomEvent<{ hold: boolean }>).detail;
    notices.push(detail.hold ? 'hold:true' : 'hold:false');
  });
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    notices.push(`discarded:${detail.project}`);
  });
  windowEvents.addEventListener(COLLAB_DRAFT_SAVED, () => { notices.push('saved'); });
  host.window = windowEvents;
  const current = moduleConfig('Draft orders', true);
  const published = moduleConfig('Published orders', true);
  const effects = {
    fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'restored' }),
    undoFile: async () => { notices.push('undo'); },
    storFiles: {},
    reloadLive: async () => { notices.push('reloadLive'); },
  };
  try {
    await assert.rejects(
      () => discardModule({
        ...effects,
        fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
        saveL5File: async () => { notices.push('save'); return true; },
      }, 102047, 'team-102047', 'orders', current, published),
      /draft\.not_owner/,
    );
    assert.deepEqual(notices, []);

    await assert.rejects(
      () => discardModule({
        ...effects,
        saveL5File: async () => {
          notices.push('save');
          windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVED, {
            detail: { project: 102047, paths: ['l5/config.json'] },
          }));
          return false;
        },
      }, 102047, 'team-102047', 'orders', current, published),
      /saveL5File refused/,
    );
    assert.deepEqual(notices, ['hold:true', 'save', 'saved', 'hold:false']);

    notices.length = 0;
    await assert.rejects(
      () => discardModule({
        ...effects,
        saveL5File: async () => { notices.push('save'); throw new Error('config write down'); },
      }, 102047, 'team-102047', 'orders', current, published),
      /config write down/,
    );
    assert.deepEqual(notices, ['hold:true', 'save', 'hold:false']);

    notices.length = 0;
    await discardModule({
      ...effects,
      saveL5File: async () => {
        notices.push('save');
        windowEvents.dispatchEvent(new CustomEvent(COLLAB_DRAFT_SAVED, {
          detail: { project: 102047, paths: ['l5/config.json'] },
        }));
        return true;
      },
    }, 102047, 'team-102047', 'orders', current, published);
    assert.deepEqual(notices, ['hold:true', 'save', 'saved', 'hold:false', 'reloadLive', 'discarded:102047']);
  } finally {
    host.window = previous;
  }
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

test('saveToDraft blocks one oversized file and clears the ones the driver wrote', async () => {
  const smallA = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'a', extension: '.ts' };
  const big = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'big', extension: '.ts' };
  const smallB = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: 'aura', shortName: 'b', extension: '.ts' };
  const cleared: string[] = [];
  const pt = '{path} tem {size}; o limite por envio é {limit}. O arquivo continua no navegador.';
  const saved = await saveToDraft(
    [smallA, big, smallB],
    'save',
    async () => {
      throw new Error('setContents: file exceeds the 2097152 byte limit: l2/big.ts (2621440 bytes)');
    },
    async (file) => { cleared.push(file.shortName ?? ''); },
  );
  assert.deepEqual(cleared, ['a', 'b']);
  assert.equal(smallA.inLocalStorage, false);
  assert.equal(smallB.inLocalStorage, false);
  assert.equal(big.inLocalStorage, true);
  assert.deepEqual(saved.blocked, [big]);
  assert.deepEqual(draftBlockReason(big), { kind: 'tooBig', path: 'l2/big.ts', bytes: 2621440, limit: 2097152 });
  assert.equal(
    draftFileTooBigMessage('l2/foto.png', 4_928_307, 2_097_152, 'pt', pt),
    'l2/foto.png tem 4,7 MB; o limite por envio é 2 MB. O arquivo continua no navegador.',
  );
});

test('saveToDraft reads a 64 MB ceiling from the error and blocks a refused part beside it', async () => {
  const limit = 64 * 1024 * 1024;
  const hugeBytes = 70 * 1024 * 1024;
  const small = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'a', extension: '.ts' };
  const huge = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'huge', extension: '.ts' };
  const refused = { project: 102047, inLocalStorage: true as boolean | undefined, level: 4, folder: 'tarefas', shortName: 'undo', extension: '.json' };
  const mismatch = { project: 102047, inLocalStorage: true as boolean | undefined, level: 4, folder: 'tarefas', shortName: 'layers', extension: '.json' };
  const cleared: string[] = [];
  const saved = await saveToDraft(
    [small, huge, refused, mismatch],
    'save',
    async () => {
      throw new Error([
        `setContents: file exceeds the ${limit} byte limit: l2/huge.ts (${hugeBytes} bytes)`,
        'setContents: l4/tarefas/undo.json part 2/3 refused: missing part; not sent',
        'setContents: l4/tarefas/layers.json refused: sha256 mismatch; not sent',
      ].join('; '));
    },
    async (file) => { cleared.push(file.shortName ?? ''); },
  );
  assert.deepEqual(cleared, ['a']);
  assert.equal(small.inLocalStorage, false);
  assert.equal(huge.inLocalStorage, true);
  assert.equal(refused.inLocalStorage, true);
  assert.equal(mismatch.inLocalStorage, true);
  assert.deepEqual(saved.blocked, [huge, refused, mismatch]);
  assert.deepEqual(draftBlockReason(huge), { kind: 'tooBig', path: 'l2/huge.ts', bytes: hugeBytes, limit });
  assert.deepEqual(draftBlockReason(refused), { kind: 'refused', path: 'l4/tarefas/undo.json', reason: 'missing part' });
  assert.deepEqual(draftBlockReason(mismatch), { kind: 'refused', path: 'l4/tarefas/layers.json', reason: 'sha256 mismatch' });
  assert.equal(
    draftFileRefusedMessage('l4/tarefas/layers.json', 'invalid gzip', '{path} no se guardó: {reason}.'),
    'l4/tarefas/layers.json no se guardó: invalid gzip.',
  );
});

test('a block saved without a language is shown in the panel language', async () => {
  const big = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'big', extension: '.ts' };
  const refused = { project: 102047, inLocalStorage: true as boolean | undefined, level: 2, folder: '', shortName: 'nope', extension: '.ts' };
  await saveToDraft(
    [big, refused],
    'autosave',
    async () => {
      throw new Error([
        'setContents: file exceeds the 2097152 byte limit: l2/big.ts (2621440 bytes)',
        'setContents: l2/nope.ts refused: missing part; not sent',
      ].join('; '));
    },
    async () => {},
  );
  const tooBig = draftBlockReason(big);
  const denial = draftBlockReason(refused);
  assert.deepEqual(tooBig, { kind: 'tooBig', path: 'l2/big.ts', bytes: 2621440, limit: 2097152 });
  assert.deepEqual(denial, { kind: 'refused', path: 'l2/nope.ts', reason: 'missing part' });
  assert.ok(tooBig && denial);
  const catalogs = {
    en: {
      fileTooBig: '{path} is {size}; the limit per send is {limit}. The file stays in the browser.',
      fileRefused: '{path} was not saved: {reason}.',
      tooBig: 'l2/big.ts is 2.5 MB; the limit per send is 2 MB. The file stays in the browser.',
      refused: 'l2/nope.ts was not saved: missing part.',
    },
    pt: {
      fileTooBig: '{path} tem {size}; o limite por envio é {limit}. O arquivo continua no navegador.',
      fileRefused: '{path} não foi salvo: {reason}.',
      tooBig: 'l2/big.ts tem 2,5 MB; o limite por envio é 2 MB. O arquivo continua no navegador.',
      refused: 'l2/nope.ts não foi salvo: missing part.',
    },
    es: {
      fileTooBig: '{path} tiene {size}; el límite por envío es {limit}. El archivo sigue en el navegador.',
      fileRefused: '{path} no se guardó: {reason}.',
      tooBig: 'l2/big.ts tiene 2,5 MB; el límite por envío es 2 MB. El archivo sigue en el navegador.',
      refused: 'l2/nope.ts no se guardó: missing part.',
    },
  };
  for (const lang of ['en', 'pt', 'es'] as const) {
    const catalog = catalogs[lang];
    assert.equal(formatDraftBlockReason(tooBig, lang, catalog.fileTooBig, catalog.fileRefused), catalog.tooBig);
    assert.equal(formatDraftBlockReason(denial, lang, catalog.fileTooBig, catalog.fileRefused), catalog.refused);
  }
});

test('a draft upload line names the file and the part, then clears when the file is done', () => {
  const en = 'Sending {file} (part {part} of {total})';
  const pt = 'Enviando {file} (parte {part} de {total})';
  const es = 'Enviando {file} (parte {part} de {total})';
  const first = applyDraftUpload(null, { project: 102047, shortPath: 'l4/tarefas/undo.json', part: 1, total: 3, done: false });
  assert.ok(first);
  assert.equal(draftUploadLine(first, en), 'Sending l4/tarefas/undo.json (part 1 of 3)');
  assert.equal(draftUploadLine(first, pt), 'Enviando l4/tarefas/undo.json (parte 1 de 3)');
  assert.equal(draftUploadLine(first, es), 'Enviando l4/tarefas/undo.json (parte 1 de 3)');
  const next = applyDraftUpload(first, { project: 102047, shortPath: 'l4/tarefas/undo.json', part: 2, total: 3, done: false });
  assert.equal(next && draftUploadLine(next, en), 'Sending l4/tarefas/undo.json (part 2 of 3)');
  assert.equal(applyDraftUpload(next, { project: 102047, shortPath: 'l4/tarefas/undo.json', part: 3, total: 3, done: true }), null);
  const other = applyDraftUpload(next, { project: 102047, shortPath: 'l2/a.ts', part: 1, total: 1, done: true });
  assert.equal(other, next);
});

test('saveToDraft restores every file when the send fails on the network', async () => {
  const files = ['a', 'b', 'c'].map((shortName) => ({
    project: 102047,
    inLocalStorage: true as boolean | undefined,
    level: 2,
    folder: '',
    shortName,
    extension: '.ts',
  }));
  let cleared = 0;
  await assert.rejects(
    () => saveToDraft(
      files,
      'save',
      async () => [{ result: false }],
      async () => { cleared += 1; },
    ),
    /setContents refused the draft save/,
  );
  assert.equal(cleared, 0);
  assert.deepEqual(files.map((file) => file.inLocalStorage), [true, true, true]);
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

test('publish merged remembers the files before the release wait', async () => {
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
  assert.deepEqual(calls, ['promote', 'remember', 'waitForNew', 'reload']);
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
  assert.deepEqual(remembered, []);
});

test('publish drops only the local rows it took, and only after the server lands', async () => {
  const taken: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'a', level: 2, folder: '', extension: '.ts',
  };
  const alsoTaken: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'b', level: 2, folder: 'aura', extension: '.ts',
  };
  const kept: IPanelStorFile = {
    project: 102047, inLocalStorage: true, shortName: 'c', level: 2, folder: 'billing', extension: '.ts',
  };
  const storFiles = { a: taken, b: alsoTaken, c: kept };
  const tempObjects: Record<string, string> = {
    [fileKey(taken)]: 'body-a',
    [fileKey(alsoTaken)]: 'body-b',
    [fileKey(kept)]: 'body-c',
  };
  const calls: string[] = [];
  const merged = await publish({
    fetchImpl: async () => {
      calls.push('promote');
      return jsonResponse({ statusCode: 200, status: 'merged' });
    },
    waitForNew: async () => {
      calls.push('wait');
      return { changed: true, reason: 'released' };
    },
    rememberPublished: () => { calls.push('remember'); },
    reload: () => { calls.push('reload'); },
    storFiles,
    clearLocal: async (file) => {
      calls.push(`clear:${file.shortName}`);
      file.inLocalStorage = false;
      file.status = 'nochange';
      delete tempObjects[fileKey(file)];
    },
  }, 102047, 'team-102047', 'ship', ['l2/a.ts', 'l2/aura/b.ts']);
  assert.deepEqual(merged, { outcome: 'merged' });
  assert.deepEqual(calls, ['promote', 'remember', 'clear:a', 'clear:b', 'wait', 'reload']);
  assert.equal(taken.inLocalStorage, false);
  assert.equal(alsoTaken.inLocalStorage, false);
  assert.equal(kept.inLocalStorage, true);
  assert.deepEqual(Object.keys(tempObjects), [fileKey(kept)]);

  taken.inLocalStorage = true;
  const failedRows: Record<string, string> = { [fileKey(taken)]: 'still' };
  const failedCalls: string[] = [];
  await assert.rejects(
    () => publish({
      fetchImpl: async () => jsonResponse({ statusCode: 409, code: 'MAIN_DIRTY' }, 409),
      waitForNew: async () => { failedCalls.push('wait'); return { changed: true, reason: 'released' }; },
      reload: () => { failedCalls.push('reload'); },
      storFiles: { a: taken },
      clearLocal: async (file) => {
        failedCalls.push('clear');
        delete failedRows[fileKey(file)];
      },
    }, 102047, 'team-102047', 'ship', ['l2/a.ts']),
    /MAIN_DIRTY/,
  );
  assert.deepEqual(failedCalls, []);
  assert.equal(failedRows[fileKey(taken)], 'still');
  assert.equal(taken.inLocalStorage, true);

  const waited: Record<string, string> = { [fileKey(taken)]: 'still' };
  const timeoutCalls: string[] = [];
  const pending = await publish({
    fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'merged' }),
    waitForNew: async () => ({ changed: false, reason: 'timeout' }),
    reload: () => { timeoutCalls.push('reload'); },
    storFiles: { a: taken },
    clearLocal: async (file) => {
      timeoutCalls.push('clear');
      delete waited[fileKey(file)];
    },
  }, 102047, 'team-102047', '', ['l2/a.ts']);
  assert.deepEqual(pending, { outcome: 'release-pending', reason: 'timeout' });
  assert.deepEqual(timeoutCalls, ['clear']);
  assert.equal(waited[fileKey(taken)], undefined);
});

test('discardModule drops only that module local rows after the restore', async () => {
  const orders: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders', extension: '.ts',
  };
  const billing: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'bill', level: 2, folder: 'billing', extension: '.ts',
  };
  const tempObjects: Record<string, string> = {
    [fileKey(orders)]: 'orders-body',
    [fileKey(billing)]: 'billing-body',
  };
  const same = moduleConfig('Published', true);
  await discardModule({
    fetchImpl: async () => jsonResponse({ statusCode: 200, status: 'restored' }),
    saveL5File: async () => { throw new Error('config should stay'); },
    undoFile: async (file) => {
      file.inLocalStorage = false;
      file.status = 'nochange';
      delete tempObjects[fileKey(file)];
    },
    storFiles: { orders, billing },
    reloadLive: async () => {},
  }, 102047, 'team-102047', 'orders', same, same);
  assert.equal(orders.inLocalStorage, false);
  assert.equal(billing.inLocalStorage, true);
  assert.equal(tempObjects[fileKey(orders)], undefined);
  assert.equal(tempObjects[fileKey(billing)], 'billing-body');

  const keptRows: Record<string, string> = { [fileKey(orders)]: 'orders-body' };
  orders.inLocalStorage = true;
  await assert.rejects(
    () => discardModule({
      fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
      saveL5File: async () => true,
      undoFile: async (file) => { delete keptRows[fileKey(file)]; },
      storFiles: { orders },
      reloadLive: async () => { throw new Error('reload should not run'); },
    }, 102047, 'team-102047', 'orders', same, same),
    /draft\.not_owner/,
  );
  assert.equal(keptRows[fileKey(orders)], 'orders-body');
  assert.equal(orders.inLocalStorage, true);
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
  assert.deepEqual(changedCalls, []);
  assert.equal(changed.status, 'changed');
  assert.equal(changed.inLocalStorage, true);

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
  assert.equal(created.inLocalStorage, true);
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
  assert.deepEqual(calls, ['resetRenameOrigin:card']);
  assert.equal(renamed.status, 'renamed');
  assert.equal(renamed.inLocalStorage, true);
});

test('save keeps the local row, and only a later edit is pending again', async () => {
  const host = globalThis as { mls?: { common?: unknown; editor?: unknown } };
  const previousCommon = host.mls?.common;
  const previousEditor = host.mls?.editor;
  if (!host.mls) host.mls = {};
  host.mls.common = {
    crc: {
      crc32: (value: string) => {
        let hash = 0;
        for (const ch of value) hash = (hash * 33 + ch.charCodeAt(0)) >>> 0;
        return hash;
      },
    },
  };
  let live = 'saved-body';
  host.mls.editor = {
    getKeyModel: (project: number, shortName: string, folder: string, level: number) =>
      `${project}/${level}/${folder}/${shortName}`,
    models: {
      '102047/2/aura/page': { ts: { model: { getValue: () => live } } },
    },
  };
  const saved = {
    project: 102047,
    status: 'changed' as const,
    inLocalStorage: true as boolean | undefined,
    level: 2,
    folder: 'aura',
    shortName: 'page',
    extension: '.ts',
  };
  const tempObjects: Record<string, string> = { [fileKey(saved)]: 'saved-body' };
  const deps = {
    setLocal: async (_file: IPanelStorFile, content: null) => {
      if (content === null) delete tempObjects[fileKey(saved)];
    },
    setCache: async () => {},
    deleteModels: () => {},
    removeFromFiles: () => {},
    resetRenameOrigin: async () => {},
  };
  try {
    holdCapturedDraftText(saved, 'saved-body');
    await afterDraftSave(saved, deps);
    assert.equal(tempObjects[fileKey(saved)], 'saved-body');
    assert.equal(saved.inLocalStorage, true);
    assert.equal(pendingFiles(localEdits({ page: saved }, 102047), []).length, 0);

    live = 'saved-body\nmore';
    assert.equal(pendingFiles(localEdits({ page: saved }, 102047), []).length, 1);

    const reloaded = {
      project: 102047,
      inLocalStorage: true as boolean | undefined,
      level: 2,
      folder: 'aura',
      shortName: 'kept',
      extension: '.ts',
      getContent: async () => 'from-draft',
    };
    tempObjects[fileKey(reloaded)] = 'from-draft';
    rememberSentCrc(
      { project: 102047, level: 2, folder: 'aura', shortName: 'kept', extension: '.ts' },
      draftContentCrc('from-draft', '.ts'),
    );
    await rememberOpenedDraftText([reloaded]);
    const pending = collectEditedFiles({ kept: reloaded }, 102047);
    assert.equal(pendingFiles(localEdits({ kept: reloaded }, 102047), []).length, 0);
    let resent = false;
    await saveToDraft(pending, 'again', async () => {
      resent = true;
      return [];
    }, async () => {});
    assert.equal(resent, false);
    assert.equal(tempObjects[fileKey(reloaded)], 'from-draft');
  } finally {
    if (host.mls) {
      host.mls.common = previousCommon;
      host.mls.editor = previousEditor;
    }
  }
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

test('st64 s1: undo of a saved change restores that path, clears the local copy, recounts and reloads', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    notices.push(`recount:${detail.project}`);
  });
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, (ev) => {
    const detail = (ev as CustomEvent<{ project: number }>).detail;
    notices.push(`discarded:${detail.project}`);
  });
  host.window = windowEvents;
  const changed: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders', extension: '.ts',
  };
  const draftPaths = ['l2/orders/page.ts', 'l2/billing/bill.ts'];
  try {
    const next = await undoFile({
      fetchImpl: async (_input, init) => {
        notices.push('fetch');
        const body = JSON.parse(init.body) as { action: string; project: number; draft: string; ref: string; paths: string[] };
        assert.equal(body.action, 'draftRestorePaths');
        assert.equal(body.project, 102047);
        assert.equal(body.draft, 'team-102047');
        assert.equal(body.ref, 'main');
        assert.deepEqual(body.paths, ['l2/orders/page.ts']);
        return jsonResponse({ statusCode: 200, status: 'restored' });
      },
      file: changed,
      clearLocal: async (file) => {
        notices.push('clear');
        file.inLocalStorage = false;
        file.status = 'nochange';
      },
      removeNew: async () => { notices.push('remove'); },
    }, 102047, 'team-102047', 'l2/orders/page.ts', true, draftPaths);
    assert.deepEqual(next, ['l2/billing/bill.ts']);
    assert.equal(changed.inLocalStorage, false);
    assert.equal(changed.status, 'nochange');
    assert.deepEqual(notices, ['fetch', 'clear', 'recount:102047', 'discarded:102047']);
  } finally {
    host.window = previous;
  }
});

test('st64 s1: undo of a saved new file removes it from the draft list', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, () => { notices.push('recount'); });
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, () => { notices.push('discarded'); });
  host.window = windowEvents;
  const created: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'new', shortName: 'fresh', level: 2, folder: 'orders', extension: '.ts',
  };
  const listed: IPanelStorFile[] = [created];
  try {
    const next = await undoFile({
      fetchImpl: async (_input, init) => {
        const body = JSON.parse(init.body) as { paths: string[] };
        assert.deepEqual(body.paths, ['l2/orders/fresh.ts']);
        notices.push('fetch');
        return jsonResponse({ statusCode: 200, status: 'restored' });
      },
      file: created,
      clearLocal: async () => { notices.push('clear'); },
      removeNew: async (file) => {
        notices.push('remove');
        const index = listed.indexOf(file);
        if (index >= 0) listed.splice(index, 1);
      },
    }, 102047, 'team-102047', 'l2/orders/fresh.ts', true, ['l2/orders/fresh.ts', 'l2/billing/bill.ts']);
    assert.deepEqual(next, ['l2/billing/bill.ts']);
    assert.deepEqual(listed, []);
    assert.deepEqual(notices, ['fetch', 'remove', 'recount', 'discarded']);
    const pending = pendingFiles([], next);
    const tree = buildDraftTree(pending);
    const fileNode = tree[0]?.children[0]?.children[0];
    assert.equal(fileNode?.path, 'l2/billing/bill.ts');
    const savedOnly = buildDraftTree(pendingFiles([], ['l2/orders/page.ts']));
    const savedNode = savedOnly[0]?.children[0]?.children[0];
    assert.ok(savedNode);
    assert.equal(savedNode.inBrowser, 0);
    assert.equal(savedNode.inDraft, 1);
    assert.deepEqual(draftNodeActions(savedNode), ['undoFile']);
  } finally {
    host.window = previous;
  }
});

test('st64 s1: a browser-only undo clears the local copy and does not call the server', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, () => { notices.push('recount'); });
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, () => { notices.push('discarded'); });
  host.window = windowEvents;
  const local: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders', extension: '.ts',
  };
  const draftPaths = ['l2/billing/bill.ts'];
  try {
    const next = await undoFile({
      fetchImpl: async () => { notices.push('fetch'); return jsonResponse({ statusCode: 200, status: 'restored' }); },
      file: local,
      clearLocal: async (file) => {
        notices.push('clear');
        file.inLocalStorage = false;
        file.status = 'nochange';
      },
      removeNew: async () => { notices.push('remove'); },
    }, 102047, 'team-102047', 'l2/orders/page.ts', false, draftPaths);
    assert.deepEqual(next, draftPaths);
    assert.equal(local.status, 'nochange');
    assert.equal(local.inLocalStorage, false);
    assert.deepEqual(notices, ['clear', 'recount']);
    assert.equal(filesByShortPath({ page: local }, 102047).get('l2/orders/page.ts'), local);
  } finally {
    host.window = previous;
  }
});

test('st64 s1: a server refusal leaves the browser copy and shows the error', async () => {
  const host = globalThis as { window?: EventTarget };
  const previous = host.window;
  const windowEvents = new EventTarget();
  const notices: string[] = [];
  windowEvents.addEventListener(COLLAB_DRAFT_RECOUNT, () => { notices.push('recount'); });
  windowEvents.addEventListener(COLLAB_DRAFT_DISCARDED, () => { notices.push('discarded'); });
  host.window = windowEvents;
  const changed: IPanelStorFile = {
    project: 102047, inLocalStorage: true, status: 'changed', shortName: 'page', level: 2, folder: 'orders', extension: '.ts',
  };
  try {
    await assert.rejects(
      () => undoFile({
        fetchImpl: async () => jsonResponse({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }, 400),
        file: changed,
        clearLocal: async () => { notices.push('clear'); },
        removeNew: async () => { notices.push('remove'); },
      }, 102047, 'team-102047', 'l2/orders/page.ts', true, ['l2/orders/page.ts']),
      /draft\.not_owner/,
    );
    assert.equal(changed.inLocalStorage, true);
    assert.equal(changed.status, 'changed');
    assert.deepEqual(notices, []);
  } finally {
    host.window = previous;
  }
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
