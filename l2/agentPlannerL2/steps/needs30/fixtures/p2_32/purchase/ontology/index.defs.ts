/// <mls fileReference="_102047_/l4/compras/ontology/index.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyIndexV3 } from '/_102035_/l2/solution/types.js';

export const comprasOntologyIndex = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "compras",
  "businessDomain": "Compras",
  "platformOntology": "/_102034_/l4/ontology/mdm.defs.ts",
  "moduleNamespace": {
    "key": "compras",
    "description": "Branch details.compras of the master records this module has a role on; only this module writes it."
  },
  "entities": [
    {
      "entityId": "Supplier",
      "kind": "role",
      "subtype": "Company"
    },
    {
      "entityId": "SupplierContact",
      "kind": "role",
      "subtype": "ContactChannel"
    },
    {
      "entityId": "Product",
      "kind": "role",
      "subtype": "Product"
    },
    {
      "entityId": "Buyer",
      "kind": "role",
      "subtype": "Person"
    },
    {
      "entityId": "SupplierOffering",
      "kind": "entity",
      "class": "supporting"
    },
    {
      "entityId": "PurchaseOrder",
      "kind": "entity",
      "class": "core"
    },
    {
      "entityId": "GoodsReceipt",
      "kind": "entity",
      "class": "event"
    },
    {
      "entityId": "PurchaseOrderDashboard",
      "kind": "entity",
      "class": "supporting"
    }
  ],
  "relationships": [
    {
      "relationshipId": "supplierHasContact",
      "from": "Supplier",
      "to": "SupplierContact",
      "type": "oneToMany",
      "required": false,
      "mode": "mdmRelationship",
      "description": "Um fornecedor pode ter canais de contato vinculados para sua comunicação comercial.",
      "catalogType": "HasContact"
    },
    {
      "relationshipId": "supplierSuppliesProduct",
      "from": "Supplier",
      "to": "Product",
      "type": "manyToMany",
      "required": false,
      "mode": "mdmRelationship",
      "description": "Um fornecedor pode fornecer diversos produtos, e um produto pode ser fornecido por diversos fornecedores.",
      "catalogType": "SuppliesProduct"
    },
    {
      "relationshipId": "supplierOfferingSupplier",
      "from": "SupplierOffering",
      "to": "Supplier",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada condição de fornecimento pertence a um fornecedor.",
      "field": "SupplierOffering.supplierId"
    },
    {
      "relationshipId": "supplierOfferingProduct",
      "from": "SupplierOffering",
      "to": "Product",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada condição de fornecimento define o preço combinado para um produto.",
      "field": "SupplierOffering.productId"
    },
    {
      "relationshipId": "supplierOfferingBuyer",
      "from": "SupplierOffering",
      "to": "Buyer",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada condição de fornecimento é cadastrada por um comprador para permitir o escopo pessoal do cadastro.",
      "field": "SupplierOffering.buyerId"
    },
    {
      "relationshipId": "purchaseOrderSupplier",
      "from": "PurchaseOrder",
      "to": "Supplier",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada pedido de compra é aberto para um fornecedor.",
      "field": "PurchaseOrder.supplierId"
    },
    {
      "relationshipId": "goodsReceiptPurchaseOrder",
      "from": "GoodsReceipt",
      "to": "PurchaseOrder",
      "type": "manyToOne",
      "required": true,
      "mode": "fk",
      "description": "Cada recebimento registra a entrega total ou parcial de um pedido de compra.",
      "field": "GoodsReceipt.purchaseOrderId"
    }
  ]
} as const satisfies Ns5OntologyIndexV3;

export type ComprasOntologyIndexType = typeof comprasOntologyIndex;

export default comprasOntologyIndex;
