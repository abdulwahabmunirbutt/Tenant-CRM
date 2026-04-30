# Multi-Tenant CRM System

A production-shaped take-home implementation built with TypeScript, NestJS, PostgreSQL, and Next.js.

The goal is not to create a huge CRM. The goal is to prove the important engineering decisions: tenant isolation, database integrity, concurrency-safe assignment, efficient queries, clean TypeScript, and a frontend that handles real loading and error states.

## Tech Stack

Backend:

- NestJS with separate controller and service layers
- TypeScript strict mode
- TypeORM migrations against PostgreSQL
- DTO validation with `class-validator`
- JWT authentication with role-based access control
- Swagger API documentation
- Global API rate limiting

Frontend:

- Next.js App Router
- TypeScript strict mode
- TanStack Query for server state
- React Hook Form and Zod for forms
- Axios with typed API responses
- Tailwind CSS and small reusable UI primitives

Database:

- PostgreSQL 16
- Shared-table multi-tenancy with `organization_id`
- Foreign keys and composite tenant integrity constraints
- Soft delete via `deleted_at`
- Manual indexes for listing, search, assignment checks, notes, and activity logs

## Project Structure

```text
backend/
  src/
    activity/       Activity log entity and service
    auth/           Login, JWT strategy, auth guards, roles guard
    common/         Shared decorators
    customers/      Customer APIs, DTOs, entity, assignment logic
    database/       TypeORM data source, migrations, seed script
    notes/          Notes APIs, DTOs, entity, service
    organizations/  Organization entity and module
    users/          User APIs, DTOs, entity, service

frontend/
  src/
    app/            Next.js routes
    components/     Layout, customer UI, reusable controls
    hooks/          React Query hooks
    lib/            API client, auth helpers, shared types
```

## Quick Start With Docker

Create the environment file:

```bash
cp .env.example .env
```

Start PostgreSQL, backend, and frontend:

```bash
docker compose up --build
```

The backend container runs compiled migrations before starting the API. Seed demo data once after the containers are running:

```bash
docker compose exec backend pnpm seed:prod
```

Open:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`
- Swagger docs: `http://localhost:3001/api/docs`

Seed credentials:

- `alice@acme.com / password123` - Acme admin
- `bob@acme.com / password123` - Acme member
- `carol@globex.com / password123` - Globex admin
- `dave@globex.com / password123` - Globex member

## Native Development Setup

If `pnpm` is installed:

```bash
docker compose up postgres -d
pnpm --dir backend install
pnpm --dir frontend install
pnpm --dir backend migration:run
pnpm --dir backend seed
pnpm --dir backend start:dev
pnpm --dir frontend dev
```

If `pnpm` is not on your PATH, use Corepack:

```bash
corepack pnpm --dir backend install
corepack pnpm --dir frontend install
corepack pnpm --dir backend migration:run
corepack pnpm --dir backend seed
corepack pnpm --dir backend start:dev
corepack pnpm --dir frontend dev
```

## Verification Commands

```bash
corepack pnpm --dir backend build
corepack pnpm --dir frontend build
corepack pnpm --dir backend lint
corepack pnpm --dir frontend lint
corepack pnpm --dir backend migration:run:prod
```

Current verification status:

- Backend production build passes
- Frontend production build passes
- Backend lint passes
- Frontend lint passes
- Compiled production migration command works and reports no pending migrations after migration execution

## Implementation Walkthrough

### 1. Started With the Domain Model

What was done:

- Identified the core entities: organizations, users, customers, notes, and activity logs.
- Put tenant-owned records on shared tables with an `organization_id` column.
- Modeled one user as belonging to exactly one organization.

Why:

- The assignment is about multi-tenant CRM behavior, so the database model has to make tenant ownership explicit.
- Shared tables are simpler to operate than schema-per-tenant for a take-home, while still proving isolation.

Advantage:

- Every query has a clear tenant boundary.
- The model can support many organizations without creating tables dynamically.

Trade-off:

- Shared tables require disciplined query filters and indexes. For stricter enterprise isolation, PostgreSQL Row Level Security could be added later.

### 2. Built Database Migrations Before Application Logic

What was done:

- Created TypeORM migrations for tables, enum types, foreign keys, and indexes.
- Added a later hardening migration for composite tenant constraints.
- Kept `synchronize: false` so schema changes are intentional and reviewable.

Why:

- Production systems should not let an ORM silently change schema at runtime.
- Migrations document the database contract and make setup repeatable.

Advantage:

- Reviewers can inspect the exact schema.
- Local, Docker, and deployed environments can converge on the same database state.

### 3. Added Tenant Integrity at the Database Layer

What was done:

- Added `UNIQUE (id, organization_id)` on `users` and `customers`.
- Added composite foreign keys:
  - Customer assignment must point to a user in the same organization.
  - A note must point to a customer in the same organization.
  - A note creator must be a user in the same organization.
  - An activity performer must be a user in the same organization.

Why:

- Service code already filters by organization, but database constraints protect against future bugs, scripts, or direct database writes.

Advantage:

- Cross-tenant relationships are rejected by PostgreSQL, not only by application convention.
- This gives defense in depth for multi-tenancy.

### 4. Implemented Authentication and Roles

What was done:

- Added login with email and password.
- Stored password hashes with bcrypt.
- Issued JWTs containing user id, organization id, role, and email.
- Added `JwtAuthGuard` for protected routes.
- Added `RolesGuard` so only admins can create users.
- Applied a conservative role policy for customer writes:
  - Admins can create customers, update customers, assign or unassign customers, soft-delete customers, restore customers, and create users.
  - Members can view active customers in their organization and add notes.

Why:

- The backend needs a trusted source of organization context.
- The frontend must not be allowed to choose or submit `organizationId`.
- Role permissions should be enforced by the API, not only hidden in the UI.

Advantage:

- Tenant context comes from the verified token.
- User and customer write actions are correctly restricted to admins.
- Members still contribute customer context through notes without being able to mutate customer records.

### 5. Implemented Customer CRUD With Soft Delete

What was done:

- Added create, read, update, soft delete, restore, list, search, and pagination.
- Used TypeORM `DeleteDateColumn` through `deleted_at`.
- Normal customer queries always include `deleted_at IS NULL`.
- Admins can explicitly switch to a deleted-customers view and restore customers from there.

Why:

- The assignment requires deleted customers to disappear from normal views without losing notes or audit history.
- Restore needs a deliberate admin-only path because normal queries correctly hide deleted rows.

Advantage:

- Deleting a customer is reversible.
- Notes and activity logs remain available in storage.
- Restoring clears `deleted_at`, making the customer and notes visible again.
- Members never see deleted customer rows or restore controls.

### 6. Implemented Notes

What was done:

- Added note creation and note listing per customer.
- Checked that the customer belongs to the current organization and is not soft-deleted before notes can be read or created.
- Stored `created_by` and `organization_id` on every note.

Why:

- Notes are customer context, but they also need their own tenant boundary for integrity and efficient lookup.

Advantage:

- Notes remain stored even when a customer is soft-deleted.
- Restoring the customer makes the note history visible again.

### 7. Implemented Activity Logging

What was done:

- Logged customer created, updated, deleted, restored, assigned, and note-added events.
- Stored entity type, entity id, action, performer, metadata, organization id, and timestamp.
- Used the same transaction manager during assignment logging.

Why:

- Activity logs should explain important state changes and support future audit screens.
- Assignment logging should commit or roll back with the assignment itself.

Advantage:

- The system keeps an audit trail without coupling the UI to it.
- Critical assignment events cannot be logged separately from the actual assignment update.

### 8. Solved Concurrent Assignment

Requirement:

- Each user can have maximum 5 active customers assigned.
- Concurrent requests must not allow the count to exceed 5.

What was done:

- Assignment runs inside a PostgreSQL transaction.
- The service takes a transaction-scoped advisory lock for the target assignee.
- Assignment and unassignment are admin-only actions.
- Inside the lock it:
  - Verifies the assignee belongs to the same organization.
  - Verifies the customer belongs to the same organization and is active.
  - Counts active customers currently assigned to that user.
  - Rejects when the count is already 5.
  - Updates the customer assignment.
  - Writes the activity log in the same transaction.

Code path:

- [backend/src/customers/customers.service.ts](backend/src/customers/customers.service.ts)

Why this prevents races:

- Without a lock, two requests could both read `count = 4`, both assign a new customer, and leave the user with 6 customers.
- With `pg_advisory_xact_lock`, concurrent assignments to the same target user are serialized until the transaction commits or rolls back.

Advantage:

- Correctness is enforced where the race happens: inside the database transaction.
- Assignments to different users can still proceed in parallel.
- The lock automatically releases at transaction end.

Trade-off:

- PostgreSQL advisory locks are database-specific. That is acceptable here because PostgreSQL is part of the required stack.

### 9. Added Performance-Oriented Queries and Indexes

Target:

- 100,000 customers per organization.

What was done:

- Customer list filters by organization and active rows.
- Customer list sorts by `createdAt DESC, id DESC` for deterministic ordering.
- Customer list joins assigned user in the same query to avoid N+1 lookups.
- Search supports name and email.
- Pagination uses validated `page` and `limit`, capped at 100.
- Deleted-customer listing is explicit and admin-only; normal listing remains active-only.

Manual indexes:

- `idx_customers_org_active_created`
  - Supports normal customer listing by organization and active rows ordered by newest first.
- `idx_customers_assignment_limit_active`
  - Supports the max-5 assignment count check.
- `idx_customers_name_trgm_active`
  - Supports partial name search on active customers.
- `idx_customers_email_trgm_active`
  - Supports partial email search on active customers.
- `idx_notes_org_customer_created`
  - Supports loading notes for one customer in one organization.
- `idx_activity_org_entity`
  - Supports future activity history lookup for a specific entity inside a tenant.
- `idx_activity_org`
  - Supports organization-level audit browsing.

Why:

- At 100,000 customers per tenant, table scans become expensive.
- Assignment checks must stay fast because they run inside a transaction.
- Search with `ILIKE '%term%'` needs trigram indexes to avoid full scans.

Advantage:

- The common dashboard path stays responsive.
- The concurrency path stays short, reducing lock time.
- Future audit and notes views have appropriate indexes.

Trade-off:

- Offset pagination is simple and reviewer-friendly, but cursor pagination would scale better for very deep pages.

### 10. Built the Frontend After the API Shape Was Stable

What was done:

- Added login.
- Added customer list with debounced search.
- Added pagination controls.
- Added create and edit customer forms.
- Added admin-only assignment and unassignment controls.
- Added admin-only deleted-customer tab with restore actions.
- Added notes panel.
- Added member UI that hides customer mutation controls and keeps view plus add-note workflows.
- Added loading, empty, and error states.
- Added optimistic assignment updates with rollback on API failure.

Why:

- The UI should consume the real API contract instead of inventing frontend-only state.
- Role-specific UI should guide the user away from actions the API will reject.
- Assignment is a high-interaction action, so optimistic updates make the dashboard feel responsive.

Advantage:

- React Query centralizes loading, caching, invalidation, and mutation state.
- Typed API models keep frontend and backend contracts clear.
- Admin and member dashboards now show only the actions each role is allowed to perform.

### 11. Added Production Improvement

Chosen improvement:

- Global API rate limiting plus Swagger API documentation.

What was done:

- Added NestJS throttling globally with a limit of 100 requests per minute.
- Added Swagger docs at `/api/docs`.

Why:

- Rate limiting is a practical protection for login and write-heavy endpoints.
- Swagger makes the API easy to inspect during review and helps future developers test requests without reading controller code first.

Advantage:

- The system has a basic abuse-control layer.
- The assignment reviewer can quickly discover and test endpoints.

## Multi-Tenancy Isolation

The frontend never sends `organizationId` for tenant-owned actions.

The backend gets tenant context from the verified JWT through `@OrgUser()`. Services then scope every query by `organizationId`.

Examples:

```ts
where: { id, organizationId, deletedAt: IsNull() }
```

```sql
WHERE customer.organization_id = :organizationId
  AND customer.deleted_at IS NULL
```

Isolation is enforced in three layers:

1. Authentication layer
   - JWT contains the user id, organization id, and role.
2. Service layer
   - All reads and writes use the organization id from the token.
3. Database layer
   - Composite foreign keys prevent cross-organization notes, assignments, and activity performers.

Result:

- A user from Acme cannot list, view, assign, update, delete, restore, or add notes to Globex customers.
- If a valid customer id from another tenant is requested, the API returns `404 Not Found`.
- Admin-only write routes return `403 Forbidden` for members.

## Role Permissions

Admin users:

- View active customers in their organization.
- Create customers.
- Update customers.
- Assign and unassign customers.
- Soft-delete customers.
- View deleted customers in an explicit deleted view.
- Restore deleted customers.
- Create users in their organization.
- Add notes to active customers.

Member users:

- View active customers in their organization.
- Open customer detail pages.
- Add notes to active customers.
- View users in their organization.

Members cannot:

- Create, update, assign, unassign, delete, or restore customers.
- View deleted customer rows.
- Create users.

Why this policy was chosen:

- The assignment requires admin-only user creation and tenant-safe data access.
- Restricting customer mutations to admins is a conservative production policy that prevents accidental destructive or ownership-changing actions by members.
- Members still satisfy an operational CRM workflow by viewing customers and adding notes.

## Concurrency Safety Details

Assignment uses this shape:

```sql
BEGIN;
SELECT pg_advisory_xact_lock(:assigneeLockKey);
SELECT COUNT(*) FROM customers
WHERE organization_id = :organizationId
  AND assigned_to = :assigneeId
  AND deleted_at IS NULL;
UPDATE customers SET assigned_to = :assigneeId WHERE id = :customerId;
COMMIT;
```

Important details:

- The lock is transaction-scoped, so it releases automatically.
- The lock key is derived from the target assignee id.
- Only assignments competing for the same user block each other.
- Unassignment accepts `assigneeId: null` and logs the assignment change with `assignedTo: null`.
- The customer update and activity log happen in the same transaction.
- The active count excludes soft-deleted customers.

Failure behavior:

- If the assignee is not in the same organization, the API returns `404`.
- If the customer is missing, deleted, or belongs to another organization, the API returns `404`.
- If the user already has 5 active customers, the API returns `409 Conflict`.

## Soft Delete Integrity

What happens when a customer is deleted:

- `customers.deleted_at` is set.
- The row remains in the database.
- Notes remain in `notes`.
- Activity logs remain in `activity_logs`.
- Normal customer list and detail queries exclude the customer.
- Notes are not visible through normal note endpoints while the customer is deleted because the customer visibility check fails.

What happens when a customer is restored:

- `customers.deleted_at` is cleared.
- The customer appears in normal queries again.
- Existing notes become visible again.
- A restore activity log is written.

Admin restore workflow:

- Admin switches the customer list from `Active` to `Deleted`.
- Deleted customers are loaded with `deletedOnly=true`.
- Admin clicks `Restore`.
- The restored customer returns to the active customer list.

## API Summary

Auth:

- `POST /auth/login`

Users:

- `GET /users`
- `POST /users` - admin only

Customers:

- `GET /customers?page=1&limit=20&search=term`
- `GET /customers?page=1&limit=20&deletedOnly=true` - admin-only deleted view
- `POST /customers` - admin only
- `GET /customers/:id`
- `PUT /customers/:id` - admin only
- `DELETE /customers/:id` - admin only
- `PATCH /customers/:id/restore` - admin only
- `PATCH /customers/:id/assign` - admin only, pass a user id to assign or `null` to unassign

Notes:

- `GET /customers/:customerId/notes`
- `POST /customers/:customerId/notes`

Swagger:

- `GET /api/docs`

## Scaling Plan

Near-term improvements:

- Add cursor pagination for deep customer browsing.
- Add activity log UI and customer timeline.
- Add automated concurrency tests against a real PostgreSQL test database.
- Add request correlation IDs for distributed tracing.
- Add refresh tokens or short-lived access tokens with revocation.

Database scaling:

- Keep tenant and active-row indexes aligned with query patterns.
- Consider table partitioning by organization or hash when customer volume grows far beyond the assignment target.
- Consider PostgreSQL Row Level Security for stronger tenant guarantees.
- Add read replicas for reporting and heavy audit queries.

Application scaling:

- Keep the API stateless so multiple backend instances can run behind a load balancer.
- Continue using database-level assignment locking, because all API instances share PostgreSQL.
- Move expensive reporting or notification work into background jobs.

Frontend scaling:

- Add virtualization for very large visible lists.
- Add route-level error boundaries.
- Keep server state in React Query and avoid duplicating API data in local component state.

## Trade-Offs

| Decision | Advantage | Trade-off |
|---|---|---|
| Shared-table tenancy | Simple, efficient, easy to review | Requires strict tenant filters and indexes |
| PostgreSQL advisory lock | Correct under concurrent requests | PostgreSQL-specific approach |
| Offset pagination | Simple UI and API contract | Cursor pagination is better for deep pages |
| Soft delete | Keeps notes and logs intact | Queries must consistently filter `deleted_at IS NULL` |
| Stateless JWT | Easy horizontal scaling | Token revocation needs extra infrastructure |
| Global email uniqueness | Simple login lookup | Same email cannot register in multiple organizations |
| Rate limiting | Basic production protection | Needs distributed storage for precise limits across many instances |

## Submission Notes

Repository link:

- Add the GitHub repository URL here after pushing.

Deployed URL:

- Add the frontend deployment URL here after deployment.
- Add the backend deployment URL here after deployment.

Recommended deployment:

- Backend: Railway, Render, Fly.io, or any Node-compatible host with PostgreSQL.
- Frontend: Vercel.

Backend environment variables:

```text
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=7d
FRONTEND_URL=
NODE_ENV=production
PORT=3001
```

Frontend environment variables:

```text
NEXT_PUBLIC_API_URL=
```
