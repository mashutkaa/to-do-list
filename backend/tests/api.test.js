import { jest } from '@jest/globals';
import 'dotenv/config';

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret';
}

jest.unstable_mockModule('../src/services/mailService.js', () => ({
  sendTaskShareEmail: jest.fn().mockResolvedValue(true),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: prisma } = await import('../src/config/db.js');

const uniqueSuffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const testUser = {
  name: 'Test User',
  email: `api.test.${uniqueSuffix}@example.com`,
  password: 'password123',
};
const shareTargetEmail = `shared.with.${uniqueSuffix}@example.com`;

let authToken;
let userId;
let taskId;

describe('API integration', () => {
  afterAll(async () => {
    if (userId) {
      await prisma.taskShare.deleteMany({
        where: {
          OR: [{ task: { userId } }, { targetEmail: testUser.email }],
        },
      });
      await prisma.task.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }

    await prisma.$disconnect();
  });

  describe('User Authentication', () => {
    it('registers a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.user).toMatchObject({
        email: testUser.email,
        name: testUser.name,
      });
      expect(response.body.user.id).toBeDefined();
      expect(response.body.user.password).toBeUndefined();

      userId = response.body.user.id;
    });

    it('logs in with registered credentials and returns a JWT', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.user).toMatchObject({
        id: userId,
        email: testUser.email,
        name: testUser.name,
      });
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(10);

      authToken = response.body.token;
    });
  });

  describe('Task Management', () => {
    it('creates a new task with the authorization token', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Write integration tests',
          description: 'Cover auth, tasks, and sharing',
        })
        .expect(201);

      expect(response.body.task).toMatchObject({
        title: 'Write integration tests',
        description: 'Cover auth, tasks, and sharing',
        status: 'PENDING',
        userId,
      });
      expect(response.body.task.id).toBeDefined();

      taskId = response.body.task.id;
    });

    it('fetches user tasks and includes the created task', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.tasks)).toBe(true);
      expect(response.body.tasks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: taskId,
            title: 'Write integration tests',
          }),
        ]),
      );
    });

    it('updates the task status to COMPLETED', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${taskId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'COMPLETED' })
        .expect(200);

      expect(response.body.task).toMatchObject({
        id: taskId,
        status: 'COMPLETED',
      });
    });
  });

  describe('Task Sharing', () => {
    const resetShareCooldown = () =>
      prisma.user.update({
        where: { id: userId },
        data: { lastSharedAt: null },
      });

    beforeEach(resetShareCooldown);

    it('shares the task with a target email address', async () => {
      const response = await request(app)
        .post(`/api/tasks/${taskId}/share`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ targetEmail: shareTargetEmail })
        .expect(201);

      expect(response.body.share).toMatchObject({
        taskId,
        targetEmail: shareTargetEmail,
      });
      expect(response.body.share.id).toBeDefined();
    });

    it('shares multiple tasks in bulk', async () => {
      const secondTask = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Second shared task',
          description: 'Bulk share coverage',
        })
        .expect(201);

      const secondTaskId = secondTask.body.task.id;
      const bulkTarget = `bulk.${uniqueSuffix}@example.com`;

      const response = await request(app)
        .post('/api/tasks/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskIds: [taskId, secondTaskId],
          email: bulkTarget,
        })
        .expect(201);

      expect(response.body.count).toBe(2);
      expect(response.body.shares).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ taskId, targetEmail: bulkTarget }),
          expect.objectContaining({
            taskId: secondTaskId,
            targetEmail: bulkTarget,
          }),
        ]),
      );

      await request(app)
        .delete(`/api/tasks/${secondTaskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);
    });

    it('rejects bulk share without taskIds', async () => {
      const response = await request(app)
        .post('/api/tasks/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: shareTargetEmail })
        .expect(400);

      expect(response.body.message).toMatch(/задач/i);
    });

    it('blocks a repeated share within the 5 minute cooldown', async () => {
      await request(app)
        .post('/api/tasks/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskIds: [taskId],
          email: `cooldown.first.${uniqueSuffix}@example.com`,
        })
        .expect(201);

      const response = await request(app)
        .post('/api/tasks/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskIds: [taskId],
          email: `cooldown.second.${uniqueSuffix}@example.com`,
        })
        .expect(429);

      expect(response.body.message).toMatch(/5 хвилин/);
    });

    it('allows resending already shared tasks after cooldown', async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { lastSharedAt: null },
      });

      const response = await request(app)
        .post('/api/tasks/share')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          taskIds: [taskId],
          email: shareTargetEmail,
        })
        .expect(201);

      expect(response.body.count).toBeGreaterThanOrEqual(1);
      expect(response.body.shares).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            taskId,
            targetEmail: shareTargetEmail,
          }),
        ]),
      );
    });
  });

  describe('Task Deletion', () => {
    it('deletes the task', async () => {
      await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.tasks).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: taskId })]),
      );
    });
  });
});
