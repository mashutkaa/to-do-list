import 'dotenv/config';

import { describeMailConfig } from '../src/services/mailService.js';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('mail-check');
const TIMEOUT_MS = 10_000;

const config = describeMailConfig();

logger.info('Mail configuration', {
  apiKeyPresent: config.apiKeyPresent,
  apiKeyLength: config.apiKeyLength,
  sender: config.sender,
  ready: config.ready,
});

if (!config.ready) {
  logger.error(
    'Configuration is incomplete — set BREVO_API_KEY and MAIL_FROM_EMAIL',
  );
  process.exit(1);
}

const apiKey = process.env.BREVO_API_KEY.trim();

const probe = async (path) => {
  try {
    const response = await fetch(`https://api.brevo.com${path}`, {
      headers: { 'api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    const body = await response.text();

    if (response.ok) {
      logger.info(`${path} reachable`, { status: response.status });
      return true;
    }

    logger.error(`${path} rejected the API key`, {
      status: response.status,
      details: body.slice(0, 400),
    });

    return false;
  } catch (error) {
    logger.error(`${path} is unreachable`, {
      reason: `${error.name}: ${error.message}`,
      cause: error.cause?.code ?? error.cause?.message,
    });

    return false;
  }
};

const accountOk = await probe('/v3/account');
const sendersOk = await probe('/v3/senders');

if (accountOk && sendersOk) {
  logger.info('Brevo API is reachable and the key is valid');
  process.exit(0);
}

logger.warn(
  'Emails will not be delivered. Most common causes: the API key is revoked, ' +
    'or the current egress IP is missing from Brevo authorised IPs ' +
    '(https://app.brevo.com/security/authorised_ips)',
);

process.exit(1);
