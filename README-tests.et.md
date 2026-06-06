# NKAB-Vault Testimise Juhend

---

**Language / Keel:** [English](README-tests.md) | [Eesti](README-tests.et.md)

**Juhendid / Guides:**
- **Seadistuse juhend** — [English](README.md) | [Eesti](README.et.md)
- **Skriptide viide** — [English](README-scripts.md) | [Eesti](README-scripts.et.md)
- **Testimise juhend** — [English](README-tests.md) | [Eesti](README-tests.et.md)

---

See dokument annab ülevaate NKAB-Vault projekti testimise infrastruktuurist, meetoditest ja kaetusest.

## Testimise stack

Kasutame kaasaegset ja töökindlat testimise stacki, et tagada koodimineku kvaliteet ja vältida regressioone:

- **[Jest](https://jestjs.io/)**: Meie peamine testirakendus ühiku- ja integratsioonitestimiseks. See tagab kiire ja töökindla keskkonna utiliitfunktsioonide, API marsruutide ja põhilise äriloogika testimiseks.
- **[Playwright](https://playwright.dev/)**: Kasutatakse End-to-End (E2E) testimiseks. Võimaldab simuleerida päris kasutajate toiminguid brauseri keskkonnas, et veenduda, et kogu süsteem töötab koos tõrgeteta.
- **[Bun](https://bun.sh/)**: Meie kiire JavaScripti käituskeskkond ja paketihaldur, mis suudab teste kiiresti käivitada.

## Testide kaetus

Meie praegune testide kaetus on suurepärane, tagades suure usaldusväärsuse koodibaasiüle.

- **Üldine kaetus**: ~92%
- **Avaldused (Statements)**: 91.17%
- **Read (Lines)**: 91.79%
- **Funktsioonid (Functions)**: 91.58%
- **Harundid (Branches)**: 75.24%

*Märkus: Ajakohase kaetuse aruande saate igal ajal genereerida käsuga `bunx jest --coverage`.*

## Saadaolevad skriptid

Järgmised npm/bun skriptid on konfigureeritud `package.json`-is, et aidata teil teste hõlpsasti käivitada:

### Ühiku- ja integratsioonitestid (Jest)
- `bun run test` — Käivitab standardse Jesti testikomplekti üks kord.
- `bun run test:watch` — Käivitab Jesti vaatamisrežiimis (watch mode), uuesti käivitades teste automaatselt failide muutmisel. Kasulik aktiivse arenduse ajal.
- `bunx jest --coverage` — Käivitab testid ja genereerib üksikasjaliku kaetuse aruande terminalis.

### End-to-End testid (Playwright)
> **Oluline:** Enne E2E testide esmakordset käivitamist peate installima nõutavad Playwright'i brauserid käsuga `bunx playwright install` (või `npx playwright install`).

- `bun run test:e2e` — Käivitab kõik Playwright'i E2E testid pea-vabas (headless) režiimis.
- `bun run test:e2e:ui` — Avab Playwright'i kasutajaliidese (UI) režiimi, mis pakub visuaalse liidese E2E testide uurimiseks, käivitamiseks ja silumiseks.

## Testimise meetodid

Kasutame mitmekihilist testimise strateegiat:

1. **Ühikutestimine (Unit Testing)**: Testime üksikuid funktsioone ja komponente eraldiseisvalt (nt utiliitfunktsioonid, vormindajad).
2. **Integratsioonitestimine (Integration Testing)**: Testime, kuidas erinevad süsteemi osad omavahel toimivad, keskendudes eelkõige Next.js API marsruutidele, andmebaasi operatsioonidele (Drizzle ORM) ja autentimisvoogudele.
3. **End-to-End (E2E) Testimine**: Testime kriitilisi kasutajaretki lõppkasutaja vaatenurgast päris brauseris Playwright'i abil, veendudes, et frontend ja backend on õigesti integreeritud.

## Testide kirjutamine

- Ühiku- ja integratsioonitestid peaksid olema paigutatud kataloogi `tests/`, peegeldades `app/` ja `lib/` kaustade struktuuri.
- Kasutage testifailide nimede konventsioonina `*.test.ts` või `*.spec.ts`.
- E2E testid on tavaliselt konfigureeritud failis `playwright.config.ts` ja asuvad oma määratud kataloogis (sageli `tests-e2e/` või sarnane — kontrollige Playwright'i konfiguratsiooni).
