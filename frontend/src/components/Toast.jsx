import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const variantConfig = {
  success: {
    Icon: CheckCircle2,
    borderClassName: 'border-status-low/20',
    iconClassName: 'bg-status-low-bg text-status-low',
  },
  warning: {
    Icon: AlertTriangle,
    borderClassName: 'border-status-medium/30',
    iconClassName: 'bg-status-medium-bg text-status-medium',
  },
};

export default function Toast({
  message,
  onClose,
  duration = 3500,
  variant = 'success',
}) {
  const { Icon, borderClassName, iconClassName } =
    variantConfig[variant] ?? variantConfig.success;

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message, onClose]);

  if (!message) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-4 z-[80] flex justify-center px-4 sm:top-6 sm:justify-end sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex w-full max-w-sm animate-[toast-in_0.28s_ease-out] items-start gap-3 rounded-xl border bg-card-bg px-4 py-3.5 shadow-[0_16px_40px_rgba(15,23,42,0.14)] ${borderClassName}`}
      >
        <span
          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
        >
          <Icon size={18} aria-hidden="true" />
        </span>
        <p className="min-w-0 flex-1 pt-1 text-sm font-semibold text-text-main">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-muted transition hover:bg-slate-100 hover:text-text-main"
          aria-label="Закрити повідомлення"
        >
          <X size={16} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
