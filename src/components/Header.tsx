import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  Bell,
  ChevronDown,
  Clock,
  Crown,
  Heart,
  LogOut,
  Menu,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react';
import { GENRES, MASCOT_IMAGE } from '../data/catalog';
import { AppView, GenreId, SeriesItem, UserSession } from '../types/series';
import { ResilientImage } from './ResilientImage';

interface HeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onSelectCategoryGenre: (genre: GenreId) => void;
  onFocusPlatforms: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (q: string) => void;
  user: UserSession | null;
  onOpenAuth: (mode: 'login' | 'register') => void;
  onLogout: () => void;
  favoritesCount: number;
  historyCount: number;
  latestSeries?: SeriesItem[];
  onSelectSeries: (seriesId: string) => void;
}

export function Header({
  activeView,
  onNavigate,
  onSelectCategoryGenre,
  onFocusPlatforms,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  user,
  onOpenAuth,
  onLogout,
  favoritesCount,
  historyCount,
  latestSeries = [],
  onSelectSeries,
}: HeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [genreMenuOpen, setGenreMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [hasReadNotifs, setHasReadNotifs] = useState(false);

  const notifications = latestSeries.slice(0, 4).map((series) => ({
    id: series.id,
    seriesId: series.id,
    title: series.title,
    detail: `พากย์ไทยครบ ${series.totalEpisodes} ตอน · ${series.studio}`,
    time: 'อัปเดตล่าสุด',
  }));
  const unreadCount = hasReadNotifs ? 0 : notifications.length;

  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const genreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
      if (genreRef.current && !genreRef.current.contains(e.target as Node)) {
        setGenreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearchSubmit(searchQuery);
    setMobileSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-[0_2px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_2px_14px_rgba(0,0,0,0.4)] transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-[68px] flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Logo + Desktop Nav Links */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Bannlai Series หน้าแรก"
            className="flex items-center shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D90057] rounded-lg py-0.5 transition-transform duration-150 hover:scale-[1.03] active:scale-[0.98]"
          >
            <img
              src="/assets/bannlai/brand-logo-transparent.png"
              alt="Bannlai Series"
              className="h-10 sm:h-12 md:h-[54px] w-auto object-contain drop-shadow-[0_2px_6px_rgba(15,23,42,0.22)] dark:drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
            />
          </button>

          <nav
            aria-label="เมนูหลัก"
            className="hidden md:flex items-center gap-6 text-sm font-semibold"
          >
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={`relative py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeView === 'home'
                ? 'text-[#D90057] dark:text-[#FF4D94] font-bold'
                : 'text-slate-800 dark:text-slate-200 hover:text-[#D90057] dark:hover:text-[#FF4D94]'
            }`}
          >
            หน้าแรก
            {activeView === 'home' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#D90057] dark:bg-[#FF4D94] rounded-full"
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className={`relative py-2 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeView === 'catalog'
                ? 'text-[#D90057] dark:text-[#FF4D94] font-bold'
                : 'text-slate-800 dark:text-slate-200 hover:text-[#D90057] dark:hover:text-[#FF4D94]'
            }`}
          >
            รวมซีรีส์
            {activeView === 'catalog' && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#D90057] dark:bg-[#FF4D94] rounded-full"
              />
            )}
          </button>

          <button
            type="button"
            onClick={onFocusPlatforms}
            className="relative py-2 whitespace-nowrap shrink-0 text-slate-800 dark:text-slate-200 hover:text-[#D90057] dark:hover:text-[#FF4D94] transition-colors cursor-pointer"
          >
            แพลตฟอร์ม
          </button>

          <div className="relative" ref={genreRef}>
            <button
              type="button"
              onClick={() => setGenreMenuOpen((v) => !v)}
              aria-expanded={genreMenuOpen}
              className="py-2 whitespace-nowrap shrink-0 text-slate-800 dark:text-slate-200 hover:text-[#D90057] dark:hover:text-[#FF4D94] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>หมวดหมู่</span>
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>

            {genreMenuOpen && (
              <div
                role="menu"
                aria-label="เลือกหมวดหมู่"
                className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-2 z-50"
              >
                {GENRES.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => {
                      setGenreMenuOpen(false);
                      onSelectCategoryGenre(g);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-[#FF1E6E] transition-colors cursor-pointer"
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
          </nav>
        </div>

        {/* Right: Search + Notifications + Account / Mobile Menu */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Desktop Search Pill */}
          <form
            onSubmit={handleFormSubmit}
            className="hidden lg:flex items-center relative w-64"
            role="search"
          >
            <label htmlFor="desktop-series-search" className="sr-only">
              ค้นหาซีรีส์ที่ต้องการ
            </label>
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="desktop-series-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาซีรีส์ที่ต้องการ..."
              className="w-full h-9 pl-9 pr-8 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 rounded-full border border-slate-200/60 dark:border-slate-700 focus:border-rose-300 dark:focus:border-rose-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </form>

          {/* Mobile/Tablet Search Trigger */}
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="ค้นหาซีรีส์"
            aria-expanded={mobileSearchOpen}
            className="lg:hidden w-8 h-8 sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Search className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>

          {/* Notification Bell Popover */}
          <div className="relative hidden sm:block" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                setHasReadNotifs(true);
              }}
              aria-label="การแจ้งเตือนตอนใหม่"
              aria-expanded={notifOpen}
              className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Bell className="w-5 h-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#FF1E6E] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                role="region"
                aria-label="รายการแจ้งเตือน"
                className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-3 z-50"
              >
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    อัปเดตพากย์ไทยล่าสุด
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    วันนี้
                  </span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-1">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          onSelectSeries(n.seriesId);
                        }}
                        className="w-full text-left px-2 py-2.5 rounded-xl hover:bg-rose-50/70 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                      >
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                          {n.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {n.detail}
                        </p>
                        <p className="text-[11px] text-[#FF1E6E] mt-1 font-medium">
                          {n.time}
                        </p>
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-4 text-xs text-center text-slate-500 dark:text-slate-400">
                      ยังไม่มีรายการอัปเดตใหม่
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Account Menu / Avatar / Login */}
          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-label={`บัญชีผู้ใช้ ${user.name}`}
                aria-expanded={accountMenuOpen}
                className="flex items-center gap-2 p-0.5 rounded-full border-2 border-rose-300 hover:border-[#FF1E6E] transition-colors cursor-pointer"
              >
                <ResilientImage
                  src={MASCOT_IMAGE}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </button>

              {accountMenuOpen && (
                <div
                  role="menu"
                  aria-label="เมนูบัญชีผู้ใช้"
                  className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 z-50"
                >
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <ResilientImage
                      src={MASCOT_IMAGE}
                      alt={user.name}
                      className="w-11 h-11 rounded-full object-cover border-2 border-rose-300"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {user.isVip && (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-300/90 via-yellow-300/90 to-amber-400/90 text-slate-900 flex items-center gap-2.5">
                      <Crown className="w-5 h-5 text-amber-800 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold">สมาชิก VIP</p>
                        <p className="text-[11px] text-amber-950/80">
                          หมดอายุ : {user.vipExpiryLabel}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate('history');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-500" aria-hidden="true" />
                        ประวัติการรับชม
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">{historyCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate('favorites');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-rose-500" aria-hidden="true" />
                        รายการโปรด
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">{favoritesCount}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onNavigate('settings');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-slate-500" aria-hidden="true" />
                      ตั้งค่าบัญชี
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      ออกจากระบบ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              aria-label="เข้าสู่ระบบ"
              className="h-7 sm:h-9 px-2.5 sm:px-3.5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] hover:brightness-105 text-white text-[11px] sm:text-sm font-semibold shadow-sm shadow-rose-500/25 flex items-center gap-1 sm:gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer"
            >
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}

          {/* Mobile Hamburger Menu button matching Screenshot 2 */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="เปิดเมนูเพิ่มเติม"
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-8 h-8 sm:min-h-[40px] sm:min-w-[40px] flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 space-y-1">
          {(
            [
              { id: 'home', label: 'หน้าแรก' },
              { id: 'catalog', label: 'รวมซีรีส์' },
              { id: 'favorites', label: 'รายการโปรด' },
              { id: 'history', label: 'ประวัติการดู' },
              { id: 'settings', label: 'ตั้งค่าบัญชี' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(item.id);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-semibold ${
                activeView === item.id
                  ? 'bg-rose-50 text-[#FF1E6E]'
                  : 'text-slate-700 dark:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Expandable Mobile/Tablet Search Row */}
      {mobileSearchOpen && (
        <div className="lg:hidden px-4 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form onSubmit={handleFormSubmit} className="relative flex items-center" role="search">
            <label htmlFor="mobile-series-search" className="sr-only">
              ค้นหาซีรีส์ที่ต้องการ
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5" aria-hidden="true" />
            <input
              id="mobile-series-search"
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="ค้นหาชื่อซีรีส์พากย์ไทย หรือแนวเรื่อง..."
              autoFocus
              className="w-full h-10 pl-9 pr-20 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 h-7 px-3 rounded-full bg-[#FF1E6E] text-white text-xs font-semibold"
            >
              ค้นหา
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
