/// <mls fileReference="_102047_/l4/compras/journeys/cadastrarFornecedor.defs.ts" enhancement="_blank"/>

import type { Ns5JourneyArtifact } from '/_102035_/l2/solution/types.js';

export const cadastrarFornecedorJourney = {
  "schemaVersion": "2026-09-10-ns5-journey-v1",
  "journeyId": "cadastrarFornecedor",
  "business": {
    "actorRef": "comprador",
    "title": "Cadastrar fornecedor e condições de fornecimento",
    "goal": "Disponibilizar um fornecedor com os produtos e preços combinados para futuras compras.",
    "entry": {
      "mode": "coldStart"
    },
    "steps": [
      {
        "stepId": "cadastrarFornecedor",
        "kind": "act",
        "entity": "Supplier",
        "effect": "create",
        "title": "Cadastrar fornecedor",
        "description": "Cadastra ou vincula a empresa fornecedora usando seus dados cadastrais, incluindo CNPJ, razão social e contato."
      },
      {
        "stepId": "localizarProduto",
        "kind": "locate",
        "entity": "Product",
        "title": "Localizar produto",
        "description": "Localiza um produto que o fornecedor fornece."
      },
      {
        "stepId": "registrarCondicaoFornecimento",
        "kind": "act",
        "entity": "SupplierOffering",
        "effect": "create",
        "title": "Registrar condição de fornecimento",
        "description": "Registra, para cada produto fornecido, o preço combinado com o fornecedor."
      }
    ],
    "outcome": {
      "statement": "O fornecedor fica disponível com suas condições de fornecimento cadastradas.",
      "evidence": [
        "Fornecedor identificado pelo CNPJ e razão social.",
        "Produtos fornecidos e respectivos preços combinados estão registrados."
      ]
    }
  },
  "businessHash": "sha256:2032678b2782397aa586269cca12d3122deaee3475444dd2a0149c1fe59eaf08"
} as const satisfies Ns5JourneyArtifact;

export type CadastrarFornecedorJourneyType = typeof cadastrarFornecedorJourney;

export default cadastrarFornecedorJourney;
