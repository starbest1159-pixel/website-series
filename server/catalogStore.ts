import fs from 'fs';
import path from 'path';
import { filterThaiDubbedSeries } from '../src/services/chineseSeriesAdapter.ts';
import type { SeriesItem } from '../src/types/series.ts';
import { sortSeries } from '../src/utils/catalogLogic.ts';

export interface StoredCatalogSnapshot {
  version: number;
  thaiDubOnly: true;
  lastSyncedAt: string | null;
  totalStored: number;
  platformCounts: Record<string, number>;
  items: SeriesItem[];
}

const DEFAULT_STORE_PATH = path.resolve(process.cwd(), 'server', 'data', 'series-store.json');

function ensureParentDir(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function computePlatformCounts(items: SeriesItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    const key = item.studio?.trim() || item.platform;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Disk-backed server store that persists all fetched Thai-dubbed series locally
 * so the system retains collected movies across restarts and serves them instantly.
 */
export class PersistentCatalogStore {
  private readonly filePath: string;
  private itemsById = new Map<string, SeriesItem>();
  private lastSyncedAt: string | null = null;
  private loaded = false;

  constructor(filePath: string = DEFAULT_STORE_PATH) {
    this.filePath = filePath;
  }

  public loadFromDisk(): StoredCatalogSnapshot {
    if (this.loaded) {
      return this.getSnapshot();
    }
    this.loaded = true;

    let needsPersist = false;
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<StoredCatalogSnapshot>;
        const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
        const validItems = filterThaiDubbedSeries(rawItems);
        this.itemsById.clear();
        for (const item of validItems) {
          if (item && typeof item.id === 'string' && item.id) {
            this.itemsById.set(item.id, { ...item, isThaiDub: true });
          }
        }
        this.lastSyncedAt =
          typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null;
        if (validItems.length !== rawItems.length || parsed.totalStored !== this.itemsById.size) {
          needsPersist = true;
        }
      }
    } catch {
      this.itemsById.clear();
      this.lastSyncedAt = null;
    }

    if (needsPersist) {
      this.saveToDisk();
    }

    return this.getSnapshot();
  }

  public upsertSeries(incoming: SeriesItem[], syncedAt: string = new Date().toISOString()): StoredCatalogSnapshot {
    if (!this.loaded) {
      this.loadFromDisk();
    }

    const thaiDubItems = filterThaiDubbedSeries(incoming);
    for (const item of thaiDubItems) {
      if (!item || !item.id) continue;
      const existing = this.itemsById.get(item.id);
      if (existing) {
        this.itemsById.set(item.id, {
          ...existing,
          ...item,
          isThaiDub: true,
          // Keep richer episode list if we already fetched detail episodes earlier
          episodes:
            item.episodes.length >= existing.episodes.length
              ? item.episodes
              : existing.episodes,
          totalEpisodes: Math.max(existing.totalEpisodes, item.totalEpisodes),
        });
      } else {
        this.itemsById.set(item.id, { ...item, isThaiDub: true });
      }
    }

    this.lastSyncedAt = syncedAt;
    this.saveToDisk();
    return this.getSnapshot();
  }

  public upsertSingleDetail(detail: SeriesItem): SeriesItem | null {
    if (!this.loaded) {
      this.loadFromDisk();
    }
    const filtered = filterThaiDubbedSeries([detail]);
    if (filtered.length === 0) return null;

    const clean = { ...filtered[0], isThaiDub: true };
    const existing = this.itemsById.get(clean.id);
    const merged: SeriesItem = existing
      ? {
          ...existing,
          ...clean,
          isThaiDub: true,
          totalEpisodes: Math.max(existing.totalEpisodes, clean.totalEpisodes),
          episodes:
            clean.episodes.length >= existing.episodes.length
              ? clean.episodes
              : existing.episodes,
        }
      : clean;

    this.itemsById.set(merged.id, merged);
    this.saveToDisk();
    return merged;
  }

  public getById(id: string): SeriesItem | undefined {
    if (!this.loaded) {
      this.loadFromDisk();
    }
    const direct = this.itemsById.get(id);
    if (direct) return direct;
    for (const item of this.itemsById.values()) {
      if (item.externalId === id) return item;
    }
    return undefined;
  }

  public getSnapshot(): StoredCatalogSnapshot {
    if (!this.loaded) {
      this.loadFromDisk();
    }
    const sorted = sortSeries(Array.from(this.itemsById.values()), 'latest').map(
      (item, idx) => ({
        ...item,
        isFeaturedHero: idx < 5,
        isPopular: idx < 12,
      })
    );

    return {
      version: 1,
      thaiDubOnly: true,
      lastSyncedAt: this.lastSyncedAt,
      totalStored: sorted.length,
      platformCounts: computePlatformCounts(sorted),
      items: sorted,
    };
  }

  private saveToDisk(): void {
    try {
      ensureParentDir(this.filePath);
      const snapshot = this.getSnapshot();
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(snapshot), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch {
      // Ignore write failures on read-only environments while keeping in-memory store active
    }
  }
}

export const defaultCatalogStore = new PersistentCatalogStore();
