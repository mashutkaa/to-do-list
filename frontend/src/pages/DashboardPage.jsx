import {
  ChevronDown,
  Inbox,
  ListChecks,
  LogOut,
  Plus,
  Share2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CreateTaskModal from '../components/CreateTaskModal.jsx';
import ShareTaskModal from '../components/ShareTaskModal.jsx';
import SharedTaskCard from '../components/SharedTaskCard.jsx';
import TaskCard from '../components/TaskCard.jsx';
import Toast from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const listViews = [
  { value: 'mine', label: 'Мої задачі' },
  { value: 'shared', label: 'Зі мною' },
];

const filters = [
  { value: 'ALL', label: 'Всі' },
  { value: 'PENDING', label: 'До виконання' },
  { value: 'IN_PROGRESS', label: 'В процесі' },
  { value: 'COMPLETED', label: 'Виконано' },
];

const sortOptions = [
  { value: 'deadline', label: 'За дедлайном' },
  { value: 'priority', label: 'За пріоритетом' },
  { value: 'createdAt', label: 'За датою створення' },
  { value: 'title', label: 'За назвою' },
];

const PRIORITY_ORDER = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

const getStartOfDay = (value = new Date()) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const isOverdueTask = (task, today = getStartOfDay()) => {
  if (!task.deadline || task.status === 'COMPLETED') return false;
  return getStartOfDay(task.deadline) < today;
};

const sortTasks = (taskList, sortBy, sortDirection = 'asc') => {
  const sorted = [...taskList];
  const today = getStartOfDay();

  switch (sortBy) {
    case 'priority':
      sorted.sort(
        (a, b) =>
          (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1),
      );
      break;
    case 'createdAt':
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case 'title':
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, 'uk', { sensitivity: 'base' }),
      );
      break;
    case 'deadline':
    default:
      sorted.sort((a, b) => {
        const aHasDeadline = Boolean(a.deadline);
        const bHasDeadline = Boolean(b.deadline);

        if (!aHasDeadline && !bHasDeadline) return 0;
        if (!aHasDeadline) return 1;
        if (!bHasDeadline) return -1;

        const aOverdue = isOverdueTask(a, today);
        const bOverdue = isOverdueTask(b, today);

        if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

        return getStartOfDay(a.deadline) - getStartOfDay(b.deadline);
      });
      break;
  }

  return sortDirection === 'desc' ? sorted.reverse() : sorted;
};

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  'Не вдалося виконати запит. Спробуйте ще раз.';

function ProfileMenu({ user, onLogout }) {
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'друже';

  const profileRef = useRef(null);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!profileOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [profileOpen]);

  return (
    <div className="relative" ref={profileRef}>
      <button
        type="button"
        onClick={() => setProfileOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-card-bg p-1.5 pr-2.5 shadow-sm transition hover:border-primary/30"
        aria-expanded={profileOpen}
        aria-label="Відкрити меню профілю"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-white">
          {displayName.charAt(0)}
        </span>
        <ChevronDown size={15} className="text-text-muted" />
      </button>

      {profileOpen && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-slate-100 bg-card-bg p-3 shadow-xl">
          <p className="truncate text-sm font-bold text-text-main">
            {displayName}
          </p>
          <p className="mt-0.5 truncate text-xs text-text-muted">
            {user?.email}
          </p>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(false);
              onLogout();
            }}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-status-high transition hover:bg-status-high-bg"
          >
            <LogOut size={16} />
            Вийти
          </button>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [listView, setListView] = useState('mine');
  const [tasks, setTasks] = useState([]);
  const [sharedTasks, setSharedTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('deadline');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [isSharedLoading, setIsSharedLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const isSharedView = listView === 'shared';

  const loadSharedTasks = async () => {
    setIsSharedLoading(true);

    try {
      const sharedResponse = await api.get('/tasks/shared-with-me');
      setSharedTasks(sharedResponse.data.tasks ?? []);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSharedLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const loadTasks = async () => {
      try {
        const [ownResponse, sharedResponse] = await Promise.all([
          api.get('/tasks'),
          api.get('/tasks/shared-with-me'),
        ]);

        if (!active) return;

        setTasks(ownResponse.data.tasks ?? []);
        setSharedTasks(sharedResponse.data.tasks ?? []);
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) {
          setIsLoading(false);
          setIsSharedLoading(false);
        }
      }
    };

    loadTasks();

    return () => {
      active = false;
    };
  }, []);

  const sourceTasks = isSharedView ? sharedTasks : tasks;

  const counts = useMemo(
    () => ({
      ALL: sourceTasks.length,
      PENDING: sourceTasks.filter((task) => task.status === 'PENDING').length,
      IN_PROGRESS: sourceTasks.filter((task) => task.status === 'IN_PROGRESS')
        .length,
      COMPLETED: sourceTasks.filter((task) => task.status === 'COMPLETED')
        .length,
    }),
    [sourceTasks],
  );

  const filteredTasks = useMemo(
    () =>
      activeFilter === 'ALL'
        ? sourceTasks
        : sourceTasks.filter((task) => task.status === activeFilter),
    [activeFilter, sourceTasks],
  );

  const visibleTasks = useMemo(
    () => sortTasks(filteredTasks, sortBy, sortDirection),
    [filteredTasks, sortBy, sortDirection],
  );

  const listLoading = isSharedView ? isSharedLoading : isLoading;

  const ownCompletedCount = tasks.filter(
    (task) => task.status === 'COMPLETED',
  ).length;
  const progress = tasks.length
    ? Math.round((ownCompletedCount / tasks.length) * 100)
    : 0;

  const today = new Intl.DateTimeFormat('uk-UA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const markUpdating = (taskId, updating) => {
    setUpdatingIds((current) => {
      const next = new Set(current);
      if (updating) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const handleStatusChange = async (taskId, status) => {
    markUpdating(taskId, true);
    setError('');

    try {
      const response = await api.patch(`/tasks/${taskId}/status`, { status });
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId ? response.data.task : task,
        ),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      markUpdating(taskId, false);
    }
  };

  const handleDelete = async (taskId) => {
    markUpdating(taskId, true);
    setError('');

    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((current) => current.filter((task) => task.id !== taskId));
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      markUpdating(taskId, false);
    }
  };

  const handleTaskCreated = (task) => {
    setTasks((current) => [task, ...current]);
    setNotice('Нову задачу створено');
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks((current) =>
      current.map((task) =>
        task.id === updatedTask.id ? updatedTask : task,
      ),
    );
    setNotice('Задачу успішно оновлено!');
  };

  const handleShared = (result) => {
    const count = result?.count ?? 1;
    setNotice(
      count > 1
        ? `Успішно надіслано задач: ${count}`
        : 'Успішно надіслано!',
    );
  };

  const handleFilterTabClick = (filterValue) => {
    if (activeFilter === filterValue) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setActiveFilter(filterValue);
  };

  const handleListViewChange = (view) => {
    setListView(view);
    setActiveFilter('ALL');
    setSortDirection('asc');
    setError('');

    if (view === 'shared') {
      loadSharedTasks();
    }
  };

  const handleSortChange = (event) => {
    setSortBy(event.target.value);
    setSortDirection('asc');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  return (
    <main className="min-h-dvh bg-app-bg px-4 py-6 sm:px-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)]">
                <ListChecks size={22} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-text-main sm:text-2xl">
                  Привіт, {user?.name}!
                </h1>
                <p className="mt-0.5 text-sm capitalize text-text-muted">
                  {today}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center md:hidden">
              <ProfileMenu user={user} onLogout={handleLogout} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={!tasks.length}
              className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-button border border-slate-200 bg-card-bg px-4 text-sm font-bold text-text-main shadow-sm transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Share2 size={17} />
              Поділитися
            </button>
            <button
              type="button"
              onClick={() => setNewTaskOpen(true)}
              className="flex h-11 items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.2)] transition hover:bg-primary-hover"
            >
              <Plus size={17} />
              Нова задача
            </button>
            <div className="hidden md:block">
              <ProfileMenu user={user} onLogout={handleLogout} />
            </div>
          </div>
        </header>

        <nav
          className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1"
          aria-label="Список задач"
        >
          {listViews.map((view) => {
            const count =
              view.value === 'mine' ? tasks.length : sharedTasks.length;
            const isActive = listView === view.value;

            return (
              <button
                key={view.value}
                type="button"
                onClick={() => handleListViewChange(view.value)}
                aria-pressed={isActive}
                className={`flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg text-sm font-bold transition ${
                  isActive
                    ? 'bg-white text-text-main shadow-sm'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                {view.value === 'shared' ? (
                  <Inbox size={16} aria-hidden="true" />
                ) : (
                  <ListChecks size={16} aria-hidden="true" />
                )}
                <span>{view.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? 'bg-primary-light text-primary'
                      : 'bg-white/70 text-text-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>

        {!isSharedView && (
          <section className="mb-5 rounded-card bg-card-bg p-5 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-text-main">Прогрес сьогодні</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  {progress}% задач виконано
                </p>
              </div>
              <span className="rounded-full bg-primary-light px-3 py-1 text-sm font-bold text-primary">
                {progress}%
              </span>
            </div>

            <div
              className="mb-4 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Прогрес виконання задач"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ['Всього', tasks.length, 'bg-slate-50 text-text-main'],
                [
                  'В процесі',
                  tasks.filter((task) => task.status === 'IN_PROGRESS').length,
                  'bg-status-medium-bg/55 text-status-medium',
                ],
                [
                  'Виконано',
                  ownCompletedCount,
                  'bg-status-low-bg/55 text-status-low',
                ],
              ].map(([label, value, className]) => (
                <div
                  key={label}
                  className={`rounded-xl px-2 py-3 text-center ${className}`}
                >
                  <p className="text-[11px] font-medium sm:text-xs">{label}</p>
                  <p className="mt-0.5 text-lg font-extrabold">{value}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {isSharedView && (
          <section className="mb-5 rounded-card border border-primary-light bg-primary-light/40 px-4 py-3 text-sm text-text-muted sm:px-5">
            Тут задачі, якими з вами поділилися. Перегляд лише для читання —
            змінювати їх може лише власник.
          </section>
        )}

        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            className="scrollbar-hide flex gap-2 overflow-x-auto pb-1"
            aria-label="Фільтри задач"
          >
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => handleFilterTabClick(filter.value)}
                aria-pressed={activeFilter === filter.value}
                className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeFilter === filter.value
                    ? 'bg-white text-text-main shadow-md'
                    : 'bg-slate-100/80 text-text-muted hover:bg-white'
                }`}
              >
                {filter.label}
                <span className="ml-1.5 opacity-70">{counts[filter.value]}</span>
              </button>
            ))}
          </nav>

          <label className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span className="sr-only">Сортування задач</span>
            <select
              value={sortBy}
              onChange={handleSortChange}
              className="h-9 cursor-pointer rounded-full border border-slate-200 bg-slate-100/80 px-3.5 text-sm font-semibold text-text-muted transition hover:bg-white focus:border-primary/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10"
              aria-label="Сортувати задачі"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <div
            className="mb-4 rounded-input bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {listLoading ? (
          <div className="space-y-3" aria-label="Завантаження задач">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-32 animate-pulse rounded-card bg-white"
              />
            ))}
          </div>
        ) : visibleTasks.length ? (
          <section
            className="space-y-3"
            aria-label={
              isSharedView ? 'Задачі, якими поділилися зі мною' : 'Список задач'
            }
          >
            {visibleTasks.map((task) =>
              isSharedView ? (
                <SharedTaskCard key={task.id} task={task} />
              ) : (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onTaskUpdated={handleTaskUpdated}
                  isUpdating={updatingIds.has(task.id)}
                />
              ),
            )}
          </section>
        ) : (
          <section className="rounded-card border border-dashed border-slate-200 bg-white/70 px-6 py-12 text-center">
            {isSharedView ? (
              <Inbox
                size={32}
                className="mx-auto text-primary/50"
                aria-hidden="true"
              />
            ) : (
              <ListChecks
                size={32}
                className="mx-auto text-primary/50"
                aria-hidden="true"
              />
            )}
            <h2 className="mt-3 font-bold text-text-main">
              {isSharedView
                ? 'Поки ніхто не поділився задачами'
                : 'Задач поки немає'}
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              {isSharedView
                ? 'Коли хтось надішле вам задачі на ваш email, вони з’являться тут.'
                : 'Створіть нову задачу або оберіть інший фільтр.'}
            </p>
          </section>
        )}
      </div>

      <CreateTaskModal
        isOpen={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
      />

      <ShareTaskModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        tasks={tasks}
        onShared={handleShared}
      />

      <Toast message={notice} onClose={() => setNotice('')} />
    </main>
  );
}
