/// <mls fileReference="_102047_/l4/controleEstoque/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const controleEstoqueIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "controleEstoque",
  "inbound": [],
  "outbound": [
    {
      "id": "produtoCadastrado",
      "kind": "event",
      "to": "any",
      "event": "produtoCadastrado",
      "on": "Produto.create",
      "description": "Publica o produto recém-cadastrado no estoque para que outros módulos possam referenciá-lo e acompanhar o saldo.",
      "entityRefs": [
        "Produto"
      ]
    },
    {
      "id": "movimentacaoRegistrada",
      "kind": "event",
      "to": "any",
      "event": "movimentacaoRegistrada",
      "on": "Movimentacao.create",
      "description": "Publica a entrada ou saída no instante em que a movimentação é registrada, já imutável, para que outros módulos reajam à mudança de saldo.",
      "entityRefs": [
        "Movimentacao"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ControleEstoqueIntegrationType = typeof controleEstoqueIntegration;

export default controleEstoqueIntegration;
