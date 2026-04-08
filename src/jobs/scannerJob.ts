import { AxiosError } from 'axios';
import { githubClient } from '@/clients/githubClient';
import { env } from '@/config/env';
import { emailsSentCounter } from '@/config/metrics';
import { logger } from '@/config/logger';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { notifierService } from '@/services/notifierService';
import { releaseService } from '@/services/releaseService';
import { subscriptionService } from '@/services/subscriptionService';
import { ValidationError } from '@/utils/errors';

type ScanDecision =
  | 'no_latest_release'
  | 'tag_unchanged_skip'
  | 'notify_first_or_new_tag';

const describeScan = (
  lastSeenTag: string | null,
  latest: { tag_name: string } | null,
): { decision: ScanDecision; detail: string } => {
  if (!latest) {
    return {
      decision: 'no_latest_release',
      detail: 'GitHub returned no latest release (404 or no published releases).',
    };
  }
  if (!lastSeenTag) {
    return {
      decision: 'notify_first_or_new_tag',
      detail: 'No previous tag stored; will notify for current latest release.',
    };
  }
  if (latest.tag_name === lastSeenTag) {
    return {
      decision: 'tag_unchanged_skip',
      detail: 'Latest tag matches lastSeenTag; no email.',
    };
  }
  return {
    decision: 'notify_first_or_new_tag',
    detail: 'New tag differs from lastSeenTag; will send email.',
  };
};

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
  const { decision, detail } = describeScan(subscription.lastSeenTag, latestRelease);

  logger.info(
    {
      subscriptionId: subscription.id,
      repo: subscription.repo,
      email: subscription.email,
      lastSeenTag: subscription.lastSeenTag,
      githubLatestTag: latestRelease?.tag_name ?? null,
      githubLatestUrl: latestRelease?.html_url ?? null,
      decision,
      detail,
    },
    'Scanner release check',
  );

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
    {
      subscriptionId: subscription.id,
      repo: subscription.repo,
      email: subscription.email,
      releaseTag: latestRelease.tag_name,
    },
    'Release notification sent',
  );
};

export const scannerJob = {
  async runOnce(): Promise<void> {
    const subscriptions = await subscriptionRepository.findAll();

    logger.info(
      {
        subscriptionCount: subscriptions.length,
        githubReleaseCacheEnabled: env.enableRedisCache,
        ...(env.enableRedisCache ? { githubReleaseCacheTtlSec: env.githubCacheTtlSec } : {}),
      },
      'Scanner tick: checking subscriptions against GitHub latest release',
    );

    if (subscriptions.length === 0) {
      logger.info(
        { reason: 'no_subscriptions' },
        'Scanner: database has no subscriptions; add one via the homepage form or POST /api/subscriptions',
      );
    }

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
    void this.runOnce().catch((error) => {
      logger.error({ err: error }, 'Unexpected scanner error on startup run');
    });
    return setInterval(() => {
      this.runOnce().catch((error) => {
        logger.error({ err: error }, 'Unexpected scanner loop error');
      });
    }, intervalMs);
  },
};
