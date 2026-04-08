import { EmailPayload, emailClient } from '@/clients/emailClient';
import { GithubReleaseResponse } from '@/clients/githubClient';

export const notifierService = {
  buildReleaseEmail(to: string, repo: string, release: GithubReleaseResponse): EmailPayload {
    return {
      to,
      subject: `New release for ${repo}: ${release.tag_name}`,
      text: [
        `A new release was published for ${repo}.`,
        `Name: ${release.name || release.tag_name}`,
        `Tag: ${release.tag_name}`,
        `URL: ${release.html_url}`,
      ].join('\n'),
    };
  },

  async sendReleaseNotification(to: string, repo: string, release: GithubReleaseResponse): Promise<void> {
    const payload = this.buildReleaseEmail(to, repo, release);
    await emailClient.sendMail(payload);
  },
};
