# NKAB-Vault

*Loe seda teistes keeltes: [English](README.md), [Eesti](README.et.md)*

Põhjalik juhend NKAB-Vault projekti allalaadimiseks, seadistamiseks ja käivitamiseks.

## Eeltingimused

Enne alustamist veenduge, et Teie arvutisse on installitud järgmised programmid. Kui Teil neid pole, kasutage allalaadimiseks ja installimiseks allolevaid linke:

- **[Bun](https://bun.sh/)** (Soovitatav) või **[Node.js](https://nodejs.org/)**: JavaScripti käituskeskkond ja paketikaldur. See projekt kasutab laialdaselt `bun`'i kiireks käivitamiseks ja pakettide haldamiseks.
- **[Docker](https://www.docker.com/products/docker-desktop/)**: Vajalik PostgreSQL andmebaasi lokaalseks käivitamiseks Docker Compose'i abil.
- **[Git](https://git-scm.com/downloads)**: Repositooriumi kloonimiseks.
- **[Stripe CLI](https://docs.stripe.com/stripe-cli)**: Vajalik maksete/tellimuste lokaalsete webhook'ide testimiseks.

> **Mida teha, kui mul ei ole Bun'i ega Node'i?**
> Selle Next.js projekti käivitamiseks **peate** installima vähemalt Node.js'i. Kuid soovitame tungivalt installida **Bun**'i, kuna kõik projekti skriptid on selle jaoks optimeeritud. Kui kasutate Node'i, võite asendada `bun run` käskudega `npm run` või `npx`, kuid mõned skriptid, nagu `bun ./lib/db/seed-defaults.ts`, vajavad Node'iga õigeks käivitamiseks `tsx`'i või `ts-node`'i.

---

## Installimine ja seadistamine

### 1. Laadige projekt alla
Kloonige repositoorium oma arvutisse:
```bash
git clone <repository-url>
cd NKAB-Vault
```

### 2. Installige sõltuvused
Installige kõik vajalikud paketid, kasutades Bun'i:
```bash
bun install
```
*(Kui kasutate Node/NPM-i: `npm install`)*

---

## Keskkonnamuutujad (Environment Variables)

Projekti juurkataloogi on vaja luua `.env` fail. Selles failis hoitakse kõiki tundlikke võtmeid ja konfiguratsioone, mida rakendus vajab töötamiseks.

1. Looge oma projekti juurkataloogi fail nimega `.env`.
2. Lisage `.env` faili järgmised muutujad:

```env
# Andmebaasi ühendus (Kattub docker-compose seadistusega)
DATABASE_URL=postgresql://nkab:123456@localhost:5433/nkab_vault

# Autentimine (Better Auth)
# Looge salajane võti (võib olla mis tahes pikk suvaline string)
BETTER_AUTH_SECRET=supersecretkey_supersecretkey_supersecretkey_supersecretkey_supersecretkey
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (Google'iga sisselogimiseks)
# Saate aadressilt: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=teie_google_client_id
GOOGLE_CLIENT_SECRET=teie_google_client_secret

# Resend (E-kirjade saatmiseks)
# Saate aadressilt: https://resend.com/
RESEND_API_KEY=teie_resend_api_key
RESEND_FROM="nkab@resend.dev"

# Cloudinary (Piltide üleslaadimiseks)
# Saate aadressilt: https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=teie_cloud_name
CLOUDINARY_API_KEY=teie_api_key
CLOUDINARY_API_SECRET=teie_api_secret

# Stripe (Maksete jaoks)
# Saate aadressilt: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=teie_stripe_publishable_key
STRIPE_SECRET_KEY=teie_stripe_secret_key
STRIPE_WEBHOOK_SECRET=teie_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=teie_stripe_pro_price_id
```

---

## Andmebaasi seadistamine

Kasutame Dockerit, et lihtsalt luua PostgreSQL andmebaas.

### 1. Käivitage andmebaas
Käivitage järgmine käsk andmebaasi konteineri taustal käivitamiseks:
```bash
docker compose up -d
```
See käivitab Postgresi instantsi pordil `5433`, kasutades `.env` failis määratletud mandaate.

### 2. Lükake skeem andmebaasi
Uuendage andmebaasi praeguse Drizzle ORM skeemiga:
```bash
bunx drizzle-kit push
```

### 3. Asustage andmebaas andmetega (Seed)
Täitke andmebaas vaikeväärtustega (rollid, juurdepääsutüübid jne):
```bash
bun ./lib/db/seed-defaults.ts
```

Looge administraatori kasutaja (asendage e-posti aadress oma tegeliku aadressiga, et anda administraatori õigused):
```bash
bun ./lib/db/seed-admin.ts --email=teie-email@example.com
```

---

## Projekti käivitamine

### Arendusserver (Development Server)
Next.js arendusserveri käivitamiseks:
```bash
bun dev
```
Rakendus on kättesaadav aadressil [http://localhost:3000](http://localhost:3000).

### Samaaegsed taustaprotsessid (Workers) ja Next.js
Next.js rakenduse ja taustal töötava puhastusprotsessi (cleanup worker) üheaegseks käivitamiseks:
```bash
bun run dev:all
```

### Stripe Webhooks (Vajalik maksete tegemiseks)
Kui testite makseid või tellimusi, peate Stripe webhooke kuulama lokaalselt. 
Kõigepealt logige sisse Stripe CLI-sse:
```bash
stripe login
```
Seejärel suunake sündmused oma lokaalsesse serverisse:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

---

## Saadaolevad lehed ja juurdepääs (Access Control)

Rakendus kasutab rollipõhist juurdepääsukontrolli (RBAC). Allpool on toodud ülevaade saadaolevatest marsruutidest ja tegevustest vastavalt kasutaja rollile:

### Avalik / Külaline (Guest)
Need lehed on kättesaadavad kõigile, isegi ilma kontota.
- **`/`** - **Kodu / Maandumisleht:** Saate vaadata peamist voogu, populaarseid postitusi ja üldist platvormi teavet.
- **`/sign-in`**, **`/sign-up`** - **Autentimine:** Saate sisse logida olemasolevale kontole või luua uue.
- **`/forgot-password`**, **`/reset-password`** - **Konto taastamine:** Saate taastada juurdepääsu oma kontole.
- **`/[username]`** - **Avalik profiil:** Saate vaadata teise kasutaja avalikku profiili, tema postitusi ja jälgijaid.
- **`/post/[id]`** - **Postituse detailvaade:** Saate lugeda konkreetset postitust üksikasjalikult, näha selle kommentaare ja metaandmeid.
- **`/search`** - **Otsing:** Saate otsida postitusi, silte (täge) või teisi kasutajaid.
- **`/rules`**, **`/privacy`**, **`/terms`** - **Juriidiline ja info:** Saate lugeda platvormi teenusetingimusi, privaatsuspoliitikat ja kogukonna reegleid.

### Sisselogitud kasutaja
Nõuab aktiivset kontot. Kasutajad saavad teha kõike seda, mida külaline, ja lisaks:
- **`/chat`** - **Vestluste keskus:** Saate näha kõiki oma aktiivseid otsesõnumeid ja vestlusi.
- **`/chat/[id]`** - **Otsesõnumid:** Saate reaalajas privaatselt vestelda konkreetse kasutajaga.
- **`/profile`** - **Profiili haldamine:** Saate muuta oma isikuandmeid, avatari, bännerit ja konto seadeid.
- **`/new-post`** - **Uue postituse loomine:** Saate juurdepääsu redaktorile uue sisu kirjutamiseks, vormindamiseks ja avaldamiseks.
- **`/notifications`** - **Teavitused:** Saate kontrollida meeldimisi, kommentaare, mainimisi ja süsteemiteavitusi.
- **`/subscription`** - **Arveldus ja plaanid:** Saate hallata oma tasulisi tellimusi ja Stripe'i maksemeetodeid.

### Töötaja (Staff) ja Moderaator
Nõuab `staff` või `moderator` rolli. Saavad teha kõike seda, mida tavakasutaja, ja lisaks:
- **`/staff`** - **Töötaja töölaud:** Saate juurdepääsu sisemistele töötajate juhistele, tööriistadele ja esmasele platvormi analüütikale.
- **`/moderator`** - **Moderaatori töölaud:** Saate üle vaadata raporteeritud postitusi, lahendada kasutajate vaidlusi, kustutada sobimatut sisu ja väljastada hoiatusi.

### Administraator
Nõuab `admin` rolli. Omab piiramatut juurdepääsu kogu platvormile.
- **`/admin`** - **Administraatori töölaud:** Täielik süsteemi kontroll. Saate hallata kasutajate rolle, kasutajaid blokeerida (ban) ja blokeeringuid eemaldada, vaadata üksikasjalikku platvormi analüütikat, konfigureerida globaalseid seadeid ja teostada järelevalvet kõigi modereerimistegevuste üle.
- **`/banned`** - Spetsiaalne marsruut, kuhu suunatakse blokeeritud kasutajad, takistades neil juurdepääsu ülejäänud rakendusele.

---

## Täielik skriptide viide

Siin on kõik projektis saadaolevad skriptid ja käsud:

### Paketi skriptid (käivitage käskudega `bun run <script>`)
- `dev` - Käivitab Next.js arendusserveri Turbopackiga.
- `dev:all` - Käivitab nii Next.js serveri kui ka taustal puhastusprotsessi (cleanup worker).
- `worker` - Käivitab iseseisva taustal puhastusprotsessi (`bun utils/cleanup-worker.ts`).
- `build` - Ehitab rakenduse tootmiskeskkonna jaoks (production).
- `start` - Käivitab tootmiskeskkonna serveri.
- `test` - Käivitab Jesti ühikutestid (unit tests).
- `test:e2e` - Käivitab Playwright'i end-to-end testid.

### Andmebaasi / Drizzle käsud
- `bunx drizzle-kit studio` - Avab Drizzle Studio (veebiliides andmebaasi vaatamiseks ja muutmiseks).
- `bunx drizzle-kit push` - Lükkab skeemi muudatused andmebaasi.
- `docker exec nkab-postgres pg_dump -U nkab nkab_vault > dump.sql` - Ekspordib andmebaasi varukoopia (dump).
- `cat dump.sql | docker exec -i nkab-postgres psql -U nkab -d nkab_vault` - Impordib andmebaasi varukoopia (dump).

---

## Kasulikud lingid ja ressursid

Kust saada kõik kolmanda osapoole tööriistad ja API võtmed:

- **Bun**: [https://bun.sh/](https://bun.sh/)
- **Node.js**: [https://nodejs.org/](https://nodejs.org/)
- **Docker Desktop**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL (Üldinfo)**: [https://www.postgresql.org/](https://www.postgresql.org/)
- **Google Cloud Console (Google Auth)**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- **Resend (E-posti teenus)**: [https://resend.com/](https://resend.com/)
- **Cloudinary (Piltide majutamine)**: [https://cloudinary.com/](https://cloudinary.com/)
- **Stripe (Maksed)**: [https://stripe.com/](https://stripe.com/)
- **Stripe CLI**: [https://docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli)
- **Better Auth Dokumentatsioon**: [https://better-auth.com/](https://better-auth.com/)
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)

Nautige ehitamist NKAB-Vaultiga!
