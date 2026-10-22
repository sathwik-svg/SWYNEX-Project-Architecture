# SWYNEX-Project-Architecture — TaskFlow

A full-stack task management application built as part of the SWYNEX Technologies internship (Task 1: Project Architecture). TaskFlow lets users organize work into color-coded projects, break projects into prioritized tasks, and track progress through a Kanban-style board.

---

## Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Data Model](#data-model)
- [Frontend Screens](#frontend-screens)
- [Security](#security)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Learnings](#key-learnings)
- [License](#license)

---

## Overview

TaskFlow is a single-page application that demonstrates a clean, production-grade architecture: a typed React frontend talking directly to a Supabase (PostgreSQL) backend with row-level security. The goal of this project is to show end-to-end competency in planning a product, designing a data model, and building a polished user experience.

**Product idea:** A lightweight project management tool where users create projects, add tasks with priorities, and move them across a three-stage board (To Do → In Progress → Done).

## Live Demo

The app is deployed and ready to use. Create a project, add tasks, and watch the progress bar update in real time.

## Features

- **Project dashboard** — Grid of project cards with color tags, task counts per status, and completion progress bars
- **Kanban task board** — Three columns (To Do, In Progress, Done) with drag-free status cycling via click
- **Task management** — Create, edit, and delete tasks with title, description, status, and priority
- **Priority levels** — Low, Medium, and High priority badges for at-a-glance triage
- **Optimistic updates** — Status changes and deletions update the UI instantly, rolling back on failure
- **Empty states** — Guided onboarding when no projects or tasks exist
- **Confirmation dialogs** — Destructive actions (delete project/task) require explicit confirmation
- **Responsive design** — Works from mobile to desktop with adaptive grid layouts
- **Loading skeletons** — Animated placeholder cards while data loads

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Database | Supabase (PostgreSQL) |
| Client SDK | @supabase/supabase-js |

## Architecture

```
┌─────────────────────────────────────────┐
│              Browser (SPA)               │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Screens  │→ │ Components│→ │  Types │ │
│  │ (App.tsx)│  │ (cards,  │  │(shared) │ │
│  │          │  │ modals)  │  │        │ │
│  └────┬─────┘  └──────────┘  └────────┘ │
│       │                                 │
│  ┌────▼─────┐                           │
│  │ API Layer│  (src/lib/api.ts)         │
│  │ CRUD ops │                           │
│  └────┬─────┘                           │
│       │                                 │
│  ┌────▼─────┐                           │
│  │ Supabase │  (src/lib/supabase.ts)    │
│  │  Client  │                           │
│  └────┬─────┘                           │
└───────┼──────────────────────────────────┘
        │ HTTPS (anon key)
        ▼
┌─────────────────────────────────────────┐
│           Supabase (PostgreSQL)          │
│                                          │
│  ┌──────────┐       ┌──────────┐        │
│  │ projects │──1:n──│  tasks   │        │
│  └──────────┘       └──────────┘        │
│                                          │
│  Row-Level Security enabled on all tables│
└──────────────────────────────────────────┘
```

### Design decisions

1. **Direct-to-database pattern** — The browser client talks to Supabase using the anon key. Row-Level Security policies enforce access control at the database level, eliminating the need for a custom API server.

2. **Typed API layer** — All database operations are wrapped in `src/lib/api.ts` with TypeScript types, so components never touch Supabase directly. This keeps the data layer swappable and testable.

3. **Single-tenant (no auth)** — This demo runs without sign-in. All CRUD is open to the `anon` role via RLS policies. The schema is designed to support multi-tenancy later by adding `user_id` columns and `authenticated`-scoped policies.

4. **Optimistic UI updates** — Status changes and deletions update the UI immediately. If the server call fails, the previous state is restored and an error banner appears.

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
| `updated_at` | timestamptz | NOT NULL, default `now()` |

### Indexes

- `tasks_project_id_idx` — Fast task lookups by project
- `tasks_status_idx` — Fast filtering by status
- `projects_created_at_idx` — Sorting projects by recency

## Frontend Screens

### 1. Dashboard

- Stats bar: total projects, total tasks, completed tasks
- Project grid with cards showing: name, description, color tag, per-status counts, progress bar
- "New Project" button opens a modal form (name, description, color picker)
- Clicking a card navigates to the project detail view

### 2. Project Detail

- Back navigation to dashboard
- Progress card: completion percentage, per-status breakdown
- Three-column Kanban board (To Do / In Progress / Done)
- Each task card shows: title, description, priority badge, status badge
- Click the grip icon to cycle task status forward
- "More" menu per task for edit/delete
- "Add Task" button opens a modal form (title, description, status, priority)

## Security

- **Row-Level Security** enabled on every table
- Four separate policies per table (SELECT, INSERT, UPDATE, DELETE) — no `FOR ALL`
- Policies scoped to `anon, authenticated` since this is a no-auth demo
- Foreign key cascade deletes ensure no orphaned tasks
- Check constraints on `status` and `priority` prevent invalid values at the database level

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/<your-username>/SWYNEX-Project-Architecture.git
cd SWYNEX-Project-Architecture
npm install
```

### Environment variables

The Supabase credentials are pre-configured in `.env`. If running locally:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Run

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run typecheck # Type checking
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
│   └── api.ts                # Typed CRUD operations
└── components/
    ├── Modal.tsx             # Reusable modal wrapper
    ├── ProjectCard.tsx       # Project card with progress bar
    ├── TaskCard.tsx          # Task card with status cycling
    └── forms.tsx             # AddProjectModal, AddTaskModal, EmptyState, ConfirmDialog

supabase/
└── migrations/
    └── 20261022020327_create_projects_and_tasks.sql
```

## Key Learnings

1. **Architecture-first thinking** — Planning the data model, screen flow, and API boundaries before writing code leads to cleaner, more maintainable software.
2. **Row-Level Security as the API gatekeeper** — Supabase RLS policies replace a custom auth middleware, enforcing access control at the database level.
3. **Optimistic updates** — Updating the UI before the server confirms creates a snappy user experience, with rollback on failure as a safety net.
4. **Typed API layer** — Wrapping Supabase calls in typed functions prevents the client from coupling to the database client directly.
5. **Progressive disclosure** — Using modals for create/edit actions keeps the main views uncluttered.

## License

This project is part of the SWYNEX Technologies internship program.

---

Built with React, TypeScript, Tailwind CSS, and Supabase.
