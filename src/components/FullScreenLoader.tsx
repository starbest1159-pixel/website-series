import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FullScreenLoaderProps {
  visible: boolean;
  label?: string;
  canCancel?: boolean;
  onCancel?: () => void;
}

const EXIT_TRANSITION_MS = 240;

export function FullScreenLoader({
  visible,
  label = 'กำลังโหลดข้อมูล...',
  canCancel = true,
  onCancel,
}: FullScreenLoaderProps) {
  const [rendered, setRendered] = useState(visible);
  const [shown, setShown] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      const raf = window.requestAnimationFrame(() => {
        setShown(true);
      });
      return () => window.cancelAnimationFrame(raf);
    }

    setShown(false);
    const timer = window.setTimeout(() => {
      setRendered(false);
    }, EXIT_TRANSITION_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!rendered) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={visible}
      data-testid="fullscreen-loader"
      data-state={shown ? 'open' : 'closing'}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 select-none transition-opacity duration-200 ease-out ${
        shown ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 42%, #3D0C2B 0%, #160519 52%, #08030C 100%)',
      }}
    >
      {/* Subtle studio ambient radial glow — pure GPU transform/opacity, zero blur repaint */}
      <div
        aria-hidden="true"
        className="bannlai-loader-aura pointer-events-none absolute left-1/2 top-[43%] w-[340px] h-[240px] sm:w-[480px] sm:h-[320px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(255, 30, 110, 0.36) 0%, rgba(255, 130, 178, 0.14) 44%, rgba(255, 30, 110, 0) 74%)',
        }}
      />

      {/* Centerpiece Studio Brand Stage */}
      <div
        className={`relative z-10 w-full max-w-[360px] sm:max-w-[420px] flex flex-col items-center text-center transition-transform duration-200 ease-out ${
          shown ? 'scale-100 translate-y-0' : 'scale-[0.97] translate-y-1.5'
        }`}
      >
        {/* Main Transparent Brand Emblem */}
        <div className="bannlai-loader-logo relative flex items-center justify-center mb-5 sm:mb-6">
          <img
            src="/assets/bannlai/brand-logo-transparent.png"
            alt="Bannlai Series"
            decoding="sync"
            fetchPriority="high"
            className="w-[225px] sm:w-[295px] md:w-[330px] h-auto object-contain drop-shadow-[0_14px_30px_rgba(0,0,0,0.65)]"
          />
        </div>

        {/* Sleek Cinema Progress Rail (GPU translate3d sweep) */}
        <div
          aria-hidden="true"
          className="relative w-56 sm:w-68 h-[3.5px] rounded-full bg-white/15 overflow-hidden"
        >
          <div className="bannlai-loader-beam absolute inset-y-0 left-0 w-[44%] rounded-full bg-gradient-to-r from-[#FF2A7A]/0 via-[#FF3D8A] to-[#FFD27D]" />
        </div>

        {/* Crisp Status Label */}
        <p className="mt-4 font-display text-sm sm:text-base font-semibold tracking-wide text-white/95">
          {label}
        </p>

        {/* Subtle Cancel Action when cancellable */}
        {canCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mt-5 h-8 sm:h-9 px-4 rounded-full border border-white/20 bg-white/8 hover:bg-white/16 text-white/90 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF3D8A]"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
            <span>ยกเลิก</span>
          </button>
        )}
      </div>
    </div>
  );
}
