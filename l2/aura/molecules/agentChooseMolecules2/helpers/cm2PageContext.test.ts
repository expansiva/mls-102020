/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractPageContext, formatPageContext } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2PageContext.js';

// The real prose, from _102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.defs.ts.
const PROSE = `page: Registrar comentário em chamado aberto
actor: atendente
purpose: Documentar o andamento do atendimento em um chamado aberto.
uxExperience: processWizard
The page extends the shared base class of this workspace: the shared travels in this pipeline and already carries the states, actions and handlers the page inherits. Render the experience around that intent — do not list fields and do not list routines.`;

void test('reads the four declared lines of the prose definition', () => {
  assert.deepEqual(extractPageContext(PROSE), {
    page: 'Registrar comentário em chamado aberto',
    actor: 'atendente',
    purpose: 'Documentar o andamento do atendimento em um chamado aberto.',
    uxExperience: 'processWizard',
  });
});

void test('the closing paragraph is prose, and its own colon is never read as a label', () => {
  const context = extractPageContext(PROSE);
  // 'The page extends the shared base class of this workspace: ...' must not have overwritten `page`.
  assert.equal(context.page, 'Registrar comentário em chamado aberto');
  assert.equal(formatPageContext(context).includes('extends the shared base class'), false);
});

void test('the section leads with the declared experience shape — what rules a scenario row in or out', () => {
  const section = formatPageContext(extractPageContext(PROSE));
  assert.match(section, /## What this page is for \(declared in the target file\)/u);
  assert.match(section, /\*\*processWizard\*\*/u);
  assert.match(section, /Purpose: Documentar o andamento/u);
  assert.match(section, /Actor who uses it: atendente/u);
});

void test('a prose that declares none of the lines yields no section at all — never padded with a guess', () => {
  assert.equal(formatPageContext(extractPageContext('')), '');
  assert.equal(formatPageContext(extractPageContext('just a sentence with no labels at all')), '');
});

void test('a prose missing uxExperience degrades to what it does declare', () => {
  const section = formatPageContext(extractPageContext('page: Chamado\npurpose: Cadastro de Chamado.'));
  assert.match(section, /Page: Chamado/u);
  assert.match(section, /Purpose: Cadastro de Chamado\./u);
  assert.equal(section.includes('Experience shape'), false);
});

void test('an unknown label is ignored, not surfaced as page context', () => {
  const context = extractPageContext('somethingElse: value\npage: Chamado');
  assert.equal(context.page, 'Chamado');
  assert.equal(formatPageContext(context).includes('somethingElse'), false);
});
