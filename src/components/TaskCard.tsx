import { useState } from 'react';
import { GripVertical, Trash2, Pencil, AlignLeft, MoreVertical } from 'lucide-react';
import type { Task, TaskStatus, TaskPriority } from '@/types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/types';

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const NEXT_STATUS: Record<TaskStatus, TaskStatus> = {
  todo: 'in_progress',
  in_progress: 'done',
  done: 'todo',
};

export default function TaskCard({ task, onStatusChange, onEdit, onDelete }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === 'done';

  return (
    <div className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div className="flex items-start gap-2">
        <button
          onClick={() => onStatusChange(task.id, NEXT_STATUS[task.status])}
          className={`mt-0.5 p-1 rounded-md ${statusCfg.bg} ${statusCfg.color} hover:opacity-80 transition-opacity flex-shrink-0`}
          title={`Click to move to ${STATUS_CONFIG[NEXT_STATUS[task.status]].label}`}
        >
          <GripVertical size={14} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium text-slate-700 ${isDone ? 'line-through text-slate-400' : ''}`}>
              {task.title}
            </h4>
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-md text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-7 z-20 bg-white rounded-lg shadow-lg border border-slate-200 py-1 w-36">
                    <button
                      onClick={() => { onEdit(task); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      onClick={() => { onDelete(task.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {task.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2 flex items-start gap-1">
              <AlignLeft size={11} className="mt-0.5 text-slate-400 flex-shrink-0" />
              {task.description}
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${priorityCfg.bg} ${priorityCfg.color}`}>
              {priorityCfg.label}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
