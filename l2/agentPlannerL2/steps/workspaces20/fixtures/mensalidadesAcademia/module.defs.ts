/// <mls fileReference="_102047_/l4/mensalidadesAcademia/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "mensalidadesAcademia",
  "title": "Mensalidades da academia",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "criar mensalidadesAcademia em português. academia com alunos e planos (mensal, trimestral, anual, com valor e dia de vencimento). a recepção matricula o aluno em um plano a partir de uma data. todo mês a gerência gera as mensalidades do mês para todos os alunos ativos, uma por aluno, com valor do plano e vencimento. a recepção registra pagamentos (data, valor, forma). mensalidade não paga após o vencimento fica vencida; aluno com duas mensalidades vencidas fica bloqueado e não pode entrar até regularizar. a gerência vê um painel com total a receber no mês, total recebido, quantidade de alunos ativos, bloqueados e inadimplentes. o aluno pode cancelar a matrícula, o que encerra a geração de mensalidades futuras. perfis: recepção e gerência."
} as const satisfies Ns5ModuleArtifact;

export type MensalidadesAcademiaModuleType = typeof mensalidadesAcademiaModule;

export default mensalidadesAcademiaModule;
