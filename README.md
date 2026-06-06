# NKAB-Vault

---

**Language / Keel:** [English](README.md) | [Eesti](README.et.md)

**Guides / Juhendid:**
- **Setup Guide / Seadistuse juhend** — [English](README.md) | [Eesti](README.et.md)
- **Scripts Reference / Skriptide viide** — [English](README-scripts.md) | [Eesti](README-scripts.et.md)
- **Testing Guide / Testimise juhend** — [English](README-tests.md) | [Eesti](README-tests.et.md)

---

A comprehensive guide on how to download, set up, and run the NKAB-Vault project.

## Prerequisites

Before you start, make sure you have the following installed on your machine. If you don't have them, use the links below to download and install them:

- **[Bun](https://bun.sh/)** (Recommended) or **[Node.js](https://nodejs.org/)**: The JavaScript runtime and package manager. This project uses `bun` extensively for fast execution and package management.
- **[Docker](https://www.docker.com/products/docker-desktop/)**: Required to run the PostgreSQL database locally via Docker Compose.
- **[Git](https://git-scm.com/downloads)**: To clone the repository.
- **[Stripe CLI](https://docs.stripe.com/stripe-cli)**: Required for testing local webhooks for payments/subscriptions.

> **What if I don't have Bun or Node?**
> You **must** install at least Node.js to run this Next.js project. However, we highly recommend installing **Bun** since all project scripts are optimized for it. If you use Node, you can swap `bun run` with `npm run` or `npx`, but some scripts like `bun ./lib/db/seed-defaults.ts` will need `tsx` or `ts-node` to run properly with Node.

---

## Installation & Setup

### 1. Download the Project
Clone the repository to your local machine:
```bash
git clone <repository-url>
cd NKAB-Vault
```

### 2. Install Dependencies
Install all required packages using Bun:
```bash
bun install
```
*(If using Node/NPM: `npm install`)*

---

## Environment Variables

You need to create a `.env` file in the root directory of the project. This file will store all the sensitive keys and configuration needed to run the app.

1. In the root of your project, create a file named `.env`.
2. Add the following variables into the `.env` file:

```env
# Database Connection (Matches the docker-compose setup)
DATABASE_URL=postgresql://nkab:123456@localhost:5433/nkab_vault

# Authentication (Better Auth)
# Generate a secret key (can be any long random string)
BETTER_AUTH_SECRET=supersecretkey_supersecretkey_supersecretkey_supersecretkey_supersecretkey
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (For Google Sign-in)
# Get from: https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Resend (For sending emails)
# Get from: https://resend.com/
RESEND_API_KEY=your_resend_api_key
RESEND_FROM="nkab@resend.dev"

# Cloudinary (For image uploads)
# Get from: https://cloudinary.com/
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe (For Payments)
# Get from: https://dashboard.stripe.com/apikeys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
STRIPE_PRO_PRICE_ID=your_stripe_pro_price_id
```

---

## Database Setup

We use Docker to easily spin up a PostgreSQL database.

### 1. Start the Database
Run the following command to start the database container in the background:
```bash
docker compose up -d
```
This will start a Postgres instance on port `5433` using the credentials defined in the `.env` file.

### 2. Push the Schema to the Database
Update the database with the current Drizzle ORM schema:
```bash
bunx drizzle-kit push
```

### 3. Seed the Database
Populate the database with default lookup values (roles, access types, etc.):
```bash
bun ./lib/db/seed-defaults.ts
```

Create an admin user (replace the email with your actual email to grant admin rights):
```bash
bun ./lib/db/seed-admin.ts --email=your-email@example.com
```

---

## Running the Project

### Development Server
To start the Next.js development server:
```bash
bun dev
```
The application will be available at [http://localhost:3000](http://localhost:3000).

### Concurrent Workers & Next.js
To run the Next.js app and the background worker simultaneously:
```bash
bun run dev:all
```

### Stripe Webhooks (Required for Payments)
If you are testing payments or subscriptions, you need to listen for Stripe webhooks locally. 
First, login to Stripe CLI:
```bash
stripe login
```
Then, forward the events to your local server:
```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

---

## Available Pages & Access Control

The application uses role-based access control (RBAC). Here is a breakdown of the available routes and what you can do on them based on your role:

### Public / Guest
These pages are accessible to anyone, even without an account.
- **`/`** - **Home / Landing Page:** View the main feed, trending posts, and general platform info.
- **`/sign-in`**, **`/sign-up`** - **Authentication:** Log in to an existing account or create a new one.
- **`/forgot-password`**, **`/reset-password`** - **Account Recovery:** Restore access to your account.
- **`/[username]`** - **Public Profile:** View a specific user's public profile, their posts, and followers.
- **`/post/[id]`** - **Detailed Post View:** Read a specific post in detail, view its comments, and see its metadata.
- **`/search`** - **Search:** Find posts, tags, or other users.
- **`/rules`**, **`/privacy`**, **`/terms`** - **Legal & Info:** Read the platform's terms of service, privacy policy, and community rules.

### Logged-in User
Requires an active account. Users can do everything a Guest can, plus:
- **`/chat`** - **Chat Hub:** View all your active direct messages and conversations.
- **`/chat/[id]`** - **Direct Messaging:** Chat privately with a specific user in real-time.
- **`/profile`** - **Profile Management:** Edit your personal information, avatar, banner, and account settings.
- **`/new-post`** - **Create Post:** Access the editor to write, format, and publish new content.
- **`/notifications`** - **Alerts:** Check likes, comments, mentions, and system notifications.
- **`/subscription`** - **Billing & Plans:** Manage your premium subscriptions and Stripe payment methods.

### Staff & Moderator
Requires `staff` or `moderator` role. Can do everything a User can, plus:
- **`/staff`** - **Staff Dashboard:** Access internal staff guidelines, tools, and basic platform analytics.
- **`/moderator`** - **Moderator Dashboard:** Review reported posts, handle user disputes, delete inappropriate content, and issue warnings.

### Admin
Requires the `admin` role. Has unrestricted access to the entire platform.
- **`/admin`** - **Admin Dashboard:** Full system control. Manage user roles, ban/unban users, view detailed platform analytics, configure global settings, and oversee all moderation actions.
- **`/banned`** - A special route where banned users are redirected, preventing them from accessing the rest of the application.

---

## Complete Script Reference

Here are all the scripts and commands available in the project:

### Package Scripts (run with `bun run <script>`)
- `dev` - Starts the Next.js development server with Turbopack.
- `dev:all` - Runs both the Next.js server and the cleanup worker.
- `worker` - Runs the standalone background cleanup worker (`bun utils/cleanup-worker.ts`).
- `build` - Builds the application for production.
- `start` - Starts the production server.
- `test` - Runs Jest unit tests.
- `test:e2e` - Runs Playwright end-to-end tests. *(Note: Requires running `bunx playwright install` or `npx playwright install` first to download browsers)*

### Database / Drizzle Commands
- `bunx drizzle-kit studio` - Opens Drizzle Studio (a web UI to view and edit your database).
- `bunx drizzle-kit push` - Pushes schema changes to your database.
- `docker exec nkab-postgres pg_dump -U nkab nkab_vault > dump.sql` - Exports a database dump.
- `cat dump.sql | docker exec -i nkab-postgres psql -U nkab -d nkab_vault` - Imports a database dump.

---

## Useful Links & Resources

Where to get all the third-party tools and API keys:

- **Bun**: [https://bun.sh/](https://bun.sh/)
- **Node.js**: [https://nodejs.org/](https://nodejs.org/)
- **Docker Desktop**: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)
- **PostgreSQL (General info)**: [https://www.postgresql.org/](https://www.postgresql.org/)
- **Google Cloud Console (Google Auth)**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
- **Resend (Email Service)**: [https://resend.com/](https://resend.com/)
- **Cloudinary (Image Hosting)**: [https://cloudinary.com/](https://cloudinary.com/)
- **Stripe (Payments)**: [https://stripe.com/](https://stripe.com/)
- **Stripe CLI**: [https://docs.stripe.com/stripe-cli](https://docs.stripe.com/stripe-cli)
- **Better Auth Documentation**: [https://better-auth.com/](https://better-auth.com/)
- **Drizzle ORM**: [https://orm.drizzle.team/](https://orm.drizzle.team/)

Enjoy building with NKAB-Vault!
