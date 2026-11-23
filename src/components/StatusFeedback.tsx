import { AlertCircle, Ban, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { StatusNotice } from '../types/series';

interface StatusToastProps {
  notice: StatusNotice | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

export function StatusToast({ notice, onDismiss, onRetry }: StatusToastProps) {
  if (!notice) return null;

  const isError = notice.status === 'error';
  const isCancelled = notice.status === 'cancelled';

  const containerStyle = isError
    ? 'bg-rose-50/98 dark:bg-rose-950/95 border-rose-300 dark:border-rose-700 text-rose-950 dark:text-rose-100'
    : isCancelled
    ? 'bg-amber-50/98 dark:bg-amber-950/95 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100'
    : 'bg-white/98 dark:bg-slate-900/98 border-rose-200 dark:border-rose-800 text-slate-900 dark:text-white';

  const Icon = isError ? AlertCircle : isCancelled ? Ban : CheckCircle2;
  const iconColor = isError
    ? 'text-rose-600 dark:text-rose-400'
    : isCancelled
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      data-testid="status-toast"
      data-status={notice.status}
      className="fixed bottom-[74px] md:bottom-6 inset-x-3 sm:left-auto sm:right-6 z-50 sm:max-w-sm pointer-events-auto"
    >
      <div
        className={`rounded-2xl border shadow-xl backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-start gap-2.5 ${containerStyle}`}
      >
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold leading-snug">{notice.title}</p>
          {notice.detail && (
            <p className="text-[11px] sm:text-xs opacity-85 mt-0.5 leading-snug">
              {notice.detail}
            </p>
          )}
          {notice.canRetry && onRetry && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="h-7 px-3 rounded-full bg-[#FF1E6E] hover:bg-[#E6005C] text-white text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" aria-hidden="true" />
                <span>ลองใหม่อีกครั้ง</span>
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="h-7 px-2.5 rounded-full bg-black/5 dark:bg-white/10 text-[11px] font-semibold cursor-pointer"
              >
                ปิด
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="ปิดการแจ้งเตือน"
          className="w-6 h-6 rounded-full hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface RequestFallbackCardProps {
  status: 'error' | 'cancelled';
  message: string;
  onRetry: () => void;
  onCancel?: () => void;
}

export function RequestFallbackCard({
  status,
  message,
  onRetry,
  onCancel,
}: RequestFallbackCardProps) {
  const isError = status === 'error';
  return (
    <div
      role={isError ? 'alert' : 'status'}
      data-testid="request-fallback-card"
      data-status={status}
      className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl border border-rose-200/80 dark:border-rose-900/50 p-6 sm:p-10 text-center space-y-3 shadow-sm"
    >
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-full flex items-center justify-center ${
          isError
            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600'
            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600'
        }`}
      >
        {isError ? (
          <AlertCircle className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
        ) : (
          <Ban className="w-6 h-6 sm:w-7 sm:h-7" aria-hidden="true" />
        )}
      </div>

      <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
        {isError ? 'โหลดข้อมูลไม่สำเร็จ' : 'ยกเลิกรายการแล้ว'}
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        {message}
      </p>

      <div className="pt-1 flex items-center justify-center gap-2.5 flex-wrap">
        <button
          type="button"
          onClick={onRetry}
          className="h-9 px-5 rounded-full bg-gradient-to-r from-[#FF2A7A] to-[#E6005C] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            กลับหน้าหลัก
          </button>
        )}
      </div>
    </div>
  );
}
