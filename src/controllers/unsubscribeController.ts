import { Request, Response } from 'express';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { logger } from '@/config/logger';

const page = (title: string, body: string) =>
  `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;font-family:system-ui,sans-serif;line-height:1.5;padding:48px 20px;max-width:440px;margin:0 auto">
    ${body}
  </body>
</html>`;

const TOKEN_MAX_LENGTH = 64;

export const unsubscribeController = {
  async get(req: Request, res: Response): Promise<void> {
    const raw = req.params.token;
    const token = typeof raw === 'string' ? raw.trim() : '';

    if (!token || token.length > TOKEN_MAX_LENGTH || !/^[a-f0-9]+$/i.test(token)) {
      res
        .status(400)
        .type('html')
        .send(
          page(
            'Invalid link',
            '<h1 style="margin-top:0;font-size:1.25rem">Invalid unsubscribe link</h1><p><a href="/">Back to home</a></p>',
          ),
        );
      return;
    }

    const subscription = await subscriptionRepository.findByUnsubscribeToken(token);
    if (!subscription) {
      res
        .status(404)
        .type('html')
        .send(
          page(
            'Not found',
            '<h1 style="margin-top:0;font-size:1.25rem">Subscription not found</h1><p>This link may have already been used or is invalid.</p><p><a href="/">Back to home</a></p>',
          ),
        );
      return;
    }

    await subscriptionRepository.deleteById(subscription.id);
    logger.info(
      { subscriptionId: subscription.id, email: subscription.email, repo: subscription.repo },
      'Subscription removed via unsubscribe link',
    );

    res
      .status(200)
      .type('html')
      .send(
        page(
          'Unsubscribed',
          `<h1 style="margin-top:0;font-size:1.25rem">You are unsubscribed</h1><p>We will no longer email <strong>${escapeHtml(
            subscription.email,
          )}</strong> about releases for <strong>${escapeHtml(subscription.repo)}</strong>.</p><p><a href="/">Back to home</a></p>`,
        ),
      );
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
