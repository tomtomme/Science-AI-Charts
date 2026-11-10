import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
 * 1. React Portal into document.body to ensure popups are NEVER clipped by parent overflow-hidden or overflow-x-auto.
 * 2. Collision-aware positioning: automatically flips above if space below viewport is limited.
 * 3. Ample vertical clearance (12px gap) ensuring the mouse cursor NEVER covers or obscures popup content.
 * 4. Safe closing grace period (280ms) so moving the pointer toward links never loses hover.
 * 5. High z-index (z-[9999]) and sleek dark glassmorphism styling unified across all 4 tabs.
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
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPosition: 'top' | 'bottom';
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Estimate popup height (~170px for rich card) or measure if available
    const measuredHeight = popupRef.current?.offsetHeight || 170;

    let actualPosition: 'top' | 'bottom' = position;
    if (position === 'bottom' && spaceBelow < measuredHeight + 15 && spaceAbove > spaceBelow) {
      actualPosition = 'top';
    } else if (position === 'top' && spaceAbove < measuredHeight + 15 && spaceBelow > spaceAbove) {
      actualPosition = 'bottom';
    }

    let top = 0;
    if (actualPosition === 'bottom') {
      top = rect.bottom + 12; // 12px vertical clearance: cursor never covers popup
    } else {
      top = rect.top - 12 - measuredHeight;
    }

    let left = rect.left + rect.width / 2;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'right') {
      left = rect.right;
    }

    // Keep horizontally within viewport bounds with padding
    const halfWidth = 144; // approx half of w-72 (288px)
    if (align === 'center') {
      if (left - halfWidth < 12) {
        left = halfWidth + 12;
      } else if (left + halfWidth > window.innerWidth - 12) {
        left = window.innerWidth - halfWidth - 12;
      }
    }

    setCoords({
      top: Math.max(10, top),
      left,
      actualPosition,
    });
  }, [position, align]);

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

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (!isOpen && openTimerRef.current === null) {
      openTimerRef.current = window.setTimeout(() => {
        updatePosition();
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

  let alignClass = '-translate-x-1/2';
  let arrowAlignClass = 'left-1/2 -translate-x-1/2';
  if (align === 'left') {
    alignClass = 'translate-x-0';
    arrowAlignClass = 'left-4';
  } else if (align === 'right') {
    alignClass = '-translate-x-full';
    arrowAlignClass = 'right-4';
  }

  const actualPosition = coords?.actualPosition || position;

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && !disabled && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className={`fixed ${alignClass} ${width} max-w-[92vw] p-3 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md text-left text-xs whitespace-normal break-words pointer-events-auto transition-opacity animate-in fade-in-0 zoom-in-95 duration-150 ${popupClassName}`}
          >
            {/* Hover bridge spanning the gap between trigger and popover */}
            {actualPosition === 'bottom' ? (
              <div className="absolute -top-3.5 left-0 right-0 h-3.5 bg-transparent pointer-events-auto" />
            ) : (
              <div className="absolute -bottom-3.5 left-0 right-0 h-3.5 bg-transparent pointer-events-auto" />
            )}

            {/* Pointer indicator arrow */}
            {actualPosition === 'bottom' ? (
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
                {title && <div className="font-bold text-sm text-slate-100 whitespace-normal break-words flex-1 min-w-0">{title}</div>}
                {badge && (
                  <div className="shrink-0 max-w-[55%]">
                    {React.isValidElement(badge) ? (
                      badge
                    ) : (
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 block truncate">
                        {badge}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Body Content */}
            <div className="text-xs font-normal leading-relaxed text-slate-300 whitespace-normal break-words">
              {content}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
