// Resolved per call so log transports (and test spies) can replace console methods.
const resolveWriter = (level) => {
  if (level === 'error') return console.error;
  if (level === 'warn') return console.warn;
  return console.log;
};

// Emails are personal data, so keep only enough of them to correlate log lines.
export const maskEmail = (email) => {
  if (typeof email !== 'string' || !email.includes('@')) return '<none>';

  const [localPart, domain] = email.split('@');
  const visible = localPart.slice(0, 2);

  return `${visible}${'*'.repeat(Math.max(localPart.length - 2, 1))}@${domain}`;
};

const formatContext = (context) => {
  const entries = Object.entries(context).filter(
    ([, value]) => value !== undefined,
  );

  if (!entries.length) return '';

  return ` ${entries.map(([key, value]) => `${key}=${value}`).join(' ')}`;
};

const write = (level, scope, message, context) => {
  const writer = resolveWriter(level);

  writer(
    `[${new Date().toISOString()}] ${level.toUpperCase()} [${scope}] ${message}${formatContext(context)}`,
  );
};

export const createLogger = (scope) => ({
  info: (message, context = {}) => write('info', scope, message, context),
  warn: (message, context = {}) => write('warn', scope, message, context),
  error: (message, context = {}) => write('error', scope, message, context),
});
