import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { logger } from '@/config/logger';

const MAX_UNSUBSCRIBE_TOKEN_LENGTH = 64;

export type UnsubscribeResult =
  | { ok: false; reason: 'malformed_token' }
  | { ok: false; reason: 'unknown_token' }
  | { ok: true; email: string; repo: string };

function isHexUnsubscribeToken(value: string): boolean {
  return value.length > 0 && value.length <= MAX_UNSUBSCRIBE_TOKEN_LENGTH && /^[a-f0-9]+$/i.test(value);
}

export async function unsubscribeByToken(raw: unknown): Promise<UnsubscribeResult> {
  const token = typeof raw === 'string' ? raw.trim() : '';
  if (!isHexUnsubscribeToken(token)) {
    return { ok: false, reason: 'malformed_token' };
  }

  const row = await subscriptionRepository.findByUnsubscribeToken(token);
  if (!row) {
    return { ok: false, reason: 'unknown_token' };
  }

  await subscriptionRepository.deleteById(row.id);

  logger.info(
    { subscriptionId: row.id, email: row.email, repo: row.repo },
    'Subscription removed via unsubscribe link',
  );

  return { ok: true, email: row.email, repo: row.repo };
}
