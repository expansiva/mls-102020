/// <mls fileReference="_102020_/l2/skills/aura/overview.ts" enhancement="_blank"/>

export const skill = `
## Skill — Frontend Architecture — Collab Aura

This document defines the official frontend architecture, design principles, and responsibilities for building applications using Collab Aura.
All components, pages, and integrations MUST follow these rules.

## Core Architecture Principles
### Atomic Design Structure
The frontend follows Atomic Design, with the following hierarchy:
- Page → Top-level screen and orchestration layer
- Organism → Complex UI sections composed of molecules and plugins
- Molecule → Reusable UI components, presentation-only
- Plugin → Integration components that communicate with external services
Each level has a strict responsibility and separation of concerns.

### Technology Stack
- Use Lit 3 to build Web Components
- Do NOT use Shadow DOM
- Use Tailwind CSS for styling
- Use SPA (Single Page Application) architecture
- Each page corresponds to a URL entry point

### Backend Communication Model
Follow the BFF (Backend for Frontend) pattern.
Frontend MUST communicate with backend routines using the BFF abstraction layer.
All backend communication MUST go through the frontend backend gateway (beInvoke or equivalent).
Direct backend calls outside this abstraction are NOT allowed.

### Data Fetching Strategy
Use Stale-While-Revalidate (SWR) strategy for optimal perceived performance.
This means:
- First attempt to load data from local IndexedDB (fast response)
- Mark data consistency as "stale"
- Then fetch fresh data from backend
- Update state and IndexedDB when backend responds
- Mark data consistency as "fresh"
This improves performance and user experience.

## State Management
Global state is used by pages and organisms.
State naming:
ui.[pageName].[stateName]
Examples:
ui.productDetail.product  
ui.productDetail.productConsistency  
ui.productDetail.onLoadMore  
State types:
- Data state → holds UI data
- Event state → triggers actions (example: onUpdateUser)
Rules:
- Pages MUST NOT pass data to organisms via properties, prefer states.
- Molecules MUST NOT access global state.

## Page Definitions
A Page is a Web Component responsible for orchestrating the entire screen.
Responsibilities:
- Entry point of the user interface
- Each page corresponds to a URL
- Render the overall layout
- Render organisms and plugins
- Own business logic
- Communicate with backend using BFF
- Manage state lifecycle
- Define state contracts for child organisms
- Implement data fetching using SWR pattern
Pages MUST:
- Follow business rules
- Render SPA-compatible HTML
- Render organisms and sections inside a root <div>
- Orchestrate tabs and conditional content if needed
- Update state based on backend responses
Pages MUST NOT:
- Contain reusable UI logic that belongs in organisms
- Contain reusable UI components that belong in molecules
Testing:
Each page MUST have a corresponding test file:
pageName.test.ts
Tests MUST verify:
- Business logic
- State transitions
- Backend communication behavior

## Organism Definitions
Organisms are Web Components responsible for rendering complex UI sections.
Responsibilities:
- Render layout sections
- Combine molecules and plugins
- Receive data via global states
- Emit events via state updates
Organisms MUST:
- Follow defined property contracts
- Be reusable within the project
Organisms MUST NOT:
- Communicate directly with backend
- Own business logic
- Fetch data
Testing:
Each organism MUST have:
organismName.test.ts
Tests MUST verify:
- Layout rendering
- Property handling
- State-driven rendering behavior

## Molecule Definitions
Molecules are reusable UI components.
Responsibilities:
- Render UI elements
- Be highly reusable
- Be presentation-only
Molecules MUST:
- Receive data only via properties
- Be stateless regarding global application state
Molecules MUST NOT:
- Access global state
- Communicate with backend
- Contain business logic

## Plugin Definitions
Plugins are Web Components responsible for integrating with external services.
Examples:
- Payment platforms
- External APIs
- Third-party integrations
- Analytics services
Plugins MAY:
- Communicate with external services
- Provide integration functionality
Plugins MUST NOT:
- Contain core business logic of the application
- Own application state

## Folder and File Organization
All frontend files MUST follow this structure:
_[projectId]_/l2/[moduleName]/[componentName].[extension]
Definitions:
- projectId → numeric project identifier (example: 100111)
- l2 → frontend layer
- moduleName → module name or folder
- componentName → component name using camelCase
- extension → file type (ts, test.ts, defs.ts, css, etc.)
Import rules:
- Always use absolute project-based imports 
Example:
import "/_100111_/l2/user/userProfileOrganism.js";

All generated frontend code MUST strictly follow this architecture.
`;