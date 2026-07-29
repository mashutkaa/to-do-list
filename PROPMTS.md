Generate a clean PostgreSQL schema in Prisma for a To-Do List application with task sharing capabilities.

Please define the following models with proper relations, primary keys (UUID), and timestamps:

1. TaskStatus Enum:
   - PENDING
   - IN_PROGRESS
   - COMPLETED

2. User Model:
   - id: String (UUID, primary key)
   - email: String (unique)
   - password: String
   - createdAt: DateTime (default now)
   - Relations: tasks (Task[]), sharedTasks (TaskShare[])

3. Task Model:
   - id: String (UUID, primary key)
   - title: String
   - description: String (optional)
   - status: TaskStatus (default PENDING)
   - userId: String
   - createdAt: DateTime (default now)
   - Relations: user (User), shares (TaskShare[])

4. TaskShare Model:
   - id: String (UUID, primary key)
   - taskId: String
   - targetEmail: String
   - createdAt: DateTime (default now)
   - Relations: task (Task, with cascade delete on task deletion)

Ensure correct Prisma syntax, relation attributes (@relation), and clean formatting.


Build the core Express server structure using JavaScript with ES Modules syntax (import/export).

Please generate the following files in the `src/` directory:

1. `src/config/db.js`:
   - Initialize and export a single instance of PrismaClient.

2. `src/middlewares/errorMiddleware.js`:
   - Global error handler middleware that formats operational errors and returns a structured JSON response `{ message, stack }`.

3. `src/app.js`:
   - Express app initialization.
   - Attach standard middleware: `express.json()`, `cors()`.
   - Setup route placeholders and the global error handler middleware.

4. `src/server.js`:
   - Import `app` from `app.js` and start the server on process.env.PORT || 5000.


Implement authentication routes and controller for User registration and login.

Please create:

1. `src/utils/jwt.js`:
   - Function to generate JWT tokens (`signToken(userId)`).
   - Function to verify JWT tokens.

2. `src/middlewares/authMiddleware.js`:
   - Middleware to check the Bearer token from the `Authorization` header.
   - Verify token, extract user ID, attach `req.user = { id }`, and proceed. If invalid, return 401.

3. `src/services/authService.js`:
   - `registerUser(email, password)`: hash password using bcryptjs, create User via Prisma.
   - `loginUser(email, password)`: verify credentials, return user data + JWT token.

4. `src/controllers/authController.js` & `src/routes/authRoutes.js`:
   - Endpoints:
     - POST `/api/auth/register`
     - POST `/api/auth/login`


Implement Task management CRUD features connected to the Prisma Task model.

Please create:

1. `src/services/taskService.js`:
   - `getTasksByUserId(userId)`: fetch all tasks created by the user.
   - `createTask(userId, { title, description })`: create a new task with default status PENDING.
   - `updateTaskStatus(taskId, userId, status)`: update task status (PENDING, IN_PROGRESS, COMPLETED). Ensure user owns the task.
   - `deleteTask(taskId, userId)`: delete a task owned by the user.

2. `src/controllers/taskController.js`:
   - Controllers handling request/response logic for the task operations.

3. `src/routes/taskRoutes.js`:
   - Apply `authMiddleware` to all task routes.
   - Endpoints:
     - GET `/api/tasks`
     - POST `/api/tasks`
     - PATCH `/api/tasks/:id/status`
     - DELETE `/api/tasks/:id`


Implement Task Sharing and Email Notifications functionality using Nodemailer.

Please create:

1. `src/services/mailService.js`:
   - Setup a Nodemailer transporter (using Ethereal for testing or standard SMTP env vars).
   - Function `sendTaskShareEmail(targetEmail, taskTitle, senderEmail)`: sends a formatted email informing the recipient that a task was shared with them.

2. `src/services/shareService.js`:
   - `shareTask(taskId, userId, targetEmail)`: check if user owns the task, create a TaskShare record in DB, and trigger `sendTaskShareEmail`.
   - `getTasksSharedWithUser(userEmail)`: fetch tasks shared with the specified email.

3. `src/controllers/shareController.js` & `src/routes/shareRoutes.js`:
   - Protect routes with `authMiddleware`.
   - Endpoints:
     - POST `/api/tasks/:id/share` (body: `{ targetEmail }`)
     - GET `/api/tasks/shared-with-me`


Write integration tests using Jest and Supertest to verify the core backend functionality.

Please create a test file `tests/api.test.js` covering:

1. User Authentication:
   - Register a new user.
   - Login with registered credentials and retrieve JWT token.

2. Task Management:
   - Create a new task (using authorization token).
   - Fetch user tasks and verify the created task is present.
   - Update the task status to `COMPLETED`.

3. Task Sharing:
   - Share the task with a target email address via POST `/api/tasks/:id/share`.

Ensure mock or handling for database cleanup/connections so tests run cleanly with `npm test`.


frontend:

Configure our global CSS system in `src/index.css` using Tailwind CSS v4 directives based on our Flowstep UI screenshots.

Requirements:
1. Import Tailwind CSS v4 using `@import "tailwindcss";`.

2. Define custom design tokens in the `@theme` block:
   - Primary Colors:
     - `--color-primary`: `#7C3AED` (Violet accent)
     - `--color-primary-hover`: `#6D28D9`
     - `--color-primary-light`: `#F3E8FF`
   - Backgrounds:
     - `--color-app-bg`: `#F8F9FC`
     - `--color-card-bg`: `#FFFFFF`
   - Typography:
     - `--color-text-main`: `#0F172A`
     - `--color-text-muted`: `#64748B`
   - Radii:
     - `--radius-card`: `1.25rem` (20px)
     - `--radius-button`: `0.875rem` (14px)
     - `--radius-input`: `0.75rem` (12px)
   - Status & Priority Colors:
     - `--color-status-low`: `#10B981`
     - `--color-status-low-bg`: `#D1FAE5`
     - `--color-status-medium`: `#F59E0B`
     - `--color-status-medium-bg`: `#FEF3C7`
     - `--color-status-high`: `#EF4444`
     - `--color-status-high-bg`: `#FEE2E2`

3. Base Styles & Responsiveness:
   - Apply `bg-app-bg` and `text-main` to body with font smooth rendering.
   - Add focus ring utility styles for accessibility.
   - Hide scrollbars utility class for mobile horizontal tabs scrolling.


Create an Axios HTTP client instance in `src/services/api.js`.

Requirements:
1. Use `import.meta.env.VITE_API_BASE_URL` as the base URL (fallback to 'http://localhost:5000/api').
2. Add a request interceptor that automatically attaches the JWT token from `localStorage.getItem('token')` to the `Authorization: Bearer <token>` header if present.
3. Add a response interceptor to handle 401 Unauthorized responses globally (e.g., clear token and redirect to auth if expired).
4. Export the configured axios instance as default.


Build a responsive Auth page component in `src/pages/AuthPage.jsx` matching the attached Flowstep design screenshots.

Layout & Mobile Responsiveness:
- Mobile: Full width with comfortable side padding (`px-4`), stack content cleanly.
- Desktop (`md:` breakpoints): Centered card modal (max width ~440px) with drop shadow.

Design Details:
1. App Icon placeholder (violet square icon with check mark).
2. Header: "Мої задачі" and subtitle "Організуй свій день з легкістю".
3. Tab switcher: "Увійти" and "Реєстрація" buttons inside a pill container.
4. Inputs: Email, Password (with eye icon to toggle visibility), and Name (only in Registration mode).
5. Full-width primary button ("Увійти ->" / "Зареєструватись ->").
6. Bottom link text to easily switch modes.

Logic:
- Manage `isLogin` mode state.
- Connect forms to default api instance:
  - POST `/auth/login` (payload: email, password)
  - POST `/auth/register` (payload: email, password, name)
- On success: Save returned token & user to `localStorage` and trigger auth context callback.


Build a responsive Task Dashboard (`src/pages/DashboardPage.jsx`) and Task Card component (`src/components/TaskCard.jsx`) based on the attached designs.

Mobile & Responsive Layout Requirements:
- On Mobile (`< md`):
  - Stack header elements cleanly (Greeting top, user action buttons below).
  - Filter tabs should be horizontally scrollable without breaking the layout.
  - Task cards metadata (priority, status dropdown, deadline) should stack vertically or wrap cleanly.
- On Desktop (`md:` and `lg:`):
  - Max container width ~800px or `max-w-4xl` centered.
  - Header actions aligned horizontally.
  - Task cards display metadata side-by-side.

Component Breakdown:
1. Header Component:
   - Greeting "Привіт, [User Name]!" & current date.
   - Action buttons: "Поділитись" (Share icon), "+ Нова задача" (Primary violet button).
   - User Avatar with dropdown menu containing user email and "Вийти" button.

2. Progress Card ("Прогрес сьогодні"):
   - Visual progress bar calculated based on completed tasks.
   - Counters: "Всього", "В процесі", "Виконано".

3. Filter Tabs:
   - Horizontal tab list: "Всі", "До виконання", "В процесі", "Виконано" with count counters.

4. TaskCard (`src/components/TaskCard.jsx`):
   - Status toggle (checkbox or completion badge).
   - Task title and description.
   - Priority badge (High/Medium/Low with color dots).
   - Deadline badge with calendar icon.
   - Status selector dropdown (PENDING, IN_PROGRESS, COMPLETED) triggering `PATCH /tasks/:id/status`.

State & API Logic:
- Fetch tasks on load from `GET /tasks`.
- Filter tasks in memory based on selected active tab.
- Support status updates and task deletions.


Create two responsive modal dialog components using React and Tailwind CSS matching the designs:

1. `src/components/CreateTaskModal.jsx`:
   - Backdrop overlay with blur/dim background.
   - Responsiveness: On mobile, bottom sheet style or full screen modal; on desktop, centered dialog box (`max-w-lg`).
   - Fields:
     - Title* (Input)
     - Description (Textarea)
     - Priority selector (Radio options for Low/Medium/High with colored indicator dots)
     - Status selector (Dropdown)
     - Deadline picker (Date input)
   - Buttons: "Скасувати" and "Додати задачу".
   - Submit logic: Calls `POST /tasks` via API, closes modal, and triggers parent refresh.

2. `src/components/ShareTaskModal.jsx`:
   - Matching theme and overlay design.
   - Fields: Target Email input field.
   - Buttons: "Скасувати" and "Надіслати запрошення".
   - Submit logic: Calls `POST /tasks/:id/share` with `{ targetEmail }`, handles success notification or errors cleanly.


Connect the authentication state and pages together in `src/App.jsx` using `react-router-dom`.

Requirements:
1. Create a simple `AuthContext` (or local state) to track current `user` and `isAuthenticated` status.
2. Setup React Router routes:
   - `/auth` -> Renders `AuthPage`. If already logged in, redirect to `/`.
   - `/` -> Protected route. Renders `DashboardPage`. If not logged in, redirect to `/auth`.
3. Render modals (`CreateTaskModal`, `ShareTaskModal`) inside `DashboardPage` controlled by component state.
4. Ensure smooth transitions when switching between Auth and Dashboard.