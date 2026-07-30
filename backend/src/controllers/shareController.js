import {
  getTasksSharedWithUser,
  getUserEmailById,
  shareTask,
  shareTasks,
} from '../services/shareService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

const resolveTargetEmail = (body) => {
  const rawEmail = body?.email ?? body?.targetEmail;
  const emailIsValid =
    typeof rawEmail === 'string' && EMAIL_PATTERN.test(rawEmail.trim());

  if (!emailIsValid) {
    throw createValidationError('Введіть коректний email користувача');
  }

  return rawEmail.trim();
};

export const createTaskShare = async (request, response, next) => {
  try {
    const targetEmail = resolveTargetEmail(request.body);
    const { share, emailWasSent } = await shareTask(
      request.params.id,
      request.user.id,
      targetEmail,
    );

    return response.status(201).json({ share, emailSent: emailWasSent });
  } catch (error) {
    return next(error);
  }
};

export const createBulkTaskShare = async (request, response, next) => {
  try {
    const { taskIds } = request.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw createValidationError('Оберіть хоча б одну задачу для шерингу');
    }

    if (!taskIds.every((id) => typeof id === 'string' && id.trim())) {
      throw createValidationError('Некоректний список задач');
    }

    const targetEmail = resolveTargetEmail(request.body);
    const { shares, emailWasSent } = await shareTasks(
      taskIds,
      request.user.id,
      targetEmail,
    );

    return response.status(201).json({
      shares,
      count: shares.length,
      emailSent: emailWasSent,
    });
  } catch (error) {
    return next(error);
  }
};

export const getSharedTasks = async (request, response, next) => {
  try {
    const userEmail = await getUserEmailById(request.user.id);
    const tasks = await getTasksSharedWithUser(userEmail);

    return response.status(200).json({ tasks });
  } catch (error) {
    return next(error);
  }
};
