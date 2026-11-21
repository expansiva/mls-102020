/// <mls fileReference="_102047_/l4/agendaClinica/access.defs.ts" enhancement="_blank"/>

import type { Ns5AccessArtifact, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaAccess = {
  "schemaVersion": "2026-09-12-ns5-access-v3",
  "moduleName": "agendaClinica",
  "actors": [
    {
      "actorId": "recepcionista",
      "kind": "internal",
      "origin": "named",
      "title": "Recepcionista",
      "description": "Cadastra pacientes, agenda consultas, confirma por telefone e registra faltas.",
      "personEntity": ""
    },
    {
      "actorId": "profissional",
      "kind": "internal",
      "origin": "named",
      "title": "Profissional",
      "description": "Consulta a própria agenda diária e registra o atendimento com uma anotação.",
      "personEntity": "Profissional"
    }
  ],
  "grants": [
    {
      "grantId": "recepcionistaGerenciarPacientesEconsultas",
      "actorRef": "recepcionista",
      "title": "Gerenciar pacientes e consultas",
      "description": "Permite à recepcionista cadastrar e localizar pacientes, agendar consultas, registrar confirmações telefônicas e marcar faltas em toda a clínica.",
      "entityRefs": [
        "Paciente",
        "Consulta"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os pacientes e as consultas da organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza os dados de identificação e contato do paciente e os dados operacionais da consulta, sem a anotação de atendimento.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.version",
          "Paciente.details.identification",
          "Paciente.details.base",
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status"
        ]
      }
    },
    {
      "grantId": "recepcionistaConsultarProfissionais",
      "actorRef": "recepcionista",
      "title": "Consultar profissionais da clínica",
      "description": "Permite à recepcionista identificar os profissionais disponíveis da clínica para registrar consultas e manter seus cadastros profissionais.",
      "entityRefs": [
        "Profissional"
      ],
      "dataScope": {
        "mode": "organization",
        "description": "Abrange os profissionais cadastrados na organização."
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza a identificação, a situação e o tipo de atuação profissional necessários para o agendamento.",
        "allowedFields": [
          "Profissional.id",
          "Profissional.version",
          "Profissional.details.identification",
          "Profissional.details.agendaClinica"
        ]
      }
    },
    {
      "grantId": "profissionalConsultarEregistrarPropriaAgenda",
      "actorRef": "profissional",
      "title": "Consultar e registrar a própria agenda",
      "description": "Permite ao profissional consultar somente as consultas vinculadas à sua própria agenda e registrar o atendimento com anotação.",
      "entityRefs": [
        "Profissional",
        "Consulta"
      ],
      "dataScope": {
        "mode": "own",
        "description": "Abrange o próprio cadastro profissional e as consultas que chegam ao profissional autenticado.",
        "anchorEntity": "Profissional"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza a identificação e o tipo do próprio profissional, além dos dados da consulta e da anotação de atendimento.",
        "allowedFields": [
          "Profissional.id",
          "Profissional.details.identification",
          "Profissional.details.agendaClinica",
          "Consulta.id",
          "Consulta.version",
          "Consulta.pacienteId",
          "Consulta.profissionalId",
          "Consulta.scheduledAt",
          "Consulta.status",
          "Consulta.details.attendanceNote"
        ]
      }
    },
    {
      "grantId": "profissionalIdentificarPacientesDaPropriaAgenda",
      "actorRef": "profissional",
      "title": "Identificar pacientes da própria agenda",
      "description": "Permite ao profissional identificar os pacientes que possuem consulta vinculada à sua agenda, para visualizá-los nos horários de atendimento.",
      "entityRefs": [
        "Paciente"
      ],
      "dataScope": {
        "mode": "related",
        "description": "Abrange os pacientes relacionados ao profissional autenticado pelas consultas de sua própria agenda.",
        "anchorEntity": "Paciente"
      },
      "disclosure": {
        "mode": "fieldsOnly",
        "description": "Disponibiliza somente a identificação do paciente necessária para a agenda do profissional.",
        "allowedFields": [
          "Paciente.id",
          "Paciente.details.identification"
        ]
      }
    }
  ]
} as const satisfies Ns5Readonly<Ns5AccessArtifact>;

export type AgendaClinicaAccessType = typeof agendaClinicaAccess;

export default agendaClinicaAccess;
