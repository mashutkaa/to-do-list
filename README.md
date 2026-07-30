# To-Do App | Мій список задач

Сучасний веб-додаток для керування задачами з авторизацією, пріоритетами, статусами, дедлайнами, шерингом задач по email і відновленням пароля.

---

## Можливості

- **Реєстрація та вхід** — JWT-авторизація, профіль з ім’ям користувача
- **Відновлення пароля** — «Забули пароль?» на екрані входу → лист із посиланням → новий пароль
- **CRUD задач** — створення, редагування, зміна статусу та видалення
- **Пріоритети** — низький / середній / високий
- **Статуси** — до виконання → в процесі → виконано
- **Дедлайни** — опційна дата + індикатор **«Прострочено»** для незавершених задач
- **Масовий шеринг** — вибір однієї або кількох задач у модалці й надсилання **одного** email (Brevo API)
- **«Зі мною»** — вкладка з задачами, якими поділилися з вами (перегляд без редагування)
- **Ліміт шерингу** — не частіше ніж раз на 5 хвилин (лише після успішно надісланого листа)
- **Фільтри** — за статусом (`Всі`, `До виконання`, `В процесі`, `Виконано`)
- **Сортування** — за дедлайном, пріоритетом, датою створення або назвою
- **Тости** — сповіщення про успіх / попередження, якщо лист не надіслано
- **Валідація форм** — blur/submit + миттєве очищення помилок
- **Адаптивний UI** — зручний інтерфейс на мобільних і десктопі

---

## Стек технологій

| Шар | Технології |
| --- | --- |
| **Frontend** | React 19, Vite, React Router, Tailwind CSS v4, Axios, Lucide, Vitest |
| **Backend** | Node.js, Express 5, Prisma 7, JWT, bcryptjs, Jest + Supertest |
| **База даних** | PostgreSQL (Neon) |
| **Email** | Brevo Transactional Email API (HTTPS) |

---

## Структура проєкту

```
to-do-list/
├── backend/          # Express API + Prisma
│   ├── prisma/       # schema.prisma
│   ├── scripts/      # утиліти (mail:check)
│   ├── src/          # routes, controllers, services
│   └── tests/        # інтеграційні та unit-тести
└── frontend/         # React + Vite клієнт
    ├── public/       # favicon та статичні файли
    ├── src/          # pages, components, context
    └── tests/        # компонентні тести (Vitest)
```

---

## Швидкий старт

### Вимоги

- Node.js 20+
- npm
- PostgreSQL (локально або [Neon](https://neon.tech))
- Акаунт [Brevo](https://www.brevo.com/) для листів (шеринг і відновлення пароля)

### 1. Клонування

```bash
git clone <url-репозиторію>
cd to-do-list
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Заповніть `.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
JWT_SECRET="довгий-випадковий-секрет"
JWT_EXPIRES_IN="7d"
PORT=5000
CORS_ORIGIN="http://localhost:5173"
FRONTEND_URL="http://localhost:5173"
NODE_ENV="development"

BREVO_API_KEY="your-brevo-api-key"
MAIL_FROM_EMAIL="sender-verified-in-brevo@example.com"
MAIL_FROM_NAME="To-Do List"
```

| Змінна | Призначення |
| --- | --- |
| `CORS_ORIGIN` | Дозволений origin фронтенду для CORS |
| `FRONTEND_URL` | Публічна URL фронтенду для посилань у листах (відновлення пароля). Локально — `http://localhost:5173`, на проді — URL деплою, наприклад `https://your-app.vercel.app`. Без `/` в кінці. Якщо не задано — береться `CORS_ORIGIN` |
| `BREVO_API_KEY` | API key з Brevo (*Settings → SMTP & API → API keys*), не SMTP-ключ |
| `MAIL_FROM_EMAIL` | Підтверджений відправник у Brevo |

> Листи йдуть через **HTTPS API Brevo**, а не SMTP: більшість хостингів блокує порти 25/465/587.
> Якщо в Brevo увімкнено обмеження за IP (*Authorised IPs*), додайте egress-IP хостингу
> або вимкніть обмеження — інакше API поверне `401`.

Застосуйте схему до БД і запустіть сервер:

```bash
npx prisma db push
npx prisma generate
npm run dev
```

API буде доступне на `http://localhost:5000`.

> Після змін у `schema.prisma` виконайте `npx prisma db push` (або migrate), потім `npx prisma generate` і перезапустіть backend.

Перевірити пошту без надсилання листів користувачам:

```bash
npm run mail:check
```

### 3. Frontend

У новому терміналі:

```bash
cd frontend
npm install
cp .env.example .env
```

Переконайтеся, що в `.env` вказано:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

На проді — URL вашого backend API, наприклад `https://your-api.onrender.com/api`.

Запуск:

```bash
npm run dev
```

Відкрийте `http://localhost:5173` у браузері.

> Для деплою SPA на Vercel потрібен `frontend/vercel.json` з rewrite усіх шляхів на
> `/index.html` — інакше прямий вхід на `/auth` чи `/auth/reset-password` дасть `404`.

---

## Відновлення пароля

1. На екрані входу → **Забули пароль?** → `/auth/forgot-password`
2. Користувач вводить email → `POST /api/auth/forgot-password`
3. Якщо акаунт існує, у БД створюється токен (зберігається лише hash, TTL **1 година**) і на email надсилається посилання:
   `{FRONTEND_URL}/auth/reset-password?token=...`
4. Користувач задає новий пароль → `POST /api/auth/reset-password` → автоматичний вхід

Відповідь на forgot-password завжди однакова (не розкриває, чи email зареєстрований).

---

## API (коротко)

| Метод | Ендпоінт | Опис |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Реєстрація (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Вхід → JWT + профіль користувача |
| `POST` | `/api/auth/forgot-password` | Запит на відновлення пароля (`email`) |
| `POST` | `/api/auth/reset-password` | Новий пароль за токеном з листа (`token`, `password`) |
| `GET` | `/api/tasks` | Список задач користувача |
| `POST` | `/api/tasks` | Створити задачу |
| `PATCH` | `/api/tasks/:id` | Оновити задачу |
| `PATCH` | `/api/tasks/:id/status` | Змінити статус |
| `DELETE` | `/api/tasks/:id` | Видалити задачу |
| `POST` | `/api/tasks/share` | Масовий шеринг (`taskIds[]`, `email`) |
| `POST` | `/api/tasks/:id/share` | Поділитися однією задачею (`email` / `targetEmail`) |
| `GET` | `/api/tasks/shared-with-me` | Задачі, якими поділилися з вами |
| `GET` | `/api/health` | Health-check |

Захищені маршрути потребують заголовок:

```http
Authorization: Bearer <token>
```

### Шеринг

Приклад масового шерингу:

```json
POST /api/tasks/share
{
  "taskIds": ["uuid-1", "uuid-2"],
  "email": "friend@example.com"
}
```

- У лист потрапляють усі обрані задачі (назва, опис, статус, пріоритет, дедлайн).
- Отримувач із цим email бачить задачі у вкладці **«Зі мною»** (read-only).
- Повторне надсилання тих самих задач на той самий email дозволене.
- Якщо шерити частіше ніж раз на 5 хвилин, API поверне `429`.
- Відповідь містить `emailSent`: доступ у застосунку видається завжди; `false` означає,
  що лист не вдалося надіслати. Кулдаун рахується лише від успішно надісланих листів.

---

## Корисні команди

### Backend (`backend/`)

| Команда | Опис |
| --- | --- |
| `npm run dev` | Розробка з nodemon |
| `npm start` | Продакшен-запуск |
| `npm run mail:check` | Діагностика пошти (конфіг + доступ до Brevo API) |
| `npm test` | Інтеграційні та unit-тести |
| `npx prisma db push` | Синхронізація схеми з БД |
| `npx prisma generate` | Оновлення Prisma Client |
| `npx prisma studio` | Візуальний перегляд даних |

### Frontend (`frontend/`)

| Команда | Опис |
| --- | --- |
| `npm run dev` | Dev-сервер Vite |
| `npm run build` | Збірка для продакшену |
| `npm run preview` | Перегляд зібраного білду |
| `npm test` | Компонентні тести (Vitest) |
| `npm run lint` | ESLint |

---

## Моделі даних

- **User** — `id`, `email`, `password`, `name`, `lastSharedAt`, `createdAt`
- **Task** — `title`, `description`, `status`, `priority`, `deadline`, зв’язок з власником
- **TaskShare** — шаринг задачі на `targetEmail` з каскадним видаленням
- **PasswordResetToken** — hash токена відновлення пароля, `expiresAt`, `usedAt`

Статуси: `PENDING` · `IN_PROGRESS` · `COMPLETED`  
Пріоритети: `LOW` · `MEDIUM` · `HIGH`

---

## Ліцензія

Приватний навчальний / портфоліо-проєкт.
