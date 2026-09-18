/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/Aluno.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityAluno = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "Aluno",
  "title": "Aluno",
  "description": "Pessoa cadastrada na academia que possui matrícula em plano e pode cancelar a própria matrícula.",
  "displayField": "details.identification.name",
  "relationships": {
    "matriculas": {
      "relationshipId": "matriculaAluno",
      "to": "Matricula",
      "via": "Matricula.alunoId",
      "cardinality": "1:N",
      "title": "Matrículas do aluno",
      "description": "Matrículas da academia que pertencem a este aluno.",
      "mode": "fk",
      "direction": "to",
      "required": "Sempre que existir uma matrícula, ela deve referenciar este aluno.",
      "role": "aluno"
    }
  },
  "capabilities": {
    "read.byId": "Lê o cadastro mestre do aluno pelo identificador, para exibir seus dados nas matrículas e na área do aluno.",
    "locate.byName": "Localiza alunos pelo nome no índice mestre, para a recepção selecionar ou iniciar o cadastro durante a matrícula.",
    "locate.byDocument": "Localiza o aluno pelo CPF no índice mestre, para a recepção evitar cadastros duplicados antes da matrícula.",
    "register.createOrAttach": "Cria a pessoa quando ela não existe ou anexa o papel de Aluno ao cadastro existente por documento, para a recepção matriculá-la na academia.",
    "edit.platformFields": "Atualiza os dados pessoais e cadastrais mantidos pela plataforma, para a recepção corrigir o cadastro do aluno.",
    "edit.moduleNamespace": "Atualiza somente o namespace do módulo do aluno, quando houver dado exclusivo da academia autorizado para manutenção.",
    "inactivate": "Inativa ou reativa o cadastro mestre sem excluí-lo, para a recepção manter registros de alunos que não devem mais ser usados.",
    "invite.login": "Convida o aluno para criar acesso de login vinculado ao seu cadastro mestre, para que ele possa cancelar a própria matrícula.",
    "audit": "Consulta quem alterou o cadastro mestre do aluno e quando, para a gerência e a administração acompanharem alterações."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-privacy-consent-required-br-eu"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "mensalidadesAcademia.Aluno",
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
        "description": "Documento mestre da pessoa usada como aluno pela academia.",
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
                    "description": "Pessoa natural cadastrada como aluno."
                  }
                ],
                "description": "Subtipo mestre da pessoa, mantido pela plataforma como Pessoa.",
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
                "description": "Nome pelo qual a recepção identifica o aluno ao realizar a matrícula.",
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
                    "description": "Cadastro mestre ativo."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inativo",
                    "description": "Cadastro mestre inativo."
                  },
                  {
                    "value": "Merged",
                    "title": "Mesclado",
                    "description": "Cadastro mestre mesclado a outro registro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "Cadastro mestre bloqueado pela plataforma."
                  }
                ],
                "title": "Situação do cadastro",
                "description": "Situação mestre do cadastro da pessoa, mantida pela plataforma.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Cadastro de Pessoas Físicas."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo do documento nacional usado para localizar ou cadastrar o aluno.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número do CPF usado para evitar duplicidade no cadastro do aluno.",
                "title": "Número do documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^BR$",
                "maxLength": 2,
                "default": "US",
                "description": "Código do país do aluno e das regras aplicáveis ao seu cadastro.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados de identificação da pessoa cadastrada como aluno."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Dados básicos da pessoa mantidos pela plataforma."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimento de privacidade do aluno exigido para residentes no Brasil.",
                "title": "Consentimento de privacidade",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Dados próprios de pessoa natural relevantes para o cadastro do aluno."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Dados promovidos pela organização e apenas lidos por este módulo."
          },
          "mensalidadesAcademia": {
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

export type MensalidadesAcademiaEntityAlunoType = typeof mensalidadesAcademiaEntityAluno;

export default mensalidadesAcademiaEntityAluno;
