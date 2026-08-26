# s4-report — CHANGELOG

- **2026-08-25** — Written. The four obligations (written / ignored-with-reason / index.ts-not-touched /
  not-published) are load-bearing, each tied to a measured defect — see `report.ts`'s file header and
  `flow.json` → decisions `.indexTsScope` (D5's "no publish API exists" finding). A group requesting
  `index.ts` gets an honest "not built yet" line rather than being silently ignored, since `s3` does not
  exist in this build.

- **2026-08-25 (E8)** — Obligation 3 rewritten now that `s3` exists: index.ts status is reported PER
  MATCHED GROUP (`migrated` / `creation-needed` / `migration-failed` / `already-migrated`), read from the
  new `s3-<group>.json` artifacts and `input.json`'s `indexTsMigrationGroups`/`indexTsCreationGroups`.
  `SY_INDEX_TS_HOWTO` was dropped — migration no longer needs to be asked for
  (`flow.json` → `decisions.migrationIsAutomatic`); creation still has no path to "yes" in this build, so
  it stays an honest `creation-needed`, never silence.
