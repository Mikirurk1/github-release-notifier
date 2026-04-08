import { AxiosError } from 'axios';
import { githubClient } from '@/clients/githubClient';
import { emailsSentCounter } from '@/config/metrics';
import { logger } from '@/config/logger';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { notifierService } from '@/services/notifierService';
import { releaseService } from '@/services/releaseService';
import { subscriptionService } from '@/services/subscriptionService';
import { ValidationError } from '@/utils/errors';

const processSubscription = async (subscription: {
  id: string;
  email: string;
  repo: string;
  lastSeenTag: string | null;
  unsubscribeToken: string | null;
}): Promise<void> => {
  const { owner, name } = subscriptionService.parseRepo(subscription.repo);
  const latestRelease = await githubClient.getLatestRelease(owner, name);
  const hasNewRelease = releaseService.isNewRelease(subscription.lastSeenTag, latestRelease);

  if (!hasNewRelease || !latestRelease) {
    return;
  }

  await notifierService.sendReleaseNotification(
    subscription.email,
    subscription.repo,
    latestRelease,
    subscription.unsubscribeToken,
  );
  await subscriptionRepository.updateLastSeenTag(subscription.id, latestRelease.tag_name);
  emailsSentCounter.inc();
  logger.info(
    { subscriptionId: subscription.id, repo: subscription.repo, releaseTag: latestRelease.tag_name },
    'Release notification sent',
  );
};

export const scannerJob = {
  async runOnce(): Promise<void> {
    const subscriptions = await subscriptionRepository.findAll();

    for (const subscription of subscriptions) {
      try {
        await processSubscription(subscription);
      } catch (error) {
        const axiosError = error as AxiosError;
        const isValidationError = error instanceof ValidationError;
        logger.error(
          {
            err: error,
            subscriptionId: subscription.id,
            repo: subscription.repo,
            status: axiosError.response?.status,
            invalidSubscriptionConfig: isValidationError,
          },
          'Scanner failed for subscription, continuing',
        );
      }
    }
  },

  start(intervalMs: number): NodeJS.Timeout {
    return setInterval(() => {
      this.runOnce().catch((error) => {
        logger.error({ err: error }, 'Unexpected scanner loop error');
      });
    }, intervalMs);
  },
};
