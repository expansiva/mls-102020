/// <mls fileReference="_102047_/l4/locacaoEquipamentos/ontology/ContratoLocacao.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const locacaoEquipamentosEntityContratoLocacao = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "locacaoEquipamentos",
  "entityId": "ContratoLocacao",
  "title": "Contrato de locação",
  "description": "Contrato firmado com um cliente para um período, com data de retirada, data prevista e data real de devolução; ao devolver com atraso, calcula dias de atraso e multa (diária × dias de atraso × 1,5).",
  "displayField": "numero",
  "relationships": {
    "cliente": {
      "relationshipId": "contratoCliente",
      "to": "Cliente",
      "via": "ContratoLocacao.clienteId",
      "cardinality": "N:1",
      "title": "Cliente do contrato",
      "description": "Cada contrato pertence a um cliente; um cliente pode ter vários contratos.",
      "mode": "fk",
      "required": true
    },
    "itens": {
      "relationshipId": "itemContrato",
      "to": "ItemContrato",
      "via": "ItemContrato.contratoId",
      "cardinality": "1:N",
      "title": "Itens do contrato",
      "description": "Equipamentos incluídos no contrato; um contrato tem um ou mais itens.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "equipamentos": {
      "relationshipId": "equipamentoContratos",
      "to": "Equipamento",
      "via": "ItemContrato",
      "cardinality": "N:N",
      "title": "Equipamentos do contrato",
      "description": "Equipamentos locados neste contrato, alcançados através dos itens.",
      "mode": "throughTable",
      "path": "Equipamento <- ItemContrato.equipamentoId -> ItemContrato.contratoId -> ContratoLocacao",
      "derived": true,
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Lê um contrato pelo id ao abrir a tela do contrato para conferir itens, datas e multa; usado pelo atendente.",
    "locate.byColumn": "Lista contratos filtrando por cliente, situação, número ou datas de retirada e devolução, paginado; usado pelo atendente ao localizar o contrato ativo e pelo gerente.",
    "locate.byText": "Busca contratos pelo número digitado em uma caixa de pesquisa; usado pelo atendente.",
    "count": "Conta contratos por situação, por exemplo ativos ou em atraso, para indicadores; usado pelo gerente.",
    "listByForeignKey": "Lista os contratos de um cliente pela chave clienteId; usado pelo atendente na ficha do cliente.",
    "create": "Cria o contrato em elaboração para um cliente com data de retirada e data prevista de devolução; usado pelo atendente.",
    "update": "Altera período e observações enquanto o contrato está em elaboração, e grava a data real de devolução; usado pelo atendente.",
    "transition": "Move o contrato de em elaboração para ativo (ativarContrato) e de ativo para encerrado (registrarDevolucao), com a regra guardada no módulo; usado pelo atendente.",
    "uniqueKey": "Garante por índice único que dois contratos nunca tenham o mesmo número.",
    "transaction": "Grava contrato, itens e situação dos equipamentos juntos, tudo ou nada, na confirmação e na devolução; usado pelo módulo.",
    "read.mdmRecord": "Lê no cadastro mestre o nome e o documento do cliente apontado por clienteId para exibir no contrato; usado pelo atendente.",
    "sequence.next": "Emite o próximo número do contrato na criação, pela sequência locacaoEquipamentos.ContratoLocacao; usado pelo módulo.",
    "comment": "Registra notas sobre o contrato, como combinados com o cliente; usado pelo atendente.",
    "locacaoEquipamentos.verificarSobreposicao": "Confere se algum equipamento do contrato já consta em outro contrato com período sobreposto, comparando retirada e devolução prevista dos contratos que compartilham o equipamento; usado pelo sistema ao adicionar itens e ao confirmar.",
    "locacaoEquipamentos.calcularMulta": "Calcula dias de atraso e a multa (diária × dias de atraso × 1,5) ao registrar a devolução, mostrada ao atendente para informar o cliente."
  },
  "rules": [
    "contratoPeriodoValido",
    "contratoExigeItem",
    "equipamentoSemSobreposicao",
    "equipamentoDisponivelParaLocar",
    "multaAtrasoDevolucao",
    "devolucaoLiberaEquipamentos",
    "contratoEditavelSomenteEmElaboracao"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "locacaoEquipamentos_contratolocacao",
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
        "title": "Número do contrato",
        "description": "Número do contrato citado pelo atendente e pelo cliente, emitido pela sequência de numeração no momento da criação; ninguém o digita."
      },
      "clienteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Cliente"
        ],
        "title": "Cliente",
        "description": "Cliente titular do contrato; nome, documento e contatos vêm do cadastro mestre."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "rascunho",
            "title": "Em elaboração",
            "description": "Contrato criado, ainda recebendo equipamentos."
          },
          {
            "value": "ativo",
            "title": "Ativo",
            "description": "Contrato confirmado; os equipamentos constam como locados."
          },
          {
            "value": "encerrado",
            "title": "Encerrado",
            "description": "Devolução registrada; equipamentos liberados."
          }
        ],
        "title": "Situação do contrato",
        "description": "Etapa do contrato: em elaboração enquanto o atendente inclui os itens, ativo depois de confirmado (equipamentos locados) e encerrado após a devolução."
      },
      "dataRetirada": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de retirada",
        "description": "Dia em que o cliente retira os equipamentos; início do período usado para checar sobreposição."
      },
      "dataPrevistaDevolucao": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data prevista de devolução",
        "description": "Dia combinado para devolver os equipamentos; fim do período usado para checar sobreposição e base do cálculo de atraso. Não pode ser anterior à retirada."
      },
      "dataRealDevolucao": {
        "type": "date",
        "indexed": true,
        "title": "Data real de devolução",
        "description": "Dia em que o cliente efetivamente devolveu os equipamentos; informada pelo atendente ao registrar a devolução."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Informações complementares do contrato.",
        "fields": {
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Anotações livres do atendente sobre o contrato, como local de entrega ou condições combinadas.",
            "maxLength": 1000
          },
          "diasAtraso": {
            "type": "integer",
            "derived": true,
            "title": "Dias de atraso",
            "description": "Quantidade de dias entre a data prevista de devolução e a data real de devolução, quando a devolução foi feita depois do previsto; zero quando devolvido no prazo ou ainda sem data real."
          },
          "atrasado": {
            "type": "boolean",
            "derived": true,
            "title": "Em atraso",
            "description": "Contrato ativo, sem data real de devolução e com data prevista de devolução anterior a hoje, ou encerrado com devolução depois da data prevista."
          },
          "valorMulta": {
            "type": "money",
            "derived": true,
            "title": "Valor da multa",
            "description": "Soma, para cada equipamento do contrato, do valor da diária vezes os dias de atraso vezes 1,5; zero quando não há atraso."
          },
          "quantidadeItens": {
            "type": "integer",
            "derived": true,
            "title": "Quantidade de equipamentos",
            "description": "Número de itens do contrato."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "numero"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "rascunho",
      "reachedBy": "actor"
    },
    {
      "state": "ativo",
      "reachedBy": "actor"
    },
    {
      "state": "encerrado",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "ativarContrato",
      "from": [
        "rascunho"
      ],
      "to": "ativo",
      "by": [
        "atendente"
      ],
      "description": "O atendente confirma o contrato com pelo menos um equipamento; os equipamentos passam a constar como locados.",
      "payload": [],
      "ruleRefs": [
        "contratoExigeItem",
        "equipamentoSemSobreposicao",
        "equipamentoDisponivelParaLocar"
      ]
    },
    {
      "transitionId": "registrarDevolucao",
      "from": [
        "ativo"
      ],
      "to": "encerrado",
      "by": [
        "atendente"
      ],
      "description": "O atendente informa a data real de devolução; se houve atraso o sistema calcula a multa (diária × dias de atraso × 1,5) e os equipamentos voltam a ficar disponíveis.",
      "payload": [
        "dataRealDevolucao"
      ],
      "ruleRefs": [
        "multaAtrasoDevolucao",
        "devolucaoLiberaEquipamentos"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type LocacaoEquipamentosEntityContratoLocacaoType = typeof locacaoEquipamentosEntityContratoLocacao;

export default locacaoEquipamentosEntityContratoLocacao;
