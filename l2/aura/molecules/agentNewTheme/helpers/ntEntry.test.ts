/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntEntry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { ntParseEntryPrompt, ntStripMention } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntEntry.js';

const AGENT = 'agentNewTheme';
// Stand-in for mls.common.safeParseArgs: tolerates JS-object syntax, THROWS on prose.
const parseArgs = (raw: string): Record<string, unknown> => {
  const match = raw.match(/^\{\s*prompt\s*:\s*'((?:[^'\\]|\\.)*)'\s*\}$/);
  if (!match) throw new Error('Invalid args format, cannot parse.');
  return { prompt: match[1] };
};

// The real prose that failed in the Studio before this helper existed.
const PROSE = "Tema brutalismo chamado brutal. Fundo de página claro e sólido, background: #f5f5f5. Cantos retos, raio 0.";

test('prose is the prompt (the mention was already stripped by the runtime)', () => {
  assert.equal(ntParseEntryPrompt(PROSE, AGENT, parseArgs), PROSE);
});

test('the object form is still accepted', () => {
  assert.equal(ntParseEntryPrompt("{ prompt: 'a soft neumorphic theme' }", AGENT, parseArgs), 'a soft neumorphic theme');
});

test("'@@ agentNewTheme <prose>' leaves the agent name behind — strip it", () => {
  // the runtime only removes the first space-delimited token, i.e. the bare '@@'
  assert.equal(ntParseEntryPrompt(`${AGENT} ${PROSE}`, AGENT, parseArgs), PROSE);
  assert.equal(ntParseEntryPrompt(`@@${AGENT} ${PROSE}`, AGENT, parseArgs), PROSE);
  assert.equal(ntStripMention(`@@ ${AGENT}`, AGENT), '');
});

test('a bare mention means "ask me everything"', () => {
  assert.equal(ntParseEntryPrompt('', AGENT, parseArgs), '');
  assert.equal(ntParseEntryPrompt('   ', AGENT, parseArgs), '');
  assert.equal(ntParseEntryPrompt('@@someOtherAgent', AGENT, parseArgs), '');
});

test('a malformed object degrades to prose instead of killing the task', () => {
  const broken = "{ prompt: 'unterminated";
  assert.equal(ntParseEntryPrompt(broken, AGENT, parseArgs), broken);
});

test('an object without a prompt key carries no description', () => {
  const objectParser = (): Record<string, unknown> => ({ page: '_102040_/l2/molecules/g/x' });
  assert.equal(ntParseEntryPrompt('{ page: "x" }', AGENT, objectParser), '');
});

test('a class name in the prose is not mistaken for the agent name', () => {
  const text = 'agentNewThemeStyle should not be stripped';
  assert.equal(ntParseEntryPrompt(text, AGENT, parseArgs), text);
});
