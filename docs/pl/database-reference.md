# Referencja Bazy Danych

## Mapa identyfikatorów

| Pole | Tabela | Typ | Od czego zależy | `NULL` | Zakres | Znaczenie |
| --- | --- | --- | --- | --- | --- | --- |
| `tenants.id` | `tenants` | `uuid` | klucz główny | nie | globalny | jedna wypożyczalnia korzystająca z systemu |
| `partners.id` | `partners` | `uuid` | klucz główny | nie | logicznie tenantowy | jeden partner wewnątrz jednego tenanta |
| `partners.tenant_id` | `partners` | `uuid` | `tenants.id` | nie | tenantowy | tenant właściciel partnera |
| `users.id` | `users` | `uuid` | klucz główny | nie | globalny | jeden użytkownik wewnętrzny |
| `user_credentials.user_id` | `user_credentials` | `uuid` | `users.id` | nie | globalny | wiersz logowania jednego użytkownika |
| `memberships.id` | `memberships` | `uuid` | klucz główny | nie | globalny | jeden rekord przypisania roli |
| `memberships.user_id` | `memberships` | `uuid` | `users.id` | nie | globalny | przypisany użytkownik |
| `memberships.tenant_id` | `memberships` | `uuid` | `tenants.id` | tak | tenantowy | tenant scope przypisania |
| `memberships.partner_id` | `memberships` | `uuid` | `partners.id` z tym samym `tenant_id` | tak | tenantowy | partner scope przypisania |
| `locations.id` | `locations` | `uuid` | klucz główny | nie | logicznie tenantowy | jedna lokalizacja |
| `locations.tenant_id` | `locations` | `uuid` | `tenants.id` | nie | tenantowy | tenant właściciel lokalizacji |
| `cars.id` | `cars` | `uuid` | klucz główny | nie | logicznie tenantowy | jedno auto |
| `cars.tenant_id` | `cars` | `uuid` | `tenants.id` | nie | tenantowy | tenant właściciel auta |
| `cars.partner_id` | `cars` | `uuid` | `partners.id` z tym samym `tenant_id` | tak | tenantowy | opcjonalny partner właściciel auta |
| `car_locations.tenant_id` | `car_locations` | `uuid` | `tenants.id` | nie | tenantowy | część złożonego klucza głównego |
| `car_locations.car_id` | `car_locations` | `uuid` | `cars.id` z tym samym `tenant_id` | nie | tenantowy | podpięte auto |
| `car_locations.location_id` | `car_locations` | `uuid` | `locations.id` z tym samym `tenant_id` | nie | tenantowy | podpięta lokalizacja |

## Po co istnieją tabele

| Tabela | Cel |
| --- | --- |
| `tenants` | główne wypożyczalnie korzystające z systemu |
| `partners` | dostawcy działający wewnątrz jednego tenanta |
| `users` | użytkownicy wewnętrzni platformy, tenantów i partnerów |
| `user_credentials` | hashe haseł trzymane osobno od `users` |
| `memberships` | przypisania profili wewnętrznych według scope |
| `locations` | lokalizacje odbioru i zwrotu w obrębie jednego tenanta |
| `cars` | auta i ich podstawowe pola opisowe |
| `car_locations` | mapowanie między autami a lokalizacjami |

## Najważniejsze reguły struktury

- partner zawsze należy do jednego tenanta
- partnerowy membership musi mieć jednocześnie `tenant_id` i `partner_id`
- tenantowy membership musi mieć `tenant_id`, ale bez `partner_id`
- `car_locations` ma złożony klucz główny, a nie osobne `id`
- nadal nie istnieją biznesowe tabele dla `bookings`, `payments` ani klientów

## Ważne kolumny

- `tenants.slug`: globalnie unikalny slug tenanta używany do publicznego rozpoznania po hoście
- `partners.slug`: unikalny tylko w obrębie jednego tenanta
- `users.email`: globalnie unikalny e-mail użytkownika wewnętrznego
- `memberships.scope`: `platform`, `tenant` albo `partner`
- `memberships.role`: stały profil wewnętrzny
- `cars.partner_id`: opcjonalne powiązanie auta z partnerem
- `car_locations.kind`: `pickup`, `return` albo `both`

## Enumy

| Enum | Wartości | Znaczenie |
| --- | --- | --- |
| `tenant_kind` | `platform`, `client` | typ tenanta |
| `tenant_status` | `active`, `inactive` | stan aktywności tenanta |
| `partner_status` | `active`, `inactive` | stan aktywności partnera |
| `user_status` | `invited`, `active`, `suspended` | stan użytkownika wewnętrznego |
| `membership_scope` | `platform`, `tenant`, `partner` | zakres przypisania |
| `membership_role` | `platform`, `tenant`, `partner` | stały profil wewnętrzny |
| `membership_status` | `invited`, `active`, `disabled` | stan membershipu |
| `location_status` | `active`, `inactive` | stan lokalizacji |
| `car_status` | `draft`, `active`, `inactive` | stan auta |
| `car_transmission` | `manual`, `automatic` | skrzynia biegów |
| `car_fuel_type` | `petrol`, `diesel`, `hybrid`, `plug_in_hybrid`, `electric`, `lpg` | rodzaj paliwa |
| `car_location_kind` | `pickup`, `return`, `both` | rola lokalizacji dla auta |
| `actor_kind` | `anonymous`, `internal`, `customer` | typ aktora w sesji SQL |

## Triggery i helpery techniczne

### `updated_at`

`app.touch_updated_at()` aktualizuje `updated_at` przed `UPDATE`.

Dziś trigger jest podpięty do:

- `tenants`
- `partners`
- `users`
- `memberships`
- `locations`
- `cars`
- `user_credentials`

### `clock_timestamp()`

Projekt używa `clock_timestamp()` zamiast `now()`, dzięki czemu `updated_at` pokazuje rzeczywisty moment wykonania w transakcji.

### `uuid_v7()`

Projekt używa `app.uuid_v7()`, a nie losowego `uuid v4`.

Praktyczny sens:

- ID nadal są trudne do odgadnięcia
- ale są bardziej uporządkowane czasowo dla indeksów

## Check constraints

Przykłady twardej walidacji już w bazie:

- `memberships_scope_check`
- `cars_production_year_check`
- `cars_seat_count_check`
- `cars_door_count_check`
- `cars_luggage_count_check`

To znaczy, że baza sama odrzuca oczywiście błędne wartości.

## Rozszerzenia PostgreSQL

| Rozszerzenie | Używane teraz | Po co |
| --- | --- | --- |
| `pgcrypto` | tak | losowe bajty dla `uuid_v7()` |
| `btree_gist` | jeszcze nie | obecnie niewykorzystane przygotowanie na przyszłość |

## Glosariusz funkcji SQL

| Funkcja | Najprostsze znaczenie |
| --- | --- |
| `app.uuid_v7()` | generuje czasowo uporządkowany UUID |
| `app.touch_updated_at()` | aktualizuje `updated_at` przed `UPDATE` |
| `app.current_tenant_id()` | czyta `app.tenant_id` z sesji SQL |
| `app.current_partner_id()` | czyta `app.partner_id` z sesji SQL |
| `app.current_user_id()` | czyta `app.user_id` z sesji SQL |
| `app.current_role()` | czyta `app.role` z sesji SQL |
| `app.current_actor_kind()` | czyta `app.actor_kind` z sesji SQL |
| `app.current_customer_id()` | czyta `app.customer_id` z sesji SQL |
| `app.is_anonymous_actor()` | sprawdza aktora anonimowego |
| `app.is_internal_actor()` | sprawdza aktora wewnętrznego |
| `app.is_customer_actor()` | sprawdza aktora klienta |
| `app.is_platform_role()` | sprawdza profil `platform` |
| `app.is_tenant_role()` | sprawdza profil `tenant` |
| `app.is_tenant_manager()` | alias zgodności dla roli tenant |
| `app.is_partner_role()` | sprawdza profil `partner` |
| `app.can_read_partner_scope(tenant, partner)` | sprawdza odczyt partner scope |
| `app.can_manage_tenant_scope(tenant)` | sprawdza zarządzanie tenant scope |
| `app.can_manage_partner_scope(tenant, partner)` | sprawdza zarządzanie partner scope |
| `app.tenant_partner_management_enabled(tenant)` | hook pod przyszły przełącznik, dziś zawsze `false` |
| `app.can_manage_memberships(tenant, partner)` | sprawdza zarządzanie membershipami |
| `app.can_manage_partners(tenant)` | sprawdza zarządzanie partnerami |
| `app.resolve_public_tenant_id(slug)` | rozpoznaje aktywnego tenanta po slugu |
| `app.resolve_internal_write_actor(user, tenant, partner)` | rozpoznaje świeży wewnętrzny write scope |

## Matryca dostępu RLS

### Skrót ról

- `platform` = globalny właściciel
- `tenant` = pełny tenant scope
- `partner` = ograniczony partner scope

### Skrót tabel

| Tabela | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `tenants` | `platform` wszystko; aktor z pasującym `current_tenant_id` widzi swój tenant | tylko `platform` | `platform` albo własny `tenant` | tylko `platform` |
| `partners` | `platform` wszystko; `tenant` widzi partnerów własnego tenanta; `partner` widzi tylko siebie | tylko `platform` | jak przy insert, ale rekord musi też być widoczny | jak insert |
| `users` | `platform` wszystko; `tenant` i `partner` tylko użytkownicy z membershipami w ich zakresie | tylko `platform` | tylko `platform` | tylko `platform` |
| `user_credentials` | `platform` wszystko; użytkownik wewnętrzny widzi własny rekord | `platform` albo self | `platform` albo self | tylko `platform` |
| `memberships` | `platform` wszystko; `tenant` widzi membershipy własnego tenanta; `partner` widzi membershipy własnego partnera | `platform`; `tenant` tylko dla tenantowych membershipów własnego tenanta | widoczny rekord plus `can_manage_memberships(...)` | jak insert |
| `locations` | `platform` wszystko; pasujący tenant scope widzi lokalizacje tenanta | `platform` albo własny `tenant` | `platform` albo własny `tenant` | `platform` albo własny `tenant` |
| `cars` | `platform` wszystko; `tenant` widzi auta tenanta; `partner` widzi własne auta | `platform`, własny `tenant` albo własny `partner` | widoczny rekord plus `can_manage_partner_scope(...)` | jak insert |
| `car_locations` | dostęp wyliczany przez widoczność auta | dostęp wyliczany przez scope zarządzania autem | jak insert plus widoczność rekordu | jak insert |

## Praktyczne uwagi o dostępie

- `platform` tworzy tenantów i partnerów
- `tenant` może działać w obrębie własnej wypożyczalni, ale domyślnie nie tworzy partnerów
- `partner` jest ograniczony do własnego scope
- `customer` nie ma jeszcze gotowego, pełnego modelu RLS
