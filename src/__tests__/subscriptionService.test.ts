import { subscriptionService } from '../services/subscriptionService';
import { githubClient } from '../clients/githubClient';
import { subscriptionRepository } from '../repositories/subscriptionRepository';

jest.mock('../clients/githubClient');
jest.mock('../repositories/subscriptionRepository');

describe('subscriptionService', () => {
  it('creates a subscription when repository exists', async () => {
    (githubClient.getRepository as jest.Mock).mockResolvedValue({ full_name: 'octocat/Hello-World' });
    (subscriptionRepository.findByEmailAndRepo as jest.Mock).mockResolvedValue(null);
    (subscriptionRepository.create as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'john@example.com',
      repo: 'octocat/Hello-World',
    });

    const result = await subscriptionService.createSubscription('john@example.com', 'octocat/Hello-World');

    expect(result.email).toBe('john@example.com');
    expect(subscriptionRepository.create).toHaveBeenCalled();
  });

  it('throws for invalid repo format', async () => {
    await expect(subscriptionService.createSubscription('john@example.com', 'bad-format')).rejects.toThrow(
      'Invalid repository format',
    );
  });
});
