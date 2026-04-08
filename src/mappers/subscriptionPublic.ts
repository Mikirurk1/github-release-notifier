import type { Subscription } from '@prisma/client';

export type SubscriptionPublic = {
  id: string;
  email: string;
  repo: string;
  lastSeenTag: string | null;
  createdAt: Date;
};

export const toSubscriptionPublic = (sub: Subscription): SubscriptionPublic => ({
  id: sub.id,
  email: sub.email,
  repo: sub.repo,
  lastSeenTag: sub.lastSeenTag,
  createdAt: sub.createdAt,
});
