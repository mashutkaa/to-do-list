import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPasswordWithToken,
} from '../services/authService.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  error.isOperational = true;
  return error;
};

const validateCredentials = (email, password) => {
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    throw createValidationError('Введіть коректний email');
  }

  if (typeof password !== 'string' || password.length < 6) {
    throw createValidationError('Пароль має містити щонайменше 6 символів');
  }
};

const isDuplicateEmailError = (error) =>
  error?.code === 'P2002' || error?.statusCode === 409;

export const register = async (request, response) => {
  try {
    const { email, password, name } = request.body;

    validateCredentials(email, password);

    if (typeof name !== 'string' || !name.trim()) {
      throw createValidationError("Введіть ваше ім'я");
    }

    const user = await registerUser(email, password, name);
    return response.status(201).json({ user });
  } catch (error) {
    if (isDuplicateEmailError(error)) {
      return response
        .status(400)
        .json({ message: 'Користувач з таким email вже зареєстрований' });
    }

    if (error.isOperational) {
      return response.status(error.statusCode).json({ message: error.message });
    }

    console.error('Registration failed:', error);
    return response
      .status(500)
      .json({ message: 'Не вдалося зареєструватися. Спробуйте пізніше' });
  }
};

export const login = async (request, response) => {
  try {
    const { email, password } = request.body;

    validateCredentials(email, password);

    const authData = await loginUser(email, password);
    return response.status(200).json(authData);
  } catch (error) {
    if (error.isOperational) {
      return response.status(error.statusCode).json({ message: error.message });
    }

    console.error('Login failed:', error);
    return response
      .status(500)
      .json({ message: 'Не вдалося увійти. Спробуйте пізніше' });
  }
};

export const forgotPassword = async (request, response) => {
  try {
    const { email } = request.body;

    if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
      throw createValidationError('Введіть коректний email');
    }

    const result = await requestPasswordReset(email);
    return response.status(200).json(result);
  } catch (error) {
    if (error.isOperational) {
      return response.status(error.statusCode).json({ message: error.message });
    }

    console.error('Forgot password failed:', error);
    return response.status(500).json({
      message: 'Не вдалося надіслати лист для відновлення. Спробуйте пізніше',
    });
  }
};

export const resetPassword = async (request, response) => {
  try {
    const { token, password } = request.body;

    if (typeof password !== 'string' || password.length < 6) {
      throw createValidationError('Пароль має містити щонайменше 6 символів');
    }

    const authData = await resetPasswordWithToken(token, password);
    return response.status(200).json(authData);
  } catch (error) {
    if (error.isOperational) {
      return response.status(error.statusCode).json({ message: error.message });
    }

    console.error('Reset password failed:', error);
    return response.status(500).json({
      message: 'Не вдалося оновити пароль. Спробуйте пізніше',
    });
  }
};
