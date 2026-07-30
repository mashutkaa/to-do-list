import { createLogger, maskEmail } from '../utils/logger.js';

const logger = createLogger('mail');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Hosting providers commonly block outbound SMTP ports, so email goes over HTTPS.
const REQUEST_TIMEOUT_MS = 10_000;

const STATUS_LABELS = {
  PENDING: 'До виконання',
  IN_PROGRESS: 'В процесі',
  COMPLETED: 'Виконано',
};

const PRIORITY_LABELS = {
  LOW: 'Низький',
  MEDIUM: 'Середній',
  HIGH: 'Високий',
};

const escapeHtml = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character],
  );

const formatDeadline = (deadline) => {
  if (!deadline) return '—';

  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(deadline));
};

const renderTaskText = (task, index) =>
  [
    `${index + 1}. ${task.title}`,
    `   Опис: ${task.description?.trim() || '—'}`,
    `   Статус: ${STATUS_LABELS[task.status] ?? task.status}`,
    `   Пріоритет: ${PRIORITY_LABELS[task.priority] ?? task.priority}`,
    `   Дедлайн: ${formatDeadline(task.deadline)}`,
  ].join('\n');

const renderTaskHtml = (task) => {
  const rows = [
    ['Назва', task.title],
    ['Опис', task.description?.trim() || '—'],
    ['Статус', STATUS_LABELS[task.status] ?? task.status],
    ['Пріоритет', PRIORITY_LABELS[task.priority] ?? task.priority],
    ['Дедлайн', formatDeadline(task.deadline)],
  ];

  return `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:0 0 14px;background:#fafbff">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${rows
          .map(
            ([label, value], index) => `
          <tr>
            <td style="padding:${index === 0 ? '0' : '10px'} 0 0;width:110px;vertical-align:top;font-size:13px;font-weight:700;color:#64748b">
              ${escapeHtml(label)}
            </td>
            <td style="padding:${index === 0 ? '0' : '10px'} 0 0;vertical-align:top;font-size:${index === 0 ? '16px' : '14px'};font-weight:${index === 0 ? '700' : '500'};color:#0f172a;line-height:1.5">
              ${escapeHtml(value)}
            </td>
          </tr>
        `,
          )
          .join('')}
      </table>
    </div>
  `;
};

// Accepts either MAIL_FROM_EMAIL/MAIL_FROM_NAME or the legacy `Name <email>` form.
const resolveSender = () => {
  const explicitEmail = process.env.MAIL_FROM_EMAIL?.trim();
  const explicitName = process.env.MAIL_FROM_NAME?.trim();

  if (explicitEmail) {
    return { email: explicitEmail, name: explicitName || 'To-Do App' };
  }

  const legacyFrom = process.env.SMTP_FROM?.trim();

  if (!legacyFrom) return null;

  const match = legacyFrom.match(/^(?:"?([^"<]*?)"?\s*)?<([^<>@\s]+@[^<>\s]+)>$/);

  if (match) {
    return { email: match[2], name: (match[1] || explicitName || 'To-Do App').trim() };
  }

  if (legacyFrom.includes('@')) {
    return { email: legacyFrom, name: explicitName || 'To-Do App' };
  }

  return null;
};

export const describeMailConfig = () => {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const sender = resolveSender();

  return {
    apiKeyPresent: Boolean(apiKey),
    apiKeyLength: apiKey?.length ?? 0,
    sender: sender ? maskEmail(sender.email) : '<none>',
    ready: Boolean(apiKey && sender),
  };
};

const sendBrevoEmail = async ({
  to,
  subject,
  textContent,
  htmlContent,
  replyTo,
  purpose,
}) => {
  const recipient = maskEmail(to);
  const apiKey = process.env.BREVO_API_KEY?.trim();

  if (!apiKey) {
    logger.error('Email skipped: BREVO_API_KEY is not set', {
      to: recipient,
      purpose,
    });
    return false;
  }

  const sender = resolveSender();

  if (!sender) {
    logger.error(
      'Email skipped: sender is not configured — set MAIL_FROM_EMAIL (verified in Brevo)',
      { to: recipient, purpose },
    );
    return false;
  }

  const payload = {
    sender,
    to: [{ email: to }],
    replyTo: replyTo ? { email: replyTo } : undefined,
    subject,
    textContent,
    htmlContent,
  };

  const startedAt = Date.now();

  logger.info('Sending email via Brevo API', {
    to: recipient,
    from: maskEmail(sender.email),
    purpose,
  });

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const durationMs = Date.now() - startedAt;

    if (!response.ok) {
      const details = await response.text().catch(() => '');

      logger.error('Brevo rejected the email', {
        to: recipient,
        purpose,
        status: response.status,
        durationMs,
        details: details.slice(0, 500) || '<empty body>',
      });

      return false;
    }

    logger.info('Email accepted by Brevo', {
      to: recipient,
      purpose,
      status: response.status,
      durationMs,
    });

    return true;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const timedOut = error.name === 'TimeoutError';

    logger.error('Unable to reach the Brevo API', {
      to: recipient,
      purpose,
      durationMs,
      reason: timedOut
        ? `request timed out after ${REQUEST_TIMEOUT_MS} ms`
        : `${error.name}: ${error.message}`,
      cause: error.cause?.code ?? error.cause?.message,
    });

    return false;
  }
};

export const sendPasswordResetEmail = async (targetEmail, resetUrl) => {
  const safeUrl = escapeHtml(resetUrl);

  return sendBrevoEmail({
    to: targetEmail,
    purpose: 'password-reset',
    subject: '[To-Do App] Відновлення пароля',
    textContent: [
      'Ви отримали цей лист, бо хтось запросив відновлення пароля для вашого акаунту в To-Do App.',
      '',
      'Перейдіть за посиланням, щоб встановити новий пароль (дійсне 1 годину):',
      resetUrl,
      '',
      'Якщо ви не запитували відновлення — просто проігноруйте цей лист.',
    ].join('\n'),
    htmlContent: `
      <div style="background:#f4f7fb;padding:40px 16px;font-family:Arial,sans-serif;color:#172033">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 8px 30px rgba(23,32,51,.08)">
          <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c3aed;margin-bottom:18px">
            To-Do App
          </div>
          <h1 style="font-size:22px;margin:0 0 12px;color:#0f172a">Відновлення пароля</h1>
          <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#526078">
            Натисніть кнопку нижче, щоб встановити новий пароль. Посилання дійсне протягом <strong>1 години</strong>.
          </p>
          <a href="${safeUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:14px 22px;border-radius:12px">
            Встановити новий пароль
          </a>
          <p style="font-size:13px;line-height:1.6;margin:24px 0 0;color:#94a3b8;word-break:break-all">
            Якщо кнопка не працює, скопіюйте посилання:<br />
            ${safeUrl}
          </p>
          <p style="font-size:13px;line-height:1.6;margin:18px 0 0;color:#94a3b8">
            Якщо ви не запитували відновлення — проігноруйте цей лист.
          </p>
        </div>
      </div>
    `,
  });
};

export const sendTaskShareEmail = async (targetEmail, tasks, senderEmail) => {
  const taskList = Array.isArray(tasks) ? tasks : [tasks];
  const recipient = maskEmail(targetEmail);

  if (!taskList.length) {
    logger.warn('Email skipped: empty task list', { to: recipient });
    return false;
  }

  const safeSenderEmail = escapeHtml(senderEmail);
  const taskCount = taskList.length;
  const subject =
    taskCount === 1
      ? `[To-Do App] З вами поділилися задачею: "${taskList[0].title}"`
      : `[To-Do App] З вами поділилися задачами (${taskCount})`;

  const introText =
    taskCount === 1
      ? `Користувач ${senderEmail} поділився(-лася) з вами задачею.`
      : `Користувач ${senderEmail} поділився(-лася) з вами ${taskCount} задачами.`;

  const introHtml =
    taskCount === 1
      ? `Користувач <strong>${safeSenderEmail}</strong> поділився(-лася) з вами задачею.`
      : `Користувач <strong>${safeSenderEmail}</strong> поділився(-лася) з вами <strong>${taskCount}</strong> задачами.`;

  return sendBrevoEmail({
    to: targetEmail,
    purpose: 'task-share',
    replyTo: senderEmail,
    subject,
    textContent: [
      introText,
      '',
      ...taskList.map((task, index) => renderTaskText(task, index)),
    ].join('\n'),
    htmlContent: `
        <div style="background:#f4f7fb;padding:40px 16px;font-family:Arial,sans-serif;color:#172033">
          <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 8px 30px rgba(23,32,51,.08)">
            <div style="font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c3aed;margin-bottom:18px">
              To-Do App
            </div>
            <p style="font-size:16px;line-height:1.6;margin:0 0 24px;color:#526078">
              ${introHtml}
            </p>
            ${taskList.map((task) => renderTaskHtml(task)).join('')}
          </div>
        </div>
      `,
  });
};
