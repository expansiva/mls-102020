/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCompileFidelity.ts" enhancement="_blank"/>

/**
 * The closing gate compiles with the Studio Monaco worker (`mls.l2.typescript.compile`).
 * Publish/tsc uses `mls-base/tsconfig.json`. A gate that says "clean" while tsc fails is a false green.
 *
 * Measured 22/08 (sources, not a live Monaco host):
 *   Monaco defaultTsConf (`cfe-collab-front-end/src/editor/editor.ts`): strict:true (implies
 *   noImplicitAny), skipLibCheck:false, declaration:true. The host MAY override via localStorage
 *   (caveat already on compileModuleClosure).
 *   tsc (`mls-base/tsconfig.json`): strict:true, skipLibCheck:true, noEmitOnError:true, declaration:false.
 *
 * Even with the same `strict`, an unresolved import degrades to `any` in Monaco and hides TS2339/TS2353
 * (the 102051 shiftWorkspace incident; the two-pass compile in finalize exists for that). The platform
 * compilerOptions cannot be changed from this agent (out of scope). The gate therefore DECLARES the
 * difference on every closing line instead of claiming a tsc-equivalent clean.
 */

export const MONACO_GATE_DEFAULTS = {
  engine: 'monaco',
  strict: true,
  noImplicitAny: true,
  skipLibCheck: false,
  noEmitOnError: false,
  source: 'cfe-collab-front-end/src/editor/editor.ts defaultTsConf (host localStorage may override)',
} as const;

export const BUILD_TSC_DEFAULTS = {
  engine: 'tsc',
  strict: true,
  noImplicitAny: true,
  skipLibCheck: true,
  noEmitOnError: true,
  source: 'mls-base/tsconfig.json',
} as const;

export function describeCompilerFidelity(): string {
  return 'compiled with Monaco (strict=true like tsc; skipLibCheck=false vs tsc true; noEmitOnError not set; host localStorage may override; unresolved imports degrade to any and hide TS2339/TS2353)';
}
