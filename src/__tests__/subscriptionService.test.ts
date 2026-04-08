import { subscriptionService } from '@/services/subscriptionService';
import { githubClient } from '@/clients/githubClient';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { notifierService } from '@/services/notifierService';

jest.mock('@/clients/githubClient');
jest.mock('@/repositories/subscriptionRepository');
jest.mock('@/services/notifierService');

describe('subscriptionService', () => {
  const createdAt = new Date('2020-01-01T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a subscription when repository exists', async () => {
    (githubClient.getRepository as jest.Mock).mockResolvedValue({ full_name: 'octocat/Hello-World' });
    (subscriptionRepository.findByEmailAndRepo as jest.Mock).mockResolvedValue(null);
    (subscriptionRepository.create as jest.Mock).mockImplementation(
      (data: { email: string; repo: string; unsubscribeToken: string }) =>
        Promise.resolve({
          id: '1',
          email: data.email,
          repo: data.repo,
          lastSeenTag: null,
          unsubscribeToken: data.unsubscribeToken,
          createdAt,
        }),
    );
    (notifierService.sendSubscriptionWelcome as jest.Mock).mockResolvedValue(undefined);

    const result = await subscriptionService.createSubscription('john@example.com', 'octocat/Hello-World');

    expect(result).toEqual({
      id: '1',
      email: 'john@example.com',
      repo: 'octocat/Hello-World',
      lastSeenTag: null,
      createdAt,
    });
    expect(subscriptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'john@example.com',
        repo: 'octocat/Hello-World',
        unsubscribeToken: expect.stringMatching(/^[a-f0-9]{48}$/),
      }),
    );
    expect(notifierService.sendSubscriptionWelcome).toHaveBeenCalledWith(
      'john@example.com',
      'octocat/Hello-World',
      expect.stringMatching(/^[a-f0-9]{48}$/),
    );
  });

  it('sends welcome email when subscription already exists', async () => {
    (githubClient.getRepository as jest.Mock).mockResolvedValue({ full_name: 'octocat/Hello-World' });
    (subscriptionRepository.findByEmailAndRepo as jest.Mock).mockResolvedValue({
      id: 'existing',
      email: 'john@example.com',
      repo: 'octocat/Hello-World',
      lastSeenTag: 'v1.0.0',
      unsubscribeToken: 'abc',
      createdAt,
    });
    (notifierService.sendSubscriptionWelcome as jest.Mock).mockResolvedValue(undefined);

    const result = await subscriptionService.createSubscription('john@example.com', 'octocat/Hello-World');

    expect(result.id).toBe('existing');
    expect(subscriptionRepository.create).not.toHaveBeenCalled();
    expect(notifierService.sendSubscriptionWelcome).toHaveBeenCalledWith(
      'john@example.com',
      'octocat/Hello-World',
      'abc',
    );
  });

  it('generates unsubscribe token for legacy subscription without token', async () => {
    (githubClient.getRepository as jest.Mock).mockResolvedValue({ full_name: 'octocat/Hello-World' });
    (subscriptionRepository.findByEmailAndRepo as jest.Mock).mockResolvedValue({
      id: 'legacy',
      email: 'john@example.com',
      repo: 'octocat/Hello-World',
      lastSeenTag: null,
      unsubscribeToken: null,
      createdAt,
    });
    (subscriptionRepository.updateUnsubscribeToken as jest.Mock).mockImplementation(
      (_id: string, token: string) =>
        Promise.resolve({
          id: 'legacy',
          email: 'john@example.com',
          repo: 'octocat/Hello-World',
          lastSeenTag: null,
          unsubscribeToken: token,
          createdAt,
        }),
    );
    (notifierService.sendSubscriptionWelcome as jest.Mock).mockResolvedValue(undefined);

    await subscriptionService.createSubscription('john@example.com', 'octocat/Hello-World');

    expect(subscriptionRepository.updateUnsubscribeToken).toHaveBeenCalledWith(
      'legacy',
      expect.stringMatching(/^[a-f0-9]{48}$/),
    );
    expect(notifierService.sendSubscriptionWelcome).toHaveBeenCalledWith(
      'john@example.com',
      'octocat/Hello-World',
      expect.stringMatching(/^[a-f0-9]{48}$/),
    );
  });

  it('throws when welcome email sending fails', async () => {
    (githubClient.getRepository as jest.Mock).mockResolvedValue({ full_name: 'octocat/Hello-World' });
    (subscriptionRepository.findByEmailAndRepo as jest.Mock).mockResolvedValue(null);
    (subscriptionRepository.create as jest.Mock).mockResolvedValue({
      id: 'new',
      email: 'john@example.com',
      repo: 'octocat/Hello-World',
      lastSeenTag: null,
      unsubscribeToken: 'deadbeef',
      createdAt,
    });
    (notifierService.sendSubscriptionWelcome as jest.Mock).mockRejectedValue(new Error('smtp failed'));

    await expect(subscriptionService.createSubscription('john@example.com', 'octocat/Hello-World')).rejects.toThrow(
      'Subscription created, but failed to send confirmation email.',
    );
  });

  it('throws for invalid repo format', async () => {
    await expect(subscriptionService.createSubscription('john@example.com', 'bad-format')).rejects.toThrow(
      'Invalid repository format',
    );
  });
});
