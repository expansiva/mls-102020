/// <mls fileReference="_102047_/l4/financeiro/ontology/ExtratoPagador.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const financeiroEntityExtratoPagador = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "ExtratoPagador",
  "title": "Extrato do pagador",
  "description": "Extrato emitido para um pagador, reunindo seus títulos, saldos e recebimentos no período solicitado.",
  "displayField": "number",
  "relationships": {
    "pagador": {
      "relationshipId": "extratoDoPagador",
      "to": "Pagador",
      "via": "ExtratoPagador.pagadorId",
      "cardinality": "N:1",
      "title": "Extrato do pagador",
      "description": "Cada extrato emitido referencia o pagador a que se destina.",
      "mode": "fk",
      "required": "Sempre, para identificar o destinatário do extrato.",
      "role": "destinatário"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um extrato pelo identificador da linha no repositório de extratos; o gerente financeiro abre um extrato já emitido.",
    "locate.byColumn": "Lista extratos por pagador, número ou data de emissão usando as colunas indexadas; o gerente financeiro localiza extratos emitidos.",
    "count": "Conta os extratos que atendem aos filtros de pagador e emissão; o gerente financeiro confere a quantidade de resultados.",
    "listByForeignKey": "Lista os extratos que apontam para um pagador pela chave pagadorId; o gerente financeiro consulta o histórico de extratos do pagador.",
    "create": "Grava o retrato do período, títulos e recebimentos em uma nova linha de extrato; o gerente financeiro emite o extrato solicitado.",
    "uniqueKey": "Impede outro extrato com o mesmo número por meio do índice único; o sistema preserva a identificação individual de cada extrato emitido.",
    "sequence.next": "Obtém o próximo número sequencial para o extrato no contador da plataforma; o módulo financeiro numera cada extrato emitido pelo gerente financeiro.",
    "read.mdmRecord": "Lê o registro mestre apontado por pagadorId para apresentar os dados do pagador sem copiá-los no extrato; o gerente financeiro identifica o destinatário.",
    "financeiro.emitirExtrato": "Reúne os títulos, saldos e recebimentos do período escolhido e forma o retrato do extrato; o gerente financeiro emite o extrato por pagador."
  },
  "rules": [
    "numeroExtratoUnico",
    "periodoExtratoValido",
    "movimentacoesDoPagadorNoPeriodo"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_extratopagador",
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
        "of": "Address",
        "title": "Número do extrato",
        "description": "Número sequencial que identifica o extrato emitido ao pagador.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "pagadorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "Address",
        "to": [
          "Pagador"
        ],
        "title": "Pagador",
        "description": "Pagador ao qual este extrato se destina.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "emitidoEm": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Emitido em",
        "description": "Data e hora em que o extrato foi emitido.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes do extrato",
        "description": "Recorte solicitado e movimentações apresentadas no extrato do pagador.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "periodo": {
            "type": "object",
            "required": true,
            "of": "Address",
            "title": "Período do extrato",
            "description": "Intervalo de datas solicitado para a emissão do extrato.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "dataInicial": {
                "type": "date",
                "required": true,
                "of": "Address",
                "title": "Data inicial",
                "description": "Primeiro dia considerado no extrato.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "dataFinal": {
                "type": "date",
                "required": true,
                "of": "Address",
                "title": "Data final",
                "description": "Último dia considerado no extrato.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "titulos": {
            "type": "object",
            "required": true,
            "collection": true,
            "of": "Address",
            "title": "Títulos apresentados",
            "description": "Títulos a receber do pagador apresentados como retrato no extrato emitido.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "numero": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Número do título",
                "description": "Número que identifica o título apresentado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "origem": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Origem da cobrança",
                "description": "Referência da cobrança que originou o título em outro módulo.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "vencimento": {
                "type": "date",
                "required": true,
                "of": "Address",
                "title": "Vencimento",
                "description": "Data de vencimento do título.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "valorOriginal": {
                "type": "money",
                "required": true,
                "of": "Address",
                "title": "Valor original",
                "description": "Valor total originalmente cobrado no título.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "saldoEmAberto": {
                "type": "money",
                "required": true,
                "of": "Address",
                "title": "Saldo em aberto",
                "description": "Saldo que permanecia em aberto no título quando o extrato foi emitido.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "recebimentos": {
            "type": "object",
            "required": true,
            "collection": true,
            "of": "Address",
            "title": "Recebimentos apresentados",
            "description": "Recebimentos do pagador apresentados como retrato no extrato emitido.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "fields": {
              "numero": {
                "type": "string",
                "required": true,
                "of": "Address",
                "title": "Número do recebimento",
                "description": "Número que identifica o recebimento apresentado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "recebidoEm": {
                "type": "timestamp",
                "required": true,
                "of": "Address",
                "title": "Recebido em",
                "description": "Data e hora em que o recebimento foi registrado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "valor": {
                "type": "money",
                "required": true,
                "of": "Address",
                "title": "Valor recebido",
                "description": "Valor baixado por este recebimento.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "formaRecebimento": {
                "type": "enum",
                "required": true,
                "of": "Address",
                "values": [
                  {
                    "value": "cash",
                    "title": "Dinheiro",
                    "description": "Recebimento em dinheiro."
                  },
                  {
                    "value": "pix",
                    "title": "Pix",
                    "description": "Recebimento por Pix."
                  },
                  {
                    "value": "card",
                    "title": "Cartão via Stripe",
                    "description": "Recebimento por cartão processado pelo Stripe."
                  }
                ],
                "title": "Forma de recebimento",
                "description": "Meio usado para receber o pagamento.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            }
          },
          "totalTitulos": {
            "type": "money",
            "derived": true,
            "title": "Total dos títulos",
            "description": "Soma dos valores originais dos títulos apresentados neste extrato."
          },
          "totalRecebido": {
            "type": "money",
            "derived": true,
            "title": "Total recebido",
            "description": "Soma dos valores dos recebimentos apresentados neste extrato."
          },
          "saldoEmAberto": {
            "type": "money",
            "derived": true,
            "title": "Saldo em aberto",
            "description": "Soma dos saldos em aberto dos títulos apresentados no momento da emissão do extrato."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "number"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type FinanceiroEntityExtratoPagadorType = typeof financeiroEntityExtratoPagador;

export default financeiroEntityExtratoPagador;
