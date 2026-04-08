import { Prisma, Subscription } from '@prisma/client';
import { prisma } from '../config/prisma';

export const subscriptionRepository = {
  create(data: Prisma.SubscriptionCreateInput): Promise<Subscription> {
    return prisma.subscription.create({ data });
  },

  findByEmailAndRepo(email: string, repo: string): Promise<Subscription | null> {
    return prisma.subscription.findFirst({
      where: { email, repo },
    });
  },

  findAll(): Promise<Subscription[]> {
    return prisma.subscription.findMany();
  },

  updateLastSeenTag(id: string, tag: string): Promise<Subscription> {
    return prisma.subscription.update({
      where: { id },
      data: { lastSeenTag: tag },
    });
  },
};
