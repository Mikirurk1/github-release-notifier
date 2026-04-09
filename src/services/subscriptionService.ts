import { randomBytes } from 'node:crypto';
import axios from 'axios';
import { subscriptionsCreatedCounter } from '@/config/metrics';
import { githubClient } from '@/clients/githubClient';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { logger } from '@/config/logger';
import { toPublicSubscription, type CreateSubscriptionResult } from '@/mappers/subscriptionPublic';
import { notifierService } from '@/services/notifierService';
import { ExternalServiceError, NotFoundError } from '@/utils/errors';
import { parseRepoSlug, readCreateSubscriptionBody } from '@/validation/subscription';

function newUnsubscribeToken(): string {
  return randomBytes(24).toString('hex');
}

export const subscriptionService = {
  async createSubscription(body: unknown): Promise<CreateSubscriptionResult> {
    const { email, repo } = readCreateSubscriptionBody(body);
    const { owner, name } = parseRepoSlug(repo);

    try {
      await githubClient.getRepository(owner, name);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new NotFoundError('Repository not found on GitHub.');
      }
      logger.warn({ err: error, owner, name }, 'GitHub repository validation failed');
      throw new ExternalServiceError('Failed to validate repository with GitHub API.');
    }

    const existing = await subscriptionRepository.findByEmailAndRepo(email, repo);
    if (existing) {
      logger.debug({ email, repo, subscriptionId: existing.id }, 'Subscription already exists');
      let row = existing;
      if (!existing.unsubscribeToken) {
        row = await subscriptionRepository.updateUnsubscribeToken(existing.id, newUnsubscribeToken());
      }
      return { subscription: toPublicSubscription(row), alreadySubscribed: true };
    }

    const unsubscribeToken = newUnsubscribeToken();
    const created = await subscriptionRepository.create({
      email,
      repo,
      unsubscribeToken,
    });

    logger.info({ email, repo, subscriptionId: created.id }, 'Subscription created');
    subscriptionsCreatedCounter.inc();

    try {
      await notifierService.sendSubscriptionWelcome(email, repo, unsubscribeToken);
    } catch (err) {
      logger.error({ err, email, repo, subscriptionId: created.id }, 'Welcome email failed after create');
      throw new ExternalServiceError('Subscription created, but failed to send confirmation email.');
    }

    return { subscription: toPublicSubscription(created), alreadySubscribed: false };
  },
};
