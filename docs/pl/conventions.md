# Konwencje

## Zasady core

- trzymaj moduły małe i nazwane według odpowiedzialności
- unikaj ogólnych folderów typu `helpers`, `misc` albo `shared-stuff`
- frontend nie może być źródłem prawdy biznesowej
- kod ma być zwarty, jawny i łatwy do przeskanowania
- nigdy nie myl `tenant` z `partner`
- preferuj jeden jasny model dostępu zamiast wyjątków per tenant

## Nazewnictwo

- używaj prostych rzeczowników: `health`, `config`, `contracts`, `db`
- utrzymuj przewidywalne nazwy plików: `health.module.ts`, `health.service.ts`
- preferuj krótkie funkcje zamiast dużych klas z wieloma odpowiedzialnościami
- `tenant` oznacza głównego klienta systemu
- `partner` oznacza dostawcę aut działającego wewnątrz tenanta

## Granice

- `web` renderuje UI i wywołuje `api`
- `api` posiada reguły biznesowe
- `worker` posiada wykonanie w tle
- wspólne pakiety mają pozostać lekkie i możliwie niezależne od frameworka

## Zasady runtime

- tożsamość requestu powinna istnieć jeszcze zanim powstanie auth
- każdy błąd API powinien zwracać jeden spójny format odpowiedzi
- `live` oznacza, że proces żyje
- `ready` oznacza, że zależności są osiągalne
- `health` powinien pozostać tani jak liveness
- tylko `ready` powinno bezpośrednio pingować zależności
- request context jest snapshotem aktora, a nie finalnym uprawnieniem zapisu
- snapshot aktora musi wspierać `anonymous`, `internal` i `customer`
- tryb requestu musi być znany zanim ruszy logika biznesowa
- publiczne requesty muszą rozpoznawać tenanta ze zaufanego sygnału hosta po stronie serwera
- nigdy nie czytaj surowego `x-forwarded-host` bezpośrednio w kodzie aplikacji
- nierozpoznany tenant publiczny oznacza wczesne `404`, a nie późniejszą pustą odpowiedź
- requesty wewnętrzne nie mogą brać tenant scope z hosta

## Kierunek dostępu

- platforma może później mieć własnych użytkowników platform-level
- tenanty mogą później mieć własnych użytkowników tenant-level
- partnerzy mogą później mieć własnych użytkowników partner-level
- klienci muszą pozostać poza `users`, `memberships` i rolami wewnętrznymi
- auth klienta używa `email + verification code`, a potem sesji klienta
- kod weryfikacyjny jest dowodem kontroli nad e-mailem, a nie samą sesją
- aktorzy `customer` nie używają ról wewnętrznych
- dostęp do funkcji powinien wynikać z profilu i zakresu, a nie z samego UI
- read path może używać snapshotu request context bezpośrednio
- write path musi używać `DbService.runWriteAction` i świeżego scope rozwiązanego z bazy
- wejściowe `userId` do `runWriteAction` musi pochodzić wyłącznie z zaufanego auth/session state
- wejściowe `userId` do `runWriteAction` nigdy nie może pochodzić z body, query params ani kontrolowanych przez użytkownika parametrów trasy
- dodatkowy round-trip do bazy przy zapisie jest akceptowanym kosztem poprawności
- nigdy nie cache'uj live write scope między requestami
- live scope musi rozwiązywać się względem docelowego tenanta i partnera, a nie tylko `userId`
- zapisy platformy mogą nieść docelowy kontekst tenanta lub partnera dla audytu i scope sesji, mimo że uprawnienia platformy pozostają globalne
- `runWriteAction` dowodzi scope aktora, a nie serializuje zapisów całego tenanta
- jeśli funkcja potrzebuje serializacji na poziomie tenanta albo zasobu, musi jawnie zablokować ten zasób we własnej transakcji
- callbacki zapisu, które oczekują ścisłej liczby zmienionych wierszy, powinny używać `db.expectMutation(...)` zamiast cicho akceptować `0` affected rows
- RLS jest właścicielem izolacji tenantów i partnerów, a nie filtry frontendowe ani przypadkowe `if` w kodzie
- wewnętrzny core używa stałych profili: `platform`, `tenant`, `partner`
- rekordy partnerów i partnerowe membershipy są domyślnie zarządzane przez `platform`
- jeśli partner management zostanie później włączony dla tenanta, powinno to nastąpić jednym backendowym przełącznikiem dla tego tenanta, a nie przez twarde wyjątki
- dostęp klienta musi być oparty o tożsamość, a nie role membership
- przyszła publiczna logika listingu potrzebuje własnej publicznej polityki RLS i własnego bezpiecznego read modelu
