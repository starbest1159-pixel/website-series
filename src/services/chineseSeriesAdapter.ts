import type {
  Episode,
  GenreId,
  PlatformId,
  SeriesBadge,
  SeriesItem,
  SubtitleTrack,
} from '../types/series.ts';

type NonAllPlatform = Exclude<PlatformId, 'all'>;
type NonAllGenre = Exclude<GenreId, 'ทั้งหมด'>;

const VALID_PLATFORMS: readonly NonAllPlatform[] = [
  'bilibili',
  'netflix',
  'dramabox',
  'wetv',
  'iqiyi',
  'reelshort',
  'disney',
  'youtube',
  'prime',
];

const VALID_GENRES: readonly NonAllGenre[] = [
  'อนิเมะ',
  'แอ็คชั่น',
  'แฟนตาซี',
  'โรแมนติก',
  'คอมเมดี้',
  'ผจญภัย',
  'ดราม่า',
];

const VALID_BADGES: readonly SeriesBadge[] = ['VIP', 'มาแรง', 'ใหม่', 'ดูฟรี'];

const DEFAULT_FALLBACK_POSTER = '/assets/bannlai/06-character-portrait-01.png';
// Require explicit Thai-dub declaration; generic "(พากย์เสียง)" / "[พากย์เสียง]" / "（ฉบับพากย์ ）"
// from global platforms is frequently auto-translated from English "(Dubbed)" and plays English audio.
const STRICT_THAI_DUB_PATTERN =
  /พากย์\s*ไทย|พากษ์\s*ไทย|พาก\s*ไทย|พากย์เสียง\s*ไทย|เสียงพากย์\s*ไทย|เสียง\s*ไทย|เวอร์ชันพากย์\s*ไทย|เวอร์ชันพากย์เสียง\s*ไทย|thai[\s_-]*dub/i;
const DUAL_AUDIO_PATTERN =
  /(?:2\s*ภาษา|สองภาษา|หลายภาษา|dual[\s_-]*audio|multi[\s_-]*audio)/i;
const SUB_ONLY_PATTERN =
  /ซับไทยเท่านั้น|ซับไทยอย่างเดียว|thai[\s_-]*sub[\s_-]*only/i;
const OTHER_LANG_DUB_ONLY_PATTERN =
  /english[\s_-]*dub|eng[\s_-]*dub|พากย์อังกฤษ|พากย์จีน|เสียงจีน|เสียงอังกฤษ/i;
const EXPLICIT_THAI_AUDIO_CODE_PATTERN = /^(?:th|th-th|thai)$/i;

function hasThaiAudioInList(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.some((entry) => {
    if (typeof entry === 'string') {
      return EXPLICIT_THAI_AUDIO_CODE_PATTERN.test(entry.trim()) || STRICT_THAI_DUB_PATTERN.test(entry);
    }
    if (entry && typeof entry === 'object') {
      const rec = entry as Record<string, unknown>;
      const fields = [rec.language, rec.lang, rec.language_tag, rec.label, rec.name];
      return fields.some(
        (f) =>
          typeof f === 'string' &&
          (EXPLICIT_THAI_AUDIO_CODE_PATTERN.test(f.trim()) || STRICT_THAI_DUB_PATTERN.test(f))
      );
    }
    return false;
  });
}

/**
 * Verifies a drama has a meaningful title beyond tag brackets and placeholder dots
 * (filters out broken upstream placeholders such as "(พากย์)...").
 */
export function hasValidSeriesTitle(title: unknown): boolean {
  if (typeof title !== 'string') return false;
  const stripped = title
    .replace(/[\(\[\（【][^)\]）】]*[\)\]）】]/g, ' ')
    .replace(/พากย์ไทย|พากย์เสียงไทย|พากย์เสียง|เสียงไทย|ฉบับพากย์|แบบพากย์เสียง|พากย์/gi, ' ')
    .replace(/[\s.,…·\-_!?/\\|:;~'"`]+/g, '')
    .trim();
  return stripped.length >= 2;
}

/**
 * Determines whether a raw upstream drama record is strictly verified as Thai-dubbed
 * (including dual/multi-audio series that offer Thai + English/original audio tracks).
 * Rejects upstream `thai_dub: true` false positives when the title only has ambiguous
 * generic dub tags (e.g. `(พากย์เสียง)`, `[พากย์เสียง]`, `（ฉบับพากย์ ）`) that include English-only audio.
 */
export function isThaiDubbedRecord(rec: Record<string, unknown>): boolean {
  if (rec.thai_dub === false || rec.thaiDub === false || rec.isThaiDub === false) {
    return false;
  }

  const titleFields = [
    rec.title,
    rec.name,
    rec.book_name,
    rec.thaiTitle,
    rec.title_th,
    rec.thai_title,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  if (!titleFields.some((t) => hasValidSeriesTitle(t))) {
    return false;
  }

  const titleText = titleFields.join(' ');
  const audioFields = [rec.audio, rec.audio_lang, rec.dub].filter(
    (v): v is string => typeof v === 'string' && v.trim().length > 0
  );
  const audioText = audioFields.join(' ');
  const combined = `${titleText} ${audioText}`.trim();

  if (SUB_ONLY_PATTERN.test(combined)) {
    return false;
  }

  const hasExplicitThaiDub =
    STRICT_THAI_DUB_PATTERN.test(titleText) ||
    STRICT_THAI_DUB_PATTERN.test(audioText) ||
    audioFields.some((field) => EXPLICIT_THAI_AUDIO_CODE_PATTERN.test(field.trim())) ||
    hasThaiAudioInList(rec.audio_tracks ?? rec.audioTracks ?? rec.audio_langs ?? rec.audioLangs);

  if (hasExplicitThaiDub) {
    return true;
  }

  // Dual/multi-audio titles (e.g. "2 ภาษา", "สองภาษา") are accepted when upstream marks thai_dub: true
  if (
    DUAL_AUDIO_PATTERN.test(titleText) &&
    (rec.thai_dub === true || rec.thaiDub === true || rec.isThaiDub === true)
  ) {
    return true;
  }

  if (OTHER_LANG_DUB_ONLY_PATTERN.test(combined)) {
    return false;
  }

  return false;
}

/**
 * Determines whether a mapped SeriesItem is strictly verified as Thai-dubbed
 * (or dual-audio with Thai dub). Always re-validates actual titles so stale/unverified
 * disk records are purged automatically.
 */
export function isThaiDubbedSeries(item: SeriesItem): boolean {
  if (!item || item.isThaiDub === false) return false;
  if (!hasValidSeriesTitle(item.title) && !hasValidSeriesTitle(item.thaiTitle)) {
    return false;
  }
  const titleText = `${item.title || ''} ${item.thaiTitle || ''}`.trim();
  if (SUB_ONLY_PATTERN.test(titleText)) {
    return false;
  }
  if (STRICT_THAI_DUB_PATTERN.test(titleText)) {
    return true;
  }
  if (DUAL_AUDIO_PATTERN.test(titleText) && item.isThaiDub === true) {
    return true;
  }
  return false;
}

/**
 * Filters a catalog strictly to verified Thai-dubbed series.
 */
export function filterThaiDubbedSeries(items: SeriesItem[]): SeriesItem[] {
  return items.filter((item) => isThaiDubbedSeries(item));
}

/**
 * Allows only safe http/https URLs or local /assets/ paths; blocks XSS schemes.
 */
export function sanitizeMediaUrl(url: unknown, fallback = DEFAULT_FALLBACK_POSTER): string {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('/assets/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export interface ResolvedEpisodePlayback {
  streamUrl: string | null;
  subtitles: SubtitleTrack[];
  expiresAt?: string;
}

/**
 * Extracts validated WebVTT subtitle tracks from Series Jeen v2 `Part.subtitles`.
 */
export function parseSubtitleTracks(rawSubtitles: unknown): SubtitleTrack[] {
  if (!Array.isArray(rawSubtitles)) return [];
  const tracks: SubtitleTrack[] = [];

  for (const entry of rawSubtitles) {
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as Record<string, unknown>;
    const safeUrl = sanitizeMediaUrl(rec.url, '');
    if (!safeUrl) continue;

    const lang = String(rec.language ?? rec.language_tag ?? 'th').trim().slice(0, 16) || 'th';
    const label =
      typeof rec.label === 'string' && rec.label.trim()
        ? rec.label.trim().slice(0, 40)
        : lang.toLowerCase().startsWith('th')
        ? 'ซับไทย'
        : lang.toUpperCase();

    tracks.push({
      language: lang,
      label,
      url: safeUrl,
      isDefault: Boolean(rec.default) || lang.toLowerCase().startsWith('th'),
    });
  }

  return tracks;
}

/**
 * Extracts and validates a playback stream URL (HLS/MP4) from Series Jeen v1/v2 responses.
 */
export function extractStreamUrl(payload: unknown): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const safe = sanitizeMediaUrl(payload, '');
    return safe || null;
  }
  if (typeof payload !== 'object') return null;

  const obj = payload as Record<string, unknown>;
  const directCandidates = [
    obj.streamUrl,
    obj.stream_url,
    obj.video_url,
    obj.videoUrl,
    obj.play_url,
    obj.playUrl,
    obj.m3u8_url,
    obj.m3u8Url,
    obj.hls_url,
    obj.hlsUrl,
    obj.mp4_url,
    obj.url,
    obj.src,
  ];

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string') {
      const safe = sanitizeMediaUrl(candidate, '');
      if (safe) return safe;
    }
  }

  // Series Jeen v2 EpisodesResponse: { episodes: [{ episode, parts: [{ url, subtitles }] }] }
  if (Array.isArray(obj.episodes)) {
    for (const ep of obj.episodes) {
      const nested = extractStreamUrl(ep);
      if (nested) return nested;
    }
  }
  if (Array.isArray(obj.parts)) {
    for (const part of obj.parts) {
      const nested = extractStreamUrl(part);
      if (nested) return nested;
    }
  }

  const arrayCandidates = [obj.sources, obj.streams, obj.qualities, obj.urls, obj.videos];
  for (const arr of arrayCandidates) {
    if (Array.isArray(arr)) {
      for (const item of arr) {
        const nested = extractStreamUrl(item);
        if (nested) return nested;
      }
    }
  }

  const nestedContainers = [obj.data, obj.video, obj.result, obj.playback];
  for (const container of nestedContainers) {
    if (container && typeof container === 'object') {
      const nested = extractStreamUrl(container);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Extracts both playback URL and WebVTT subtitles from Series Jeen v2
 * `GET /api/dramas/{drama_id}/episodes?ep={ep}` (or v1 `/video`).
 */
export function extractEpisodePlayback(payload: unknown): ResolvedEpisodePlayback {
  if (!payload || typeof payload !== 'object') {
    return { streamUrl: extractStreamUrl(payload), subtitles: [] };
  }

  const obj = payload as Record<string, unknown>;

  // Exact Series Jeen v2 EpisodesResponse shape
  if (Array.isArray(obj.episodes) && obj.episodes.length > 0) {
    const firstEp = obj.episodes[0] as Record<string, unknown>;
    if (firstEp && Array.isArray(firstEp.parts) && firstEp.parts.length > 0) {
      const firstPart = firstEp.parts[0] as Record<string, unknown>;
      const streamUrl = sanitizeMediaUrl(firstPart.url, '') || null;
      const subtitles = parseSubtitleTracks(firstPart.subtitles);
      const expiresAt =
        typeof firstPart.url_expires_at === 'string' ? firstPart.url_expires_at : undefined;
      return { streamUrl, subtitles, expiresAt };
    }
  }

  return {
    streamUrl: extractStreamUrl(payload),
    subtitles: parseSubtitleTracks(obj.subtitles),
  };
}

/**
 * Formats seconds cleanly into MM:SS.
 */
function formatDurationMMSS(totalSeconds: number): string {
  const safe = Math.max(1, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses Series Jeen v2 `DramaDetailResponse.episodes` (`EpisodeSummary[]`)
 * or Series Jeen v1 `/alleps/{series_id}` episode responses into Episode[].
 */
export function parseExternalEpisodes(
  rawEpisodes: unknown,
  fallbackThumbnail: string,
  defaultMinutes = 40
): Episode[] {
  const safeThumb = sanitizeMediaUrl(fallbackThumbnail);

  let episodeList: unknown = rawEpisodes;
  if (rawEpisodes && !Array.isArray(rawEpisodes) && typeof rawEpisodes === 'object') {
    const obj = rawEpisodes as Record<string, unknown>;
    if (Array.isArray(obj.episodes)) episodeList = obj.episodes;
    else if (Array.isArray(obj.chapters)) episodeList = obj.chapters;
    else if (Array.isArray(obj.items)) episodeList = obj.items;
    else if (Array.isArray(obj.list)) episodeList = obj.list;
    else if (Array.isArray(obj.data)) episodeList = obj.data;
    else if (obj.data && typeof obj.data === 'object') {
      const inner = obj.data as Record<string, unknown>;
      episodeList = inner.episodes ?? inner.chapters ?? inner.items ?? inner.list ?? [];
    }
  }

  if (Array.isArray(episodeList) && episodeList.length > 0) {
    return episodeList.map((entry, idx) => {
      const rec = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
      const rawNum =
        rec.episode ??
        rec.number ??
        rec.episode_no ??
        rec.episode_number ??
        rec.chapter_no ??
        rec.ep ??
        rec.index;
      const parsedNum = Number(rawNum);
      const epNum =
        Number.isFinite(parsedNum) && parsedNum > 0 ? Math.floor(parsedNum) : idx + 1;

      const rawEpisodeId = rec.episodeId ?? rec.episode_id ?? rec.chapter_id ?? rec.vid ?? rec.id;
      const episodeId =
        rawEpisodeId !== undefined && rawEpisodeId !== null && String(rawEpisodeId).trim()
          ? String(rawEpisodeId).trim().slice(0, 80)
          : undefined;

      const rawSec = Number(rec.duration_sec ?? rec.durationSeconds ?? rec.duration_seconds);
      const rawMinOrSec = Number(rec.duration);
      let durationSeconds = defaultMinutes * 60;
      if (Number.isFinite(rawSec) && rawSec > 0) {
        durationSeconds = Math.floor(rawSec);
      } else if (Number.isFinite(rawMinOrSec) && rawMinOrSec > 0) {
        durationSeconds = Math.floor(rawMinOrSec > 180 ? rawMinOrSec : rawMinOrSec * 60);
      }

      const durationLabel =
        typeof rec.durationLabel === 'string' && rec.durationLabel.trim()
          ? rec.durationLabel.trim()
          : formatDurationMMSS(durationSeconds);

      const streamUrl = extractStreamUrl(rec) || '';
      const rawTitle = rec.title ?? rec.episode_title ?? rec.chapter_name ?? rec.name;
      const cleanTitle = typeof rawTitle === 'string' ? rawTitle.trim() : '';

      return {
        number: epNum,
        ...(episodeId ? { episodeId } : {}),
        title: cleanTitle
          ? cleanTitle.includes('ตอน')
            ? cleanTitle
            : `ตอนที่ ${epNum}: ${cleanTitle}`
          : `ตอนที่ ${epNum}`,
        durationSeconds,
        durationLabel,
        summary:
          typeof rec.summary === 'string' && rec.summary.trim()
            ? rec.summary.trim()
            : typeof rec.description === 'string' && rec.description.trim()
            ? rec.description.trim()
            : `รับชมตอนที่ ${epNum} ภาพคมชัดระดับ HD เสียงพากย์ไทย`,
        thumbnail: sanitizeMediaUrl(
          rec.thumbnail ?? rec.cover ?? rec.cover_url ?? rec.thumb ?? rec.poster,
          safeThumb
        ),
        ...(streamUrl ? { streamUrl } : {}),
      };
    });
  }

  return [
    {
      number: 1,
      title: 'ตอนที่ 1',
      durationSeconds: defaultMinutes * 60,
      durationLabel: `${String(defaultMinutes).padStart(2, '0')}:00`,
      summary: 'รับชมตอนที่ 1 ภาพคมชัดระดับ HD เสียงพากย์ไทย',
      thumbnail: safeThumb,
    },
  ];
}

export function normalizePlatform(raw: unknown): NonAllPlatform {
  if (typeof raw === 'string') {
    const lower = raw.trim().toLowerCase();
    const matched = VALID_PLATFORMS.find((p) => p === lower || lower.includes(p));
    if (matched) return matched;
    if (
      /shortmax|netshort|goodshort|moboreels|kalos|flextv|shorttv|dramawave|flickreels|melolo|vigloo|stardust|freereels|rapidtv|radreel|soda/.test(
        lower
      )
    ) {
      return 'dramabox';
    }
    if (/tencent|qq/.test(lower)) return 'wetv';
    if (/youku|mango|mgtv/.test(lower)) return 'iqiyi';
    if (/anichin|anime|donghua/.test(lower)) return 'bilibili';
  }
  return 'dramabox';
}

function normalizeGenres(raw: unknown): NonAllGenre[] {
  const list: string[] = Array.isArray(raw)
    ? raw.map((g) => {
        if (g && typeof g === 'object') {
          const rec = g as Record<string, unknown>;
          return String(rec.name ?? rec.title ?? rec.label ?? '');
        }
        return String(g);
      })
    : typeof raw === 'string'
    ? raw.split(/[,/|、\s]+/)
    : [];

  const mapped = new Set<NonAllGenre>();
  for (const item of list) {
    const clean = item.trim();
    if (!clean) continue;
    const direct = VALID_GENRES.find((g) => g === clean);
    if (direct) {
      mapped.add(direct);
      continue;
    }
    const lower = clean.toLowerCase();
    if (/romance|รัก|โรแมน|爱情|言情|sweet|ceo|ประธาน|แต่งงาน|คลั่งรัก/.test(lower)) mapped.add('โรแมนติก');
    if (/action|武侠|动作|แอ็ค|ต่อสู้|martial|revenge|แก้แค้น|ล้างแค้น|สงคราม/.test(lower)) mapped.add('แอ็คชั่น');
    if (/fantasy|仙侠|玄幻|奇幻|แฟนตาซี|เทพเซียน|ข้ามเวลา|rebirth|เกิดใหม่|ย้อนเวลา/.test(lower)) mapped.add('แฟนตาซี');
    if (/comedy|喜剧|ตลก|คอมเมดี้/.test(lower)) mapped.add('คอมเมดี้');
    if (/drama|古装|剧情|ดราม่า|จีน|ย้อนยุค|historical|urban|ครอบครัว|ธุรกิจ/.test(lower)) mapped.add('ดราม่า');
    if (/adventure|冒险|ผจญภัย/.test(lower)) mapped.add('ผจญภัย');
    if (/anime|动漫|อนิเมะ|donghua/.test(lower)) mapped.add('อนิเมะ');
  }

  return mapped.size > 0 ? Array.from(mapped) : ['ดราม่า', 'โรแมนติก'];
}

function normalizeBadge(raw: unknown, opts?: { thaiDub?: boolean; thaiSub?: boolean }): SeriesBadge {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    const direct = VALID_BADGES.find((b) => b === trimmed);
    if (direct) return direct;
    if (/vip|premium|paid/i.test(trimmed)) return 'VIP';
    if (/hot|มาแรง|热播|trending|popular/i.test(trimmed)) return 'มาแรง';
    if (/new|ใหม่|更新|latest/i.test(trimmed)) return 'ใหม่';
  }
  if (opts?.thaiDub) return 'มาแรง';
  if (opts?.thaiSub) return 'ใหม่';
  return 'ดูฟรี';
}

function extractRecordsArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  const obj = payload as Record<string, unknown>;
  const directArrays = [
    obj.items,
    obj.list,
    obj.series,
    obj.books,
    obj.dramas,
    obj.results,
    obj.data,
  ];
  for (const arr of directArrays) {
    if (Array.isArray(arr)) return arr;
  }

  if (obj.data && typeof obj.data === 'object') {
    const inner = obj.data as Record<string, unknown>;
    const innerArrays = [
      inner.items,
      inner.list,
      inner.series,
      inner.books,
      inner.dramas,
      inner.results,
    ];
    for (const arr of innerArrays) {
      if (Array.isArray(arr)) return arr;
    }
    if (inner.id || inner.series_id || inner.book_id || inner.title || inner.name) {
      return [inner];
    }
  }

  if (obj.id || obj.series_id || obj.book_id) {
    return [obj];
  }

  return [];
}

/**
 * Maps Series Jeen API (v2 `DramaListResponse` / `DramaDetailResponse` and v1 responses)
 * into validated `SeriesItem[]`.
 */
export function mapExternalCatalogPayload(
  payload: unknown,
  options?: {
    defaultPlatform?: string;
    platformDisplayName?: string;
    apiVersion?: 'v1' | 'v2';
    compactEpisodes?: boolean;
  }
): SeriesItem[] {
  const records = extractRecordsArray(payload);
  const apiVersion = options?.apiVersion;
  const upstreamPlatformHint = options?.defaultPlatform?.trim().toLowerCase();
  const compactEpisodes = Boolean(options?.compactEpisodes);

  return records
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((rec, index): SeriesItem => {
      // On Series Jeen v2, `rec.id` is the primary drama_id used by /api/dramas/{drama_id}
      const isV2Record =
        apiVersion === 'v2' ||
        (rec.platform_id !== undefined && rec.episodes_available !== undefined);

      const rawExternalId = isV2Record
        ? rec.id ?? rec.series_id ?? `v2-${index + 1}`
        : rec.series_id ?? rec.book_id ?? rec.drama_id ?? rec.externalId ?? rec.id ?? `v1-${index + 1}`;
      const externalId = String(rawExternalId).trim().slice(0, 80);

      const rawUpstreamPlatform =
        typeof rec.platform === 'string' && rec.platform.trim()
          ? rec.platform.trim().toLowerCase()
          : typeof rec.source === 'string' && rec.source.trim()
          ? rec.source.trim().toLowerCase()
          : upstreamPlatformHint ||
            (rec.platform_id !== undefined ? String(rec.platform_id) : undefined);

      const safeSlug = externalId.replace(/[^a-zA-Z0-9_-]/g, '-');
      const id = isV2Record
        ? `sj2-${safeSlug}`.slice(0, 80)
        : rawUpstreamPlatform && !safeSlug.startsWith(`${rawUpstreamPlatform}-`)
        ? `${rawUpstreamPlatform}-${safeSlug}`.slice(0, 80)
        : safeSlug.slice(0, 80) || `cn-series-${index + 1}`;

      const title = String(
        rec.title ?? rec.name ?? rec.book_name ?? `ซีรีส์จีน #${index + 1}`
      ).trim();

      const thaiTitle = String(
        rec.thaiTitle ?? rec.title_th ?? rec.thai_title ?? title
      ).trim();

      const poster = sanitizeMediaUrl(
        rec.poster ?? rec.cover ?? rec.cover_url ?? rec.poster_url ?? rec.thumb
      );
      const rawBanner = rec.heroBanner ?? rec.banner ?? rec.banner_url ?? rec.backdrop_url;
      const heroBanner = rawBanner ? sanitizeMediaUrl(rawBanner, poster) : undefined;

      const platform = normalizePlatform(
        options?.platformDisplayName ?? rawUpstreamPlatform ?? rec.platform ?? rec.source
      );
      const additionalPlatforms = Array.isArray(rec.additionalPlatforms)
        ? rec.additionalPlatforms
            .map((p) => normalizePlatform(p))
            .filter((p) => p !== platform)
        : [];
      const genres = normalizeGenres(rec.genres ?? rec.tags ?? rec.categories ?? rec.category);

      const rawDuration = Number(rec.episodeDurationMinutes ?? rec.episode_duration ?? 0);
      const episodeDurationMinutes =
        Number.isFinite(rawDuration) && rawDuration > 0
          ? Math.floor(rawDuration)
          : platform === 'dramabox' || platform === 'reelshort'
          ? 2
          : 40;

      const episodes = parseExternalEpisodes(
        rec.episodes ?? rec.chapters,
        heroBanner || poster,
        episodeDurationMinutes
      );

      const rawTotal = Number(
        rec.episodes_available ??
          rec.episode_count ??
          rec.totalEpisodes ??
          rec.total_episodes ??
          rec.chapter_count ??
          rec.episodes_count ??
          0
      );
      const totalEpisodes =
        Number.isFinite(rawTotal) && rawTotal > 0 ? Math.floor(rawTotal) : episodes.length;

      const hydratedEpisodes: Episode[] =
        !compactEpisodes && episodes.length === 1 && totalEpisodes > 1 && !episodes[0].streamUrl
          ? Array.from({ length: Math.min(totalEpisodes, 120) }, (_, idx) => ({
              number: idx + 1,
              title: `ตอนที่ ${idx + 1}`,
              durationSeconds: episodeDurationMinutes * 60,
              durationLabel: `${String(episodeDurationMinutes).padStart(2, '0')}:00`,
              summary: `ติดตามเรื่องราวเข้มข้นในตอนที่ ${idx + 1} พร้อมภาพคมชัดระดับ HD`,
              thumbnail: heroBanner || poster,
            }))
          : episodes;

      const rawRating = Number(rec.rating ?? rec.score ?? 8.9);
      const rating = Number.isFinite(rawRating)
        ? Math.min(10, Math.max(1, Math.round(rawRating * 10) / 10))
        : 8.9;

      const updatedAtRaw =
        typeof rec.updated_at === 'string' && rec.updated_at.trim()
          ? rec.updated_at.trim()
          : typeof rec.updatedAt === 'string' && rec.updatedAt.trim()
          ? rec.updatedAt.trim()
          : undefined;
      const parsedUpdatedYear = updatedAtRaw ? new Date(updatedAtRaw).getFullYear() : NaN;
      const rawYear = Number(rec.year ?? rec.release_year ?? parsedUpdatedYear ?? 2025);
      const year =
        Number.isFinite(rawYear) && rawYear >= 1980 && rawYear <= 2030
          ? Math.floor(rawYear)
          : 2025;

      const rawSynopsis = String(
        rec.synopsis ??
          rec.description ??
          rec.intro ??
          rec.introduction ??
          'ติดตามซีรีส์จีนพากย์ไทยคุณภาพคมชัดระดับ HD ครบทุกตอน'
      )
        .replace(/<[^>]+>/g, '')
        .trim();

      const isThaiDub = isThaiDubbedRecord(rec);
      const audioLabel = isThaiDub
        ? 'พากย์ไทย'
        : rec.thai_sub === true
        ? 'ซับไทย'
        : undefined;

      return {
        id,
        externalId,
        ...(rawUpstreamPlatform ? { upstreamPlatform: rawUpstreamPlatform } : {}),
        apiVersion: isV2Record ? 'v2' : 'v1',
        title,
        thaiTitle,
        heroTagline:
          typeof rec.heroTagline === 'string' && rec.heroTagline.trim()
            ? rec.heroTagline.trim()
            : audioLabel
            ? `${audioLabel} · คมชัดระดับ HD ครบทุกตอน`
            : undefined,
        heroBanner: heroBanner || poster,
        poster,
        platform,
        additionalPlatforms,
        genres,
        rating,
        reviewCountLabel:
          typeof rec.reviewCountLabel === 'string' && rec.reviewCountLabel.trim()
            ? rec.reviewCountLabel.trim()
            : typeof rec.views === 'number' && rec.views >= 1000
            ? `${Math.round(rec.views / 1000)}K`
            : '12K',
        year,
        totalEpisodes,
        episodeDurationMinutes,
        badge: normalizeBadge(rec.badge ?? (rec.is_vip ? 'VIP' : undefined), {
          thaiDub: isThaiDub,
          thaiSub: Boolean(rec.thai_sub),
        }),
        synopsis: rawSynopsis || 'ติดตามซีรีส์จีนพากย์ไทยคุณภาพคมชัดระดับ HD ครบทุกตอน',
        studio:
          typeof rec.studio === 'string' && rec.studio.trim()
            ? rec.studio.trim()
            : options?.platformDisplayName || 'Chinese Drama Studio',
        isThaiDub,
        ...(updatedAtRaw ? { updatedAt: updatedAtRaw } : {}),
        isFeaturedHero: Boolean(rec.isFeaturedHero ?? index < 4),
        isPopular: Boolean(rec.isPopular ?? index < 6),
        sceneTheme:
          rec.sceneTheme === 'sakura' ||
          rec.sceneTheme === 'shadow' ||
          rec.sceneTheme === 'apocalypse' ||
          rec.sceneTheme === 'ocean' ||
          rec.sceneTheme === 'wisteria' ||
          rec.sceneTheme === 'urban'
            ? rec.sceneTheme
            : 'sakura',
        episodes: hydratedEpisodes,
      };
    });
}
