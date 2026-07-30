import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

import prisma from '../config/db.js';
import { createLogger, maskEmail } from '../utils/logger.js';
import { signToken } from '../utils/jwt.js';
import { sendPasswordResetEmail } from './mailService.js';

const logger = createLogger('auth');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
const GENERIC_RESET_MESSAGE =
  'Якщо акаунт із цим email існує, ми надіслали інструкції для відновлення пароля.';

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

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const resolveFrontendBaseUrl = () => {
  const configured =
    process.env.FRONTEND_URL?.trim() || process.env.CORS_ORIGIN?.trim();

  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return 'http://localhost:5173';
};

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

export const requestPasswordReset = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true },
  });

  if (!user) {
    logger.info('Password reset requested for unknown email', {
      email: maskEmail(normalizedEmail),
    });
    return { message: GENERIC_RESET_MESSAGE };
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId: user.id,
      OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
    },
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${resolveFrontendBaseUrl()}/auth/reset-password?token=${rawToken}`;
  const emailWasSent = await sendPasswordResetEmail(user.email, resetUrl);

  if (!emailWasSent) {
    logger.warn('Password reset token created but email was not sent', {
      userId: user.id,
      email: maskEmail(user.email),
    });
  } else {
    logger.info('Password reset email sent', {
      userId: user.id,
      email: maskEmail(user.email),
    });
  }

  return {
    message: GENERIC_RESET_MESSAGE,
    emailSent: emailWasSent,
  };
};

export const resetPasswordWithToken = async (token, password) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw createOperationalError('Недійсне або прострочене посилання', 400);
  }

  const tokenHash = hashResetToken(token.trim());
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, email: true, name: true, createdAt: true },
      },
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    throw createOperationalError('Недійсне або прострочене посилання', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.userId,
        id: { not: resetToken.id },
      },
    }),
  ]);

  logger.info('Password reset completed', {
    userId: resetToken.userId,
    email: maskEmail(resetToken.user.email),
  });

  return {
    user: toPublicUser(resetToken.user),
    token: signToken(resetToken.userId),
  };
};
