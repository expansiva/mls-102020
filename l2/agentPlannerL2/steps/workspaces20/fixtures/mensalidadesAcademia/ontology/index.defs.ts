/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "businessDomain": "Gestão de mensalidades de academia",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "mensalidadesAcademia",
    "description": "Branch details.mensalidadesAcademia of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Aluno",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "Plano",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "Matricula",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Mensalidade",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "Pagamento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "IndicadoresAcademia",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "matriculaAluno",
      "from": "Matricula",
      "to": "Aluno",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada matrícula pertence obrigatoriamente a um aluno.",
      "field": "Matricula.alunoId"
    },
    {
      "relationshipId": "matriculaPlano",
      "from": "Matricula",
      "to": "Plano",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada matrícula é realizada obrigatoriamente em um plano da academia.",
      "field": "Matricula.planoId"
    },
    {
      "relationshipId": "mensalidadeMatricula",
      "from": "Mensalidade",
      "to": "Matricula",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada mensalidade é gerada obrigatoriamente para uma matrícula.",
      "field": "Mensalidade.matriculaId"
    },
    {
      "relationshipId": "pagamentoMensalidade",
      "from": "Pagamento",
      "to": "Mensalidade",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada pagamento registrado pertence obrigatoriamente a uma mensalidade.",
      "field": "Pagamento.mensalidadeId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type MensalidadesAcademiaOntologyIndexType = typeof mensalidadesAcademiaOntologyIndex;

export default mensalidadesAcademiaOntologyIndex;
