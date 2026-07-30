import { AlertCircle, ArrowRight, Eye, EyeOff, ListChecks } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

const getNameError = (value) =>
  !value.trim() ? "Введіть ваше ім'я" : '';

const getEmailError = (value) => {
  if (!value.trim()) return 'Введіть email';
  if (!EMAIL_PATTERN.test(value.trim())) return 'Введіть коректний email';
  return '';
};

const getPasswordError = (value) => {
  if (!value) return 'Введіть пароль';
  if (value.length < MIN_PASSWORD_LENGTH) {
    return 'Пароль має містити щонайменше 6 символів';
  }
  return '';
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '' });
    setErrors({});
    setError('');
    setShowPassword(false);
  };

  const switchMode = (loginMode) => {
    setIsLogin(loginMode);
    resetForm();
  };

  const clearFieldError = (field) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const setFieldError = (field, message) => {
    setErrors((current) => {
      if (!message) {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      }

      return { ...current, [field]: message };
    });
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));

    if (name === 'password' && !isLogin) {
      if (!value) {
        clearFieldError('password');
      } else if (value.length < MIN_PASSWORD_LENGTH) {
        setFieldError(
          'password',
          'Пароль має містити щонайменше 6 символів',
        );
      } else {
        clearFieldError('password');
      }
      return;
    }

    if (errors[name]) {
      clearFieldError(name);
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;

    if (name === 'name' && !isLogin) {
      setFieldError(name, getNameError(value));
      return;
    }

    if (name === 'email') {
      setFieldError(name, getEmailError(value));
      return;
    }

    if (name === 'password') {
      setFieldError(name, getPasswordError(value));
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!isLogin) {
      const nameError = getNameError(formData.name);
      if (nameError) nextErrors.name = nameError;
    }

    const emailError = getEmailError(formData.email);
    if (emailError) nextErrors.email = emailError;

    const passwordError = getPasswordError(formData.password);
    if (passwordError) nextErrors.password = passwordError;

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      let response;

      if (isLogin) {
        response = await api.post('/auth/login', {
          email: formData.email.trim(),
          password: formData.password,
        });
      } else {
        response = await api.post('/auth/register', {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
        });

        if (!response.data.token) {
          response = await api.post('/auth/login', {
            email: formData.email.trim(),
            password: formData.password,
          });
        }
      }

      const { token } = response.data;
      const user = {
        id: response.data.user.id,
        email: response.data.user.email,
        name:
          response.data.user.name?.trim() ||
          (!isLogin ? formData.name.trim() : '') ||
          '',
      };

      if (!token || !user.id || !user.email) {
        throw new Error('Invalid authentication response');
      }

      login({ token, user });
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          isLogin
            ? 'Сталася помилка при вході'
            : 'Сталася помилка при реєстрації',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordLength = formData.password.length;
  const showPasswordHint = !isLogin && passwordLength > 0;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-app-bg px-4 py-8 sm:px-6 sm:py-10">
      <section
        className="w-full max-w-[440px] rounded-card bg-card-bg p-6 shadow-[0_20px_60px_rgba(76,29,149,0.1)] sm:p-8"
        aria-labelledby="auth-title"
      >
        <header className="mb-7 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_10px_24px_rgba(124,58,237,0.28)]">
            <ListChecks size={28} strokeWidth={2.4} aria-hidden="true" />
          </div>
          <h1
            id="auth-title"
            className="text-2xl font-bold tracking-tight text-text-main"
          >
            Мої задачі
          </h1>
          <p className="mt-1.5 text-sm text-text-muted">
            Організуй свій день з легкістю
          </p>
        </header>

        <div
          className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1"
          role="tablist"
          aria-label="Режим авторизації"
        >
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            onClick={() => switchMode(true)}
            className={`cursor-pointer rounded-[10px] px-4 py-2.5 text-sm font-semibold transition ${
              isLogin
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Увійти
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            onClick={() => switchMode(false)}
            className={`cursor-pointer rounded-[10px] px-4 py-2.5 text-sm font-semibold transition ${
              !isLogin
                ? 'bg-white text-text-main shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            Реєстрація
          </button>
        </div>

        <form
          key={isLogin ? 'login' : 'register'}
          noValidate
          onSubmit={handleSubmit}
          className="auth-form-transition space-y-4"
        >
          {!isLogin && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-text-main">
                Ім&apos;я <span className="text-rose-500">*</span>
              </span>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="name"
                placeholder="Ваше імʼя"
                aria-invalid={Boolean(errors.name)}
                className={inputClassName(Boolean(errors.name))}
              />
              {errors.name && (
                <p className="mt-1 text-xs font-medium text-rose-500">
                  {errors.name}
                </p>
              )}
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text-main">
              Email <span className="text-rose-500">*</span>
            </span>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={Boolean(errors.email)}
              className={inputClassName(Boolean(errors.email))}
            />
            {errors.email && (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errors.email}
              </p>
            )}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-text-main">
              Пароль <span className="text-rose-500">*</span>
            </span>
            <span className="relative block">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder={isLogin ? 'Ваш пароль' : 'Мінімум 6 символів'}
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
            {errors.password ? (
              <p className="mt-1 text-xs font-medium text-rose-500">
                {errors.password}
              </p>
            ) : (
              showPasswordHint && (
                <p
                  className={`mt-1 text-xs font-medium ${
                    passwordLength >= MIN_PASSWORD_LENGTH
                      ? 'text-status-low'
                      : 'text-text-muted'
                  }`}
                >
                  {passwordLength}/{MIN_PASSWORD_LENGTH} символів
                </p>
              )
            )}
          </label>

          {isLogin && (
            <div className="-mt-1 flex justify-end">
              <Link
                to="/auth/forgot-password"
                className="cursor-pointer text-sm font-semibold text-primary underline-offset-2 transition hover:text-primary-hover hover:underline"
              >
                Забули пароль?
              </Link>
            </div>
          )}

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
            {isSubmitting
              ? 'Зачекайте...'
              : isLogin
                ? 'Увійти'
                : 'Зареєструватись'}
            {!isSubmitting && <ArrowRight size={17} aria-hidden="true" />}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          {isLogin ? 'Ще немає акаунту?' : 'Вже маєте акаунт?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(!isLogin)}
            className="cursor-pointer font-semibold text-primary underline-offset-2 transition hover:text-primary-hover hover:underline"
          >
            {isLogin ? 'Зареєструватись' : 'Увійти'}
          </button>
        </p>
      </section>
    </main>
  );
}
