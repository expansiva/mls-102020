/// <mls fileReference="_102047_/l4/comandaRestaurante/ontology/ItemCardapio.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const comandaRestauranteEntityItemCardapio = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "comandaRestaurante",
  "entityId": "ItemCardapio",
  "title": "Item do cardápio",
  "description": "Produto disponibilizado no cardápio do restaurante, com preço definido para este módulo.",
  "displayField": "details.identification.name",
  "relationships": {
    "itemComandaItemCardapio": {
      "relationshipId": "itemComandaItemCardapio",
      "to": "ItemComanda",
      "via": "ItemComanda.itemCardapioId",
      "cardinality": "1:N",
      "title": "Lançamentos deste item",
      "description": "Lançamentos de comanda que registram este item do cardápio e preservam o preço vigente no momento do pedido.",
      "mode": "fk",
      "direction": "to",
      "required": "Quando um ItemComanda é registrado, ele deve referenciar um item do cardápio.",
      "role": "itemLancado"
    }
  },
  "capabilities": {
    "read.byId": "Consulta um item do cardápio pelo identificador mestre, por leitura direta do MDM, para o garçom e o caixa exibirem seus dados em uma comanda.",
    "locate.byName": "Localiza itens do cardápio pelo nome digitado, pesquisando o índice de nomes de produtos, para o garçom encontrar o pedido solicitado.",
    "register.createOrAttach": "Cadastra ou associa um produto existente ao papel de item do cardápio, por criação ou associação no MDM e gravação do preço do módulo, para o pessoal autorizado manter o cardápio.",
    "edit.platformFields": "Atualiza o nome e demais dados de plataforma mantidos para o produto, reindexando a identificação quando necessário, para o pessoal autorizado manter o cadastro do item.",
    "edit.moduleNamespace": "Atualiza o preço atual em details.comandaRestaurante, restrito ao namespace deste módulo, para o pessoal autorizado ajustar o cardápio.",
    "inactivate": "Inativa ou reativa o produto no MDM pela situação do registro, retirando-o ou devolvendo-o ao uso, para o pessoal autorizado controlar a disponibilidade do item.",
    "listLinks": "Lista os lançamentos de comanda relacionados ao item por sua referência obrigatória, para o caixa e o pessoal autorizado consultarem onde ele foi utilizado.",
    "statusHistory.read": "Exibe o histórico de alterações de situação do registro mestre, pela consulta de histórico do MDM, para o pessoal autorizado acompanhar ativações e inativações.",
    "audit": "Consulta quem alterou os dados do item e quando, pelo log de auditoria do MDM, para o pessoal autorizado conferir a manutenção do cardápio."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "itemCardapioAtivoParaLancamento"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Product",
  "roleTag": "comandaRestaurante.ItemCardapio",
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
        "description": "Documento mestre do produto usado como item do cardápio do restaurante.",
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
                    "value": "Product",
                    "title": "Produto",
                    "description": "Produto utilizado como item do cardápio."
                  }
                ],
                "description": "Classifica este registro mestre como produto.",
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
                "description": "Nome pelo qual o garçom e o caixa identificam o item no cardápio.",
                "title": "Nome do item",
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
                    "description": "Produto disponível para uso."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Produto retirado de uso."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Produto incorporado a outro registro mestre."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Produto bloqueado no cadastro mestre."
                  }
                ],
                "title": "Situação no cadastro mestre",
                "description": "Indica se o produto está ativo, inativo, mesclado ou bloqueado no MDM; somente item ativo pode ser lançado em comanda.",
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
                "description": "Código ISO do país ao qual o cadastro mestre do produto pertence.",
                "title": "País",
                "min": 0,
                "max": 0
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Etiquetas derivadas pelo MDM, incluindo o papel comandaRestaurante.ItemCardapio deste produto.",
                "title": "Etiquetas de papel",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação do produto no cadastro mestre, usados para reconhecê-lo e disponibilizá-lo no cardápio."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados comuns do produto mantidos pela plataforma; este módulo não utiliza campos adicionais desta seção."
          },
          "product": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados próprios do subtipo Produto mantidos pela plataforma; este módulo não utiliza campos adicionais desta seção."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização para uso compartilhado, lidos conforme o cadastro corporativo."
          },
          "comandaRestaurante": {
            "type": "object",
            "owner": "module",
            "fields": {
              "preco": {
                "type": "money",
                "required": true,
                "of": "Address",
                "title": "Preço do cardápio",
                "description": "Preço atual cobrado por uma unidade deste item no cardápio; o lançamento da comanda registra o preço vigente naquele momento.",
                "maxLength": 0,
                "min": 0.01,
                "max": 0
              }
            },
            "description": "Informações deste módulo que definem a oferta do produto no cardápio."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type ComandaRestauranteEntityItemCardapioType = typeof comandaRestauranteEntityItemCardapio;

export default comandaRestauranteEntityItemCardapio;
