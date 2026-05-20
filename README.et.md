# NKAB-Vault 🚀

Põhjalik juhend NKAB-Vault projekti allalaadimiseks, seadistamiseks ja käivitamiseks.

## 📋 Eeltingimused

Enne alustamist veendu, et sinu arvutisse on installitud järgmised programmid. Kui sul neid pole, kasuta allalaadimiseks ja installimiseks allolevaid linke:

- **[Bun](https://bun.sh/)** (Soovitatav) või **[Node.js](https://nodejs.org/)**: JavaScripti käituskeskkond ja paketikaldur. See projekt kasutab laialdaselt `bun`'i kiireks käivitamiseks ja pakettide haldamiseks.
- **[Docker](https://www.docker.com/products/docker-desktop/)**: Vajalik PostgreSQL andmebaasi lokaalseks käivitamiseks Docker Compose'i abil.
- **[Git](https://git-scm.com/downloads)**: Repositooriumi kloonimiseks.
- **[Stripe CLI](https://docs.stripe.com/stripe-cli)**: Vajalik maksete/tellimuste lokaalsete webhook'ide testimiseks.

> **Mida teha, kui mul ei ole Bun'i ega Node'i?**
> Selle Next.js projekti käivitamiseks **pead** installima vähemalt Node.js'i. Kuid soovitame tungivalt installida **Bun**'i, kuna kõik projekti skriptid on selle jaoks optimeeritud. Kui kasutad Node'i, võid asendada `bun run` käskudega `npm run` või `npx`, kuid mõned skriptid, nagu `bun ./lib/db/seed-defaults.ts`, vajavad Node'iga õigeks käivitamiseks `tsx`'i või `ts-node`'i.

---

## 🛠️ Installimine ja seadistamine

### 1. Laadi projekt alla
Klooni repositoorium oma arvutisse:
```bash
git clone <repository-url>
cd NKAB-Vault
```

### 2. Installi sõltuvused
Installi kõik vajalikud paketid, kasutades Bun'i:
```bash
bun install
```
*(Kui kasutad Node/NPM-i: `npm install`)*

---

## ⚙️ Keskkonnamuutujad (Environment Variables)

Projekti juurkataloogi on vaja luua `.env` fail. Selles failis hoitakse kõiki tundlikke võtmeid ja konfiguratsioone, mida rakendus vajab töötamiseks.

1. Loo oma projekti juurkataloogi fail nimega `.env`.
2. Lisa `.env` faili järgmised muutujad:

```env
# Andmebaasi ühendus (Kattub docker-compose seadistusega)
DATABASE_URL=postgresql://nkab:123456@localhost:5433/nkab_vault

# Autentimine (Better Auth)
# Loo salajane võti (võib olla mis tahes pikk suvaline string)
BETTER_AUTH_SECRET=supersecretkey_supersecretkey_supersecretkey_supersecretkey_supersecretkey
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (Google'iga sisselogimiseks)
# Saad aadressilt: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=sinu_google_client_id
GOOGLE_CLIENT_SECRET=sinu_google_client_secret

# Resend (E-kirjade saatmiseks)
# Saad aadressilt: https://resend.com/
RESEND_API_KEY=sinu_resend_api_key
RESEND_FROM="nkab@resend.dev"

# Cloudinary (Piltide üleslaadimiseks)
# Saad aadressilt: https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=sinu_cloud_name
CLOUDINARY_API_KEY=sinu_api_key
CLOUDINARY_API_SECRET=sinu_api_secret
```

---

## 🗄️ Andmebaasi seadistamine

Kasutame Dockerit, et lihtsalt luua PostgreSQL andmebaas.

### 1. Käivita andmebaas
Käivita järgmine käsk andmebaasi konteineri taustal käivitamiseks:
```bash
docker compose up -d
```
See käivitab Postgresi instantsi pordil `5433`, kasutades `.env` failis määratletud mandaate.

### 2. Lükka skeem andmebaasi
Päevita andmebaas praeguse Drizzle ORM skeemiga:
```bash
bunx drizzle-kit push
```

### 3. Asusta andmebaas andmetega (Seed)
Täida andmebaas vaikeväärtustega (rollid, juurdepääsutüübid jne):
```bash
bun ./lib/db/seed-defaults.ts
```

Loo administraatori kasutaja (asenda e-posti aadress oma tegeliku aadressiga, et anda administraatori õigused):
```bash
bun ./lib/db/seed-admin.ts --email=sinu-email@example.com
```

---

## 🚀 Projekti käivitamine

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
Kui testid makseid või tellimusi, pead Stripe webhooke kuulama lokaalselt. 
Kõigepealt logi sisse Stripe CLI-sse:
```bash
stripe login
```
Seejärel suuna sündmused oma lokaalsesse serverisse:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

---

## 🗺️ Saadaolevad lehed / Navigeerimine

Kui rakendus töötab, saad külastada järgmisi peamisi marsruute:

- **`/`** - Kodu / Maandumisleht
- **`/sign-in`** & **`/sign-up`** - Autentimise lehed (Sisselogimine ja registreerimine)
- **`/chat`** - Reaalajas vestluse (chat) liides
- **`/profile`** - Kasutajaprofiili haldamine
- **`/admin`** - Administraatori töölaud (Nõuab administraatori rolli)
- **`/staff`** & **`/moderator`** - Rollikohased töölauad
- **`/new-post`** - Uue sisu loomine
- **`/notifications`** - Kasutaja teavituste vaatamine
- **`/subscription`** - Arvelduse ja Stripe'i plaanide haldamine
- **`/search`** - Otsingufunktsioon
- **`/rules`**, **`/privacy`**, **`/terms`** - Juriidiline ja platvormi puudutav info

---

## 📜 Täielik skriptide viide

Siin on kõik projektis saadaolevad skriptid ja käsud:

### Paketi skriptid (käivita käskudega `bun run <script>`)
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

## 🔗 Kasulikud lingid ja ressursid

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

Nautige ehitamist NKAB-Vaultiga! 🎉
