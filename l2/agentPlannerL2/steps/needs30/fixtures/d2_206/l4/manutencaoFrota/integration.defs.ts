/// <mls fileReference="_102047_/l4/manutencaoFrota/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "manutencaoFrota",
  "inbound": [],
  "outbound": [
    {
      "id": "ordemManutencaoConcluida",
      "kind": "event",
      "to": "any",
      "event": "ordemManutencaoConcluida",
      "on": "OrdemManutencao.concluir",
      "description": "Publicado quando o gestor conclui uma ordem de manutenção (data de saída e custo registrados). Outros módulos, como o financeiro, podem usar o registro da ordem para lançar o custo da oficina.",
      "entityRefs": [
        "OrdemManutencao",
        "Veiculo",
        "Oficina"
      ]
    },
    {
      "id": "abastecimentoRegistrado",
      "kind": "event",
      "to": "any",
      "event": "abastecimentoRegistrado",
      "on": "Abastecimento.create",
      "description": "Publicado quando o motorista registra um abastecimento (data, litros, valor, km no painel). Outros módulos podem usar o registro para controlar o gasto com combustível.",
      "entityRefs": [
        "Abastecimento",
        "Veiculo",
        "Motorista"
      ]
    }
  ],
  "plugins": []
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type ManutencaoFrotaIntegrationType = typeof manutencaoFrotaIntegration;

export default manutencaoFrotaIntegration;
