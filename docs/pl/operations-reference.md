# Referencja Operacyjna

## Konfiguracja środowiska

Konfiguracja jest rozdzielona na:

- `packages/config/src/base.ts`
- `packages/config/src/api.ts`
- `packages/config/src/worker.ts`

### Zmienne środowiskowe

| Zmienna | Kto używa | Domyślna wartość dev/test | Zachowanie w produkcji, gdy brakuje |
| --- | --- | --- | --- |
| `NODE_ENV` | API, worker, config współdzielony | `development` | zostaje wartość domyślna |
| `DATABASE_URL` | runtime API i worker | `postgresql://toprent_app:toprent_app@localhost:5432/toprent` | start kończy się błędem |
| `DATABASE_ADMIN_URL` | skrypty provision i migrate | `postgresql://postgres:postgres@localhost:5432/toprent` | skrypt kończy się błędem |
| `REDIS_URL` | runtime API i worker | `redis://localhost:6379` | start kończy się błędem |
| `CORS_ALLOWED_ORIGINS` | tylko API | `http://localhost:3000` | start kończy się błędem |
| `API_PORT` | tylko API | `3001` | zostaje wartość domyślna |
| `API_PREFIX` | tylko API | `api/v1` | zostaje wartość domyślna |
| `WORKER_NAME` | tylko worker | `toprent-worker` | zostaje wartość domyślna |

### Uwagi runtime

- API normalizuje originy CORS
- requesty bez `Origin` są przepuszczane
- Fastify działa z `trustProxy: false`

## Dwie role bazodanowe

### `admin`

Używana przez:

- `pnpm db:provision`
- `pnpm db:migrate`
- seedowanie po stronie admina w smoke teście write path

Ta rola musi już istnieć i musi umieć ominąć RLS:

- `SUPERUSER`, albo
- `BYPASSRLS`

Dlaczego:

- migracje tworzą funkcje `SECURITY DEFINER`
- te funkcje muszą czytać tabele chronione przez `FORCE ROW LEVEL SECURITY`
- dzieje się to jeszcze zanim powstanie session scope requestu

Skrypty zatrzymują się teraz od razu, jeśli `DATABASE_ADMIN_URL` używa roli, która tego nie potrafi.

### `app`

To ograniczona rola runtime tworzona przez `provision.mjs`.

Ważne flagi:

- `NOSUPERUSER`
- `NOCREATEDB`
- `NOCREATEROLE`
- `NOINHERIT`
- `NOREPLICATION`
- `NOBYPASSRLS`

Dodatkowo:

- `row_security = on`
- grant `CONNECT` na bazę

Gdyby runtime łączył się jako admin zamiast jako app, model bezpieczeństwa straciłby sens.

## Provisioning i migracje

### Kolejność od zera

1. uruchom PostgreSQL
2. ustaw `DATABASE_ADMIN_URL`
3. ustaw `DATABASE_URL`
4. uruchom `pnpm db:provision`
5. uruchom `pnpm db:migrate`

### Co robi `pnpm db:provision`

- czyta admin i runtime connection string
- sprawdza, czy podłączona rola admin ma `SUPERUSER` albo `BYPASSRLS`
- wyciąga nazwę roli runtime, hasło i nazwę bazy
- tworzy albo aktualizuje rolę runtime
- ustawia bezpieczne flagi roli
- włącza `row_security`
- nadaje dostęp `CONNECT` do bazy

### Co robi `pnpm db:migrate`

- łączy się przez admin URL
- sprawdza, czy podłączona rola admin ma `SUPERUSER` albo `BYPASSRLS`
- sprawdza, czy rola runtime istnieje
- pilnuje istnienia `app_migrations`
- czyta migracje SQL po kolei
- podmienia `{{app_role}}` na realną nazwę roli runtime
- uruchamia każdą migrację w osobnej transakcji
- zapisuje nazwę wykonanej migracji

### Po co istnieje `{{app_role}}`

Pliki SQL nie trzymają na sztywno jednej nazwy roli aplikacyjnej. Skrypt migracji wstrzykuje właściwą nazwę dla danego środowiska.

### Po co istnieje `app_migrations`

To dziennik migracji:

- która migracja już weszła
- kiedy weszła

## Redis

`packages/redis/src/client.ts` wystawia dziś małą fabrykę połączenia Redis opartą o `ioredis`.

Obecne zachowanie API:

- loguje błędy połączenia Redis
- łączy się leniwie
- sprawdza gotowość przez `ping()`
- zamyka połączenie przy wyłączaniu aplikacji

## Worker

Worker jest dziś tylko warstwą infrastrukturalną.

On:

1. czyta `REDIS_URL`
2. otwiera Redis
3. wykonuje `ping()`
4. loguje gotowość
5. czeka na sygnały zamknięcia
6. zamyka Redis

Ważne:

- BullMQ jest w zależnościach
- nie ma jeszcze żadnej realnej kolejki biznesowej

## CI

Przy pushu do `main` i przy pull requestach CI wykonuje:

1. checkout
2. setup pnpm
3. setup Node 22
4. `pnpm install --frozen-lockfile`
5. `pnpm db:provision`
6. `pnpm db:migrate`
7. `pnpm lint`
8. `pnpm typecheck`
9. `pnpm test`

Usługi uruchamiane w CI:

- `postgres:17-alpine`
- `redis:8-alpine`

### Dlaczego provision i migrate są przed testami

Bo core zależy od:

- ograniczonej roli aplikacyjnej
- grantów
- helperów SQL w schemacie `app`
- polityk RLS

Bez tego setupu testy nie badałyby prawdziwego fundamentu.

## Strategia testów

### Smoke testy HTTP

Używane dla:

- endpointów health
- zachowania tenant resolvera

Po co:

- walidują pełny stos HTTP
- walidują hooki, filtry, routing i format odpowiedzi

### Smoke testy bezpośrednio na serwisie

Używane głównie dla:

- bezpieczeństwa write path

Po co:

- izolują niskopoziomowy przepływ uprawnień
- nie wymagają jeszcze gotowego endpointu biznesowego

## Czego świadomie jeszcze nie zbudowano

- modułu auth wewnętrznego
- modułu auth klienta
- tabel klientów
- bookingów
- płatności
- publicznego read modelu listingu
- publicznego RLS dla listingu
- endpointów CRUD dla tabel biznesowych
- realnych jobów BullMQ
- realnego użycia `btree_gist`
