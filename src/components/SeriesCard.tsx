import { Play } from 'lucide-react';
import { SeriesItem } from '../types/series';
import { ResilientImage } from './ResilientImage';

interface SeriesCardProps {
  series: SeriesItem;
  variant?: 'standard' | 'overlay';
  onSelect: (series: SeriesItem) => void;
  onQuickPlay: (series: SeriesItem) => void;
}

export function SeriesCard({
  series,
  variant = 'standard',
  onSelect,
  onQuickPlay,
}: SeriesCardProps) {
  if (variant === 'overlay') {
    return (
      <article className="group relative aspect-[3/4] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm hover:shadow-md transition-shadow">
        <button
          type="button"
          onClick={() => onSelect(series)}
          aria-label={`เปิดรายละเอียด ${series.title} (${series.thaiTitle})`}
          className="w-full h-full block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 cursor-pointer"
        >
          <ResilientImage
            src={series.poster}
            alt={`${series.title} โปสเตอร์`}
            fallbackTitle={series.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-20 sm:h-28 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none"
          />
          <div className="absolute bottom-1.5 left-1.5 right-8 sm:bottom-3 sm:left-3 sm:right-14 text-left pointer-events-none">
            <h3 className="font-display text-[11px] sm:text-sm font-bold text-white line-clamp-1 leading-tight">
              {series.title}
            </h3>
            <p className="text-[9px] sm:text-[11px] text-white/85 line-clamp-1 mt-0.5 leading-tight">
              {series.thaiTitle && series.thaiTitle !== series.title
                ? series.thaiTitle
                : `${series.studio} · ${series.genres[0]}`}
            </p>
          </div>
        </button>

        {/* Top-right episode count tag */}
        <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-sm text-white text-[9px] sm:text-[11px] font-semibold tabular-nums pointer-events-none">
          {series.totalEpisodes} ตอน
        </span>

        {/* Bottom-right circular pink play button */}
        <button
          type="button"
          onClick={() => onQuickPlay(series)}
          aria-label={`รับชม ${series.title} ทันที`}
          className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#FF2A7A] to-[#E6005C] hover:scale-110 active:scale-95 text-white shadow-lg shadow-rose-600/35 flex items-center justify-center transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" aria-hidden="true" />
        </button>
      </article>
    );
  }

  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[3/4] w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800 ring-1 ring-slate-200/90 dark:ring-slate-800 shadow-sm group-hover:shadow-lg group-hover:ring-[#D90057]/40 transition-all">
        <button
          type="button"
          onClick={() => onSelect(series)}
          aria-label={`เปิดรายละเอียด ${series.title} (${series.thaiTitle})`}
          className="w-full h-full block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D90057] cursor-pointer"
        >
          <ResilientImage
            src={series.poster}
            alt={`${series.title} โปสเตอร์`}
            fallbackTitle={series.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-14 sm:h-18 bg-gradient-to-t from-black/60 via-black/15 to-transparent pointer-events-none"
          />
        </button>

        {/* Top-right episode count tag */}
        <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 px-1.5 sm:px-2.5 py-0.5 rounded-full bg-[#D90057] text-white text-[9px] sm:text-[11px] font-bold tabular-nums pointer-events-none shadow-sm">
          {series.totalEpisodes} ตอน
        </span>

        {/* Bottom-right quick play circle button */}
        <button
          type="button"
          onClick={() => onQuickPlay(series)}
          aria-label={`รับชม ${series.title} ทันที`}
          className="absolute bottom-1.5 right-1.5 sm:bottom-2.5 sm:right-2.5 w-6 h-6 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[#FF2A7A] to-[#C9004E] hover:scale-110 active:scale-95 text-white shadow-lg shadow-rose-900/40 ring-1 ring-white/30 flex items-center justify-center transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" aria-hidden="true" />
        </button>
      </div>

      {/* Below-card Title + High-contrast genre tag */}
      <button
        type="button"
        onClick={() => onSelect(series)}
        className="mt-1.5 sm:mt-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D90057] rounded-md cursor-pointer"
      >
        <h3 className="text-[11px] sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-[#D90057] dark:group-hover:text-[#FF4D94] transition-colors leading-tight">
          {series.thaiTitle}
        </h3>
        <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5">
          <span className="inline-block px-1.5 sm:px-2.5 py-0.5 rounded-full bg-rose-100/90 dark:bg-rose-950/75 text-[#B80048] dark:text-rose-200 border border-rose-200/80 dark:border-rose-900/60 text-[9px] sm:text-[11px] font-bold">
            {series.genres[0]}
          </span>
        </div>
      </button>
    </article>
  );
}
