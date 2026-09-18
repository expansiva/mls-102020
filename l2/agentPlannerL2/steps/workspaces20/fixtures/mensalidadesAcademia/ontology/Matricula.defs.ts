/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Matricula.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityMatricula = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Matricula",
  "title": "Matrícula",
  "description": "Vínculo do aluno a um plano a partir de uma data, cuja situação define a geração de mensalidades futuras.",
  "displayField": "id",
  "relationships": {
    "aluno": {
      "relationshipId": "matriculaAluno",
      "to": "Aluno",
      "via": "Matricula.alunoId",
      "cardinality": "N:1",
      "title": "Aluno matriculado",
      "description": "Cada matrícula pertence obrigatoriamente a um aluno.",
      "mode": "fk",
      "required": "sempre",
      "role": "aluno matriculado"
    },
    "plano": {
      "relationshipId": "matriculaPlano",
      "to": "Plano",
      "via": "Matricula.planoId",
      "cardinality": "N:1",
      "title": "Plano contratado",
      "description": "Cada matrícula é realizada obrigatoriamente em um plano da academia.",
      "mode": "fk",
      "required": "sempre",
      "role": "plano contratado"
    },
    "mensalidades": {
      "relationshipId": "mensalidadeMatricula",
      "to": "Mensalidade",
      "via": "Mensalidade.matriculaId",
      "cardinality": "1:N",
      "title": "Mensalidades da matrícula",
      "description": "Mensalidades geradas para esta matrícula.",
      "mode": "fk",
      "direction": "to",
      "required": "quando houver mensalidades geradas",
      "role": "origem da mensalidade"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma matrícula pelo identificador para a recepção e o aluno consultarem seus dados.",
    "locate.byColumn": "Lista matrículas por aluno, plano, situação ou data de início para a recepção e a gerência.",
    "count": "Conta matrículas conforme a situação e os demais filtros para a gerência acompanhar a base de alunos.",
    "listByForeignKey": "Lista as matrículas vinculadas a um aluno ou a um plano para as telas da recepção e da gerência.",
    "create": "Cria a matrícula com aluno, plano e data de início quando a recepção efetiva a contratação.",
    "transition": "Move a matrícula ativa para cancelada no cancelamento da própria matrícula pelo aluno.",
    "read.mdmRecord": "Lê o cadastro mestre do aluno apontado pela matrícula para exibir sua identificação à recepção e à gerência."
  },
  "rules": [
    "matriculaAtivaUnicaPorAluno",
    "cancelamentoSomenteMatriculaAtiva",
    "cancelamentoInterrompeGeracao"
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
      "alunoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Aluno"
        ],
        "title": "Aluno",
        "description": "Aluno ao qual esta matrícula pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "planoId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Plano"
        ],
        "title": "Plano",
        "description": "Plano da academia contratado nesta matrícula.",
        "maxLength": 0,
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
            "value": "active",
            "title": "Ativa",
            "description": "Matrícula vigente, apta à geração de mensalidades."
          },
          {
            "value": "canceled",
            "title": "Cancelada",
            "description": "Matrícula encerrada, sem geração de mensalidades futuras."
          }
        ],
        "title": "Situação",
        "description": "Situação da matrícula que determina se ela participa da geração de mensalidades futuras.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "dataInicio": {
        "type": "date",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data de início",
        "description": "Data a partir da qual o aluno inicia a matrícula no plano e pode ter mensalidades geradas.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da matrícula",
        "description": "Informações próprias da matrícula que não são usadas em filtros ou ordenações.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "dataCancelamento": {
            "type": "date",
            "of": "ContactSummary",
            "title": "Data de cancelamento",
            "description": "Data em que o aluno cancelou esta matrícula.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "lifecycleStates": [
    {
      "state": "active",
      "reachedBy": "actor"
    },
    {
      "state": "canceled",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "cancelarMatricula",
      "from": [
        "active"
      ],
      "to": "canceled",
      "by": [
        "aluno"
      ],
      "description": "Cancela a própria matrícula ativa e interrompe a geração de mensalidades futuras.",
      "ruleRefs": [
        "cancelamentoSomenteMatriculaAtiva",
        "cancelamentoInterrompeGeracao"
      ]
    }
  ]
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityMatriculaType = typeof mensalidadesAcademiaEntityMatricula;

export default mensalidadesAcademiaEntityMatricula;
