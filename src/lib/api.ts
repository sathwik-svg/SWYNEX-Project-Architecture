import { supabase } from '@/lib/supabase';
import type { Project, Task, ProjectWithTaskCount, TaskStatus, TaskPriority } from '@/types';

// ---- Edge Function API ----

const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api`;

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    ...(session.session?.access_token ? { 'X-Auth-Token': session.session.access_token } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let details: unknown;
    try {
      const body = await res.json();
      message = body.error || message;
      details = body.details;
    } catch {
      // Non-JSON error response
    }
    const err = new Error(message) as Error & { status: number; details?: unknown };
    err.status = res.status;
    err.details = details;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return await res.json() as T;
}

// ---- Projects ----

export async function fetchProjectsWithCounts(): Promise<ProjectWithTaskCount[]> {
  return apiRequest<ProjectWithTaskCount[]>('/projects');
}

export async function createProject(name: string, description: string, color: string): Promise<Project> {
  return apiRequest<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description, color }),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await apiRequest<void>(`/projects/${id}`, { method: 'DELETE' });
}

// ---- Tasks ----

export async function fetchTasks(projectId: string): Promise<Task[]> {
  return apiRequest<Task[]>(`/tasks?projectId=${projectId}`);
}

export async function createTask(
  projectId: string,
  title: string,
  description: string,
  status: TaskStatus,
  priority: TaskPriority,
): Promise<Task> {
  return apiRequest<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      status,
      priority,
      project_id: projectId,
    }),
  });
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

export async function updateTask(
  id: string,
  fields: { title?: string; description?: string; status?: TaskStatus; priority?: TaskPriority },
): Promise<Task> {
  return apiRequest<Task>(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' });
}
