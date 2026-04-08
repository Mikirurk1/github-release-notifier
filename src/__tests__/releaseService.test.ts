import { releaseService } from '../services/releaseService';

describe('releaseService', () => {
  it('returns true when no previous tag exists', () => {
    const result = releaseService.isNewRelease(null, {
      tag_name: 'v1.0.0',
      html_url: 'https://example.com',
      name: 'v1',
    });

    expect(result).toBe(true);
  });

  it('returns false when tags match', () => {
    const result = releaseService.isNewRelease('v1.0.0', {
      tag_name: 'v1.0.0',
      html_url: 'https://example.com',
      name: 'v1',
    });

    expect(result).toBe(false);
  });
});
