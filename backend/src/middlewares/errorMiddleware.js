const errorMiddleware = (error, _request, response, _next) => {
  if (response.headersSent) {
    return;
  }

  const statusCode = error.isOperational
    ? (error.statusCode ?? error.status ?? 400)
    : 500;

  if (!error.isOperational) {
    console.error('Unhandled request error:', error);
  }

  response.status(statusCode).json({
    message: error.isOperational
      ? error.message
      : 'Не вдалося виконати запит. Спробуйте пізніше',
  });
};

export default errorMiddleware;
