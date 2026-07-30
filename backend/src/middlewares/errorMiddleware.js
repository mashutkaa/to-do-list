import { createLogger } from '../utils/logger.js';

const logger = createLogger('http');

const errorMiddleware = (error, request, response, _next) => {
  if (response.headersSent) {
    return;
  }

  const statusCode = error.isOperational
    ? (error.statusCode ?? error.status ?? 400)
    : 500;

  const context = {
    method: request.method,
    url: request.originalUrl,
    status: statusCode,
    userId: request.user?.id,
  };

  if (error.isOperational) {
    logger.warn(`Request rejected: ${error.message}`, context);
  } else {
    logger.error(`Unhandled request error: ${error.message}`, context);
    console.error(error);
  }

  response.status(statusCode).json({
    message: error.isOperational
      ? error.message
      : 'Не вдалося виконати запит. Спробуйте пізніше',
  });
};

export default errorMiddleware;
