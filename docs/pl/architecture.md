# Architektura

## Produkty

- `web` jest publicznym klientem.
- `api` jest jedynym backendowym źródłem prawdy.
- `worker` obsługuje pracę w tle poza requestami użytkownika.

## Model produktu

- `platform` to cały Twój system
- `tenant` to wypożyczalnia korzystająca z systemu
- `partner` to dostawca aut działający wewnątrz tenanta

To rozróżnienie jest kluczowe:

- przyszły zewnętrzny klient Twojego backendu to `tenant`
- firma dodająca auta do Twojej strony to `partner`
- `partner` nigdy nie jest właścicielem całej platformy

## Obecny kierunek biznesowy

- `tenant_1` to Twoja główna wypożyczalnia
- przyszli tenanci będą używać backendu do własnej strony i własnej administracji
- obsługa partnerów należy do wspólnego modelu produktu, a nie do jednego specjalnego wyjątku

## Model dostępu wewnętrznego

- dostęp wewnętrzny jest stały według profilu, a nie według flag per tenant
- `platform` oznacza globalny dostęp do całego systemu
- `tenant` oznacza pełny dostęp w obrębie jednego tenanta
- `partner` oznacza ograniczony dostęp w obrębie jednego tenanta i jednego partner scope
- `anonymous` i `customer` pozostają oddzielone od dostępu wewnętrznego

To utrzymuje core w prostocie:

- każdy tenant działa według tego samego modelu dostępu
- każdy partner działa według tego samego modelu dostępu
- różnice między użytkownikami wynikają z zakresu, a nie z wyjątków per tenant
- tworzenie partnerów domyślnie jest tylko dla `platform`
- przyszłe włączenie partner management dla tenanta powinno być jednym jawnym przełącznikiem backendowym, a nie twardym wyjątkiem

## Komunikacja

- `web` rozmawia z `api` przez HTTP.
- `api` jest jedyną warstwą, która może posiadać logikę biznesową.
- `worker` używa tej samej infrastruktury co `api`, ale poza request flow.

## Model dostępu

- `users` to konta wewnętrzne platformy, tenantów i partnerów
- hashe haseł żyją poza `users`, w `user_credentials`
- jeden użytkownik wewnętrzny ma teraz dokładnie jeden wiersz membership
- przyszli klienci wypożyczalni powinni być modelowani osobno od dostępu wewnętrznego
- `customer` jest osobnym aktorem, nigdy rolą `membership`
- auth klienta ma być oddzielony od auth wewnętrznego
- auth klienta jest planowany jako `email + verification code`, a potem sesja klienta
- aktor `customer` nie niesie ról wewnętrznych

## Status panelu klienta

- panel klienta nie jest jeszcze zaimplementowany jako funkcja
- obecny core tylko przygotowuje system pod przyszłego aktora `customer`
- obecny core już odróżnia dostęp klienta od użytkowników i membershipów wewnętrznych
- obecny core już rezerwuje dostęp klienta oparty o `tenantId` i `customerId`
- obecny core nie zawiera jeszcze tabel klientów, kodów logowania, sesji klienta, reguł dostępu do bookingów ani endpointów klienta
- to jest celowe: dostęp klienta ma zostać dołożony jako osobna warstwa nad obecnym core, a nie zmieszany z auth wewnętrznym

## Rozwiązywanie dostępu

- request context niesie snapshot aktora, a nie finalne uprawnienie zapisu
- read path może używać tego snapshotu bezpośrednio
- write path musi odpytać PostgreSQL o świeży scope tuż przed transakcją
- izolacja tenantów i partnerów nadal musi być wymuszana przez PostgreSQL RLS
- sprawdzenie aktora i sprawdzenie zasobu muszą pozostać oddzielone
- snapshot aktora musi umieć reprezentować `anonymous`, `internal` i `customer`
- dostęp klienta powinien pozostać oparty o `tenantId` i `customerId`
- przyszłe tabele klientów muszą utrzymać unikalność e-maila per tenant, nigdy globalnie
- write scope `platform` może nadal nieść jawne `tenantId` i `partnerId`, gdy użytkownik platformy działa w wybranym kontekście
- ten kontekst służy audytowi i scope sesji zapisu, a nie ograniczaniu uprawnień platformy
- wewnętrzny core używa dziś stałych profili: `platform`, `tenant`, `partner`

## Fundament requestu

- requesty są podzielone na `system`, `public` i `internal`
- `system` obejmuje dziś endpointy health
- `internal` jest zarezerwowany dla `/api/v1/internal/*`
- `public` rozpoznaje kontekst tenanta po subdomenie hosta dopasowanej do `tenants.slug`
- publiczny resolver tenanta musi ufać tylko hostowi rozpoznanemu przez runtime serwera, nigdy ręcznie czytanym nagłówkom proxy
- publiczny request bez rozpoznanego tenanta musi zakończyć się natychmiast `404`
- wewnętrzny target scope requestu nie pochodzi z hosta
- przyszły wewnętrzny target scope powinien pochodzić z samej trasy danej akcji
- obecnym wejściem write path jest `DbService.runWriteAction`
- `runWriteAction` rozwiązuje aktora wewnętrznego na żywo z PostgreSQL wewnątrz transakcji zapisu
- `runWriteAction` oczekuje `userId` wyłącznie z zaufanego stanu auth, nigdy z body, query ani parametrów trasy podanych przez wywołującego
- `runWriteAction` nie jest globalnym muteksem zapisów per tenant ani per partner
- funkcje, które potrzebują serializacji na poziomie tenanta albo zasobu, muszą brać własne jawne locki wewnątrz transakcji biznesowej
- przyszłe publiczne funkcje odczytu potrzebują własnej polityki RLS scoped po `tenant_id`
- przyszłe publiczne funkcje odczytu potrzebują też jawnej bezpiecznej listy kolumn w warstwie zapytań

## Rzeczy świadomie odłożone tylko dla core

- auth wewnętrzny nie jest jeszcze zaimplementowany, więc request context nie dostaje jeszcze prawdziwych tożsamości z modułu logowania
- auth klienta nie jest jeszcze zaimplementowany, więc aktorzy `customer` są na razie tylko przygotowaniem foundation
- publiczny katalog i publiczny listing RLS nie są jeszcze zaimplementowane
- tabele klientów, kody logowania, sesje i endpointy klienta nie są jeszcze zaimplementowane
- `runWriteAction` gwarantuje dziś świeże rozwiązanie aktora, scope transakcji i wspólny helper `expectMutation(...)` do ścisłego pilnowania liczby zmienionych wierszy
- feature-level writes nadal będą musiały walidować swój docelowy zasób wewnątrz transakcji
- obecne publiczne rozpoznawanie tenanta wspiera subdomenę hosta do `tenants.slug`; custom domains można dodać później jako osobny krok foundation
- obecny runtime ufa tylko bezpośrednio rozpoznanemu hostowi serwera; jeśli później pojawi się reverse proxy, zaufanie do proxy trzeba będzie skonfigurować jawnie, zanim zaczniemy używać forwarded headers

## Runtime foundation

- `api` już posiada wspólne elementy runtime:
- konfigurację środowiska
- połączenie z PostgreSQL
- połączenie z Redis
- request id
- request context
- spójny format błędów API
- liveness i readiness checks
- ustrukturyzowane logowanie requestów

Dostęp do bazy jest rozdzielony celowo:

- migracje używają administracyjnej roli bazy
- runtime `api` i `worker` używają ograniczonej roli aplikacyjnej
- izolacja tenantów nigdy nie może zależeć od łączenia się jako `postgres`

## Wspólne pakiety

- `config` trzyma parsowanie środowiska i prymitywy konfiguracji aplikacji
- `contracts` trzyma współdzielone kształty API
- `db` trzyma konfigurację bazy i pliki schematu
- `redis` trzyma współdzielone prymitywy połączenia z Redis

## Przyszły kierunek

- panel partnera i panel admina powinny stać się dodatkowymi klientami tego samego `api`
- backend może zostać przeniesiony na osobny serwer bez zmiany architektury frontendu
- logika biznesowa musi zostać w `api`, nigdy w `web`
- logika tenanta i partnera musi pozostać od siebie oddzielona
