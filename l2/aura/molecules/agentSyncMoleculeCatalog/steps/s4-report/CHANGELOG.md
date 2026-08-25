# s4-report — CHANGELOG

- **2026-08-25** — Written. The four obligations (written / ignored-with-reason / index.ts-not-touched /
  not-published) are load-bearing, each tied to a measured defect — see `report.ts`'s file header and
  `flow.json` → decisions `.indexTsScope` (D5's "no publish API exists" finding). A group requesting
  `index.ts` gets an honest "not built yet" line rather than being silently ignored, since `s3` does not
  exist in this build.
