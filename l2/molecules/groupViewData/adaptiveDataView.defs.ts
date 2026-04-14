/// <mls fileReference="_102020_/l2/molecules/groupViewData/adaptiveDataView.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupViewData';

export const skill = `# Objective
Display a data collection with adaptive layout that automatically switches between Table and Cards based on viewport size.

# Responsibilities
- Render data as Table on larger screens and Cards on smaller screens.
- Automatically switch presentation based on configurable breakpoint.
- Support row/card selection (none, single, multiple).
- Display visual feedback for hover, selected, and disabled states.
- Display empty and loading states.
- Emit events for row clicks and selection changes.
- Provide keyboard navigation and accessibility support.

# Constraints
- Must switch between Table and Cards based on viewport width.
- Must respect selection mode configured.
- Must block interactions when loading or disabled.
- Must apply appropriate ARIA attributes for each presentation mode.

# Notes
- In Card mode, use first column as card title and remaining columns as field/value pairs.
- Column \`hidden\` attribute can be used to hide specific fields in certain contexts.
`;

