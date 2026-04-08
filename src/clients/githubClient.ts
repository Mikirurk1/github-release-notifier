import axios, { AxiosError } from 'axios';
import { cacheClient } from '@/clients/cacheClient';
import { env } from '@/config/env';
import { githubApiFailuresCounter } from '@/config/metrics';
import { sleep } from '@/utils/asyncUtils';

export interface GithubRepoResponse {
  full_name: string;
}

export interface GithubReleaseResponse {
  tag_name: string;
  html_url: string;
  name: string;
}

const githubApi = axios.create({
  baseURL: env.githubApiBaseUrl,
  headers: {
    Accept: 'application/vnd.github+json',
    ...(env.githubToken ? { Authorization: `Bearer ${env.githubToken}` } : {}),
  },
  timeout: 10000,
});

const withBackoff = async <T>(fn: () => Promise<T>): Promise<T> => {
  const delays = [500, 1000, 2000];

  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const retryable = status === 429 || (status !== undefined && status >= 500);

      if (!retryable || attempt === delays.length) {
        githubApiFailuresCounter.inc();
        throw error;
      }

      await sleep(delays[attempt]);
    }
  }

  throw new Error('Unreachable retry state');
};

const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!cacheClient) return null;
  const raw = await cacheClient.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
};

const cacheSet = async (key: string, value: unknown): Promise<void> => {
  if (!cacheClient) return;
  await cacheClient.setex(key, env.githubCacheTtlSec, JSON.stringify(value));
};

export const githubClient = {
  async getRepository(owner: string, repo: string): Promise<GithubRepoResponse> {
    const cacheKey = `github:repo:${owner}/${repo}`;
    const cached = await cacheGet<GithubRepoResponse>(cacheKey);
    if (cached) return cached;

    const response = await withBackoff(() => githubApi.get<GithubRepoResponse>(`/repos/${owner}/${repo}`));
    await cacheSet(cacheKey, response.data);
    return response.data;
  },

  async getLatestRelease(owner: string, repo: string): Promise<GithubReleaseResponse | null> {
    const cacheKey = `github:release:${owner}/${repo}`;
    const cached = await cacheGet<GithubReleaseResponse>(cacheKey);
    if (cached) return cached;

    try {
      const response = await withBackoff(() => githubApi.get<GithubReleaseResponse>(`/repos/${owner}/${repo}/releases/latest`));
      await cacheSet(cacheKey, response.data);
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },
};
