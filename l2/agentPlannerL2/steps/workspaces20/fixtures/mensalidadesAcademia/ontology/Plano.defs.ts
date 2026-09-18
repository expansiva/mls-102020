/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Plano.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPlano = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Plano",
  "title": "Plano",
  "description": "Catálogo de planos da academia, com periodicidade, valor e dia de vencimento usados nas matrículas.",
  "displayField": "name",
  "relationships": {
    "matriculas": {
      "relationshipId": "matriculaPlano",
      "to": "Matricula",
      "via": "Matricula.planoId",
      "cardinality": "1:N",
      "title": "Matrículas no plano",
      "description": "Matrículas realizadas obrigatoriamente neste plano da academia.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um plano pelo seu identificador no repositório de planos para a recepção ou a gerência que já possui a referência.",
    "locate.byColumn": "Lista planos por nome, com ordenação e paginação, para a recepção ou a gerência localizar o plano escolhido.",
    "locate.byText": "Pesquisa planos pelo trecho digitado no nome para a recepção ou a gerência encontrar rapidamente um plano.",
    "count": "Conta os planos que atendem ao filtro informado para a gerência acompanhar o catálogo.",
    "listByForeignKey": "Lista as matrículas vinculadas a um plano para a gerência consultar os alunos que o utilizam.",
    "create": "Cadastra um novo plano com periodicidade, valor e dia de vencimento para a gerência manter o catálogo.",
    "update": "Atualiza os dados comerciais de um plano para a gerência manter o catálogo vigente.",
    "delete": "Remove fisicamente um plano do catálogo para a gerência quando ele não deve mais ser utilizado.",
    "uniqueKey": "Impede o cadastro de dois planos com o mesmo nome por meio da chave única do catálogo, para a gerência."
  },
  "rules": [],
  "writer": "crud",
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_plano",
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
      "name": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "of": "Address",
        "title": "Nome",
        "description": "Nome pelo qual o plano é identificado e localizado pela recepção e pela gerência.",
        "maxLength": 120,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Detalhes do plano",
        "description": "Características comerciais do plano da academia.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "periodicidade": {
            "type": "enum",
            "required": true,
            "of": "Address",
            "values": [
              {
                "value": "monthly",
                "title": "Mensal",
                "description": "Plano comercial mensal."
              },
              {
                "value": "quarterly",
                "title": "Trimestral",
                "description": "Plano comercial trimestral."
              },
              {
                "value": "annual",
                "title": "Anual",
                "description": "Plano comercial anual."
              }
            ],
            "title": "Periodicidade",
            "description": "Periodicidade comercial do plano contratado pelo aluno.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          },
          "valor": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Valor",
            "description": "Valor do plano usado para gerar a mensalidade do aluno.",
            "maxLength": 0,
            "min": 0.01,
            "max": 0
          },
          "diaVencimento": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Dia de vencimento",
            "description": "Dia do mês usado como vencimento das mensalidades geradas para este plano.",
            "maxLength": 0,
            "min": 1,
            "max": 31
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "name"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityPlanoType = typeof mensalidadesAcademiaEntityPlano;

export default mensalidadesAcademiaEntityPlano;
