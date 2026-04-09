import axios from 'axios';
import { githubClient } from '@/clients/githubClient';
import { env } from '@/config/env';
import { emailsSentCounter } from '@/config/metrics';
import { logger } from '@/config/logger';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { notifierService } from '@/services/notifierService';
import { releaseService } from '@/services/releaseService';
import { parseRepoSlug } from '@/validation/subscription';
import { ValidationError } from '@/utils/errors';

type ScanDecision = 'no_latest_release' | 'tag_unchanged_skip' | 'notify_first_or_new_tag';

function describeReleaseScan(
  lastSeenTag: string | null,
  latest: { tag_name: string } | null,
): { decision: ScanDecision; detail: string } {
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
}

type SubscriptionRow = {
  id: string;
  email: string;
  repo: string;
  lastSeenTag: string | null;
  unsubscribeToken: string | null;
};

async function scanSingleSubscription(subscription: SubscriptionRow): Promise<void> {
  const { owner, name } = parseRepoSlug(subscription.repo);
  const latestRelease = await githubClient.getLatestRelease(owner, name);
  const shouldNotify = releaseService.isNewRelease(subscription.lastSeenTag, latestRelease);
  const { decision, detail } = describeReleaseScan(subscription.lastSeenTag, latestRelease);

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

  if (!shouldNotify || !latestRelease) {
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
}

export async function runReleaseScan(): Promise<void> {
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
      'Scanner: no subscriptions in database; add one via the homepage or POST /api/subscriptions',
    );
  }

  for (const subscription of subscriptions) {
    try {
      await scanSingleSubscription(subscription);
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      logger.error(
        {
          err: error,
          subscriptionId: subscription.id,
          repo: subscription.repo,
          httpStatus: status,
          invalidRepoSlug: error instanceof ValidationError,
        },
        'Scanner failed for subscription, continuing with next',
      );
    }
  }
}
