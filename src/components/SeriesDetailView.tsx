import { useState } from 'react';
import {
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Film,
  Heart,
  Play,
  Share2,
  Star,
} from 'lucide-react';
import { SeriesItem, WatchHistoryEntry } from '../types/series';
import { ResilientImage } from './ResilientImage';
import { SeriesCard } from './SeriesCard';

interface SeriesDetailViewProps {
  series: SeriesItem;
  relatedSeries: SeriesItem[];
  isFavorite: boolean;
  watchEntry?: WatchHistoryEntry;
  onToggleFavorite: (seriesId: string) => void;
  onPlayEpisode: (series: SeriesItem, episodeNumber: number) => void;
  onBackHome: () => void;
  onSelectSeries: (series: SeriesItem) => void;
}

export function SeriesDetailView({
  series,
  relatedSeries,
  isFavorite,
  watchEntry,
  onToggleFavorite,
  onPlayEpisode,
  onBackHome,
  onSelectSeries,
}: SeriesDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'episodes' | 'trailer'>(
    'details'
  );
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?series=${series.id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // Clipboard may be restricted in headless contexts; show confirmation regardless
    }
    setShareCopied(true);
    window.setTimeout(() => setShareCopied(false), 2500);
  };

  const resumeEp = watchEntry ? watchEntry.episodeNumber : 1;

  return (
    <div className="space-y-5 sm:space-y-8">
      {/* Breadcrumb */}
      <nav aria-label="เส้นทางหน้า" className="flex items-center gap-1 text-[11px] sm:text-sm text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={onBackHome}
          className="hover:text-[#FF1E6E] transition-colors cursor-pointer"
        >
          หน้าแรก
        </button>
        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
        <span>ซีรีส์</span>
        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
        <span className="font-semibold text-slate-900 dark:text-white truncate">
          {series.title}
        </span>
      </nav>

      {/* Main Info Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100/80 dark:border-slate-800 p-3.5 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-start">
          {/* Poster Column */}
          <div className="md:col-span-4 lg:col-span-3 max-w-[155px] mx-auto w-full md:max-w-none">
            <div className="relative aspect-[3/4] rounded-xl sm:rounded-2xl overflow-hidden shadow-md bg-slate-100 dark:bg-slate-800">
              <ResilientImage
                src={series.poster}
                alt={`${series.title} โปสเตอร์`}
                fallbackTitle={series.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 sm:px-2.5 py-0.5 rounded-md bg-[#FF1E6E] text-white text-[10px] sm:text-xs font-bold">
                {series.badge}
              </span>
            </div>
          </div>

          {/* Info & Action Column */}
          <div className="md:col-span-8 lg:col-span-9 space-y-3 sm:space-y-4">
            <div>
              <h1 className="font-display text-xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {series.title}
              </h1>
              <p className="text-xs sm:text-base font-medium text-slate-600 dark:text-slate-300 mt-0.5 sm:mt-1">
                {series.thaiTitle}
              </p>
            </div>

            {/* Rating & Pastel Pink Genre Chips */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                <span>{series.rating.toFixed(1)}</span>
                <span className="font-normal text-slate-500 dark:text-slate-400">
                  (จาก {series.reviewCountLabel} รีวิว)
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {series.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#FF1E6E] dark:text-rose-300 text-xs font-semibold"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-3xl">
              {series.synopsis}
            </p>

            {/* Structured Specifications */}
            <dl className="space-y-2 pt-1 text-sm">
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Film className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" aria-hidden="true" />
                <dt className="text-slate-600 dark:text-slate-400">จำนวนตอน :</dt>
                <dd className="font-semibold tabular-nums">{series.totalEpisodes} ตอน</dd>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Clock className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" aria-hidden="true" />
                <dt className="text-slate-600 dark:text-slate-400">ความยาวตอนละ :</dt>
                <dd className="font-semibold tabular-nums">
                  {series.episodeDurationMinutes} นาที
                </dd>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" aria-hidden="true" />
                <dt className="text-slate-600 dark:text-slate-400">ออกอากาศ :</dt>
                <dd className="font-semibold tabular-nums">{series.year}</dd>
              </div>
            </dl>

            {/* Exact Screenshot 3 Action Layout: Full-width Pink CTA + Share Circle, Favorite link underneath */}
            <div className="pt-1 sm:pt-2 space-y-2 max-w-md">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onPlayEpisode(series, resumeEp)}
                  className="flex-1 h-9 sm:h-11 px-4 sm:px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 active:scale-[0.98] text-white text-xs sm:text-base font-bold shadow-lg shadow-rose-500/25 flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" aria-hidden="true" />
                  <span>
                    {watchEntry
                      ? `ดูต่อตอนที่ ${watchEntry.episodeNumber}`
                      : 'รับชมตอนแรก'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  aria-label="แชร์ซีรีส์นี้"
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  {shareCopied ? (
                    <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  ) : (
                    <Share2 className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => onToggleFavorite(series.id)}
                  aria-pressed={isFavorite}
                  className={`h-9 px-4 rounded-full text-xs sm:text-sm font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isFavorite
                      ? 'bg-rose-50 dark:bg-rose-950/50 text-[#FF1E6E]'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#FF1E6E]'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorite ? 'fill-[#FF1E6E] text-[#FF1E6E]' : ''}`}
                    aria-hidden="true"
                  />
                  <span>
                    {isFavorite ? 'อยู่ในรายการโปรดแล้ว' : 'เพิ่มเข้ารายการโปรด'}
                  </span>
                </button>
              </div>
              {shareCopied && (
                <p role="status" className="text-xs text-emerald-600 font-medium">
                  คัดลอกลิงก์แชร์เรียบร้อยแล้ว
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sub-navigation Tabs: รายละเอียด | รายการตอน | ตัวอย่าง */}
        <div className="mt-8 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6">
          {(
            [
              { id: 'details', label: 'รายละเอียด' },
              { id: 'episodes', label: `รายการตอน (${series.episodes.length})` },
              { id: 'trailer', label: 'ตัวอย่าง' },
            ] as const
          ).map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`relative pb-3 text-sm sm:text-base font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'text-[#FF1E6E]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF1E6E] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="pt-6">
          {activeTab === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-700 dark:text-slate-300">
              <div className="space-y-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  ข้อมูลการผลิตและแพลตฟอร์ม
                </h2>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">สตูดิโอผู้ผลิต : </span>
                  <span className="font-medium">{series.studio}</span>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">แพลตฟอร์มที่รับชมได้ : </span>
                  <span className="font-medium uppercase">
                    {[series.platform, ...series.additionalPlatforms].join(' · ')}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500 dark:text-slate-400">ระบบเสียง : </span>
                  <span className="font-medium">พากย์ไทยคมชัดระดับ HD</span>
                </p>
              </div>
              <div className="space-y-2">
                <h2 className="font-bold text-slate-900 dark:text-white text-base">
                  ตอนแนะนำเริ่มต้น
                </h2>
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50/70 dark:bg-slate-800 border border-rose-100 dark:border-slate-700">
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-slate-900 dark:text-white truncate">
                      {series.episodes[0]?.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      ความยาว {series.episodes[0]?.durationLabel} นาที
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayEpisode(series, 1)}
                    className="h-9 px-4 rounded-full bg-[#FF1E6E] hover:bg-rose-600 text-white text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    เล่นตอนที่ 1
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'episodes' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {series.episodes.map((ep) => {
                const isCurrent = watchEntry?.episodeNumber === ep.number;
                return (
                  <button
                    key={ep.number}
                    type="button"
                    onClick={() => onPlayEpisode(series, ep.number)}
                    className={`flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-[#FF1E6E]'
                        : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 hover:border-rose-300'
                    }`}
                  >
                    <div className="relative w-24 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-200 dark:bg-slate-700">
                      <ResilientImage
                        src={ep.thumbnail}
                        alt={ep.title}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-current" aria-hidden="true" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                        {ep.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                        {ep.durationLabel}
                        {isCurrent && (
                          <span className="ml-2 text-[#FF1E6E] font-semibold">
                            · กำลังดูล่าสุด
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {activeTab === 'trailer' && (
            <div className="rounded-2xl overflow-hidden border border-rose-100 dark:border-slate-800 bg-slate-950 relative aspect-video max-h-[380px] w-full flex items-center justify-center">
              <ResilientImage
                src={series.heroBanner || series.poster}
                alt={`ตัวอย่าง ${series.title}`}
                className="w-full h-full object-cover opacity-55"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <button
                  type="button"
                  onClick={() => onPlayEpisode(series, 1)}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF2A7A] to-[#E6005C] text-white flex items-center justify-center shadow-xl shadow-rose-600/40 hover:scale-105 transition-transform cursor-pointer"
                  aria-label={`เล่นตัวอย่างและตอนที่ 1 ของ ${series.title}`}
                >
                  <Play className="w-7 h-7 fill-current ml-1" aria-hidden="true" />
                </button>
                <p className="mt-3 text-white font-bold text-base">
                  ตัวอย่างอย่างเป็นทางการ — {series.title}
                </p>
                <p className="text-xs text-slate-200 mt-1">
                  คลิกเพื่อเปิดเครื่องเล่นวิดีโอเต็มรูปแบบเสียงพากย์ไทย
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Series */}
      {relatedSeries.length > 0 && (
        <section aria-label="ซีรีส์แนะนำที่คล้ายกัน" className="space-y-2.5 sm:space-y-4">
          <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white">
            ซีรีส์แนะนำที่คุณอาจชอบ
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            {relatedSeries.map((item) => (
              <SeriesCard
                key={item.id}
                series={item}
                onSelect={onSelectSeries}
                onQuickPlay={(s) => onPlayEpisode(s, 1)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
