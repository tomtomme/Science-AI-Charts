import React from 'react';
import { Globe } from 'lucide-react';
import { SheetAuthorMeta } from '../types';
import { Language } from '../utils/i18n';

interface AuthorSocialSubtitleProps {
  authorMeta?: SheetAuthorMeta;
  lang: Language;
}

const SocialBrandIcon: React.FC<{ label: string }> = ({ label }) => {
  const key = label.toLowerCase().trim();

  if (key.includes('youtube')) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-[#DC2626] dark:text-[#F87171]"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
        />
        <path fill="#ffffff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    );
  }

  if (key.includes('github')) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-slate-900 dark:text-slate-100"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
      </svg>
    );
  }

  if (key.includes('orcid')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-[18px] sm:h-[18px]" aria-hidden="true">
        <circle cx="12" cy="12" r="11" className="fill-[#65A30D] dark:fill-[#84CC16]" />
        <path
          fill="#ffffff"
          d="M8.6 17.2H7V8.4h1.6v8.8zm-.8-10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3.2 1.2h3.4c3.2 0 4.8 2.1 4.8 4.4 0 2.5-1.7 4.4-4.9 4.4H11V8.4zm1.6 1.4v6h1.7c2.3 0 3.3-1.4 3.3-3 0-1.7-1.1-3-3.3-3h-1.7z"
        />
      </svg>
    );
  }

  if (key.includes('zotero')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-[18px] sm:h-[18px]" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="4.5"
          className="fill-[#B91C1C] dark:fill-[#EF4444]"
        />
        <path
          fill="#ffffff"
          d="M7.2 7h9.6v2.1l-6.4 6.1h6.5v2.3H7v-2.1l6.4-6.1H7.2V7z"
        />
      </svg>
    );
  }

  if (key.includes('scholar')) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-[#1D4ED8] dark:text-[#60A5FA]"
        aria-hidden="true"
      >
        <path fill="currentColor" d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z" />
        <path
          fill="currentColor"
          d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"
        />
      </svg>
    );
  }

  if (key.includes('researchgate')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-[18px] sm:h-[18px]" aria-hidden="true">
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="4.5"
          className="fill-[#0F766E] dark:fill-[#14B8A6]"
        />
        <text
          x="12"
          y="16.2"
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="800"
          fontFamily="var(--font-sans)"
          fill="#ffffff"
        >
          RG
        </text>
      </svg>
    );
  }

  if (key.includes('linkedin')) {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-[#0A66C2] dark:text-[#60A5FA]" fill="currentColor" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
      </svg>
    );
  }

  if (key === 'x' || key.includes('twitter')) {
    return (
      <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-slate-900 dark:text-slate-100" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }

  return <Globe className="w-5 h-5 sm:w-[18px] sm:h-[18px] text-slate-700 dark:text-slate-300" aria-hidden="true" />;
};

export const AuthorSocialSubtitle: React.FC<AuthorSocialSubtitleProps> = ({
  authorMeta,
  lang,
}) => {
  if (!authorMeta) return null;

  const segments =
    lang === 'de' ? authorMeta.headlineSegmentsDe : authorMeta.headlineSegmentsEn;
  const fallbackPrefix = lang === 'de' ? authorMeta.prefixDe : authorMeta.prefixEn;

  return (
    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs leading-tight text-slate-700 dark:text-slate-300">
      <span className="font-sans">
        {segments && segments.length > 0 ? (
          segments.map((seg, idx) =>
            seg.url ? (
              <a
                key={`${seg.text}-${idx}`}
                href={seg.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-900 dark:text-slate-100 underline decoration-slate-400 dark:decoration-slate-500 underline-offset-2 hover:text-blue-600 dark:hover:text-blue-400 hover:decoration-blue-600 dark:hover:decoration-blue-400 transition-colors"
              >
                {seg.text}
              </a>
            ) : (
              <React.Fragment key={`${seg.text}-${idx}`}>{seg.text}</React.Fragment>
            )
          )
        ) : (
          fallbackPrefix && <span>{fallbackPrefix}</span>
        )}
        {authorMeta.authorName && (
          <>
            {(segments && segments.length > 0) || fallbackPrefix ? ' ' : ''}
            <span className="font-semibold text-slate-950 dark:text-white">
              {authorMeta.authorName}
            </span>
          </>
        )}
      </span>

      {authorMeta.links.length > 0 && (
        <div
          className="inline-flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-1.5"
          role="group"
          aria-label={
            lang === 'de'
              ? `Profile von ${authorMeta.authorName || 'Thomas Langkamp'}`
              : `${authorMeta.authorName || 'Thomas Langkamp'} profiles`
          }
        >
          {authorMeta.links.map((link) => (
            <a
              key={`${link.label}-${link.url}`}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={`${authorMeta.authorName || 'Thomas Langkamp'} – ${link.label}`}
              className="inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 shadow-2xs transition-all hover:scale-105 focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
            >
              <SocialBrandIcon label={link.label} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
