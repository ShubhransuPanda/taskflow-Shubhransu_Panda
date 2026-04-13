# Taskflow

A task management web app built as part of a frontend engineering assessment. You can create projects, assign tasks to team members, track progress, and manage your workspace — all from a clean, responsive interface.

---

## 1. What this is

Taskflow is a frontend-only SPA built with **React + TypeScript**, backed by a lightweight **Node.js mock API** that follows the provided Appendix A contract. It covers the full feature set:

- JWT authentication with persistent login across refreshes
- Project and task CRUD with rich metadata (status, priority, deadline, tags)
- A shared data table with column drag-to-reorder, sortable headers, per-column visibility, filters, and pagination
- Optimistic task status updates (instant UI feedback, rollback on failure)
- Dark mode that persists across sessions
- A dashboard with at-a-glance stats for projects, active work, and team members

### Stack at a glance

| Layer | What I used | Why |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | Fast HMR, strong typing, production builds with code-splitting |
| UI | MUI (Material UI) | Accessible, consistent components out of the box — lets me focus on UX logic |
| Routing | React Router v6 | Lazy-loaded pages, protected routes, URL-driven filters |
| Data fetching | TanStack Query | Cache management, mutations, and optimistic updates without a dedicated state lib |
| Forms | React Hook Form + Zod | Type-safe validation with minimal re-renders |
| Mock API | Custom Node.js HTTP server | JWT auth, bcrypt passwords, persists to `db.json` |
| Serving | nginx (in Docker) | Proper production serving — not `npm run dev` |

---

## 2. Architecture decisions

**Separation of concerns** — `frontend/` and `mock-api/` are completely independent packages. The mock API is its own Docker service so you could swap it for a real backend later without touching the React code.

**Services layer** — every API call lives in `frontend/src/services/`. Pages never import axios directly. This made it trivial to add the `userService` later without touching existing files.

**`DataTable` component** — I built a single reusable table that handles column drag-to-reorder, click-to-sort, column visibility toggles, inline filters, and pagination. All three data views (Projects, Tasks, Users) use it — no duplicated table code anywhere.

**TanStack Query for everything async** — the cache invalidation model is a much better fit for optimistic updates than manual state. When you change a task status, the UI updates instantly and rolls back automatically if the API call fails.

**Auth in Context + localStorage** — simple, works across refreshes, and easy for a reviewer to follow. No third-party auth library.

**What I left out intentionally:**
- No real database or migrations — this is the frontend-only Appendix A path, so the mock API's `db.json` fills that role
- No WebSocket/SSE — real-time updates need backend infrastructure that's out of scope here
- No automated test suite — I'd add this given more time (see Section 7)

---

## 3. Running locally

The only thing you need installed is **Docker Desktop**.

```bash
git clone https://github.com/your-name/taskflow-Shubhransu_Panda
cd taskflow-Shubhransu_Panda
cp .env.example .env
docker compose up --build
```

That's it. Both services start together.

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| Mock API | http://localhost:4000 |

The frontend is a production Vite build served by nginx. The mock API mounts `db.json` as a Docker volume so data survives container restarts.

---

## 4. Migrations

Not applicable — this is a frontend-only submission. The mock API uses `mock-api/db.json` as its data store. It's pre-seeded with a test account, one project, and three tasks (see below).

---

## 5. Test credentials

A seeded account is included so you can log in immediately — no registration needed.

```
Email:    test@example.com
Password: password123
```

The seed data includes:
- 1 project — *Website Redesign* (active, high priority)
- 3 tasks covering all three statuses: `done`, `in_progress`, and `todo`

---

## 6. API reference

Base URL: `http://localhost:4000`

All project and task endpoints require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Body |
|---|---|---|
| `POST` | `/auth/register` | `{ name, email, password }` |
| `POST` | `/auth/login` | `{ email, password }` |

Both return `{ token, user }`.

### Projects

| Method | Path | Notes |
|---|---|---|
| `GET` | `/projects` | Returns projects you own or are assigned to |
| `POST` | `/projects` | `{ name, description?, status?, priority?, due_date?, tags? }` |
| `GET` | `/projects/:id` | Includes task list |
| `PATCH` | `/projects/:id` | Any subset of create fields |
| `DELETE` | `/projects/:id` | `204 No Content` |

### Tasks

| Method | Path | Notes |
|---|---|---|
| `GET` | `/projects/:id/tasks` | Accepts `?status=` and `?assignee=` filters |
| `POST` | `/projects/:id/tasks` | `{ title, description?, status?, priority?, assignee_id, due_date }` |
| `PATCH` | `/tasks/:id` | Any subset of create fields |
| `DELETE` | `/tasks/:id` | `204 No Content` |

### Users

| Method | Path | Notes |
|---|---|---|
| `GET` | `/users` | Returns all users with `project_count` and `task_count` |

### Error responses

```json
{ "error": "validation failed", "fields": { "email": "is required" } }  // 400
{ "error": "unauthorized" }   // 401
{ "error": "forbidden" }      // 403
{ "error": "not found" }      // 404
```

---

## 7. What I'd do with more time

**Tests** — I'd add Vitest + React Testing Library for unit tests on auth flow, form validation, and the `DataTable` component. Playwright for end-to-end flows: login → create project → add tasks → check dashboard counts.

**Role-based access control** — right now every registered user is equal. A real workspace tool needs at least two roles:
- **Admin** — can see and manage all projects/tasks in the workspace, manage members, and assign roles
- **Member** — can only see projects they own or are assigned to (current behaviour)
- **Viewer** (optional) — read-only access, useful for stakeholders

The backend would attach a `role` field to the JWT payload, and the frontend would gate UI actions (delete project, manage users, etc.) behind a `useRole()` hook or a `<RequireRole>` wrapper component.

**Pagination on the server side** — client-side pagination (currently implemented) works fine for small datasets. At scale, the API should accept `?page=&limit=` and return a `total` count so the frontend never loads thousands of records at once.

**Real-time updates** — a WebSocket or SSE channel would let collaborators see task changes without refreshing. TanStack Query's `queryClient.invalidateQueries` is the right hook for this — just call it when a server-push event arrives.

**Richer task management** — subtasks, file attachments, activity history, comments per task. The data model is already structured to support this.

**CI pipeline** — GitHub Actions running `tsc`, ESLint, and `npm run build` on every PR so nothing broken ever merges.
