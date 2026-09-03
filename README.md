✨ Collab Aura2

Collab Aura is the visual foundation of the Collab.codes ecosystem.
It defines how every generated application looks, feels, and behaves on the frontend — from layout composition to component structure and interface identity.

🎨 Overview

Collab Aura acts as the frontend master framework, responsible for shaping the visual experience after a project is published.
It provides the base structure for navigation, layout, and UI consistency across all generated apps.

🧱 Layout Structure
collab-aura/
 ├── topbar/        # Company info and user session display
 ├── sidebar/       # Collab Messages and ERP navigation
 ├── workspace/     # ERP screens and embedded applications
 ├── themes/        # Style definitions and visual themes
 └── aura-agents/   # Agents for UI configuration and automatic layout setup


The framework ensures that each application inherits the same cohesive visual shell — adaptable to themes, plugins, and enterprise customization.

🧠 Aura Agents

Aura Agents assist in:

Building and styling layout templates dynamically.

Connecting UI components with Collab states and backend data.

Generating responsive layouts for different screen types.

Synchronizing the visual structure with Collab Forge (backend).

Example:

“Aura Agent: prepare the sidebar for ERP navigation.”
“Aura Agent: refresh topbar branding and company context.”

## What a generated module inherits

A generated module is born with `appEnv: "presentation"` in its `l5/project.json` (test database, curated
seeds, full test suite, PRESENTATION badge), and publishing it registers its authority catalogue — the
actors of E3 as `<moduleId>:<actorId>` roles — so they can be assigned from a list. The canonical
definition of the modes, of the authentication of `/execBff` and of the authority format lives in
`mls-102034/docs/appEnvAndAuth.md`.
