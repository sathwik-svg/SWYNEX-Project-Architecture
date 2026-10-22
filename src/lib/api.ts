import { supabase } from '@/lib/supabase';
import type { Project, Task, ProjectWithTaskCount, TaskStatus, TaskPriority } from '@/types';

// ---- Projects ----

export async function fetchProjectsWithCounts(): Promise<ProjectWithTaskCount[]> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!projects || projects.length === 0) return [];

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('project_id, status');

  if (tasksError) throw tasksError;

  const counts = new Map<string, { total: number; todo: number; in_progress: number; done: number }>();
  for (const p of projects) {
    counts.set(p.id, { total: 0, todo: 0, in_progress: 0, done: 0 });
  }
  for (const t of tasks || []) {
    const c = counts.get(t.project_id);
    if (!c) continue;
    c.total++;
    if (t.status === 'todo') c.todo++;
    else if (t.status === 'in_progress') c.in_progress++;
    else if (t.status === 'done') c.done++;
  }

  return projects.map((p) => ({
    ...p,
    task_count: counts.get(p.id)!.total,
    todo_count: counts.get(p.id)!.todo,
    in_progress_count: counts.get(p.id)!.in_progress,
    done_count: counts.get(p.id)!.done,
  }));
}

export async function createProject(name: string, description: string, color: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, description: description || null, color })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ---- Tasks ----

export async function fetchTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority,
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      status,
      priority,
      project_id: projectId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateTask(
  id: string,
  fields: { title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority },
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
