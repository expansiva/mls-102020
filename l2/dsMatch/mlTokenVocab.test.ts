/// <mls fileReference="_102020_/l2/dsMatch/mlTokenVocab.test.ts" enhancement="_blank" />

// Tests for the pure parts of mlTokenVocab.ts (usage-table parsing + vocab merge/hash).
// No `mls` runtime. Exposes `runMlTokenVocabTests()`.

import { parseMlTokensFromUsage, mergeVocab, mlVocabHash, type MlToken } from '/_102020_/l2/dsMatch/mlTokenVocab.js';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`[mlTokenVocab.test] FAIL: ${msg}`);
}

// Mirrors the real usage-skill "## Design Tokens" markdown (backticks around token/default).
const usage = [
    '## Design Tokens',
    '',
    '| Token | Default | Purpose |',
    '|-------|---------|---------|',
    '| `--ml-on-surface` | `#1c1b1f` | Primary text |',
    '| `--ml-error` | `#ef4444` | Error color |',
    '| `--ml-shadow-1` | `0 1px 3px rgba(0,0,0,0.1)` | Subtle shadow |',
    '| `--ml-on-surface` | `#000` | dup should be ignored |',
    '| not-a-token | x | y |',
].join('\n');

export function runMlTokenVocabTests(): { passed: number } {
    let passed = 0;

    // 1. parse: only --ml-* rows, strip backticks, keep description, dedupe, skip header/separator.
    {
        const tokens = parseMlTokensFromUsage(usage);
        assert(tokens.length === 3, `expected 3 tokens, got ${tokens.length}: ${JSON.stringify(tokens.map(t => t.token))}`);
        const onSurface = tokens.find(t => t.token === '--ml-on-surface')!;
        assert(onSurface.default === '#1c1b1f' && onSurface.description === 'Primary text', `on-surface parsed wrong: ${JSON.stringify(onSurface)}`);
        const shadow = tokens.find(t => t.token === '--ml-shadow-1')!;
        assert(shadow.default === '0 1px 3px rgba(0,0,0,0.1)', `shadow default wrong (pipe-free value): ${shadow.default}`);
        passed++;
    }

    // 2. mergeVocab: union by name, first wins, sorted.
    {
        const a: MlToken[] = [{ token: '--ml-primary', default: '#3b82f6', description: 'Primary' }];
        const b: MlToken[] = [{ token: '--ml-primary', default: '#000', description: 'other' }, { token: '--ml-error', default: '#ef4444', description: 'Error' }];
        const merged = mergeVocab([a, b]);
        assert(merged.length === 2, `expected 2, got ${merged.length}`);
        assert(merged[0].token === '--ml-error' && merged[1].token === '--ml-primary', 'not sorted');
        assert(merged[1].default === '#3b82f6', 'first-wins broken on --ml-primary');
        passed++;
    }

    // 3. mlVocabHash: stable + order-independent (keyed by token names).
    {
        const v1: MlToken[] = [{ token: '--ml-a', default: '', description: '' }, { token: '--ml-b', default: '', description: '' }];
        const v2: MlToken[] = [{ token: '--ml-b', default: '', description: '' }, { token: '--ml-a', default: '', description: '' }];
        assert(mlVocabHash(v1) === mlVocabHash(v2), 'hash should be order-independent');
        assert(mlVocabHash(v1) !== mlVocabHash([{ token: '--ml-a', default: '', description: '' }]), 'hash should differ on token set');
        passed++;
    }

    console.log(`[mlTokenVocab.test] OK — ${passed} cases`);
    return { passed };
}
