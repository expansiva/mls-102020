/// <mls fileReference="_102047_/l4/locacaoEquipamentos/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "locacaoEquipamentos",
  "inbound": [],
  "outbound": [
    {
      "id": "contratoLocacaoAtivado",
      "kind": "event",
      "to": "any",
      "event": "contratoLocacaoAtivado",
      "on": "ContratoLocacao.ativarContrato",
      "description": "Publicado quando o atendente confirma o contrato de locação: informa o cliente, os equipamentos locados e o período (data de retirada e data prevista de devolução), para que outros módulos (por exemplo, o financeiro) possam gerar cobranças da locação.",
      "entityRefs": [
        "ContratoLocacao",
        "ItemContrato",
        "Equipamento",
        "Cliente"
      ]
    },
    {
      "id": "devolucaoRegistrada",
      "kind": "event",
      "to": "financeiro",
      "event": "devolucaoRegistrada",
      "on": "ContratoLocacao.registrarDevolucao",
      "description": "Publicado quando a devolução é registrada com a data real: informa o contrato, o cliente, os dias de atraso e o valor da multa calculada (diária × dias de atraso × 1,5), permitindo que o financeiro registre o título a receber da multa.",
      "entityRefs": [
        "ContratoLocacao",
        "ItemContrato",
        "Cliente"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type LocacaoEquipamentosIntegrationType = typeof locacaoEquipamentosIntegration;

export default locacaoEquipamentosIntegration;
