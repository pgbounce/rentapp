# Data Standards

These rules apply before the first business table is added.

## Identity

- all main business records should use `uuid`
- the frontend must never define identifier truth

## Public identifiers

- slugs stored in the database should be lowercase and URL-safe
- public identifiers should not rely on case-sensitive matching

## Email

- internal user emails should be stored already normalized
- the current core keeps them lowercase and trimmed

## Time

- store time in UTC
- in PostgreSQL use `timestamptz`

## Money

- store amounts as integers in the smallest unit, for example grosze
- never store money as `float`
- currency should be a separate field, for example `currency = PLN`

## Tenant scope

- every future business table should be ready for `tenant_id`
- a partner always belongs to one concrete tenant
- tenant data must never mix through either the frontend or the backend

## Status fields

- statuses should be short, predictable, and written in `snake_case`
- a status should describe business state, not view state

## Source of truth

- the backend is the only source of truth
- the frontend may send choices, but it must not force prices, statuses, or availability
