import { ChevronRight, Headphones, MonitorSmartphone, ShieldCheck, Zap } from 'lucide-react';
import { PLATFORMS } from '../data/catalog';
import { PlatformId, UserSession } from '../types/series';
import { ResilientImage } from './ResilientImage';

interface PromoBannerProps {
  user: UserSession | null;
  onRegisterClick: () => void;
  onSelectPlatform: (platform: PlatformId) => void;
}

export function PromoBanner({
  user,
  onRegisterClick,
  onSelectPlatform,
}: PromoBannerProps) {
  const highlights = [
    { icon: Zap, title: 'สตรีมลื่นไหล', subtitle: 'ไม่มีสะดุด' },
    { icon: ShieldCheck, title: 'ปลอดภัย 100%', subtitle: 'ข้อมูลของคุณ' },
    { icon: MonitorSmartphone, title: 'ดูได้ทุกอุปกรณ์', subtitle: 'มือถือ / คอมพิวเตอร์' },
    { icon: Headphones, title: 'พร้อมให้บริการ', subtitle: 'ตลอด 24 ชั่วโมง' },
  ];

  const featuredPlatforms = PLATFORMS.filter((p) => p.id !== 'all').slice(0, 6);

  return (
    <section
      aria-label="สิทธิพิเศษสมาชิก Bannlai Series"
      className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFF6F9] via-white to-[#FFE0EC] dark:from-slate-900 dark:via-slate-900 dark:to-rose-950/30 border border-rose-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm"
    >
      <img
        src="/assets/bannlai/14-pink-decorative-background.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-20 dark:opacity-10"
      />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 space-y-5">
          <div>
            <h2
              className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              รวมซีรีส์ทุกแพลตฟอร์มไว้ที่นี่
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-1">
              เพลิดเพลินกับซีรีส์และอนิเมะจากทุกแพลตฟอร์มในที่เดียว
            </p>
          </div>

          {/* Clickable platform shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            {featuredPlatforms.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPlatform(p.id)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 hover:border-rose-300 text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center"
                  style={{ backgroundColor: p.accentColor }}
                >
                  {p.shortCode}
                </span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          {/* 4-column feature highlights matching Screenshot 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl bg-white dark:bg-slate-800/90 border border-rose-100/80 dark:border-slate-700/80 p-3.5 text-center shadow-2xs"
                >
                  <div className="w-9 h-9 mx-auto rounded-full bg-rose-50 dark:bg-rose-950/60 text-[#FF1E6E] flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mascot + Pink Bubble CTA matching Screenshot 3 */}
        <div className="lg:col-span-4 flex flex-col items-center text-center relative">
          <ResilientImage
            src="/assets/bannlai/05-chibi-mascot-with-cat.png"
            alt="มาสคอต Bannlai Series"
            className="w-40 h-40 rounded-3xl object-cover bg-white shadow-md border-4 border-white dark:border-slate-700"
          />
          <div className="mt-3 w-full max-w-xs rounded-2xl bg-gradient-to-br from-[#FF5C97] to-[#FF1E6E] text-white p-4 shadow-lg shadow-rose-500/25">
            <p className="text-sm font-bold leading-snug">
              {user
                ? `สวัสดีคุณ ${user.name}!`
                : 'สมัครสมาชิกวันนี้ รับสิทธิพิเศษมากมาย!'}
            </p>
            {!user && (
              <button
                type="button"
                onClick={onRegisterClick}
                className="mt-2.5 h-9 px-5 rounded-full bg-white text-[#FF1E6E] hover:bg-rose-50 text-xs font-extrabold shadow-sm inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition-all cursor-pointer"
              >
                <span>สมัครเลย</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
