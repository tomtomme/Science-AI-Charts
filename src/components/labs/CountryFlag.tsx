import React from 'react';

interface CountryFlagProps {
  country: string;
  fallbackEmoji?: string;
  size?: 'sm' | 'md';
  className?: string;
}

function resolveCountryCode(country: string, fallbackEmoji?: string): string {
  const c = (country || '').toLowerCase().trim();
  const f = (fallbackEmoji || '').trim();

  if (c.includes('america') || c === 'us' || c === 'usa' || c.includes('united states') || f === '🇺🇸') return 'US';
  if (c.includes('china') || c === 'cn' || c === 'prc' || f === '🇨🇳') return 'CN';
  if (c.includes('canada') || c === 'ca' || f === '🇨🇦') return 'CA';
  if (c.includes('france') || c.includes('french') || c === 'fr' || f === '🇫🇷') return 'FR';
  if (c.includes('israel') || c === 'il' || f === '🇮🇱') return 'IL';
  if (c.includes('singapor') || c.includes('singapur') || c === 'sg' || f === '🇸🇬') return 'SG';
  if (c.includes('korea') || c === 'kr' || f === '🇰🇷') return 'KR';
  if (c === 'uae' || c.includes('emirates') || c === 'ae' || f === '🇦🇪') return 'AE';
  if (c.includes('japan') || c === 'jp' || f === '🇯🇵') return 'JP';
  if (c.includes('saudi') || c === 'sa' || f === '🇸🇦') return 'SA';
  if (c.includes('spain') || c.includes('spanien') || c === 'es' || f === '🇪🇸') return 'ES';
  if (c.includes('india') || c.includes('indien') || c === 'in' || f === '🇮🇳') return 'IN';
  if (c.includes('german') || c.includes('deutsch') || c === 'de' || f === '🇩🇪') return 'DE';
  if (c === 'uk' || c.includes('united kingdom') || c.includes('britain') || c === 'gb' || f === '🇬🇧') return 'GB';
  return '';
}

/**
 * Crisp cross-platform SVG country flag icon (renders reliably on Windows, macOS, Linux, iOS, Android)
 * with graceful fallback to the country emoji for any unlisted region.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  country,
  fallbackEmoji = '🌐',
  size = 'md',
  className = '',
}) => {
  const code = resolveCountryCode(country, fallbackEmoji);
  const dims = size === 'sm' ? 'w-4 h-3' : 'w-5 h-3.5';
  const baseClass = `${dims} inline-block shrink-0 rounded-[2px] shadow-[0_0_0_1px_rgba(15,23,42,0.12)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.18)] overflow-hidden ${className}`;

  switch (code) {
    case 'US':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <rect y="0" width="28" height="1.54" fill="#B22234" />
          <rect y="3.08" width="28" height="1.54" fill="#B22234" />
          <rect y="6.15" width="28" height="1.54" fill="#B22234" />
          <rect y="9.23" width="28" height="1.54" fill="#B22234" />
          <rect y="12.31" width="28" height="1.54" fill="#B22234" />
          <rect y="15.38" width="28" height="1.54" fill="#B22234" />
          <rect y="18.46" width="28" height="1.54" fill="#B22234" />
          <rect width="12" height="10.77" fill="#3C3B6E" />
          <g fill="#FFFFFF">
            <circle cx="2.2" cy="2" r="0.65" />
            <circle cx="4.8" cy="2" r="0.65" />
            <circle cx="7.4" cy="2" r="0.65" />
            <circle cx="10" cy="2" r="0.65" />
            <circle cx="3.5" cy="4.1" r="0.65" />
            <circle cx="6.1" cy="4.1" r="0.65" />
            <circle cx="8.7" cy="4.1" r="0.65" />
            <circle cx="2.2" cy="6.2" r="0.65" />
            <circle cx="4.8" cy="6.2" r="0.65" />
            <circle cx="7.4" cy="6.2" r="0.65" />
            <circle cx="10" cy="6.2" r="0.65" />
            <circle cx="3.5" cy="8.3" r="0.65" />
            <circle cx="6.1" cy="8.3" r="0.65" />
            <circle cx="8.7" cy="8.3" r="0.65" />
          </g>
        </svg>
      );

    case 'CN':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#DE2910" />
          <polygon
            fill="#FFDE00"
            points="5.5,2.4 6.2,4.6 8.5,4.6 6.6,5.9 7.3,8.1 5.5,6.8 3.7,8.1 4.4,5.9 2.5,4.6 4.8,4.6"
          />
          <circle cx="10.5" cy="2.6" r="0.85" fill="#FFDE00" />
          <circle cx="12.2" cy="4.4" r="0.85" fill="#FFDE00" />
          <circle cx="12.2" cy="6.9" r="0.85" fill="#FFDE00" />
          <circle cx="10.5" cy="8.7" r="0.85" fill="#FFDE00" />
        </svg>
      );

    case 'CA':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <rect x="0" width="7" height="20" fill="#D80621" />
          <rect x="21" width="7" height="20" fill="#D80621" />
          <path
            fill="#D80621"
            d="M14 4.2l1 2.7 2.2-.8-.8 2.2 2.2 1.2-1.4 1.3.4 1.7-2.6-.5v2.6h-2v-2.6l-2.6.5.4-1.7-1.4-1.3 2.2-1.2-.8-2.2 2.2.8z"
          />
        </svg>
      );

    case 'FR':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect x="0" width="9.34" height="20" fill="#002395" />
          <rect x="9.34" width="9.32" height="20" fill="#FFFFFF" />
          <rect x="18.66" width="9.34" height="20" fill="#ED2939" />
        </svg>
      );

    case 'IL':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <rect y="2.2" width="28" height="2.6" fill="#0038B8" />
          <rect y="15.2" width="28" height="2.6" fill="#0038B8" />
          <polygon
            points="14,6.4 17.1,11.8 10.9,11.8"
            fill="none"
            stroke="#0038B8"
            strokeWidth="1.15"
          />
          <polygon
            points="14,13.6 17.1,8.2 10.9,8.2"
            fill="none"
            stroke="#0038B8"
            strokeWidth="1.15"
          />
        </svg>
      );

    case 'SG':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="10" fill="#EF3340" />
          <rect y="10" width="28" height="10" fill="#FFFFFF" />
          <circle cx="6.2" cy="5" r="3.2" fill="#FFFFFF" />
          <circle cx="7.4" cy="5" r="2.7" fill="#EF3340" />
          <g fill="#FFFFFF">
            <circle cx="9.6" cy="3.1" r="0.65" />
            <circle cx="11.2" cy="4.4" r="0.65" />
            <circle cx="10.6" cy="6.4" r="0.65" />
            <circle cx="8.6" cy="6.4" r="0.65" />
            <circle cx="8.1" cy="4.4" r="0.65" />
          </g>
        </svg>
      );

    case 'KR':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <g stroke="#111827" strokeWidth="1.15">
            <line x1="4" y1="6" x2="7.5" y2="3" />
            <line x1="5.2" y1="7.3" x2="8.7" y2="4.3" />
            <line x1="20.5" y1="3" x2="24" y2="6" />
            <line x1="19.3" y1="4.3" x2="22.8" y2="7.3" />
            <line x1="4" y1="14" x2="7.5" y2="17" />
            <line x1="5.2" y1="12.7" x2="8.7" y2="15.7" />
            <line x1="20.5" y1="17" x2="24" y2="14" />
            <line x1="19.3" y1="15.7" x2="22.8" y2="12.7" />
          </g>
          <path d="M14,5.4 A4.6,4.6 0 0,1 18.6,10 A2.3,2.3 0 0,1 14,10 A2.3,2.3 0 0,0 9.4,10 A4.6,4.6 0 0,1 14,5.4 Z" fill="#CD2E3A" />
          <path d="M14,14.6 A4.6,4.6 0 0,1 9.4,10 A2.3,2.3 0 0,1 14,10 A2.3,2.3 0 0,0 18.6,10 A4.6,4.6 0 0,1 14,14.6 Z" fill="#0047A0" />
        </svg>
      );

    case 'AE':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect x="7" y="0" width="21" height="6.67" fill="#00732F" />
          <rect x="7" y="6.67" width="21" height="6.66" fill="#FFFFFF" />
          <rect x="7" y="13.33" width="21" height="6.67" fill="#111827" />
          <rect x="0" y="0" width="7.2" height="20" fill="#FF0000" />
        </svg>
      );

    case 'JP':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#FFFFFF" />
          <circle cx="14" cy="10" r="5.5" fill="#BC002D" />
        </svg>
      );

    case 'SA':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#006C35" />
          <rect x="6" y="7" width="16" height="2.2" rx="1" fill="#FFFFFF" opacity="0.92" />
          <rect x="8.5" y="10.2" width="11" height="1.4" rx="0.7" fill="#FFFFFF" opacity="0.88" />
          <rect x="6.5" y="13.2" width="15" height="1.3" rx="0.65" fill="#FFFFFF" />
        </svg>
      );

    case 'ES':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="5" fill="#AA151B" />
          <rect y="5" width="28" height="10" fill="#F1BF00" />
          <rect y="15" width="28" height="5" fill="#AA151B" />
          <rect x="7.5" y="7.4" width="3.2" height="5.2" rx="0.6" fill="#AA151B" />
        </svg>
      );

    case 'IN':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="6.67" fill="#FF9933" />
          <rect y="6.67" width="28" height="6.66" fill="#FFFFFF" />
          <rect y="13.33" width="28" height="6.67" fill="#138808" />
          <circle cx="14" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="1" />
          <circle cx="14" cy="10" r="0.65" fill="#000080" />
        </svg>
      );

    case 'DE':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="6.67" fill="#111827" />
          <rect y="6.67" width="28" height="6.66" fill="#DD0000" />
          <rect y="13.33" width="28" height="6.67" fill="#FFCE00" />
        </svg>
      );

    case 'GB':
      return (
        <svg viewBox="0 0 28 20" className={baseClass} role="img" aria-label={country}>
          <rect width="28" height="20" fill="#012169" />
          <path d="M0,0 L28,20 M28,0 L0,20" stroke="#FFFFFF" strokeWidth="3.6" />
          <path d="M0,0 L28,20 M28,0 L0,20" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M14,0 V20 M0,10 H28" stroke="#FFFFFF" strokeWidth="5.4" />
          <path d="M14,0 V20 M0,10 H28" stroke="#C8102E" strokeWidth="3.2" />
        </svg>
      );

    default:
      return (
        <span
          className={`${size === 'sm' ? 'text-xs' : 'text-xl'} leading-none shrink-0 ${className}`}
          title={country}
        >
          {fallbackEmoji || '🌐'}
        </span>
      );
  }
};
