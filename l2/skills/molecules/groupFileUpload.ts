/// <mls fileReference="_102020_/l2/skills/molecules/groupFileUpload.ts" enhancement="_blank"/>

export const skill = `

# Skill: groupFileUpload

## Metadata

- **Name:** groupFileUpload
- **Category:** Files & Media
- **Version:** 1.0.0
- **Last Updated:** 03/23/2026

---

## Definition

### Essence

Allow users to **select and upload files** to the application.

### When to Use

- Document uploads
- Image/media uploads
- Bulk file imports
- Attachment handling

### When NOT to Use

- Display existing files → use **FilePreview**
- Text input → use **InputText**
- Data import from URL → use specialized importer

---

## Contract

### File Structure

| Property | Type | Required | Description |
|----------|------|:--------:|-------------|
| 'id' | 'string' | ✓ | Unique file identifier |
| 'name' | 'string' | ✓ | File name |
| 'size' | 'number' | ✓ | File size in bytes |
| 'type' | 'string' | ✓ | MIME type |
| 'progress' | 'number' | | Upload progress (0-100) |
| 'status' | 'string' | | Upload status |
| 'url' | 'string' | | Uploaded file URL |

### Component Properties

| Property | Type | Default | Required | Decorator | Description |
|----------|------|---------|:--------:|-----------|-------------|
| 'value' | 'File[]' | '[]' | | '@propertyDataSource' | Selected/uploaded files |
| 'accept' | 'string' | ''*'' | | '@property' | Accepted file types |
| 'maxSize' | 'number' | 'undefined' | | '@property' | Max file size (bytes) |
| 'maxFiles' | 'number' | '1' | | '@property' | Max number of files |
| 'multiple' | 'boolean' | 'false' | | '@property' | Allow multiple files |
| 'uploadEndpoint' | 'string' | '''' | | '@propertyDataSource' | Upload API endpoint |
| 'autoUpload' | 'boolean' | 'true' | | '@property' | Upload immediately |
| 'dragDrop' | 'boolean' | 'true' | | '@property' | Enable drag and drop |
| 'disabled' | 'boolean' | 'false' | | '@property' | Disables the component |
| 'loading' | 'boolean' | 'false' | | '@property' | Loading state |
| 'error' | 'boolean \| string' | 'false' | | '@property' | Error state or message |
| 'required' | 'boolean' | 'false' | | '@property' | Required field |

#### Decorator Reference

| Decorator | Purpose | Binding Example |
|-----------|---------|-----------------|
| '@propertyDataSource' | Binds to a single dynamic state | '{{page1.uploadedFiles}}' |
| '@property' | Static configuration or local UI state | Direct value assignment |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| 'select' | '{ files: File[] }' | Fired when files are selected |
| 'upload' | '{ file, progress }' | Fired during upload |
| 'complete' | '{ file, response }' | Fired when upload completes |
| 'error' | '{ file, error }' | Fired on upload error |
| 'remove' | '{ file }' | Fired when file is removed |

---

## Visual States

### Component States

| State | Description | Expected Behavior |
|-------|-------------|-------------------|
| **default** | Ready for upload | Drop zone visible |
| **dragover** | File dragged over | Highlighted drop zone |
| **uploading** | Upload in progress | Progress indicator |
| **complete** | Upload finished | Success state |
| **disabled** | Component disabled | Non-interactive |
| **error** | Error occurred | Error feedback |

### File States

| State | Description |
|-------|-------------|
| **pending** | Selected, not uploaded |
| **uploading** | Upload in progress |
| **complete** | Successfully uploaded |
| **error** | Upload failed |

---

## Accessibility (Recommended)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| 'Tab' | Focus upload area |
| 'Enter' / 'Space' | Open file picker |
| 'Delete' | Remove selected file |

### ARIA

| Attribute | Application |
|-----------|-------------|
| 'role="button"' | Upload trigger |
| 'aria-label' | Accessible description |
| 'aria-describedby' | File requirements |

---

## Implementations (Molecules)

| Molecule | Description | Best For |
|----------|-------------|----------|
| **Drag-Drop** | Large drop zone | Desktop uploads |
| **Button Upload** | Simple button | Single file, compact |
| **Multi-File** | List with progress | Bulk uploads |
| **Camera** | Device camera capture | Mobile, photos |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 03/23/2026 | Initial contract definition |

`;