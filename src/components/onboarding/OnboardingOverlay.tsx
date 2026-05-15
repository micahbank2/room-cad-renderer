import { useEffect, useLayoutEffect, useState } from "react";
import { useOnboardingStore } from "@/stores/onboardingStore";
import {
  ONBOARDING_STEPS,
  type OnboardingStep,
} from "@/components/onboarding/onboardingSteps";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function OnboardingOverlay() {
  const running = useOnboardingStore((s) => s.running);
  const stepIndex = useOnboardingStore((s) => s.stepIndex);
  const next = useOnboardingStore((s) => s.next);
  const prev = useOnboardingStore((s) => s.prev);
  const skip = useOnboardingStore((s) => s.skip);

  const step = ONBOARDING_STEPS[stepIndex];
  const [rect, setRect] = useState<Rect | null>(null);

  // Measure target element
  useLayoutEffect(() => {
    if (!running || !step) return;
    if (!step.target) {
      setRect(null);
      return;
    }

    const measure = () => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    // Re-measure after frame (in case layout still settling)
    const raf = requestAnimationFrame(measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      cancelAnimationFrame(raf);
    };
  }, [running, step]);

  // ESC skips the tour
  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [running, next, prev, skip]);

  if (!running || !step) return null;

  const isCenter = step.placement === "center" || !step.target || !rect;
  const PAD = 6;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Spotlight dim — uses a box-shadow ring trick to darken outside the cutout */}
      {!isCenter && rect && (
        <div
          className="absolute ring-2 ring-accent ring-offset-2 ring-offset-background rounded-smooth-md pointer-events-none"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(13, 13, 24, 0.72)",
            transition: "top 150ms, left 150ms, width 150ms, height 150ms",
          }}
        />
      )}

      {/* Full dim for center steps */}
      {isCenter && (
        <div className="absolute inset-0 bg-background/72 pointer-events-auto" />
      )}

      {/* Coach mark card */}
      <CoachMark
        step={step}
        stepIndex={stepIndex}
        totalSteps={ONBOARDING_STEPS.length}
        targetRect={isCenter ? null : rect}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
      />
    </div>
  );
}

function CoachMark({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: {
  step: OnboardingStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: Rect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  // Position the card based on placement
  const cardWidth = 340;
  const gap = 16;

  let style: React.CSSProperties = {};
  if (!targetRect) {
    style = {
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    };
  } else {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    switch (step.placement) {
      case "top":
        style = {
          top: targetRect.top - gap,
          left: targetRect.left + targetRect.width / 2,
          transform: "translate(-50%, -100%)",
        };
        break;
      case "bottom":
        style = {
          top: targetRect.top + targetRect.height + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: "translate(-50%, 0)",
        };
        break;
      case "left":
        style = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - gap,
          transform: "translate(-100%, -50%)",
        };
        break;
      case "right":
        style = {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left + targetRect.width + gap,
          transform: "translate(0, -50%)",
        };
        break;
    }
    // Clamp horizontally to avoid offscreen
    const leftNum =
      typeof style.left === "number" ? style.left : parseFloat(style.left as string);
    if (!isNaN(leftNum)) {
      const maxLeft = vw - 16;
      const minLeft = 16 + cardWidth / 2;
      if (step.placement === "top" || step.placement === "bottom") {
        style.left = Math.max(minLeft, Math.min(leftNum, maxLeft - cardWidth / 2));
      }
    }
    // Clamp vertically
    const topNum =
      typeof style.top === "number" ? style.top : parseFloat(style.top as string);
    if (!isNaN(topNum)) {
      style.top = Math.max(16, Math.min(topNum, vh - 16));
    }
  }

  return (
    <div
      style={{ ...style, width: cardWidth }}
      className="fixed bg-popover border border-accent/40 rounded-smooth-md shadow-2xl p-4 pointer-events-auto"
    >
      {/* Progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 w-6 rounded-smooth-md transition-colors ${
                i === stepIndex
                  ? "bg-accent"
                  : i < stepIndex
                  ? "bg-accent/40"
                  : "bg-accent"
              }`}
            />
          ))}
        </div>
        <span className="font-sans text-[11px] text-muted-foreground/60 tracking-widest">
          {stepIndex + 1} OF {totalSteps}
        </span>
      </div>

      {/* Title + body */}
      <h3 className="font-sans text-[12px] text-foreground tracking-wider uppercase mb-2">
        {step.title}
      </h3>
      <p className="font-sans text-[13px] text-muted-foreground leading-relaxed mb-4">
        {step.body}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="font-sans text-[12px] tracking-widest text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          SKIP TOUR
        </button>
        <div className="flex items-center gap-2">
          {!isFirst && (
            <button
              onClick={onPrev}
              className="font-sans text-[12px] tracking-widest px-3 py-1 text-muted-foreground/80 hover:text-foreground transition-colors"
            >
              BACK
            </button>
          )}
          <button
            onClick={onNext}
            className="font-sans text-[12px] tracking-widest px-3 py-1 border border-accent text-foreground hover:bg-accent/10 transition-colors rounded-smooth-md"
          >
            {isLast ? "GOT IT" : "NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
}
