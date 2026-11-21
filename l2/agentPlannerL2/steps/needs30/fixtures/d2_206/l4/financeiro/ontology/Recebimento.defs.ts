/// <mls fileReference="_102047_/l4/financeiro/ontology/Recebimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityRecebimento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "Recebimento",
  "title": "Recebimento",
  "description": "Recebimento total ou parcial de um título, em dinheiro, pix ou cartão via Stripe, registrado pelo caixa ou pago pelo pagador no portal; pode ser estornado apenas no mesmo dia.",
  "displayField": "numero",
  "relationships": {
    "titulo": {
      "relationshipId": "recebimentoTitulo",
      "to": "TituloReceber",
      "via": "Recebimento.tituloId",
      "cardinality": "N:1",
      "title": "Título baixado",
      "description": "Cada recebimento baixa, total ou parcialmente, um título a receber.",
      "mode": "fk",
      "required": true
    },
    "pagador": {
      "relationshipId": "pagadorRecebimentos",
      "to": "Pagador",
      "via": "TituloReceber",
      "cardinality": "N:1",
      "title": "Pagador do recebimento",
      "description": "O pagador obtido pelo título deste recebimento; usado no portal e no extrato.",
      "mode": "throughTable",
      "path": "Pagador <- TituloReceber.pagadorId <- Recebimento.tituloId",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Abre o recebimento pelo id para o caixa conferir título, valor, forma e data, e para o pagador ver o comprovante no portal.",
    "locate.byColumn": "Lista recebimentos por data de recebimento, situação e forma de pagamento, como os registrados hoje que o caixa procura para estornar.",
    "count": "Conta os recebimentos do filtro para o cabeçalho das listas do caixa e do gerente financeiro.",
    "listByForeignKey": "Lista os recebimentos de um título pela coluna tituloId, e de vários títulos de uma vez para o extrato por pagador e o portal.",
    "create": "Registra o recebimento total ou parcial pelo caixa (dinheiro, pix ou cartão) ou o pagamento com cartão feito pelo pagador no portal.",
    "transition": "Move o recebimento de registrado para estornado quando o caixa estorna no mesmo dia.",
    "transaction": "Grava o recebimento e atualiza o saldo do título juntos, tudo ou nada, no recebimento e no estorno.",
    "uniqueKey": "Recusa número de recebimento repetido e a mesma confirmação do Stripe registrada duas vezes.",
    "sequence.next": "Emite o número do recebimento na criação, pela chave financeiro.Recebimento.",
    "read.mdmRecord": "Lê o nome do pagador do título para exibir no recebimento, no comprovante e no extrato.",
    "comment": "Permite ao caixa e ao gerente financeiro deixar notas sobre um recebimento ou estorno.",
    "statusHistory.read": "Mostra quando o recebimento foi estornado e por quem, para o gerente financeiro.",
    "financeiro.pagarCartaoStripe": "Cobra o cartão via Stripe, no caixa ou no portal do pagador, e registra o recebimento ao confirmar o pagamento."
  },
  "rules": [
    "recebimentoValorPositivo",
    "recebimentoNaoExcedeSaldo",
    "tituloQuitadoNaoRecebe",
    "estornoSomenteMesmoDia",
    "estornoRestabeleceSaldo",
    "portalSomenteCartao",
    "pagadorVeSomenteProprios",
    "numeroRecebimentoUnico",
    "stripePagamentoUnico"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_recebimento",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "numero": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "derived": true,
        "title": "Número do recebimento",
        "description": "Número sequencial do recebimento emitido pelo sistema na criação (sequence.next), citado no comprovante e na busca do caixa.",
        "maxLength": 30
      },
      "tituloId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "TituloReceber"
        ],
        "title": "Título",
        "description": "Título a receber que este recebimento baixa, total ou parcialmente."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "registrado",
            "title": "Registrado"
          },
          {
            "value": "estornado",
            "title": "Estornado"
          }
        ],
        "title": "Situação",
        "description": "Situação do recebimento: registrado ao ser criado, estornado quando o caixa o desfaz no mesmo dia."
      },
      "recebidoEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Recebido em",
        "description": "Momento em que o recebimento foi registrado pelo sistema; usado para listar os recebimentos de hoje, para o painel por período e para a regra de estorno no mesmo dia."
      },
      "formaPagamento": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "dinheiro",
            "title": "Dinheiro"
          },
          {
            "value": "pix",
            "title": "Pix"
          },
          {
            "value": "cartao",
            "title": "Cartão (Stripe)"
          }
        ],
        "title": "Forma de pagamento",
        "description": "Meio usado para pagar: dinheiro ou pix no caixa, ou cartão via Stripe no caixa ou no portal."
      },
      "stripePaymentIntentId": {
        "type": "string",
        "indexed": true,
        "title": "Identificador do pagamento no Stripe",
        "description": "Identificador da cobrança de cartão no Stripe, preenchido apenas quando a forma é cartão; impede registrar duas vezes a mesma confirmação de pagamento.",
        "maxLength": 255
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados do recebimento que só são exibidos.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor recebido",
            "description": "Valor efetivamente recebido; menor que o saldo em aberto do título caracteriza baixa parcial.",
            "min": 0.01
          },
          "canal": {
            "type": "enum",
            "required": true,
            "values": [
              {
                "value": "caixa",
                "title": "Caixa"
              },
              {
                "value": "portal",
                "title": "Portal do pagador"
              }
            ],
            "title": "Canal",
            "description": "Onde o recebimento foi registrado: no caixa da organização ou pelo próprio pagador no portal."
          },
          "observacao": {
            "type": "text",
            "title": "Observação",
            "description": "Anotação livre do caixa sobre o recebimento.",
            "maxLength": 1000
          },
          "estorno": {
            "type": "object",
            "title": "Estorno",
            "description": "Dados do estorno, preenchidos quando o caixa estorna o recebimento.",
            "fields": {
              "motivo": {
                "type": "text",
                "required": true,
                "title": "Motivo do estorno",
                "description": "Por que o recebimento foi desfeito (por exemplo, registrado por engano).",
                "maxLength": 500
              },
              "estornadoEm": {
                "type": "timestamp",
                "required": true,
                "derived": true,
                "title": "Estornado em",
                "description": "Momento do estorno, gravado pelo sistema."
              }
            }
          },
          "estornavel": {
            "type": "boolean",
            "derived": true,
            "title": "Pode ser estornado",
            "description": "Recebimento ainda registrado e recebido hoje."
          },
          "baixaParcial": {
            "type": "boolean",
            "derived": true,
            "title": "Baixa parcial",
            "description": "Valor recebido menor que o saldo em aberto do título no momento do recebimento."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ],
    [
      "stripePaymentIntentId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "registrado",
      "reachedBy": "actor"
    },
    {
      "state": "estornado",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "estornar",
      "from": [
        "registrado"
      ],
      "to": "estornado",
      "by": [
        "caixa"
      ],
      "description": "O caixa estorna um recebimento registrado no mesmo dia; o saldo em aberto do título é restabelecido.",
      "payload": [
        "details.estorno.motivo"
      ],
      "ruleRefs": [
        "estornoSomenteMesmoDia",
        "estornoRestabeleceSaldo"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityRecebimentoType = typeof financeiroEntityRecebimento;

export default financeiroEntityRecebimento;
