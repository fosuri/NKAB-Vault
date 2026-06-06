# NKAB-Vault Scripts Execution Order

---

**Language / Keel:** [English](README-scripts.md) | [Eesti](README-scripts.et.md)

**Guides / Juhendid:**
- **Setup Guide** — [English](README.md) | [Eesti](README.et.md)
- **Scripts Reference** — [English](README-scripts.md) | [Eesti](README-scripts.et.md)
- **Testing Guide** — [English](README-tests.md) | [Eesti](README-tests.et.md)

---

This guide provides the exact execution order of commands needed to spin up the database, push the schema, seed the initial data, and run the project locally.

All commands must be executed in your terminal from the root directory of the project.

---

### 1. Start the Database (PostgreSQL)
First, you need to bring up the database using Docker.
```bash
docker compose up -d
```
> **Note:** Make sure Docker Desktop (or the Docker daemon) is running, and port `5433` is available.

### 2. Push the Database Schema (Drizzle ORM)
Once the database is up and running, you need to create the tables based on your schema.
```bash
bunx drizzle-kit push
```

### 3. Seed Default Data
After the tables are ready, you must populate the database with default roles and baseline values:
```bash
bun ./lib/db/seed-defaults.ts
```

### 4. Create an Admin User
Create your first admin user. Make sure to replace `your-email@example.com` with your actual email address to grant yourself superuser privileges.
```bash
bun ./lib/db/seed-admin.ts --email=your-email@example.com
```

### 5. Manage the Database (Drizzle Studio)
If you need to visually inspect your database (view tables, data, users), you can launch Drizzle Studio. This will open a convenient database administration UI directly in your browser:
```bash
bunx drizzle-kit studio
```
> By default, Drizzle Studio will be available at `https://local.drizzle.studio`

### 6. Start the Development Server (Next.js)
Now that the database is fully configured and seeded, you can run the application itself:
```bash
bun dev
```
If you want to run the background cleanup worker simultaneously with the application, use:
```bash
bun run dev:all
```

> The project will be accessible at [http://localhost:3000](http://localhost:3000)
