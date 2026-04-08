import { AxiosError } from 'axios';
import { subscriptionsCreatedCounter } from '@/config/metrics';
import { githubClient } from '@/clients/githubClient';
import { subscriptionRepository } from '@/repositories/subscriptionRepository';
import { logger } from '@/config/logger';
import { ExternalServiceError, NotFoundError, ValidationError } from '@/utils/errors';

const repoRegex = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 320;
const MAX_REPO_LENGTH = 200;

const parseRepo = (repo: string): { owner: string; name: string } => {
  if (!repoRegex.test(repo)) {
    throw new ValidationError('Invalid repository format. Expected "owner/repo".');
  }

  const [owner, name] = repo.split('/');
  return { owner, name };
};

const parseCreateSubscriptionInput = (
  input: unknown,
): {
  email: string;
  repo: string;
} => {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Request body must be a JSON object.');
  }

  const candidate = input as { email?: unknown; repo?: unknown };
  if (typeof candidate.email !== 'string' || typeof candidate.repo !== 'string') {
    throw new ValidationError('email and repo are required.');
  }

  const email = candidate.email.toLowerCase().trim();
  const repo = candidate.repo.trim();

  if (!email || !repo) {
    throw new ValidationError('email and repo are required.');
  }

  if (email.length > MAX_EMAIL_LENGTH) {
    throw new ValidationError('Email is too long.');
  }

  if (repo.length > MAX_REPO_LENGTH) {
    throw new ValidationError('Repository name is too long.');
  }

  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format.');
  }

  return { email, repo };
};

export const subscriptionService = {
  parseRepo,

  async createSubscription(input: unknown, repoArg?: string) {
    const payload = typeof input === 'string' ? { email: input, repo: repoArg } : input;
    const { email, repo } = parseCreateSubscriptionInput(payload);
    const { owner, name } = parseRepo(repo);

    try {
      await githubClient.getRepository(owner, name);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        throw new NotFoundError('Repository not found on GitHub.');
      }
      throw new ExternalServiceError('Failed to validate repository with GitHub API.');
    }

    const exists = await subscriptionRepository.findByEmailAndRepo(email, repo);
    if (exists) {
      logger.debug({ email, repo, subscriptionId: exists.id }, 'Subscription already exists');
      return exists;
    }

    const created = await subscriptionRepository.create({
      email,
      repo,
    });

    logger.info({ email, repo, subscriptionId: created.id }, 'Subscription created');
    subscriptionsCreatedCounter.inc();
    return created;
  },
};
