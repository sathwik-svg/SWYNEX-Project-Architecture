import { useState, useEffect } from 'react';
import { Plus, FolderPlus, Sparkles } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { PROJECT_COLORS, STATUS_CONFIG, PRIORITY_CONFIG } from '@/types';
import { createProject, createTask, updateTask } from '@/lib/api';
import Modal from '@/components/Modal';

interface AddProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function AddProjectModal({ open, onClose, onCreated }: AddProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createProject(name.trim(), description.trim(), color);
      setName('');
      setDescription('');
      setColor('blue');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Marketing Campaign"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-2">Color Tag</label>
          <div className="flex gap-2.5">
            {Object.entries(PROJECT_COLORS).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setColor(key)}
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.gradient} transition-all ${
                  color === key ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  editingTask: Task | null;
  onSaved: () => void;
}

export function AddTaskModal({ open, onClose, projectId, editingTask, onSaved }: AddTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (editingTask) {
        setTitle(editingTask.title);
        setDescription(editingTask.description || '');
        setStatus(editingTask.status);
        setPriority(editingTask.priority);
      } else {
        setTitle('');
        setDescription('');
        setStatus('todo');
        setPriority('medium');
      }
      setError(null);
    }
  }, [open, editingTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingTask) {
        await updateTask(editingTask.id, { title: title.trim(), description: description.trim(), status, priority });
      } else {
        await createTask(projectId, title.trim(), description.trim(), status, priority);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={editingTask ? 'Edit Task' : 'New Task'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add some details..."
            rows={2}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
            >
              {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all"
            >
              {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
                <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : editingTask ? 'Save Changes' : 'Add Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface EmptyStateProps {
  icon: 'project' | 'task';
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="mb-4 p-4 rounded-2xl bg-slate-100">
        {icon === 'project' ? <FolderPlus size={28} className="text-slate-400" /> : <Sparkles size={28} className="text-slate-400" />}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-5 max-w-sm">{subtitle}</p>
      <button
        onClick={onAction}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-sm font-medium text-white hover:bg-slate-900 transition-colors"
      >
        <Plus size={16} />
        {actionLabel}
      </button>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-sm font-medium text-white hover:bg-rose-700 transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
