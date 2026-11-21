/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/PainelMensalidades.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityPainelMensalidades = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "PainelMensalidades",
  "title": "Painel de mensalidades",
  "description": "Resumo do mês recalculado: total a receber, total recebido e quantidade de alunos ativos, bloqueados e inadimplentes.",
  "displayField": "mesReferencia",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Resume as mensalidades e os pagamentos por mês (janela mensal sobre o vencimento e a data do pagamento) e conta os alunos ativos, bloqueados e inadimplentes, alimentando o painel da gerência.",
    "read.window": "Lê os indicadores de um mês pelo mês de referência indexado; usado pela gerência na jornada acompanhar painel (ver painel).",
    "refresh": "Mantém o painel atualizado à medida que mensalidades são geradas, pagamentos são registrados e matrículas são canceladas; executado pela plataforma, sem ação da gerência.",
    "rebuild": "Recalcula todo o painel a partir das mensalidades, pagamentos e matrículas em uma migração ou publicação do módulo.",
    "retain": "Descarta meses antigos do painel que já não interessam à gerência, para que a série não cresça indefinidamente."
  },
  "rules": [
    "mensalidadeVencida",
    "alunoBloqueadoDuasVencidas",
    "alunoInadimplente",
    "cancelamentoEncerraMensalidadesFuturas"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_painelmensalidades",
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
      "mesReferencia": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "derived": true,
        "title": "Mês de referência",
        "description": "Início do mês que esta linha resume (janela mensal). Calculado a partir do vencimento das mensalidades e da data dos pagamentos; é por ele que o painel é lido."
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Indicadores do mês",
        "description": "Medidas recalculadas a partir de Mensalidade, Pagamento e Matricula para o mês de referência. Ninguém digita nenhum destes valores.",
        "fields": {
          "totalAReceber": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total a receber no mês",
            "description": "Soma dos valores das mensalidades com vencimento no mês de referência, de todos os alunos."
          },
          "totalRecebido": {
            "type": "money",
            "required": true,
            "derived": true,
            "title": "Total recebido no mês",
            "description": "Soma dos valores dos pagamentos registrados pela recepção com data dentro do mês de referência."
          },
          "alunosAtivos": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Alunos ativos",
            "description": "Quantidade de alunos com matrícula ativa (não cancelada) no mês de referência.",
            "min": 0
          },
          "alunosBloqueados": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Alunos bloqueados",
            "description": "Quantidade de alunos com duas ou mais mensalidades vencidas, que ficam impedidos de entrar até regularizar.",
            "min": 0
          },
          "alunosInadimplentes": {
            "type": "integer",
            "required": true,
            "derived": true,
            "title": "Alunos inadimplentes",
            "description": "Quantidade de alunos com pelo menos uma mensalidade vencida (em aberto e com vencimento anterior a hoje).",
            "min": 0
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type MensalidadesAcademiaEntityPainelMensalidadesType = typeof mensalidadesAcademiaEntityPainelMensalidades;

export default mensalidadesAcademiaEntityPainelMensalidades;
