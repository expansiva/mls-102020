/// <mls fileReference="_102047_/l4/compras/ontology/SupplierOffering.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comprasEntitySupplierOffering = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "entityId": "SupplierOffering",
  "title": "Condição de fornecimento",
  "description": "Condição comercial de um produto fornecido por um fornecedor, incluindo o preço combinado.",
  "displayField": "productId",
  "relationships": {
    "supplier": {
      "relationshipId": "supplierOfferingSupplier",
      "to": "Supplier",
      "via": "SupplierOffering.supplierId",
      "cardinality": "N:1",
      "title": "Fornecedor da condição",
      "description": "A condição comercial pertence a um fornecedor.",
      "mode": "fk",
      "required": "Sempre"
    },
    "product": {
      "relationshipId": "supplierOfferingProduct",
      "to": "Product",
      "via": "SupplierOffering.productId",
      "cardinality": "N:1",
      "title": "Produto fornecido",
      "description": "A condição define o preço combinado de um produto.",
      "mode": "fk",
      "required": "Sempre"
    },
    "buyer": {
      "relationshipId": "supplierOfferingBuyer",
      "to": "Buyer",
      "via": "SupplierOffering.buyerId",
      "cardinality": "N:1",
      "title": "Comprador responsável",
      "description": "A condição é cadastrada por um comprador para permitir o escopo pessoal do cadastro.",
      "mode": "fk",
      "required": "Sempre"
    }
  },
  "capabilities": {
    "read.byId": "Lê uma condição de fornecimento pelo identificador da linha no repositório, para o comprador consultar um cadastro já selecionado.",
    "locate.byColumn": "Lista condições de fornecimento pelos fornecedores, produtos ou compradores indexados, com ordenação e paginação, para o comprador localizar preços combinados.",
    "count": "Conta as condições de fornecimento que correspondem aos fornecedores, produtos ou compradores informados, para o comprador acompanhar os resultados do cadastro.",
    "listByForeignKey": "Lista as condições que apontam para um fornecedor, produto ou comprador por chave estrangeira, para o comprador consultar os produtos e preços de um fornecedor.",
    "create": "Cria uma condição com fornecedor, produto, comprador responsável e preço combinado, para o comprador disponibilizar a negociação para futuros pedidos.",
    "update": "Atualiza o preço combinado de uma condição existente no repositório, para o comprador manter a negociação comercial do fornecedor.",
    "uniqueKey": "Recusa outra condição com o mesmo fornecedor e produto pelo índice único, para o comprador manter apenas um preço combinado vigente por par.",
    "read.mdmRecord": "Lê os registros mestres apontados por fornecedor, produto e comprador, para as telas de compras exibirem seus dados cadastrais sem copiá-los na condição."
  },
  "rules": [
    "supplierOfferingUniqueProduct"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "compras_supplieroffering",
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
      "supplierId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Supplier"
        ],
        "title": "Fornecedor",
        "description": "Empresa fornecedora à qual esta condição comercial pertence.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "productId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Product"
        ],
        "title": "Produto",
        "description": "Produto fornecido sob esta condição comercial.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "buyerId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "of": "ContactSummary",
        "to": [
          "Buyer"
        ],
        "title": "Comprador responsável",
        "description": "Comprador que cadastrou a condição de fornecimento.",
        "maxLength": 0,
        "min": 0,
        "max": 0
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "ContactSummary",
        "title": "Dados da condição de fornecimento",
        "description": "Dados comerciais específicos do produto fornecido por este fornecedor.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "agreedPrice": {
            "type": "money",
            "required": true,
            "of": "ContactSummary",
            "title": "Preço combinado",
            "description": "Preço unitário combinado entre a organização e o fornecedor para este produto.",
            "maxLength": 0,
            "min": 0,
            "max": 0
          }
        }
      }
    }
  },
  "uniqueKeys": [
    [
      "supplierId",
      "productId"
    ]
  ]
} as const satisfies Ns5OntologyEntityV3;

export type ComprasEntitySupplierOfferingType = typeof comprasEntitySupplierOffering;

export default comprasEntitySupplierOffering;
