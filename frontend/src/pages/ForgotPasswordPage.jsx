import { AlertCircle, ArrowLeft, ArrowRight, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getErrorMessage = (error, fallback) => {
  const message = error.response?.data?.message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

const inputClassName = (hasError) =>
  `h-12 w-full cursor-text rounded-input border bg-primary-light/60 px-4 text-sm text-text-main shadow-sm transition placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 ${
    hasError
      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-200'
      : 'border-transparent hover:border-primary/20 focus:border-primary focus:ring-primary/10'
  }`;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value) => {
    if (!value.trim()) return 'Введіть email';
    if (!EMAIL_PATTERN.test(value.trim())) return 'Введіть коректний email';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError);
    if (nextEmailError) return;

    setIsSubmitting(true);

    try {
      const response = await api.post('/auth/forgot-password', {
        email: email.trim(),
      });

      setSuccessMessage(
        response.data.message ||
          'Якщо акаунт із цим email існує, ми надіслали інструкції для відновлення пароля.',
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Не вдалося надіслати лист. Спробуйте пізніше',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg px-4 py-8 sm:px-6 sm:py-10">
      <section
        className="w-full max-w-[440px] rounded-card bg-card-bg p-6 shadow-[0_20px_60px_rgba(76,29,149,0.1)] sm:p-8"
        aria-labelledby="forgot-title"
      >
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)]">
            <ListChecks size={28} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <h1
            id="forgot-title"
            className="text-2xl font-bold tracking-tight text-text-main"
          >
            Забули пароль?
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Вкажіть email — надішлемо посилання для відновлення
          </p>
        </header>

        {successMessage ? (
          <div className="space-y-5">
            <div
              className="rounded-input border border-status-low/20 bg-status-low-bg/50 px-3.5 py-3 text-sm font-medium text-status-low"
              role="status"
            >
              {successMessage}
            </div>
            <Link
              to="/auth"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)] transition hover:bg-primary-hover"
            >
              Повернутися до входу
            </Link>
          </div>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text-main">
                Email <span className="text-rose-500">*</span>
              </span>
              <input
                type="email"
                name="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (emailError) setEmailError('');
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={Boolean(emailError)}
                className={inputClassName(Boolean(emailError))}
              />
              {emailError && (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {emailError}
                </p>
              )}
            </label>

            {error && (
              <div
                className="flex items-start gap-2.5 rounded-input border border-rose-200 bg-rose-50 px-3.5 py-3"
                role="alert"
              >
                <AlertCircle
                  size={17}
                  className="mt-0.5 shrink-0 text-rose-500"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-rose-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-button bg-primary px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(124,58,237,0.22)] transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Надсилаємо...' : 'Надіслати посилання'}
              {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-2 transition hover:text-primary-hover hover:underline"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Назад до входу
          </Link>
        </p>
      </section>
    </main>
  );
}
