import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PersistentCatalogStore } from './catalogStore';
import { SeriesItem } from '../src/types/series';

function makeSeries(overrides: Partial<SeriesItem> & { id: string }): SeriesItem {
  return {
    id: overrides.id,
    title: overrides.title || 'ซีรีส์จีน(พากย์ไทย)',
    thaiTitle: overrides.thaiTitle || overrides.title || 'ซีรีส์จีน(พากย์ไทย)',
    poster: 'https://cdn.example.com/poster.jpg',
    platform: 'dramabox',
    additionalPlatforms: [],
    genres: ['ดราม่า'],
    rating: 9.0,
    reviewCountLabel: '10K',
    year: 2025,
    totalEpisodes: 40,
    episodeDurationMinutes: 2,
    badge: 'มาแรง',
    synopsis: 'เรื่องย่อ',
    studio: overrides.studio || 'FreeReels',
    isThaiDub: overrides.isThaiDub,
    updatedAt: overrides.updatedAt,
    sceneTheme: 'sakura',
    episodes: overrides.episodes || [
      {
        number: 1,
        title: 'ตอนที่ 1',
        durationSeconds: 120,
        durationLabel: '02:00',
        summary: 'ตอนที่ 1',
        thumbnail: 'https://cdn.example.com/poster.jpg',
      },
    ],
  };
}

test('PersistentCatalogStore stores ONLY strictly verified Thai-dubbed series, purges stale non-Thai disk records, and sorts latest first', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bannlai-store-'));
  const storePath = path.join(tmpDir, 'series-store.json');

  try {
    const store = new PersistentCatalogStore(storePath);
    const snap = store.upsertSeries([
      makeSeries({
        id: 'dub-old',
        title: 'เรื่องเก่า(พากย์ไทย)',
        isThaiDub: true,
        updatedAt: '2026-01-01T10:00:00Z',
        studio: 'iDrama',
      }),
      makeSeries({
        id: 'sub-only',
        title: 'เรื่องซับไทยเท่านั้น',
        isThaiDub: false,
        updatedAt: '2026-05-01T10:00:00Z',
      }),
      makeSeries({
        id: 'ambiguous-eng-dub',
        title: 'เลี้ยงลูกศัตรู รอวันล้างแค้น [พากย์เสียง]',
        isThaiDub: true,
        updatedAt: '2026-07-01T10:00:00Z',
        studio: 'plerplow',
      }),
      makeSeries({
        id: 'dub-new',
        title: '[พากย์ไทย]เรื่องใหม่ล่าสุด',
        isThaiDub: true,
        updatedAt: '2026-06-01T10:00:00Z',
        studio: 'Storyreel',
      }),
    ]);

    assert.equal(snap.totalStored, 2);
    assert.equal(snap.items[0].id, 'dub-new');
    assert.equal(snap.items[1].id, 'dub-old');
    assert.equal(snap.items.some((s) => s.id === 'sub-only'), false);
    assert.equal(snap.items.some((s) => s.id === 'ambiguous-eng-dub'), false);
    assert.equal(fs.existsSync(storePath), true);

    // Inject a stale ambiguous item directly into disk JSON and verify loadFromDisk purges it
    const rawDisk = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    rawDisk.items.push(
      makeSeries({
        id: 'stale-non-thai',
        title: 'รักร้าย (พากย์เสียง)',
        isThaiDub: true,
        updatedAt: '2026-08-01T10:00:00Z',
      })
    );
    fs.writeFileSync(storePath, JSON.stringify(rawDisk), 'utf8');

    const reloaded = new PersistentCatalogStore(storePath).loadFromDisk();
    assert.equal(reloaded.totalStored, 2);
    assert.equal(reloaded.items[0].id, 'dub-new');
    assert.equal(reloaded.items.some((s) => s.id === 'stale-non-thai'), false);
    assert.equal(reloaded.platformCounts.Storyreel, 1);
    assert.equal(reloaded.platformCounts.iDrama, 1);

    // Confirm cleaned snapshot was rewritten to disk
    const cleanedDisk = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    assert.equal(cleanedDisk.totalStored, 2);
    assert.equal(cleanedDisk.items.length, 2);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
