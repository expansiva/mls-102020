/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPipelineMolecules,
  cm2DefinitionKind,
  isCm2MoleculeDependsFile,
  isCm2UsageSkill,
  parsePageDefsSource,
  serializePageDefsSource,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';

// The real v2 shape, copied from _102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.defs.ts.
const PAGE_SOURCE = `/// <mls fileReference="_102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.defs.ts" enhancement="_blank"/>

export const definition = \`page: Registrar comentário em chamado aberto
actor: atendente
purpose: Documentar o andamento do atendimento em um chamado aberto.
uxExperience: processWizard
The page extends the shared base class of this workspace: the shared travels in this pipeline and already carries the states, actions and handlers the page inherits. Render the experience around that intent — do not list fields and do not list routines.\`;

export const pipeline = [
  {
    "id": "commentOpenTicket__page21__l2_page",
    "type": "l2_page",
    "outputPath": "_102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.ts",
    "defPath": "_102047_/l2/controleChamados/web/desktop/page21/commentOpenTicket.defs.ts",
    "dependsFiles": [
      "_102047_/l2/controleChamados/web/shared/commentOpenTicketDts.txt",
      "_102047_/l2/designSystem.ts"
    ],
    "dependsOn": [
      "commentOpenTicket__l2_shared"
    ],
    "skills": [
      "_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts",
      "_102020_/l4/collabux/templates/processWizard/page21.md"
    ],
    "visualStyle": {},
    "agent": "agentCfeMaterializeGen"
  }
] as const;
`;

const USAGE = '_102020_/l2/aura/molecules/skills/groupEnterText/usage.ts';
const COMPONENT = '_102040_/l2/molecules/groupentertext/ml-multiline-text.ts';

void test('reads the definition as PROSE and the pipeline as JSON', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE);
  assert.ok(parsed);
  assert.match(parsed!.definitionText, /^page: Registrar comentário em chamado aberto\n/u);
  assert.match(parsed!.definitionText, /uxExperience: processWizard/u);
  // The closing backtick is not part of the text, and neither is the ';'.
  assert.equal(parsed!.definitionText.includes('`'), false);
  assert.equal((parsed!.pipelineJson[0] as any).id, 'commentOpenTicket__page21__l2_page');
});

void test('round-trips byte-for-byte when the pipeline does not change', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  assert.equal(serializePageDefsSource(parsed, parsed.pipelineJson), PAGE_SOURCE);
});

void test('the definition cannot be rewritten — it is not even a parameter of the serializer', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const rewritten = serializePageDefsSource(parsed, applyPipelineMolecules(parsed.pipelineJson, [{ usageRef: USAGE, componentFiles: [COMPONENT] }]));
  const definitionOf = (source: string) => source.slice(source.indexOf('export const definition'), source.indexOf('export const pipeline'));
  assert.equal(definitionOf(rewritten), definitionOf(PAGE_SOURCE));
});

void test('cm2DefinitionKind tells the v1 object shape apart from the v2 prose', () => {
  assert.equal(cm2DefinitionKind(PAGE_SOURCE), 'prose');
  assert.equal(cm2DefinitionKind('export const definition = {\n  "pageId": "x"\n};\n'), 'object');
  assert.equal(cm2DefinitionKind('export const definition = [];\n'), 'object');
  assert.equal(cm2DefinitionKind('export const somethingElse = 1;'), 'none');
});

void test('refuses a v1 object definition instead of parsing it on a guess', () => {
  const v1 = 'export const definition = {\n  "pageId": "x",\n  "dataBindings": []\n};\n\nexport const pipeline = [] as const;\n';
  assert.equal(parsePageDefsSource(v1), null);
  assert.equal(parsePageDefsSource(''), null);
  assert.equal(parsePageDefsSource('export const somethingElse = {} as const;'), null);
});

void test('a definition whose prose is never closed is refused, never read past its end', () => {
  assert.equal(parsePageDefsSource('export const definition = `page: x\n\nexport const pipeline = [] as const;\n'), null);
});

void test('equips pipeline[0] with the chosen molecule and its group usage contract', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const patched = applyPipelineMolecules(parsed.pipelineJson, [{ usageRef: USAGE, componentFiles: [COMPONENT] }]);
  const entry = patched[0] as any;
  assert.ok(entry.dependsFiles.includes(COMPONENT));
  assert.ok(entry.skills.includes(USAGE));
  // What the generator put there survives, in its original order.
  assert.deepEqual(entry.dependsFiles.slice(0, 2), [
    '_102047_/l2/controleChamados/web/shared/commentOpenTicketDts.txt',
    '_102047_/l2/designSystem.ts',
  ]);
  assert.deepEqual(entry.skills.slice(0, 2), [
    '_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts',
    '_102020_/l4/collabux/templates/processWizard/page21.md',
  ]);
  // Nothing this agent adds to a pipeline array may carry a leading slash — materialize drops those.
  for (const value of [...entry.skills, ...entry.dependsFiles]) assert.equal(value.startsWith('/'), false, value);
});

void test('running twice with the same choice changes nothing (idempotent)', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const addition = { usageRef: USAGE, componentFiles: [COMPONENT] };
  const once = serializePageDefsSource(parsed, applyPipelineMolecules(parsed.pipelineJson, [addition]));
  const twice = serializePageDefsSource(parsePageDefsSource(once)!, applyPipelineMolecules(parsePageDefsSource(once)!.pipelineJson, [addition]));
  assert.equal(twice, once);
});

void test('the same set chosen in another GROUP ORDER is still byte-identical — added entries are sorted', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const a = { usageRef: USAGE, componentFiles: [COMPONENT] };
  const b = { usageRef: '_102020_/l2/aura/molecules/skills/groupViewTable/usage.ts', componentFiles: ['_102040_/l2/molecules/groupviewtable/ml-data-table.ts'] };
  const forwards = serializePageDefsSource(parsed, applyPipelineMolecules(parsed.pipelineJson, [a, b]));
  const backwards = serializePageDefsSource(parsed, applyPipelineMolecules(parsed.pipelineJson, [b, a]));
  assert.equal(forwards, backwards);
});

void test('a rerun that CHANGED its mind prunes the previous molecule instead of stacking both', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const first = applyPipelineMolecules(parsed.pipelineJson, [{ usageRef: USAGE, componentFiles: [COMPONENT] }]);
  const second = applyPipelineMolecules(first, [{
    usageRef: '_102020_/l2/aura/molecules/skills/groupViewTable/usage.ts',
    componentFiles: ['_102040_/l2/molecules/groupviewtable/ml-data-table.ts'],
  }]);
  const entry = second[0] as any;
  assert.equal(entry.dependsFiles.includes(COMPONENT), false, 'the abandoned component must be gone');
  assert.equal(entry.skills.includes(USAGE), false, 'the abandoned usage contract must be gone');
  assert.ok(entry.dependsFiles.includes('_102040_/l2/molecules/groupviewtable/ml-data-table.ts'));
  // And the generator's own entries are still there — pruning is by shape, never by position.
  assert.ok(entry.dependsFiles.includes('_102047_/l2/designSystem.ts'));
  assert.ok(entry.skills.includes('_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts'));
});

void test('choosing nothing CLEARS what a previous run had equipped', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const equipped = applyPipelineMolecules(parsed.pipelineJson, [{ usageRef: USAGE, componentFiles: [COMPONENT] }]);
  const cleared = applyPipelineMolecules(equipped, []);
  const entry = cleared[0] as any;
  assert.deepEqual(entry.dependsFiles, [
    '_102047_/l2/controleChamados/web/shared/commentOpenTicketDts.txt',
    '_102047_/l2/designSystem.ts',
  ]);
  assert.deepEqual(entry.skills, [
    '_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts',
    '_102020_/l4/collabux/templates/processWizard/page21.md',
  ]);
});

void test('only pipeline[0] is equipped — a split page\'s other items are untouched', () => {
  const twoItems = [{ id: 'a', skills: [] }, { id: 'b', skills: ['keep.ts'], dependsFiles: [] }];
  const patched = applyPipelineMolecules(twoItems, [{ usageRef: USAGE, componentFiles: [COMPONENT] }]);
  assert.deepEqual(patched[1], { id: 'b', skills: ['keep.ts'], dependsFiles: [] });
});

void test('the pruning predicates recognize this agent\'s entries and nothing else', () => {
  assert.equal(isCm2MoleculeDependsFile(COMPONENT), true);
  assert.equal(isCm2MoleculeDependsFile('_102047_/l2/controleChamados/web/shared/commentOpenTicketDts.txt'), false);
  assert.equal(isCm2MoleculeDependsFile('_102047_/l2/designSystem.ts'), false);
  assert.equal(isCm2MoleculeDependsFile('_102047_/l2/controleChamados/web/shared/commentOpenTicket.ts'), false);
  assert.equal(isCm2UsageSkill(USAGE), true);
  assert.equal(isCm2UsageSkill('_102020_/l2/agentChangeFrontend/skills/genCfePage21RenderTs.ts'), false);
  assert.equal(isCm2UsageSkill('_102020_/l4/collabux/templates/processWizard/page21.md'), false);
});
