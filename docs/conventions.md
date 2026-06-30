# Conventions

## Core rules

- keep modules small and named by responsibility
- avoid generic folders like `helpers`, `misc`, or `shared-stuff`
- keep frontend free of business truth
- keep code compact, explicit, and easy to scan
- never confuse `tenant` with `partner`
- prefer capability flags over hardcoded business exceptions

## Naming

- use clear nouns: `health`, `config`, `contracts`, `db`
- keep file names predictable: `health.module.ts`, `health.service.ts`
- prefer short functions over large classes with many responsibilities
- `tenant` means top-level client of the system
- `partner` means car supplier inside a tenant

## Boundaries

- `web` renders UI and calls `api`
- `api` owns business rules
- `worker` owns background execution
- shared packages must stay generic and framework-light

## Access direction

- the platform can have its own platform-level users later
- tenants can have tenant-level users later
- partners can have partner-level users later
- access to features should be determined by role and capability, not by UI alone
