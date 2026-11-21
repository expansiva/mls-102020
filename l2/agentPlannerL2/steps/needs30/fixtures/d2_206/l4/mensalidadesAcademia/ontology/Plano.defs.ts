/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Plano.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPlano = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Plano",
  "title": "Plano",
  "description": "Plano da academia (mensal, trimestral ou anual) com valor e dia de vencimento, oferecido nas matrículas.",
  "displayField": "nome",
  "relationships": {
    "matriculas": {
      "relationshipId": "matriculaPlano",
      "to": "Matricula",
      "via": "Matricula.planoId",
      "cardinality": "1:N",
      "title": "Matrículas do plano",
      "description": "As matrículas feitas neste plano, de onde as mensalidades tiram valor e dia de vencimento.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Abre um plano pelo identificador, quando a recepção confere valor e dia de vencimento na matrícula ou a gerência revê o plano.",
    "locate.byColumn": "Lista os planos filtrados por periodicidade e ordenados pelo nome, para a gerência consultar o cadastro e a recepção escolher o plano da matrícula.",
    "locate.byText": "Busca planos por parte do nome, para a gerência evitar duplicidade antes de cadastrar e a recepção achar o plano pedido pelo aluno.",
    "count": "Conta os planos cadastrados por periodicidade, exibido no cabeçalho da lista de planos da gerência.",
    "create": "Cadastra um novo plano com nome, periodicidade, valor e dia de vencimento; usado pela gerência.",
    "update": "Altera valor, dia de vencimento ou descrição de um plano; usado pela gerência, valendo para as mensalidades geradas depois da alteração.",
    "delete": "Remove um plano cadastrado por engano; usado pela gerência e recusado pelo módulo quando há matrícula apontando para ele.",
    "uniqueKey": "Recusa um segundo plano com o mesmo nome, por índice único na coluna nome, ao gravar o cadastro da gerência.",
    "comment": "Permite à gerência deixar anotações internas sobre o plano, como condições combinadas ou promoções."
  },
  "rules": [
    "planoNomeUnico",
    "planoValorPositivo",
    "planoDiaVencimentoValido",
    "planoComMatriculaNaoPodeSerExcluido"
  ],
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
      "nome": {
        "type": "string",
        "required": true,
        "unique": true,
        "indexed": true,
        "title": "Nome do plano",
        "description": "Nome pelo qual a gerência e a recepção identificam o plano na hora de matricular o aluno. É único entre os planos da academia.",
        "maxLength": 80
      },
      "periodicidade": {
        "type": "enum",
        "required": true,
        "indexed": true,
        "values": [
          {
            "value": "monthly",
            "title": "Mensal"
          },
          {
            "value": "quarterly",
            "title": "Trimestral"
          },
          {
            "value": "yearly",
            "title": "Anual"
          }
        ],
        "title": "Periodicidade",
        "description": "Período de cobrança do plano; a recepção filtra os planos por ela ao escolher o plano da matrícula."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Dados do plano",
        "description": "Valor, dia de vencimento e descrição do plano.",
        "fields": {
          "valor": {
            "type": "money",
            "required": true,
            "title": "Valor",
            "description": "Valor do plano, copiado para cada mensalidade gerada para os alunos matriculados nele.",
            "min": 0.01
          },
          "diaVencimento": {
            "type": "integer",
            "required": true,
            "title": "Dia de vencimento",
            "description": "Dia do mês em que vencem as mensalidades geradas para os alunos deste plano.",
            "min": 1,
            "max": 31
          },
          "descricao": {
            "type": "text",
            "title": "Descrição",
            "description": "Observações da gerência sobre o plano, mostradas à recepção ao escolher o plano.",
            "maxLength": 500
          },
          "quantidadeMatriculasAtivas": {
            "type": "integer",
            "derived": true,
            "title": "Matrículas ativas",
            "description": "Quantidade de matrículas ativas (não canceladas) feitas neste plano."
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "nome"
    ]
  ]
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityPlanoType = typeof mensalidadesAcademiaEntityPlano;

export default mensalidadesAcademiaEntityPlano;
