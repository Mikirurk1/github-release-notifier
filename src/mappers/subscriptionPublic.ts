import type { Subscription } from '@prisma/client';

export type SubscriptionPublic = {
  id: string;
  email: string;
  repo: string;
  lastSeenTag: string | null;
  createdAt: Date;
};

export function toPublicSubscription(row: Subscription): SubscriptionPublic {
  return {
    id: row.id,
    email: row.email,
    repo: row.repo,
    lastSeenTag: row.lastSeenTag,
    createdAt: row.createdAt,
  };
}

export type CreateSubscriptionResult = {
  subscription: SubscriptionPublic;
  alreadySubscribed: boolean;
};
