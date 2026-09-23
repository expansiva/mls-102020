# Changelog

- 2026-09-21 — Reserved by d2_01; no hook or placeholder approval exists.
- 2026-09-21 — d2_05: fan-out LLM por página, reparo único, gate cruzado, persistência com
  hash/barreira e emissão declarativa de shared defs + item `l2_shared`.
- 2026-09-21 — revisão 1: promoção reconfirma snapshot/fontes e hash vivo do contrato; setters
  derivam o path completo e ids duplicados são bloqueados pelo gate.
- 2026-09-23 — d2_15: `pipeline` passa a array unitário estrito, com skill própria e dependências
  exatas no contrato `.defs.ts` e alias lógico `_102029_.d.ts`. O reader expande o alias para as
  fontes runtime canônicas (incluindo `StateLitElement`), valida as APIs usadas e inclui hashes de
  skill/contexto no recibo v2; forma v1 não é reutilizada.
