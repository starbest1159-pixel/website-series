import { Clapperboard, Heart, History, Home, Settings, type LucideIcon } from 'lucide-react';
import { AppView } from '../types/series';

interface MobileBottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function MobileBottomNav({ activeView, onNavigate }: MobileBottomNavProps) {
  const items: {
    id: AppView;
    label: string;
    Icon: LucideIcon;
  }[] = [
    {
      id: 'home',
      label: 'หน้าหลัก',
      Icon: Home,
    },
    {
      id: 'catalog',
      label: 'ซีรีส์',
      Icon: Clapperboard,
    },
    {
      id: 'favorites',
      label: 'รายการโปรด',
      Icon: Heart,
    },
    {
      id: 'history',
      label: 'ประวัติ',
      Icon: History,
    },
    {
      id: 'settings',
      label: 'ตั้งค่า',
      Icon: Settings,
    },
  ];

  return (
    <nav
      aria-label="เมนูนำทางมือถือ"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[64px] px-1.5 bg-white dark:bg-slate-950 border-t-2 border-rose-200 dark:border-rose-900/70 shadow-[0_-6px_22px_rgba(255,30,110,0.12)] grid grid-cols-5 items-center gap-1.5"
    >
      {items.map(({ id, label, Icon }) => {
        const isActive = activeView === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`relative w-full h-[52px] px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1E6E] ${
              isActive
                ? 'bg-gradient-to-b from-rose-100 via-pink-100 to-rose-200/85 dark:from-rose-950 dark:to-pink-900/70 border-2 border-[#FF1E6E] shadow-sm shadow-rose-500/25'
                : 'bg-slate-50 dark:bg-slate-900 border border-slate-300/85 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 shadow-2xs'
            }`}
          >
            <Icon
              aria-hidden="true"
              strokeWidth={isActive ? 2.4 : 2}
              className={`w-[21px] h-[21px] pointer-events-none select-none transition-transform ${
                isActive
                  ? 'text-[#FF1E6E] dark:text-rose-300 scale-105'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            />
            <span
              className={`text-[10.5px] leading-none tracking-tight whitespace-nowrap ${
                isActive
                  ? 'font-extrabold text-[#C9004E] dark:text-rose-200'
                  : 'font-bold text-slate-900 dark:text-slate-100'
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
