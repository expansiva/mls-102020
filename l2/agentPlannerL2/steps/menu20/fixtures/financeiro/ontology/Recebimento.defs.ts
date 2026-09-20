/// <mls fileReference="_102047_/l4/financeiro/ontology/Recebimento.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityRecebimento = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "Recebimento",
  "title": "Recebimento",
  "description": "Movimentação de recebimento total ou parcial de um título, registrada por dinheiro, Pix ou cartão e passível de estorno no mesmo dia.",
  "displayField": "number",
  "relationships": {
    "tituloReceber": {
      "relationshipId": "recebimentoDoTitulo",
      "to": "TituloReceber",
      "via": "Recebimento.tituloReceberId",
      "cardinality": "N:1",
      "title": "Título do recebimento",
      "description": "Cada recebimento pertence obrigatoriamente a um título a receber.",
      "mode": "fk",
      "required": "sempre"
    },
    "pagador": {
      "relationshipId": "pagadorTemRecebimentos",
      "to": "Pagador",
      "via": "Recebimento",
      "cardinality": "N:1",
      "title": "Pagador do recebimento",
      "description": "O pagador é obtido pelo título a receber deste recebimento, sem cópia de dados da pessoa no lançamento.",
      "mode": "throughTable",
      "path": "Pagador <- TituloReceber.pagadorId; Recebimento.tituloReceberId -> TituloReceber",
      "derived": true,
      "direction": "to",
      "required": "quando o recebimento for consultado pelo pagador do título"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um recebimento pelo identificador da linha · usa findOne por id no repositório de recebimentos · caixa e pagador em seus respectivos contextos.",
    "locate.byColumn": "Localiza recebimentos por número, título, data de registro, situação ou identificador Stripe · usa filtros e paginação sobre as colunas indexadas · caixa, gerente financeiro e pagador dentro do seu escopo.",
    "count": "Conta os recebimentos que atendem aos filtros da consulta · usa o mesmo critério de busca sem paginação · gerente financeiro e pagador dentro do seu escopo.",
    "listByForeignKey": "Lista os recebimentos de um título a receber · busca as linhas por tituloReceberId, inclusive em lote · caixa, gerente financeiro e portal do pagador.",
    "create": "Registra um recebimento total ou parcial para um título em aberto · insere o lançamento com valor e forma de pagamento · caixa e pagador ao concluir pagamento por cartão.",
    "transition": "Estorna um recebimento registrado no mesmo dia · altera a situação de registrado para estornado sob as regras do módulo · caixa.",
    "transaction": "Registra ou estorna o recebimento junto com a atualização do saldo do título · executa as escritas relacionadas de forma atômica · caixa e pagamento por cartão do pagador.",
    "sequence.next": "Emite o número sequencial do recebimento · obtém o próximo número da sequência do módulo antes da criação · módulo financeiro.",
    "financeiro.processarPagamentoCartao": "Processa o pagamento de um título próprio por cartão na Stripe · confirma o identificador retornado pela Stripe e cria o recebimento em transação · pagador."
  },
  "rules": [
    "receiptTitleMustBeOpen",
    "receivedAmountPositive",
    "receivedAmountDoesNotExceedTitleBalance",
    "cardPaymentRequiresStripePaymentId",
    "sameDayReversal",
    "receiptReversalRecomposesTitleBalance"
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
      "number": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Número do recebimento",
        "description": "Número sequencial que identifica o recebimento para consulta e conferência no financeiro.",
        "maxLength": 80,
        "min": 0,
        "max": 0
      },
      "tituloReceberId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "TituloReceber"
        ],
        "title": "Título a receber",
        "description": "Título a receber ao qual este valor recebido é obrigatoriamente lançado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "receivedAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data e hora do recebimento",
        "description": "Data e hora em que o recebimento foi registrado; permite localizar lançamentos do dia para estorno.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "stripePaymentId": {
        "type": "string",
        "unique": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Identificador do pagamento Stripe",
        "description": "Identificador retornado pela Stripe para impedir o registro duplicado de um pagamento por cartão.",
        "maxLength": 255,
        "min": 0,
        "max": 0
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "values": [
          {
            "value": "registered",
            "title": "Registrado",
            "description": "Recebimento lançado e considerado no saldo do título."
          },
          {
            "value": "reversed",
            "title": "Estornado",
            "description": "Recebimento cancelado no mesmo dia e desconsiderado do saldo do título."
          }
        ],
        "title": "Situação",
        "description": "Situação do lançamento de recebimento, registrada ou estornada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados do recebimento",
        "description": "Dados financeiros e da forma de pagamento que não são usados como índice.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "amount": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Valor recebido",
            "description": "Valor efetivamente recebido neste lançamento, que pode corresponder a uma baixa total ou parcial do título.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "paymentMethod": {
            "type": "enum",
            "required": true,
            "of": "ContactSummary",
            "values": [
              {
                "value": "cash",
                "title": "Dinheiro",
                "description": "Valor recebido em dinheiro."
              },
              {
                "value": "pix",
                "title": "Pix",
                "description": "Valor recebido por Pix."
              },
              {
                "value": "card",
                "title": "Cartão",
                "description": "Valor recebido por cartão processado pela Stripe."
              }
            ],
            "title": "Forma de pagamento",
            "description": "Meio pelo qual o valor foi recebido.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "number"
    ],
    [
      "stripePaymentId"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "registered",
      "reachedBy": "actor"
    },
    {
      "state": "reversed",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "estornarRecebimento",
      "from": [
        "registered"
      ],
      "to": "reversed",
      "by": [
        "caixa"
      ],
      "description": "Estorna um recebimento registrado no mesmo dia, recompondo o saldo do título correspondente.",
      "ruleRefs": [
        "sameDayReversal",
        "receiptReversalRecomposesTitleBalance"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type FinanceiroEntityRecebimentoType = typeof financeiroEntityRecebimento;

export default financeiroEntityRecebimento;
