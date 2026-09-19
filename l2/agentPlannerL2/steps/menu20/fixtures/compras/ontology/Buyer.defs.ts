/// <mls fileReference="_102047_/l4/compras/ontology/Buyer.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntityBuyer = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Buyer",
  "title": "Comprador",
  "description": "Pessoa compradora vinculada às condições de fornecimento que cadastra para sustentar o escopo pessoal de seu trabalho.",
  "displayField": "details.identification.name",
  "relationships": {
    "supplierOfferings": {
      "relationshipId": "supplierOfferingBuyer",
      "to": "SupplierOffering",
      "via": "SupplierOffering.buyerId",
      "cardinality": "1:N",
      "title": "Condições de fornecimento cadastradas",
      "description": "Condições de fornecimento cadastradas por esta pessoa compradora para fornecedores e produtos.",
      "mode": "fk",
      "direction": "to",
      "required": "quando a condição de fornecimento estiver cadastrada",
      "role": "comprador"
    }
  },
  "capabilities": {
    "read.byId": "Lê a pessoa compradora pelo identificador mestre para exibir quem cadastrou uma condição de fornecimento; usado pelas telas de condições e pelo escopo pessoal do comprador.",
    "locate.byName": "Localiza pessoas compradoras pelo nome no índice mestre para associá-las ao cadastro de condições de fornecimento; usado pela administração de compras.",
    "register.createOrAttach": "Cria ou vincula a pessoa existente ao papel de Comprador no MDM e aplica a tag compras.Buyer; usado pela administração interna quando uma pessoa passa a cadastrar condições de fornecimento.",
    "inactivate": "Inativa o papel da pessoa compradora no registro mestre sem excluir seu histórico; usado pela administração interna quando ela deixa de atuar em compras.",
    "listLinks": "Lista as condições de fornecimento que referenciam a pessoa compradora, pelo vínculo de chave estrangeira; usado para consultar o cadastro sob sua responsabilidade.",
    "audit": "Consulta quem alterou o registro mestre da pessoa compradora e quando; usado pela administração de compras para rastreabilidade."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "compras.Buyer",
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
        "description": "Documento mestre da pessoa que atua como compradora no módulo de compras.",
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
                    "description": "Pessoa natural que exerce o papel de comprador."
                  }
                ],
                "description": "Classifica este registro mestre como pessoa.",
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
                "description": "Nome pelo qual a pessoa compradora é reconhecida nas condições de fornecimento que cadastrou.",
                "title": "Nome",
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
                "description": "Código do país aplicável ao cadastro da pessoa compradora.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa compradora mantidos pela plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados base compartilhados do registro mestre, sem campos adicionais necessários para este papel."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados próprios de pessoa natural mantidos pela plataforma; nenhum campo adicional é necessário para o papel de comprador."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, apenas para leitura pelo módulo de compras."
          },
          "compras": {
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

export type ComprasEntityBuyerType = typeof comprasEntityBuyer;

export default comprasEntityBuyer;
