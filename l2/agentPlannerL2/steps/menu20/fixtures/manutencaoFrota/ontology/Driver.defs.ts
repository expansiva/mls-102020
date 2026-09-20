/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Driver.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityDriver = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Driver",
  "title": "Motorista",
  "description": "Pessoa que conduz veículos atribuídos e registra os abastecimentos realizados.",
  "displayField": "details.identification.name",
  "relationships": {
    "vehicleAssignments": {
      "relationshipId": "vehicleAssignmentDriver",
      "to": "VehicleAssignment",
      "via": "VehicleAssignment.driverId",
      "cardinality": "1:N",
      "title": "Atribuições de veículo",
      "description": "Atribuições que autorizam este motorista a conduzir veículos.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "motorista atribuído"
    },
    "assignedVehicles": {
      "relationshipId": "vehicleAssignedDrivers",
      "to": "Vehicle",
      "via": "VehicleAssignment",
      "cardinality": "N:N",
      "title": "Veículos atribuídos",
      "description": "Veículos que este motorista pode consultar e conduzir, obtidos pelas atribuições de veículo.",
      "mode": "throughTable",
      "path": "VehicleAssignment.vehicleId -> VehicleAssignment.driverId",
      "derived": true,
      "direction": "to",
      "role": "motorista autorizado"
    },
    "fuelings": {
      "relationshipId": "fuelingDriver",
      "to": "Fueling",
      "via": "Fueling.driverId",
      "cardinality": "1:N",
      "title": "Abastecimentos registrados",
      "description": "Abastecimentos registrados por este motorista.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "motorista registrador"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um motorista pelo identificador mestre, carregando seu nome para atribuições e abastecimentos, para gestores e telas que já possuem o identificador.",
    "locate.byName": "Localiza pessoas pelo nome para selecionar ou conferir um motorista durante o cadastro de atribuições, para o gestor de frota.",
    "locate.byDocument": "Localiza uma pessoa pelo documento nacional para evitar duplicidade ao cadastrar ou associar um motorista, para o gestor de frota.",
    "register.createOrAttach": "Cria a pessoa quando não existir ou anexa o papel de Motorista ao registro mestre encontrado por documento, para o gestor de frota.",
    "edit.platformFields": "Atualiza os dados de identificação do motorista mantidos pela plataforma, para o gestor de frota.",
    "inactivate": "Inativa ou reativa o registro mestre de um motorista que deixou de operar na frota, para o gestor de frota.",
    "listLinks": "Exibe as atribuições, os veículos autorizados e os abastecimentos relacionados ao motorista, para o gestor de frota.",
    "invite.login": "Convida o motorista para acessar o sistema com seu próprio login, para o gestor de frota.",
    "audit": "Mostra quem alterou os dados do motorista e quando, por meio da auditoria da plataforma, para o gestor de frota."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-ssn-unique-for-us",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "manutencaoFrota.Driver",
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
        "description": "Documento mestre da pessoa que atua como motorista na manutenção de frota.",
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
                "description": "Indica que este registro mestre é uma pessoa que exerce o papel de motorista.",
                "title": "Tipo de cadastro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nome pelo qual o motorista é identificado nas atribuições de veículo e nos abastecimentos.",
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
                    "title": "Mesclado",
                    "description": "Registro incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Registro bloqueado pela plataforma."
                  }
                ],
                "title": "Situação",
                "description": "Situação de atividade do registro mestre do motorista.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "Número de seguridade social dos Estados Unidos."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Identificador fiscal empresarial dos Estados Unidos."
                  },
                  {
                    "value": "Passport",
                    "title": "Passaporte",
                    "description": "Passaporte."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Carteira de motorista",
                    "description": "Documento de habilitação."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identidade."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Cadastro Nacional da Pessoa Jurídica."
                  },
                  {
                    "value": "VAT",
                    "title": "VAT",
                    "description": "Identificador de imposto sobre valor agregado."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro documento reconhecido."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar e deduplicar o motorista quando informado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do documento nacional informado para deduplicar o motorista.",
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
                "maxLength": 2,
                "default": "US",
                "description": "Código ISO do país aplicável ao documento e às regras legais do motorista.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa mantidos pela plataforma e usados para reconhecer e manter o motorista."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da plataforma que este papel não utiliza diretamente."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados próprios de pessoa mantidos pela plataforma que este papel não utiliza diretamente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, apenas para leitura pelo módulo."
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

export type ManutencaoFrotaEntityDriverType = typeof manutencaoFrotaEntityDriver;

export default manutencaoFrotaEntityDriver;
