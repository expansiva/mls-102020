/// <mls fileReference="_102047_/l4/compras/ontology/SupplierContact.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntitySupplierContact = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "SupplierContact",
  "title": "Contato do fornecedor",
  "description": "Canal de contato vinculado ao fornecedor para comunicação comercial.",
  "displayField": "details.identification.name",
  "relationships": {
    "supplier": {
      "relationshipId": "supplierHasContact",
      "to": "Supplier",
      "via": "HasContact",
      "cardinality": "N:1",
      "title": "Fornecedor",
      "description": "Fornecedor ao qual este canal de contato está vinculado para comunicação comercial.",
      "direction": "to",
      "role": "HasContact"
    }
  },
  "capabilities": {
    "read.byId": "Lê o canal de contato pelo identificador do MDM para exibi-lo ao consultar um fornecedor, usado por comprador e gerente de compras.",
    "locate.byName": "Localiza canais de contato pelo nome reconhecível no cadastro mestre para o comprador encontrar um contato comercial.",
    "locate.byContact": "Localiza o canal pelo telefone, e-mail ou outro valor de contato para identificar o fornecedor relacionado, usado pelo comprador.",
    "register.createOrAttach": "Cria ou vincula ao módulo o canal de contato já existente no MDM durante o cadastro do fornecedor, usado pelo comprador.",
    "edit.platformFields": "Atualiza nome, valor, tipo e verificação do canal de contato no cadastro mestre, usado pelo comprador.",
    "inactivate": "Inativa ou reativa um canal que não deve mais ser usado na comunicação comercial, usado pelo comprador.",
    "link": "Vincula este canal de contato ao fornecedor por meio do relacionamento HasContact, usado pelo comprador.",
    "unlink": "Encerra o vínculo deste canal com o fornecedor preservando o histórico do relacionamento, usado pelo comprador.",
    "listLinks": "Lista o fornecedor vinculado e a vigência do vínculo deste canal de contato, usado pelo comprador.",
    "audit": "Consulta quem alterou o canal de contato e quando, usado pelo gerente de compras para acompanhamento."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-contact-value-unique-per-type"
  ],
  "kind": "role",
  "subtype": "ContactChannel",
  "roleTag": "compras.SupplierContact",
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
        "description": "Documento do cadastro mestre do canal de contato usado na comunicação comercial com fornecedores.",
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
                    "value": "ContactChannel",
                    "title": "Canal de contato",
                    "description": "Canal de contato cadastrado no MDM."
                  }
                ],
                "description": "Subtipo do cadastro mestre, mantido como canal de contato.",
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
                "description": "Nome pelo qual o comprador reconhece o canal de contato do fornecedor.",
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
                    "description": "Canal disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Canal fora de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Canal incorporado a outro cadastro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Canal impedido de uso."
                  }
                ],
                "title": "Situação",
                "description": "Situação do canal de contato no cadastro mestre.",
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
                "description": "País ao qual se aplicam as regras do canal de contato.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação e situação do canal de contato no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do cadastro mestre do canal de contato."
          },
          "contactChannel": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contactType": {
                "type": "enum",
                "required": true,
                "values": [
                  {
                    "value": "Phone",
                    "title": "Telefone",
                    "description": "Número de telefone."
                  },
                  {
                    "value": "Email",
                    "title": "E-mail",
                    "description": "Endereço de e-mail."
                  },
                  {
                    "value": "WhatsApp",
                    "title": "WhatsApp",
                    "description": "Contato por WhatsApp."
                  },
                  {
                    "value": "Instagram",
                    "title": "Instagram",
                    "description": "Perfil do Instagram."
                  },
                  {
                    "value": "LinkedIn",
                    "title": "LinkedIn",
                    "description": "Perfil do LinkedIn."
                  },
                  {
                    "value": "X",
                    "title": "X",
                    "description": "Perfil na rede X."
                  },
                  {
                    "value": "Other",
                    "title": "Outro",
                    "description": "Outro meio de contato."
                  }
                ],
                "title": "Tipo de contato",
                "description": "Tipo do canal usado para comunicação comercial com o fornecedor.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "value": {
                "type": "string",
                "required": true,
                "description": "Valor não mascarado do canal de contato comercial do fornecedor.",
                "title": "Contato",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "isVerified": {
                "type": "boolean",
                "required": true,
                "title": "Verificado",
                "description": "Indica se o canal de contato foi verificado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "verifiedAt": {
                "type": "timestamp",
                "title": "Verificado em",
                "description": "Data e hora em que o canal de contato foi verificado.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Meio de contato comercial que pode ser vinculado a um fornecedor."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização, somente para leitura pelo módulo de compras."
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

export type ComprasEntitySupplierContactType = typeof comprasEntitySupplierContact;

export default comprasEntitySupplierContact;
