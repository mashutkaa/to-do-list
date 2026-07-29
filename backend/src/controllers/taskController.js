import {
  createTask,
  deleteTask,
  getUserTasks,
  updateTask,
} from '../services/taskService.js';

export const create = async (request, response, next) => {
  try {
    const task = await createTask(request.user.id, request.body);
    return response.status(201).json({ task });
  } catch (error) {
    return next(error);
  }
};

export const list = async (request, response, next) => {
  try {
    const tasks = await getUserTasks(request.user.id);
    return response.status(200).json({ tasks });
  } catch (error) {
    return next(error);
  }
};

export const update = async (request, response, next) => {
  try {
    const task = await updateTask(request.params.id, request.user.id, request.body);
    return response.status(200).json({ task });
  } catch (error) {
    return next(error);
  }
};

export const updateStatus = async (request, response, next) => {
  try {
    const task = await updateTask(request.params.id, request.user.id, {
      status: request.body.status,
    });
    return response.status(200).json({ task });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (request, response, next) => {
  try {
    await deleteTask(request.params.id, request.user.id);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
};
