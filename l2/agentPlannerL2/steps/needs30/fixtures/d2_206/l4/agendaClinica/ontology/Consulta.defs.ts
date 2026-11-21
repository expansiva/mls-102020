/// <mls fileReference="_102047_/l4/agendaClinica/ontology/Consulta.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaEntityConsulta = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "entityId": "Consulta",
  "title": "Consulta",
  "description": "Agendamento clínico de um paciente com um profissional em data e horário, incluindo confirmação, falta ou atendimento realizado.",
  "displayField": "scheduledAt",
  "relationships": {
    "paciente": {
      "relationshipId": "consultaPaciente",
      "to": "Paciente",
      "via": "Consulta.pacienteId",
      "cardinality": "N:1",
      "title": "Paciente da consulta",
      "description": "Cada consulta é agendada para um paciente, que pode ter várias consultas.",
      "mode": "fk",
      "required": "sempre",
      "role": "paciente"
    },
    "profissional": {
      "relationshipId": "consultaProfissional",
      "to": "Profissional",
      "via": "Consulta.profissionalId",
      "cardinality": "N:1",
      "title": "Profissional da consulta",
      "description": "Cada consulta é atribuída a um profissional, que pode ter várias consultas em sua agenda.",
      "mode": "fk",
      "required": "sempre",
      "role": "responsável pelo atendimento"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma consulta pelo identificador da linha · consulta o repositório pelo id · recepcionista e profissional quando já possuem a consulta selecionada.",
    "locate.byColumn": "Lista consultas por paciente, profissional, data e situação, com ordenação e paginação · filtra as colunas indexadas, em especial profissionalId e scheduledAt · recepcionista para a agenda e profissional apenas para sua própria agenda diária.",
    "count": "Conta consultas que atendem aos filtros informados · executa a mesma condição de busca sem paginação · recepcionista ao consultar a agenda.",
    "listByForeignKey": "Lista as consultas vinculadas a um paciente ou profissional · busca pelas chaves estrangeiras pacienteId ou profissionalId · recepcionista na consulta de histórico e profissional na própria agenda.",
    "create": "Cria uma consulta agendada para paciente, profissional, data e horário · insere a linha com situação Agendada · recepcionista ao marcar a consulta.",
    "update": "Atualiza dados não relacionados à mudança de situação de uma consulta · aplica alteração parcial na linha · recepcionista ao corrigir um agendamento.",
    "transition": "Muda a situação da consulta conforme as transições permitidas · atualiza a coluna indexada de situação e valida as regras do módulo · recepcionista para confirmar ou registrar falta e profissional para registrar atendimento.",
    "uniqueKey": "Impede dois agendamentos no mesmo horário para o mesmo profissional · aplica índice único em profissional e data/hora · sistema ao criar ou alterar uma consulta.",
    "read.mdmRecord": "Lê os dados mestres do paciente e do profissional vinculados à consulta · resolve pacienteId e profissionalId no MDM · recepcionista e profissional ao visualizar a agenda."
  },
  "rules": [
    "consultaSemConflito",
    "transicaoConsultaValida",
    "anotacaoObrigatoriaNoAtendimento"
  ],
  "kind": "entity",
  "class": "event",
  "storage": {
    "target": "moduleDatabase",
    "table": "agendaClinica_consulta",
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
      "pacienteId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Paciente"
        ],
        "title": "Paciente",
        "description": "Paciente para quem a consulta foi agendada.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "profissionalId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Profissional"
        ],
        "title": "Profissional",
        "description": "Profissional responsável pelo atendimento agendado.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "scheduledAt": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "title": "Data e horário",
        "description": "Data e horário previstos para a consulta, usados para consultar a agenda diária.",
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
            "value": "scheduled",
            "title": "Agendada",
            "description": "Consulta marcada e ainda sem confirmação registrada."
          },
          {
            "value": "confirmed",
            "title": "Confirmada",
            "description": "Paciente confirmou a consulta por telefone."
          },
          {
            "value": "noShow",
            "title": "Falta",
            "description": "Paciente não compareceu à consulta."
          },
          {
            "value": "attended",
            "title": "Atendida",
            "description": "Profissional realizou o atendimento."
          }
        ],
        "title": "Situação",
        "description": "Situação registrada da consulta na agenda clínica.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da consulta",
        "description": "Informações clínicas registradas para a consulta que não são usadas como filtro ou ordenação.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "attendanceNote": {
            "type": "text",
            "of": "ContactSummary",
            "title": "Anotação do atendimento",
            "description": "Anotação registrada pelo profissional sobre o atendimento realizado.",
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
      "profissionalId",
      "scheduledAt"
    ]
  ],
  "lifecycleStates": [
    {
      "state": "scheduled",
      "reachedBy": "actor"
    },
    {
      "state": "confirmed",
      "reachedBy": "actor"
    },
    {
      "state": "noShow",
      "reachedBy": "actor"
    },
    {
      "state": "attended",
      "reachedBy": "actor"
    }
  ],
  "transitions": [
    {
      "transitionId": "confirmarConsulta",
      "from": [
        "scheduled"
      ],
      "to": "confirmed",
      "by": [
        "recepcionista"
      ],
      "description": "A recepcionista registra a confirmação telefônica do paciente para a consulta.",
      "payload": [],
      "ruleRefs": [
        "transicaoConsultaValida"
      ]
    },
    {
      "transitionId": "registrarFalta",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "noShow",
      "by": [
        "recepcionista"
      ],
      "description": "A recepcionista registra que o paciente não compareceu à consulta.",
      "payload": [],
      "ruleRefs": [
        "transicaoConsultaValida"
      ]
    },
    {
      "transitionId": "registrarAtendimento",
      "from": [
        "scheduled",
        "confirmed"
      ],
      "to": "attended",
      "by": [
        "profissional"
      ],
      "description": "O profissional registra que realizou o atendimento e inclui sua anotação.",
      "payload": [
        "details.attendanceNote"
      ],
      "ruleRefs": [
        "transicaoConsultaValida",
        "anotacaoObrigatoriaNoAtendimento"
      ]
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type AgendaClinicaEntityConsultaType = typeof agendaClinicaEntityConsulta;

export default agendaClinicaEntityConsulta;
