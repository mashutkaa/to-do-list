import prisma from '../config/db.js';

const TASK_STATUSES = new Set(['PENDING', 'IN_PROGRESS', 'COMPLETED']);
const TASK_PRIORITIES = new Set(['LOW', 'MEDIUM', 'HIGH']);

const createOperationalError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const taskSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  deadline: true,
  userId: true,
  createdAt: true,
};

const parseDeadline = (deadline) => {
  if (deadline === null || deadline === '') {
    return null;
  }

  const parsedDeadline = new Date(deadline);

  if (Number.isNaN(parsedDeadline.getTime())) {
    throw createOperationalError('Invalid task deadline', 400);
  }

  return parsedDeadline;
};

export const createTask = async (
  userId,
  { title, description, status, priority, deadline },
) => {
  if (typeof title !== 'string' || !title.trim()) {
    throw createOperationalError('Task title is required', 400);
  }

  if (status !== undefined && !TASK_STATUSES.has(status)) {
    throw createOperationalError('Invalid task status', 400);
  }

  if (priority !== undefined && !TASK_PRIORITIES.has(priority)) {
    throw createOperationalError('Invalid task priority', 400);
  }

  return prisma.task.create({
    data: {
      title: title.trim(),
      description:
        typeof description === 'string' && description.trim()
          ? description.trim()
          : null,
      status: status ?? 'PENDING',
      priority: priority ?? 'MEDIUM',
      deadline: deadline === undefined ? null : parseDeadline(deadline),
      userId,
    },
    select: taskSelect,
  });
};

export const getUserTasks = async (userId) =>
  prisma.task.findMany({
    where: { userId },
    select: taskSelect,
    orderBy: { createdAt: 'desc' },
  });

export const updateTask = async (taskId, userId, updates) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, userId: true },
  });

  if (!task) {
    throw createOperationalError('Task not found', 404);
  }

  if (task.userId !== userId) {
    throw createOperationalError('You can only update your own tasks', 403);
  }

  const data = {};

  if (updates.title !== undefined) {
    if (typeof updates.title !== 'string' || !updates.title.trim()) {
      throw createOperationalError('Task title cannot be empty', 400);
    }
    data.title = updates.title.trim();
  }

  if (updates.description !== undefined) {
    data.description =
      typeof updates.description === 'string' && updates.description.trim()
        ? updates.description.trim()
        : null;
  }

  if (updates.status !== undefined) {
    if (!TASK_STATUSES.has(updates.status)) {
      throw createOperationalError('Invalid task status', 400);
    }
    data.status = updates.status;
  }

  if (updates.priority !== undefined) {
    if (!TASK_PRIORITIES.has(updates.priority)) {
      throw createOperationalError('Invalid task priority', 400);
    }
    data.priority = updates.priority;
  }

  if (updates.deadline !== undefined) {
    data.deadline = parseDeadline(updates.deadline);
  }

  if (Object.keys(data).length === 0) {
    throw createOperationalError('No valid fields provided for update', 400);
  }

  return prisma.task.update({
    where: { id: taskId },
    data,
    select: taskSelect,
  });
};

export const deleteTask = async (taskId, userId) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, userId: true },
  });

  if (!task) {
    throw createOperationalError('Task not found', 404);
  }

  if (task.userId !== userId) {
    throw createOperationalError('You can only delete your own tasks', 403);
  }

  await prisma.task.delete({ where: { id: taskId } });
};
