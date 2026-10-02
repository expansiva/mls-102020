/// <mls fileReference="_102047_/l4/compras/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const comprasRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "compras",
  "rules": {
    "purchaseOrderMustHaveItems": "Todo pedido de compra deve conter um ou mais itens.",
    "purchaseOrderItemProductOfferedBySupplier": "Cada produto de um pedido de compra deve possuir uma condição de fornecimento cadastrada para o fornecedor do pedido.",
    "purchaseOrderItemQuantityPositive": "A quantidade solicitada em cada item do pedido de compra deve ser maior que zero.",
    "purchaseOrderItemPriceNonnegative": "O preço unitário de cada item do pedido de compra não pode ser negativo.",
    "purchaseOrderApprovalRequiredAboveLimit": "Todo pedido de compra cujo valor total exceda o limite de aprovação deve ser aprovado pelo gerente de compras antes do recebimento.",
    "ruleForeignNamespaceRefused": "Dados de outros módulos não podem ser registrados no espaço de dados do módulo de compras.",
    "ruleDocumentShapeValidated": "Os dados cadastrados devem obedecer à estrutura definida para o respectivo registro.",
    "ruleIdentityNeverInNamespace": "A identidade mestre de um registro não pode ser mantida no espaço de dados do módulo de compras.",
    "ruleCompanyLegalNameRequired": "Todo fornecedor empresa deve ter razão social informada.",
    "ruleContactValueUniquePerType": "Um fornecedor não pode ter mais de um canal de contato com o mesmo tipo e valor.",
    "ruleDeleteBlockedByRelationships": "Um registro não pode ser excluído enquanto possuir relacionamentos vinculados.",
    "rulePersonPrivacyConsentRequiredBrEu": "O tratamento de dados pessoais de pessoas do Brasil ou da União Europeia requer consentimento de privacidade.",
    "supplierOfferingUniqueProduct": "Um fornecedor pode ter somente uma condição de fornecimento para cada produto.",
    "purchaseOrderEditableOnlyDraft": "Um pedido de compra só pode ser alterado enquanto estiver em elaboração.",
    "purchaseOrderReceiptRequiresApprovalWhenRequired": "Um pedido de compra sujeito à aprovação só pode receber mercadorias após ser aprovado.",
    "goodsReceiptQuantityWithinOrderedQuantity": "A quantidade total recebida de cada produto não pode ultrapassar a quantidade solicitada no pedido de compra.",
    "goodsReceiptHasItems": "Todo registro de recebimento de mercadorias deve conter um ou mais itens.",
    "goodsReceiptQuantityPositive": "A quantidade recebida em cada item do recebimento deve ser maior que zero.",
    "goodsReceiptProductsMatchOrder": "Todo produto registrado no recebimento deve constar no pedido de compra correspondente.",
    "goodsReceiptQuantityDoesNotExceedOutstanding": "A quantidade de um produto em um recebimento não pode exceder a quantidade ainda pendente no pedido de compra.",
    "goodsReceiptAllowedForOpenOrder": "Mercadorias só podem ser recebidas para pedido de compra em aberto.",
    "goodsReceiptPostsStockAtomically": "O registro de recebimento deve gerar a entrada em estoque de todos os produtos recebidos como uma única operação."
  }
} as const satisfies Ns5RulesArtifactV2;

export type ComprasRulesType = typeof comprasRules;

export default comprasRules;
