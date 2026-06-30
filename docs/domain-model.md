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

- your main tenant can manage partners
- other tenants should not manage partners by default

This should be represented by a feature capability:

- `partner_management`

## Why this matters

If tenant and partner are mixed together, the system becomes hard to evolve.

If they stay separate:

- your public site can have partners now
- future clients can use the backend without partner features
- the backend can later become a cleaner product for other websites
