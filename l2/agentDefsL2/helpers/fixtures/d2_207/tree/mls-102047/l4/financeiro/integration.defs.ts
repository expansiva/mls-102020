/// <mls fileReference="_102047_/l4/financeiro/integration.defs.ts" enhancement="_blank"/>

import type { Ns5IntegrationArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroIntegration = {
  "schemaVersion": "2026-09-12-ns5-integration-v2",
  "moduleName": "financeiro",
  "inbound": [
    {
      "id": "comandaFechada",
      "kind": "event",
      "from": "comandaRestaurante",
      "event": "comandaFechada",
      "writes": [
        "TituloReceber",
        "Pagador"
      ],
      "effect": "create",
      "description": "Quando o restaurante fecha uma comanda (Comanda.fecharComanda), o financeiro cria um título a receber com origem 'comanda'. O cliente da comanda vira o pagador (criado se ainda não existir), o total da comanda vira o valor e a data de fechamento vira o vencimento.",
      "entityRefs": []
    },
    {
      "id": "mensalidadeGerada",
      "kind": "event",
      "from": "mensalidadesAcademia",
      "event": "mensalidadeGerada",
      "writes": [
        "TituloReceber",
        "Pagador"
      ],
      "effect": "create",
      "description": "Quando a academia gera uma mensalidade (Mensalidade.create), o financeiro cria um título a receber com origem 'mensalidade'. O aluno vira o pagador, e o valor e o vencimento da mensalidade passam para o título.",
      "entityRefs": []
    },
    {
      "id": "ordenServicioFinalizada",
      "kind": "event",
      "from": "ordenServicio",
      "event": "ordenServicioFinalizada",
      "writes": [
        "TituloReceber",
        "Pagador"
      ],
      "effect": "create",
      "description": "Quando a assistência técnica entrega a ordem de serviço (OrdenServicio.finalizar), o financeiro cria um título a receber com origem 'ordem de serviço'. O cliente da ordem vira o pagador, o valor total da ordem vira o valor do título e a data de entrega vira o vencimento.",
      "entityRefs": []
    },
    {
      "id": "mdmUpdated",
      "kind": "event",
      "from": "organization",
      "event": "mdmUpdated",
      "writes": [
        "Pagador"
      ],
      "effect": "update",
      "description": "Quando o cadastro da pessoa muda no catálogo da organização, o financeiro atualiza o nome e o contato do pagador ligado a ela.",
      "entityRefs": []
    }
  ],
  "outbound": [
    {
      "id": "recebimentoRegistrado",
      "kind": "event",
      "to": "any",
      "event": "recebimentoRegistrado",
      "on": "Recebimento.create",
      "description": "Publicado quando um recebimento é registrado (inteiro ou parcial) pelo caixa ou pelo portal do pagador. Serve para o módulo de origem (comanda, mensalidade ou ordem de serviço) saber que a cobrança foi paga.",
      "entityRefs": [
        "Recebimento",
        "TituloReceber",
        "Pagador"
      ]
    },
    {
      "id": "recebimentoEstornado",
      "kind": "event",
      "to": "any",
      "event": "recebimentoEstornado",
      "on": "Recebimento.estornar",
      "description": "Publicado quando um recebimento é estornado no mesmo dia. Serve para o módulo de origem saber que a cobrança voltou a ficar em aberto.",
      "entityRefs": [
        "Recebimento",
        "TituloReceber"
      ]
    }
  ],
  "plugins": [
    {
      "pluginId": "stripe",
      "description": "Faz o pagamento com cartão pelo Stripe, tanto no caixa quanto no portal do pagador. Os dados do cartão ficam só no Stripe; o financeiro guarda apenas o resultado do pagamento no recebimento.",
      "usedBy": [
        "receberTitulo.registrarRecebimento",
        "pagarTituloCartao.pagarComCartao"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5IntegrationArtifact>;

export type FinanceiroIntegrationType = typeof financeiroIntegration;

export default financeiroIntegration;
