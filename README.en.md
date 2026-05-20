# NKAB-Vault

*Read this in other languages: [English](README.en.md), [Eesti](README.md)*

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

## Available Pages / Navigation

Once the app is running, you can visit the following key routes:

- **`/`** - Home / Landing Page
- **`/sign-in`** & **`/sign-up`** - Authentication pages
- **`/chat`** - Real-time chat interface
- **`/profile`** - User profile management
- **`/admin`** - Admin dashboard (Requires admin role)
- **`/staff`** & **`/moderator`** - Role-specific dashboards
- **`/new-post`** - Create new content
- **`/notifications`** - View user alerts
- **`/subscription`** - Manage billing and Stripe plans
- **`/search`** - Search functionality
- **`/rules`**, **`/privacy`**, **`/terms`** - Legal and platform information

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
- `test:e2e` - Runs Playwright end-to-end tests.

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
