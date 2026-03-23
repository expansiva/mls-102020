/// <mls fileReference="_102020_/l2/skills/molecules/groupStepper.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupStepper

## Metadata

- **Name:** groupStepper
- **Category:** Actions & Navigation
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Guide users through a **multi-step process** with visual progress indication.

### When to Use

- Multi-step forms
- Onboarding flows
- Checkout processes
- Wizard interfaces

### When NOT to Use

- Simple progress → use **Progress**
- Content tabs → use **Tabs**
- Single form → no stepper needed

---

## Contract

### Step Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string' | ✓ | Unique identifier |
| 'label' | 'string' | ✓ | Step label |
| 'description' | 'string' | | Step description |
| 'icon' | 'string' | | Step icon |
| 'optional' | 'boolean' | | Step is optional |
| 'disabled' | 'boolean' | | Step is disabled |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'steps' | 'Step[]' | '[]' | ✓ | '@propertyDataSource' | Step definitions |
| 'currentStep' | 'string' | '''' | | '@propertyDataSource' | Current step ID |
| 'completedSteps' | 'string[]' | '[]' | | '@propertyDataSource' | Completed step IDs |
| 'linear' | 'boolean' | 'true' | | '@property' | Must follow order |
| 'editable' | 'boolean' | 'false' | | '@property' | Can edit completed steps |
| 'showDescription' | 'boolean' | 'true' | | '@property' | Show step descriptions |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the stepper |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.currentStep}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'stepChange' | '{ step, previousStep }' | Fired when step changes |
| 'stepComplete' | '{ step }' | Fired when step completes |
| 'complete' | '{ }' | Fired when all steps complete |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows steps |
| **disabled** | Stepper disabled | Non-interactive |
| **loading** | Loading state | Loading indicator |
| **error** | Error state | Error on current step |

### Step States

| State | Description |
|-------|-------------|
| **pending** | Not yet reached |
| **current** | Active step |
| **completed** | Successfully completed |
| **error** | Step has error |
| **disabled** | Step disabled |
| **skipped** | Optional step skipped |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate step indicators |
| 'Enter' / 'Space' | Go to step (if allowed) |
| 'Arrow Keys' | Navigate steps |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="navigation"' | Stepper container |
| 'aria-current="step"' | Current step |
| 'aria-disabled' | Disabled step |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Linear Stepper** | Sequential steps | Ordered processes |
| **Non-linear Stepper** | Flexible navigation | Optional steps |
| **Vertical Stepper** | Stacked layout | Forms with content |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`