import bcrypt from 'bcryptjs';

import prisma from '../config/db.js';
import { signToken } from '../utils/jwt.js';

const createOperationalError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

const normalizeEmail = (email) => email.trim().toLowerCase();

const toPublicUser = (user) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  createdAt: user.createdAt,
});

export const registerUser = async (email, password, name) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = name.trim();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createOperationalError(
      'Користувач з таким email вже зареєстрований',
      409,
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    return await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: normalizedName,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      throw createOperationalError(
        'Користувач з таким email вже зареєстрований',
        409,
      );
    }

    throw error;
  }
};

export const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(email) },
  });

  const passwordIsValid =
    user && (await bcrypt.compare(password, user.password));

  if (!passwordIsValid) {
    throw createOperationalError('Невірний email або пароль', 401);
  }

  return {
    user: toPublicUser(user),
    token: signToken(user.id),
  };
};
