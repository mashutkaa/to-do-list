import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}

process.env.FRONTEND_URL = 'http://localhost:5173';

const sendPasswordResetEmail = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../src/services/mailService.js', () => ({
  sendTaskShareEmail: jest.fn().mockResolvedValue(true),
  sendPasswordResetEmail,
  describeMailConfig: jest.fn().mockReturnValue({
    apiKeyPresent: true,
    apiKeyLength: 10,
    sender: 'se****@example.com',
    ready: true,
  }),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/db.js');

const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const testUser = {
  name: 'Reset User',
  email: `reset.test.${uniqueSuffix}@example.com`,
  password: 'old-password',
};

let userId;

describe('Password reset', () => {
  beforeAll(async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser)
      .expect(201);

    userId = registerResponse.body.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.passwordResetToken.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.$disconnect();
  });

  beforeEach(() => {
    sendPasswordResetEmail.mockClear();
    sendPasswordResetEmail.mockResolvedValue(true);
  });

  it('accepts a forgot-password request for a known email', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    expect(response.body.message).toMatch(/інструкції/i);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail.mock.calls[0][0]).toBe(testUser.email);
    expect(sendPasswordResetEmail.mock.calls[0][1]).toContain(
      '/auth/reset-password?token=',
    );

    const tokens = await prisma.passwordResetToken.findMany({
      where: { userId },
    });
    expect(tokens.length).toBeGreaterThan(0);
  });

  it('returns the same message for an unknown email without sending mail', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: `missing.${uniqueSuffix}@example.com` })
      .expect(200);

    expect(response.body.message).toMatch(/інструкції/i);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('resets the password with a valid token and allows login', async () => {
    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200);

    const resetUrl = sendPasswordResetEmail.mock.calls[0][1];
    const token = new URL(resetUrl).searchParams.get('token');
    const newPassword = 'new-password-123';

    const resetResponse = await request(app)
      .post('/api/auth/reset-password')
      .send({ token, password: newPassword })
      .expect(200);

    expect(resetResponse.body.token).toBeDefined();
    expect(resetResponse.body.user.email).toBe(testUser.email);

    await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: newPassword })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(401);
  });

  it('rejects an invalid or already used token', async () => {
    await request(app)
      .post('/api/auth/reset-password')
      .send({
        token: crypto.randomBytes(32).toString('hex'),
        password: 'another-password',
      })
      .expect(400);
  });
});
