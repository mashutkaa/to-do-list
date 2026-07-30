# To-Do App | Мій список задач

Сучасний веб-додаток для керування задачами з авторизацією, пріоритетами, статусами, дедлайнами та масовим шерингом задач електронною поштою.

---

## Можливості

- **Реєстрація та вхід** — JWT-авторизація, профіль з ім’ям користувача
- **CRUD задач** — створення, редагування, зміна статусу та видалення
- **Пріоритети** — низький / середній / високий
- **Статуси** — до виконання → в процесі → виконано
- **Дедлайни** — опційна дата + індикатор **«Прострочено»** для незавершених задач
- **Масовий шеринг** — вибір однієї або кількох задач у модалці й надсилання **одного** email з деталями кожної задачі (Brevo API)
- **Ліміт шерингу** — не частіше ніж раз на 5 хвилин
- **Фільтри** — за статусом (`Всі`, `До виконання`, `В процесі`, `Виконано`)
- **Сортування** — за дедлайном, пріоритетом, датою створення або назвою; повторний клік по активному фільтру змінює порядок (asc/desc)
- **Тости** — коротке сповіщення про успішне надсилання / створення / оновлення
- **Валідація форм** — гібридна UX-валідація (blur/submit + миттєве очищення помилок)
- **Адаптивний UI** — зручний інтерфейс на мобільних і десктопі

---

## Стек технологій

| Шар | Технології |
| --- | --- |
| **Frontend** | React 19, Vite, React Router, Tailwind CSS v4, Axios, Lucide |
| **Backend** | Node.js, Express 5, Prisma 7, JWT, bcryptjs |
| **База даних** | PostgreSQL (Neon) |
| **Email** | Brevo Transactional Email API (HTTPS) |

---

## Структура проєкту

```
to-do-list/
├── backend/          # Express API + Prisma
│   ├── prisma/       # schema.prisma
│   ├── src/          # routes, controllers, services
│   └── tests/        # інтеграційні тести
└── frontend/         # React + Vite клієнт
    ├── public/       # favicon та статичні файли
    └── src/          # pages, components, context
```

---

## Швидкий старт

### Вимоги

- Node.js 20+
- npm
- PostgreSQL (локально або [Neon](https://neon.tech))

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
NODE_ENV="development"

BREVO_API_KEY="your-brevo-api-key"
MAIL_FROM_EMAIL="sender-verified-in-brevo@example.com"
MAIL_FROM_NAME="To-Do List"
```

> Листи йдуть через HTTPS API Brevo, а не SMTP: більшість хостингів блокує вихідні порти
> 25/465/587, через що SMTP-з'єднання зависає до тайм-ауту. `MAIL_FROM_EMAIL` має бути
> підтвердженим відправником у Brevo.

Застосуйте схему до БД і запустіть сервер:

```bash
npx prisma db push
npx prisma generate
npm run dev
```

API буде доступне на `http://localhost:5000`.

> Після змін у `schema.prisma` обов’язково виконайте `npx prisma generate` і перезапустіть backend, щоб Prisma Client підхопив нові поля.

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

Запуск:

```bash
npm run dev
```

Відкрийте `http://localhost:5173` у браузері.

---

## API (коротко)

| Метод | Ендпоінт | Опис |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Реєстрація (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Вхід → JWT + профіль користувача |
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
- Повторне надсилання тих самих задач на той самий email дозволене.
- Якщо шерити частіше ніж раз на 5 хвилин, API поверне `429` з повідомленням про очікування.
- Відповідь містить `emailSent` — доступ у застосунку видається завжди, а `false` означає,
  що лист не вдалося надіслати (немає `BREVO_API_KEY`, непідтверджений відправник тощо).
  Ліміт у 5 хвилин відлічується лише від успішно надісланих листів.

---

## Корисні команди

### Backend (`backend/`)

| Команда | Опис |
| --- | --- |
| `npm run dev` | Розробка з nodemon |
| `npm start` | Продакшен-запуск |
| `npm test` | Інтеграційні тести |
| `npx prisma db push` | Синхронізація схеми з БД |
| `npx prisma generate` | Оновлення Prisma Client |
| `npx prisma studio` | Візуальний перегляд даних |

### Frontend (`frontend/`)

| Команда | Опис |
| --- | --- |
| `npm run dev` | Dev-сервер Vite |
| `npm run build` | Збірка для продакшену |
| `npm run preview` | Перегляд зібраного білду |
| `npm run lint` | ESLint |

---

## Моделі даних

- **User** — `id`, `email`, `password`, `name`, `lastSharedAt`, `createdAt`
- **Task** — `title`, `description`, `status`, `priority`, `deadline`, зв’язок з власником
- **TaskShare** — шаринг задачі на `targetEmail` з каскадним видаленням

Статуси: `PENDING` · `IN_PROGRESS` · `COMPLETED`  
Пріоритети: `LOW` · `MEDIUM` · `HIGH`

---

## Ліцензія

Приватний навчальний / портфоліо-проєкт.
