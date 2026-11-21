/// <mls fileReference="_102047_/l4/controleEstoque/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "controleEstoque",
  "rules": {
    "saldoMinimoNaoNegativo": "O saldo mínimo do produto não pode ser negativo.",
    "avisoSaldoAbaixoDoMinimo": "O aviso ocorre quando o saldo atual do produto fica abaixo do saldo mínimo.",
    "movimentacaoImutavel": "A movimentação não pode ser alterada depois de registrada.",
    "quantidadePositiva": "A quantidade da movimentação deve ser maior que zero."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type ControleEstoqueRulesType = typeof controleEstoqueRules;

export default controleEstoqueRules;
