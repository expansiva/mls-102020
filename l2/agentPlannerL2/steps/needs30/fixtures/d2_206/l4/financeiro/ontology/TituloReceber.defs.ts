/// <mls fileReference="_102047_/l4/financeiro/ontology/TituloReceber.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const financeiroEntityTituloReceber = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "financeiro",
  "entityId": "TituloReceber",
  "title": "Título a receber",
  "description": "Cobrança nascida em outro módulo (comanda fechada, mensalidade gerada, ordem de serviço entregue) com pagador, valor, vencimento e origem; o saldo em aberto e a situação de vencido são derivados dos recebimentos.",
  "displayField": "numero",
  "relationships": {
    "pagador": {
      "relationshipId": "tituloPagador",
      "to": "Pagador",
      "via": "TituloReceber.pagadorId",
      "cardinality": "N:1",
      "title": "Pagador do título",
      "description": "Cada título pertence a um pagador, que responde pelo pagamento.",
      "mode": "fk",
      "required": true
    },
    "recebimentos": {
      "relationshipId": "recebimentoTitulo",
      "to": "Recebimento",
      "via": "Recebimento.tituloId",
      "cardinality": "1:N",
      "title": "Recebimentos do título",
      "description": "Recebimentos, totais ou parciais, e estornos que baixam este título.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "create": "Registra o título quando a cobrança chega de outro módulo (comanda fechada, mensalidade gerada, ordem de serviço entregue), com upsert pela origem e referência para que a mesma cobrança não entre duas vezes; escrito pela integração de entrada.",
    "uniqueKey": "Recusa um segundo título com a mesma origem e referência de origem, e um número repetido; aplicado pelo motor na gravação.",
    "sequence.next": "Emite o número do título no contador financeiro.TituloReceber ao criar a linha; usado pelo módulo na entrada da cobrança.",
    "read.byId": "Lê um título pelo id para o caixa conferir antes de receber, para o gerente ver o vencido e para o pagador conferir o que vai pagar.",
    "locate.byColumn": "Lista títulos filtrando por pagador, origem, período de emissão ou vencimento, ordenados por vencimento; usado pelo caixa, pelo gerente nas listas de recebíveis e vencidos, e pelo pagador no portal restrito aos próprios títulos.",
    "locate.byText": "Busca o título pelo número ou pela referência de origem digitados na caixa de pesquisa do caixa.",
    "count": "Conta os títulos do filtro, como o total de vencidos por origem exibido ao gerente financeiro.",
    "listByForeignKey": "Lista os títulos de um pagador, ou de vários pagadores de uma vez, para o extrato do gerente e para o portal do pagador.",
    "read.mdmRecord": "Lê nome e documento do pagador no registro mestre para exibir nas listas, no título e no extrato, sem copiar esses dados para a tabela.",
    "comment": "Permite ao caixa e ao gerente deixar observações no título, como um acordo de pagamento combinado com o pagador.",
    "attach.document": "Anexa ao título um comprovante ou documento da cobrança enviado pelo pagador ou recebido da origem; usado pelo caixa e pelo gerente.",
    "financeiro.extratoPagador": "Monta o extrato de um pagador no período, com títulos, recebimentos, estornos e saldo, para o gerente financeiro exportar ou imprimir."
  },
  "rules": [
    "tituloOrigemUnica",
    "tituloValorPositivo",
    "tituloVencimentoNaoAnteriorEmissao",
    "recebimentoNaoExcedeSaldo",
    "recebimentoEstornadoNaoConta",
    "tituloQuitadoNaoRecebe",
    "pagadorVeSomenteProprios"
  ],
  "writer": "inbound",
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "financeiro_tituloreceber",
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
        "title": "Número do título",
        "description": "Número que pessoas citam para localizar o título, emitido pelo contador da plataforma quando o título chega de outro módulo."
      },
      "pagadorId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Pagador"
        ],
        "title": "Pagador",
        "description": "Pessoa que responde pelo pagamento do título; nome e documento são lidos do registro mestre."
      },
      "origem": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "restaurante",
            "title": "Restaurante (comanda fechada)"
          },
          {
            "value": "academia",
            "title": "Academia (mensalidade gerada)"
          },
          {
            "value": "assistenciaTecnica",
            "title": "Assistência técnica (ordem de serviço entregue)"
          }
        ],
        "title": "Origem",
        "description": "Módulo onde a cobrança nasceu; usada para filtrar o painel e a lista de vencidos."
      },
      "origemReferencia": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Referência na origem",
        "description": "Identificador do documento de origem (comanda, mensalidade ou ordem de serviço); junto com a origem impede que a mesma cobrança gere dois títulos.",
        "maxLength": 120
      },
      "emissao": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de emissão",
        "description": "Data em que a cobrança nasceu na origem; base do filtro por período."
      },
      "vencimento": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Vencimento",
        "description": "Data até a qual o título deve ser pago; ordena as listas e define os vencidos."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Dados exibidos do título.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor",
            "description": "Valor original cobrado, conforme informado pelo módulo de origem.",
            "min": 0.01
          },
          "descricao": {
            "type": "text",
            "title": "Descrição",
            "description": "Texto da cobrança vindo da origem, por exemplo 'Comanda 1234 - mesa 7' ou 'Mensalidade outubro/2026'.",
            "maxLength": 500
          },
          "origemRotulo": {
            "type": "string",
            "title": "Documento de origem",
            "description": "Rótulo legível do documento de origem exibido ao caixa, ao gerente e ao pagador.",
            "maxLength": 120
          },
          "totalRecebido": {
            "type": "money",
            "derived": true,
            "title": "Total recebido",
            "description": "Soma dos recebimentos deste título, descontados os recebimentos estornados."
          },
          "saldoAberto": {
            "type": "money",
            "derived": true,
            "title": "Saldo em aberto",
            "description": "Valor do título menos o total recebido; nunca fica negativo."
          },
          "quitado": {
            "type": "boolean",
            "derived": true,
            "title": "Quitado",
            "description": "Verdadeiro quando o total recebido alcança o valor do título, ou seja, quando o saldo em aberto zera."
          },
          "parcialmenteRecebido": {
            "type": "boolean",
            "derived": true,
            "title": "Baixa parcial",
            "description": "Há ao menos um recebimento válido e ainda resta saldo em aberto."
          },
          "vencido": {
            "type": "boolean",
            "derived": true,
            "title": "Vencido",
            "description": "Com saldo em aberto e com vencimento anterior a hoje."
          },
          "diasAtraso": {
            "type": "integer",
            "derived": true,
            "title": "Dias de atraso",
            "description": "Quantidade de dias entre o vencimento e hoje, quando o título está vencido; zero caso contrário."
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
      "origem",
      "origemReferencia"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type FinanceiroEntityTituloReceberType = typeof financeiroEntityTituloReceber;

export default financeiroEntityTituloReceber;
