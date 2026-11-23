import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Info, Pause, Play } from 'lucide-react';
import { SeriesItem } from '../types/series';
import { ResilientImage } from './ResilientImage';

interface HeroCarouselProps {
  slides: SeriesItem[];
  onWatchNow: (series: SeriesItem) => void;
  onViewDetails: (series: SeriesItem) => void;
}

const AUTO_SLIDE_INTERVAL_MS = 3500;

export function HeroCarousel({
  slides,
  onWatchNow,
  onViewDetails,
}: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (slides.length <= 1 || !isAutoPlaying) return;
    const timer = window.setTimeout(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [slides.length, isAutoPlaying, activeIndex]);

  if (slides.length === 0) return null;

  const safeIndex = activeIndex % slides.length;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  return (
    <section
      aria-label="ซีรีส์แนะนำประจำวัน"
      aria-roledescription="carousel"
      className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-md bg-slate-900"
    >
      <div className="relative h-[175px] sm:h-[340px] lg:h-[400px] w-full overflow-hidden">
        {/* Horizontal sliding track */}
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {slides.map((slide, idx) => {
            const isActive = idx === safeIndex;
            return (
              <div
                key={slide.id}
                aria-hidden={!isActive}
                className="relative w-full h-full shrink-0 overflow-hidden bg-gradient-to-br from-[#23103A] via-[#59184D] to-[#9E2462]"
              >
                <ResilientImage
                  src={slide.heroBanner || slide.poster}
                  alt={slide.title}
                  fallbackTitle={slide.title}
                  className="w-full h-full object-cover object-right sm:object-[72%_center] scale-[1.03]"
                />

                {/* Left-focused luminous scrim so text remains crisp over light or detailed artwork */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/55 to-slate-950/15 sm:bg-gradient-to-r sm:from-slate-950/90 sm:via-slate-950/55 sm:to-transparent"
                />

                {/* Hero Foreground Content */}
                <div className="absolute inset-0 flex flex-col justify-end sm:justify-center px-3.5 sm:px-14 lg:px-16 pb-6 sm:pb-0 max-w-xl">
                  <div className="mb-1 sm:mb-2 flex items-center gap-2 text-[10px] sm:text-xs font-semibold text-white">
                    <span className="px-2 sm:px-2.5 py-0.5 rounded-full bg-[#FF1E6E] text-white">
                      {slide.genres.includes('อนิเมะ')
                        ? 'อนิเมะมาใหม่'
                        : slide.badge === 'มาแรง'
                        ? 'ซีรีส์มาแรง'
                        : 'ซีรีส์แนะนำ'}
                    </span>
                  </div>

                  <h1
                    className="font-display text-lg sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight line-clamp-2 drop-shadow-sm"
                    style={{ textWrap: 'balance' }}
                  >
                    {slide.title}
                  </h1>

                  {slide.thaiTitle && slide.thaiTitle !== slide.title ? (
                    <p className="text-xs sm:text-lg font-bold text-white/95 mt-0.5 sm:mt-1.5 drop-shadow-xs line-clamp-1">
                      {slide.thaiTitle}
                    </p>
                  ) : (
                    <p className="text-[11px] sm:text-sm font-semibold text-rose-200 mt-0.5 sm:mt-1.5 drop-shadow-xs line-clamp-1">
                      {slide.studio} · {slide.totalEpisodes} ตอน · {slide.genres.slice(0, 2).join(' / ')}
                    </p>
                  )}

                  <p className="text-[11px] sm:text-sm text-white/90 mt-0.5 sm:mt-1.5 line-clamp-1 sm:line-clamp-2 max-w-md leading-snug sm:leading-relaxed drop-shadow-xs">
                    {slide.heroTagline || slide.synopsis}
                  </p>

                  <div className="mt-2.5 sm:mt-5 flex items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => onWatchNow(slide)}
                      className="h-7 sm:h-11 px-3.5 sm:px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-110 active:scale-[0.98] text-white text-[11px] sm:text-sm font-bold shadow-lg shadow-rose-600/35 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer"
                    >
                      <Play className="w-3 h-3 sm:w-4 sm:h-4 fill-current" aria-hidden="true" />
                      <span>รับชมเลย</span>
                    </button>

                    <button
                      type="button"
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => onViewDetails(slide)}
                      aria-label={`ดูรายละเอียด ${slide.title}`}
                      className="w-7 h-7 sm:w-11 sm:h-11 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-sm border border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Info className="w-3.5 h-3.5 sm:w-5 sm:h-5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Auto-slide Play/Pause Toggle */}
        {slides.length > 1 && (
          <button
            type="button"
            onClick={() => setIsAutoPlaying((prev) => !prev)}
            aria-label={isAutoPlaying ? 'หยุดสไลด์อัตโนมัติชั่วคราว' : 'เล่นสไลด์อัตโนมัติ'}
            title={isAutoPlaying ? 'หยุดสไลด์ชั่วคราว' : 'เล่นสไลด์อัตโนมัติ'}
            className="absolute top-2 right-2 sm:top-3.5 sm:right-3.5 z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-sm border border-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            {isAutoPlaying ? (
              <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            ) : (
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current ml-0.5" aria-hidden="true" />
            )}
          </button>
        )}

        {/* Left / Right Navigation Arrows */}
        {slides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="สไลด์ก่อนหน้า"
              className="hidden sm:flex absolute left-3.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="สไลด์ถัดไป"
              className="hidden sm:flex absolute right-3.5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/40 hover:bg-black/65 backdrop-blur-sm text-white items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        )}

        {/* Pagination Dots */}
        {slides.length > 1 && (
          <div
            className="absolute bottom-2 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 sm:gap-2"
            role="tablist"
            aria-label="เลือกสไลด์แนะนำ"
          >
            {slides.map((slide, idx) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={idx === safeIndex}
                aria-label={`สไลด์ที่ ${idx + 1}: ${slide.title}`}
                onClick={() => setActiveIndex(idx)}
                className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === safeIndex
                    ? 'w-4 sm:w-6 bg-[#FF1E6E]'
                    : 'w-1.5 sm:w-2 bg-white/70 hover:bg-white'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
