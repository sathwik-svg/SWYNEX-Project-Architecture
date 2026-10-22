# SWYNEX-Backend-API-and-Database — TaskFlow

A full-stack task management application built as part of the SWYNEX Technologies internship. This repository covers Task 2: the backend API and database layer, featuring a Supabase Edge Function REST API with server-side validation, PostgreSQL with row-level security, and automatic timestamp triggers.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [REST API](#rest-api)
- [Data Model](#data-model)
- [Database Triggers](#database-triggers)
- [Validation](#validation)
- [Security](#security)
- [Frontend Screens](#frontend-screens)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Learnings](#key-learnings)
- [License](#license)

---

## Overview

TaskFlow is a project management tool where users create color-coded projects, add prioritized tasks, and move them across a Kanban board (To Do → In Progress → Done). The backend is a Supabase Edge Function (Deno) that exposes a REST API with Express.js routing and full server-side validation. Data is stored in PostgreSQL with row-level security, check constraints, foreign keys, and a trigger for auto-updating timestamps.

## Features

- **REST API** — Full CRUD for projects and tasks via a single Edge Function with Express.js
- **Server-side validation** — Every request is validated for required fields, types, length limits, and allowed enum values before touching the database
- **Project dashboard** — Grid of project cards with color tags, task counts per status, and completion progress bars
- **Kanban task board** — Three columns (To Do, In Progress, Done) with click-to-cycle status
- **Task management** — Create, edit, and delete tasks with title, description, status, and priority
- **Priority levels** — Low, Medium, and High badges for at-a-glance triage
- **Optimistic updates** — UI updates instantly with rollback on server failure
- **Responsive design** — Mobile to desktop with adaptive layouts
- **Loading skeletons** — Animated placeholders while data loads

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| API server | Supabase Edge Function (Deno) + Express.js |
| Database | Supabase (PostgreSQL) |
| Client SDK | @supabase/supabase-js |

## Architecture

```
┌──────────────────────────────────────────────┐
│               Browser (SPA)                   │
│                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Screens  │→ │ Components│→ │  Types   │    │
│  │ (App.tsx)│  │ (cards,  │  │ (shared) │    │
│  │          │  │ modals)  │  │          │    │
│  └────┬─────┘  └──────────┘  └──────────┘    │
│       │                                       │
│  ┌────▼─────┐                                 │
│  │ API Layer │  (src/lib/api.ts)              │
│  │ fetch()  │  → REST calls to Edge Function  │
│  └────┬─────┘                                 │
└───────┼─────────────────────────────────────────┘
        │ HTTPS
        ▼
┌──────────────────────────────────────────────┐
│        Supabase Edge Function (Deno)          │
│                                               │
│  supabase/functions/api/index.ts              │
│  ├── Express.js router                        │
│  ├── Server-side validation                   │
│  ├── Service-role Supabase client             │
│  └── CORS headers on all responses            │
│                                               │
│  Routes:                                       │
│  ├── GET    /projects                         │
│  ├── GET    /projects/:id                     │
│  ├── POST   /projects                         │
│  ├── DELETE /projects/:id                     │
│  ├── GET    /tasks?projectId=xxx              │
│  ├── GET    /tasks/:id                       │
│  ├── POST   /tasks                           │
│  ├── PUT    /tasks/:id                       │
│  └── DELETE /tasks/:id                       │
└───────┬─────────────────────────────────────────┘
        │ Service role key (bypasses RLS)
        ▼
┌──────────────────────────────────────────────┐
│           Supabase (PostgreSQL)               │
│                                               │
│  ┌──────────┐       ┌──────────┐              │
│  │ projects │──1:n──│  tasks   │              │
│  └──────────┘       └──────────┘              │
│                                               │
│  Row-Level Security on all tables             │
│  Check constraints on status & priority       │
│  Trigger: auto-update tasks.updated_at        │
└──────────────────────────────────────────────┘
```

### Design decisions

1. **Edge Function API layer** — Instead of the browser talking directly to the database, all requests go through a Supabase Edge Function running Express.js. This centralizes validation, enables future auth middleware, and keeps database credentials server-side.

2. **Service-role client** — The Edge Function uses the service role key to bypass RLS, since access control is enforced at the API layer (not the database level for server-to-server calls).

3. **Server-side validation** — Every field is validated before the database query runs. Invalid requests return a `400` with a structured error object listing which fields failed.

4. **Database trigger** — A `BEFORE UPDATE` trigger automatically sets `updated_at = now()` on tasks, so the server never needs to pass a timestamp manually.

5. **Optimistic UI updates** — The frontend updates immediately and rolls back on failure, keeping the UX snappy while the API remains the source of truth.

## REST API

Base URL: `{SUPABASE_URL}/functions/v1/api`

### Projects

#### `GET /projects`
List all projects with aggregated task counts.

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Marketing Campaign",
    "description": "Q4 launch",
    "color": "blue",
    "created_at": "2026-10-22T...",
    "task_count": 5,
    "todo_count": 2,
    "in_progress_count": 1,
    "done_count": 2
  }
]
```

#### `GET /projects/:id`
Get a single project by ID.

**Response:** `200 OK` or `404` if not found.

#### `POST /projects`
Create a new project.

**Request body:**
```json
{
  "name": "Marketing Campaign",     // required, string, max 200 chars
  "description": "Q4 launch plan",   // optional, string, max 1000 chars
  "color": "blue"                   // optional, one of: blue, emerald, amber, rose, violet, slate
}
```

**Response:** `201 Created` or `400` with validation errors:
```json
{
  "error": "Validation failed",
  "details": {
    "name": "name is required and must be a non-empty string"
  }
}
```

#### `DELETE /projects/:id`
Delete a project and all its tasks (cascade).

**Response:** `204 No Content` or `404` if not found.

### Tasks

#### `GET /tasks?projectId=xxx`
List all tasks for a project, ordered by creation date (newest first).

**Response:** `200 OK` — array of task objects.

#### `GET /tasks/:id`
Get a single task by ID.

**Response:** `200 OK` or `404` if not found.

#### `POST /tasks`
Create a new task with full validation.

**Request body:**
```json
{
  "title": "Design landing page",      // required, string, max 500 chars
  "description": "Hero + CTA section",  // optional, string, max 2000 chars
  "status": "todo",                    // optional, one of: todo, in_progress, done
  "priority": "high",                  // optional, one of: low, medium, high
  "project_id": "uuid"                 // required, valid UUID
}
```

**Response:** `201 Created` or `400` with field-level validation errors.

#### `PUT /tasks/:id`
Update a task. Only provided fields are updated (partial update).

**Request body (all fields optional):**
```json
{
  "title": "Updated title",
  "description": "New details",
  "status": "in_progress",
  "priority": "medium"
}
```

**Response:** `200 OK` with the updated task, or `404` if not found.

#### `DELETE /tasks/:id`
Delete a task.

**Response:** `204 No Content` or `404` if not found.

## Data Model

### `projects`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `name` | text | NOT NULL |
| `description` | text | nullable |
| `color` | text | NOT NULL, default `'blue'` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

### `tasks`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | Primary key, auto-generated |
| `title` | text | NOT NULL |
| `description` | text | nullable |
| `status` | text | NOT NULL, CHECK in `('todo', 'in_progress', 'done')`, default `'todo'` |
| `priority` | text | NOT NULL, CHECK in `('low', 'medium', 'high')`, default `'medium'` |
| `project_id` | uuid | NOT NULL, FK → `projects(id)` ON DELETE CASCADE |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL, default `now()`, auto-updated by trigger |

### Indexes

- `tasks_project_id_idx` — Fast task lookups by project
- `tasks_status_idx` — Fast filtering by status
- `projects_created_at_idx` — Sorting projects by recency

## Database Triggers

### `tasks_set_updated_at`

A `BEFORE UPDATE` trigger on the `tasks` table that automatically sets `updated_at = now()` whenever a row is updated. This ensures the timestamp is always accurate without relying on the application to set it.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

## Validation

Server-side validation runs on every POST and PUT request before the database is touched:

| Field | Rule |
|-------|------|
| `name` (project) | Required, non-empty string, max 200 chars |
| `description` | Optional string, max 1000 (project) / 2000 (task) chars |
| `color` | Optional, must be one of: blue, emerald, amber, rose, violet, slate |
| `title` (task) | Required, non-empty string, max 500 chars |
| `status` | Optional, must be one of: todo, in_progress, done |
| `priority` | Optional, must be one of: low, medium, high |
| `project_id` | Required, must be a valid UUID |
| All IDs in URLs | Must be valid UUIDs |

Validation errors return `400 Bad Request` with a structured body:
```json
{
  "error": "Validation failed",
  "details": {
    "title": "title is required and must be a non-empty string",
    "project_id": "project_id must be a valid UUID"
  }
}
```

Additionally, the database enforces CHECK constraints on `status` and `priority` as a second line of defense.

## Security

- **Row-Level Security** enabled on every table
- Four separate policies per table (SELECT, INSERT, UPDATE, DELETE) — no `FOR ALL`
- Policies scoped to `anon, authenticated` for this no-auth demo
- Edge Function uses the service role key (server-side only, never exposed to the browser)
- Foreign key cascade deletes ensure no orphaned tasks
- Check constraints on `status` and `priority` at the database level
- UUID format validation on all ID parameters
- CORS headers configured on all responses (preflight, success, and error)

## Frontend Screens

### 1. Dashboard
- Stats bar: total projects, total tasks, completed tasks
- Search bar to filter projects by name or description
- Project grid with cards: name, description, color tag, per-status counts, progress bar
- "New Project" button opens a modal form

### 2. Project Detail
- Back navigation to dashboard
- Progress card: completion percentage, per-status breakdown
- Three-column Kanban board (To Do / In Progress / Done)
- Task cards with: title, description, priority badge, status badge
- Click-to-cycle status, edit/delete via menu
- "Add Task" button opens a modal form

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/sathwik-svg/SWYNEX-Backend-API-and-Database.git
cd SWYNEX-Backend-API-and-Database
npm install
```

### Environment variables
Supabase credentials are pre-configured. For local development:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Run
```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run typecheck  # Type checking
```

## Project Structure

```
src/
├── App.tsx                  # Main app: routing, state, screens
├── main.tsx                 # Entry point
├── index.css                # Tailwind directives
├── types/
│   └── index.ts             # Shared types + config maps
├── lib/
│   ├── supabase.ts           # Supabase client singleton
│   └── api.ts                # Typed API calls (fetch → Edge Function)
└── components/
    ├── Modal.tsx             # Reusable modal wrapper
    ├── ProjectCard.tsx       # Project card with progress bar
    ├── TaskCard.tsx          # Task card with status cycling
    └── forms.tsx             # AddProjectModal, AddTaskModal, EmptyState, ConfirmDialog

supabase/
├── config.toml               # Edge Function configuration
├── functions/
│   └── api/
│       └── index.ts          # Express.js REST API with validation
└── migrations/
    ├── 20261022020327_create_projects_and_tasks.sql
    └── 20261022020327_add_updated_at_trigger.sql
```

## Key Learnings

1. **Server-side validation is non-negotiable** — Client validation improves UX, but the server must independently validate every request. Structured error responses with field-level details help the frontend show meaningful messages.
2. **Edge Functions as API gateway** — A Supabase Edge Function with Express.js provides a clean REST API layer with routing, validation, and CORS — without provisioning a separate server.
3. **Database triggers for data integrity** — The `updated_at` trigger ensures timestamps are always correct, regardless of which client or API call modifies the row.
4. **Defense in depth** — Validation at the API layer plus CHECK constraints at the database level means invalid data can't slip through even if one layer is bypassed.
5. **Service role isolation** — The service role key stays server-side in the Edge Function. The browser only ever sees the anon key, keeping privileged access contained.

## License

This project is part of the SWYNEX Technologies internship program.

---

Built with React, TypeScript, Tailwind CSS, Supabase Edge Functions, and PostgreSQL.
