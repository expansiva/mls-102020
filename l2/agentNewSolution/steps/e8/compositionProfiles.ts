/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/compositionProfiles.ts" enhancement="_blank"/>

/**
 * Composition profiles are data, not per-category code. A workspace looks up the profile of its
 * categoryRef (or `default`) and the compiler follows those flags. R1/R2/R3 of the default
 * profile stay in tiers.ts; this object only says WHAT a category is allowed to host.
 */
export interface Ns4E8CompositionProfile {
  profileId: 'default' | 'contentLanding';
  contentOrganisms: boolean;
  hostedCommands: boolean;
  tiles: boolean;
  crud: boolean;
}

export const NS4_E8_COMPOSITION_PROFILES: Record<string, Ns4E8CompositionProfile> = {
  default: {
    profileId: 'default',
    contentOrganisms: false,
    hostedCommands: true,
    tiles: true,
    crud: true,
  },
  contentLanding: {
    profileId: 'contentLanding',
    contentOrganisms: true,
    hostedCommands: true,
    tiles: true,
    crud: false,
  },
};

export function ns4E8CompositionProfile(categoryRef: string): Ns4E8CompositionProfile {
  return NS4_E8_COMPOSITION_PROFILES[categoryRef] || NS4_E8_COMPOSITION_PROFILES.default;
}
