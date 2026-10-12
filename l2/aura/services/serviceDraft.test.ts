/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.test.ts" enhancement="_blank" />
// The draft panel is a Lit service wired to the live stor, so it does not run in node.
// What can be pinned is the source: the panel stays behind the VM driver, Publish goes
// through the core, the three catalogs share keys, and the plugin lists this service first.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const SERVICES = fileURLToPath(new URL('.', import.meta.url));
const DRAFT = readFileSync(`${SERVICES}serviceDraft.ts`, 'utf8');
const PLUGIN = readFileSync(fileURLToPath(new URL('../../pluginCollabCoreIndex.ts', import.meta.url)), 'utf8');

/** The body of a method, from its signature to the next one at the same indentation. */
function methodOf(source: string, signature: string): string {
    const start = source.indexOf(signature);
    assert.notEqual(start, -1, `the scan found ${signature}`);
    const end = source.indexOf('\n    private ', start + signature.length);
    return source.slice(start, end === -1 ? source.length : end);
}

test('the panel renders only behind isVmDriver', () => {
    const render = methodOf(DRAFT, '\n    render()');
    const gate = render.indexOf('isVmDriver(');
    const panel = render.indexOf('_renderPanel()');
    assert.notEqual(gate, -1, 'render asks isVmDriver');
    assert.ok(panel !== -1 && gate < panel, 'the panel call sits behind the driver check');
    assert.match(render, /if\s*\(\s*!isVmDriver\(/);
});

test('Publish goes through the core publish and does not call /exec', () => {
    const handler = methodOf(DRAFT, 'private async _onPublish');
    assert.match(handler, /\bpublish\(/);
    assert.doesNotMatch(DRAFT, /['"]\/exec['"]/);
    assert.doesNotMatch(DRAFT, /callExec\(/);
});

test('save shows the blocked list that the core returns', () => {
    const handler = methodOf(DRAFT, 'private async _onSave');
    assert.match(handler, /saveToDraft\(/);
    assert.match(handler, /this\._blocked = saved\.blocked/);
});

test('en, pt and es declare the same keys', () => {
    const catalogs = DRAFT.split('const message_en')[1].split('/// **collab_i18n_end**')[0];
    const enBody = catalogs.split('const messages')[0];
    const keys = [...enBody.matchAll(/^\s{4}(\w+):/gm)].map((match) => match[1]);
    assert.ok(keys.length >= 8, 'the scan found the english keys');
    for (const key of keys) {
        const declared = catalogs.split(`${key}:`).length - 1;
        assert.equal(declared, 3, `${key} is declared in en, pt and es`);
    }
});

test('serviceDraft is on l5ServicesLeft before serviceSave', () => {
    const draftAt = PLUGIN.indexOf("widget: '_102020_/l2/aura/services/serviceDraft'");
    const saveAt = PLUGIN.indexOf("widget: '_100554_serviceSave'");
    assert.notEqual(draftAt, -1, 'serviceDraft is registered');
    assert.notEqual(saveAt, -1, 'serviceSave is registered');
    assert.ok(draftAt < saveAt, 'same priority: array order puts the draft panel first');
    const entryStart = PLUGIN.lastIndexOf('category:', draftAt);
    const entry = PLUGIN.slice(entryStart, draftAt);
    assert.match(entry, /l5ServicesLeft/);
    assert.match(entry, /priority:\s*1/);
});
