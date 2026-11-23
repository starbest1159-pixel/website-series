import { SeriesItem, UserSession } from '../types/series';
import { sanitizeUserErrorMessage } from '../utils/requestState';

const AUTH_TOKEN_STORAGE_KEY = 'bannlai_auth_token_v1';

export class ApiRequestError extends Error {
  public readonly cancelled: boolean;
  public readonly statusCode?: number;

  constructor(message: string, options?: { cancelled?: boolean; statusCode?: number }) {
    super(sanitizeUserErrorMessage(message));
    this.name = 'ApiRequestError';
    this.cancelled = Boolean(options?.cancelled);
    this.statusCode = options?.statusCode;
  }
}

export interface CatalogMetaResult {
  items: SeriesItem[];
  totalStored: number;
  lastSyncedAt: string | null;
  platformCounts: Record<string, number>;
  syncing: boolean;
}

interface CatalogResponsePayload {
  ok: boolean;
  items?: SeriesItem[];
  totalStored?: number;
  lastSyncedAt?: string | null;
  platformCounts?: Record<string, number>;
  syncing?: boolean;
  message?: string;
}

interface SeriesDetailResponsePayload {
  ok: boolean;
  item?: SeriesItem;
  message?: string;
}

interface AuthResponsePayload {
  ok: boolean;
  authenticated?: boolean;
  user?: UserSession;
  token?: string;
  message?: string;
}

const DEFAULT_TIMEOUT_MS = 18_000;

export function getStoredAuthToken(): string | null {
  try {
    const raw = window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

export function setStoredAuthToken(token: string | null): void {
  try {
    if (token && token.trim()) {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token.trim());
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function clearStoredAuthToken(): void {
  setStoredAuthToken(null);
}

function ensureSameOriginApiPath(path: string): string {
  if (!path.startsWith('/api/')) {
    throw new ApiRequestError('เส้นทางเรียกข้อมูลไม่ถูกต้อง');
  }
  return path;
}

async function requestJson<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    signal?: AbortSignal;
    timeoutMs?: number;
  }
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (options?.signal) {
    if (options.signal.aborted) {
      throw new ApiRequestError('ยกเลิกรายการแล้ว', { cancelled: true });
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(ensureSameOriginApiPath(path), {
      method: options?.method ?? 'GET',
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
      credentials: 'include',
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as (T & { message?: string }) | null;

    if (!response.ok) {
      const serverMsg =
        data && typeof data.message === 'string' && data.message.trim()
          ? data.message.trim()
          : response.status === 401
          ? 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน'
          : 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
      throw new ApiRequestError(serverMsg, {
        statusCode: response.status,
      });
    }

    if (!data || typeof data !== 'object') {
      throw new ApiRequestError('ข้อมูลตอบกลับจากระบบไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง');
    }

    return data as T;
  } catch (err) {
    if (err instanceof ApiRequestError) {
      throw err;
    }
    if (controller.signal.aborted) {
      if (timedOut) {
        throw new ApiRequestError('การเชื่อมต่อใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง');
      }
      throw new ApiRequestError('ยกเลิกรายการแล้ว', { cancelled: true });
    }
    throw new ApiRequestError('ไม่สามารถเชื่อมต่อข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
  } finally {
    window.clearTimeout(timer);
    if (options?.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

export async function fetchCurrentSession(signal?: AbortSignal): Promise<UserSession | null> {
  try {
    const payload = await requestJson<AuthResponsePayload>('/api/auth/me', {
      signal,
      timeoutMs: 8_000,
    });
    if (payload?.ok && payload.authenticated && payload.user) {
      return payload.user;
    }
    clearStoredAuthToken();
    return null;
  } catch (err) {
    if (err instanceof ApiRequestError && err.statusCode === 401) {
      clearStoredAuthToken();
      return null;
    }
    return null;
  }
}

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<UserSession> {
  const payload = await requestJson<AuthResponsePayload>('/api/auth/login', {
    method: 'POST',
    body: input,
  });

  if (!payload?.ok || !payload.user) {
    throw new ApiRequestError(payload?.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', {
      statusCode: 401,
    });
  }

  if (payload.token) {
    setStoredAuthToken(payload.token);
  }
  return payload.user;
}

export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<UserSession> {
  const payload = await requestJson<AuthResponsePayload>('/api/auth/register', {
    method: 'POST',
    body: input,
  });

  if (!payload?.ok || !payload.user) {
    throw new ApiRequestError(payload?.message || 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้');
  }

  if (payload.token) {
    setStoredAuthToken(payload.token);
  }
  return payload.user;
}

export async function logoutSession(): Promise<void> {
  try {
    await requestJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
  } catch {
    // Clear client token regardless
  } finally {
    clearStoredAuthToken();
  }
}

export async function fetchCatalogWithMeta(options?: {
  platform?: string;
  genre?: string;
  query?: string;
  sort?: 'latest' | 'popular' | 'rating';
  signal?: AbortSignal;
}): Promise<CatalogMetaResult> {
  const params = new URLSearchParams();
  if (options?.platform && options.platform !== 'all') {
    params.set('platform', options.platform);
  }
  if (options?.genre && options.genre !== 'ทั้งหมด') {
    params.set('genre', options.genre);
  }
  if (options?.query && options.query.trim()) {
    params.set('q', options.query.trim());
  }
  if (options?.sort) {
    params.set('sort', options.sort);
  }

  const qs = params.toString();
  const payload = await requestJson<CatalogResponsePayload>(
    `/api/catalog${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );

  if (!payload || !payload.ok || !Array.isArray(payload.items)) {
    throw new ApiRequestError(
      payload?.message || 'ไม่สามารถโหลดรายการซีรีส์ได้ในขณะนี้'
    );
  }

  return {
    items: payload.items,
    totalStored: typeof payload.totalStored === 'number' ? payload.totalStored : payload.items.length,
    lastSyncedAt: payload.lastSyncedAt ?? null,
    platformCounts: payload.platformCounts ?? {},
    syncing: Boolean(payload.syncing),
  };
}

export async function fetchCatalog(options?: {
  platform?: string;
  genre?: string;
  query?: string;
  signal?: AbortSignal;
}): Promise<SeriesItem[]> {
  const res = await fetchCatalogWithMeta(options);
  return res.items;
}

export async function syncCatalogNow(signal?: AbortSignal): Promise<CatalogMetaResult> {
  const payload = await requestJson<CatalogResponsePayload>('/api/catalog/sync', {
    method: 'POST',
    signal,
    timeoutMs: 25_000,
  });

  if (!payload || !payload.ok || !Array.isArray(payload.items)) {
    throw new ApiRequestError(
      payload?.message || 'ไม่สามารถอัปเดตรายการซีรีส์ได้ในขณะนี้'
    );
  }

  return {
    items: payload.items,
    totalStored: typeof payload.totalStored === 'number' ? payload.totalStored : payload.items.length,
    lastSyncedAt: payload.lastSyncedAt ?? null,
    platformCounts: payload.platformCounts ?? {},
    syncing: Boolean(payload.syncing),
  };
}

interface EpisodeStreamResponsePayload {
  ok: boolean;
  streamUrl?: string | null;
  subtitles?: Array<{
    language: string;
    label: string;
    url: string;
    isDefault?: boolean;
  }>;
  message?: string;
}

export interface EpisodeStreamResult {
  streamUrl: string | null;
  subtitles: Array<{
    language: string;
    label: string;
    url: string;
    isDefault?: boolean;
  }>;
}

export async function fetchSeriesById(
  seriesId: string,
  options?: {
    externalId?: string;
    upstreamPlatform?: string;
    apiVersion?: 'v1' | 'v2';
    signal?: AbortSignal;
  }
): Promise<SeriesItem> {
  const safeId = encodeURIComponent(seriesId.trim());
  const params = new URLSearchParams();
  if (options?.upstreamPlatform) {
    params.set('source', options.upstreamPlatform);
  }
  if (options?.externalId) {
    params.set('extId', options.externalId);
  }
  if (options?.apiVersion) {
    params.set('v', options.apiVersion);
  }
  const qs = params.toString();

  const payload = await requestJson<SeriesDetailResponsePayload>(
    `/api/catalog/${safeId}${qs ? `?${qs}` : ''}`,
    { signal: options?.signal }
  );

  if (!payload || !payload.ok || !payload.item) {
    throw new ApiRequestError(
      payload?.message || 'ไม่พบข้อมูลซีรีส์ที่ต้องการ'
    );
  }

  return payload.item;
}

export async function fetchEpisodeStream(
  seriesId: string,
  episodeNumber: number,
  options?: {
    episodeId?: string;
    externalId?: string;
    upstreamPlatform?: string;
    apiVersion?: 'v1' | 'v2';
    signal?: AbortSignal;
  }
): Promise<EpisodeStreamResult> {
  const safeId = encodeURIComponent(seriesId.trim());
  const params = new URLSearchParams();
  params.set('ep', String(Math.max(1, Math.floor(episodeNumber))));
  if (options?.episodeId) {
    params.set('epId', options.episodeId);
  }
  if (options?.upstreamPlatform) {
    params.set('source', options.upstreamPlatform);
  }
  if (options?.externalId) {
    params.set('extId', options.externalId);
  }
  if (options?.apiVersion) {
    params.set('v', options.apiVersion);
  }

  const payload = await requestJson<EpisodeStreamResponsePayload>(
    `/api/catalog/${safeId}/stream?${params.toString()}`,
    { signal: options?.signal }
  );

  if (!payload || !payload.ok) {
    throw new ApiRequestError(
      payload?.message || 'ไม่สามารถโหลดวิดีโอได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
    );
  }

  return {
    streamUrl:
      typeof payload.streamUrl === 'string' && payload.streamUrl.trim()
        ? payload.streamUrl.trim()
        : null,
    subtitles: Array.isArray(payload.subtitles) ? payload.subtitles : [],
  };
}
