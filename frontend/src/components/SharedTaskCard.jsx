import { CalendarDays, Mail, UserRound } from 'lucide-react';

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

const formatSharedAt = (value) =>
  new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export default function SharedTaskCard({ task }) {
  const isCompleted = task.status === 'COMPLETED';
  const priority = priorityConfig[task.priority] ?? priorityConfig.MEDIUM;
  const currentStatus = statusConfig[task.status] ?? statusConfig.PENDING;
  const dueDate = task.deadline ?? task.dueDate;
  const sharedAt = task.shares?.[0]?.createdAt;
  const ownerName = task.user?.name?.trim();
  const ownerEmail = task.user?.email;
  const ownerLabel = ownerName || ownerEmail || 'користувач';

  const isOverdue = Boolean(
    dueDate &&
      !isCompleted &&
      new Date(dueDate).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0),
  );

  return (
    <article className="rounded-card border border-slate-100 bg-card-bg p-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 font-semibold text-primary">
          <UserRound size={13} aria-hidden="true" />
          Від: {ownerLabel}
        </span>
        {ownerName && ownerEmail && (
          <span className="inline-flex items-center gap-1.5 truncate">
            <Mail size={13} aria-hidden="true" />
            {ownerEmail}
          </span>
        )}
        {sharedAt && (
          <span className="ml-auto text-[11px] font-medium sm:text-xs">
            {formatSharedAt(sharedAt)}
          </span>
        )}
      </div>

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
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${priority.className}`}
        >
          <span
            className={`size-1.5 rounded-full ${priority.dotClassName}`}
            aria-hidden="true"
          />
          {priority.label}
        </span>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${currentStatus.className}`}
        >
          {currentStatus.label}
        </span>

        {dueDate && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-text-muted">
            <CalendarDays size={13} aria-hidden="true" />
            {formatDeadline(dueDate)}
          </span>
        )}

        {isOverdue && (
          <span className="text-xs font-semibold text-rose-500">
            (Прострочено)
          </span>
        )}
      </div>
    </article>
  );
}
