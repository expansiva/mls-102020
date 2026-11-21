/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Matricula.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMatricula = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Matricula",
  "title": "Matrícula",
  "description": "Vínculo do aluno a um plano a partir de uma data de início; ativa até ser cancelada. O bloqueio por duas mensalidades vencidas é derivado, não digitado.",
  "displayField": "numero",
  "relationships": {
    "aluno": {
      "relationshipId": "matriculaAluno",
      "to": "Aluno",
      "via": "Matricula.alunoId",
      "cardinality": "N:1",
      "title": "Aluno da matrícula",
      "description": "Cada matrícula pertence a um aluno; um aluno pode ter várias matrículas ao longo do tempo.",
      "mode": "fk",
      "required": true
    },
    "plano": {
      "relationshipId": "matriculaPlano",
      "to": "Plano",
      "via": "Matricula.planoId",
      "cardinality": "N:1",
      "title": "Plano da matrícula",
      "description": "Plano de onde vêm o valor e o dia de vencimento.",
      "mode": "fk",
      "required": true
    },
    "recepcao": {
      "relationshipId": "matriculaRecepcao",
      "to": "Recepcao",
      "via": "Matricula.recepcaoId",
      "cardinality": "N:1",
      "title": "Registrada por",
      "description": "Atendente da recepção que registrou a matrícula.",
      "mode": "fk"
    },
    "mensalidades": {
      "relationshipId": "mensalidadeMatricula",
      "to": "Mensalidade",
      "via": "Mensalidade.matriculaId",
      "cardinality": "1:N",
      "title": "Mensalidades da matrícula",
      "description": "Mensalidades geradas para esta matrícula, uma por mês de referência.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre a matrícula pelo id para a recepção consultar a situação do aluno e a gerência conferir antes de gerar mensalidades.",
    "locate.byColumn": "Lista matrículas por situação, aluno, plano ou data de início; a gerência confere as ativas do mês e a recepção acha a matrícula do aluno que chegou.",
    "locate.byText": "Busca a matrícula pelo número digitado na caixa de pesquisa da recepção.",
    "count": "Conta as matrículas ativas que receberão mensalidade no mês, exibido para a gerência.",
    "listByForeignKey": "Lista as matrículas de um aluno ou de um plano, e as mensalidades de cada matrícula, na tela da recepção.",
    "create": "A recepção registra a matrícula do aluno no plano com a data de início, já ativa, criando ou vinculando o cadastro do aluno.",
    "update": "A recepção corrige observações da matrícula.",
    "transition": "A recepção cancela a matrícula a pedido do aluno, passando de ativa para cancelada e encerrando a geração de mensalidades futuras.",
    "uniqueKey": "O sistema recusa dois números de matrícula iguais.",
    "transaction": "Grava a matrícula e o vínculo do aluno juntos, tudo ou nada, no registro feito pela recepção.",
    "read.mdmRecord": "Mostra nome e documento do aluno e o atendente da recepção nas listas e na tela da matrícula.",
    "sequence.next": "Emite o número da matrícula na criação, pela chave mensalidadesAcademia.Matricula.",
    "comment": "A recepção e a gerência deixam notas sobre a matrícula, como acordos de regularização.",
    "mensalidadesAcademia.verificarLiberacao": "Informa à recepção se o aluno pode entrar: matrícula ativa e sem duas mensalidades vencidas, listando as vencidas quando bloqueado."
  },
  "rules": [
    "matriculaExigeAlunoEPlano",
    "alunoBloqueadoDuasVencidas",
    "bloqueadoNaoEntra",
    "mensalidadeVencidaAposVencimento",
    "cancelamentoEncerraGeracao",
    "somenteAtivaGeraMensalidade"
  ],
  "kind": "entity",
  "class": "core",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_matricula",
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
        "title": "Número da matrícula",
        "description": "Número sequencial que a recepção informa ao aluno, emitido pelo sistema na criação da matrícula."
      },
      "alunoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Aluno"
        ],
        "title": "Aluno",
        "description": "Aluno matriculado; nome e documento são lidos do cadastro mestre."
      },
      "planoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "Plano"
        ],
        "title": "Plano",
        "description": "Plano escolhido (mensal, trimestral ou anual), de onde vêm o valor e o dia de vencimento das mensalidades."
      },
      "recepcaoId": {
        "type": "record",
        "indexed": true,
        "to": [
          "Recepcao"
        ],
        "title": "Atendente da recepção",
        "description": "Atendente da recepção que registrou a matrícula."
      },
      "dataInicio": {
        "type": "date",
        "required": true,
        "indexed": true,
        "title": "Data de início",
        "description": "Data a partir da qual a matrícula vale e as mensalidades passam a ser geradas."
      },
      "status": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "ativa",
            "title": "Ativa"
          },
          {
            "value": "cancelada",
            "title": "Cancelada"
          }
        ],
        "title": "Situação",
        "description": "Situação da matrícula: ativa até ser cancelada. O bloqueio por mensalidades vencidas não é uma situação digitada; é calculado."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalhes",
        "description": "Demais informações da matrícula.",
        "fields": {
          "observacoes": {
            "type": "text",
            "title": "Observações",
            "description": "Anotações da recepção sobre a matrícula.",
            "maxLength": 2000
          },
          "cancelamento": {
            "type": "object",
            "title": "Cancelamento",
            "description": "Dados do cancelamento pedido pelo aluno; preenchido apenas quando a matrícula é cancelada.",
            "fields": {
              "dataCancelamento": {
                "type": "date",
                "required": true,
                "title": "Data do cancelamento",
                "description": "Data em que a matrícula foi encerrada; a partir dela não se geram novas mensalidades."
              },
              "motivo": {
                "type": "text",
                "title": "Motivo",
                "description": "Motivo informado pelo aluno para cancelar.",
                "maxLength": 1000
              }
            }
          },
          "mensalidadesVencidas": {
            "type": "integer",
            "derived": true,
            "title": "Mensalidades vencidas",
            "description": "Quantidade de mensalidades desta matrícula que não foram pagas e cujo vencimento já passou."
          },
          "bloqueada": {
            "type": "boolean",
            "derived": true,
            "title": "Bloqueada",
            "description": "Matrícula ativa com duas ou mais mensalidades vencidas; o aluno não pode entrar até regularizar."
          },
          "inadimplente": {
            "type": "boolean",
            "derived": true,
            "title": "Inadimplente",
            "description": "Matrícula com ao menos uma mensalidade vencida e não paga."
          },
          "entradaLiberada": {
            "type": "boolean",
            "derived": true,
            "title": "Entrada liberada",
            "description": "Matrícula ativa e não bloqueada por mensalidades vencidas; é o que a recepção consulta quando o aluno chega."
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
      "state": "ativa",
      "reachedBy": "actor"
    },
    {
      "state": "cancelada",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelar",
      "from": [
        "ativa"
      ],
      "to": "cancelada",
      "by": [
        "recepcao"
      ],
      "description": "A recepção registra o cancelamento pedido pelo aluno, o que encerra a geração de mensalidades futuras.",
      "payload": [
        "details.cancelamento.dataCancelamento",
        "details.cancelamento.motivo"
      ],
      "ruleRefs": [
        "cancelamentoEncerraGeracao"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityMatriculaType = typeof mensalidadesAcademiaEntityMatricula;

export default mensalidadesAcademiaEntityMatricula;
