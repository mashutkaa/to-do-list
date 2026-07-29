import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import api from '../services/api.js';

const priorities = [
  {
    value: 'LOW',
    label: 'Низький',
    dot: 'bg-status-low',
    active: 'border-status-low bg-status-low-bg/40',
  },
  {
    value: 'MEDIUM',
    label: 'Середній',
    dot: 'bg-status-medium',
    active: 'border-status-medium bg-status-medium-bg/40',
  },
  {
    value: 'HIGH',
    label: 'Високий',
    dot: 'bg-status-high',
    active: 'border-status-high bg-status-high-bg/40',
  },
];

const toFormData = (task) => ({
  title: task?.title ?? '',
  description: task?.description ?? '',
  priority: task?.priority ?? 'MEDIUM',
  status: task?.status ?? 'PENDING',
  deadline: task?.deadline ? task.deadline.slice(0, 10) : '',
});

const getErrorMessage = (error) =>
  error.response?.data?.message ||
  'Не вдалося оновити задачу. Спробуйте ще раз.';

const inputClassName = (hasError) =>
  `mt-1.5 h-11 w-full cursor-text rounded-input border px-3.5 font-normal text-text-main shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
      : 'border-slate-200 focus:border-primary focus:ring-primary/10'
  }`;

export default function EditTaskModal({
  isOpen,
  task,
  onClose,
  onTaskUpdated = (_task) => {},
}) {
  const [formData, setFormData] = useState(() => toFormData(task));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !task) return;

    setFormData(toFormData(task));
    setErrors({});
    setError('');
  }, [isOpen, task]);

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

  if (!isOpen || !task) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (errors[name]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const handleTitleBlur = () => {
    if (!formData.title.trim()) {
      setErrors((current) => ({
        ...current,
        title: "Назва задачі є обов'язковою",
      }));
      return;
    }

    setErrors((current) => {
      if (!current.title) return current;
      const next = { ...current };
      delete next.title;
      return next;
    });
  };

  const resetAndClose = () => {
    if (isSubmitting) return;
    setFormData(toFormData(task));
    setErrors({});
    setError('');
    onClose();
  };

  const validate = () => {
    const nextErrors = {};

    if (!formData.title.trim()) {
      nextErrors.title = "Назва задачі є обов'язковою";
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
      const response = await api.patch(`/tasks/${task.id}`, {
        ...formData,
        title: formData.title.trim(),
        deadline: formData.deadline || null,
      });

      await onTaskUpdated(response.data.task);
      setErrors({});
      setError('');
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) resetAndClose();
      }}
    >
      <section
        className="max-h-[95dvh] w-full overflow-y-auto rounded-t-card bg-card-bg shadow-2xl sm:max-w-lg sm:rounded-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-title"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              id="edit-task-title"
              className="text-xl font-extrabold text-text-main"
            >
              Редагувати задачу
            </h2>
            <p className="mt-0.5 text-sm text-text-muted">
              Оновіть потрібні поля та збережіть зміни
            </p>
          </div>
          <button
            type="button"
            onClick={resetAndClose}
            disabled={isSubmitting}
            className="flex size-9 cursor-pointer items-center justify-center rounded-input text-text-muted transition hover:bg-slate-100"
            aria-label="Закрити"
          >
            <X size={19} />
          </button>
        </header>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="space-y-5 p-5 sm:p-6"
        >
          <label className="block text-sm font-bold text-text-main">
            Назва <span className="text-rose-500">*</span>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={updateField}
              onBlur={handleTitleBlur}
              autoFocus
              placeholder="Що потрібно зробити?"
              aria-invalid={Boolean(errors.title)}
              className={inputClassName(Boolean(errors.title))}
            />
            {errors.title && (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errors.title}
              </p>
            )}
          </label>

          <label className="block text-sm font-bold text-text-main">
            Опис
            <textarea
              name="description"
              value={formData.description}
              onChange={updateField}
              rows="4"
              placeholder="Додаткові деталі..."
              className="mt-1.5 w-full cursor-text resize-none rounded-input border border-slate-200 bg-slate-50/70 p-3.5 font-normal text-text-main transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2 sm:items-start">
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-text-main">
                Пріоритет
              </legend>
              <div className="space-y-2">
                {priorities.map((priority) => (
                  <label
                    key={priority.value}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-input border px-3 py-2.5 text-sm font-semibold transition ${
                      formData.priority === priority.value
                        ? priority.active
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority"
                      value={priority.value}
                      checked={formData.priority === priority.value}
                      onChange={updateField}
                      className="sr-only"
                    />
                    <span
                      className={`size-2 rounded-full ${priority.dot}`}
                      aria-hidden="true"
                    />
                    {priority.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-text-main">
                Статус
                <select
                  name="status"
                  value={formData.status}
                  onChange={updateField}
                  className="mt-1.5 h-11 w-full cursor-pointer rounded-input border border-slate-200 bg-white px-3 font-normal text-text-main focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                >
                  <option value="PENDING">До виконання</option>
                  <option value="IN_PROGRESS">В процесі</option>
                  <option value="COMPLETED">Виконано</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-text-main">
                Дедлайн
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={updateField}
                  className="mt-1.5 h-11 w-full cursor-pointer rounded-input border border-slate-200 px-3 font-normal text-text-main focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </label>
            </div>
          </div>

          {error && (
            <p
              className="rounded-input bg-red-50 px-3.5 py-3 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <footer className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
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
              disabled={isSubmitting}
              className="order-1 h-11 cursor-pointer rounded-button bg-primary text-sm font-bold text-white shadow-[0_8px_20px_rgba(124,58,237,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60 sm:order-2"
            >
              {isSubmitting ? 'Збереження...' : 'Зберегти зміни'}
            </button>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}
