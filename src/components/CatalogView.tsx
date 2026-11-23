import { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { GENRES, PLATFORMS } from '../data/catalog';
import {
  GenreId,
  PlatformId,
  SeriesBadge,
  SeriesItem,
  SortOption,
} from '../types/series';
import { PlatformLogo } from './PlatformLogo';
import { SeriesCard } from './SeriesCard';

interface CatalogViewProps {
  seriesList: SeriesItem[];
  selectedPlatform: PlatformId;
  selectedGenre: GenreId;
  selectedBadge: SeriesBadge | 'all';
  sortBy: SortOption;
  searchQuery: string;
  onPlatformChange: (platform: PlatformId) => void;
  onGenreChange: (genre: GenreId) => void;
  onBadgeChange: (badge: SeriesBadge | 'all') => void;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (query: string) => void;
  onResetFilters: () => void;
  onSelectSeries: (series: SeriesItem) => void;
  onQuickPlay: (series: SeriesItem) => void;
}

export function CatalogView({
  seriesList,
  selectedPlatform,
  selectedGenre,
  selectedBadge,
  sortBy,
  searchQuery,
  onPlatformChange,
  onGenreChange,
  onBadgeChange,
  onSortChange,
  onSearchChange,
  onResetFilters,
  onSelectSeries,
  onQuickPlay,
}: CatalogViewProps) {
  const badges: (SeriesBadge | 'all')[] = ['all', 'มาแรง', 'VIP', 'ใหม่', 'ดูฟรี'];
  const PAGE_STEP = 60;
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);

  useEffect(() => {
    setVisibleCount(PAGE_STEP);
  }, [selectedPlatform, selectedGenre, selectedBadge, sortBy, searchQuery]);

  const visibleSeries = seriesList.slice(0, visibleCount);
  const remainingCount = Math.max(0, seriesList.length - visibleCount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="font-display text-lg sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            รวมซีรีส์และอนิเมะทั้งหมด
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            พบทั้งหมด <span className="font-bold text-[#FF1E6E] tabular-nums">{seriesList.length.toLocaleString()}</span> เรื่องที่ตรงกับตัวกรองของคุณ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="catalog-sort" className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            เรียงตาม :
          </label>
          <select
            id="catalog-sort"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="h-8 sm:h-10 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <option value="popular">ยอดนิยม</option>
            <option value="rating">คะแนนสูงสุด</option>
            <option value="latest">มาใหม่ล่าสุด</option>
          </select>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-100/80 dark:border-slate-800 p-3 sm:p-5 space-y-3 sm:space-y-4">
        {/* Search Input inside Catalog */}
        <div className="relative">
          <label htmlFor="catalog-search-input" className="sr-only">
            ค้นหาชื่อซีรีส์ในคลัง
          </label>
          <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            id="catalog-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="พิมพ์ชื่อเรื่องภาษาไทย, ภาษาอังกฤษ, หรือแนวเรื่อง..."
            className="w-full h-9 sm:h-11 pl-9 sm:pl-10 pr-9 sm:pr-10 rounded-lg sm:rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-rose-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="ล้างคำค้นหาในคลัง"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Platforms */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            แพลตฟอร์ม
          </p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {PLATFORMS.map((p) => {
              const active = selectedPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPlatformChange(p.id)}
                  aria-pressed={active}
                  aria-label={p.label}
                  className={`h-8 sm:min-h-[38px] px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold flex items-center justify-center whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#FF1E6E] text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600'
                  }`}
                >
                  {p.id === 'all' ? (
                    <span>{p.label}</span>
                  ) : (
                    <>
                      <PlatformLogo
                        platformId={p.id}
                        active={active}
                        className={p.id === 'netflix' ? 'h-[11px] sm:h-[14px] w-auto' : 'h-[15px] sm:h-[19px] w-auto'}
                      />
                      <span className="sr-only">{p.label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Genres & Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-0.5 sm:pt-1">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              หมวดหมู่แนวเรื่อง
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {GENRES.map((genre) => {
                const active = selectedGenre === genre;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => onGenreChange(genre)}
                    aria-pressed={active}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400">
              ประเภทสิทธิ์การรับชม
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {badges.map((badge) => {
                const active = selectedBadge === badge;
                return (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => onBadgeChange(badge)}
                    aria-pressed={active}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#FF1E6E] text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {badge === 'all' ? 'ทั้งหมด' : badge}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Results Grid or Empty State */}
      {seriesList.length > 0 ? (
        <div className="space-y-5">
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-5">
            {visibleSeries.map((series) => (
              <SeriesCard
                key={series.id}
                series={series}
                onSelect={onSelectSeries}
                onQuickPlay={onQuickPlay}
              />
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + PAGE_STEP)}
                className="h-10 px-6 rounded-full bg-white dark:bg-slate-900 border border-rose-200 dark:border-slate-700 hover:border-[#FF1E6E] hover:text-[#FF1E6E] text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 shadow-xs cursor-pointer transition-colors"
              >
                โหลดเพิ่มอีก {Math.min(PAGE_STEP, remainingCount).toLocaleString()} เรื่อง (เหลืออีก {remainingCount.toLocaleString()} เรื่อง)
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-slate-800 p-12 text-center space-y-3">
          <p className="font-display text-lg font-bold text-slate-900 dark:text-white">
            ไม่พบข้อมูลซีรีส์ที่ตรงกับคำค้นหา
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ลองเปลี่ยนแพลตฟอร์ม หมวดหมู่ หรือล้างตัวกรองเพื่อดูรายการทั้งหมด
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="mt-2 h-10 px-6 rounded-full bg-[#FF1E6E] text-white text-sm font-semibold hover:brightness-110 cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}
