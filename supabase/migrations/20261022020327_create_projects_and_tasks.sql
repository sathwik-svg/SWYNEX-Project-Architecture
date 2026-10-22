/*
# Create projects and tasks tables (single-tenant, no auth)

1. New Tables
- `projects`
  - `id` (uuid, primary key)
  - `name` (text, not null) — project name
  - `description` (text, nullable) — optional project description
  - `color` (text, default 'blue') — color tag for visual distinction
  - `created_at` (timestamptz, default now())
- `tasks`
  - `id` (uuid, primary key)
  - `title` (text, not null) — task title
  - `description` (text, nullable) — optional task details
  - `status` (text, default 'todo') — one of 'todo', 'in_progress', 'done'
  - `priority` (text, default 'medium') — one of 'low', 'medium', 'high'
  - `project_id` (uuid, foreign key → projects.id, cascade delete)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())

2. Indexes
- `tasks_project_id_idx` on `tasks(project_id)` for fast joins
- `tasks_status_idx` on `tasks(status)` for filtering by status
- `projects_created_at_idx` on `projects(created_at DESC)`

3. Security
- Enable RLS on both tables.
- All CRUD open to `anon, authenticated` since this is a single-tenant demo app with no sign-in screen.
- Using (true) is acceptable because the data is intentionally shared/public.

4. Important Notes
- No auth/sign-in screen → anon-key client needs full CRUD.
- Cascade delete ensures tasks are removed when a project is deleted.
*/

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON projects(created_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_tasks" ON tasks;
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tasks" ON tasks;
CREATE POLICY "anon_insert_tasks" ON tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tasks" ON tasks;
CREATE POLICY "anon_update_tasks" ON tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tasks" ON tasks;
CREATE POLICY "anon_delete_tasks" ON tasks FOR DELETE
  TO anon, authenticated USING (true);