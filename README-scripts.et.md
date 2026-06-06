# NKAB-Vault Skriptide Täitmise Järjekord

---

**Language / Keel:** [English](README-scripts.md) | [Eesti](README-scripts.et.md)

**Juhendid / Guides:**
- **Seadistuse juhend / Setup Guide** — [English](README.md) | [Eesti](README.et.md)
- **Skriptide viide / Scripts Reference** — [English](README-scripts.md) | [Eesti](README-scripts.et.md)
- **Testimise juhend / Testing Guide** — [English](README-tests.md) | [Eesti](README-tests.et.md)

---

See juhend annab täpse käskude täitmise järjekorra andmebaasi käivitamiseks, skeemi laadimiseks, algandmete sisestamiseks ja projekti lokaalseks käivitamiseks.

Kõik käsud tuleb käivitada terminalis projekti juurkataloogist.

---

### 1. Käivitage andmebaas (PostgreSQL)
Kõigepealt tuleb käivitada andmebaas Dockeri abil.
```bash
docker compose up -d
```
> **Märkus:** Veenduge, et Docker Desktop (või Dockeri deemon) töötab ja port `5433` on vaba.

### 2. Laadige andmebaasi skeem (Drizzle ORM)
Kui andmebaas on käivitunud, tuleb luua tabelid vastavalt skeemile.
```bash
bunx drizzle-kit push
```

### 3. Sisestage vaikeandmed (Seed)
Kui tabelid on loodud, tuleb andmebaas täita vaikerolli ja -väärtustega:
```bash
bun ./lib/db/seed-defaults.ts
```

### 4. Looge administraatori kasutaja
Looge esimene administraatori kasutaja. Asendage `teie-email@example.com` oma tegeliku e-posti aadressiga, et anda endale superadministraatori õigused.
```bash
bun ./lib/db/seed-admin.ts --email=teie-email@example.com
```

### 5. Hallake andmebaasi (Drizzle Studio)
Kui soovite andmebaasi visuaalselt üle vaadata (vaadata tabeleid, andmeid, kasutajaid), saate käivitada Drizzle Studio. See avab mugava andmebaasi haldusliidese otse brauseris:
```bash
bunx drizzle-kit studio
```
> Vaikimisi on Drizzle Studio kättesaadav aadressil `https://local.drizzle.studio`

### 6. Käivitage arendusserver (Next.js)
Nüüd, kui andmebaas on täielikult seadistatud ja andmetega täidetud, saate rakenduse ise käivitada:
```bash
bun dev
```
Kui soovite käivitada taustal puhastusprotsessi (cleanup worker) samaaegselt rakendusega, kasutage:
```bash
bun run dev:all
```

> Projekt on kättesaadav aadressil [http://localhost:3000](http://localhost:3000)
