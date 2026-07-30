import { jest } from '@jest/globals';

const { sendTaskShareEmail } = await import('../src/services/mailService.js');

const task = {
  id: 'task-1',
  title: 'Підготувати звіт',
  description: 'Квартальні цифри',
  status: 'PENDING',
  priority: 'HIGH',
  deadline: '2099-01-15T00:00:00.000Z',
};

const originalEnv = { ...process.env };

describe('sendTaskShareEmail', () => {
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-api-key';
    process.env.MAIL_FROM_EMAIL = 'sender@example.com';
    process.env.MAIL_FROM_NAME = 'To-Do App';
    delete process.env.SMTP_FROM;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => '',
    });

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('posts the email to the Brevo HTTPS API', async () => {
    const result = await sendTaskShareEmail(
      'friend@example.com',
      [task],
      'owner@example.com',
    );

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(options.method).toBe('POST');
    expect(options.headers['api-key']).toBe('test-api-key');
    expect(options.signal).toBeDefined();

    const payload = JSON.parse(options.body);
    expect(payload.sender).toEqual({
      email: 'sender@example.com',
      name: 'To-Do App',
    });
    expect(payload.to).toEqual([{ email: 'friend@example.com' }]);
    expect(payload.subject).toContain('Підготувати звіт');
    expect(payload.htmlContent).toContain('Підготувати звіт');
    expect(payload.textContent).toContain('Підготувати звіт');
  });

  it('falls back to the legacy SMTP_FROM sender format', async () => {
    delete process.env.MAIL_FROM_EMAIL;
    delete process.env.MAIL_FROM_NAME;
    process.env.SMTP_FROM = 'To-Do App <legacy@example.com>';

    await sendTaskShareEmail('friend@example.com', [task], 'owner@example.com');

    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload.sender).toEqual({
      email: 'legacy@example.com',
      name: 'To-Do App',
    });
  });

  it('uses a plural subject for multiple tasks', async () => {
    await sendTaskShareEmail(
      'friend@example.com',
      [task, { ...task, id: 'task-2', title: 'Друга задача' }],
      'owner@example.com',
    );

    const payload = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(payload.subject).toContain('(2)');
    expect(payload.htmlContent).toContain('Друга задача');
  });

  it('returns false without calling the API when the key is missing', async () => {
    delete process.env.BREVO_API_KEY;

    const result = await sendTaskShareEmail(
      'friend@example.com',
      [task],
      'owner@example.com',
    );

    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns false without calling the API when the sender is missing', async () => {
    delete process.env.MAIL_FROM_EMAIL;

    const result = await sendTaskShareEmail(
      'friend@example.com',
      [task],
      'owner@example.com',
    );

    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns false and logs details when Brevo rejects the request', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => '{"message":"Key not found"}',
    });

    const result = await sendTaskShareEmail(
      'friend@example.com',
      [task],
      'owner@example.com',
    );

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('status=401'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Key not found'),
    );
  });

  it('returns false when the request times out', async () => {
    const timeoutError = new Error('The operation was aborted due to timeout');
    timeoutError.name = 'TimeoutError';
    global.fetch.mockRejectedValue(timeoutError);

    const result = await sendTaskShareEmail(
      'friend@example.com',
      [task],
      'owner@example.com',
    );

    expect(result).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('timed out'),
    );
  });

  it('returns false for an empty task list', async () => {
    const result = await sendTaskShareEmail(
      'friend@example.com',
      [],
      'owner@example.com',
    );

    expect(result).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
