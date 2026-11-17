import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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
  closeDelay?: number; // grace period in ms before closing (default: 300ms)
  disabled?: boolean;
  className?: string;
  popupClassName?: string;
}

/**
 * Unified accessible tooltip & popover component with:
 * 1. React Portal into document.body to ensure popups are NEVER clipped by parent overflow-hidden or overflow-x-auto.
 * 2. Collision-aware positioning measured in useLayoutEffect so the popup never flickers or overlaps the cursor.
 * 3. Exact 12px vertical clearance and hover bridge matching the gap without overlapping the trigger element.
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
  closeDelay = 300,
  disabled = false,
  className = '',
  popupClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const pointerOnTriggerRef = useRef(false);
  const pointerOnPopupRef = useRef(false);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPosition: 'top' | 'bottom';
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;

    const measuredHeight = popupRef.current?.offsetHeight || 200;

    let actualPosition: 'top' | 'bottom' = position;
    if (position === 'bottom' && spaceBelow < measuredHeight + 8 && spaceAbove > spaceBelow) {
      actualPosition = 'top';
    } else if (position === 'top' && spaceAbove < measuredHeight + 8 && spaceBelow > spaceAbove) {
      actualPosition = 'bottom';
    }

    let top = 0;
    if (actualPosition === 'bottom') {
      top = rect.bottom + 12;
    } else {
      top = Math.max(8, rect.top - 12 - measuredHeight);
    }

    let left = rect.left + rect.width / 2;
    if (align === 'left') {
      left = rect.left;
    } else if (align === 'right') {
      left = rect.right;
    }

    const measuredWidth =
      popupRef.current?.offsetWidth ||
      (width.includes('w-96') ? 384 : width.includes('350') ? 350 : 320);

    if (align === 'center') {
      const halfWidth = measuredWidth / 2;
      if (left - halfWidth < 12) {
        left = halfWidth + 12;
      } else if (left + halfWidth > window.innerWidth - 12) {
        left = window.innerWidth - halfWidth - 12;
      }
    } else if (align === 'left') {
      if (left + measuredWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - measuredWidth - 12);
      }
    } else if (align === 'right') {
      if (left - measuredWidth < 12) {
        left = Math.min(window.innerWidth - 12, measuredWidth + 12);
      }
    }

    setCoords((prev) => {
      const nextTop = Math.round(top);
      const nextLeft = Math.round(left);
      if (
        prev &&
        prev.top === nextTop &&
        prev.left === nextLeft &&
        prev.actualPosition === actualPosition
      ) {
        return prev;
      }
      return {
        top: nextTop,
        left: nextLeft,
        actualPosition,
      };
    });
  }, [position, align, width]);

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

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [isOpen, updatePosition, content, title, badge]);

  useEffect(() => {
    if (!isOpen) return;
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

  const scheduleClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      if (!pointerOnTriggerRef.current && !pointerOnPopupRef.current) {
        setIsOpen(false);
      }
      closeTimerRef.current = null;
    }, closeDelay);
  }, [closeDelay]);

  const handleMouseEnter = () => {
    if (disabled) return;
    pointerOnTriggerRef.current = true;
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
    pointerOnTriggerRef.current = false;
    if (openTimerRef.current !== null) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    scheduleClose();
  };

  const handleTooltipMouseEnter = () => {
    pointerOnPopupRef.current = true;
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleTooltipMouseLeave = () => {
    pointerOnPopupRef.current = false;
    scheduleClose();
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
      onMouseMove={() => {
        if (!pointerOnTriggerRef.current) {
          handleMouseEnter();
        }
      }}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isOpen && !disabled && coords && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popupRef}
            role="tooltip"
            onMouseEnter={handleTooltipMouseEnter}
            onMouseLeave={handleTooltipMouseLeave}
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
            }}
            className={`fixed ${alignClass} ${width} max-w-[92vw] p-3 rounded-xl bg-slate-900/95 dark:bg-slate-950/95 text-slate-100 border border-slate-700/80 shadow-2xl backdrop-blur-md text-left text-xs whitespace-normal break-words pointer-events-auto transition-opacity duration-100 ${popupClassName}`}
          >
            {/* Hover bridge strictly matching the 12px gap between trigger and popover */}
            {actualPosition === 'bottom' ? (
              <div className="absolute -top-3 left-0 right-0 h-3 bg-transparent pointer-events-auto" />
            ) : (
              <div className="absolute -bottom-3 left-0 right-0 h-3 bg-transparent pointer-events-auto" />
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
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 pb-1 border-b border-slate-800">
                {title && <div className="font-bold text-sm text-slate-100 whitespace-normal break-words">{title}</div>}
                {badge && (
                  <div className="ml-auto max-w-full">
                    {React.isValidElement(badge) ? (
                      badge
                    ) : (
                      <span className="text-xs font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 inline-block whitespace-normal break-words">
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
