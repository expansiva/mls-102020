import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { moduleLanguagesOf, withModuleLanguages } from './moduleLanguages.js';

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

test('moduleLanguagesOf ignores the legacy languages key', () => {
    const legacy = 'export const m = {\n  "languages": ["pt-BR"]\n} as const;\n';
    assert.equal(moduleLanguagesOf(legacy), null);
});
