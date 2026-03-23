/// <mls fileReference="_102020_/l2/skills/molecules/groupFilePreview.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupFilePreview

## Metadata

- **Name:** groupFilePreview
- **Category:** Files & Media
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Display **previews and information** about files and media.

### When to Use

- Showing uploaded files
- Document previews
- Image galleries
- File attachments list

### When NOT to Use

- Uploading files → use **FileUpload**
- Media playback → use dedicated player
- File editing → use specialized editor

---

## Contract

### File Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string' | ✓ | Unique file identifier |
| 'name' | 'string' | ✓ | File name |
| 'size' | 'number' | | File size in bytes |
| 'type' | 'string' | ✓ | MIME type |
| 'url' | 'string' | ✓ | File URL |
| 'thumbnail' | 'string' | | Thumbnail URL |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'files' | 'File[]' | '[]' | ✓ | '@propertyDataSource' | Files to preview |
| 'downloadable' | 'boolean' | 'true' | | '@property' | Allow download |
| 'deletable' | 'boolean' | 'false' | | '@property' | Allow deletion |
| 'previewable' | 'boolean' | 'true' | | '@property' | Open preview modal |
| 'showSize' | 'boolean' | 'true' | | '@property' | Display file size |
| 'showType' | 'boolean' | 'false' | | '@property' | Display file type |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.attachments}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'preview' | '{ file }' | Fired when preview is opened |
| 'download' | '{ file }' | Fired when download is triggered |
| 'delete' | '{ file }' | Fired when file is deleted |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Normal display | Shows file list/grid |
| **loading** | Loading files | Loading indicator |
| **empty** | No files | Empty state |
| **error** | Error state | Error feedback |

### File States

| State | Description |
|-------|-------------|
| **default** | Normal display |
| **hover** | Cursor over file |
| **previewing** | Preview open |
| **downloading** | Download in progress |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Navigate files |
| 'Enter' | Open preview |
| 'Delete' | Delete file (if allowed) |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="list"' | File list container |
| 'role="listitem"' | Each file |
| 'aria-label' | File description |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Image Preview** | Image thumbnails | Photo galleries |
| **PDF Preview** | Document viewer | Document display |
| **File List** | Compact file list | Attachments |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;