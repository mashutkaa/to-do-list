import { jest } from '@jest/globals';

const { createLogger, maskEmail } = await import('../src/utils/logger.js');

describe('logger', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes scope, level and context', () => {
    createLogger('share').info('Share requested', { userId: 'u-1', tasks: 2 });

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('INFO [share] Share requested'),
    );
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining('userId=u-1 tasks=2'),
    );
  });

  it('routes levels to matching console methods', () => {
    const logger = createLogger('mail');

    logger.warn('careful');
    logger.error('broken');

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('WARN [mail] careful'),
    );
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('ERROR [mail] broken'),
    );
  });

  it('omits undefined context values', () => {
    createLogger('http').warn('Request rejected', {
      status: 429,
      userId: undefined,
    });

    const line = console.warn.mock.calls[0][0];
    expect(line).toContain('status=429');
    expect(line).not.toContain('userId');
  });

  it('masks emails so logs keep no full addresses', () => {
    expect(maskEmail('marichka.hupalenko@gmail.com')).toBe(
      'ma****************@gmail.com',
    );
    expect(maskEmail(undefined)).toBe('<none>');
    expect(maskEmail('not-an-email')).toBe('<none>');
  });
});
