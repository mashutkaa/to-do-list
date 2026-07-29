import {
  CalendarDays,
  Check,
  ChevronUp,
  Circle,
  LoaderCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import EditTaskModal from './EditTaskModal.jsx';

const priorityConfig = {
  HIGH: {
    label: 'High',
    className: 'bg-status-high-bg text-status-high',
    dotClassName: 'bg-status-high',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-status-medium-bg text-status-medium',
    dotClassName: 'bg-status-medium',
  },
  LOW: {
    label: 'Low',
    className: 'bg-status-low-bg text-status-low',
    dotClassName: 'bg-status-low',
  },
};

const statusConfig = {
  PENDING: {
    label: 'До виконання',
    className: 'bg-slate-100 text-text-muted',
  },
  IN_PROGRESS: {
    label: 'В процесі',
    className: 'bg-status-medium-bg text-status-medium',
  },
  COMPLETED: {
    label: 'Виконано',
    className: 'bg-status-low-bg text-status-low',
  },
};

const formatDeadline = (deadline) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(deadline));

export default function TaskCard({
  task,
  onStatusChange,
  onDelete,
  onTaskUpdated = (_task) => {},
  isUpdating = false,
}) {
  const dropdownRef = useRef(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isCompleted = task.status === 'COMPLETED';
  const priority = priorityConfig[task.priority] ?? priorityConfig.MEDIUM;
  const currentStatus = statusConfig[task.status] ?? statusConfig.PENDING;
  const dueDate = task.deadline ?? task.dueDate;
  const isOverdue = Boolean(
    dueDate &&
      !isCompleted &&
      new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0),
  );

  useEffect(() => {
    if (!statusOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!dropdownRef.current?.contains(event.target)) {
        setStatusOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setStatusOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [statusOpen]);

  const toggleCompleted = () => {
    onStatusChange(task.id, isCompleted ? 'PENDING' : 'COMPLETED');
  };

  const selectStatus = (status) => {
    setStatusOpen(false);
    if (status !== task.status) onStatusChange(task.id, status);
  };

  const handleDelete = () => {
    if (window.confirm(`Видалити задачу «${task.title}»?`)) {
      onDelete(task.id);
    }
  };

  return (
    <article
      className={`group relative overflow-visible rounded-card border border-slate-100 bg-card-bg p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-shadow duration-200 ease-in-out hover:shadow-lg hover:shadow-violet-500/5 sm:p-5 ${
        statusOpen ? 'z-40' : 'z-0'
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={toggleCompleted}
            disabled={isUpdating}
            className={`mt-0.5 flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition ${
              isCompleted
                ? 'border-status-low bg-status-low text-white'
                : 'border-slate-300 text-transparent hover:border-primary'
            }`}
            aria-label={
              isCompleted
                ? 'Позначити як невиконану'
                : 'Позначити як виконану'
            }
          >
            {isUpdating ? (
              <LoaderCircle size={14} className="animate-spin text-primary" />
            ) : isCompleted ? (
              <Check size={14} strokeWidth={3} aria-hidden="true" />
            ) : (
              <Circle size={10} fill="currentColor" aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <h3
              className={`break-words text-base font-bold leading-snug text-text-main ${
                isCompleted ? 'line-through opacity-60' : ''
              }`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 break-words text-sm leading-5 text-text-muted">
                {task.description}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priority.className}`}
              >
                <span
                  className={`size-1.5 rounded-full ${priority.dotClassName}`}
                  aria-hidden="true"
                />
                {priority.label}
              </span>

              {dueDate && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-text-muted">
                    <CalendarDays size={13} aria-hidden="true" />
                    {formatDeadline(dueDate)}
                  </span>

                  {isOverdue && (
                    <span className="text-xs font-semibold text-rose-500">
                      (Прострочено)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 md:ml-4 md:shrink-0 md:justify-end md:border-0 md:pt-0">
          <div className="relative min-w-0 flex-1 md:flex-none" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setStatusOpen((open) => !open)}
              disabled={isUpdating}
              className={`flex h-10 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-input px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-40 ${currentStatus.className}`}
              aria-haspopup="listbox"
              aria-expanded={statusOpen}
              aria-label={`Статус задачі: ${currentStatus.label}`}
            >
              <span className="truncate">{currentStatus.label}</span>
              <ChevronUp
                size={15}
                className={`shrink-0 transition-transform ${
                  statusOpen ? '' : 'rotate-180'
                }`}
                aria-hidden="true"
              />
            </button>

            {statusOpen && (
              <div
                className="absolute bottom-full right-0 z-50 mb-2 w-full min-w-48 origin-bottom-right overflow-hidden rounded-input border border-gray-100 bg-card-bg p-1 shadow-lg md:bottom-auto md:top-full md:mt-2 md:mb-0 md:w-52 md:origin-top-right"
                role="listbox"
                aria-label="Оберіть статус задачі"
              >
                {Object.entries(statusConfig).map(
                  ([status, { label, className }]) => (
                    <button
                      key={status}
                      type="button"
                      role="option"
                      aria-selected={task.status === status}
                      onClick={() => selectStatus(status)}
                      className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition hover:bg-slate-50 ${
                        task.status === status ? className : 'text-text-main'
                      }`}
                    >
                      {label}
                      {task.status === status && (
                        <Check size={15} aria-hidden="true" />
                      )}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setStatusOpen(false);
              setEditOpen(true);
            }}
            disabled={isUpdating}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-input border border-slate-100 text-slate-400 transition hover:border-primary-light hover:bg-primary-light hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Редагувати задачу ${task.title}`}
          >
            <Pencil size={17} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isUpdating}
            className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-input border border-slate-100 text-slate-400 transition hover:border-status-high-bg hover:bg-status-high-bg hover:text-status-high disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={`Видалити задачу ${task.title}`}
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <EditTaskModal
        isOpen={editOpen}
        task={task}
        onClose={() => setEditOpen(false)}
        onTaskUpdated={onTaskUpdated}
      />
    </article>
  );
}
