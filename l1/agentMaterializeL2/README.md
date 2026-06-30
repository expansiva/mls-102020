# agentMaterializeL2 - Node runner

Materializes L2 frontend files (`.defs.ts` -> `.ts`) outside Studio. It mirrors the split used by
`agentMaterializeL1`:

- `core.ts` - pure parser, L2 ordering, staleness and prompt assembly.
- `llmClient.ts` - direct `collab-llm` HTTP client with forced `submitGeneratedTs`.
- `nodejsMaterializeL2.ts` - CLI scanner/writer for `mls-base`.

## Order

The runner materializes in this order:

1. `l2_contract`
2. `l2_shared`
3. `l2_page`

This matches the generated frontend pipeline: shared reads contract `.ts`, and page11 reads shared
`.ts`.

## Configure

Copy the sample and fill the local config. Do not commit the real token.

```sh
cp materializeL2.config.sample.json materializeL2.config.json
```

## Run

From `mls-base`:

```sh
pnpm materializeL2 -- --self-test
pnpm materializeL2 -- 102050 cafeFlow --dry-run --force
pnpm materializeL2 -- 102050 cafeFlow --only aiSalesSummary --dry-run --force
pnpm materializeL2 -- 102050 cafeFlow --config mls-102020/l1/agentMaterializeL2/materializeL2.config.json --check --force
```

Flags: `--dry-run`, `--force`, `--only <substr>`, `--check`, `--config <path>`, `--root <path>`,
`--out <dir>`, `--self-test`.

`--check` runs `tsc --noEmit --pretty false` in `mls-base`.

## Studio agent

The Studio agent should reuse `core.ts` and provide Studio adapters for:

- reading `_NNNNN_/...` refs from project storage;
- reading modified timestamps from storage metadata;
- invoking the existing `agentMaterializeGen` LLM call path;
- saving generated `.ts` and running `afterSaveFrontEnd` when present.
