/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "businessDomain": "Gestão de mensalidades de academia: alunos, planos, matrículas, geração mensal de mensalidades, pagamentos, bloqueio por inadimplência e painel financeiro.",
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
      "entityId": "Recepcao",
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
      "class": "event"
    },
    {
      "entityId": "Pagamento",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "PainelMensalidades",
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
      "description": "Cada matrícula pertence a um aluno; um aluno pode ter várias matrículas ao longo do tempo.",
      "field": "Matricula.alunoId"
    },
    {
      "relationshipId": "matriculaPlano",
      "from": "Matricula",
      "to": "Plano",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "A matrícula é feita em um plano, de onde vêm o valor e o dia de vencimento.",
      "field": "Matricula.planoId"
    },
    {
      "relationshipId": "matriculaRecepcao",
      "from": "Matricula",
      "to": "Recepcao",
      "type": "manyToOne",
      "required": false,
      "mode": "fk",
      "description": "Atendente da recepção que registrou a matrícula.",
      "field": "Matricula.recepcaoId"
    },
    {
      "relationshipId": "mensalidadeMatricula",
      "from": "Mensalidade",
      "to": "Matricula",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada mensalidade é gerada para uma matrícula ativa, uma por mês de referência.",
      "field": "Mensalidade.matriculaId"
    },
    {
      "relationshipId": "pagamentoMensalidade",
      "from": "Pagamento",
      "to": "Mensalidade",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "O pagamento quita uma mensalidade.",
      "field": "Pagamento.mensalidadeId"
    },
    {
      "relationshipId": "alunoMensalidades",
      "from": "Aluno",
      "to": "Mensalidade",
      "type": "oneToMany",
      "required": false,
      "mode": "throughTable",
      "description": "Mensalidades do aluno, obtidas pelas suas matrículas.",
      "through": "Matricula",
      "path": "Aluno <- Matricula.alunoId <- Mensalidade.matriculaId",
      "derived": true
    }
  ]
} as const satisfies Ns5Readonly<Ns5OntologyIndexV3>;

export type MensalidadesAcademiaOntologyIndexType = typeof mensalidadesAcademiaOntologyIndex;

export default mensalidadesAcademiaOntologyIndex;
