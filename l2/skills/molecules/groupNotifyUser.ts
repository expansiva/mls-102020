/// <mls fileReference="_102020_/l2/skills/molecules/groupNotifyUser.ts" enhancement="_blank"/>

export const skill = `
# Skill Group Contract: \`notify + user\`

> Official contract for molecules in the **notify + user** group in the Collab Aura system.

---

## 1. Metadata

| Field | Value |
|-------|-------|
| **Group** | \`notify + user\` |
| **Category** | Feedback |
| **Intent** | System wants to **inform the user** about an event, status, or result |
| **Version** | \`1.0.0\` |

---

## 2. When to Use

- Action feedback (success, error, warning)
- System alerts and messages
- Event notifications
- Important announcements
- Status updates
- Connection state changes

---

## 3. When NOT to Use

| Scenario | Use instead |
|----------|-------------|
| Requires user decision | \`focus + overlay\` (Dialog, Alert Dialog) |
| Persistent item status | \`show + status\` (Badge, Tag) |
| Loading/progress indication | \`show + progress\` |
| Empty state messaging | \`show + empty\` |

---

## 4. Slot Tags

| Tag | Required | Description |
|-----|:--------:|-------------|
| \`Title\` | No | Notification title (short, bold) |
| \`Description\` | No | Additional details or message body |
| \`Icon\` | No | Custom icon (overrides type default) |
| \`Action\` | No | Action button (e.g., Undo, View, Retry) |
| \`Close\` | No | Custom close button content |

### HTML Structure

\`\`\`html
<molecules--toast-102020 type="success" duration="5000">
  <Title>Changes saved</Title>
  <Description>Your profile has been updated successfully.</Description>
  <Action>View profile</Action>
</molecules--toast-102020>
\`\`\`

---

## 5. Properties

### 5.1 Configuration

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`type\` | \`string\` | \`'info'\` | \`@property\` | Notification type/severity |
| \`duration\` | \`number\` | \`5000\` | \`@property\` | Auto-dismiss time in ms (0 = persistent) |
| \`position\` | \`string\` | \`'bottom-right'\` | \`@property\` | Screen position |
| \`dismissible\` | \`boolean\` | \`true\` | \`@property\` | Show close button |

#### Valid values for \`type\`

| Value | Description | Default Icon |
|-------|-------------|--------------|
| \`info\` | Informational message | Info circle |
| \`success\` | Positive/success feedback | Check circle |
| \`warning\` | Warning/caution message | Warning triangle |
| \`error\` | Error/failure message | X circle |

#### Valid values for \`position\`

| Value | Description |
|-------|-------------|
| \`top-left\` | Top left corner |
| \`top-center\` | Top center |
| \`top-right\` | Top right corner |
| \`bottom-left\` | Bottom left corner |
| \`bottom-center\` | Bottom center |
| \`bottom-right\` | Bottom right corner |

### 5.2 States

| Property | Type | Default | Decorator | Description |
|----------|------|---------|-----------|-------------|
| \`visible\` | \`boolean\` | \`true\` | \`@property\` | Notification visibility |
| \`paused\` | \`boolean\` | \`false\` | \`@property\` | Pause auto-dismiss timer |

---

## 6. Events

| Event | Detail | Bubbles | Description |
|-------|--------|:-------:|-------------|
| \`show\` | \`{}\` | ✓ | Notification became visible |
| \`hide\` | \`{ reason: string }\` | ✓ | Notification was hidden |
| \`action\` | \`{}\` | ✓ | Action button clicked |
| \`close\` | \`{}\` | ✓ | Close button clicked |

### Hide Reasons

| Reason | Description |
|--------|-------------|
| \`timeout\` | Auto-dismissed after duration |
| \`close\` | User clicked close button |
| \`action\` | User clicked action button |
| \`programmatic\` | Hidden via property/method |

### Event Dispatch Example

\`\`\`typescript
this.dispatchEvent(new CustomEvent('hide', {
  bubbles: true,
  composed: true,
  detail: { reason: 'timeout' }
}));
\`\`\`

---

## 7. Visual States

| State | Behavior |
|-------|----------|
| **Entering** | Slide/fade in animation |
| **Visible** | Fully visible, timer running |
| **Paused** | Timer paused (on hover) |
| **Exiting** | Slide/fade out animation |
| **Hidden** | Not rendered |

---

## 8. Rendering Logic

\`\`\`
RENDER:

1. IF NOT visible:
   - Return nothing

2. Container (positioned):
   - Apply type styles (background, border, icon color)
   - Apply position styles
   - Apply animation state

3. Content wrapper:
   a. Icon area:
      IF hasSlot('Icon'):
         - Render custom icon
      ELSE:
         - Render default icon based on type
   
   b. Text area:
      IF hasSlot('Title'):
         - Render title (bold, larger)
      IF hasSlot('Description'):
         - Render description (normal, smaller)
   
   c. Actions area:
      IF hasSlot('Action'):
         - Render action button
      IF dismissible:
         - Render close button

4. Progress bar (optional):
   - Show remaining time visually
\`\`\`

---

## 9. Timer Behavior

### Auto-Dismiss

| Condition | Behavior |
|-----------|----------|
| \`duration > 0\` | Start countdown timer |
| \`duration === 0\` | Persistent until manually closed |
| Mouse enter | Pause timer |
| Mouse leave | Resume timer |
| Action click | Dismiss immediately |
| Close click | Dismiss immediately |

### Stacking

| Rule | Behavior |
|------|----------|
| Multiple notifications | Stack vertically with gap |
| Same position | Newest on top or bottom based on position |
| Max visible | Limit visible count, queue others |

---

## 10. Type Styling

| Type | Background | Border | Icon Color | Text Color |
|------|------------|--------|------------|------------|
| \`info\` | Light blue | Blue | Blue | Dark |
| \`success\` | Light green | Green | Green | Dark |
| \`warning\` | Light yellow | Yellow/Orange | Orange | Dark |
| \`error\` | Light red | Red | Red | Dark |

---

## 11. Accessibility (a11y)

| Requirement | Implementation |
|-------------|----------------|
| Role | \`role="alert"\` or \`role="status"\` |
| Live region | \`aria-live="polite"\` (info) or \`aria-live="assertive"\` (error) |
| Atomic | \`aria-atomic="true"\` |
| Close button | \`aria-label="Close notification"\` |
| Action button | Descriptive label |
| Focus management | Don't steal focus from user |

### Role Selection

| Type | Role | Aria-Live |
|------|------|-----------|
| \`info\` | \`status\` | \`polite\` |
| \`success\` | \`status\` | \`polite\` |
| \`warning\` | \`alert\` | \`polite\` |
| \`error\` | \`alert\` | \`assertive\` |

### Structure

\`\`\`html
<div 
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <div class="icon">...</div>
  <div class="content">
    <div class="title">...</div>
    <div class="description">...</div>
  </div>
  <button aria-label="Close notification">×</button>
</div>
\`\`\`

---

## 13. Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-04-14 | Initial contract version |

`