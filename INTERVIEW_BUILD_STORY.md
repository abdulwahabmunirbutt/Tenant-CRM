# Interview Build Story: Multi-Tenant CRM

This is the story I would tell in a senior engineering interview if I had to explain how I built this CRM from an empty folder into a production-shaped multi-tenant system. I am not treating it as a feature checklist. I am explaining the build order, the architectural decisions, the trade-offs, and the failure modes I was intentionally designing around.

## 1. Project Kickoff: Git, Repository Shape, and First Architecture Decision

I started by creating the project as a GitHub-backed repository because I wanted the build to be reviewable from the first commit, not only after the application was finished. For a take-home or interview project, that matters because the commit history and folder structure communicate how I think: database foundation first, backend boundaries second, frontend integration after the API shape is stable, and production hardening last.

The first structural decision was to use a monorepo:

```text
backend/
frontend/
docker-compose.yml
pnpm-workspace.yaml
```

I chose this structure before writing business logic because the system has two deployable applications that still belong to one product. The backend owns authentication, tenant isolation, database integrity, and business rules. The frontend owns user workflows, API consumption, optimistic UI, and role-based presentation. Keeping them in one repository makes local development, Docker composition, CI, and code review simpler. The alternative was two separate repositories, but that would add coordination overhead without giving meaningful benefits for a project of this size.

The stack was chosen around the assignment requirements and the kinds of questions I expected in review:

- TypeScript gives type safety on both sides of the system.
- NestJS gives a disciplined backend structure with modules, controllers, services, guards, DTO validation, dependency injection, and Swagger support.
- PostgreSQL is the correct database for relational tenant-owned CRM data, foreign keys, transactions, indexes, and concurrency control.
- Next.js gives a standard React application structure with routing, layouts, and a clean way to build dashboard screens.

The initial architecture decision was simple: I would build a real production-shaped system, not a demo where the frontend directly invents state or where the backend only checks happy paths. That is why Docker, migrations, environment files, and the module structure were created early. I wanted every later feature to land inside a stable architecture instead of slowly turning into scattered code.

## 2. System Architecture Design Before Coding

Before coding the CRM features, I designed the system around the most important risk: multi-tenant data leakage. In a CRM, the primary security requirement is not just authentication. It is making sure that a user from one organization can never read, mutate, assign, delete, or attach notes to another organization's records.

The core domain model was:

```text
Organization -> Users
Organization -> Customers
Customer -> Notes
Organization -> Activity Logs
```

I chose shared-table multi-tenancy. That means all organizations use the same `users`, `customers`, `notes`, and `activity_logs` tables, and every tenant-owned row carries an `organization_id`. The alternatives were database-per-tenant or schema-per-tenant. Those can provide stronger physical isolation, but they create operational complexity: migrations across many tenants, connection management, provisioning, backups, and cross-tenant administration all become harder. For this project, shared tables were the best balance: simple to operate, realistic for many SaaS products, and strong enough when backed by strict query scoping and database constraints.

The high-level request flow was designed like this:

```text
User
  -> Next.js screen
  -> Axios API client with JWT
  -> NestJS controller
  -> JwtAuthGuard
  -> RolesGuard where needed
  -> Service method receives organizationId from token
  -> PostgreSQL query scoped by organization_id
  -> Response back to React Query cache
```

The important design rule is that the frontend never chooses the tenant. The tenant comes from the verified JWT. The backend extracts it through `@OrgUser()` and passes it into service methods. That prevents a user from changing an `organizationId` field in the browser and asking for another tenant's data.

I did not rely only on application-level filtering. The service layer scopes reads and writes by `organization_id`, and the database also enforces tenant relationship integrity using composite foreign keys. For example, a customer assignment must reference a user with the same `organization_id`. A note must reference a customer and creator in the same organization. This is defense in depth: if a future developer accidentally writes incomplete service logic, PostgreSQL still rejects cross-tenant relationships.

The alternative would have been PostgreSQL Row Level Security. RLS is powerful and would be a strong production improvement for strict isolation, but it adds policy complexity and requires careful connection/session context management. For this build, I chose explicit query scoping plus database constraints because it is easy to review, easy to test, and directly visible in the migrations.

## 3. Backend Build Order: Step by Step

I built the backend in a deliberate order because each layer depends on the one before it.

First, I scaffolded NestJS. I wanted the framework's module boundaries in place before writing domain logic. NestJS gives a predictable pattern:

```text
Module -> Controller -> Service -> Entity/Repository
```

Second, I created the database module and TypeORM data source. I set `synchronize: false` because I did not want the ORM modifying the schema automatically. In production systems, schema changes should be explicit, reviewed, and repeatable through migrations.

Third, I created the domain modules in dependency order:

```text
organizations
users
auth
customers
notes
activity
```

Organizations came first because every tenant-owned entity depends on them. Users came next because authentication depends on users. Auth came before customer writes because the customer service needs a trusted organization and role. Customers came before notes because notes belong to customers. Activity logging came after core writes because it records state changes without owning the domain.

Fourth, I separated controllers from services. Controllers handle HTTP concerns: route parameters, request bodies, query strings, guards, roles, and response codes. Services handle business rules: tenant checks, assignment limits, transactions, soft delete behavior, and activity logging. The alternative would be putting logic directly in controllers, but that becomes hard to test and easy to duplicate.

Fifth, I added DTO validation with `class-validator` and a global `ValidationPipe`:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

This was added early because input validation is an architectural boundary. The service layer should not have to defend against every possible malformed request. The DTO layer rejects invalid payloads, strips unexpected fields, and converts query strings like `page` and `limit` into numbers.

Sixth, I implemented authentication and roles. Login verifies email and password, then signs a JWT containing:

```text
sub
organizationId
role
email
```

The `JwtAuthGuard` authenticates protected routes. The `RolesGuard` enforces admin-only actions such as user creation, customer creation, update, delete, restore, and assignment. Members can view customers and add notes, but cannot mutate customer ownership or lifecycle state. This order prevents architectural problems later because every business method receives a trusted `organizationId` and `role` from the backend security layer, not from frontend input.

## 4. Database Design: Deep Explanation

I designed the PostgreSQL schema around relational integrity because the CRM domain is relational by nature. Organizations own users and customers. Customers have notes. Activity logs describe changes made by users inside organizations. A document database could store this data, but it would push relationship validation and tenant integrity into application code. PostgreSQL lets the database enforce the rules that should never be violated.

The main tables are:

```text
organizations
users
customers
notes
activity_logs
```

The initial migration created the tables, UUID primary keys, the `user_role` enum, foreign keys, timestamps, and soft delete column. I added `pgcrypto` for UUID generation. Later migrations added trigram search indexes and stronger tenant integrity constraints.

Foreign keys matter here because they prevent orphaned or invalid data. A customer must belong to an organization. A note must belong to an existing customer. An activity log performer must be an existing user. Without foreign keys, the application could silently create records that look valid in one screen and break another screen later.

The deeper multi-tenant hardening is the composite unique and foreign key strategy:

```sql
ALTER TABLE users
ADD CONSTRAINT uq_users_id_org UNIQUE (id, organization_id);

ALTER TABLE customers
ADD CONSTRAINT uq_customers_id_org UNIQUE (id, organization_id);

ALTER TABLE customers
ADD CONSTRAINT fk_customers_assigned_user_same_org
FOREIGN KEY (assigned_to, organization_id)
REFERENCES users(id, organization_id);
```

That means assigning an Acme customer to a Globex user is invalid even if both UUIDs exist. The database checks the pair, not just the individual IDs.

I used soft delete for customers through `deleted_at`. In a CRM, deleting a customer should usually not destroy the history. Notes and activity logs may be needed for audit, recovery, or operational context. Soft delete hides the customer from normal workflows while preserving the row and related history. The trade-off is that every normal customer query must filter `deleted_at IS NULL`, and indexes need to match that pattern.

Manual indexes were added because ORMs do not automatically know the real query patterns. The important indexes were:

```text
idx_customers_org_active_created
idx_customers_assignment_limit_active
idx_customers_name_trgm_active
idx_customers_email_trgm_active
idx_notes_org_customer_created
idx_activity_org_entity
idx_activity_org
```

For example, the main customer list filters by organization, excludes deleted rows, and sorts by newest first:

```sql
SELECT *
FROM customers
WHERE organization_id = $1
  AND deleted_at IS NULL
ORDER BY created_at DESC, id DESC
LIMIT $2 OFFSET $3;
```

That is why `idx_customers_org_active_created` exists. The assignment rule counts active customers assigned to one user:

```sql
SELECT COUNT(*)
FROM customers
WHERE organization_id = $1
  AND assigned_to = $2
  AND deleted_at IS NULL;
```

That is why `idx_customers_assignment_limit_active` exists. Search uses `ILIKE '%term%'`, so normal B-tree indexes are not enough. I added `pg_trgm` GIN indexes for name and email so partial search can remain fast at 100K+ customers.

## 5. Multi-Tenant Isolation Strategy

The isolation strategy has three layers.

First, authentication establishes tenant context. The user logs in with email and password. The backend verifies the password hash with bcrypt and signs a JWT. The JWT contains the user's `organizationId`. From that point on, the frontend does not send `organizationId` for tenant-owned actions.

Second, services scope every tenant-owned query. Examples from the customer flow look like:

```ts
where: { id, organizationId, deletedAt: IsNull() }
```

and query builder logic like:

```ts
qb.where('customer.organization_id = :organizationId', { organizationId });
qb.andWhere('customer.deleted_at IS NULL');
```

Third, the database rejects cross-tenant relationships. Composite foreign keys make sure that assignments, notes, and activity performers belong to the same organization as the record being written.

This approach is safe because a user cannot ask for another tenant by changing request payloads, because service queries do not look up tenant-owned data by `id` alone, and because relationship writes are checked again by PostgreSQL.

The most dangerous mistakes would be:

- Looking up a customer with only `{ id }` instead of `{ id, organizationId }`.
- Allowing the frontend to submit `organizationId`.
- Creating notes without first checking that the customer is visible inside the current organization.
- Joining assigned users without enforcing same-tenant assignment integrity.
- Adding raw SQL later that forgets `organization_id`.
- Treating admin as global admin instead of organization admin.

The system avoids those mistakes by making `organizationId` part of the service method signature and by using same-organization constraints in the database.

## 6. Concurrency Problem: Max 5 Active Customers Per User

The most important backend problem was the rule that one user can have at most five active assigned customers.

The naive implementation would be:

```text
1. Count active customers assigned to user.
2. If count < 5, assign this customer.
3. Save.
```

That is not safe under concurrency. If two admins assign two different customers to the same user at the same time, both requests can read `count = 4`. Both think the assignment is allowed. Both save. The final state becomes six active customers, even though each request looked correct in isolation.

I solved this inside the database transaction, where the race actually happens:

```sql
BEGIN;
SELECT pg_advisory_xact_lock(:assigneeLockKey);

SELECT COUNT(*)
FROM customers
WHERE organization_id = :organizationId
  AND assigned_to = :assigneeId
  AND deleted_at IS NULL;

UPDATE customers
SET assigned_to = :assigneeId
WHERE id = :customerId
  AND organization_id = :organizationId
  AND deleted_at IS NULL;

COMMIT;
```

The implementation uses TypeORM's `dataSource.transaction(...)` and PostgreSQL's `pg_advisory_xact_lock`. The lock key is derived from the target assignee ID. That means concurrent assignments to the same user serialize, while assignments to different users can still run in parallel.

Inside the lock, the service:

1. Verifies the assignee exists in the same organization.
2. Verifies the customer exists in the same organization and is not deleted.
3. Returns early if the customer is already assigned to that user.
4. Counts active customers assigned to that user.
5. Throws `409 Conflict` if the count is already five.
6. Saves the new assignment.
7. Writes the activity log using the same transaction manager.

This is safe because no second assignment for the same assignee can pass the count check until the first transaction commits or rolls back. The count and update happen while holding the same transaction-scoped lock. The activity log is also written in the same transaction, so the system does not record an assignment that failed to commit.

The alternative was a row-level lock on the assignee user row with `SELECT ... FOR UPDATE`. That would also be valid. I chose advisory locks because the lock represents a business invariant rather than a direct update to the user row. Another alternative would be a materialized assignment counter, but then every assignment and unassignment would need to maintain that counter correctly. Counting active rows with a supporting index is simpler and reliable at this scale.

One production refinement would be using a collision-free lock strategy such as PostgreSQL's two-integer advisory lock form or a dedicated lock row per assignee. The current implementation hashes the UUID into a bigint string, which is practical for this build, but the design principle remains: serialize the check-and-write for one assignee.

## 7. Performance Engineering for 100K+ Customers

I designed the customer list around the assumption that one organization may have 100K or more customers. At that size, the difference between indexed and unindexed queries is the difference between a dashboard and a timeout.

The first performance decision was to align indexes with actual filters, not just columns. The main query filters by tenant, filters out soft-deleted customers, sorts by creation time, and paginates. That is why the active customer listing index starts with `organization_id`, includes sort columns, and is partial on `deleted_at IS NULL`.

The second decision was validating and capping pagination. The backend DTO defaults to `page = 1`, `limit = 20`, and caps `limit` at `100`. This prevents a client from accidentally or intentionally requesting huge pages.

I used offset pagination for the initial build because it is simple, easy to explain, and works well for normal dashboard pages. The trade-off is that very deep pages get slower because PostgreSQL still has to walk past skipped rows. For very large organizations and infinite scrolling, I would move to cursor pagination using `(created_at, id)` because the API already sorts deterministically by `createdAt DESC, id DESC`.

I avoided N+1 queries by loading the assigned user with the customer list query:

```ts
this.customerRepo
  .createQueryBuilder('customer')
  .leftJoinAndSelect('customer.assignedUser', 'assignedUser')
```

The alternative would be fetching customers first and then fetching assigned users one by one, which becomes one query for the list plus one query per customer. That is exactly the N+1 problem. A single join is the correct shape for a paginated table.

Search was handled with debounced frontend input and backend trigram indexes. Debouncing reduces unnecessary requests while the user is typing. Trigram indexes make partial `ILIKE` search viable:

```sql
CREATE INDEX idx_customers_name_trgm_active
ON customers USING gin (name gin_trgm_ops)
WHERE deleted_at IS NULL;
```

For query optimization, I would inspect `EXPLAIN ANALYZE` for the customer list, search, and assignment count queries. The goal is to keep the assignment transaction short because long transactions hold locks longer and reduce concurrency.

## 8. Frontend Build Flow: Next.js

I built the frontend after the API contract was stable. That was intentional. If the frontend is built first, it often invents fake data shapes and role behavior that the backend later has to chase. Here, the frontend consumes the real API.

The frontend structure is:

```text
src/app
src/components
src/hooks
src/lib
```

I used a page-first route structure with component extraction. Pages stay thin. For example, the customers route renders `CustomerTable`, and the table delegates assignment to `AssignUserSelect`. This keeps routing concerns separate from reusable UI and server-state behavior.

For state management, I chose TanStack Query for server state instead of putting API data into global React state. Customer lists, individual customers, users, notes, mutations, loading states, retries, invalidation, and cache updates are server-state problems. React Query is built for that. Local component state is used only for UI state like current page, search input, and whether the admin is viewing active or deleted customers.

API integration is centralized in `frontend/src/lib/api.ts`. Axios attaches the JWT token to requests and redirects to login on `401`. This prevents each hook from re-implementing authentication headers.

Pagination is handled with `page`, `limit`, and response metadata:

```text
meta.page
meta.limit
meta.total
meta.totalPages
```

Search is debounced with a `400ms` delay so typing "alice" does not fire five immediate requests. When search changes, the page resets to `1` because page `5` of the old query may not exist in the filtered result set.

Optimistic updates were used for assignment because assignment is an interactive dashboard action. The UI updates immediately, then rolls back if the API fails. This improves perceived performance, but it is only safe because the backend remains the source of truth. The mutation invalidates customer queries after settling, so any optimistic state is reconciled with the database result.

Role-based UI hides admin-only actions for members, such as new customer, delete, restore, and assignment controls. This is a user experience improvement, not a security boundary. The real security boundary remains the backend `RolesGuard`.

## 9. Production-Grade Improvement: Global Rate Limiting

The production feature I chose was global API rate limiting with NestJS throttling.

I chose rate limiting because the application has login endpoints, write endpoints, and customer listing/search endpoints. Without a basic request limit, a client can brute-force credentials, scrape data aggressively, or overload the API with repeated search calls. Rate limiting is a practical production protection with a small implementation footprint.

The backend registers:

```ts
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])
```

and applies `ThrottlerGuard` globally through `APP_GUARD`.

This improves production readiness by adding a default abuse-control layer across the API. It is not the final form for a large distributed system. In production with multiple backend instances, I would use a shared store such as Redis for consistent distributed rate limits. I would also tune stricter limits for login than for normal authenticated reads.

Swagger documentation at `/api/docs` was also added because it makes the API reviewable and testable without reading controller code first. That matters in interview and production contexts because good systems are not only implemented, they are inspectable.

## 10. Full System Flow: End to End

The login flow is:

```text
User submits email/password
  -> Next.js login page
  -> POST /auth/login
  -> AuthService finds user by email
  -> bcrypt compares password
  -> JWT signed with user id, organization id, role, email
  -> frontend stores token and user
  -> user enters dashboard
```

The customer list flow is:

```text
User opens Customers page
  -> React Query calls GET /customers?page=1&search=...
  -> Axios attaches Authorization: Bearer token
  -> JwtAuthGuard validates token
  -> @OrgUser extracts organizationId and role
  -> CustomersController passes tenant context to service
  -> CustomersService scopes query by organization_id
  -> PostgreSQL uses active customer indexes
  -> API returns paginated response
  -> React Query caches result
  -> table renders loading, empty, error, or data state
```

The assignment flow is:

```text
Admin changes assignee dropdown
  -> React Query applies optimistic cache update
  -> PATCH /customers/:id/assign
  -> JwtAuthGuard authenticates
  -> RolesGuard requires admin
  -> service starts transaction
  -> service takes advisory lock for assignee
  -> service validates same-tenant assignee and customer
  -> service counts active assigned customers
  -> service rejects if count >= 5
  -> service updates assigned_to
  -> service writes activity log in same transaction
  -> transaction commits
  -> frontend reconciles cache with server response
```

The logging flow is intentionally service-level. Important business events such as customer create, update, delete, restore, assignment, and note creation call `ActivityService`. Assignment uses `logWithManager` so the log and assignment commit together.

## 11. Scaling Strategy

The system scales horizontally at the application layer because the API is stateless. JWT authentication does not require server memory, so multiple NestJS instances can run behind a load balancer. The concurrency rule remains safe across multiple backend instances because the lock is taken inside PostgreSQL, which all instances share.

The first bottleneck will likely be PostgreSQL, not NestJS. The important database scaling steps are:

- Keep indexes aligned with the real query patterns.
- Use cursor pagination for deep browsing.
- Add read replicas for reporting or heavy audit screens.
- Move expensive analytics out of request-response paths.
- Consider partitioning customers by organization or hash if table size grows far beyond the assignment target.
- Consider PostgreSQL Row Level Security for stricter tenant guarantees.

For large organizations, I would also separate operational queries from reporting queries. The main customer dashboard needs fast indexed reads and short transactions. Reporting can tolerate slightly stale data and should not compete with assignment writes.

The frontend scaling path is also clear:

- Keep server state in React Query.
- Add list virtualization if pages become visually large.
- Keep search debounced.
- Use cursor pagination or infinite queries for large scrolling workflows.
- Add route-level error boundaries and more granular loading states.

The main concurrency bottleneck is assignment to the same user. That is expected and correct. The business rule says assignments for one assignee must be serialized to enforce the max-five invariant. Assignments to different users can proceed in parallel.

## 12. Trade-Offs and Engineering Decisions

I intentionally simplified some areas because this was a focused build.

I used shared-table tenancy instead of database-per-tenant. This keeps the system easy to run and review, but it means every query and index must respect `organization_id`. The database constraints reduce the risk, and RLS could be added later for stronger enforcement.

I used offset pagination instead of cursor pagination. Offset pagination is simple for a dashboard and easy to test, but cursor pagination is better for very deep pages. The existing deterministic ordering by `createdAt` and `id` makes that migration straightforward.

I used stateless JWT access tokens. This supports horizontal scaling and simple API calls, but token revocation is limited until refresh tokens, short access-token lifetimes, or a revocation store are added.

I used global email uniqueness. That simplifies login lookup, but it means the same email cannot be reused in multiple organizations. A more flexible SaaS model might use unique `(organization_id, email)` plus an organization-aware login flow.

I used PostgreSQL advisory locks for assignment concurrency. This is a strong fit because PostgreSQL is already the chosen database and the lock is transaction-scoped. The trade-off is database specificity. If the system moved to another database, the locking strategy would need to be redesigned.

I implemented activity logging as synchronous writes. That keeps audit records transactionally consistent for assignment, but high-volume systems may eventually move non-critical logging or notifications into background jobs. For critical audit events, I would keep transactional logging.

If I had more production time, I would add:

- Integration tests against real PostgreSQL for tenant isolation and assignment races.
- Row Level Security policies for defense in depth.
- Redis-backed distributed rate limiting.
- Request correlation IDs and structured JSON logging.
- Cursor pagination for large customer lists.
- Background jobs for notifications and reporting.
- A dedicated activity timeline UI.
- More granular permissions beyond `admin` and `member`.

The key architectural point is that the system was built from the data boundary outward. I designed the tenant model first, locked down the database rules, built backend services around trusted tenant context, solved the concurrency invariant inside a transaction, and only then built the frontend on top of the real API. That is the order I chose because it protects the parts of the system that are hardest to fix later: data isolation, correctness under concurrency, and query performance at scale.
