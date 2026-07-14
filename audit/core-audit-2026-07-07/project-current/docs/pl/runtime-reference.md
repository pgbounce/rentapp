# Referencja Runtime

## Zmienne sesyjne PostgreSQL

Zanim uruchomi się transakcja, API ustawia zmienne sesyjne PostgreSQL. Polityki RLS czytają właśnie te wartości.

| Zmienna | Kto ustawia | Skąd bierze wartość | Po co istnieje |
| --- | --- | --- | --- |
| `app.actor_kind` | `applyDbSessionScope()` | `ActorSnapshot.actorKind` | rozróżnia `anonymous`, `internal`, `customer` |
| `app.tenant_id` | `applyDbSessionScope()` | `snapshot.tenantId` | mówi RLS, jaki tenant scope jest aktywny |
| `app.partner_id` | `applyDbSessionScope()` | `snapshot.partnerId` dla aktorów wewnętrznych | mówi RLS, czy aktywny jest partner scope |
| `app.user_id` | `applyDbSessionScope()` | `snapshot.userId` dla aktorów wewnętrznych | pozwala na wewnętrzne sprawdzenia self-scope |
| `app.customer_id` | `applyDbSessionScope()` | `snapshot.customerId` dla customer actor | przygotowane pod przyszły dostęp klienta |
| `app.role` | `applyDbSessionScope()` | `snapshot.role` dla aktorów wewnętrznych | mówi RLS, czy aktor jest `platform`, `tenant` czy `partner` |

### Ważna obecna uwaga

- publiczne rozpoznanie tenanta nie ustawia automatycznie SQL tenant scope dla aktora anonimowego
- dlatego dziś istnieje publiczne rozpoznanie tenanta, ale nie ma jeszcze publicznego katalogowego RLS

## Tryby requestów

### `system`

To obejmuje techniczne endpointy, takie jak:

- `/api/v1/health`
- `/api/v1/health/live`
- `/api/v1/health/ready`

Nie ma tu ani tenanta, ani zalogowanego aktora.

### `public`

To requesty, które nie są `system` i nie zaczynają się od `/api/v1/internal`.

Zasady:

- tenant jest rozpoznawany z `request.hostname`
- kod używa danych hosta rozpoznanych przez runtime, a nie surowego `x-forwarded-host`
- jeśli tenant nie zostanie rozpoznany, request kończy się `404`

### `internal`

To requesty zaczynające się od `/api/v1/internal`.

Zasady:

- host nie definiuje tenant scope
- przyszłe akcje wewnętrzne powinny same podawać jawny target scope
- dziś nadal nie ma prawdziwego modułu auth, więc wewnętrzny request context nie jest jeszcze zasilany z logowania

## Przepływ requestu

1. `onRequest` nadaje `requestId`
2. zapisuje czas startu requestu
3. tymczasowy kontekst startuje jako `system`
4. uruchamia się resolver trybu requestu
5. jeśli tryb jest `public`, tenant resolver może ustawić `resolvedTenantId`
6. request przechodzi dalej do routingu NestJS

## Read path

`DbService.transaction()`:

- czyta bieżący snapshot aktora z `AsyncLocalStorage`
- otwiera transakcję DB
- ustawia SQL session scope na podstawie tego snapshotu
- uruchamia zapytania przez Drizzle
- robi commit albo rollback

Używamy go do:

- odczytów
- lekkich operacji, które nie potrzebują świeżego dowodu uprawnień

## Write path

`DbService.runWriteAction()`:

- otwiera transakcję DB
- woła `app.resolve_internal_write_actor(userId, targetTenantId, targetPartnerId)`
- buduje świeży snapshot aktora wewnętrznego z wiersza zwróconego przez bazę
- ustawia SQL session scope z tego świeżego wyniku
- uruchamia callback
- robi commit albo rollback

Ważne obecne zasady:

- `runInTransaction()` używa zwykłego `begin`, więc transakcje zapisu działają dziś na domyślnym poziomie izolacji PostgreSQL `READ COMMITTED`
- `runWriteAction()` blokuje podczas dowodu scope tylko `users` i `memberships`
- `runWriteAction()` nie serializuje zapisów per tenant ani per partner
- jeśli przyszła funkcja potrzebuje serializacji na poziomie tenanta albo zasobu, musi wziąć własny jawny lock wewnątrz transakcji biznesowej

Używamy go do:

- zapisów
- operacji zależnych od scope
- wszystkiego, co nie może ufać cache'owanemu auth state z requestu

## Ścieżki błędów

### Nierozpoznany tenant

Jeśli publiczny tenant nie zostanie rozpoznany:

- backend rzuca `tenant_not_found`
- odpowiedź HTTP ma status `404`

### Niepoprawny albo nieaktywny aktor zapisu

Jeśli `app.resolve_internal_write_actor(...)` nie zwróci wiersza:

- `runWriteAction()` rzuca `ForbiddenException`
- operacja kończy się zanim uruchomi się callback biznesowy

### Nieobsłużony błąd serwera

Jeśli ucieknie zwykły wyjątek:

- `HttpExceptionFilter` zwraca `500`
- API zachowuje jeden spójny format błędu

### Odłożona luka

Dziś nadal nie ma wspólnego helpera, który podnosiłby osobny alarm, gdy:

- app-level write checks przejdą
- ale table-level RLS później spowoduje nieoczekiwany zapis na `0` wierszy

To jest nadal świadomie odłożone.

## Model aktora

### `anonymous`

Minimalny kształt:

```json
{ "actorKind": "anonymous" }
```

Obecne znaczenie:

- może przejść przez systemowy i publiczny przepływ requestu
- nie może wykonywać zapisów wewnętrznych

### `customer`

Minimalny kształt:

```json
{
  "actorKind": "customer",
  "tenantId": "TENANT_ID",
  "customerId": "CUSTOMER_ID"
}
```

Obecne znaczenie:

- kształt aktora już istnieje
- funkcje biznesowe klienta jeszcze nie istnieją

### `internal`

Minimalny kształt:

```json
{
  "actorKind": "internal",
  "userId": "USER_ID",
  "role": "partner",
  "tenantId": "TENANT_ID",
  "partnerId": "PARTNER_ID"
}
```

Obecne znaczenie:

- to jest aktor używany przez wewnętrzny dostęp chroniony przez RLS
- obecne stałe profile wewnętrzne to `platform`, `tenant` i `partner`

## Dlaczego `resolve_internal_write_actor` jest ważne

Ta funkcja jest centrum bezpiecznego write access.

Jest ważna, bo:

- sprawdza świeży stan bezpośrednio w PostgreSQL
- weryfikuje aktywność użytkownika, membershipu, tenanta i partnera
- używa `SECURITY DEFINER`, żeby bezpiecznie odczytać tabele dostępowe zanim ustawi się finalny write scope
- używa `FOR UPDATE` na `users` i `memberships`, żeby dowód uprawnień nie zmienił się w trakcie zapisu przez inną transakcję

Ważne ograniczenie:

- ten lock dotyczy stanu aktora, a nie serializacji zapisów całego tenanta
- wiersze `tenant` i `partner` są sprawdzane pod kątem aktywności, ale `runWriteAction()` ich nie blokuje

## Priorytet rozwiązywania write scope

Funkcja SQL rozwiązuje wewnętrzny write scope w tej kolejności:

- `0` = platform
- `1` = tenant
- `2` = partner

To utrzymuje rozdział między przypadkiem globalnym, tenantowym i partnerskim.
