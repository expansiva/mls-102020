/// <mls fileReference="_102047_/l4/reembolsoDespesas/ontology/GestorEquipe.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const reembolsoDespesasEntityGestorEquipe = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "reembolsoDespesas",
  "entityId": "GestorEquipe",
  "title": "Gestor da equipe",
  "description": "Pessoa responsável por avaliar as despesas dos colaboradores de sua equipe.",
  "displayField": "details.identification.name",
  "relationships": {
    "colaboradoresReportam": {
      "relationshipId": "colaboradorReportaGestor",
      "to": "Colaborador",
      "via": "ReportsTo",
      "cardinality": "1:N",
      "title": "Colaboradores da equipe",
      "description": "Colaboradores que se reportam a este gestor e cujas despesas ele pode avaliar.",
      "roles": [
        "direct-report"
      ],
      "direction": "to"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um gestor pelo identificador mestre · usa leitura direta por mdmId · usado pelo módulo ao apresentar o responsável pela avaliação.",
    "locate.byName": "Localiza gestores pelo nome · pesquisa o índice de pessoas ativas por texto do nome · usada ao vincular ou manter a equipe.",
    "locate.byDocument": "Localiza um gestor pelo CPF · consulta o índice de documento para evitar duplicidade · usada no cadastro do gestor.",
    "register.createOrAttach": "Cria ou associa a pessoa ao papel de gestor da equipe · localiza pelo documento e anexa a etiqueta reembolsoDespesas.GestorEquipe quando necessário · usada na manutenção dos gestores.",
    "edit.platformFields": "Atualiza os dados cadastrais de plataforma do gestor · grava os campos permitidos do registro mestre e atualiza o índice · usada na manutenção cadastral.",
    "edit.moduleNamespace": "Atualiza exclusivamente o namespace do módulo do gestor · grava somente details.reembolsoDespesas · usada pelo módulo caso passe a haver dado exclusivo do papel.",
    "inactivate": "Inativa ou reativa o papel de gestor sem apagar a pessoa · altera a situação do registro mestre · usada quando o gestor deixa ou retoma a responsabilidade pela equipe.",
    "link": "Vincula colaboradores a este gestor · cria a relação versionada ReportsTo com o papel direct-report · usada na definição da equipe.",
    "unlink": "Encerra o vínculo de um colaborador com este gestor · inativa a relação ReportsTo preservando seu histórico · usada quando muda a gestão da equipe.",
    "listLinks": "Lista os colaboradores relacionados ao gestor · consulta os vínculos ReportsTo e sua vigência · usada para determinar as despesas que o gestor pode avaliar.",
    "audit": "Consulta as alterações do cadastro do gestor · lê a trilha de auditoria do registro mestre · usada na conferência administrativa."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "reembolsoDespesas.GestorEquipe",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento mestre da pessoa que atua como gestor da equipe no módulo de reembolso de despesas.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Person",
                    "title": "Pessoa",
                    "description": "Pessoa física."
                  }
                ],
                "description": "Indica que este registro mestre é uma pessoa.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o gestor da equipe é identificado nas avaliações de despesas.",
                "title": "Nome",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo",
                    "description": "Registro disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Registro fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Unificado",
                    "description": "Registro unificado a outro cadastro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação no cadastro mestre",
                "description": "Situação de atividade do registro mestre do gestor.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e evitar duplicidade do gestor.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional do gestor, quando informado.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código do país aplicável ao documento e às regras cadastrais do gestor.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas que incluem o papel de GestorEquipe no módulo.",
                "title": "Etiquetas",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa gestora mantidos pela plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências compactas derivadas dos relacionamentos do gestor, incluindo os colaboradores que se reportam a ele.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados comuns do registro mestre, incluindo referências de relacionamentos calculadas pela plataforma."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados específicos de pessoa física mantidos pela plataforma; nenhum é necessário para a avaliação de despesas."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização e compartilhados entre módulos, somente para leitura neste módulo."
          },
          "reembolsoDespesas": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ReembolsoDespesasEntityGestorEquipeType = typeof reembolsoDespesasEntityGestorEquipe;

export default reembolsoDespesasEntityGestorEquipe;
