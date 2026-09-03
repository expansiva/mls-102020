/// <mls fileReference="_102020_/l2/aura/helpers/dsMatch/types.ts" enhancement="_blank" />

// Shared types for the deterministic DS-matching foundation (Fase A in
// skills/desingsystem/planodeexecucao.md). These types are the interface between
// readDsRules (A1), buildMoleculeCatalog (A2) and matchVariant (A3).

import type { LayoutAxisKey } from '/_102020_/l2/aura/helpers/designSystemAuraBase.js';

/**
 * A DS with EVERY axis resolved to a concrete value. Axes not declared in
 * project.json are filled with the vocabulary `default` (DSDefinition.md §2.4).
 * This is what `matchVariant` consults.
 */
export type ResolvedLayoutRules = Record<LayoutAxisKey, string>;

/**
 * One molecule, in the minimal shape needed for matching. Built by
 * `buildMoleculeCatalog` from the `ml-*.defs.ts` files of mls-102040.
 */
export interface MoleculeCatalogEntry {
    /** Source project of the molecule COMPONENT (e.g. 102040) — defines the import origin. */
    project: number;
    /** camelCase, e.g. 'groupEnterText' — from `export const group`. */
    group: string;
    /** e.g. 'groupentertext--ml-floating-text-input' (from the skill's TagName). */
    tag: string;
    /** file shortName, e.g. 'ml-floating-text-input'. */
    variant: string;
    /**
     * DS axes this molecule candidates for (empty = wildcard).
     * Values already validated against the vocabulary by `buildMoleculeCatalog`.
     */
    layoutConfig: Record<string, string>;
    /** First line of the skill's `# Objective` (short label / molecule `purpose`). */
    objective: string;
    /** Full `.defs.ts` skill text (Objective + Responsibilities + Constraints) — fed to the
     *  variant-selection LLM (Agent2) so it can choose the best component for the page. */
    description: string;
    /** Usage skill for materialization (group in camelCase). */
    usagePath: string;
}
