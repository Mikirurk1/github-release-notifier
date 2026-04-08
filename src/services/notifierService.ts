import { EmailPayload, emailClient } from '@/clients/emailClient';
import { env } from '@/config/env';
import { GithubReleaseResponse } from '@/clients/githubClient';

export const notifierService = {
  buildReleaseEmail(
    to: string,
    repo: string,
    release: GithubReleaseResponse,
    unsubscribeToken?: string | null,
  ): EmailPayload {
    const lines = [
      `A new release was published for ${repo}.`,
      `Name: ${release.name || release.tag_name}`,
      `Tag: ${release.tag_name}`,
      `URL: ${release.html_url}`,
    ];
    if (unsubscribeToken) {
      lines.push(
        ``,
        `Unsubscribe from alerts for ${repo}:`,
        `${env.publicAppUrl}/unsubscribe/${unsubscribeToken}`,
      );
    }
    return {
      to,
      subject: `New release for ${repo}: ${release.tag_name}`,
      text: lines.join('\n'),
    };
  },

  async sendReleaseNotification(
    to: string,
    repo: string,
    release: GithubReleaseResponse,
    unsubscribeToken?: string | null,
  ): Promise<void> {
    const payload = this.buildReleaseEmail(to, repo, release, unsubscribeToken);
    await emailClient.sendMail(payload);
  },

  buildSubscriptionWelcomeEmail(to: string, repo: string, unsubscribeToken: string): EmailPayload {
    const link = `${env.publicAppUrl}/unsubscribe/${unsubscribeToken}`;
    return {
      to,
      subject: `You are subscribed to release alerts for ${repo}`,
      text: [
        `Thanks for subscribing.`,
        ``,
        `We will email ${to} when a new release is published for ${repo} on GitHub.`,
        ``,
        `To stop these emails, open this link (no login required):`,
        link,
      ].join('\n'),
    };
  },

  async sendSubscriptionWelcome(to: string, repo: string, unsubscribeToken: string): Promise<void> {
    await emailClient.sendMail(this.buildSubscriptionWelcomeEmail(to, repo, unsubscribeToken));
  },
};
