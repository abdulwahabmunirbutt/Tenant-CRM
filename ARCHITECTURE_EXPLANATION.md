# Complete Engineering Guide: Multi-Tenant CRM

This document serves as a complete manual for the Multi-Tenant CRM system. It explains the exact commands used to run and build the project, justifies the technology choices based on the assignment requirements, and details how the entire system was built step-by-step from scratch.

---

## 1. How to Build & Run the Project (Commands & Steps)

You can run this project either entirely through Docker, or locally on your machine.

### Option A: Running via Docker (Recommended)
This spins up the database, the backend API, and the frontend automatically.

1. **Clone the repository** and open your terminal in the root directory.
2. **Create the environment file:**
   ```bash
   cp .env.example .env
   ```
3. **Start the containers:**
   ```bash
   docker compose up --build
   ```
   *(Wait a few moments for the backend to run migrations and start).*
4. **Seed the database with test data:**
   Open a new terminal window and run:
   ```bash
   docker compose exec backend pnpm seed:prod
   ```
5. **Access the Application via GUI:**
   - **Frontend UI:** Open your browser to `http://localhost:3000`
   - **Backend API & Swagger Docs:** Open `http://localhost:3001/api/docs`

### Option B: Running Locally (Native Setup)
If you prefer to run the Node apps on your native OS:

1. **Start only the Database:**
   ```bash
   docker compose up postgres -d
   ```
2. **Install Dependencies (using corepack/pnpm):**
   ```bash
   corepack pnpm --dir backend install
   corepack pnpm --dir frontend install
   ```
3. **Run Migrations & Seed Data:**
   ```bash
   corepack pnpm --dir backend migration:run
   corepack pnpm --dir backend seed
   ```
4. **Start the Development Servers (run in two separate terminal tabs):**
   ```bash
   # Terminal 1
   corepack pnpm --dir backend start:dev
   
   # Terminal 2
   corepack pnpm --dir frontend dev
   ```

---

## 2. Technology Choices: Why & How They Link

The take-home assignment specified **TypeScript, NestJS, PostgreSQL, and Next.js**. Here is how we utilized them and why they are beneficial:

### The Backend Stack
* **NestJS:**
  * **Why:** NestJS forces a highly opinionated, Angular-like architecture (Modules, Controllers, Services). For an enterprise CRM, this ensures the codebase remains maintainable as it grows.
  * **Benefit:** Out-of-the-box Dependency Injection, easy integration with Swagger, and built-in guards/interceptors for rate-limiting and authentication.
* **PostgreSQL & TypeORM:**
  * **Why:** PostgreSQL is the industry standard for relational data. TypeORM bridges our TypeScript classes with the database.
  * **Benefit:** We can write strict SQL migrations to enforce tenant isolation via Foreign Keys, while using TypeORM to easily query relations (like fetching a Customer and their Notes together).
* **Class-Validator & Class-Transformer:**
  * **Why:** To validate incoming API requests.
  * **Benefit:** Automatically strips malicious payload data and throws `400 Bad Request` before the data ever reaches our business logic.

### The Frontend Stack
* **Next.js (App Router):**
  * **Why:** Standardized React framework providing excellent routing and optimization.
  * **Benefit:** Fast page loads and an organized folder structure (`app/customers/page.tsx`).
* **TanStack React Query:**
  * **Why:** Managing server state (data fetched from APIs) is notoriously difficult in React. 
  * **Benefit:** It handles caching, loading states, error states, and crucially: **Optimistic Updates**. When you assign a customer, React Query updates the UI instantly, making the app feel incredibly fast.
* **Tailwind CSS & Zod:**
  * **Why/Benefit:** Tailwind allows for rapid, consistent styling without managing separate CSS files. Zod provides schema validation for frontend forms before submitting to the backend.

### How They Link Together
1. **The Request:** The user clicks "Assign" on the Next.js frontend.
2. **React Query & Axios:** React Query intercepts this, updates the local UI instantly, and uses Axios to send a `PATCH` request to the backend. It attaches the JWT token in the `Authorization: Bearer <token>` header.
3. **NestJS Gateway:** The NestJS `CustomersController` receives the request. The `JwtAuthGuard` validates the token, and the `@Roles()` guard ensures the user is an Admin.
4. **Database Execution:** The `CustomersService` starts a Postgres transaction, secures an advisory lock, checks the "max 5 customers" rule, updates the TypeORM entity, and saves it.
5. **The Response:** NestJS returns the updated customer, and React Query confirms the optimistic UI update.

---

## 3. Step-by-Step: How This Project Was Built From Scratch

If you were to recreate this exact project from scratch, here are the sequential engineering steps and commands used:

### Phase 1: Repository Initialization
1. Created the root folder and initialized a `pnpm` workspace to manage both frontend and backend dependencies in one place:
   ```bash
   pnpm init
   touch pnpm-workspace.yaml
   ```

### Phase 2: Backend Scaffolding
1. Installed the Nest CLI and generated the backend:
   ```bash
   npx @nestjs/cli new backend --package-manager=pnpm
   ```
2. Added the database, auth, and validation packages:
   ```bash
   cd backend
   pnpm add @nestjs/typeorm typeorm pg
   pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
   pnpm add class-validator class-transformer
   ```
3. Generated the modular structure using Nest CLI commands:
   ```bash
   npx nest g module database
   npx nest g resource users
   npx nest g resource customers
   npx nest g resource notes
   npx nest g resource activity
   ```

### Phase 3: Database & Multi-Tenancy Architecture
1. **Docker Setup:** Created the `docker-compose.yml` file to spin up a local Postgres instance.
2. **Entities:** Wrote the TypeORM entities (`customer.entity.ts`, `user.entity.ts`) ensuring every entity had an `organizationId`.
3. **Migrations:** Instead of relying on auto-sync, generated explicit SQL migrations to enforce database-level tenant integrity:
   ```bash
   npx typeorm migration:create src/database/migrations/InitSchema
   ```
4. **Seeding:** Wrote `seed.ts` to populate two distinct companies (Acme Corp and Globex Inc) to test isolation.

### Phase 4: Business Logic & Concurrency
1. Built the `AuthModule` to issue JWTs containing the `organizationId`.
2. Built the `CustomersService` with strict multi-tenant checks (`WHERE organization_id = ...`).
3. **Concurrency Requirement:** Implemented the `pg_advisory_xact_lock` in the assign method to satisfy the "Max 5 assignments" rule without race conditions.

### Phase 5: Frontend Scaffolding
1. Generated the Next.js app in the root directory:
   ```bash
   npx create-next-app@latest frontend --typescript --tailwind --eslint --app
   ```
2. Installed data-fetching and UI libraries:
   ```bash
   cd frontend
   pnpm add axios @tanstack/react-query react-hook-form @hookform/resolvers zod lucide-react
   ```
3. Built the UI components (`AssignUserSelect.tsx`, `CustomerForm.tsx`).
4. Connected the frontend to the backend by creating custom hooks (e.g., `useAssignCustomer()`) that wrap Axios calls.

### Phase 6: Performance & Production Tuning
1. Added Trigram indexes to the backend migrations for fast search.
2. Implemented Global Rate Limiting in `app.module.ts`.
3. Wrote Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`) utilizing multi-stage builds to ensure minimal footprint in production.
4. Created the GitHub Actions workflow (`.github/workflows/ci.yml`) for automated testing.

---

## 4. Addressing Core Assignment Requirements

* **Data Isolation:** Enforced on three layers: The JWT (Auth), the Service Layer (`WHERE organizationId`), and the Database Layer (Composite Foreign Keys).
* **Concurrency-Safe Assignment:** Solved using Transactional Advisory Locks in PostgreSQL (`CustomersService.assignCustomer()`).
* **Performance (100k records):** Solved by eliminating N+1 queries (`relations: ['assignedUser']`), adding manual composite indexes, and utilizing `pg_trgm` for fast text searches.
* **Soft Delete Integrity:** Solved using TypeORM's `@DeleteDateColumn()`. Normal queries automatically append `deleted_at IS NULL`. Notes and Activity Logs remain untouched in the database.
* **Production Improvement:** Implemented **API Rate Limiting** to prevent brute-force attacks on the auth endpoints and scraping of the customer endpoints, alongside **Swagger API Documentation**.
