/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateWatcher.test.ts" enhancement="_blank" />
// Source-level guards for the second live-update trigger. The watcher is bound to `mls.events` and
// to the mounted DOM (no jsdom here), so what is worth locking down is the invariant that a whole
// afternoon was lost to: this trigger must never fail SILENTLY.
//
// THE BUG THIS EXISTS FOR. The genome's molecule knob (serviceGenome._onMoleculesChanged) changes a
// page by writing the Monaco model and letting the compile pipeline carry it — it never calls
// applyLiveUpdate itself, so this watcher is the ONLY thing between that gesture and the running
// page. The result was being thrown away, so an honest refusal from the mode ("the edited file
// registers no element", "reload once to arm") reached nobody and read exactly like a silent no-op —
// the one outcome the live update is built never to produce. The editor prints the message on its
// status strip; this trigger has no strip, so the console is where it goes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const WATCHER = readFileSync(new URL('studioLiveUpdateWatcher.ts', import.meta.url), 'utf8');
const EDITOR = readFileSync(new URL('studioEditor.ts', import.meta.url), 'utf8');

/** Code lines only: a mention inside a comment is documentation, not a call. */
function codeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('*') && !line.startsWith('/*'));
}

test('the watcher keeps the live-update result instead of discarding it', () => {
  const code = codeLines(WATCHER);
  const calls = code.filter((line) => line.includes('applyLiveUpdate('));
  assert.equal(calls.length, 1, 'exactly one call site');
  assert.match(
    calls[0],
    /=\s*await applyLiveUpdate\(/u,
    'the result must be bound to a name — `await applyLiveUpdate(...)` on its own throws the answer away',
  );
});

test('a refusal is reported, because this trigger has no status strip to show it on', () => {
  const code = codeLines(WATCHER);
  assert.equal(
    code.some((line) => line.includes('!live.ok')),
    true,
    'the failure branch must exist',
  );
  assert.equal(
    code.some((line) => line.includes('console.warn') && line.includes('live.message')),
    true,
    "the mode's own sentence is what gets printed — not a generic one invented here",
  );
});

test('a change dropped before the mode runs leaves a trace too', () => {
  // The other way this trigger goes quiet: the changed file is neither the mounted page nor its
  // shared base, so `handle` returns before applyLiveUpdate is ever called. That is the correct
  // behaviour for a file edited elsewhere in the studio — and indistinguishable, from the outside,
  // from a live update that ran and did nothing. `debug` and not `warn` on purpose: it is the common
  // case and must not shout.
  const code = codeLines(WATCHER);
  assert.equal(
    code.some((line) => line.includes('console.debug') && line.includes('[liveUpdate]')),
    true,
    'the drop path must say which file it saw and which page was mounted',
  );
});

test('the editor still shows the message on its strip — the two triggers report, each its own way', () => {
  // Guards the contrast this file is about: the editor has somewhere on screen to put the sentence,
  // the watcher does not. If the editor ever stops printing it, the console becomes the only channel
  // and this test should be the thing that notices.
  assert.equal(
    codeLines(EDITOR).some((line) => line.includes('live.message')),
    true,
    'studioEditor must keep putting the live-update message on the status strip',
  );
});
