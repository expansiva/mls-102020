/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Workshop.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityWorkshop = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Workshop",
  "title": "Oficina",
  "description": "Empresa oficina responsável pela execução de serviços registrados nas ordens de manutenção.",
  "displayField": "details.identification.name",
  "relationships": {
    "maintenanceOrders": {
      "relationshipId": "maintenanceOrderWorkshop",
      "to": "MaintenanceOrder",
      "via": "MaintenanceOrder.workshopId",
      "cardinality": "1:N",
      "title": "Ordens de manutenção da oficina",
      "description": "Ordens de manutenção que informam esta oficina como responsável pelo serviço.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre para cada ordem de manutenção.",
      "role": "oficina responsável"
    }
  },
  "capabilities": {
    "read.byId": "Consulta uma oficina pelo identificador mestre para apresentar a empresa vinculada à ordem de manutenção; usado pelo gestor de frota.",
    "locate.byName": "Localiza oficinas pelo nome para selecionar a responsável ao abrir uma ordem de manutenção; usado pelo gestor de frota.",
    "locate.byDocument": "Localiza uma oficina pelo CNPJ antes do cadastro para evitar duplicidade; usado pelo gestor de frota.",
    "register.createOrAttach": "Cria ou associa uma empresa oficina ao módulo por CNPJ quando disponível, atribuindo a função de Oficina; usado pelo gestor de frota.",
    "edit.platformFields": "Atualiza os dados corporativos e de identificação da oficina mantidos pela plataforma; usado pelo gestor de frota.",
    "inactivate": "Inativa ou reativa uma oficina sem apagar seu histórico nas ordens de manutenção; usado pelo gestor de frota.",
    "listLinks": "Lista as ordens de manutenção que apontam para a oficina responsável; usado pelo gestor de frota.",
    "attach.document": "Anexa documentos relacionados à empresa oficina no registro mestre; usado pelo gestor de frota.",
    "comment": "Registra observações sobre a oficina no registro mestre; usado pelo gestor de frota.",
    "audit": "Consulta quem alterou os dados da oficina e quando; usado pelo gestor de frota."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-company-ein-unique-for-us",
    "rule-company-legal-name-required",
    "rule-document-shape-validated"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Company",
  "roleTag": "manutencaoFrota.Workshop",
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
        "description": "Documento mestre da empresa oficina, com dados de identificação, dados corporativos e o espaço deste módulo.",
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
                    "value": "Company",
                    "title": "Empresa",
                    "description": "Empresa cadastrada como oficina responsável por serviços de manutenção."
                  }
                ],
                "description": "Subtipo mestre que identifica este registro como uma empresa.",
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
                "description": "Nome pelo qual a oficina é reconhecida nas ordens de manutenção.",
                "title": "Nome da oficina",
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
                    "title": "Ativa",
                    "description": "Oficina disponível para ser informada em ordens de manutenção."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativa",
                    "description": "Oficina fora de uso para novos registros."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclada",
                    "description": "Registro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueada",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação",
                "description": "Situação de atividade do registro mestre da oficina.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Cadastro Nacional da Pessoa Jurídica da oficina."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para localizar e evitar duplicidade da empresa oficina.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional da empresa oficina.",
                "title": "Documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Código ISO do país ao qual pertencem o documento e as regras da empresa oficina.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da empresa oficina mantidos pela plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base da empresa mantidos pela plataforma."
          },
          "company": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "companyKind": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "LegalEntity",
                    "title": "Pessoa jurídica",
                    "description": "Empresa legalmente constituída que presta serviços de oficina."
                  }
                ],
                "description": "Classificação da empresa cadastrada como oficina.",
                "title": "Natureza da empresa",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "legalName": {
                "type": "string",
                "required": true,
                "description": "Nome oficial registrado da empresa oficina.",
                "title": "Razão social",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados corporativos da empresa oficina mantidos pela plataforma."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso comum entre módulos; este módulo apenas os lê."
          },
          "manutencaoFrota": {
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

export type ManutencaoFrotaEntityWorkshopType = typeof manutencaoFrotaEntityWorkshop;

export default manutencaoFrotaEntityWorkshop;
