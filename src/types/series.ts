export type PlatformId =
  | 'all'
  | 'bilibili'
  | 'netflix'
  | 'dramabox'
  | 'wetv'
  | 'iqiyi'
  | 'reelshort'
  | 'disney'
  | 'youtube'
  | 'prime';

export type GenreId =
  | 'ทั้งหมด'
  | 'แอ็คชั่น'
  | 'แฟนตาซี'
  | 'โรแมนติก'
  | 'คอมเมดี้'
  | 'ผจญภัย'
  | 'ดราม่า'
  | 'อนิเมะ';

export type SeriesBadge = 'VIP' | 'มาแรง' | 'ใหม่' | 'ดูฟรี';

export type SortOption = 'popular' | 'rating' | 'latest';

export type AppView =
  | 'home'
  | 'catalog'
  | 'detail'
  | 'player'
  | 'favorites'
  | 'history'
  | 'settings';

export type VideoQuality = '1080p HD' | '720p' | '480p';
export type SubtitleLang = 'TH' | 'EN' | 'OFF';

export interface PlatformMeta {
  id: PlatformId;
  label: string;
  accentColor: string;
  shortCode: string;
}

export type RequestStatus = 'idle' | 'loading' | 'success' | 'error' | 'cancelled';

export interface StatusNotice {
  id: number;
  status: Exclude<RequestStatus, 'idle' | 'loading'>;
  title: string;
  detail?: string;
  canRetry?: boolean;
}

export interface SubtitleTrack {
  language: string;
  label: string;
  url: string;
  isDefault?: boolean;
}

export interface Episode {
  number: number;
  episodeId?: string;
  title: string;
  durationSeconds: number;
  durationLabel: string;
  summary: string;
  thumbnail: string;
  streamUrl?: string;
  subtitles?: SubtitleTrack[];
}

export interface SeriesItem {
  id: string;
  externalId?: string;
  upstreamPlatform?: string;
  apiVersion?: 'v1' | 'v2';
  title: string;
  thaiTitle: string;
  heroTagline?: string;
  heroBanner?: string;
  poster: string;
  platform: Exclude<PlatformId, 'all'>;
  additionalPlatforms: Exclude<PlatformId, 'all'>[];
  genres: Exclude<GenreId, 'ทั้งหมด'>[];
  rating: number;
  reviewCountLabel: string;
  year: number;
  totalEpisodes: number;
  episodeDurationMinutes: number;
  badge: SeriesBadge;
  synopsis: string;
  studio: string;
  isThaiDub?: boolean;
  updatedAt?: string;
  isFeaturedHero?: boolean;
  isPopular?: boolean;
  sceneTheme: 'sakura' | 'shadow' | 'apocalypse' | 'ocean' | 'wisteria' | 'urban';
  episodes: Episode[];
}

export interface WatchHistoryEntry {
  seriesId: string;
  episodeNumber: number;
  progressSeconds: number;
  durationSeconds: number;
  watchedAt: number;
}

export interface UserSession {
  id?: string;
  name: string;
  email: string;
  isVip: boolean;
  vipExpiryLabel: string;
  provider: 'email' | 'google' | 'line';
}

export interface AppSettings {
  theme: 'light' | 'dark';
  defaultQuality: VideoQuality;
  autoplayNext: boolean;
  defaultSubtitle: SubtitleLang;
  showSakuraParticles: boolean;
}

export interface AuthValidationResult {
  valid: boolean;
  errors: {
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
}
