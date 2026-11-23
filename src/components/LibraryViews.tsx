import { Clock, Crown, Heart, Moon, Play, Sun, Trash2 } from 'lucide-react';
import {
  AppSettings,
  SeriesItem,
  SubtitleLang,
  UserSession,
  VideoQuality,
  WatchHistoryEntry,
} from '../types/series';
import { formatTime } from '../utils/catalogLogic';
import { ResilientImage } from './ResilientImage';
import { SeriesCard } from './SeriesCard';

interface FavoritesViewProps {
  favoriteSeries: SeriesItem[];
  onSelectSeries: (series: SeriesItem) => void;
  onQuickPlay: (series: SeriesItem) => void;
  onRemoveFavorite: (seriesId: string) => void;
  onBrowseCatalog: () => void;
}

export function FavoritesView({
  favoriteSeries,
  onSelectSeries,
  onQuickPlay,
  onRemoveFavorite,
  onBrowseCatalog,
}: FavoritesViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-lg sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            รายการโปรดของคุณ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            บันทึกไว้ทั้งหมด{' '}
            <span className="font-bold text-[#FF1E6E] tabular-nums">
              {favoriteSeries.length}
            </span>{' '}
            เรื่อง
          </p>
        </div>
      </div>

      {favoriteSeries.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-5">
          {favoriteSeries.map((series) => (
            <div key={series.id} className="space-y-1.5 sm:space-y-2">
              <SeriesCard
                series={series}
                onSelect={onSelectSeries}
                onQuickPlay={onQuickPlay}
              />
              <button
                type="button"
                onClick={() => onRemoveFavorite(series.id)}
                className="w-full h-7 sm:h-8 rounded-lg sm:rounded-xl bg-rose-50 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 text-[10px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span>นำออก</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100 dark:border-slate-800 p-7 sm:p-12 text-center space-y-2.5 sm:space-y-3">
          <div className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#FF1E6E] flex items-center justify-center">
            <Heart className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            ยังไม่มีซีรีส์ในรายการโปรด
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            กดปุ่ม “เพิ่มเข้ารายการโปรด” ในหน้ารายละเอียดซีรีส์เพื่อเก็บเรื่องโปรดของคุณไว้รับชมภายหลัง
          </p>
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="mt-1.5 sm:mt-2 h-8 sm:h-10 px-4 sm:px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] text-white text-xs sm:text-sm font-bold cursor-pointer"
          >
            สำรวจซีรีส์ยอดนิยม
          </button>
        </div>
      )}
    </div>
  );
}

interface HistoryViewProps {
  entries: { entry: WatchHistoryEntry; series: SeriesItem }[];
  onResume: (series: SeriesItem, episodeNumber: number, progressSeconds: number) => void;
  onRemoveEntry: (seriesId: string) => void;
  onClearHistory: () => void;
  onBrowseCatalog: () => void;
}

export function HistoryView({
  entries,
  onResume,
  onRemoveEntry,
  onClearHistory,
  onBrowseCatalog,
}: HistoryViewProps) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="font-display text-lg sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            ประวัติการรับชม
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
            ดูต่อจากจุดที่ค้างไว้ได้ทันที
          </p>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="h-7 sm:h-9 px-3 sm:px-4 rounded-full border border-rose-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-[11px] sm:text-xs font-semibold hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            ล้างประวัติทั้งหมด
          </button>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4">
          {entries.map(({ entry, series }) => {
            const pct = Math.min(
              100,
              Math.round((entry.progressSeconds / Math.max(1, entry.durationSeconds)) * 100)
            );
            return (
              <div
                key={series.id}
                className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-rose-100/80 dark:border-slate-800 p-3 sm:p-4 flex items-center gap-3 sm:gap-4"
              >
                <div className="relative w-14 h-20 sm:w-20 sm:h-28 rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800">
                  <ResilientImage
                    src={series.poster}
                    alt={series.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      {series.title}
                    </h2>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                      ตอนที่ {entry.episodeNumber} · รับชมไปแล้ว{' '}
                      <span className="font-mono-tabular">
                        {formatTime(entry.progressSeconds)} / {formatTime(entry.durationSeconds)}
                      </span>
                    </p>
                  </div>

                  <div className="w-full h-1 sm:h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-[#FF1E6E] rounded-full"
                      style={{ width: `${Math.max(5, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5 sm:pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        onResume(series, entry.episodeNumber, entry.progressSeconds)
                      }
                      className="h-7 sm:h-8 px-3 sm:px-4 rounded-full bg-[#FF1E6E] text-white text-[11px] sm:text-xs font-bold inline-flex items-center gap-1 sm:gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" aria-hidden="true" />
                      <span>ดูต่อ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveEntry(series.id)}
                      aria-label={`ลบประวัติ ${series.title}`}
                      className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs font-semibold hover:text-rose-600 cursor-pointer"
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100 dark:border-slate-800 p-7 sm:p-12 text-center space-y-2.5 sm:space-y-3">
          <div className="w-11 h-11 sm:w-14 sm:h-14 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/50 text-[#FF1E6E] flex items-center justify-center">
            <Clock className="w-5 h-5 sm:w-7 sm:h-7" aria-hidden="true" />
          </div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            ยังไม่มีประวัติการรับชม
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            เมื่อคุณเริ่มรับชมซีรีส์หรืออนิเมะ ประวัติและเวลาที่ค้างไว้จะถูกบันทึกไว้ที่นี่โดยอัตโนมัติ
          </p>
          <button
            type="button"
            onClick={onBrowseCatalog}
            className="mt-1.5 sm:mt-2 h-8 sm:h-10 px-4 sm:px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] text-white text-xs sm:text-sm font-bold cursor-pointer"
          >
            เลือกชมซีรีส์เลย
          </button>
        </div>
      )}
    </div>
  );
}

interface SettingsViewProps {
  settings: AppSettings;
  user: UserSession | null;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
}

export function SettingsView({
  settings,
  user,
  onUpdateSettings,
  onOpenAuth,
  onLogout,
}: SettingsViewProps) {
  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-display text-lg sm:text-3xl font-extrabold text-slate-900 dark:text-white">
          ตั้งค่าบัญชีและการรับชม
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1">
          ปรับแต่งคุณภาพวิดีโอ โหมดสีหน้าจอ และค่าเริ่มต้นการเล่น
        </p>
      </div>

      {/* Account Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100/80 dark:border-slate-800 p-4 sm:p-6 space-y-3 sm:space-y-4">
        <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-white">
          สถานะสมาชิก
        </h2>
        {user ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {user.name}
                {user.isVip && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] sm:text-xs font-bold">
                    <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                    VIP
                  </span>
                )}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
              <p className="text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">
                สิทธิ์ VIP หมดอายุ : {user.vipExpiryLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="h-8 sm:h-10 px-4 sm:px-5 rounded-full border border-rose-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold hover:bg-rose-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              ออกจากระบบ
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              ยังไม่ได้เข้าสู่ระบบ เข้าสู่ระบบเพื่อรับสิทธิ์สมาชิก VIP และซิงค์ข้อมูล
            </p>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="h-8 sm:h-10 px-4 sm:px-6 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] text-white text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 cursor-pointer"
            >
              เข้าสู่ระบบ / สมัครสมาชิก
            </button>
          </div>
        )}
      </section>

      {/* Preferences Card */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-100/80 dark:border-slate-800 p-4 sm:p-6 divide-y divide-slate-100 dark:divide-slate-800">
        {/* Theme */}
        <div className="py-3 sm:py-4 first:pt-0 flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              ธีมหน้าจอ (Light / Dark Mode)
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              สลับระหว่างโหมดสว่างพาสเทลและโหมดมืดถนอมสายตา
            </p>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 rounded-full bg-slate-100 dark:bg-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'light' })}
              aria-pressed={settings.theme === 'light'}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                settings.theme === 'light'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500'
              }`}
            >
              <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              สว่าง
            </button>
            <button
              type="button"
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              aria-pressed={settings.theme === 'dark'}
              className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                settings.theme === 'dark'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Moon className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              มืด
            </button>
          </div>
        </div>

        {/* Default Quality */}
        <div className="py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <label
              htmlFor="setting-quality"
              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
            >
              ความคมชัดเริ่มต้น
            </label>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ระดับความละเอียดวิดีโอเมื่อเปิดเล่นตอนใหม่
            </p>
          </div>
          <select
            id="setting-quality"
            value={settings.defaultQuality}
            onChange={(e) =>
              onUpdateSettings({ defaultQuality: e.target.value as VideoQuality })
            }
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shrink-0"
          >
            <option value="1080p HD">1080p HD</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
          </select>
        </div>

        {/* Default Subtitles */}
        <div className="py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <label
              htmlFor="setting-subtitle"
              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
            >
              ภาษาคำบรรยายเริ่มต้น
            </label>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เลือกภาษาซับไตเติลที่แสดงอัตโนมัติ
            </p>
          </div>
          <select
            id="setting-subtitle"
            value={settings.defaultSubtitle}
            onChange={(e) =>
              onUpdateSettings({ defaultSubtitle: e.target.value as SubtitleLang })
            }
            className="h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl bg-slate-100 dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white shrink-0"
          >
            <option value="TH">ซับไทย (TH)</option>
            <option value="EN">English (EN)</option>
            <option value="OFF">ปิดซับไตเติล</option>
          </select>
        </div>

        {/* Autoplay Next */}
        <div className="py-3 sm:py-4 last:pb-0 flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              เล่นตอนถัดไปอัตโนมัติ
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              เริ่มตอนถัดไปทันทีเมื่อเล่นจบตอนปัจจุบัน
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.autoplayNext}
            aria-label="เล่นตอนถัดไปอัตโนมัติ"
            onClick={() =>
              onUpdateSettings({ autoplayNext: !settings.autoplayNext })
            }
            className={`w-10 h-6 sm:w-12 sm:h-7 rounded-full transition-colors p-0.5 sm:p-1 cursor-pointer shrink-0 ${
              settings.autoplayNext ? 'bg-[#FF1E6E]' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.autoplayNext ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
}
