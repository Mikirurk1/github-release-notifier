import { Prisma, Subscription } from '@prisma/client';
import { prisma } from '@/config/prisma';

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

  updateUnsubscribeToken(id: string, unsubscribeToken: string): Promise<Subscription> {
    return prisma.subscription.update({
      where: { id },
      data: { unsubscribeToken },
    });
  },

  findByUnsubscribeToken(token: string): Promise<Subscription | null> {
    return prisma.subscription.findUnique({
      where: { unsubscribeToken: token },
    });
  },

  deleteById(id: string): Promise<Subscription> {
    return prisma.subscription.delete({
      where: { id },
    });
  },
};
