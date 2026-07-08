Przeprowadz bardzo krytyczny audyt tego projektu, ale tylko w trybie read-only.

To jest audyt rdzenia systemu wypozyczalni samochodow. Nie interesuje mnie mily feedback ani pochwały. Interesuja mnie realne defekty, ryzyka architektoniczne, niespojnosci, martwy kod, zbedne elementy, ukryte zaleznosci i decyzje, ktore pozniej moga bolec przy rozwoju systemu.

Kontekst projektu:

- to jest foundation core pod system wypozyczalni samochodow
- architektura ma byc gotowa pod `platform`, `tenant`, `partner`
- w przyszlosci backend ma moc obslugiwac cudze strony jako osobny produkt
- customer ma byc osobnym aktorem, nie `user` wewnetrznym
- backend ma byc jedynym zrodlem prawdy
- PostgreSQL + RLS sa czescia kluczowego modelu bezpieczenstwa
- projekt ma byc bardzo czysty, semantyczny, kompaktowy i bez smieci

Chce, zebys analizowal tylko to, co wynika z kodu i plikow. Nie zakladaj, ze cos "na pewno jest gdzies indziej", jesli nie widzisz tego w paczce.

Zasady analizy:

1. Bądz maksymalnie krytyczny i konkretny.
2. Rozdziel:
   - realne defekty
   - ryzyka architektoniczne
   - martwy kod / zbedne elementy
   - niespojnosci semantyczne
   - rzeczy tylko do przyszlego doprecyzowania
3. Nie mieszaj "to moze byc przydatne kiedys" z realnym bledem.
4. Jesli cos jest tylko preferencja stylu, oznacz to jako niski priorytet.
5. Jesli cos jest faktycznym zagrozeniem dla bezpieczenstwa, izolacji tenantow, RLS, auth, albo spojnosc danych, oznacz to wysoko.
6. Jesli czegos nie da sie potwierdzic z kodu, napisz to wprost jako `niezweryfikowane zalozenie`.
7. Nie proponuj przepisywania calego projektu dla zasady. Szukaj realnych problemow.

Sprawdz szczegolnie:

- czy architektura core jest rzeczywiscie gotowa pod `platform -> tenant -> partner`
- czy customer jest dobrze odseparowany od wewnetrznych `users` i `memberships`
- czy model `user / membership / role` jest spójny i bezpieczny
- czy RLS faktycznie broni izolacji danych i nie jest tylko pozorna warstwa
- czy runtime role DB i admin role DB sa dobrze rozdzielone
- czy istnieja miejsca, gdzie mozna przypadkiem ominac scope lub RLS
- czy sa niespojnosci miedzy politykami bazy a logika aplikacji
- czy env, CI, migracje i provisioning sa dobrze ustawione
- czy sa martwe eksporty, puste pliki, pseudo-abstrakcje albo nadmiarowe warstwy
- czy kod jest rzeczywiscie prosty i semantyczny, czy tylko wyglada na uporzadkowany
- czy sa miejsca, gdzie przyszle funkcje typu bookings, customer auth, partner panel, multi-tenant SaaS moga wymusic bolesna przebudowe core

Forma odpowiedzi:

- Najpierw wypisz `Findings` od najwazniejszych do najmniej waznych.
- Kazdy finding musi miec:
  - priorytet: `HIGH`, `MEDIUM` albo `LOW`
  - plik i linie, jesli da sie wskazac
  - krotkie wyjasnienie, dlaczego to jest problem
  - co realnie moze sie przez to zepsuc
- Potem podaj:
  - `Open Questions`
  - `What Is Solid`
  - `Potential Overengineering`
  - `Potential Underengineering`

Jesli uznasz, ze cos jest dobre, napisz to krotko i technicznie. Nie rozwlekaj pochwal.

Najwazniejsze:

- nie oszczedzaj projektu
- nie zakladaj dobrej woli kodu
- nie daj sie zwiesc dokumentacji, jesli kod robi cos innego
- oceniaj przede wszystkim po kodzie, migracjach i realnych zaleznosciach
