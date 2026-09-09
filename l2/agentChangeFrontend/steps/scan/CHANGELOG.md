<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/CHANGELOG.md" enhancement="_blank" -->

# Changelog

- 2026-09-07: unparsable `todoFrontend` of a module absent from l4 is a named warning
  (`ignored unparsable todoFrontend for module '…' (no l4 present)`), never a scan failure.
  Scan records `createContext.warnings` as `scan-warning` (split into `scanWarnings[]` on
  `runNN_changefrontend.json` so the verdict stays completed) and prints them on the step status.
  Same class as CB `scanWarnings` / `(module outside this run, ignored)`. An unreadable todo of
  the l4 module of this run stays fatal.

- 2026-07-13: documented the real scan step and moved `agentCfeCreateScanL4.ts` into this step folder.
