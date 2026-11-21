/// <mls fileReference="_102047_/l4/agendaClinica/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const agendaClinicaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "agendaClinica",
  "businessDomain": "Agenda clínica",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "agendaClinica",
    "description": "Branch details.agendaClinica of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Paciente",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Profissional",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Consulta",
      "kind": "entity",
      "class": "event"
    }
  ],
  "relationships": [
    {
      "relationshipId": "consultaPaciente",
      "from": "Consulta",
      "to": "Paciente",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada consulta é agendada para um paciente, e um paciente pode ter várias consultas.",
      "field": "Consulta.pacienteId"
    },
    {
      "relationshipId": "consultaProfissional",
      "from": "Consulta",
      "to": "Profissional",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada consulta é atribuída a um profissional, e um profissional pode ter várias consultas em sua agenda.",
      "field": "Consulta.profissionalId"
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type AgendaClinicaOntologyIndexType = typeof agendaClinicaOntologyIndex;

export default agendaClinicaOntologyIndex;
