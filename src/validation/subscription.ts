import { ValidationError } from '@/utils/errors';

const REPO_SLUG_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MAX_SUBSCRIPTION_EMAIL_LENGTH = 320;
export const MAX_REPO_SLUG_LENGTH = 200;

export function parseRepoSlug(slug: string): { owner: string; name: string } {
  const trimmed = slug.trim();
  if (!REPO_SLUG_PATTERN.test(trimmed)) {
    throw new ValidationError('Invalid repository format. Expected "owner/repo".');
  }
  const [owner, name] = trimmed.split('/');
  return { owner, name };
}

export function readCreateSubscriptionBody(body: unknown): { email: string; repo: string } {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const record = body as Record<string, unknown>;
  if (typeof record.email !== 'string' || typeof record.repo !== 'string') {
    throw new ValidationError('email and repo are required.');
  }

  const email = record.email.toLowerCase().trim();
  const repo = record.repo.trim();

  if (!email || !repo) {
    throw new ValidationError('email and repo are required.');
  }

  if (email.length > MAX_SUBSCRIPTION_EMAIL_LENGTH) {
    throw new ValidationError('Email is too long.');
  }

  if (repo.length > MAX_REPO_SLUG_LENGTH) {
    throw new ValidationError('Repository name is too long.');
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new ValidationError('Invalid email format.');
  }

  return { email, repo };
}
