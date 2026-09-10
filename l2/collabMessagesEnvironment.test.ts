/// <mls fileReference="_102020_/l2/collabMessagesEnvironment.test.ts" enhancement="_blank" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'collabMessagesEnvironment.ts'),
    'utf8',
);

test('studio environment spreads the 102025 base and still declares the 7 blocks', () => {
    assert.match(
        source,
        /from\s+['"]\/_102025_\/l2\/collabMessagesEnvironmentBase\.js['"]/,
    );
    assert.match(source, /\.\.\.collabMessagesEnvironmentBase/);
    assert.match(source, /notifications:\s*notificationsRuntime/);
    assert.match(source, /agents:\s*\{/);
    assert.match(source, /tasks:\s*\{/);
    assert.match(source, /apps:\s*\{/);
    assert.match(source, /config:\s*\{/);
    assert.match(source, /getMenuMode:\s*\(\)\s*=>\s*'custom'/);
    assert.match(source, /generateSvgAvatarEnabled:\s*\(\)\s*=>\s*true/);
    assert.doesNotMatch(source, /async function getAgents\b/);
    assert.doesNotMatch(source, /async function getIntegrationsOpenClaw\b/);
    assert.doesNotMatch(source, /async function getArgsToBots\b/);
});
