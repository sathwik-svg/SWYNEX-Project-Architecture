export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectWithTaskCount extends Project {
  task_count: number;
  todo_count: number;
  in_progress_count: number;
  done_count: number;
}

export const PROJECT_COLORS: Record<string, { bg: string; text: string; border: string; dot: string; gradient: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', gradient: 'from-amber-500 to-orange-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500', gradient: 'from-rose-500 to-pink-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500', gradient: 'from-violet-500 to-purple-500' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500', gradient: 'from-slate-600 to-slate-800' },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; dot: string }> = {
  todo: { label: 'To Do', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' },
  in_progress: { label: 'In Progress', color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
  done: { label: 'Done', color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
};

export const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Low', color: 'text-slate-500', bg: 'bg-slate-100' },
  medium: { label: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50' },
  high: { label: 'High', color: 'text-rose-600', bg: 'bg-rose-50' },
};
