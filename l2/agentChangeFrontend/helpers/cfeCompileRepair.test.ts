/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCompileRepair.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAX_MODULE_COMPILE_REPAIRS, compileRepairSlotArgs, defsRefForGeneratedTs, describeCompileRepairPlan,
  groupModuleCompileErrors, partitionModuleCompileErrors,
  compileErrorRef, planModuleCompileRepair,
} from './cfeCompileRepair.js';

// Os 15 erros REAIS do run fe2 do petShop (22/08 01:59Z), no formato que compileModuleClosure produz
// (`${ref}: ${erro}`) — 5 arquivos, 4 famílias.
const FE2_ERRORS = [
  "_102047_/l2/petShop/web/desktop/page11/consultPetHistoryAndPendingServices.ts: error TS2353: Object literal may only specify known properties, and ''intent…serviceImages.label'' does not exist in type",
  "_102047_/l2/petShop/web/desktop/page11/petServiceOverviewView.ts: error TS7023: 'renderRecord' implicitly has return type 'any'",
  "_102047_/l2/petShop/web/desktop/page11/petServiceOverviewView.ts: error TS7024: Function implicitly has return type 'any'",
  "_102047_/l2/petShop/web/desktop/page21/businessHoursCatalogue.ts: error TS2322: Type 'string' is not assignable",
  "_102047_/l2/petShop/web/desktop/page21/recordInStoreServiceAttendance.ts: error TS2339: Property 'inStorePaymentId' does not exist",
  "_102047_/l2/petShop/web/desktop/page31/consultInstitutionalHome.ts: error TS2322: Type 'string' is not assignable",
];

test('groupModuleCompileErrors agrupa por arquivo e não perde erro sem ref', () => {
  const byRef = groupModuleCompileErrors(FE2_ERRORS);
  assert.equal(byRef.size, 5);
  assert.equal(byRef.get('_102047_/l2/petShop/web/desktop/page11/petServiceOverviewView.ts')!.length, 2);
  // O prefixo `<ref>: ` sai; o texto do tsc fica verbatim (é o que o repair vai reler do disco).
  assert.match(byRef.get('_102047_/l2/petShop/web/desktop/page21/businessHoursCatalogue.ts')![0], /^error TS2322:/);
  // Um erro sem ref (falha de leitura do modelo, por ex.) não pode desaparecer.
  const orphan = groupModuleCompileErrors(['compile worker unavailable']);
  assert.deepEqual([...orphan.keys()], ['']);
});

test('defsRefForGeneratedTs mapeia página e organismo (o itemId é obrigatório no organismo)', () => {
  assert.deepEqual(defsRefForGeneratedTs('_102047_/l2/petShop/web/desktop/page11/x.ts'),
    { defPath: '_102047_/l2/petShop/web/desktop/page11/x.defs.ts' });
  // Sem itemId o slot reescreveria o PRIMEIRO organismo em vez do que quebrou.
  assert.deepEqual(defsRefForGeneratedTs('_102047_/l2/petShop/web/desktop/page11/x_O2.ts'),
    { defPath: '_102047_/l2/petShop/web/desktop/page11/x.defs.ts', itemId: 'O2' });
  // Nem defs nem teste são alvo de repair.
  assert.equal(defsRefForGeneratedTs('_102047_/l2/petShop/web/desktop/page11/x.defs.ts'), null);
  assert.equal(defsRefForGeneratedTs('_102047_/l2/petShop/web/desktop/page11/x.test.ts'), null);
});

test('planModuleCompileRepair: um slot por ARQUIVO, e o que não tem defs não vira slot', () => {
  // O page31 do incidente sem defs no disco: nenhum item do pipeline o regenera.
  const defsExists = (defPath: string): boolean => !defPath.includes('/page31/');
  const plan = planModuleCompileRepair(FE2_ERRORS, defsExists);
  assert.equal(plan.slots.length, 4);
  assert.equal(plan.unowned.length, 1);
  assert.match(plan.unowned[0].ref, /page31\/consultInstitutionalHome\.ts$/);
  // Os 2 erros do mesmo arquivo viajam no MESMO slot — um slot por arquivo, não por erro.
  const overview = plan.slots.find(slot => slot.ref.endsWith('petServiceOverviewView.ts'))!;
  assert.equal(overview.errors.length, 2);
  assert.equal(overview.defPath, '_102047_/l2/petShop/web/desktop/page11/petServiceOverviewView.defs.ts');
  // Ordem determinística: a mesma falha planeja a mesma rodada.
  assert.deepEqual(plan.slots.map(slot => slot.ref), [...plan.slots.map(slot => slot.ref)].sort());
});

test('planModuleCompileRepair: nada repável ⇒ nenhum slot (o gate falha, e diz por quê)', () => {
  const plan = planModuleCompileRepair(FE2_ERRORS, () => false);
  assert.equal(plan.slots.length, 0);
  assert.equal(plan.unowned.length, 5);
  const described = describeCompileRepairPlan(plan, 1);
  assert.match(described, /0 file\(s\) queued/);
  assert.match(described, /5 file\(s\) NOT repairable \(no defs on disk/);
});

test('partitionModuleCompileErrors: .test.ts is declared, shipped .ts stays blocking', () => {
  const { blocking, declared } = partitionModuleCompileErrors([
    "_102047_/l2/m/web/shared/taskHub.ts: error TS2304: Cannot find name 'x'",
    "_102047_/l2/m/web/shared/taskHub.test.ts: error TS2344: Type 'false' does not satisfy",
    'compile worker unavailable',
  ]);
  assert.deepEqual(blocking, [
    "_102047_/l2/m/web/shared/taskHub.ts: error TS2304: Cannot find name 'x'",
    'compile worker unavailable',
  ]);
  assert.deepEqual(declared, [
    "_102047_/l2/m/web/shared/taskHub.test.ts: error TS2344: Type 'false' does not satisfy",
  ]);
});

test('compileRepairSlotArgs é COMPACTO: nenhum texto de erro no prompt do step', () => {
  const plan = planModuleCompileRepair(FE2_ERRORS, () => true);
  const args = compileRepairSlotArgs(plan.slots[0], 'finalize-create-repair-r1', 2);
  const parsed = JSON.parse(args);
  assert.deepEqual(Object.keys(parsed).sort(), ['attempt', 'defPath', 'planId']);
  assert.equal(parsed.attempt, 2);   // >= 2 é o que faz o gen recomputar os erros DO DISCO
  assert.ok(!args.includes('TS2353') && !args.includes('error TS'));
  // Organismo carrega o itemId, e só ele.
  const withItem = compileRepairSlotArgs(
    { ref: 'x_O2.ts', defPath: 'x.defs.ts', itemId: 'O2', errors: [] }, 'p', 3);
  assert.deepEqual(JSON.parse(withItem), { planId: 'p', defPath: 'x.defs.ts', itemId: 'O2', attempt: 3 });
});

// ── o fluxo no finalize: falha → repair → recompila → completed|failed ───────
test('o finalize abre a rodada com orçamento, e falha igual quando ele esgota', () => {
  const src = readFileSync(new URL('../steps/finalize/agentCfeCreateFinalize.ts', import.meta.url), 'utf8');
  assert.match(src, /const attempt = readFinalizeAttempt\(step\.prompt\);/);
  assert.match(src, /if \(attempt <= MAX_MODULE_COMPILE_REPAIRS && plan\.slots\.length > 0\) \{/);
  // planIds dinâmicos por rodada: reusar 'finalize-create' travaria a segunda rodada para sempre.
  assert.match(src, /finalize-create-repair-r\$\{attempt\}/);
  assert.match(src, /finalize-create-r\$\{attempt \+ 1\}/);
  // A próxima rodada precisa dos refs que ESTA tentou reparar: o planId do slot é o da rodada (P5).
  assert.match(src, /repairing: slots\.map\(slot => slot\.ref\)/);
  // O host do fan-out precisa de interaction.input e da política de falha do CF.
  assert.match(src, /'parallel_dynamic',\s*\n\s*'in_progress',[\s\S]{0,400}'wait_after_prompt',/);
  assert.match(src, /fanout\.interaction = \{/);
  // Ordem dos intents: steps abertos antes do status completed (varredura de auto-conclusão do pai).
  assert.match(src, /createAddStepIntent\(context, parentStep, nextFinalize\),\s*\n\s*\];/);
  // Orçamento esgotado ⇒ 'failed' com a mesma contagem/severidade de antes.
  assert.match(src, /repair budget exhausted after \$\{MAX_MODULE_COMPILE_REPAIRS\} round\(s\)/);
  assert.match(src, /'failed',\s*\n\s*`MODULE-COMPILE-FAILED: \$\{partitioned\.blocking\.length\} blocking error\(s\)/);
  // addLanguage só num módulo que compila (spawna task independente; não pode sair por rodada).
  assert.match(src, /Only a CLEAN module hands off to agentAddLanguage/);
  assert.equal(MAX_MODULE_COMPILE_REPAIRS, 2);
});

// O verify por item e o closing gate produzem diagnosticos com FORMATOS DIFERENTES. Ler so o do
// closing gate mandava todo achado do verify para o mesmo balde — inclusive um .ts embarcado que nao
// compila, que tem de bloquear. (review 26/08 da task cf_gates_declaram_e_raio)
void test('compileErrorRef reads both diagnostic shapes', () => {
  assert.equal(
    compileErrorRef('_102047_/l2/todo/web/shared/taskHub.ts: TS2339 - Property x does not exist'),
    '_102047_/l2/todo/web/shared/taskHub.ts',
  );
  assert.equal(
    compileErrorRef('file://server/_102047_/l2/todo/web/shared/taskHub.test.ts - TS2344 - Type \'false\''),
    '_102047_/l2/todo/web/shared/taskHub.test.ts',
  );
  assert.equal(compileErrorRef('sem ref nenhuma'), '');
});

void test('partition: .test.ts declara, .ts embarcado bloqueia — nos dois formatos', () => {
  const split = partitionModuleCompileErrors([
    'file://server/_102047_/l2/todo/web/shared/taskHub.test.ts - TS2344 - Type \'false\'',
    'file://server/_102047_/l2/todo/web/shared/taskHub.ts - TS2339 - Property x does not exist',
    '_102047_/l2/todo/web/desktop/page11/taskHub.ts: TS1005 - expected',
  ]);
  assert.equal(split.declared.length, 1);
  assert.equal(split.blocking.length, 2);
});
