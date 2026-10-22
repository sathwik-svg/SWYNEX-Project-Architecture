/*
# Add auto-updating updated_at trigger for tasks

1. Changes
- Creates a trigger function `set_updated_at()` that sets `updated_at = now()` on row update.
- Creates a trigger `tasks_set_updated_at` that fires BEFORE UPDATE on the `tasks` table.
- This ensures `updated_at` is always accurate without relying on the client to set it.

2. Security
- No RLS changes. The trigger function runs with SECURITY INVOKER, so it respects the caller's permissions.

3. Important Notes
- The trigger function uses `DROP IF EXISTS` + `CREATE OR REPLACE` for idempotency.
- The trigger itself is dropped and recreated to avoid duplicate-trigger errors on re-run.
*/

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

DROP TRIGGER IF EXISTS tasks_set_updated_at ON tasks;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();