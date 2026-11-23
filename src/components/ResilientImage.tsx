import { useState } from 'react';
import { Film } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  loading?: 'eager' | 'lazy';
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  loading = 'eager',
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-rose-100 via-pink-50 to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-rose-950/40 text-rose-500 dark:text-rose-400 p-4 text-center ${className}`}
      >
        <Film className="w-8 h-8 mb-2 opacity-80" aria-hidden="true" />
        {fallbackTitle && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
