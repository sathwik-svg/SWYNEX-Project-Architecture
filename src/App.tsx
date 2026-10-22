import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, ArrowLeft, LayoutGrid, ListTodo, Circle, Clock, CheckCircle2, TrendingUp, Search, Github, Activity } from 'lucide-react';
import type { ProjectWithTaskCount, Task, TaskStatus } from '@/types';
import { STATUS_CONFIG, PROJECT_COLORS } from '@/types';
import {
  fetchProjectsWithCounts,
  fetchTasks,
  deleteProject,
  updateTaskStatus,
  deleteTask,
} from '@/lib/api';
import ProjectCard from '@/components/ProjectCard';
import TaskCard from '@/components/TaskCard';
import { AddProjectModal, AddTaskModal, EmptyState, ConfirmDialog } from '@/components/forms';

type View = 'dashboard' | 'project';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [projects, setProjects] = useState<ProjectWithTaskCount[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectWithTaskCount | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'project' | 'task'; id: string } | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectsWithCounts();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async (projectId: string) => {
    try {
      const data = await fetchTasks(projectId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const openProject = (project: ProjectWithTaskCount) => {
    setCurrentProject(project);
    setView('project');
    loadTasks(project.id);
  };

  const goDashboard = () => {
    setView('dashboard');
    setCurrentProject(null);
    setTasks([]);
    loadProjects();
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    const prev = tasks;
    setTasks((prevTasks) => prevTasks.map((t) => (t.id === taskId ? { ...t, status } : t)));
    try {
      await updateTaskStatus(taskId, status);
    } catch {
      setTasks(prev);
      setError('Failed to update task status');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirmDelete || confirmDelete.type !== 'project') return;
    try {
      await deleteProject(confirmDelete.id);
      setConfirmDelete(null);
      goDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirmDelete || confirmDelete.type !== 'task') return;
    const prev = tasks;
    setTasks((prevTasks) => prevTasks.filter((t) => t.id !== confirmDelete.id));
    setConfirmDelete(null);
    try {
      await deleteTask(confirmDelete.id);
    } catch {
      setTasks(prev);
      setError('Failed to delete task');
    }
  };

  const tasksByStatus = (status: TaskStatus) => tasks.filter((t) => t.status === status);
  const totalTasks = tasks.length;
  const doneTasks = tasksByStatus('done').length;
  const overallProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false),
    );
  }, [projects, searchQuery]);

  // ---- Dashboard View ----
  if (view === 'dashboard') {
    const totalAllTasks = projects.reduce((s, p) => s + p.task_count, 0);
    const totalDone = projects.reduce((s, p) => s + p.done_count, 0);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Header
          title="TaskFlow"
          subtitle="A clean task management workspace"
          icon={<LayoutGrid size={20} className="text-white" />}
        />
        <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Projects" value={projects.length} icon={<LayoutGrid size={18} />} color="bg-slate-100 text-slate-600" />
            <StatCard label="Total Tasks" value={totalAllTasks} icon={<ListTodo size={18} />} color="bg-blue-50 text-blue-600" />
            <StatCard label="Completed" value={totalDone} icon={<CheckCircle2 size={18} />} color="bg-emerald-50 text-emerald-600" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h2 className="text-lg font-semibold text-slate-800">Your Projects</h2>
            <div className="flex items-center gap-3">
              {projects.length > 0 && (
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search projects..."
                    className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all w-full sm:w-56"
                  />
                </div>
              )}
              <button
                onClick={() => setShowProjectModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-900 transition-colors whitespace-nowrap"
              >
                <Plus size={16} />
                New Project
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingGrid />
          ) : projects.length === 0 ? (
            <EmptyState
              icon="project"
              title="No projects yet"
              subtitle="Create your first project to start organizing tasks and tracking progress."
              actionLabel="Create Project"
              onAction={() => setShowProjectModal(true)}
            />
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search size={28} className="text-slate-300 mb-3" />
              <p className="text-sm text-slate-400">No projects match "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map((p) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onOpen={() => openProject(p)}
                  onDelete={() => setConfirmDelete({ type: 'project', id: p.id })}
                />
              ))}
            </div>
          )}
        </main>
        <Footer />

        <AddProjectModal open={showProjectModal} onClose={() => setShowProjectModal(false)} onCreated={loadProjects} />
        <ConfirmDialog
          open={confirmDelete?.type === 'project'}
          title="Delete Project"
          message="This will permanently delete the project and all its tasks. This cannot be undone."
          confirmLabel="Delete"
          onConfirm={handleDeleteProject}
          onCancel={() => setConfirmDelete(null)}
        />
      </div>
    );
  }

  // ---- Project Detail View ----
  const project = currentProject!;
  const colors = PROJECT_COLORS[project.color] || PROJECT_COLORS.blue;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header
        title={project.name}
        subtitle={project.description || 'No description'}
        icon={<span className={`w-5 h-5 rounded-lg bg-gradient-to-br ${colors.gradient} block`} />}
      />
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        <button
          onClick={goDashboard}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5 transition-colors"
        >
          <ArrowLeft size={15} />
          All Projects
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">Progress</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {doneTasks} of {totalTasks} tasks completed
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <TrendingUp size={16} />
              <span className="text-2xl font-bold">{overallProgress}%</span>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          <div className="mt-4 flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Circle size={10} className="text-slate-400" />
              {tasksByStatus('todo').length} To Do
            </span>
            <span className="flex items-center gap-1.5 text-blue-500">
              <Clock size={10} />
              {tasksByStatus('in_progress').length} In Progress
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 size={10} />
              {tasksByStatus('done').length} Done
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-slate-800">Tasks</h2>
          <button
            onClick={() => { setEditingTask(null); setShowTaskModal(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon="task"
            title="No tasks yet"
            subtitle="Add your first task to this project to start tracking your work."
            actionLabel="Add Task"
            onAction={() => { setEditingTask(null); setShowTaskModal(true); }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((status) => (
              <div key={status} className="bg-slate-100/60 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[status].dot}`} />
                    <h3 className="text-sm font-semibold text-slate-700">{STATUS_CONFIG[status].label}</h3>
                  </div>
                  <span className="text-xs text-slate-400 font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200">
                    {tasksByStatus(status).length}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {tasksByStatus(status).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={handleStatusChange}
                      onEdit={(t) => { setEditingTask(t); setShowTaskModal(true); }}
                      onDelete={(id) => setConfirmDelete({ type: 'task', id })}
                    />
                  ))}
                  {tasksByStatus(status).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No tasks here</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddTaskModal
        open={showTaskModal}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        projectId={project.id}
        editingTask={editingTask}
        onSaved={() => { loadTasks(project.id); loadProjects(); }}
      />
      <ConfirmDialog
        open={confirmDelete?.type === 'task'}
        title="Delete Task"
        message="This will permanently delete this task. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteTask}
        onCancel={() => setConfirmDelete(null)}
      />
      <Footer />
    </div>
  );
}

function Header({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-800 truncate">{title}</h1>
          <p className="text-xs text-slate-400 truncate">{subtitle}</p>
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
          <div className="h-1.5 bg-slate-200" />
          <div className="p-5">
            <div className="h-10 w-10 rounded-xl bg-slate-100 mb-3" />
            <div className="h-4 w-2/3 bg-slate-100 rounded mb-2" />
            <div className="h-3 w-full bg-slate-100 rounded mb-4" />
            <div className="h-2 w-full bg-slate-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mb-6 flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">
      <span>{message}</span>
      <button onClick={onDismiss} className="text-rose-400 hover:text-rose-600 transition-colors text-xs font-medium">
        Dismiss
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Activity size={14} className="text-slate-400" />
          <span>TaskFlow — built for the SWYNEX Technologies internship</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <span>React, TypeScript, Tailwind CSS &amp; Supabase</span>
          <Github size={14} className="text-slate-400" />
        </div>
      </div>
    </footer>
  );
}
