# Model domenowy

## Główne poziomy

### Platform

Platforma to cały produkt, który posiadasz.

Zawiera:

- backend
- publiczną stronę
- przyszłe narzędzia administracyjne
- przyszłe narzędzia partnera

### Tenant

Tenant to wypożyczalnia korzystająca z Twojego systemu.

Przykłady:

- dziś: Twoja własna wypożyczalnia
- później: inna firma używająca Twojego backendu na swojej stronie

Tenant posiada:

- własne użycie backendu na stronie
- własne bookingi
- własne auta
- własne ceny
- własne ustawienia

### Partner

Partner nie jest innym tenantem.

Partner działa wewnątrz tenanta i dostarcza auta albo zarządza częścią jego floty.

Przykłady:

- dziś: dostawca dodający auta do Twojej publicznej strony
- później: dostawca działający tylko w obrębie jednego tenant scope

## Obecna reguła biznesowa

- dostęp wewnętrzny jest stały według profilu, a nie według flag per tenant
- `platform` widzi wszystkie dane i może zrobić wszystko
- `tenant` widzi i zarządza własną wypożyczalnią
- `partner` będzie później widział i zarządzał tylko własnymi danymi partner scope wewnątrz tenanta
- tworzenie rekordów partnera domyślnie jest tylko dla `platform`
- tworzenie partnerowych membershipów domyślnie też jest tylko dla `platform`
- przyszły przełącznik tenant-level partner management powinien włączać tę możliwość jawnie dla wybranego tenanta

