/// <mls fileReference="_102047_/l4/mensalidadesAcademia/ontology/IndicadoresAcademia.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const mensalidadesAcademiaEntityIndicadoresAcademia = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "mensalidadesAcademia",
  "entityId": "IndicadoresAcademia",
  "title": "Indicadores da academia",
  "description": "Resumo mensal recalculado dos valores a receber e recebidos e das quantidades de alunos ativos, bloqueados e inadimplentes.",
  "displayField": "period",
  "relationships": {},
  "capabilities": {
    "aggregate.byWindow": "Resume mensalmente as mensalidades, os pagamentos e as matrículas por período para calcular os indicadores financeiros e de alunos usados pela gerência.",
    "store.timeSeries": "Mantém os indicadores mensais em série temporal pelo início do período, para a gerência consultar o painel sem ler todas as transações.",
    "read.window": "Lê os indicadores pelo início do mês indexado, para a gerência acompanhar o painel mensal.",
    "refresh": "Atualiza automaticamente o resumo mensal conforme mensalidades, pagamentos e matrículas são registrados, para manter o painel da gerência atualizado.",
    "rebuild": "Recalcula toda a série de indicadores a partir de mensalidades, pagamentos e matrículas durante uma reconstrução ou publicação do módulo."
  },
  "rules": [],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "mensalidadesAcademia_indicadoresacademia",
    "kind": "timeSeries"
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
      "period": {
        "type": "timestamp",
        "required": true,
        "indexed": true,
        "of": "Address",
        "title": "Período",
        "description": "Início do mês ao qual se referem os indicadores mensais da academia.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "derived": true
      },
      "details": {
        "type": "object",
        "required": true,
        "of": "Address",
        "title": "Indicadores mensais",
        "description": "Medidas mensais recalculadas a partir das mensalidades, dos pagamentos e das matrículas da academia.",
        "maxLength": 0,
        "min": 0,
        "max": 0,
        "fields": {
          "totalAReceber": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Total a receber",
            "description": "Soma dos valores das mensalidades geradas para o mês.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "totalRecebido": {
            "type": "money",
            "required": true,
            "of": "Address",
            "title": "Total recebido",
            "description": "Soma dos pagamentos registrados para mensalidades geradas no mês.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "quantidadeAlunosAtivos": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade de alunos ativos",
            "description": "Quantidade de alunos com matrícula ativa no período.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "quantidadeAlunosBloqueados": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade de alunos bloqueados",
            "description": "Quantidade de alunos bloqueados por terem duas ou mais mensalidades vencidas no período.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          },
          "quantidadeAlunosInadimplentes": {
            "type": "integer",
            "required": true,
            "of": "Address",
            "title": "Quantidade de alunos inadimplentes",
            "description": "Quantidade de alunos com ao menos uma mensalidade vencida no período.",
            "maxLength": 0,
            "min": 0,
            "max": 0,
            "derived": true
          }
        },
        "derived": true
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type MensalidadesAcademiaEntityIndicadoresAcademiaType = typeof mensalidadesAcademiaEntityIndicadoresAcademia;

export default mensalidadesAcademiaEntityIndicadoresAcademia;
