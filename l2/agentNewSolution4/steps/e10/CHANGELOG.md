# E10 changelog

## 2026-08-14 — validação sobre o modelo de workspaces e o L4 clássico

- `Ns4E10Sources` deixou de estender o modelo antigo: agora é o modelo aprovado do E8 mais o que o
  E9 escreveu, lido de volta do L4.
- A checagem de staleness virou **recompilar e comparar**: o modelo é compilado de novo e confrontado
  com workspaces, operations, contracts e siteMap salvos. Arquivo editado à mão é `stale`, com o
  reparo apontando para o E9.
- Sobreviveram: coerência das decisões (E2), saúde das FSM (E7), sourceHashes (E7) e o registrador de
  comando dormente. Saíram: a re-execução do compilador de navegação antigo e o check de warnings de
  navegação, que não existem mais.
- O preview de menu do L5 passou a espelhar o que o frontend realmente monta
  (`nodejsSaveConfigJson.ts`): `/<module>/<workspaceId>` a partir do menu e das landings do modelo.

# Changelog — E10

## 2026-08-13 — automatic completion

- Removed the E10 clarification hook and final-review widget/CSS.
- A green deterministic validation now writes L5, records `approvedBy=auto`, adds `e10-result` and
  completes the module and pipeline in one hook.
- Blocking validation retains its deterministic repair ownership and durable report.

## 2026-08-13

- Added deterministic validate-all over approved E2–E9 artifacts.
- Added consolidated versioned validation report with policy and system decisions.
- Added non-blocking disclosure and dormant-command registrars.
- Added additive L5 config navigation, frontend/backend owner queues and process handoff.
- Added the disk-backed final approval widget and complete/stale pipeline transitions.
- Added Run 38, policy/system-decision contradiction, stale hash, FSM, idempotence and disclosure fixtures/tests.
