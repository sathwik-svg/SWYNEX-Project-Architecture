import { Folder, MoreVertical, Trash2, CheckCircle2, Clock, Circle } from 'lucide-react';
import type { ProjectWithTaskCount } from '@/types';
import { PROJECT_COLORS } from '@/types';

interface ProjectCardProps {
  project: ProjectWithTaskCount;
  onOpen: () => void;
  onDelete: () => void;
}

export default function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  const colors = PROJECT_COLORS[project.color] || PROJECT_COLORS.blue;
  const completion = project.task_count > 0 ? Math.round((project.done_count / project.task_count) * 100) : 0;

  return (
    <div
      onClick={onOpen}
      className="group relative cursor-pointer bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 hover:-translate-y-0.5 animate-slide-up"
    >
      <div className={`h-1.5 bg-gradient-to-r ${colors.gradient}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${colors.bg}`}>
            <Folder size={20} className={colors.text} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
        <h3 className="font-semibold text-slate-800 text-base mb-1 line-clamp-1">{project.name}</h3>
        <p className="text-sm text-slate-500 line-clamp-2 mb-4 min-h-[2.5rem]">
          {project.description || 'No description'}
        </p>

        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Circle size={12} className="text-slate-400" />
            <span>{project.todo_count}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-500">
            <Clock size={12} />
            <span>{project.in_progress_count}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-500">
            <CheckCircle2 size={12} />
            <span>{project.done_count}</span>
          </div>
          <div className="ml-auto text-xs font-medium text-slate-400">
            {project.task_count} total
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${colors.gradient} rounded-full transition-all duration-500`}
            style={{ width: `${completion}%` }}
          />
        </div>
        <div className="mt-1.5 text-xs text-slate-400 font-medium">{completion}% complete</div>
      </div>
    </div>
  );
}
