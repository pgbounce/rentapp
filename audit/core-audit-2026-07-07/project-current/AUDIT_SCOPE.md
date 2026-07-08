# Core Audit Scope

- this folder is a lightweight snapshot of the current core
- it is prepared for read-only audit
- it excludes runtime artifacts and heavy dependencies like `node_modules`, `dist`, `.next`, `.turbo`, and `*.tsbuildinfo`
- it includes current source code, migrations, docs, CI config, and workspace configuration
- internal access in the current core is fixed by 3 profiles: `platform`, `tenant`, `partner`
- customer panel is still foundation-only at this stage: core is prepared for it, but feature tables, auth flow, and endpoints are not implemented yet
