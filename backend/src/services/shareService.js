import prisma from '../config/db.js';
import { sendTaskShareEmail } from './mailService.js';

const createOperationalError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

export const SHARE_COOLDOWN_MS = 5 * 60 * 1000;

const assertShareCooldown = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastSharedAt: true },
  });

  if (!user) {
    throw createOperationalError('Authenticated user no longer exists', 401);
  }

  const lastSharedAt = user.lastSharedAt;

  if (!lastSharedAt) return;

  const elapsedMs = Date.now() - new Date(lastSharedAt).getTime();

  if (elapsedMs < SHARE_COOLDOWN_MS) {
    const remainingMinutes = Math.max(
      1,
      Math.ceil((SHARE_COOLDOWN_MS - elapsedMs) / 60000),
    );

    throw createOperationalError(
      `Поділитися задачами можна не частіше, ніж раз на 5 хвилин. Зачекайте ще приблизно ${remainingMinutes} хв.`,
      429,
    );
  }
};

export const shareTask = async (taskId, userId, targetEmail) => {
  const { shares, emailWasSent } = await shareTasks(
    [taskId],
    userId,
    targetEmail,
  );

  return { share: shares[0], emailWasSent };
};

export const shareTasks = async (taskIds, userId, targetEmail) => {
  const normalizedTargetEmail = normalizeEmail(targetEmail);
  const uniqueTaskIds = [...new Set(taskIds)];

  if (!uniqueTaskIds.length) {
    throw createOperationalError('Оберіть хоча б одну задачу для шерингу', 400);
  }

  await assertShareCooldown(userId);

  const tasks = await prisma.task.findMany({
    where: {
      id: { in: uniqueTaskIds },
      userId,
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      deadline: true,
      user: {
        select: { email: true },
      },
    },
  });

  if (tasks.length !== uniqueTaskIds.length) {
    throw createOperationalError(
      'Деякі задачі не знайдено або вам не належать',
      403,
    );
  }

  const existingShares = await prisma.taskShare.findMany({
    where: {
      taskId: { in: uniqueTaskIds },
      targetEmail: normalizedTargetEmail,
    },
    select: { taskId: true },
  });

  const alreadySharedIds = new Set(existingShares.map((share) => share.taskId));
  const newTasks = tasks.filter((task) => !alreadySharedIds.has(task.id));

  const targetUser = await prisma.user.findUnique({
    where: { email: normalizedTargetEmail },
    select: { id: true },
  });

  if (newTasks.length > 0) {
    await prisma.taskShare.createMany({
      data: newTasks.map((task) => ({
        taskId: task.id,
        targetEmail: normalizedTargetEmail,
        targetUserId: targetUser?.id ?? null,
      })),
    });
  }

  const shares = await prisma.taskShare.findMany({
    where: {
      taskId: { in: uniqueTaskIds },
      targetEmail: normalizedTargetEmail,
    },
    select: {
      id: true,
      taskId: true,
      targetEmail: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const senderEmail = tasks[0].user.email;
  const emailWasSent = await sendTaskShareEmail(
    normalizedTargetEmail,
    tasks,
    senderEmail,
  );

  if (emailWasSent) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastSharedAt: new Date() },
    });
  }

  return { shares, emailWasSent };
};

export const getTasksSharedWithUser = async (userEmail) => {
  const normalizedEmail = normalizeEmail(userEmail);

  return prisma.task.findMany({
    where: {
      shares: {
        some: { targetEmail: normalizedEmail },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      deadline: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      shares: {
        where: { targetEmail: normalizedEmail },
        select: {
          id: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getUserEmailById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw createOperationalError('Authenticated user no longer exists', 401);
  }

  return user.email;
};
