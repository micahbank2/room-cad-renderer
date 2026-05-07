import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useUIStore } from "@/stores/uiStore";
import { useOnboardingStore } from "@/stores/onboardingStore";

type Placement = "top" | "bottom" | "left" | "right";

interface Props {
  content: string;
  shortcut?: string;
  placement?: Placement;
  delay?: number;
  children: React.ReactElement;
  disabled?: boolean;
}

/**
 * CSS-positioned tooltip that attaches to a single child element.
 * Shows after `delay` ms of hover, hides instantly on mouse leave.
 * Suppressed while in walk mode (pointer lock) or when the help modal is open.
 */
export default function Tooltip({
  content,
  shortcut,
  placement = "bottom",
  delay = 500,
  children,
  disabled = false,
}: Props) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: Placement } | null>(null);
  const timerRef = useRef<number | null>(null);

  // Suppress tooltips in walk mode, when help is open, or during onboarding tour
  const showHelp = useUIStore((s) => s.showHelp);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const onboardingRunning = useOnboardingStore((s) => s.running);
  const suppressed =
    disabled || showHelp || cameraMode === "walk" || onboardingRunning;

  const show = () => {
    if (suppressed) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setOpen(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // If suppression kicks in while open, force close
  useEffect(() => {
    if (suppressed) hide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suppressed]);

  // Position tooltip in viewport, flipping if near an edge
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current || !tooltipRef.current) return;
    const anchor = wrapperRef.current.getBoundingClientRect();
    const tt = tooltipRef.current.getBoundingClientRect();
    const gap = 6;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let p: Placement = placement;
    // Flip if out of bounds
    if (p === "top" && anchor.top - tt.height - gap < padding) p = "bottom";
    if (p === "bottom" && anchor.bottom + tt.height + gap > vh - padding) p = "top";
    if (p === "left" && anchor.left - tt.width - gap < padding) p = "right";
    if (p === "right" && anchor.right + tt.width + gap > vw - padding) p = "left";

    let top = 0;
    let left = 0;
    switch (p) {
      case "top":
        top = anchor.top - tt.height - gap;
        left = anchor.left + anchor.width / 2 - tt.width / 2;
        break;
      case "bottom":
        top = anchor.bottom + gap;
        left = anchor.left + anchor.width / 2 - tt.width / 2;
        break;
      case "left":
        top = anchor.top + anchor.height / 2 - tt.height / 2;
        left = anchor.left - tt.width - gap;
        break;
      case "right":
        top = anchor.top + anchor.height / 2 - tt.height / 2;
        left = anchor.right + gap;
        break;
    }
    // Clamp horizontally
    left = Math.max(padding, Math.min(left, vw - tt.width - padding));
    top = Math.max(padding, Math.min(top, vh - tt.height - padding));

    setCoords({ top, left, placement: p });
  }, [open, placement, content]);

  return (
    <>
      <span
        ref={wrapperRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex"
      >
        {children}
      </span>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="fixed z-[100] pointer-events-none font-mono text-[10px] text-foreground bg-secondary border border-border/60 px-2 py-1 rounded-sm shadow-lg flex items-center gap-2"
            style={
              coords
                ? { top: coords.top, left: coords.left }
                : { opacity: 0, top: -9999, left: -9999 }
            }
          >
            <span>{content}</span>
            {shortcut && (
              <kbd className="font-mono text-[9px] text-foreground bg-background px-1 py-0.5 rounded-sm border border-border/50">
                {shortcut}
              </kbd>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
