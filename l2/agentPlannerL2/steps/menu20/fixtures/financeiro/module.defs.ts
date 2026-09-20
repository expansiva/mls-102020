/// <mls fileReference="_102047_/l4/financeiro/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const financeiroModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "financeiro",
  "title": "Financeiro — Contas a Receber",
  "userLanguage": "pt-BR",
  "productLanguages": [
    "pt-BR"
  ],
  "defaultLanguage": "pt-BR",
  "sourcePrompt": "criar o módulo financeiro em português. é o contas a receber da organização: toda cobrança nasce em outro módulo — a comanda fechada no restaurante, a mensalidade gerada na academia, a ordem de serviço entregue na assistência técnica — e aparece aqui como um título a receber com pagador, valor, vencimento e origem. o caixa recebe títulos (dinheiro, pix ou cartão via Stripe), pode dar baixa parcial e estornar um recebimento no mesmo dia. o gerente financeiro vê o painel de recebíveis por período e por origem, os títulos vencidos, e emite um extrato por pagador. o pagador acessa um portal e vê só os próprios títulos e recebimentos, e pode pagar um título em aberto com cartão. perfis: caixa, gerente financeiro e pagador."
} as const satisfies Ns5ModuleArtifact;

export type FinanceiroModuleType = typeof financeiroModule;

export default financeiroModule;
