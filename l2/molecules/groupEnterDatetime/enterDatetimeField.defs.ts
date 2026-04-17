/// <mls fileReference="_102020_/l2/molecules/groupEnterDatetime/enterDatetimeField.defs.ts" enhancement="_blank" />

// Do not change – automatically generated code. 

export const group = 'groupEnterDatetime';
export const skill = `# Metadata
- TagName: molecules--group-enter-datetime--enter-datetime-field-102020

# Objective
Provide a datetime entry field that allows users to enter and edit a date, a time, or a combined date-time value (based on a configurable mode), validate it against optional rules, and report user-driven changes and focus loss to a host form in a normalized, consistent format.

# Responsibilities
- Accept a single value that represents either a date-only, time-only, or date-time value, depending on the configured mode.
- Allow configuration of the editable mode: date, time, or datetime.
- Display an empty state and accept an optional placeholder appropriate to the configured mode.
- Allow typed user entry and support committing edits via keyboard.
- When available, allow picker-based selection without changing the value until a selection is confirmed.
- Support clearing the value when clearing is allowed.
- Validate the current value according to configured required and min/max constraints.
- Expose an invalid/error indication; when an error message is provided, make the message available to the user.
- Expose a disabled state that prevents user interaction and prevents user-driven value changes.
- Expose a readonly state that allows focus/selection but prevents modification.
- Expose a name identifier so a host can associate the value with a form field name.
- Normalize user input to a consistent output format for the current mode.
- Emit a bubbling, composed change event when the user changes the value to a valid normalized value; include the normalized value in the event detail.
- Emit a bubbling, composed blur event when the field loses focus due to user interaction.
- Re-evaluate validity and update invalid/error indication when constraints change or when the host updates the external value.

# Constraints
- Mode constraint: Only one of the supported modes (date, time, datetime) may be active at a time, and the value must correspond to that mode.
- Required constraint: When required is true, an empty value must be treated as invalid.
- Empty value rule: When not required, the field must allow and preserve an empty value as a valid state.
- Bounds constraint: When min and/or max are provided, values outside the bounds must be treated as invalid.
- Disabled constraint: When disabled, the field must not allow user edits, clearing, or picker selection, and must not emit user-driven change events.
- Readonly constraint: When readonly, the field must allow focus/selection but must not allow modifications, clearing, or picker selection that changes the value, and must not emit user-driven change events.
- Invalid input rule: When the user enters an invalid value, the field must indicate invalid/error state and must not emit a change event containing an invalid normalized value.
- Picker confirmation rule: Opening or closing a picker must not change the value unless a selection is explicitly confirmed.
- Time zone rule: A configurable time zone handling mode must be applied consistently to both normalization and min/max comparisons (local handling by default, with an option to treat the value as an explicit offset/UTC representation).
- Clear action rule: A clear/reset action may be offered only when the field is not required, not disabled, and not readonly.
- Scope limitation: The field must not apply business-specific scheduling rules (such as working days, holidays, or domain-specific calendar constraints).

# Notes
- The host may provide either a boolean error flag or an error message; both must result in an invalid indication, and an error message must be presented to the user.
- Keyboard interaction must support typing, committing edits (e.g., via Enter), and clearing when clearing is allowed.`;

