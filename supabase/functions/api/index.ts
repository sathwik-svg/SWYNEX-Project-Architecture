import express from "npm:express@4.19.2";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const app = express();
app.use(express.json());

// --- Supabase client with service role for DB access ---
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- Validation helpers ---

const VALID_STATUSES = ["todo", "in_progress", "done"];
const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_COLORS = ["blue", "emerald", "amber", "rose", "violet", "slate"];

function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function sendError(res: express.Response, status: number, message: string, details?: unknown) {
  return res.status(status).json({ error: message, ...(details ? { details } : {}) });
}

// --- Projects routes ---

// GET /projects — list all projects with task counts
app.get("/projects", async (_req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return sendError(res, 500, "Database error", error.message);

    const { data: tasks } = await supabase
      .from("tasks")
      .select("project_id, status");

    const counts = new Map<string, { total: number; todo: number; in_progress: number; done: number }>();
    for (const p of projects || []) {
      counts.set(p.id, { total: 0, todo: 0, in_progress: 0, done: 0 });
    }
    for (const t of tasks || []) {
      const c = counts.get(t.project_id);
      if (!c) continue;
      c.total++;
      if (t.status === "todo") c.todo++;
      else if (t.status === "in_progress") c.in_progress++;
      else if (t.status === "done") c.done++;
    }

    const result = (projects || []).map((p) => ({
      ...p,
      task_count: counts.get(p.id)!.total,
      todo_count: counts.get(p.id)!.todo,
      in_progress_count: counts.get(p.id)!.in_progress,
      done_count: counts.get(p.id)!.done,
    }));

    return res.json(result);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// GET /projects/:id — get a single project
app.get("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return sendError(res, 400, "Invalid project ID format");

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return sendError(res, 500, "Database error", error.message);
    if (!data) return sendError(res, 404, "Project not found");

    return res.json(data);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// POST /projects — create a project with validation
app.post("/projects", async (req, res) => {
  try {
    const { name, description, color } = req.body || {};

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return sendError(res, 400, "Validation failed", { name: "name is required and must be a non-empty string" });
    }
    if (name.trim().length > 200) {
      return sendError(res, 400, "Validation failed", { name: "name must be 200 characters or fewer" });
    }
    if (description !== undefined && description !== null && typeof description !== "string") {
      return sendError(res, 400, "Validation failed", { description: "description must be a string" });
    }
    if (description && description.length > 1000) {
      return sendError(res, 400, "Validation failed", { description: "description must be 1000 characters or fewer" });
    }
    if (color !== undefined && color !== null) {
      if (typeof color !== "string" || !VALID_COLORS.includes(color)) {
        return sendError(res, 400, "Validation failed", { color: `color must be one of: ${VALID_COLORS.join(", ")}` });
      }
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "blue",
      })
      .select()
      .single();

    if (error) return sendError(res, 500, "Database error", error.message);

    return res.status(201).json(data);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// DELETE /projects/:id — delete a project (cascades tasks)
app.delete("/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return sendError(res, 400, "Invalid project ID format");

    const { error, count } = await supabase
      .from("projects")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return sendError(res, 500, "Database error", error.message);
    if (count === 0) return sendError(res, 404, "Project not found");

    return res.status(204).send();
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// --- Tasks routes ---

// GET /tasks?projectId=xxx — list tasks for a project
app.get("/tasks", async (req, res) => {
  try {
    const projectId = req.query.projectId as string;

    if (!projectId) return sendError(res, 400, "Missing required query parameter: projectId");
    if (!isValidUUID(projectId)) return sendError(res, 400, "Invalid projectId format");

    // Verify project exists
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) return sendError(res, 404, "Project not found");

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) return sendError(res, 500, "Database error", error.message);

    return res.json(data || []);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// GET /tasks/:id — get a single task
app.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return sendError(res, 400, "Invalid task ID format");

    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) return sendError(res, 500, "Database error", error.message);
    if (!data) return sendError(res, 404, "Task not found");

    return res.json(data);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// POST /tasks — create a task with full validation
app.post("/tasks", async (req, res) => {
  try {
    const { title, description, status, priority, project_id } = req.body || {};

    // Validation
    const errors: Record<string, string> = {};

    if (!title || typeof title !== "string" || !title.trim()) {
      errors.title = "title is required and must be a non-empty string";
    } else if (title.trim().length > 500) {
      errors.title = "title must be 500 characters or fewer";
    }

    if (!project_id || typeof project_id !== "string") {
      errors.project_id = "project_id is required";
    } else if (!isValidUUID(project_id)) {
      errors.project_id = "project_id must be a valid UUID";
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      errors.description = "description must be a string";
    }
    if (description && description.length > 2000) {
      errors.description = "description must be 2000 characters or fewer";
    }

    if (status !== undefined && status !== null) {
      if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
        errors.status = `status must be one of: ${VALID_STATUSES.join(", ")}`;
      }
    }

    if (priority !== undefined && priority !== null) {
      if (typeof priority !== "string" || !VALID_PRIORITIES.includes(priority)) {
        errors.priority = `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "Validation failed", errors);
    }

    // Verify project exists
    const { data: project } = await supabase
      .from("projects")
      .select("id")
      .eq("id", project_id)
      .maybeSingle();

    if (!project) return sendError(res, 404, "Project not found", { project_id });

    const { data, error: insertError } = await supabase
      .from("tasks")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "todo",
        priority: priority || "medium",
        project_id,
      })
      .select()
      .single();

    if (insertError) return sendError(res, 500, "Database error", insertError.message);

    return res.status(201).json(data);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// PUT /tasks/:id — update a task with validation
app.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return sendError(res, 400, "Invalid task ID format");

    const { title, description, status, priority } = req.body || {};
    const errors: Record<string, string> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        errors.title = "title must be a non-empty string";
      } else if (title.trim().length > 500) {
        errors.title = "title must be 500 characters or fewer";
      }
    }

    if (description !== undefined && description !== null && typeof description !== "string") {
      errors.description = "description must be a string or null";
    }
    if (typeof description === "string" && description.length > 2000) {
      errors.description = "description must be 2000 characters or fewer";
    }

    if (status !== undefined) {
      if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
        errors.status = `status must be one of: ${VALID_STATUSES.join(", ")}`;
      }
    }

    if (priority !== undefined) {
      if (typeof priority !== "string" || !VALID_PRIORITIES.includes(priority)) {
        errors.priority = `priority must be one of: ${VALID_PRIORITIES.join(", ")}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return sendError(res, 400, "Validation failed", errors);
    }

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    if (Object.keys(updates).length === 0) {
      return sendError(res, 400, "No fields to update");
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return sendError(res, 500, "Database error", error.message);
    if (!data) return sendError(res, 404, "Task not found");

    return res.json(data);
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// DELETE /tasks/:id — delete a task
app.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return sendError(res, 400, "Invalid task ID format");

    const { error, count } = await supabase
      .from("tasks")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) return sendError(res, 500, "Database error", error.message);
    if (count === 0) return sendError(res, 404, "Task not found");

    return res.status(204).send();
  } catch (err) {
    return sendError(res, 500, "Internal server error", (err as Error).message);
  }
});

// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// --- Start server ---
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  return await app(req);
});
