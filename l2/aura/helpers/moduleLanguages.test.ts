import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { configModuleLanguagesOf, moduleLanguagesOf, readModuleDefaultLanguage, withConfigModuleLanguages, withModuleLanguages } from './moduleLanguages.js';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'fixtures/agendaClinica-module.defs.txt'), 'utf8');

test('moduleLanguagesOf reads NS5 languages from agendaClinica', () => {
    assert.deepEqual(moduleLanguagesOf(src), ['pt-BR']);
});

test('withModuleLanguages replaces only productLanguages', () => {
    const next = withModuleLanguages(src, ['pt-BR', 'en']);
    const marker = '"productLanguages":';
    const tail = '"defaultLanguage":';
    assert.equal(src.slice(0, src.indexOf(marker)), next.slice(0, next.indexOf(marker)));
    assert.equal(src.slice(src.indexOf(tail)), next.slice(next.indexOf(tail)));
    assert.match(next, /"productLanguages": \[\s*"pt-BR",\s*"en"\s*\]/);
    assert.match(next, /"defaultLanguage": "pt-BR"/);
    assert.match(next, /^\/\/\/ <mls fileReference=/);
    assert.match(next, /import type \{ Ns5ModuleArtifact, Ns5Readonly \}/);
    assert.match(next, /as const satisfies Ns5Readonly<Ns5ModuleArtifact>/);
    assert.match(next, /export type AgendaClinicaModuleType = typeof agendaClinicaModule;/);
    assert.match(next, /export default agendaClinicaModule;\s*$/);
    assert.deepEqual(moduleLanguagesOf(next), ['pt-BR', 'en']);
});

test('withModuleLanguages refuses a list without the default language', () => {
    assert.throws(() => withModuleLanguages(src, ['en']), /defaultLanguage/);
});

test('readModuleDefaultLanguage reads defaultLanguage from the agendaClinica fixture', async () => {
    const g = globalThis as { mls?: unknown };
    const prev = g.mls;
    g.mls = {
        stor: {
            getKeyToFile: () => 'agendaClinica',
            files: { agendaClinica: { getContent: async () => src } },
        },
    };
    try {
        assert.equal(await readModuleDefaultLanguage(102047, 'agendaClinica'), 'pt-BR');
    } finally {
        g.mls = prev;
    }
});

test('moduleLanguagesOf ignores the legacy languages key', () => {
    const legacy = 'export const m = {\n  "languages": ["pt-BR"]\n} as const;\n';
    assert.equal(moduleLanguagesOf(legacy), null);
});

// ─── l5/config.json: the list the app's language switch reads ───

const CRLF = String.fromCharCode(13, 10);
const LF = String.fromCharCode(10);

function configJson(eol: string): string {
    const config = {
        projects: {
            '102034': { modules: [{ moduleId: 'mdm' }] },
            '102047': { modules: [
                { moduleId: 'tarefas', basePath: '/tarefas', languages: ['pt-BR'], navigation: [] },
                { moduleId: 'financeiro', basePath: '/financeiro' },
            ] },
        },
    };
    return `${JSON.stringify(config, null, 2)}${LF}`.split(LF).join(eol);
}

test('configModuleLanguagesOf reads the module entry, null when it is not registered', () => {
    assert.deepEqual(configModuleLanguagesOf(configJson(LF), 102047, 'tarefas'), ['pt-BR']);
    assert.deepEqual(configModuleLanguagesOf(configJson(LF), 102047, 'financeiro'), []);
    assert.equal(configModuleLanguagesOf(configJson(LF), 102047, 'compras'), null);
    assert.equal(configModuleLanguagesOf('not json', 102047, 'tarefas'), null);
});

test('withConfigModuleLanguages replaces only languages of that module, keeping the line endings', () => {
    for (const eol of [LF, CRLF]) {
        const before = configJson(eol);
        const next = withConfigModuleLanguages(before, 102047, 'tarefas', ['pt-BR', 'ja'])!;
        assert.equal(next.includes(CRLF), eol === CRLF);
        const parsed = JSON.parse(next);
        const tarefas = parsed.projects['102047'].modules[0];
        assert.deepEqual(tarefas.languages, ['pt-BR', 'ja']);
        assert.equal(tarefas.basePath, '/tarefas');
        assert.deepEqual(parsed.projects['102047'].modules[1], { moduleId: 'financeiro', basePath: '/financeiro' });
        assert.deepEqual(parsed.projects['102034'], { modules: [{ moduleId: 'mdm' }] });
        // Same text everywhere else: only the languages lines changed.
        assert.equal(next.split(eol).length, before.split(eol).length + 1);
    }
});

test('withConfigModuleLanguages writes nothing for a module not registered, or for the same list', () => {
    assert.equal(withConfigModuleLanguages(configJson(LF), 102047, 'compras', ['pt-BR', 'ja']), null);
    assert.equal(withConfigModuleLanguages(configJson(LF), 102047, 'tarefas', ['pt-BR']), null);
});
