import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildClearSessionCookieHeader,
  buildSessionCookieHeader,
  defaultAuthStore,
  extractTokenFromHeaders,
} from './server/authStore.ts';
import { defaultCatalogStore } from './server/catalogStore.ts';
import {
  fetchSeriesJeenDeepCatalog,
  fetchSeriesJeenDetail,
  fetchSeriesJeenVideoStream,
  getSeriesJeenConfig,
  isValidPlatformSlug,
  isValidSeriesIdentifier,
} from './server/seriesJeenClient.ts';
import { SERIES_CATALOG } from './src/data/catalog.ts';
import { filterThaiDubbedSeries } from './src/services/chineseSeriesAdapter.ts';
import type { GenreId, PlatformId, SeriesItem, UserSession } from './src/types/series.ts';
import { filterSeries, sortSeries } from './src/utils/catalogLogic.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const PERIODIC_SYNC_INTERVAL_MS = 45 * 60 * 1000; // Refresh latest uploads & poster URLs every 45 min

// Allowed origins for Android APK / Capacitor WebView clients
const DEFAULT_APK_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'https://localhost',
  'http://localhost',
  'http://localhost:3000',
]);

interface AuthenticatedRequest extends Request {
  authUser?: UserSession;
}

function getAllowedOrigins(): Set<string> {
  const set = new Set(DEFAULT_APK_ORIGINS);
  const extra = process.env.CORS_ALLOWED_ORIGINS || '';
  for (const origin of extra.split(',')) {
    const trimmed = origin.trim();
    if (trimmed) set.add(trimmed);
  }
  return set;
}

function parseApiVersionParam(raw: unknown): 'v1' | 'v2' | undefined {
  if (raw === 'v1' || raw === 'v2') return raw;
  return undefined;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  const token = extractTokenFromHeaders({
    authorization: req.headers.authorization,
    cookie: req.headers.cookie,
  });
  const user = defaultAuthStore.verifyToken(token);
  if (!user) {
    res.status(401).json({
      ok: false,
      authenticated: false,
      message: 'กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน',
    });
    return;
  }
  req.authUser = user;
  next();
}

let activeInitialSync: Promise<void> | null = null;
let deepSyncRunning = false;

/**
 * Runs a fast latest-first Thai-dubbed sync (pages 1-2 across all platforms) and immediately
 * saves results to server/data/series-store.json, then triggers deep background harvesting
 * across additional pages to collect as many Thai-dubbed series as possible.
 */
async function syncCatalogIntoStore(options?: { deep?: boolean; bypassCache?: boolean }): Promise<void> {
  const sjConfig = getSeriesJeenConfig();
  if (!sjConfig) {
    return;
  }

  if (options?.deep) {
    if (deepSyncRunning) return;
    deepSyncRunning = true;
    try {
      await fetchSeriesJeenDeepCatalog(sjConfig, {
        startPage: 1,
        maxPagesPerPlatform: 500,
        pageSize: 50,
        sort: 'latest',
        thaiDubOnly: true,
        compactEpisodes: true,
        bypassCache: options.bypassCache ?? true,
        onBatch: (batch) => {
          defaultCatalogStore.upsertSeries(batch);
        },
      });
    } catch {
      // Retain already persisted items if upstream throttles or fails
    } finally {
      deepSyncRunning = false;
    }
    return;
  }

  if (activeInitialSync) {
    await activeInitialSync;
    return;
  }

  activeInitialSync = (async () => {
    try {
      await fetchSeriesJeenDeepCatalog(sjConfig, {
        startPage: 1,
        maxPagesPerPlatform: 3,
        pageSize: 50,
        sort: 'latest',
        thaiDubOnly: true,
        compactEpisodes: true,
        bypassCache: options?.bypassCache ?? true,
        onBatch: (batch) => {
          defaultCatalogStore.upsertSeries(batch);
        },
      });
    } catch {
      // Keep stored items on transient upstream errors
    } finally {
      activeInitialSync = null;
    }
  })();

  await activeInitialSync;

  // Launch background deep sync to collect ALL remaining pages & store permanently
  if (!deepSyncRunning) {
    void syncCatalogIntoStore({ deep: true, bypassCache: options?.bypassCache ?? true });
  }
}

async function ensureStoredCatalogItems(): Promise<{
  items: SeriesItem[];
  totalStored: number;
  lastSyncedAt: string | null;
  platformCounts: Record<string, number>;
  syncing: boolean;
}> {
  let snapshot = defaultCatalogStore.loadFromDisk();
  const sjConfig = getSeriesJeenConfig();

  if (sjConfig && snapshot.items.length === 0) {
    await syncCatalogIntoStore({ deep: false });
    snapshot = defaultCatalogStore.getSnapshot();
  }

  if (snapshot.items.length > 0) {
    return {
      items: snapshot.items,
      totalStored: snapshot.totalStored,
      lastSyncedAt: snapshot.lastSyncedAt,
      platformCounts: snapshot.platformCounts,
      syncing: deepSyncRunning || Boolean(activeInitialSync),
    };
  }

  // Fallback when no API key is configured yet: return strictly verified Thai-dubbed items only
  const fallback = filterThaiDubbedSeries(SERIES_CATALOG);
  return {
    items: fallback,
    totalStored: fallback.length,
    lastSyncedAt: null,
    platformCounts: {},
    syncing: false,
  };
}

async function startServer() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  // Load persisted Thai-dubbed catalog from disk immediately on startup
  const bootSnapshot = defaultCatalogStore.loadFromDisk();
  if (getSeriesJeenConfig()) {
    // Warm up latest uploads on startup & run deep harvest in background
    void syncCatalogIntoStore({ deep: bootSnapshot.items.length > 0 });
    const refreshTimer = setInterval(() => {
      void syncCatalogIntoStore({ deep: true });
    }, PERIODIC_SYNC_INTERVAL_MS);
    refreshTimer.unref?.();
  }

  // Security hardening: never leak server signature or internal details
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    // Keep existing image URLs working after the public/assets folder was removed.
    // Numbered image files are still present at the repository root.
    const match = req.path.match(/^\/assets\/bannlai\/(\d{2})-[^/]+\.png$/i);
    if (match) {
      const assetName = fs
        .readdirSync(__dirname)
        .find((name) => name.startsWith(`${match[1]}-`) && name.toLowerCase().endsWith('.png'));
      if (assetName) {
        res.sendFile(path.join(__dirname, assetName));
        return;
      }
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Accept,Authorization');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use(express.json({ limit: '64kb' }));

  // Lightweight readiness endpoint (no env, version, or upstream metadata exposed)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true });
  });

  // ---- Authentication Routes (Mandatory Login Gate) ----
  app.get('/api/auth/me', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const token = extractTokenFromHeaders({
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    });
    const user = defaultAuthStore.verifyToken(token);
    if (!user) {
      res.status(401).json({ ok: false, authenticated: false });
      return;
    }
    res.json({ ok: true, authenticated: true, user });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = (req.body || {}) as Record<string, unknown>;
    const result = defaultAuthStore.register({
      name: typeof body.name === 'string' ? body.name : '',
      email: typeof body.email === 'string' ? body.email : '',
      password: typeof body.password === 'string' ? body.password : '',
    });

    if (!result.ok) {
      res.status(result.status).json({ ok: false, message: result.message });
      return;
    }

    res.setHeader(
      'Set-Cookie',
      buildSessionCookieHeader(result.token, process.env.NODE_ENV === 'production')
    );
    res.status(201).json({
      ok: true,
      authenticated: true,
      user: result.user,
      token: result.token,
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = (req.body || {}) as Record<string, unknown>;
    const result = defaultAuthStore.login({
      email: typeof body.email === 'string' ? body.email : '',
      password: typeof body.password === 'string' ? body.password : '',
    });

    if (!result.ok) {
      res.status(result.status).json({ ok: false, message: result.message });
      return;
    }

    res.setHeader(
      'Set-Cookie',
      buildSessionCookieHeader(result.token, process.env.NODE_ENV === 'production')
    );
    res.json({
      ok: true,
      authenticated: true,
      user: result.user,
      token: result.token,
    });
  });

  app.post('/api/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Set-Cookie', buildClearSessionCookieHeader());
    res.json({ ok: true });
  });

  // ---- Protected Catalog Routes (Login Required + Thai-Dubbed Only + Stored Locally) ----
  app.get('/api/catalog', requireAuth, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const platform =
      typeof req.query.platform === 'string' ? req.query.platform.trim().slice(0, 32) : 'all';
    const genre =
      typeof req.query.genre === 'string' ? req.query.genre.trim().slice(0, 32) : 'ทั้งหมด';
    const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 80) : '';
    const sortParam =
      req.query.sort === 'popular' || req.query.sort === 'rating' || req.query.sort === 'latest'
        ? req.query.sort
        : 'latest';

    try {
      const stored = await ensureStoredCatalogItems();
      const thaiDubOnly = filterThaiDubbedSeries(stored.items);
      const filtered = filterSeries(thaiDubOnly, {
        platform: (platform || 'all') as PlatformId,
        genre: (genre || 'ทั้งหมด') as GenreId,
        query: q,
      });
      const ordered = sortSeries(filtered, sortParam);

      res.json({
        ok: true,
        items: ordered,
        totalStored: stored.totalStored,
        lastSyncedAt: stored.lastSyncedAt,
        platformCounts: stored.platformCounts,
        syncing: stored.syncing,
      });
    } catch {
      res.status(502).json({
        ok: false,
        message: 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  });

  // On-demand refresh of latest Thai-dubbed catalog into system storage (Login Required)
  app.post('/api/catalog/sync', requireAuth, async (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      await syncCatalogIntoStore({ deep: false });
      const snapshot = defaultCatalogStore.getSnapshot();
      res.json({
        ok: true,
        items: snapshot.items,
        totalStored: snapshot.totalStored,
        lastSyncedAt: snapshot.lastSyncedAt,
        platformCounts: snapshot.platformCounts,
        syncing: deepSyncRunning,
      });
    } catch {
      res.status(502).json({
        ok: false,
        message: 'ไม่สามารถอัปเดตรายการซีรีส์ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  });

  // Single series detail + episodes proxy endpoint (Login Required + Thai-Dubbed Only)
  app.get('/api/catalog/:id', requireAuth, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const rawId = String(req.params.id || '').trim();
    if (!isValidSeriesIdentifier(rawId)) {
      res.status(400).json({
        ok: false,
        message: 'ไม่พบรายการซีรีส์ที่ต้องการ',
      });
      return;
    }

    const sourceParam =
      typeof req.query.source === 'string' && isValidPlatformSlug(req.query.source.trim())
        ? req.query.source.trim().toLowerCase()
        : undefined;
    const externalIdParam =
      typeof req.query.extId === 'string' && isValidSeriesIdentifier(req.query.extId.trim())
        ? req.query.extId.trim()
        : undefined;
    const apiVersion = parseApiVersionParam(req.query.v);

    try {
      const sjConfig = getSeriesJeenConfig();
      const storedItem = defaultCatalogStore.getById(rawId);

      if (sjConfig && (apiVersion || sourceParam || storedItem?.externalId)) {
        try {
          const detailed = await fetchSeriesJeenDetail(sjConfig, {
            seriesId: externalIdParam || storedItem?.externalId || rawId,
            platform: sourceParam || storedItem?.upstreamPlatform,
            platformDisplayName: storedItem?.studio,
            apiVersion: apiVersion || storedItem?.apiVersion,
          });
          if (detailed) {
            const candidate: SeriesItem = storedItem
              ? {
                  ...detailed,
                  studio:
                    detailed.studio && detailed.studio !== 'Chinese Drama Studio'
                      ? detailed.studio
                      : storedItem.studio,
                  platform: storedItem.platform || detailed.platform,
                }
              : detailed;
            const persisted = defaultCatalogStore.upsertSingleDetail(candidate);
            if (persisted) {
              res.json({ ok: true, item: persisted });
              return;
            }
            // Reject non-Thai-dubbed drama
            res.status(404).json({
              ok: false,
              message: 'ไม่พบรายการพากย์ไทยที่ต้องการ',
            });
            return;
          }
        } catch {
          // Fall back gracefully to persisted catalog record if detail endpoint is unavailable
        }
      }

      if (storedItem) {
        res.json({ ok: true, item: storedItem });
        return;
      }

      const stored = await ensureStoredCatalogItems();
      const found = stored.items.find((s) => s.id === rawId || s.externalId === rawId);
      if (!found) {
        res.status(404).json({
          ok: false,
          message: 'ไม่พบข้อมูลซีรีส์ที่ต้องการ',
        });
        return;
      }

      res.json({ ok: true, item: found });
    } catch {
      res.status(502).json({
        ok: false,
        message: 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  });

  // Episode stream URL + WebVTT subtitles resolver proxy endpoint (Login Required)
  app.get('/api/catalog/:id/stream', requireAuth, async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    const rawId = String(req.params.id || '').trim();
    if (!isValidSeriesIdentifier(rawId)) {
      res.status(400).json({
        ok: false,
        message: 'ไม่พบตอนวิดีโอที่ต้องการ',
      });
      return;
    }

    const epNum = Math.max(1, Math.min(2000, Math.floor(Number(req.query.ep || 1) || 1)));
    const epId =
      typeof req.query.epId === 'string' && isValidSeriesIdentifier(req.query.epId.trim())
        ? req.query.epId.trim()
        : undefined;
    const sourceParam =
      typeof req.query.source === 'string' && isValidPlatformSlug(req.query.source.trim())
        ? req.query.source.trim().toLowerCase()
        : undefined;
    const externalIdParam =
      typeof req.query.extId === 'string' && isValidSeriesIdentifier(req.query.extId.trim())
        ? req.query.extId.trim()
        : undefined;
    const apiVersion = parseApiVersionParam(req.query.v);

    try {
      const sjConfig = getSeriesJeenConfig();
      const storedItem = defaultCatalogStore.getById(rawId);

      if (!sjConfig) {
        const localItem = SERIES_CATALOG.find((s) => s.id === rawId || s.externalId === rawId);
        const localEp = localItem?.episodes.find((ep) => ep.number === epNum);
        res.json({
          ok: true,
          streamUrl: localEp?.streamUrl ?? null,
          subtitles: localEp?.subtitles ?? [],
        });
        return;
      }

      const playback = await fetchSeriesJeenVideoStream(sjConfig, {
        seriesId: externalIdParam || storedItem?.externalId || rawId,
        episodeNumber: epNum,
        episodeId: epId,
        platform: sourceParam || storedItem?.upstreamPlatform,
        apiVersion: apiVersion || storedItem?.apiVersion,
      });

      res.json({
        ok: true,
        streamUrl: playback.streamUrl,
        subtitles: playback.subtitles,
      });
    } catch {
      res.status(502).json({
        ok: false,
        message: 'ไม่สามารถโหลดวิดีโอได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  });

  // Return JSON 404 for unknown API routes instead of SPA HTML fallback
  app.use('/api', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.status(404).json({
      ok: false,
      message: 'ไม่พบเส้นทางบริการที่ร้องขอ',
    });
  });

  // Mount Vite middleware in dev or serve production build from dist/
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { index: false }));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Not Found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
