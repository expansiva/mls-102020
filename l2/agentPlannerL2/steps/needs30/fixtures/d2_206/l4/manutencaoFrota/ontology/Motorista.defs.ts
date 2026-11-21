/// <mls fileReference="_102047_/l4/manutencaoFrota/ontology/Motorista.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const manutencaoFrotaEntityMotorista = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "manutencaoFrota",
  "entityId": "Motorista",
  "title": "Motorista",
  "description": "Pessoa que dirige os veículos da transportadora; vê apenas os veículos atribuídos a ela e registra seus abastecimentos.",
  "displayField": "details.identification.name",
  "relationships": {
    "veiculos": {
      "relationshipId": "veiculoMotorista",
      "to": "Veiculo",
      "via": "Veiculo.motoristaId",
      "cardinality": "1:N",
      "title": "Veículos atribuídos",
      "description": "Veículos atribuídos ao motorista; é o caminho do escopo que limita o que ele vê.",
      "mode": "fk",
      "direction": "to"
    },
    "abastecimentos": {
      "relationshipId": "abastecimentoMotorista",
      "to": "Abastecimento",
      "via": "Abastecimento.motoristaId",
      "cardinality": "1:N",
      "title": "Abastecimentos registrados",
      "description": "Abastecimentos que o motorista registrou dos veículos que dirige.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lê o motorista pelo mdmId para exibir o nome nas listas de veículos e de abastecimentos; usado pelo gestor e pelo motorista.",
    "locate.byName": "Localiza o motorista pelo nome digitado ao atribuir um veículo; usado pelo gestor.",
    "locate.byDocument": "Localiza o motorista pelo CPF antes de cadastrá-lo, evitando duplicidade; usado pelo gestor.",
    "register.createOrAttach": "Cadastra o motorista ou, se a pessoa já existe pelo CPF, apenas anexa o papel manutencaoFrota.Motorista; usado pelo gestor.",
    "edit.platformFields": "Corrige nome, CPF e consentimento do motorista; usado pelo gestor.",
    "edit.moduleNamespace": "Altera apenas o namespace manutencaoFrota do motorista, hoje vazio; usado pelo próprio módulo.",
    "inactivate": "Inativa o motorista que deixou a transportadora sem apagar seu histórico de abastecimentos, e o reativa se voltar; usado pelo gestor.",
    "link.contact": "Adiciona telefone, WhatsApp ou e-mail do motorista como canal vinculado por HasContact; usado pelo gestor.",
    "listLinks": "Mostra os vínculos do motorista, como contatos, na ficha dele; usado pelo gestor.",
    "invite.login": "Dá ao motorista um login para registrar abastecimentos e ver os veículos atribuídos a ele; usado pelo gestor.",
    "attach.document": "Anexa à ficha do motorista a cópia da CNH ou outros documentos digitalizados; usado pelo gestor.",
    "comment": "Registra observações sobre o motorista na ficha; usado pelo gestor.",
    "tag": "Marca o motorista com rótulos livres do módulo, como turno ou base; usado pelo gestor.",
    "audit": "Mostra quem alterou o cadastro do motorista e quando; usado pelo gestor."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-person-privacy-consent-required-br-eu",
    "rule-delete-blocked-by-relationships"
  ],
  "writer": "crud",
  "kind": "role",
  "subtype": "Person",
  "roleTag": "manutencaoFrota.Motorista",
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro mestre da pessoa que dirige os veículos da transportadora, com o papel manutencaoFrota.Motorista.",
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
                    "title": "Pessoa"
                  }
                ],
                "description": "Sempre pessoa física: o motorista é uma pessoa.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nome do motorista como aparece na atribuição de veículos e nos abastecimentos.",
                "title": "Nome"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Ativo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo"
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Situação",
                "description": "Situação do cadastro mestre; um motorista inativo deixa de receber veículos e de registrar abastecimentos."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Documento nacional usado para deduplicar o motorista; na transportadora, o CPF.",
                "required": true
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do CPF do motorista, usado para localizar antes de cadastrar.",
                "title": "CPF",
                "required": true,
                "pattern": "^\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}$"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País do documento e das regras de privacidade (BR para motoristas brasileiros).",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Papéis do registro nos módulos; inclui manutencaoFrota.Motorista.",
                "title": "Papéis"
              },
              "createdAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Criado em",
                "description": "Momento em que o registro mestre foi criado."
              },
              "updatedAt": {
                "type": "string",
                "required": true,
                "indexed": true,
                "derived": true,
                "title": "Atualizado em",
                "description": "Momento da última alteração do registro mestre."
              }
            },
            "description": "Colunas de índice da plataforma usadas para localizar e deduplicar o motorista."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "aliases": {
                "type": "string",
                "required": true,
                "collection": true,
                "description": "Outros nomes pelos quais o motorista é conhecido na frota.",
                "title": "Apelidos"
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumo dos canais de contato do motorista (telefone, WhatsApp, e-mail), vinculados por HasContact.",
                "title": "Contatos"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Chaves compactas dos vínculos do motorista, recalculadas pela plataforma.",
                "title": "Vínculos"
              }
            },
            "description": "Dados comuns a todo registro mestre que o módulo lê do motorista."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "birthDate": {
                "type": "date",
                "title": "Data de nascimento",
                "description": "Data de nascimento do motorista."
              },
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento LGPD do motorista para o tratamento dos seus dados pela transportadora.",
                "title": "Consentimento de privacidade"
              }
            },
            "description": "Dados de pessoa física que o módulo lê do motorista."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos pela organização; o módulo apenas lê."
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
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type ManutencaoFrotaEntityMotoristaType = typeof manutencaoFrotaEntityMotorista;

export default manutencaoFrotaEntityMotorista;
