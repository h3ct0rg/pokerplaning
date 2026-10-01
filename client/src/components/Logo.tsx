import { useId } from 'react';

interface Props {
  size?: number;
  withText?: boolean;
}

/** Logo "Poker Planning" (designs/poker_planning_logo). */
export function Logo({ size = 32, withText = true }: Props) {
  const gradId = `pp-grad-${useId().replace(/:/g, '')}`;
  return (
    <span className="logo">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect x="10" y="14" width="52" height="74" rx="10" transform="rotate(-10 36 51)" fill="#1E293B" stroke="#475569" strokeWidth="3" />
        <rect x="38" y="12" width="52" height="74" rx="10" fill={`url(#${gradId})`} stroke="#818CF8" strokeWidth="2.5" />
        <text x="64" y="58" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" textAnchor="middle">
          ♠
        </text>
        <circle cx="28" cy="38" r="4" fill="#6366F1" />
      </svg>
      {withText && <span className="logo-text">Poker Planning</span>}
    </span>
  );
}
