import client from 'prom-client';

client.collectDefaultMetrics();

export const subscriptionsCreatedCounter = new client.Counter({
  name: 'subscriptions_created_total',
  help: 'Total number of created subscriptions',
});

export const emailsSentCounter = new client.Counter({
  name: 'release_emails_sent_total',
  help: 'Total number of release notification emails sent',
});

export const githubApiFailuresCounter = new client.Counter({
  name: 'github_api_failures_total',
  help: 'Total number of GitHub API failures',
});

export const metricsRegistry = client.register;
