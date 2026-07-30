import { AlertCircle, ArrowRight, Eye, EyeOff, ListChecks } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const MIN_PASSWORD_LENGTH = 6;

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

const getPasswordError = (value) => {
  if (!value) return 'Введіть пароль';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return 'Пароль має містити щонайменше 6 символів';
  }
  return '';
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get('token')?.trim() || '',
    [searchParams],
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-app-bg px-4 py-8 sm:px-6 sm:py-10">
        <section className="w-full max-w-[440px] rounded-card bg-card-bg p-6 text-center shadow-[0_20px_60px_rgba(76,29,149,0.1)] sm:p-8">
          <h1 className="text-xl font-bold text-text-main">
            Посилання недійсне
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            У посиланні немає токена. Запросіть нове відновлення пароля.
          </p>
          <Link
            to="/auth/forgot-password"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-button bg-primary px-5 text-sm font-bold text-white transition hover:bg-primary-hover"
          >
            Забути пароль знову
          </Link>
        </section>
      </main>
    );
  }

  const validate = () => {
    const nextErrors = {};
    const passwordError = getPasswordError(password);
    if (passwordError) nextErrors.password = passwordError;

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Підтвердіть пароль';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Паролі не збігаються';
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
      const response = await api.post('/auth/reset-password', {
        token,
        password,
      });

      const { token: authToken, user } = response.data;

      if (!authToken || !user?.id || !user?.email) {
        throw new Error('Invalid authentication response');
      }

      login({
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name?.trim() || '',
        },
      });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          'Не вдалося оновити пароль. Спробуйте пізніше',
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
        aria-labelledby="reset-title"
      >
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)]">
            <ListChecks size={28} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <h1
            id="reset-title"
            className="text-2xl font-bold tracking-tight text-text-main"
          >
            Новий пароль
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Введіть новий пароль для свого акаунту
          </p>
        </header>

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text-main">
              Новий пароль <span className="text-rose-500">*</span>
            </span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) {
                    setErrors((current) => {
                      const next = { ...current };
                      delete next.password;
                      return next;
                    });
                  }
                }}
                autoComplete="new-password"
                placeholder="Мінімум 6 символів"
                aria-invalid={Boolean(errors.password)}
                className={`${inputClassName(Boolean(errors.password))} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-input text-text-muted transition hover:text-primary"
                aria-label={
                  showPassword ? 'Приховати пароль' : 'Показати пароль'
                }
              >
                {showPassword ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </span>
            {errors.password && (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errors.password}
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text-main">
              Підтвердження пароля <span className="text-rose-500">*</span>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (errors.confirmPassword) {
                  setErrors((current) => {
                    const next = { ...current };
                    delete next.confirmPassword;
                    return next;
                  });
                }
              }}
              autoComplete="new-password"
              placeholder="Повторіть пароль"
              aria-invalid={Boolean(errors.confirmPassword)}
              className={inputClassName(Boolean(errors.confirmPassword))}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errors.confirmPassword}
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
            {isSubmitting ? 'Зберігаємо...' : 'Зберегти пароль'}
            {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          <Link
            to="/auth"
            className="font-semibold text-primary underline-offset-2 transition hover:text-primary-hover hover:underline"
          >
            Повернутися до входу
          </Link>
        </p>
      </section>
    </main>
  );
}
