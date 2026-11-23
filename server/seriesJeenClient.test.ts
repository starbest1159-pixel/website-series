import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeriesJeenHeaders,
  clearSeriesJeenCache,
  fetchSeriesJeenCatalog,
  fetchSeriesJeenDetail,
  fetchSeriesJeenVideoStream,
  getSeriesJeenConfig,
  isValidPlatformSlug,
  isValidSeriesIdentifier,
  normalizeAllowedSeriesJeenOrigin,
  SERIESJEEN_V1_URL,
  SERIESJEEN_V2_URL,
} from './seriesJeenClient';

test('strict origin allowlist accepts ONLY api.seriesjeen.online and api-v2.seriesjeen.online', () => {
  assert.equal(normalizeAllowedSeriesJeenOrigin('https://api.seriesjeen.online'), SERIESJEEN_V1_URL);
  assert.equal(normalizeAllowedSeriesJeenOrigin('https://api-v2.seriesjeen.online/'), SERIESJEEN_V2_URL);
  assert.equal(normalizeAllowedSeriesJeenOrigin('https://evil.example.com'), null);
  assert.equal(normalizeAllowedSeriesJeenOrigin('http://api.seriesjeen.online'), null);
});

test('getSeriesJeenConfig defaults to v2 primary and rejects non-allowlisted origins', () => {
  assert.equal(getSeriesJeenConfig({}), null);

  const cfgDefault = getSeriesJeenConfig({
    SERIESJEEN_API_KEY: 'seriesjeen_test_key_123',
    SERIESJEEN_API_BASE_URL: 'https://other-provider.example.com',
  });
  assert.ok(cfgDefault);
  assert.equal(cfgDefault.v1BaseUrl, SERIESJEEN_V1_URL);
  assert.equal(cfgDefault.v2BaseUrl, SERIESJEEN_V2_URL);
  assert.equal(cfgDefault.preferVersion, 'v2');

  const cfgV1 = getSeriesJeenConfig({
    SERIESJEEN_API_KEY: 'seriesjeen_test_key_123',
    SERIESJEEN_API_BASE_URL: 'https://api.seriesjeen.online',
  });
  assert.ok(cfgV1);
  assert.equal(cfgV1.preferVersion, 'v1');
});

test('buildSeriesJeenHeaders adds Bearer prefix without double-prefixing', () => {
  assert.equal(buildSeriesJeenHeaders('seriesjeen_abc').Authorization, 'Bearer seriesjeen_abc');
  assert.equal(buildSeriesJeenHeaders('Bearer seriesjeen_abc').Authorization, 'Bearer seriesjeen_abc');
});

test('getSeriesJeenConfig supports separate V1 and V2 API keys per origin', () => {
  const cfgBoth = getSeriesJeenConfig({
    SERIESJEEN_V1_API_KEY: 'key_v1_only',
    SERIESJEEN_V2_API_KEY: 'key_v2_only',
  });
  assert.ok(cfgBoth);
  assert.equal(cfgBoth.v1ApiKey, 'key_v1_only');
  assert.equal(cfgBoth.v2ApiKey, 'key_v2_only');
  assert.equal(cfgBoth.preferVersion, 'v2');

  const cfgV1Only = getSeriesJeenConfig({
    SERIESJEEN_V1_API_KEY: 'key_v1_only',
  });
  assert.ok(cfgV1Only);
  assert.equal(cfgV1Only.v1ApiKey, 'key_v1_only');
  assert.equal(cfgV1Only.v2ApiKey, '');
  assert.equal(cfgV1Only.preferVersion, 'v1');
});

test('validators reject path traversal and unsafe slugs/identifiers', () => {
  assert.equal(isValidPlatformSlug('shortmax'), true);
  assert.equal(isValidPlatformSlug('../admin'), false);
  assert.equal(isValidSeriesIdentifier('drama_12345'), true);
  assert.equal(isValidSeriesIdentifier('123/../../secret'), false);
});

test('fetchSeriesJeenCatalog auto-discovers v2 platforms and loads dramas, detail, and fresh signed episode stream', async () => {
  clearSeriesJeenCache();
  const cfg = getSeriesJeenConfig({
    SERIESJEEN_API_KEY: 'seriesjeen_live_token',
  })!;

  const hitUrls: string[] = [];
  const mockFetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    hitUrls.push(url);
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer seriesjeen_live_token');

    if (url === `${SERIESJEEN_V2_URL}/api/platforms`) {
      return new Response(
        JSON.stringify({
          total: 2,
          items: [
            { id: 1, name: 'DramaBox', drama_count: 500, episode_count: 25000, has_access: true },
            { id: 2, name: 'LockedPlat', drama_count: 100, episode_count: 1000, has_access: false },
          ],
        }),
        { status: 200 }
      );
    }

    if (url.startsWith(`${SERIESJEEN_V2_URL}/api/platforms/1/dramas`)) {
      return new Response(
        JSON.stringify({
          page: 1,
          page_size: 20,
          total: 1,
          total_pages: 1,
          items: [
            {
              id: 777,
              series_id: '777',
              platform_id: 1,
              title: 'ท่านประธานคลั่งรัก',
              description: 'โรแมนติกคอมเมดี้สุดฟิน',
              episode_count: 50,
              episodes_available: 50,
              genres: ['โรแมนติก'],
              locale: 'th',
              thai_dub: false,
              thai_sub: true,
              poster: 'https://cdn.seriesjeen.online/p777.jpg',
            },
          ],
        }),
        { status: 200 }
      );
    }

    if (url === `${SERIESJEEN_V2_URL}/api/dramas/777`) {
      return new Response(
        JSON.stringify({
          id: 777,
          series_id: '777',
          platform_id: 1,
          title: 'ท่านประธานคลั่งรัก',
          description: 'เรื่องย่อเต็ม',
          episode_count: 2,
          episodes_available: 2,
          genres: ['โรแมนติก'],
          locale: 'th',
          thai_dub: false,
          thai_sub: true,
          poster: 'https://cdn.seriesjeen.online/p777.jpg',
          episodes: [
            { episode: 1, parts: 1, size_bytes: 1000, duration_sec: 120 },
            { episode: 2, parts: 1, size_bytes: 1200, duration_sec: 130 },
          ],
        }),
        { status: 200 }
      );
    }

    if (url === `${SERIESJEEN_V2_URL}/api/dramas/777/episodes?ep=1`) {
      return new Response(
        JSON.stringify({
          drama_id: 777,
          title: 'ท่านประธานคลั่งรัก',
          episode_count: 2,
          episodes: [
            {
              episode: 1,
              parts: [
                {
                  part: 1,
                  of: 1,
                  url: 'https://cdn.seriesjeen.online/stream-777-ep1.mp4',
                  url_expires_at: '2026-11-19T12:00:00Z',
                  size_bytes: 1000,
                  duration_sec: 120,
                  subtitles: [
                    {
                      language: 'th',
                      label: 'ซับไทย',
                      format: 'webvtt',
                      default: true,
                      forced: false,
                      sdh: false,
                      url: 'https://cdn.seriesjeen.online/sub-777-ep1.vtt',
                    },
                  ],
                },
              ],
            },
          ],
        }),
        { status: 200 }
      );
    }

    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  const catalog = await fetchSeriesJeenCatalog(cfg, {}, mockFetch);
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].id, 'sj2-777');
  assert.equal(catalog[0].thaiTitle, 'ท่านประธานคลั่งรัก');

  const detail = await fetchSeriesJeenDetail(cfg, { seriesId: '777', apiVersion: 'v2' }, mockFetch);
  assert.ok(detail);
  assert.equal(detail.episodes.length, 2);
  assert.equal(detail.episodes[0].durationLabel, '02:00');

  const playback = await fetchSeriesJeenVideoStream(
    cfg,
    { seriesId: '777', episodeNumber: 1, apiVersion: 'v2' },
    mockFetch
  );
  assert.equal(playback.streamUrl, 'https://cdn.seriesjeen.online/stream-777-ep1.mp4');
  assert.equal(playback.subtitles.length, 1);
  assert.equal(playback.subtitles[0].url, 'https://cdn.seriesjeen.online/sub-777-ep1.vtt');
});

test('fetchSeriesJeenCatalog automatically falls back to v1 when v2 returns 503', async () => {
  clearSeriesJeenCache();
  const cfg = getSeriesJeenConfig({
    SERIESJEEN_API_KEY: 'seriesjeen_live_token',
    SERIESJEEN_PLATFORMS: 'dramabox',
  })!;

  const mockFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.startsWith(SERIESJEEN_V2_URL)) {
      return new Response('Unavailable', { status: 503 });
    }
    assert.ok(url.startsWith(`${SERIESJEEN_V1_URL}/api/platform/dramabox/list`));
    return new Response(
      JSON.stringify({
        items: [
          {
            series_id: 'v1-88',
            title: 'V1 Fallback Drama',
            title_th: 'ซีรีส์สำรอง V1',
            cover_url: 'https://cdn.seriesjeen.online/v1.jpg',
            episode_count: 10,
          },
        ],
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  const items = await fetchSeriesJeenCatalog(cfg, { platform: 'dramabox' }, mockFetch);
  assert.equal(items.length, 1);
  assert.equal(items[0].apiVersion, 'v1');
  assert.equal(items[0].thaiTitle, 'ซีรีส์สำรอง V1');
});
