import { scannerJob } from '@/jobs/scannerJob';
import { githubClient } from '@/clients/githubClient';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { notifierService } from '@/services/notifierService';

jest.mock('@/clients/githubClient');
jest.mock('@/repositories/subscriptionRepository');
jest.mock('@/services/notifierService');

describe('scannerJob', () => {
  it('sends email and updates tag on new release', async () => {
    (subscriptionRepository.findAll as jest.Mock).mockResolvedValue([
      {
        id: '1',
        email: 'john@example.com',
        repo: 'octocat/Hello-World',
        lastSeenTag: 'v1.0.0',
        unsubscribeToken: 'deadbeef',
      },
    ]);

    (githubClient.getLatestRelease as jest.Mock).mockResolvedValue({
      tag_name: 'v1.1.0',
      html_url: 'https://example.com/release',
      name: 'Release 1.1.0',
    });

    await scannerJob.runOnce();

    expect(notifierService.sendReleaseNotification).toHaveBeenCalledTimes(1);
    expect(notifierService.sendReleaseNotification).toHaveBeenCalledWith(
      'john@example.com',
      'octocat/Hello-World',
      expect.objectContaining({ tag_name: 'v1.1.0' }),
      'deadbeef',
    );
    expect(subscriptionRepository.updateLastSeenTag).toHaveBeenCalledWith('1', 'v1.1.0');
  });
});
