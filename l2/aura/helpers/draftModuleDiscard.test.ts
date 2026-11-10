/// <mls fileReference="_102020_/l2/aura/helpers/draftModuleDiscard.test.ts" enhancement="_blank" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { rememberCollabMode } from '/_102033_/l2/cbe/studioDraft.js';
import { resetVmDriverRegistration } from '/_102033_/l2/cbe/initStudio.js';
import { discardModuleInStudio } from '/_102020_/l2/aura/helpers/draftModuleDiscard.js';

const SOURCE = readFileSync(fileURLToPath(new URL('./draftModuleDiscard.ts', import.meta.url)), 'utf8');

function config(label: string): string {
    return JSON.stringify({
        projects: {
            '102047': {
                modules: [
                    { moduleId: 'orders', navigation: [{ id: 'orders', label }] },
                    { moduleId: 'billing', navigation: [{ id: 'billing', label: 'Billing' }] },
                ],
            },
        },
    });
}

test('discardModuleInStudio wires the same effects the panel used to call', () => {
    const start = SOURCE.indexOf('export async function discardModuleInStudio');
    assert.notEqual(start, -1);
    const body = SOURCE.slice(start);
    assert.match(body, /activeDraft\(\)/);
    assert.match(body, /readCurrentConfig\(project\)/);
    assert.match(body, /readPublishedConfig\(project, slug\)/);
    assert.match(SOURCE, /draft\.no_active_draft/);
    assert.match(body, /throw new Error\(NO_ACTIVE_DRAFT\)/);
    assert.match(body, /console\.error\(/);
    assert.match(SOURCE, /getHistoryContent/);
    assert.match(SOURCE, /publishedCommit\(project, slug\)/);
    assert.doesNotMatch(SOURCE, /read\.call\(driver, file, 'main'\)/);
    assert.match(body, /saveL5File\(id, shortName, content, comment\)/);
    assert.match(body, /undoFile\(file as mls\.stor\.IFileInfo\)/);
    assert.match(body, /draftFiles/);
    // Not a page reload: it enters the draft again, which republishes the draft l2 to the service worker.
    assert.match(body, /reloadLive: \(\) => loadProjectDefinitions\(project\)/);
    assert.match(body, /storFiles: mls\.stor\.files/);
    assert.match(body, /await discardModule\(/);
    assert.doesNotMatch(body, /\bcatch\b/);
});

test('discardModuleInStudio rejects when no draft is active', async () => {
    rememberCollabMode({ mode: 'production' });
    const previousFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
        called = true;
        throw new Error('fetch should not run');
    };
    try {
        await assert.rejects(
            () => discardModuleInStudio(102047, 'orders'),
            /draft\.no_active_draft/,
        );
        assert.equal(called, false);
    } finally {
        globalThis.fetch = previousFetch;
        rememberCollabMode({ mode: 'production' });
    }
});

test('discardModuleInStudio calls draftRestorePaths and saveL5File, and throws the server code', async () => {
    const current = config('Draft orders');
    const published = config('Published orders');
    const key = '102047/5//config.json';
    const file: {
        project: number;
        level: number;
        shortName: string;
        folder: string;
        extension: string;
        inLocalStorage: boolean;
        status: string;
        getContent: () => Promise<string>;
    } = {
        project: 102047,
        level: 5,
        shortName: 'config',
        folder: '',
        extension: '.json',
        inLocalStorage: false,
        status: 'nochange',
        getContent: async () => current,
    };
    const calls: string[] = [];
    let saved = '';
    const previousFetch = globalThis.fetch;
    const previousMls = (globalThis as { mls?: unknown }).mls;
    const host = globalThis as { window?: unknown; mls?: unknown };
    const hadWindow = host.window !== undefined;
    const previousWindow = host.window;
    host.window = globalThis;
    host.mls = {
        stor: {
            files: { [key]: file },
            getKeyToFile: () => key,
            localStor: {
                setContent: async (_file: unknown, info: { content?: string }) => {
                    saved = info.content ?? '';
                },
            },
            setContents: async (_files: unknown, comment: string) => {
                calls.push('save');
                assert.equal(comment, 'discard module orders');
                return true;
            },
            cache: { clearProjectsCache: async () => undefined },
            others: {
                getDefaultDriver: async () => ({
                    // The server takes only a hex commit; a branch name such as 'main' gives null.
                    getHistoryContent: async (_file: unknown, ref: string) => (/^[0-9a-f]+$/.test(ref) ? published : null),
                }),
            },
        },
    };
    globalThis.fetch = async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as { action: string; paths?: string[]; ref?: string; draft?: string };
        calls.push(body.action);
        if (body.action === 'draftRestorePaths') {
            assert.equal(body.draft, 'team-102047');
            assert.equal(body.ref, 'main');
            assert.deepEqual(body.paths, ['l1/orders', 'l1/orders_old', 'l2/orders', 'l4/orders']);
            return { ok: true, status: 200, json: async () => ({ statusCode: 200, status: 'restored', paths: body.paths, head: 'abc' }) };
        }
        if (body.action === 'draftDiff') {
            return {
                ok: true,
                status: 200,
                json: async () => ({ statusCode: 200, status: 'files', head: 'abc', main: 'abc123', files: [] }),
            };
        }
        throw new Error(`unexpected action ${body.action}`);
    };
    rememberCollabMode({ mode: 'studio', project: 102047, draft: 'team-102047' });
    try {
        await discardModuleInStudio(102047, 'orders');
        // No published commit known yet: one draftDiff finds `main`, then the restore runs.
        assert.deepEqual(calls.slice(0, 2), ['draftDiff', 'draftRestorePaths']);
        assert.ok(calls.includes('save'));
        assert.match(saved, /Published orders/);
        assert.doesNotMatch(saved, /Draft orders/);

        calls.length = 0;
        globalThis.fetch = async (_input, init) => {
            const body = JSON.parse(String(init?.body)) as { action: string };
            calls.push(body.action);
            return {
                ok: false,
                status: 400,
                json: async () => ({ statusCode: 400, code: 'NOT_OWNER', msg: 'draft.not_owner' }),
            };
        };
        await assert.rejects(
            () => discardModuleInStudio(102047, 'orders'),
            /draft\.not_owner/,
        );
        // `main` is remembered now: no second draftDiff.
        assert.deepEqual(calls, ['draftRestorePaths']);
    } finally {
        globalThis.fetch = previousFetch;
        host.mls = previousMls;
        if (hadWindow) host.window = previousWindow;
        else delete host.window;
        rememberCollabMode({ mode: 'production' });
        resetVmDriverRegistration();
    }
});
