import { escapeHtml } from '@/utils/htmlEscape';

export function unsubscribeShell(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0 auto;font-family:system-ui,sans-serif;line-height:1.5;padding:48px 20px;max-width:440px">
    ${bodyHtml}
  </body>
</html>`;
}

const backLink = '<p><a href="/">Back to home</a></p>';

export const unsubscribePages = {
  malformedToken: () =>
    unsubscribeShell(
      'Invalid link',
      `<h1 style="margin-top:0;font-size:1.25rem">Invalid unsubscribe link</h1>${backLink}`,
    ),

  unknownToken: () =>
    unsubscribeShell(
      'Not found',
      `<h1 style="margin-top:0;font-size:1.25rem">Subscription not found</h1><p>This link may have already been used or is invalid.</p>${backLink}`,
    ),

  success: (email: string, repo: string) =>
    unsubscribeShell(
      'Unsubscribed',
      `<h1 style="margin-top:0;font-size:1.25rem">You are unsubscribed</h1><p>We will no longer email <strong>${escapeHtml(
        email,
      )}</strong> about releases for <strong>${escapeHtml(repo)}</strong>.</p>${backLink}`,
    ),

  serverError: () =>
    unsubscribeShell(
      'Something went wrong',
      `<h1 style="margin-top:0;font-size:1.25rem">Could not complete unsubscribe</h1><p>Please try again later.</p>${backLink}`,
    ),
};
