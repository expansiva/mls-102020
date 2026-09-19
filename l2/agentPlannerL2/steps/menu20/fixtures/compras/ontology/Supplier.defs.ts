/// <mls fileReference="_102047_/l4/compras/ontology/Supplier.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntitySupplier = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "Supplier",
  "title": "Fornecedor",
  "description": "Empresa fornecedora cadastrada ou vinculada para disponibilizar produtos e condições de compra.",
  "displayField": "details.identification.name",
  "relationships": {
    "supplierContacts": {
      "relationshipId": "supplierHasContact",
      "to": "SupplierContact",
      "via": "HasContact",
      "cardinality": "1:N",
      "title": "Canais de contato do fornecedor",
      "description": "Canais de contato vinculados ao fornecedor para sua comunicação comercial."
    },
    "suppliedProducts": {
      "relationshipId": "supplierSuppliesProduct",
      "to": "Product",
      "via": "SuppliesProduct",
      "cardinality": "N:N",
      "title": "Produtos fornecidos",
      "description": "Produtos que o fornecedor disponibiliza para compra."
    },
    "supplierOfferings": {
      "relationshipId": "supplierOfferingSupplier",
      "to": "SupplierOffering",
      "via": "SupplierOffering.supplierId",
      "cardinality": "1:N",
      "title": "Condições de fornecimento",
      "description": "Condições de preço combinado dos produtos pertencentes ao fornecedor.",
      "mode": "fk",
      "direction": "to",
      "required": true
    },
    "purchaseOrders": {
      "relationshipId": "purchaseOrderSupplier",
      "to": "PurchaseOrder",
      "via": "PurchaseOrder.supplierId",
      "cardinality": "1:N",
      "title": "Pedidos de compra",
      "description": "Pedidos de compra abertos para este fornecedor.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o fornecedor pelo identificador mestre para exibi-lo nos pedidos e nas condições de fornecimento; usado pelo comprador e pelo gerente de compras.",
    "locate.byName": "Localiza fornecedores pelo nome para selecionar a empresa ao cadastrar condições e abrir pedidos; usado pelo comprador.",
    "locate.byDocument": "Localiza o fornecedor pelo CNPJ para evitar duplicidade antes de cadastrá-lo ou vinculá-lo; usado pelo comprador.",
    "locate.byContact": "Localiza o fornecedor a partir de um canal de contato vinculado; usado pelo comprador na comunicação comercial.",
    "register.createOrAttach": "Cria a empresa fornecedora quando não existe ou vincula o cadastro mestre existente pelo CNPJ, aplicando o papel de fornecedor; usado pelo comprador.",
    "edit.platformFields": "Atualiza os dados cadastrais da empresa fornecedora, como razão social e nome fantasia, no cadastro mestre; usado pelo comprador.",
    "edit.moduleNamespace": "Atualiza somente o espaço do módulo de compras do fornecedor, que permanece sem dados exclusivos nesta definição; usado pelo módulo de compras.",
    "inactivate": "Inativa ou reativa um fornecedor sem apagar seu histórico de pedidos e condições; usado pelo comprador.",
    "link": "Vincula o fornecedor a produtos que fornece e a seus canais de contato por relacionamentos versionados; usado pelo comprador.",
    "unlink": "Encerra o vínculo de um produto ou canal de contato com o fornecedor, preservando o histórico do relacionamento; usado pelo comprador.",
    "link.contact": "Cria e vincula um canal de contato comercial ao fornecedor por HasContact; usado pelo comprador.",
    "listLinks": "Lista produtos fornecidos, contatos e demais vínculos do fornecedor com sua vigência; usado pelo comprador.",
    "audit": "Consulta quem alterou os dados e vínculos do fornecedor e quando; usado pelo gerente de compras para acompanhamento."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-company-legal-name-required"
  ],
  "kind": "role",
  "subtype": "Company",
  "roleTag": "compras.Supplier",
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
        "description": "Documento mestre da empresa fornecedora, com dados cadastrais da plataforma e informações específicas do módulo de compras.",
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
                    "description": "Empresa cadastrada no cadastro mestre."
                  }
                ],
                "description": "Identifica este registro mestre como uma empresa.",
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
                "description": "Nome pelo qual o fornecedor é reconhecido nas buscas e nos pedidos de compra.",
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
                    "description": "Fornecedor disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Fornecedor fora de uso."
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
                "title": "Situação",
                "description": "Situação do registro mestre do fornecedor para uso nas compras.",
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
                    "description": "Cadastro Nacional da Pessoa Jurídica."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para identificar o fornecedor.",
                "required": true,
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do CNPJ da empresa fornecedora.",
                "title": "CNPJ",
                "required": true,
                "pattern": "^\\d{14}$",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^BR$",
                "maxLength": 0,
                "default": "US",
                "description": "País do cadastro e das regras documentais do fornecedor.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação e situação da empresa fornecedora no cadastro mestre."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo derivado dos canais de contato vinculados ao fornecedor para comunicação comercial.",
                "title": "Contatos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referências derivadas aos relacionamentos do fornecedor, incluindo produtos fornecidos e canais de contato.",
                "title": "Referências de relacionamentos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados comuns do cadastro mestre usados para identificar e contatar o fornecedor."
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
                    "description": "Empresa legalmente constituída."
                  }
                ],
                "description": "Classifica o fornecedor como uma entidade jurídica.",
                "title": "Natureza da empresa",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "legalName": {
                "type": "string",
                "required": true,
                "description": "Razão social oficial da empresa fornecedora.",
                "title": "Razão social",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "tradeName": {
                "type": "string",
                "description": "Nome fantasia pelo qual o fornecedor também pode ser conhecido.",
                "title": "Nome fantasia",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados corporativos da empresa que atua como fornecedora."
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

export type ComprasEntitySupplierType = typeof comprasEntitySupplier;

export default comprasEntitySupplier;
