import { Mail, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import api from '../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  'Не вдалося поділитися задачами. Спробуйте ще раз.';

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   tasks?: Array<{ id: string, title: string }>,
 *   onShared?: (result: unknown) => void | Promise<void>,
 * }} props
 */
export default function ShareTaskModal({
  isOpen,
  onClose,
  tasks = [],
  onShared = (_result) => {},
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allSelected =
    tasks.length > 0 && selectedTaskIds.length === tasks.length;

  useEffect(() => {
    if (!isOpen) return;

    setSelectedTaskIds([]);
    setEmail('');
    setErrors({});
    setError('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const clearFieldError = (field) => {
    if (!errors[field]) return;

    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleToggleTask = (taskId) => {
    setSelectedTaskIds((current) => {
      const next = current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId];

      return next;
    });

    setErrors((current) => {
      if (!current.tasks) return current;

      const willHaveSelection = selectedTaskIds.includes(taskId)
        ? selectedTaskIds.length > 1
        : true;

      if (!willHaveSelection) return current;

      const next = { ...current };
      delete next.tasks;
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedTaskIds([]);
      return;
    }

    setSelectedTaskIds(tasks.map((task) => task.id));
    clearFieldError('tasks');
  };

  const handleEmailChange = (event) => {
    setEmail(event.target.value);
    clearFieldError('email');
  };

  const handleEmailBlur = () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrors((current) => ({
        ...current,
        email: 'Введіть коректну email-адресу',
      }));
      return;
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setErrors((current) => ({
        ...current,
        email: 'Введіть коректну email-адресу',
      }));
      return;
    }

    clearFieldError('email');
  };

  const resetForm = () => {
    setSelectedTaskIds([]);
    setEmail('');
    setErrors({});
    setError('');
  };

  const resetAndClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const validate = () => {
    const nextErrors = {};
    const trimmedEmail = email.trim();

    if (selectedTaskIds.length === 0) {
      nextErrors.tasks = 'Оберіть хоча б одну задачу для надсилання';
    }

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      nextErrors.email = 'Введіть коректну email-адресу';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const response = await api.post('/tasks/share', {
        taskIds: selectedTaskIds,
        email: email.trim(),
      });

      await onShared(response.data);
      resetForm();
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) resetAndClose();
      }}
    >
      <section
        className="flex max-h-[95dvh] w-full flex-col rounded-t-card bg-white shadow-2xl sm:max-w-md sm:rounded-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-task-title"
      >
        <header className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Mail size={19} aria-hidden="true" />
            </span>
            <div>
              <h2
                id="share-task-title"
                className="text-lg font-extrabold text-text-main"
              >
                Поділитися задачами
              </h2>
              <p className="mt-0.5 text-sm text-text-muted">
                Оберіть задачі та вкажіть email отримувача
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition hover:bg-slate-100 hover:text-text-main"
            aria-label="Закрити"
          >
            <X size={19} />
          </button>
        </header>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-text-main">
                  Задачі <span className="text-rose-500">*</span>
                </p>
                {tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="cursor-pointer text-xs font-bold text-primary transition hover:text-primary-hover"
                  >
                    {allSelected ? 'Зняти виділення' : 'Обрати всі'}
                  </button>
                )}
              </div>

              <div
                className={`max-h-52 space-y-1 overflow-y-auto rounded-input border p-2 ${
                  errors.tasks
                    ? 'border-rose-500'
                    : 'border-slate-200'
                }`}
                role="group"
                aria-label="Список задач для шерингу"
              >
                {tasks.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-text-muted">
                    Немає задач для надсилання
                  </p>
                ) : (
                  tasks.map((task) => {
                    const isChecked = selectedTaskIds.includes(task.id);

                    return (
                      <label
                        key={task.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 transition hover:bg-slate-50 ${
                          isChecked ? 'bg-primary-light/50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleTask(task.id)}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300 text-primary accent-primary focus:ring-primary/30"
                        />
                        <span className="min-w-0 break-words text-sm font-medium text-text-main">
                          {task.title}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="inline-flex items-center rounded-full bg-primary-light px-2.5 py-1 text-xs font-bold text-primary">
                  Обрано задач: {selectedTaskIds.length}
                </span>
              </div>

              {errors.tasks && (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {errors.tasks}
                </p>
              )}
            </div>

            <label className="block text-sm font-bold text-text-main">
              Email користувача <span className="text-rose-500">*</span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={handleEmailBlur}
                autoComplete="email"
                placeholder="friend@example.com"
                aria-invalid={Boolean(errors.email)}
                className={`mt-1.5 h-11 w-full cursor-text rounded-input border px-3.5 font-normal text-text-main shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
                  errors.email
                    ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
                    : 'border-slate-200 focus:border-primary focus:ring-primary/10'
                }`}
              />
              {errors.email && (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {errors.email}
                </p>
              )}
            </label>

            {error && (
              <p
                className="rounded-input bg-red-50 px-3.5 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </p>
            )}
          </div>

          <footer className="grid shrink-0 grid-cols-1 gap-2 border-t border-slate-100 p-5 pt-4 sm:grid-cols-2 sm:p-6 sm:pt-4">
            <button
              type="button"
              onClick={resetAndClose}
              disabled={isSubmitting}
              className="order-2 h-11 cursor-pointer rounded-button border border-slate-200 bg-white text-sm font-bold text-text-main transition hover:bg-slate-50 disabled:opacity-60 sm:order-1"
            >
              Скасувати
            </button>
            <button
              type="submit"
              disabled={isSubmitting || tasks.length === 0}
              className="order-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-button bg-primary px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
            >
              <Send size={16} aria-hidden="true" />
              {isSubmitting ? 'Надсилаємо...' : 'Поділитися'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
