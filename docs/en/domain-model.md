# Domain model

## Core levels

### Platform

The platform is the whole product you own.

It contains:

- the backend
- the public website
- future admin tools
- future partner tools

### Tenant

A tenant is a rental business using your system.

Examples:

- today: your own rental business
- later: another company using your backend on its own website

A tenant owns:

- its website usage of the backend
- its bookings
- its cars
- its pricing
- its settings

### Partner

A partner is not another tenant.

A partner works inside a tenant and supplies cars or manages part of that tenant's fleet.

Examples:

- today: a supplier adding cars to your public website
- later: a supplier working only inside one tenant's scope

## Current business rule

- internal access is fixed by profile, not by per-tenant feature flags
- `platform` sees all data and can do everything
- `tenant` sees and manages its own rental business
- `partner` will later see and manage only its own partner-scoped data inside a tenant
- one internal account maps to one membership
- creating partner records is platform-only by default
- creating partner-scoped memberships is also platform-only by default
- a future tenant-level partner management switch should turn this on explicitly for a chosen tenant

