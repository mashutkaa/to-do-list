import nodemailer from 'nodemailer';

const smtpPort = Number.parseInt(process.env.SMTP_PORT || '587', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

export const sendTaskShareEmail = async (targetEmail, tasks, senderEmail) => {
  const taskList = Array.isArray(tasks) ? tasks : [tasks];

  if (!taskList.length) {
    return false;
  }

  try {
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: targetEmail,
      subject,
      text: [
        introText,
        '',
        ...taskList.map((task, index) => renderTaskText(task, index)),
      ].join('\n'),
      html: `
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

    return true;
  } catch (error) {
    console.error(
      `[mail] Unable to send task-share email to ${targetEmail}:`,
      error.message,
    );
    return false;
  }
};
