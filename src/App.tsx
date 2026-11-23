import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, RefreshCw, Star } from 'lucide-react';
import { PLATFORMS, SERIES_CATALOG } from './data/catalog';
import {
  ApiRequestError,
  fetchCatalogWithMeta,
  fetchCurrentSession,
  fetchEpisodeStream,
  fetchSeriesById,
  logoutSession,
  syncCatalogNow,
} from './services/seriesApi';
import {
  AppSettings,
  AppView,
  GenreId,
  PlatformId,
  SeriesBadge,
  SeriesItem,
  SortOption,
  StatusNotice,
  UserSession,
  WatchHistoryEntry,
} from './types/series';
import {
  filterSeries,
  sortSeries,
  toggleFavoriteId,
  upsertWatchHistory,
} from './utils/catalogLogic';
import {
  beginRequestState,
  cancelRequestState,
  createStatusNotice,
  failRequestState,
  getViewLoadingLabel,
  INITIAL_REQUEST_STATE,
  RequestLifecycleState,
  succeedRequestState,
} from './utils/requestState';
import { AuthModal } from './components/AuthModal';
import { CatalogView } from './components/CatalogView';
import { FullScreenLoader } from './components/FullScreenLoader';
import { Header } from './components/Header';
import { HeroCarousel } from './components/HeroCarousel';
import { FavoritesView, HistoryView, SettingsView } from './components/LibraryViews';
import { LoginGateView } from './components/LoginGateView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PlatformLogo } from './components/PlatformLogo';
import { PlatformStrip } from './components/PlatformStrip';
import { SeriesCard } from './components/SeriesCard';
import { SeriesDetailView } from './components/SeriesDetailView';
import { RequestFallbackCard, StatusToast } from './components/StatusFeedback';
import { VideoPlayerView } from './components/VideoPlayerView';

const STORAGE_KEYS = {
  favorites: 'bannlai_favorites_v1',
  history: 'bannlai_history_v1',
  user: 'bannlai_user_v1',
  settings: 'bannlai_settings_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  defaultQuality: '1080p HD',
  autoplayNext: true,
  defaultSubtitle: 'TH',
  showSakuraParticles: true,
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function waitCancellable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new ApiRequestError('ยกเลิกรายการแล้ว', { cancelled: true }));
      return;
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      window.clearTimeout(timer);
      reject(new ApiRequestError('ยกเลิกรายการแล้ว', { cancelled: true }));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export default function App() {
  const [catalog, setCatalog] = useState<SeriesItem[]>([]);
  const [totalStoredCount, setTotalStoredCount] = useState<number>(0);
  const [catalogSyncing, setCatalogSyncing] = useState<boolean>(false);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState<boolean>(false);
  const [requestState, setRequestState] = useState<RequestLifecycleState>(INITIAL_REQUEST_STATE);
  const [statusNotice, setStatusNotice] = useState<StatusNotice | null>(null);

  const activeAbortRef = useRef<AbortController | null>(null);
  const lastRetryActionRef = useRef<(() => void) | null>(null);
  const noticeTimerRef = useRef<number | null>(null);

  const [activeView, setActiveView] = useState<AppView>('home');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(SERIES_CATALOG[0].id);
  const [playingEpisodeNumber, setPlayingEpisodeNumber] = useState<number>(1);
  const [playingInitialSeconds, setPlayingInitialSeconds] = useState<number>(0);

  // Filter & Search States
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformId>('all');
  const [selectedGenre, setSelectedGenre] = useState<GenreId>('ทั้งหมด');
  const [selectedBadge, setSelectedBadge] = useState<SeriesBadge | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Persisted User & Library States
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.favorites, [])
  );
  const [watchHistory, setWatchHistory] = useState<WatchHistoryEntry[]>(() =>
    readStorage<WatchHistoryEntry[]>(STORAGE_KEYS.history, [])
  );
  const [user, setUser] = useState<UserSession | null>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [settings, setSettings] = useState<AppSettings>(() =>
    readStorage<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS)
  );

  // Auth Modal State (kept for account switching if needed while logged in)
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const showNotice = useCallback(
    (
      status: StatusNotice['status'],
      title: string,
      detail?: string,
      canRetry = false
    ) => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
      setStatusNotice(createStatusNotice(status, title, detail, canRetry));
      const duration = status === 'success' ? 2800 : 6500;
      noticeTimerRef.current = window.setTimeout(() => {
        setStatusNotice(null);
      }, duration);
    },
    []
  );

  const dismissNotice = useCallback(() => {
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setStatusNotice(null);
  }, []);

  const runWithLoader = useCallback(
    async (
      label: string,
      task: (signal: AbortSignal) => Promise<void>,
      retryFn?: () => void
    ) => {
      // Cancel any superseded in-flight transition silently
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;
      lastRetryActionRef.current = retryFn ?? null;
      setRequestState(beginRequestState(label, true));

      try {
        await task(controller.signal);
        if (activeAbortRef.current === controller) {
          activeAbortRef.current = null;
          setRequestState(succeedRequestState());
        }
      } catch (err) {
        if (activeAbortRef.current !== controller) {
          return;
        }
        activeAbortRef.current = null;
        const isCancelled =
          controller.signal.aborted ||
          (err instanceof ApiRequestError && err.cancelled);

        if (isCancelled) {
          setRequestState(cancelRequestState());
          showNotice(
            'cancelled',
            'ยกเลิกรายการแล้ว',
            'คุณได้ยกเลิกการโหลดข้อมูล สามารถลองใหม่ได้ทุกเมื่อ',
            Boolean(retryFn)
          );
        } else {
          const message =
            err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้';
          const failed = failRequestState(message);
          setRequestState(failed);
          showNotice(
            'error',
            'โหลดข้อมูลไม่สำเร็จ',
            failed.errorMessage ?? undefined,
            Boolean(retryFn)
          );
        }
      }
    },
    [showNotice]
  );

  const handleCancelActiveRequest = useCallback(() => {
    if (activeAbortRef.current) {
      activeAbortRef.current.abort();
    }
  }, []);

  const handleRetryLastAction = useCallback(() => {
    dismissNotice();
    if (lastRetryActionRef.current) {
      lastRetryActionRef.current();
    }
  }, [dismissNotice]);

  const handleUnauthorizedError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiRequestError && err.statusCode === 401) {
        setUser(null);
        setCatalog([]);
        setTotalStoredCount(0);
        showNotice('error', 'กรุณาเข้าสู่ระบบก่อนใช้งาน', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
        return true;
      }
      return false;
    },
    [showNotice]
  );

  const loadCatalogFromServer = useCallback(
    (showFullLoader = true) => {
      const retry = () => loadCatalogFromServer(true);
      const execute = async (signal: AbortSignal) => {
        const res = await fetchCatalogWithMeta({ sort: 'latest', signal });
        setCatalog(res.items);
        setTotalStoredCount(res.totalStored);
        setCatalogSyncing(res.syncing);
        setCatalogLoadFailed(false);
        if (res.items.length > 0) {
          setSelectedSeriesId((prev) =>
            res.items.some((s) => s.id === prev) ? prev : res.items[0].id
          );
        }
      };

      if (showFullLoader) {
        void runWithLoader(
          'กำลังโหลดคลังซีรีส์พากย์ไทย...',
          async (signal) => {
            try {
              await Promise.all([execute(signal), waitCancellable(200, signal)]);
            } catch (err) {
              if (handleUnauthorizedError(err)) return;
              if (!(err instanceof ApiRequestError && err.cancelled)) {
                setCatalogLoadFailed(true);
              }
              throw err;
            }
          },
          retry
        );
      } else {
        const controller = new AbortController();
        activeAbortRef.current = controller;
        lastRetryActionRef.current = retry;
        void execute(controller.signal).catch((err) => {
          if (controller.signal.aborted) return;
          if (handleUnauthorizedError(err)) return;
          setCatalogLoadFailed(true);
          const msg = err instanceof Error ? err.message : undefined;
          const failed = failRequestState(msg);
          setRequestState(failed);
          showNotice('error', 'โหลดข้อมูลไม่สำเร็จ', failed.errorMessage ?? undefined, true);
        });
      }
    },
    [handleUnauthorizedError, runWithLoader, showNotice]
  );

  const handleManualSyncLatest = useCallback(() => {
    void runWithLoader(
      'กำลังอัปเดตซีรีส์พากย์ไทยล่าสุดเก็บลงระบบ...',
      async (signal) => {
        try {
          const res = await syncCatalogNow(signal);
          setCatalog(res.items);
          setTotalStoredCount(res.totalStored);
          setCatalogSyncing(res.syncing);
          setCatalogLoadFailed(false);
          showNotice(
            'success',
            `อัปเดตคลังพากย์ไทยแล้ว (${res.totalStored.toLocaleString()} เรื่อง)`
          );
        } catch (err) {
          if (handleUnauthorizedError(err)) return;
          throw err;
        }
      },
      () => handleManualSyncLatest()
    );
  }, [handleUnauthorizedError, runWithLoader, showNotice]);

  const handleLogout = useCallback(() => {
    void logoutSession().finally(() => {
      setUser(null);
      setCatalog([]);
      setTotalStoredCount(0);
      setActiveView('home');
      showNotice('success', 'ออกจากระบบเรียบร้อยแล้ว');
    });
  }, [showNotice]);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Verify authenticated session on initial app boot (strict login gate)
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void fetchCurrentSession(controller.signal)
      .then((sessionUser) => {
        if (!active) return;
        setUser(sessionUser);
      })
      .finally(() => {
        if (active) setAuthChecking(false);
      });

    return () => {
      active = false;
      controller.abort();
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  // Load stored Thai-dubbed catalog ONLY after user is logged in
  useEffect(() => {
    if (!user) return;
    loadCatalogFromServer(true);
  }, [user, loadCatalogFromServer]);

  // While server background harvest is still collecting additional pages, quietly refresh stored catalog
  useEffect(() => {
    if (!user || !catalogSyncing) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchCatalogWithMeta({ sort: 'latest', signal: controller.signal })
        .then((res) => {
          if (controller.signal.aborted) return;
          setCatalog(res.items);
          setTotalStoredCount(res.totalStored);
          setCatalogSyncing(res.syncing);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (handleUnauthorizedError(err)) return;
          setCatalogSyncing(false);
        });
    }, 6000);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [user, catalogSyncing, totalStoredCount, handleUnauthorizedError]);

  // Persist state to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
    } catch {
      // Ignore storage quota errors
    }
  }, [favorites]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(watchHistory));
    } catch {
      // Ignore
    }
  }, [watchHistory]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    } catch {
      // Ignore
    }
  }, [user]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  }, [settings]);

  // Handle initial ?series=<id> query parameter if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seriesParam = params.get('series');
    if (seriesParam && catalog.some((s) => s.id === seriesParam)) {
      setSelectedSeriesId(seriesParam);
      setActiveView('detail');
    }
  }, [catalog]);

  const navigateTo = useCallback(
    (view: AppView, customLabel?: string) => {
      const label = customLabel || getViewLoadingLabel(view);
      void runWithLoader(
        label,
        async (signal) => {
          await waitCancellable(320, signal);
          setActiveView(view);
          window.scrollTo(0, 0);
        },
        () => navigateTo(view, customLabel)
      );
    },
    [runWithLoader]
  );

  const openSeriesDetail = useCallback(
    (series: SeriesItem) => {
      void runWithLoader(
        `กำลังโหลด ${series.title}...`,
        async (signal) => {
          let unauthorized = false;
          const [detailed] = await Promise.all([
            fetchSeriesById(series.id, {
              externalId: series.externalId,
              upstreamPlatform: series.upstreamPlatform,
              apiVersion: series.apiVersion,
              signal,
            }).catch((err) => {
              if (err instanceof ApiRequestError && err.cancelled) throw err;
              if (handleUnauthorizedError(err)) {
                unauthorized = true;
                return series;
              }
              return series;
            }),
            waitCancellable(220, signal),
          ]);
          if (unauthorized) return;
          setCatalog((prev) =>
            prev.map((item) => (item.id === series.id ? { ...item, ...detailed } : item))
          );
          setSelectedSeriesId(series.id);
          setActiveView('detail');
          window.scrollTo(0, 0);
        },
        () => openSeriesDetail(series)
      );
    },
    [handleUnauthorizedError, runWithLoader]
  );

  const openSeriesById = useCallback(
    (seriesId: string) => {
      const found = catalog.find((s) => s.id === seriesId);
      if (found) openSeriesDetail(found);
    },
    [catalog, openSeriesDetail]
  );

  const startPlaying = useCallback(
    (series: SeriesItem, episodeNumber = 1, resumeSeconds = 0) => {
      void runWithLoader(
        `กำลังเตรียม ${series.title} ตอนที่ ${episodeNumber}...`,
        async (signal) => {
          try {
            const targetEp = series.episodes.find((ep) => ep.number === episodeNumber);
            const needsEpisodeList = series.episodes.length < series.totalEpisodes;

            const detailPromise = needsEpisodeList
              ? fetchSeriesById(series.id, {
                  externalId: series.externalId,
                  upstreamPlatform: series.upstreamPlatform,
                  apiVersion: series.apiVersion,
                  signal,
                }).catch((err) => {
                  if (err instanceof ApiRequestError && (err.cancelled || err.statusCode === 401)) {
                    throw err;
                  }
                  return null;
                })
              : Promise.resolve(null);

            const streamPromise = fetchEpisodeStream(series.id, episodeNumber, {
              episodeId: targetEp?.episodeId,
              externalId: series.externalId,
              upstreamPlatform: series.upstreamPlatform,
              apiVersion: series.apiVersion,
              signal,
            });

            const [resolved, detailed] = await Promise.all([
              streamPromise,
              detailPromise,
              waitCancellable(240, signal),
            ]);

            if (detailed || resolved.streamUrl || resolved.subtitles.length > 0) {
              setCatalog((prev) =>
                prev.map((item) => {
                  if (item.id !== series.id) return item;
                  const baseItem = detailed ? { ...item, ...detailed } : item;
                  const hasEpisode = baseItem.episodes.some((ep) => ep.number === episodeNumber);
                  const nextEpisodes = hasEpisode
                    ? baseItem.episodes.map((ep) =>
                        ep.number === episodeNumber
                          ? {
                              ...ep,
                              ...(resolved.streamUrl ? { streamUrl: resolved.streamUrl } : {}),
                              ...(resolved.subtitles.length > 0
                                ? { subtitles: resolved.subtitles }
                                : {}),
                            }
                          : ep
                      )
                    : [
                        ...baseItem.episodes,
                        {
                          number: episodeNumber,
                          title: `ตอนที่ ${episodeNumber}`,
                          durationSeconds: baseItem.episodeDurationMinutes * 60,
                          durationLabel: `${String(baseItem.episodeDurationMinutes).padStart(2, '0')}:00`,
                          summary: `รับชมตอนที่ ${episodeNumber} ภาพคมชัดระดับ HD`,
                          thumbnail: baseItem.heroBanner || baseItem.poster,
                          ...(resolved.streamUrl ? { streamUrl: resolved.streamUrl } : {}),
                          ...(resolved.subtitles.length > 0
                            ? { subtitles: resolved.subtitles }
                            : {}),
                        },
                      ];
                  return {
                    ...baseItem,
                    episodes: nextEpisodes,
                  };
                })
              );
            }

            setSelectedSeriesId(series.id);
            setPlayingEpisodeNumber(episodeNumber);
            setPlayingInitialSeconds(resumeSeconds);
            setActiveView('player');
            window.scrollTo(0, 0);
          } catch (err) {
            if (handleUnauthorizedError(err)) return;
            throw err;
          }
        },
        () => startPlaying(series, episodeNumber, resumeSeconds)
      );
    },
    [handleUnauthorizedError, runWithLoader]
  );

  const handleSelectPlatformWithLoader = useCallback(
    (platform: PlatformId) => {
      const platformName =
        PLATFORMS.find((p) => p.id === platform)?.label || 'ทั้งหมด';
      void runWithLoader(
        `กำลังโหลดรายการ ${platformName}...`,
        async (signal) => {
          await waitCancellable(300, signal);
          setSelectedPlatform(platform);
        },
        () => handleSelectPlatformWithLoader(platform)
      );
    },
    [runWithLoader]
  );

  const handleToggleFavorite = useCallback(
    (seriesId: string) => {
      setFavorites((prev) => {
        const exists = prev.includes(seriesId);
        showNotice(
          'success',
          exists ? 'นำออกจากรายการโปรดแล้ว' : 'เพิ่มในรายการโปรดแล้ว'
        );
        return toggleFavoriteId(prev, seriesId);
      });
    },
    [showNotice]
  );

  const handleProgressUpdate = useCallback(
    (episodeNumber: number, progressSeconds: number, durationSeconds: number) => {
      setWatchHistory((prev) =>
        upsertWatchHistory(prev, {
          seriesId: selectedSeriesId,
          episodeNumber,
          progressSeconds,
          durationSeconds,
          watchedAt: Date.now(),
        })
      );
    },
    [selectedSeriesId]
  );

  const activeSeries = useMemo(
    () => catalog.find((s) => s.id === selectedSeriesId) || catalog[0] || SERIES_CATALOG[0],
    [catalog, selectedSeriesId]
  );

  const heroSlides = useMemo(
    () => catalog.filter((s) => s.isFeaturedHero).slice(0, 5),
    [catalog]
  );

  const latestSeries = useMemo(
    () => sortSeries(catalog, 'latest').slice(0, 10),
    [catalog]
  );

  const popularSeries = useMemo(
    () => catalog.filter((s) => s.isPopular).slice(0, 6),
    [catalog]
  );

  const bilibiliSeries = useMemo(
    () => filterSeries(catalog, { platform: 'bilibili' }).slice(0, 5),
    [catalog]
  );

  const netflixSeries = useMemo(
    () => filterSeries(catalog, { platform: 'netflix' }).slice(0, 5),
    [catalog]
  );

  const studioSections = useMemo(() => {
    const groups = new Map<string, SeriesItem[]>();
    for (const item of catalog) {
      const key = item.studio?.trim() || 'ซีรีส์แนะนำ';
      const list = groups.get(key) || [];
      if (list.length < 10) {
        list.push(item);
        groups.set(key, list);
      }
    }
    return Array.from(groups.entries())
      .filter(([, items]) => items.length > 0)
      .slice(0, 6);
  }, [catalog]);

  const homeFilteredSeries = useMemo(
    () =>
      filterSeries(catalog, {
        platform: selectedPlatform,
        query: searchQuery,
      }),
    [catalog, selectedPlatform, searchQuery]
  );

  const catalogFilteredSeries = useMemo(() => {
    const filtered = filterSeries(catalog, {
      platform: selectedPlatform,
      genre: selectedGenre,
      badge: selectedBadge,
      query: searchQuery,
    });
    return sortSeries(filtered, sortBy);
  }, [catalog, selectedPlatform, selectedGenre, selectedBadge, searchQuery, sortBy]);

  const favoriteSeriesList = useMemo(
    () =>
      favorites
        .map((id) => catalog.find((s) => s.id === id))
        .filter((s): s is SeriesItem => Boolean(s)),
    [catalog, favorites]
  );

  const historyItems = useMemo(
    () =>
      watchHistory
        .map((entry) => {
          const series = catalog.find((s) => s.id === entry.seriesId);
          return series ? { entry, series } : null;
        })
        .filter((item): item is { entry: WatchHistoryEntry; series: SeriesItem } =>
          Boolean(item)
        ),
    [catalog, watchHistory]
  );

  const relatedSeries = useMemo(
    () =>
      catalog
        .filter(
          (s) =>
            s.id !== activeSeries.id &&
            s.genres.some((g) => activeSeries.genres.includes(g))
        )
        .slice(0, 5),
    [catalog, activeSeries]
  );

  const activeWatchEntry = useMemo(
    () => watchHistory.find((h) => h.seriesId === activeSeries.id),
    [watchHistory, activeSeries.id]
  );

  const selectedPlatformLabel =
    PLATFORMS.find((p) => p.id === selectedPlatform)?.label || 'ทั้งหมด';

  const isFilteringHome =
    selectedPlatform !== 'all' || searchQuery.trim().length > 0;

  // Strict Mandatory Login Gate: block all content until authenticated
  if (authChecking) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <FullScreenLoader
          visible
          label="กำลังตรวจสอบสิทธิ์การเข้าใช้งาน..."
          canCancel={false}
          onCancel={() => {}}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginGateView
          onAuthenticated={(loggedInUser) => {
            setUser(loggedInUser);
            showNotice('success', `ยินดีต้อนรับคุณ ${loggedInUser.name}`);
          }}
        />
        <StatusToast
          notice={statusNotice}
          onDismiss={dismissNotice}
          onRetry={handleRetryLastAction}
        />
      </>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-x-clip bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 md:pb-0 transition-colors">
      {/* Subtle crisp ambient top wash for visual harmony without muddying contrast */}
      <div
        aria-hidden="true"
        data-testid="top-watermark-backdrop"
        className="pointer-events-none select-none absolute top-0 left-0 right-0 z-0 w-full h-[220px] sm:h-[320px] overflow-hidden"
      >
        <div className="w-full h-full bg-gradient-to-b from-rose-100/55 via-rose-50/20 to-transparent dark:from-rose-950/30 dark:via-slate-950/40 dark:to-transparent" />
      </div>

      <Header
        activeView={activeView}
        onNavigate={(view) => {
          if (view === 'home') {
            setSelectedPlatform('all');
          }
          navigateTo(view);
        }}
        onSelectCategoryGenre={(genre) => {
          setSelectedGenre(genre);
          navigateTo('catalog');
        }}
        onFocusPlatforms={() => {
          if (activeView !== 'home') {
            navigateTo('home');
            window.setTimeout(() => {
              document.getElementById('platform-section')?.scrollIntoView({ behavior: 'smooth' });
            }, 60);
          } else {
            document.getElementById('platform-section')?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onSearchSubmit={(q) => {
          setSearchQuery(q);
          if (activeView !== 'home' && activeView !== 'catalog') {
            navigateTo('catalog');
          }
        }}
        user={user}
        onOpenAuth={(mode) => {
          setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        favoritesCount={favorites.length}
        historyCount={watchHistory.length}
        latestSeries={latestSeries}
        onSelectSeries={openSeriesById}
      />

      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-6">
        {catalogLoadFailed && catalog.length === 0 && (
          <RequestFallbackCard
            status={requestState.status === 'cancelled' ? 'cancelled' : 'error'}
            message={
              requestState.errorMessage ||
              'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง'
            }
            onRetry={() => loadCatalogFromServer(true)}
            onCancel={() => {
              setCatalogLoadFailed(false);
              navigateTo('home');
            }}
          />
        )}

        {activeView === 'home' && (
          <div className="space-y-4 sm:space-y-8 lg:space-y-10">
            <HeroCarousel
              slides={heroSlides}
              onWatchNow={(series) => startPlaying(series, 1)}
              onViewDetails={openSeriesDetail}
            />

            <PlatformStrip
              selectedPlatform={selectedPlatform}
              onSelectPlatform={handleSelectPlatformWithLoader}
              onViewAll={() => navigateTo('catalog')}
            />

            {isFilteringHome ? (
              <section aria-label="ผลการกรองซีรีส์" className="space-y-2.5 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-[#FF1E6E] shrink-0"
                    />
                    <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                      {searchQuery.trim()
                        ? `ผลการค้นหา "${searchQuery.trim()}"`
                        : `ซีรีส์จาก ${selectedPlatformLabel}`}
                    </h2>
                    <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                      ({homeFilteredSeries.length.toLocaleString()} เรื่อง)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatform('all');
                      setSearchQuery('');
                    }}
                    className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    แสดงทั้งหมด
                  </button>
                </div>

                {homeFilteredSeries.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-5">
                      {homeFilteredSeries.slice(0, 60).map((series) => (
                        <SeriesCard
                          key={series.id}
                          series={series}
                          onSelect={openSeriesDetail}
                          onQuickPlay={(s) => startPlaying(s, 1)}
                        />
                      ))}
                    </div>
                    {homeFilteredSeries.length > 60 && (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => navigateTo('catalog')}
                          className="h-10 px-6 rounded-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-700 hover:border-[#FF1E6E] hover:text-[#FF1E6E] text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer transition-colors"
                        >
                          ดูทั้งหมด {homeFilteredSeries.length.toLocaleString()} เรื่องในคลังซีรีส์
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-slate-800 p-10 text-center space-y-2">
                    <p className="font-bold text-slate-900 dark:text-white">
                      ไม่พบซีรีส์ที่ตรงกับตัวกรอง
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatform('all');
                        setSearchQuery('');
                      }}
                      className="mt-2 h-9 px-5 rounded-full bg-[#FF1E6E] text-white text-xs font-bold cursor-pointer"
                    >
                      รีเซ็ตตัวกรอง
                    </button>
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* Latest Updated Thai-Dubbed Series Row */}
                {latestSeries.length > 0 && (
                  <section aria-label="อัปเดตล่าสุด พากย์ไทย" className="space-y-2.5 sm:space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-[#FF1E6E] shrink-0"
                        />
                        <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                          อัปเดตล่าสุด · พากย์ไทย
                        </h2>
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                          ({Math.max(totalStoredCount, catalog.length).toLocaleString()} เรื่องในระบบ)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <button
                          type="button"
                          onClick={handleManualSyncLatest}
                          className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full border border-rose-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-slate-800 text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF1E6E] ${
                              catalogSyncing ? 'animate-spin' : ''
                            }`}
                            aria-hidden="true"
                          />
                          <span>{catalogSyncing ? 'กำลังเก็บเพิ่ม...' : 'อัปเดตล่าสุด'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlatform('all');
                            setSortBy('latest');
                            navigateTo('catalog');
                          }}
                          className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap cursor-pointer"
                        >
                          <span>ดูทั้งหมด</span>
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-5">
                      {latestSeries.slice(0, 10).map((series) => (
                        <SeriesCard
                          key={`latest-${series.id}`}
                          series={series}
                          onSelect={openSeriesDetail}
                          onQuickPlay={(s) => startPlaying(s, 1)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Popular Thai-Dubbed Series Row */}
                <section aria-label="ซีรีส์พากย์ไทยยอดนิยม" className="space-y-2.5 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-4">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <Star
                        className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 fill-amber-500 shrink-0"
                        aria-hidden="true"
                      />
                      <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white">
                        ซีรีส์พากย์ไทยยอดนิยม
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlatform('all');
                        setSortBy('popular');
                        navigateTo('catalog');
                      }}
                      className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <span>ดูทั้งหมด</span>
                      <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4">
                    {popularSeries.map((series) => (
                      <SeriesCard
                        key={series.id}
                        series={series}
                        variant="overlay"
                        onSelect={openSeriesDetail}
                        onQuickPlay={(s) => startPlaying(s, 1)}
                      />
                    ))}
                  </div>
                </section>

                {/* Bilibili Section (shown only when matching series exist) */}
                {bilibiliSeries.length > 0 && (
                  <section aria-label="ซีรีส์ยอดนิยมจาก Bilibili" className="space-y-2.5 sm:space-y-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-[#00A1D6] shrink-0"
                        />
                        <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
                          <PlatformLogo platformId="bilibili" className="h-[16px] sm:h-[22px] w-auto shrink-0" />
                          <span className="font-normal text-slate-500 dark:text-slate-400 text-[11px] sm:text-base truncate">ซีรีส์ยอดนิยมจาก Bilibili</span>
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlatform('bilibili');
                          navigateTo('catalog');
                        }}
                        className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>ดูทั้งหมด</span>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-5">
                      {bilibiliSeries.map((series) => (
                        <SeriesCard
                          key={series.id}
                          series={series}
                          onSelect={openSeriesDetail}
                          onQuickPlay={(s) => startPlaying(s, 1)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Netflix Section (shown only when matching series exist) */}
                {netflixSeries.length > 0 && (
                  <section aria-label="ซีรีส์แนะนำจาก Netflix" className="space-y-2.5 sm:space-y-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          aria-hidden="true"
                          className="w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-[#E50914] shrink-0"
                        />
                        <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2.5 flex-wrap min-w-0">
                          <PlatformLogo platformId="netflix" className="h-[14px] sm:h-[18px] w-auto shrink-0" />
                          <span className="font-normal text-slate-500 dark:text-slate-400 text-[11px] sm:text-base truncate">ซีรีส์แนะนำจาก Netflix</span>
                        </h2>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPlatform('netflix');
                          navigateTo('catalog');
                        }}
                        className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>ดูทั้งหมด</span>
                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-5">
                      {netflixSeries.map((series) => (
                        <SeriesCard
                          key={series.id}
                          series={series}
                          onSelect={openSeriesDetail}
                          onQuickPlay={(s) => startPlaying(s, 1)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Live Feed Channel Rows (shown when live series channels are loaded) */}
                {bilibiliSeries.length === 0 &&
                  netflixSeries.length === 0 &&
                  studioSections.map(([channelName, items]) => (
                    <section
                      key={channelName}
                      aria-label={`ซีรีส์แนะนำจาก ${channelName}`}
                      className="space-y-2.5 sm:space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 sm:gap-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-1 h-4 sm:w-1.5 sm:h-5 rounded-full bg-gradient-to-b from-[#FF2A7A] to-[#FF85B3] shrink-0"
                          />
                          <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                            ซีรีส์มาแรง · {channelName}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPlatform('all');
                            navigateTo('catalog');
                          }}
                          className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <span>ดูทั้งหมด</span>
                          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-5">
                        {items.slice(0, 10).map((series) => (
                          <SeriesCard
                            key={series.id}
                            series={series}
                            onSelect={openSeriesDetail}
                            onQuickPlay={(s) => startPlaying(s, 1)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
              </>
            )}
          </div>
        )}

        {activeView === 'catalog' && (
          <CatalogView
            seriesList={catalogFilteredSeries}
            selectedPlatform={selectedPlatform}
            selectedGenre={selectedGenre}
            selectedBadge={selectedBadge}
            sortBy={sortBy}
            searchQuery={searchQuery}
            onPlatformChange={setSelectedPlatform}
            onGenreChange={setSelectedGenre}
            onBadgeChange={setSelectedBadge}
            onSortChange={setSortBy}
            onSearchChange={setSearchQuery}
            onResetFilters={() => {
              setSelectedPlatform('all');
              setSelectedGenre('ทั้งหมด');
              setSelectedBadge('all');
              setSearchQuery('');
              setSortBy('popular');
            }}
            onSelectSeries={openSeriesDetail}
            onQuickPlay={(s) => startPlaying(s, 1)}
          />
        )}

        {activeView === 'detail' && (
          <SeriesDetailView
            series={activeSeries}
            relatedSeries={relatedSeries}
            isFavorite={favorites.includes(activeSeries.id)}
            watchEntry={activeWatchEntry}
            onToggleFavorite={handleToggleFavorite}
            onPlayEpisode={(s, epNum) =>
              startPlaying(
                s,
                epNum,
                activeWatchEntry?.episodeNumber === epNum
                  ? activeWatchEntry.progressSeconds
                  : 0
              )
            }
            onBackHome={() => navigateTo('home')}
            onSelectSeries={openSeriesDetail}
          />
        )}

        {activeView === 'player' && (
          <VideoPlayerView
            series={activeSeries}
            episodeNumber={playingEpisodeNumber}
            initialProgressSeconds={playingInitialSeconds}
            defaultQuality={settings.defaultQuality}
            defaultSubtitle={settings.defaultSubtitle}
            autoplayNext={settings.autoplayNext}
            onChangeEpisode={(epNum) => {
              startPlaying(activeSeries, epNum, 0);
            }}
            onRetryStream={(epNum, resumeSeconds) => {
              startPlaying(activeSeries, epNum, resumeSeconds);
            }}
            onProgressUpdate={handleProgressUpdate}
            onBackToDetail={() => navigateTo('detail')}
          />
        )}

        {activeView === 'favorites' && (
          <FavoritesView
            favoriteSeries={favoriteSeriesList}
            onSelectSeries={openSeriesDetail}
            onQuickPlay={(s) => startPlaying(s, 1)}
            onRemoveFavorite={handleToggleFavorite}
            onBrowseCatalog={() => navigateTo('catalog')}
          />
        )}

        {activeView === 'history' && (
          <HistoryView
            entries={historyItems}
            onResume={(series, epNum, progress) =>
              startPlaying(series, epNum, progress)
            }
            onRemoveEntry={(seriesId) => {
              setWatchHistory((prev) => prev.filter((item) => item.seriesId !== seriesId));
              showNotice('success', 'ลบรายการออกจากประวัติแล้ว');
            }}
            onClearHistory={() => {
              setWatchHistory([]);
              showNotice('success', 'ล้างประวัติการรับชมทั้งหมดแล้ว');
            }}
            onBrowseCatalog={() => navigateTo('catalog')}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            user={user}
            onUpdateSettings={(patch) => {
              setSettings((prev) => ({ ...prev, ...patch }));
              showNotice('success', 'บันทึกการตั้งค่าแล้ว');
            }}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode);
              setAuthModalOpen(true);
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      {/* Clean Minimal Brand Footer */}
      <footer className="relative z-10 border-t border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950 py-5 sm:py-7 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/bannlai/brand-logo-transparent.png"
              alt="Bannlai Series"
              className="h-9 sm:h-11 w-auto object-contain drop-shadow-[0_2px_4px_rgba(15,23,42,0.18)]"
            />
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">|</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              ดูฟรี ครบทุกความบันเทิง
            </span>
          </div>

          <div className="flex items-center gap-5 font-semibold text-slate-700 dark:text-slate-300">
            <button
              type="button"
              onClick={() => navigateTo('home')}
              className="hover:text-[#D90057] dark:hover:text-[#FF4D94] transition-colors cursor-pointer"
            >
              หน้าแรก
            </button>
            <button
              type="button"
              onClick={() => navigateTo('catalog')}
              className="hover:text-[#D90057] dark:hover:text-[#FF4D94] transition-colors cursor-pointer"
            >
              รวมซีรีส์
            </button>
            <button
              type="button"
              onClick={() => navigateTo('favorites')}
              className="hover:text-[#D90057] dark:hover:text-[#FF4D94] transition-colors cursor-pointer"
            >
              รายการโปรด
            </button>
            <button
              type="button"
              onClick={() => navigateTo('settings')}
              className="hover:text-[#D90057] dark:hover:text-[#FF4D94] transition-colors cursor-pointer"
            >
              ตั้งค่า
            </button>
          </div>
        </div>
      </footer>

      <MobileBottomNav activeView={activeView} onNavigate={navigateTo} />

      <FullScreenLoader
        visible={requestState.status === 'loading'}
        label={requestState.loadingLabel}
        canCancel={requestState.canCancel}
        onCancel={handleCancelActiveRequest}
      />

      <StatusToast
        notice={statusNotice}
        onDismiss={dismissNotice}
        onRetry={handleRetryLastAction}
      />

      <AuthModal
        key={authModalMode + String(authModalOpen)}
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setAuthModalOpen(false);
          showNotice('success', 'เข้าสู่ระบบสำเร็จ');
        }}
      />
    </div>
  );
}
