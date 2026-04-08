import { GithubReleaseResponse } from '@/clients/githubClient';

export const releaseService = {
  isNewRelease(lastSeenTag: string | null, latestRelease: GithubReleaseResponse | null): boolean {
    if (!latestRelease) return false;
    if (!lastSeenTag) return true;
    return latestRelease.tag_name !== lastSeenTag;
  },
};
