import test from 'node:test';
import assert from 'node:assert/strict';
import { SERIES_CATALOG } from '../data/catalog';
import {
  filterSeries,
  formatTime,
  getNextEpisode,
  sortSeries,
  toggleFavoriteId,
  upsertWatchHistory,
  validateAuthForm,
} from './catalogLogic';

test('filterSeries filters by primary or additional platform', () => {
  const netflixItems = filterSeries(SERIES_CATALOG, { platform: 'netflix' });
  assert.ok(netflixItems.length >= 4);
  assert.ok(
    netflixItems.every(
      (item) =>
        item.platform === 'netflix' || item.additionalPlatforms.includes('netflix')
    )
  );
});

test('filterSeries filters by genre and Thai/English search query', () => {
  const romance = filterSeries(SERIES_CATALOG, { genre: 'โรแมนติก', query: 'Date' });
  assert.equal(romance.length, 1);
  assert.equal(romance[0].id, 'date-a-live');

  const thaiMatch = filterSeries(SERIES_CATALOG, { query: 'ดาบพิฆาตอสูร' });
  assert.equal(thaiMatch.length, 1);
  assert.equal(thaiMatch[0].id, 'demon-slayer');
});

test('sortSeries sorts by rating and latest year descending', () => {
  const byRating = sortSeries(SERIES_CATALOG, 'rating');
  assert.ok(byRating[0].rating >= byRating[1].rating);

  const byLatest = sortSeries(SERIES_CATALOG, 'latest');
  assert.ok(byLatest[0].year >= byLatest[byLatest.length - 1].year);
});

test('formatTime formats seconds into MM:SS with zero padding', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(863), '14:23');
  assert.equal(formatTime(-10), '00:00');
});

test('toggleFavoriteId adds and removes series IDs cleanly', () => {
  const added = toggleFavoriteId([], 'date-a-live');
  assert.deepEqual(added, ['date-a-live']);
  const removed = toggleFavoriteId(added, 'date-a-live');
  assert.deepEqual(removed, []);
});

test('upsertWatchHistory deduplicates by seriesId and orders most recent first', () => {
  const first = upsertWatchHistory([], {
    seriesId: 'date-a-live',
    episodeNumber: 1,
    progressSeconds: 120,
    durationSeconds: 1440,
    watchedAt: 1000,
  });
  const second = upsertWatchHistory(first, {
    seriesId: 'solo-leveling',
    episodeNumber: 2,
    progressSeconds: 300,
    durationSeconds: 1440,
    watchedAt: 2000,
  });
  const updated = upsertWatchHistory(second, {
    seriesId: 'date-a-live',
    episodeNumber: 2,
    progressSeconds: 45,
    durationSeconds: 1440,
    watchedAt: 3000,
  });
  assert.equal(updated.length, 2);
  assert.equal(updated[0].seriesId, 'date-a-live');
  assert.equal(updated[0].episodeNumber, 2);
});

test('getNextEpisode returns next episode or null at series end', () => {
  const dateALive = SERIES_CATALOG.find((s) => s.id === 'date-a-live')!;
  const next = getNextEpisode(dateALive, 1);
  assert.equal(next?.number, 2);

  const last = getNextEpisode(dateALive, dateALive.episodes.length);
  assert.equal(last, null);
});

test('validateAuthForm catches invalid email, short password, and mismatched confirmPassword', () => {
  const invalidLogin = validateAuthForm({
    mode: 'login',
    email: 'not-an-email',
    password: '123',
  });
  assert.equal(invalidLogin.valid, false);
  assert.ok(invalidLogin.errors.email);
  assert.ok(invalidLogin.errors.password);

  const invalidRegister = validateAuthForm({
    mode: 'register',
    displayName: 'A',
    email: 'user@bannlai.com',
    password: 'password123',
    confirmPassword: 'different',
  });
  assert.equal(invalidRegister.valid, false);
  assert.ok(invalidRegister.errors.displayName);
  assert.ok(invalidRegister.errors.confirmPassword);

  const validLogin = validateAuthForm({
    mode: 'login',
    email: 'user@bannlai.com',
    password: 'password123',
  });
  assert.equal(validLogin.valid, true);
});
