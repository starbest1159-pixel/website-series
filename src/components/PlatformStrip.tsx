import { ChevronRight, Flame, LayoutGrid } from 'lucide-react';
import { PLATFORMS } from '../data/catalog';
import { PlatformId } from '../types/series';
import { PlatformLogo } from './PlatformLogo';

interface PlatformStripProps {
  selectedPlatform: PlatformId;
  onSelectPlatform: (platform: PlatformId) => void;
  onViewAll: () => void;
}

export function PlatformStrip({
  selectedPlatform,
  onSelectPlatform,
  onViewAll,
}: PlatformStripProps) {
  return (
    <section id="platform-section" aria-label="เลือกชมตามแพลตฟอร์ม" className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF1E6E] fill-[#FF1E6E]/20" aria-hidden="true" />
          <h2 className="font-display text-sm sm:text-xl font-bold text-slate-900 dark:text-white">
            เลือกชมตามแพลตฟอร์ม
          </h2>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-[11px] sm:text-sm font-semibold text-[#FF1E6E] hover:text-rose-700 flex items-center gap-0.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>ดูทั้งหมด</span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 sm:pb-1">
        {PLATFORMS.map((platform) => {
          const isActive = selectedPlatform === platform.id;
          return (
            <button
              key={platform.id}
              type="button"
              onClick={() => onSelectPlatform(platform.id)}
              aria-pressed={isActive}
              aria-label={platform.label}
              className={`h-8 sm:min-h-[42px] px-2.5 sm:px-3.5 py-1 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-semibold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] text-white shadow-sm shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-2xs hover:border-rose-300 dark:hover:border-rose-600'
              }`}
            >
              {platform.id === 'all' ? (
                <>
                  <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden="true" />
                  <span>{platform.label}</span>
                </>
              ) : (
                <>
                  <PlatformLogo
                    platformId={platform.id}
                    active={isActive}
                    className={
                      platform.id === 'netflix'
                        ? 'h-[11px] sm:h-[16px] w-auto'
                        : 'h-[15px] sm:h-[22px] w-auto'
                    }
                  />
                  <span className="sr-only">{platform.label}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
