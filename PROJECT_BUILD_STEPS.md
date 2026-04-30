# Comprehensive Step-by-Step Build Guide

This document explains the exhaustive, step-by-step process of how this project was built from a completely empty folder to its final production-ready state. It includes all terminal commands, CLI interactive prompts (GUI steps), and architectural wiring.

---

## Phase 1: Root Workspace Initialization

We structured this as a monorepo using `pnpm` workspaces to manage both frontend and backend dependencies efficiently.

**Steps:**
1. **Create the Root Folder:**
   ```bash
   mkdir multi-tenant-crm
   cd multi-tenant-crm
   ```
2. **Initialize NPM:**
   ```bash
   pnpm init
   ```
3. **Configure the Workspace:**
   Created a `pnpm-workspace.yaml` file to tell `pnpm` where the projects live.
   ```yaml
   packages:
     - backend
     - frontend
   ```

---

## Phase 2: Backend Scaffolding (NestJS)

**1. Generate the NestJS Application:**
We used the official NestJS CLI to scaffold the backend structure.
```bash
npx @nestjs/cli new backend --package-manager=pnpm
```
*CLI Output/Prompts:* The CLI automatically created the `src`, `test`, and configuration files inside the `backend/` folder.

**2. Install Backend Dependencies:**
Navigated into the backend folder and installed necessary libraries for Database, Authentication, and Validation:
```bash
cd backend

# Database
pnpm add @nestjs/typeorm typeorm pg

# Security & Auth
pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
pnpm add -D @types/passport-jwt @types/bcrypt

# Validation
pnpm add class-validator class-transformer

# Rate Limiting & Swagger (Production Requirements)
pnpm add @nestjs/throttler @nestjs/swagger swagger-ui-express
```

**3. Generate Domain Modules:**
Using the Nest CLI, we automatically generated the boilerplate (Controllers, Services, Modules) for our business domains. When running `resource`, the CLI asks interactive GUI-like prompts:
```bash
npx nest g module database
npx nest g module auth

# For the following, the CLI asks: "What transport layer do you use?" -> Selected "REST API"
# "Would you like to generate CRUD entry points?" -> Selected "Yes"
npx nest g resource users
npx nest g resource customers
npx nest g resource notes
npx nest g resource organizations
npx nest g resource activity
```

---

## Phase 3: Database & Docker Setup

Before writing business logic, the database environment had to be established.

**1. Create Docker Compose:**
At the root level, we created `docker-compose.yml` to define a PostgreSQL 16 container, setting environment variables for user, password, and DB name.

**2. TypeORM Data Source:**
Created `backend/src/database/data-source.ts` to tell TypeORM how to connect to the Postgres database using credentials from `.env`.

**3. Writing the Migrations:**
Instead of letting TypeORM auto-sync the database (which is bad practice in production), we generated explicit migration files:
```bash
npx typeorm migration:create src/database/migrations/InitSchema
npx typeorm migration:create src/database/migrations/AddTrigramSearchIndexes
npx typeorm migration:create src/database/migrations/AddTenantIntegrityAndQueryIndexes
```
*Inside these files*, we wrote pure SQL to create tables, enforce `organization_id` foreign keys, and create custom indexes (like `pg_trgm` for fast search).

**4. Running Migrations:**
```bash
pnpm run migration:run
```

**5. Seeding the Database:**
Created `backend/src/database/seeds/seed.ts` to programmatically insert "Acme Corp" and "Globex Inc", their Admin/Member users, and 100 test customers each.

---

## Phase 4: Frontend Scaffolding (Next.js)

**1. Generate the Next.js Application:**
From the root directory, we used `create-next-app` to generate the frontend.
```bash
npx create-next-app@latest frontend
```

*Interactive CLI Prompts (GUI Steps):*
- **Would you like to use TypeScript?** -> `Yes`
- **Would you like to use ESLint?** -> `Yes`
- **Would you like to use Tailwind CSS?** -> `Yes`
- **Would you like to use `src/` directory?** -> `Yes`
- **Would you like to use App Router? (recommended)** -> `Yes`
- **Would you like to customize the default import alias?** -> `No`

**2. Install Frontend Dependencies:**
```bash
cd frontend
pnpm add axios @tanstack/react-query @tanstack/react-query-devtools
pnpm add react-hook-form @hookform/resolvers zod
pnpm add lucide-react
```

**3. Setup Providers:**
In `frontend/src/app/layout.tsx`, we wrapped the application in a `QueryClientProvider` to enable React Query for data fetching.

---

## Phase 5: Wiring the Application Together (Business Logic)

With the foundation built, we wrote the actual code connecting everything.

**1. Backend Implementation:**
- **Auth:** Implemented `JwtStrategy` in `auth.module.ts`. Created the `@OrgUser()` custom decorator to securely extract the user's Organization ID from the JWT.
- **Customers:** In `customers.service.ts`, we wrote the `assignCustomer` method. We used the database command `SELECT pg_advisory_xact_lock` to securely lock the row, checked if the user already had 5 customers, and updated the row if they didn't.
- **Activity Logging:** Injected `ActivityService` into `CustomersService` to log assignments, updates, and deletes in the same database transaction.

**2. Frontend Implementation:**
- **API Client:** Created `frontend/src/lib/api.ts` utilizing Axios. We set up an interceptor to automatically attach the `localStorage` JWT token to every request.
- **React Query Hooks:** Created `useCustomers.ts` containing queries (`useQuery`) to fetch customers, and mutations (`useMutation`) to assign them. 
- **Optimistic Updates:** Inside `useMutation`'s `onMutate` callback, we wrote code to instantly update the React UI before the backend responds, making the "Assign to User" dropdown feel instant.
- **Role-Based UI:** In the Dashboard layout, we decoded the JWT to check if the user is an `admin`. If they are a `member`, we used React conditional rendering to hide the "Add Customer" and "Assign" buttons.

---

## Phase 6: Production Readiness (Dockerfiles & CI)

**1. Creating Dockerfiles:**
- We created `backend/Dockerfile` and `frontend/Dockerfile`. 
- Both use **Multi-Stage Builds**: 
  - Stage 1 (`deps`): Installs all dependencies.
  - Stage 2 (`builder`): Compiles TypeScript to JavaScript.
  - Stage 3 (`runner`): Copies *only* the compiled JS and production dependencies to a tiny Alpine Linux image, drastically reducing container size and security vulnerabilities.

**2. Updating docker-compose.yml:**
We updated the compose file to build these Dockerfiles, linking the `backend` and `frontend` services to the `postgres` service using Docker's internal networking.

**3. CI/CD Pipeline:**
We created `.github/workflows/ci.yml`. This file tells GitHub Actions to automatically run:
```bash
pnpm install
pnpm lint
pnpm build
```
on both the frontend and backend whenever code is pushed to the `main` branch, ensuring no broken code is ever deployed.
