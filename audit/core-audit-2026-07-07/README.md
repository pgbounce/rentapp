# Core Audit Package

Ten folder zawiera read-only snapshot rdzenia projektu do zewnetrznego audytu.

## Zawartosc

- `project/` - kopia tylko plikow nalezacych do core
- `CLAUDE_CORE_AUDIT_PROMPT.md` - gotowy prompt do krytycznej analizy

## Cel

Paczka ma sluzyc do audytu:

- architektury core
- bezpieczenstwa multi-tenant
- RLS i kontroli dostepu
- separacji `platform` / `tenant` / `partner` / `customer`
- runtime API
- foundation DB
- CI i konfiguracji srodowiska
- czystosci kodu i wykrywania martwych elementow

## Czego tu nie ma

Celowo nie ma:

- `node_modules`
- `dist`
- `.next`
- `.turbo`
- logow builda
- plikow przypadkowych lub niezwiązanych z core

## Zakres oceny

To ma byc krytyczny audyt fundamentu, a nie review feature'ow biznesowych.
