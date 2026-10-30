import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  title?: React.ReactNode;
  badge?: React.ReactNode;
  position?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
  width?: string;
  delay?: number; // open delay in ms (default: 80ms)
  closeDelay?: number; // grace period in ms before closing (default: 280ms)
  disabled?: boolean;
  className?: string;
  popupClassName?: string;
}

/**
 * Unified accessible tooltip & popover component with:
 * 1. Safe closing grace period (280ms) so moving the pointer toward links never loses hover.
 * 2. Ample vertical clearance (mt-2.5 / mb-2.5) ensuring the cursor never covers or obscures text.
 * 3. Invisible hover-bridge preventing premature close across any gap.
 * 4. High z-index (z-50) and sleek dark glassmorphism styling unified across all 4 tabs.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  title,
  badge,
  position = 'bottom',
  align = 'center',
  width = 'w-64',
  delay = 80,
  closeDelay = 280,
  disabled = false,
  className = '',
  popupClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!isOpen && openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        setIsOpen(true);
        openTimerRef.current = null;
      }, delay);
    }
  };

  const handleMouseLeave = () => {
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (closeTimerRef.current === null) {
      closeTimerRef.current = window.setTimeout(() => {
        setIsOpen(false);
        closeTimerRef.current = null;
      }, closeDelay);
    }
  };

  const handleTooltipMouseEnter = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  // Alignment classes for positioning
  let alignClass = 'left-1/2 -translate-x-1/2';
  let arrowAlignClass = 'left-1/2 -translate-x-1/2';
  if (align === 'left') {
    alignClass = 'left-0';
    arrowAlignClass = 'left-4';
  } else if (align === 'right') {
    alignClass = 'right-0';
    arrowAlignClass = 'right-4';
  }

  // Vertical position classes
  const positionClass =
    position === 'bottom'
      ? 'top-full mt-2.5 sm:mt-3'
      : 'bottom-full mb-2.5 sm:mb-3';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && !disabled && (
        <div
          role="tooltip"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`absolute ${positionClass} ${alignClass} ${width} max-w-[90vw] p-3 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md z-50 text-left text-xs whitespace-normal break-words pointer-events-auto transition-all animate-in fade-in-0 zoom-in-95 duration-150 ${popupClassName}`}
        >
          {/* Hover bridge spanning the vertical gap between trigger and popover */}
          {position === 'bottom' ? (
            <div className="absolute -top-3.5 left-0 right-0 h-3.5 bg-transparent pointer-events-auto" />
          ) : (
            <div className="absolute -bottom-3.5 left-0 right-0 h-3.5 bg-transparent pointer-events-auto" />
          )}

          {/* Pointer indicator arrow */}
          {position === 'bottom' ? (
            <div
              className={`absolute -top-1.5 ${arrowAlignClass} w-3 h-3 rotate-45 bg-slate-900 dark:bg-slate-950 border-t border-l border-slate-700/80 pointer-events-none`}
            />
          ) : (
            <div
              className={`absolute -bottom-1.5 ${arrowAlignClass} w-3 h-3 rotate-45 bg-slate-900 dark:bg-slate-950 border-b border-r border-slate-700/80 pointer-events-none`}
            />
          )}

          {/* Optional Title Bar with Badge */}
          {(title || badge) && (
            <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-800">
              {title && <div className="font-bold text-xs text-slate-100 whitespace-normal break-words">{title}</div>}
              {badge && (
                <div className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                  {badge}
                </div>
              )}
            </div>
          )}

          {/* Body Content */}
          <div className="text-[11px] font-normal leading-relaxed text-slate-300 whitespace-normal break-words">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
