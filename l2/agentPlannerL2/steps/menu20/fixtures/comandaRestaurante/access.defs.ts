/// <mls fileReference="_102047_/l4/comandaRestaurante/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "comandaRestaurante",
  "actors": [
    {
      "actorId": "garcom",
      "kind": "internal",
      "origin": "named",
      "title": "Garçom",
      "description": "Abre comandas para mesas, lança itens com quantidade e observação e cancela lançamentos feitos por engano enquanto a comanda está aberta."
    },
    {
      "actorId": "caixa",
      "kind": "internal",
      "origin": "named",
      "title": "Caixa",
      "description": "Fecha comandas, consulta o total, aplica descontos opcionais, registra a forma de pagamento e libera a mesa."
    }
  ],
  "grants": [
    {
      "grantId": "garcomAtendimento",
      "actorRef": "garcom",
      "title": "Atendimento de mesas e comandas",
      "description": "Permite ao garçom consultar mesas e itens do cardápio, abrir comandas e registrar ou cancelar lançamentos durante o atendimento.",
      "entityRefs": [
        "Mesa",
        "ItemCardapio",
        "Comanda",
        "ItemComanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange as mesas, o cardápio e as comandas do restaurante."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Exibe a identificação e disponibilidade das mesas, a identificação e o preço dos itens do cardápio, os dados operacionais das comandas e os lançamentos necessários ao atendimento.",
        "allowedFields": [
          "Mesa.id",
          "Mesa.number",
          "Mesa.details.identification",
          "Mesa.details.available",
          "ItemCardapio.id",
          "ItemCardapio.details.identification",
          "ItemCardapio.details.comandaRestaurante",
          "Comanda.id",
          "Comanda.mesaId",
          "Comanda.status",
          "Comanda.details.number",
          "ItemComanda.id",
          "ItemComanda.comandaId",
          "ItemComanda.itemCardapioId",
          "ItemComanda.status",
          "ItemComanda.details"
        ]
      }
    },
    {
      "grantId": "caixaFechamento",
      "actorRef": "caixa",
      "title": "Fechamento de comandas",
      "description": "Permite ao caixa localizar comandas abertas, consultar seus totais, registrar desconto e pagamento, fechar o atendimento e liberar a mesa.",
      "entityRefs": [
        "Mesa",
        "Comanda"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange as mesas e comandas de todo o restaurante para fins de fechamento."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Exibe a identificação e disponibilidade da mesa e todos os dados da comanda necessários para conferir o total e registrar o fechamento.",
        "allowedFields": [
          "Mesa.id",
          "Mesa.number",
          "Mesa.details.identification",
          "Mesa.details.available",
          "Comanda.id",
          "Comanda.mesaId",
          "Comanda.status",
          "Comanda.details"
        ]
      }
    }
  ]
} as const satisfies Ns5AccessArtifact;

export type ComandaRestauranteAccessType = typeof comandaRestauranteAccess;

export default comandaRestauranteAccess;
