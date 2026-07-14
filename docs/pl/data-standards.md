# Standardy danych

Te zasady obowiązują jeszcze przed pierwszą tabelą.

## Tożsamość

- wszystkie główne rekordy biznesowe będą używały `uuid`
- frontend nigdy nie wyznacza prawdy o identyfikatorach

## Publiczne identyfikatory

- slugi zapisane w bazie powinny być małymi literami i nadawać się do URL
- publiczne identyfikatory nie powinny polegać na dopasowaniu zależnym od wielkości liter

## E-mail

- e-maile użytkowników wewnętrznych powinny być zapisywane już po normalizacji
- obecny core trzyma je małymi literami i bez zbędnych spacji

## Czas

- czas zapisujemy w UTC
- w PostgreSQL docelowo używamy `timestamptz`

## Pieniądze

- kwoty zapisujemy jako integer w najmniejszej jednostce, na przykład grosze
- nigdy nie zapisujemy pieniędzy jako `float`
- waluta powinna być osobnym polem, na przykład `currency = PLN`

## Zakres tenanta

- każda przyszła tabela biznesowa ma być gotowa na `tenant_id`
- partner zawsze należy do konkretnego tenanta
- dane tenantów nie mogą się mieszać ani przez frontend, ani przez backend

## Pola statusu

- statusy mają być krótkie, przewidywalne i zapisane w `snake_case`
- status ma opisywać stan biznesowy, a nie stan widoku

## Źródło prawdy

- backend jest jedynym źródłem prawdy
- frontend może wysyłać wybory, ale nie może narzucać cen, statusów ani dostępności
