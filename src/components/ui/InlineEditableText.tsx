import { useEffect, useRef, useState } from "react";

export interface InlineEditableTextProps {
  value: string;
  onLivePreview: (v: string) => void;
  onCommit: (v: string) => void;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Phase 33 GH #88 — inline-edit primitive.
 *
 * Extracted from Phase 31 LabelOverrideInput (src/components/PropertiesPanel.tsx:292-403).
 * Invariants preserved (Phase 31 Pitfall 4):
 *   - `skipNextBlurRef` — Escape calls `.blur()` which fires onBlur → commit()
 *     with a stale draft closure. The ref makes blur skip the cancellation cycle.
 *   - `originalRef` — snapshot of last committed external `value` for revert.
 *   - Live-preview on keystroke (onLivePreview); commit on Enter/blur (onCommit).
 *   - Empty commit (after trim) reverts to previous value (D-27).
 *   - Max 60 chars default; `maxLength` on the input enforces at OS level.
 *   - useEffect reseeds draft when external `value` changes (selection swap).
 */
export function InlineEditableText({
  value,
  onLivePreview,
  onCommit,
  maxLength = 60,
  placeholder,
  className,
  "data-testid": testId,
}: InlineEditableTextProps) {
  const [draft, setDraft] = useState(value);
  const originalRef = useRef(value);
  const skipNextBlurRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reseed when external value changes (selection swap, external commit, etc.)
  useEffect(() => {
    setDraft(value);
    originalRef.current = value;
  }, [value]);

  function commit() {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }
    const trimmed = draft.trim();
    if (trimmed === "") {
      // D-27: empty commit → revert
      cancel();
      return;
    }
    const final = trimmed.slice(0, maxLength);
    onCommit(final);
    originalRef.current = final;
    setDraft(final);
  }

  function cancel() {
    skipNextBlurRef.current = true;
    onLivePreview(originalRef.current);
    setDraft(originalRef.current);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={draft}
      maxLength={maxLength}
      placeholder={placeholder}
      data-testid={testId}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        onLivePreview(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          inputRef.current?.blur();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
          inputRef.current?.blur();
        }
      }}
      onBlur={commit}
      className={
        "bg-transparent outline-none border-b border-transparent focus:border-accent cursor-text " +
        (className ?? "")
      }
    />
  );
}

// Test driver — gated, targets the active InlineEditableText via data-testid
if (import.meta.env.MODE === "test") {
  (window as unknown as { __driveInlineTitleEdit?: unknown }).__driveInlineTitleEdit = {
    type: (text: string, testid = "inline-doc-title") => {
      const input = document.querySelector(
        `[data-testid="${testid}"]`,
      ) as HTMLInputElement | null;
      if (!input) return;
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    commit: (testid = "inline-doc-title") => {
      const input = document.querySelector(
        `[data-testid="${testid}"]`,
      ) as HTMLInputElement | null;
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    },
    cancel: (testid = "inline-doc-title") => {
      const input = document.querySelector(
        `[data-testid="${testid}"]`,
      ) as HTMLInputElement | null;
      input?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    },
    getDraft: (testid = "inline-doc-title") => {
      const input = document.querySelector(
        `[data-testid="${testid}"]`,
      ) as HTMLInputElement | null;
      return input?.value ?? "";
    },
  };
}
