# Senior Software Engineering Guide: Multi-Tenant CRM

This document provides a complete, end-to-end breakdown of how this Multi-Tenant CRM project was built from scratch. It explains exactly which files and folders were created first, the exact commands used, why specific architectural choices were made, and how they benefit the system. It demonstrates how a Senior Software Engineer approaches building a secure, scalable, and performant application.

---

## 1. The Starting Point: Workspace & Infrastructure

### What was created first?
Before any business logic was written, the **foundation** was established. 

1. **`pnpm-workspace.yaml` & `package.json` (Root level):**
   - **How:** Running `pnpm init` and creating the workspace file.
   - **Why:** To structure the project as a monorepo. This allows managing both frontend and backend dependencies efficiently from a single root directory without conflicts.

2. **`docker-compose.yml` & `.env.example`:**
   - **How:** Manually created to define the PostgreSQL database service.
   - **Why:** A database is the heart of any CRM. By containerizing PostgreSQL with Docker first, we ensure that every developer works in the exact same environment, eliminating "it works on my machine" issues. 

---

## 2. Database Design & Multi-Tenancy (The Core)

A senior engineer knows that data models must be secure and scalable. 

### How the Database was Created:
1. **`backend/src/database/data-source.ts`:** We configured TypeORM to connect to the Docker PostgreSQL instance.
2. **Migrations (`backend/src/database/migrations/`):** 
   - **How:** We used the CLI command `npx typeorm migration:create src/database/migrations/InitSchema`.
   - **Why:** We intentionally turned off ORM auto-synchronization (`synchronize: false`). Auto-sync is dangerous in production as it can accidentally drop tables. Explicit SQL migrations document the exact state of the database at any point in time.

### Multi-Tenancy Architecture & Integrity:
- **Shared-Table Design:** Instead of creating a separate database for every company, all customers live in a single `customers` table, but every row has an `organization_id`.
- **Database-Level Protection (`1700000000002-AddTenantIntegrityAndQueryIndexes.ts`):** 
  - We added composite foreign keys (e.g., `FOREIGN KEY (assigned_to, organization_id) REFERENCES users(id, organization_id)`).
  - **Benefits:** If a backend bug ever tries to assign a customer to a user from a *different* organization, the PostgreSQL database itself will block the transaction. This is **Defense in Depth**.

### Seeding (`backend/src/database/seeds/seed.ts`):
- **Why:** To make testing easy. The script uses TypeORM repositories to generate "Acme Corp" and "Globex Inc", their admins, and 100 test customers each, proving that isolation works.

---

## 3. Building the Backend (NestJS)

### How the Backend was scaffolded:
- **Command used:** `npx @nestjs/cli new backend --package-manager=pnpm`
- Next, we used Nest CLI commands like `npx nest g resource customers` to automatically generate the Controller, Service, and Module files.

### Why this Architecture?
- **NestJS** forces a strict, Angular-like structure. 
- **Controllers** only handle HTTP requests, routing, and checking DTOs (Data Transfer Objects).
- **Services** handle business logic and database saving.
- **Benefits:** This separation of concerns means you can test business logic without worrying about HTTP, and the codebase remains clean as it scales.

### Security & Authentication (`backend/src/auth/`):
- We implemented JWT (JSON Web Tokens). 
- Upon login, the JWT payload securely stores the user's `organizationId`. 
- **The `@OrgUser()` Decorator:** We created a custom decorator to extract this ID automatically. The frontend *never* sends the organization ID in its payload—the backend trusts only the decoded JWT. This completely prevents cross-tenant data leaks.

---

## 4. Engineering for Concurrency & Performance

### Achieving Concurrency-Safe Assignments (`customers.service.ts`):
**The Problem:** The requirements stated a user can have a maximum of 5 active customers assigned. If two admins assign a customer to the same user at the exact same millisecond, a race condition occurs.
**The Solution:**
- We implemented **Pessimistic Locking** using PostgreSQL Advisory Locks.
- Using a database transaction, we run: `SELECT pg_advisory_xact_lock(...)`. 
- **Benefits:** This locks the user record at the database level for a fraction of a millisecond. It safely counts the existing active customers, assigns the new one, and writes the Activity Log all in one atomic transaction. 

### Achieving Performance (100,000 Customers):
1. **Trigram Indexes (`pg_trgm`):** Standard database indexes fail on partial text searches (`ILIKE '%name%'`). We created a specific migration to add GIN Trigram indexes, making search instantaneous across 100k+ rows.
2. **Preventing N+1 Queries:** When fetching customers, instead of making a separate database query to find the assigned user for *every* customer row, we use TypeORM's `relations: ['assignedUser']` to perform a single `LEFT JOIN` at the SQL level.
3. **Composite Indexes:** Added an index on `(organization_id, created_at DESC)` so that the default dashboard page loads instantly.

### Soft Delete Integrity:
We used TypeORM's `@DeleteDateColumn()`. When a customer is deleted, they remain in the database but are hidden from regular queries. Notes and Activity Logs remain untouched, satisfying the data-retention requirements.

---

## 5. Building the Frontend (Next.js)

### How the Frontend was scaffolded:
- **Command used:** `npx create-next-app@latest frontend`
- **GUI Steps/Prompts answered:** Yes to TypeScript, Yes to Tailwind CSS, Yes to App Router.

### Why this Architecture?
- **Next.js (App Router):** Provides incredibly fast routing and layout management (`app/(dashboard)/layout.tsx`).
- **Tailwind CSS:** Allows rapid, utility-first styling without managing messy CSS files.
- **Zod & React Hook Form:** For strict schema validation before the user submits a form.

### How it Connects to the Backend:
- We used **Axios** combined with **TanStack React Query**.
- An Axios interceptor automatically attaches the JWT (`Bearer <token>`) to every request heading to the NestJS backend API.

### Optimistic Updates & UX (`useCustomers.ts`):
- A hallmark of senior frontend engineering is perceived performance. When an Admin assigns a customer, we do not wait for the backend database to respond. 
- React Query intercepts the mutation, immediately updates the local UI cache (so the dropdown instantly changes), and sends the request in the background. If the request fails, it rolls the UI back.

---

## 6. Docker & Production Readiness

Finally, to make the system deployable, we built the production infrastructure.

### Multi-Stage Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`):
- We did not just copy files into a Node image. We used Multi-Stage Builds.
- **Stage 1:** Install dependencies.
- **Stage 2:** Compile TypeScript to Javascript.
- **Stage 3:** Copy *only* the compiled JS into a lightweight Alpine Linux image.
- **Benefits:** The resulting container is tiny, fast to boot, and highly secure since source code and dev-dependencies are stripped out.

### Continuous Integration (`.github/workflows/ci.yml`):
- We created a GitHub Action that runs `pnpm lint` and `pnpm build` on both frontend and backend automatically on every commit. This ensures no broken code is ever pushed to the main branch.

### API Rate Limiting:
- We added global rate limiting in NestJS (`@nestjs/throttler`) restricting requests to 100 per minute. This protects the backend from brute-force attacks and noisy neighbors, a crucial production improvement.
