import type {
  AuthValidationResult,
  Episode,
  GenreId,
  PlatformId,
  SeriesBadge,
  SeriesItem,
  SortOption,
  WatchHistoryEntry,
} from '../types/series.ts';

export interface FilterCriteria {
  platform?: PlatformId;
  genre?: GenreId;
  query?: string;
  badge?: SeriesBadge | 'all';
}

export function filterSeries(
  seriesList: SeriesItem[],
  criteria: FilterCriteria
): SeriesItem[] {
  const { platform = 'all', genre = 'ทั้งหมด', query = '', badge = 'all' } = criteria;
  const normalizedQuery = query.trim().toLowerCase();

  return seriesList.filter((item) => {
    if (platform !== 'all') {
      const matchesPlatform =
        item.platform === platform || item.additionalPlatforms.includes(platform);
      if (!matchesPlatform) return false;
    }

    if (genre !== 'ทั้งหมด') {
      if (!item.genres.includes(genre)) return false;
    }

    if (badge !== 'all') {
      if (item.badge !== badge) return false;
    }

    if (normalizedQuery.length > 0) {
      const haystack = `${item.title} ${item.thaiTitle} ${item.studio} ${item.genres.join(' ')} ${item.platform}`.toLowerCase();
      if (!haystack.includes(normalizedQuery)) return false;
    }

    return true;
  });
}

function getUpdatedTimestamp(item: SeriesItem): number {
  if (!item.updatedAt) return 0;
  const parsed = Date.parse(item.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortSeries(
  seriesList: SeriesItem[],
  sortBy: SortOption
): SeriesItem[] {
  const copy = [...seriesList];
  switch (sortBy) {
    case 'rating':
      return copy.sort((a, b) => b.rating - a.rating);
    case 'latest':
      return copy.sort((a, b) => {
        const tsDiff = getUpdatedTimestamp(b) - getUpdatedTimestamp(a);
        if (tsDiff !== 0) return tsDiff;
        return b.year - a.year || b.rating - a.rating;
      });
    case 'popular':
    default:
      return copy.sort((a, b) => {
        const popDiff = Number(Boolean(b.isPopular)) - Number(Boolean(a.isPopular));
        if (popDiff !== 0) return popDiff;
        const tsDiff = getUpdatedTimestamp(b) - getUpdatedTimestamp(a);
        if (tsDiff !== 0) return tsDiff;
        return b.rating - a.rating;
      });
  }
}

export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getNextEpisode(
  series: SeriesItem,
  currentEpisodeNumber: number
): Episode | null {
  const idx = series.episodes.findIndex((ep) => ep.number === currentEpisodeNumber);
  if (idx === -1 || idx + 1 >= series.episodes.length) {
    return null;
  }
  return series.episodes[idx + 1];
}

export function toggleFavoriteId(favorites: string[], seriesId: string): string[] {
  if (favorites.includes(seriesId)) {
    return favorites.filter((id) => id !== seriesId);
  }
  return [seriesId, ...favorites];
}

export function upsertWatchHistory(
  history: WatchHistoryEntry[],
  entry: WatchHistoryEntry,
  maxItems = 20
): WatchHistoryEntry[] {
  const filtered = history.filter((item) => item.seriesId !== entry.seriesId);
  return [entry, ...filtered].slice(0, maxItems);
}

export function validateAuthForm(input: {
  mode: 'login' | 'register';
  displayName?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}): AuthValidationResult {
  const errors: AuthValidationResult['errors'] = {};
  const email = input.email.trim();
  const password = input.password;

  if (input.mode === 'register') {
    const name = (input.displayName ?? '').trim();
    if (name.length < 2) {
      errors.displayName = 'กรุณากรอกชื่อผู้ใช้อย่างน้อย 2 ตัวอักษร';
    }
  }

  if (!email) {
    errors.email = 'กรุณากรอกอีเมลของคุณ';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
  }

  if (!password) {
    errors.password = 'กรุณากรอกรหัสผ่าน';
  } else if (password.length < 6) {
    errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
  }

  if (input.mode === 'register') {
    if (input.confirmPassword !== password) {
      errors.confirmPassword = 'รหัสผ่านยืนยันไม่ตรงกัน';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
