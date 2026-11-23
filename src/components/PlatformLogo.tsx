import { useId } from 'react';
import { PlatformId } from '../types/series';

interface PlatformLogoProps {
  platformId: Exclude<PlatformId, 'all'>;
  active?: boolean;
  className?: string;
}

export function PlatformLogo({
  platformId,
  active = false,
  className = 'h-[18px] w-auto',
}: PlatformLogoProps) {
  const uid = useId().replace(/:/g, '');

  switch (platformId) {
    case 'netflix':
      return (
        <svg
          viewBox="0 0 512 138"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          <g>
            <path
              d="M340.657183,0 L340.657183,100.203061 C353.016406,100.778079 365.344207,101.473198 377.637095,102.293306 L377.637095,123.537553 C358.204486,122.242243 338.690182,121.253471 319.094879,120.57923 L319.094879,0 L340.657183,0 Z M512,0.0118710746 L483.922918,65.1060972 L511.993017,137.54371 L511.961595,137.557485 C503.784957,136.3909 495.597845,135.289637 487.386294,134.233936 L471.623048,93.5776798 L455.709676,130.459835 C448.168455,129.627123 440.61676,128.839275 433.047609,128.100899 L460.419447,64.6708546 L435.351871,0.0118710746 L458.677285,0.0118710746 L472.712335,36.1957639 L488.318473,0.0118710746 L512,0.0118710746 Z M245.093161,119.526252 L245.092462,0.0114869428 L305.282574,0.0114869428 L305.282574,21.4467074 L266.654767,21.4467074 L266.654767,49.2277266 L295.881884,49.2277266 L295.881884,70.4719734 L266.654767,70.4719734 L266.654767,119.521329 L245.093161,119.526252 Z M164.580156,21.448488 L164.579458,0.0103695593 L231.270382,0.0103695593 L231.270382,21.4469875 L208.705375,21.4469875 L208.705375,120.107799 C201.508397,120.296154 194.3191,120.519389 187.144466,120.790104 L187.144466,21.448488 L164.580156,21.448488 Z M90.8682168,126.966224 L90.8682168,0.0139657936 L150.758077,0.0139657936 L150.758077,21.4491862 L112.42703,21.4491862 L112.42703,50.4849807 C121.233151,50.3722116 133.754021,50.2444297 141.543822,50.2632828 L141.543822,71.5092753 C131.792954,71.388127 120.786264,71.6429923 112.42703,71.7264345 L112.42703,103.88974 C125.166805,102.887736 137.944984,102.011069 150.758077,101.270912 L150.758077,122.517253 C130.704017,123.672422 110.740031,125.160591 90.8682168,126.966224 Z M48.5710466,77.8540254 L48.5696502,0.0104745953 L70.1319549,0.0104745953 L70.1319549,128.968837 C62.2496338,129.779728 54.3823252,130.642465 46.5286328,131.553346 L21.5609083,59.8244682 L21.5609083,134.625696 C14.3597408,135.563565 7.17323695,136.54141 0,137.562338 L0,0.0118710746 L20.4911722,0.0118710746 L48.5710466,77.8540254 Z M395.425298,124.819071 L395.425298,124.819211 L395.425298,0.0120101224 L416.987603,0.0120101224 L416.987603,126.599777 C409.809478,125.960833 402.624371,125.369895 395.425298,124.819071 Z"
              fill={active ? '#FFFFFF' : '#DB202C'}
              fillRule="nonzero"
            />
          </g>
        </svg>
      );

    case 'bilibili': {
      const color = active ? '#FFFFFF' : '#00A1D6';
      return (
        <svg
          viewBox="0 0 116 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          {/* Iconic Bilibili TV mascot icon */}
          <path
            d="M7.5 3.5L12.5 8.5M23.5 3.5L18.5 8.5"
            stroke={color}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <rect
            x="2.5"
            y="8.5"
            width="26"
            height="19.5"
            rx="5"
            fill="none"
            stroke={color}
            strokeWidth="2.5"
          />
          <path
            d="M9.5 16.5L12.8 18.2M21.5 16.5L18.2 18.2"
            stroke={color}
            strokeWidth="2.3"
            strokeLinecap="round"
          />
          <path
            d="M13.5 22.3C14.7 23.4 16.3 23.4 17.5 22.3"
            fill="none"
            stroke={color}
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <text
            x="35"
            y="23.5"
            fill={color}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="21"
            fontWeight="800"
            letterSpacing="-0.5"
          >
            bilibili
          </text>
        </svg>
      );
    }

    case 'dramabox': {
      const gradId = `db-grad-${uid}`;
      return (
        <svg
          viewBox="0 0 144 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={active ? '#FFFFFF' : '#FF2D78'} />
              <stop offset="100%" stopColor={active ? '#FFE4EF' : '#FF6A2B'} />
            </linearGradient>
          </defs>
          <rect x="1.5" y="3" width="26" height="26" rx="7" fill={`url(#${gradId})`} />
          <path
            d="M11 10.2C11 9.4 11.9 8.9 12.6 9.3L21.2 15.1C21.8 15.5 21.8 16.5 21.2 16.9L12.6 22.7C11.9 23.1 11 22.6 11 21.8V10.2Z"
            fill={active ? '#FF1E6E' : '#FFFFFF'}
          />
          <text
            x="34"
            y="22.5"
            fill={active ? '#FFFFFF' : 'currentColor'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="18.5"
            fontWeight="800"
            letterSpacing="-0.5"
          >
            Drama
            <tspan fill={active ? '#FFFFFF' : '#FF2D78'}>Box</tspan>
          </text>
        </svg>
      );
    }

    case 'wetv':
      return (
        <svg
          viewBox="0 0 106 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          {/* Iconic WeTV overlapping tricolor play triangles */}
          <path
            d="M4 5.5C4 3.9 5.7 2.9 7.1 3.7L24.5 13.8C25.8 14.6 25.8 16.5 24.5 17.3L7.1 27.4C5.7 28.2 4 27.2 4 25.6V5.5Z"
            fill={active ? 'rgba(255,255,255,0.45)' : '#00A8FF'}
          />
          <path
            d="M4 14.2L19.8 11.1L24.5 13.8C25.8 14.6 25.8 16.5 24.5 17.3L7.1 27.4C5.7 28.2 4 27.2 4 25.6V14.2Z"
            fill={active ? 'rgba(255,255,255,0.72)' : '#2ED573'}
          />
          <path
            d="M11.5 9.8L24.5 13.8C25.8 14.6 25.8 16.5 24.5 17.3L12.5 24.2L11.5 9.8Z"
            fill={active ? '#FFFFFF' : '#FF8A00'}
          />
          <path d="M10.5 11.8L18.2 15.8L10.5 19.8V11.8Z" fill={active ? '#FF1E6E' : '#FFFFFF'} />
          <text
            x="32"
            y="22.8"
            fill={active ? '#FFFFFF' : 'currentColor'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="19.5"
            fontWeight="800"
            letterSpacing="-0.5"
          >
            WeTV
          </text>
        </svg>
      );

    case 'iqiyi':
      return (
        <svg
          viewBox="0 0 92 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          <rect
            x="1"
            y="3"
            width="90"
            height="26"
            rx="6.5"
            fill={active ? '#FFFFFF' : '#00BE06'}
          />
          <text
            x="46"
            y="22.5"
            textAnchor="middle"
            fill={active ? '#00BE06' : '#FFFFFF'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="18.5"
            fontWeight="900"
            letterSpacing="0.4"
          >
            iQIYI
          </text>
        </svg>
      );

    case 'reelshort':
      return (
        <svg
          viewBox="0 0 138 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          <rect
            x="1.5"
            y="3"
            width="26"
            height="26"
            rx="6.5"
            fill={active ? '#FFFFFF' : '#F23051'}
          />
          {/* Stylized R + Play mark */}
          <path
            d="M9 9.5H16.2C19.1 9.5 21 11.1 21 13.7C21 15.6 19.9 17 18.1 17.5L21.3 22.5H17.3L14.6 18H12.4V22.5H9V9.5ZM12.4 12.2V15.3H15.6C16.9 15.3 17.6 14.7 17.6 13.75C17.6 12.8 16.9 12.2 15.6 12.2H12.4Z"
            fill={active ? '#F23051' : '#FFFFFF'}
          />
          <text
            x="34"
            y="22.5"
            fill={active ? '#FFFFFF' : 'currentColor'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="18.5"
            fontWeight="800"
            letterSpacing="-0.4"
          >
            Reel
            <tspan fill={active ? '#FFFFFF' : '#F23051'}>Short</tspan>
          </text>
        </svg>
      );

    case 'disney': {
      const blue = active ? '#FFFFFF' : '#113CCF';
      return (
        <svg
          viewBox="0 0 112 36"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          {/* Iconic Disney+ sweeping magic arc */}
          <path
            d="M12 14.5C31 1.5 68 0.5 92 12.5"
            fill="none"
            stroke={active ? '#FFFFFF' : '#0063E5'}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <text
            x="8"
            y="28.5"
            fill={blue}
            fontFamily="'Georgia', 'Times New Roman', serif"
            fontSize="22"
            fontWeight="700"
            fontStyle="italic"
            letterSpacing="-0.5"
          >
            Disney
          </text>
          <path
            d="M97 15.5V27.5M91 21.5H103"
            stroke={active ? '#FFFFFF' : '#0063E5'}
            strokeWidth="2.8"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    case 'youtube':
      return (
        <svg
          viewBox="0 0 128 32"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          {/* Official YouTube Play Button */}
          <path
            d="M31.3 9.2C30.9 7.8 29.8 6.7 28.4 6.3C25.8 5.6 16 5.6 16 5.6C16 5.6 6.2 5.6 3.6 6.3C2.2 6.7 1.1 7.8 0.7 9.2C0 11.8 0 16 0 16C0 16 0 20.2 0.7 22.8C1.1 24.2 2.2 25.3 3.6 25.7C6.2 26.4 16 26.4 16 26.4C16 26.4 25.8 26.4 28.4 25.7C29.8 25.3 30.9 24.2 31.3 22.8C32 20.2 32 16 32 16C32 16 32 11.8 31.3 9.2Z"
            fill={active ? '#FFFFFF' : '#FF0000'}
          />
          <path
            d="M12.8 20.5V11.5L21 16L12.8 20.5Z"
            fill={active ? '#FF0000' : '#FFFFFF'}
          />
          <text
            x="38"
            y="22.8"
            fill={active ? '#FFFFFF' : 'currentColor'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="19"
            fontWeight="800"
            letterSpacing="-0.8"
          >
            YouTube
          </text>
        </svg>
      );

    case 'prime': {
      const cyan = active ? '#FFFFFF' : '#00A8E1';
      return (
        <svg
          viewBox="0 0 124 36"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
          className={className}
        >
          <text
            x="62"
            y="19"
            textAnchor="middle"
            fill={active ? '#FFFFFF' : 'currentColor'}
            fontFamily="'Plus Jakarta Sans', 'Prompt', system-ui, sans-serif"
            fontSize="17"
            fontWeight="800"
            letterSpacing="-0.4"
          >
            <tspan fill={cyan}>prime</tspan> video
          </text>
          {/* Iconic Amazon Prime smile arrow */}
          <path
            d="M24 24.5C45 33.5 79 33.5 100 24.5"
            fill="none"
            stroke={cyan}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M95.5 23L102 24L99 29.8"
            fill="none"
            stroke={cyan}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
  }
}
