import { useRef, useEffect } from "react";
import { useCADStore, getActiveRoomDoc } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { useWainscotStyleStore } from "@/stores/wainscotStyleStore";
import { STYLE_META } from "@/types/wainscotStyle";
import type { WallSide } from "@/types/cad";

interface Props {
  wallId: string;
  side: WallSide;
  style: React.CSSProperties;
  onClose: () => void;
}

export function WainscotPopover({ wallId, side, style, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const wainscotConfig = useCADStore((s) => {
    const doc = s.activeRoomId ? s.rooms[s.activeRoomId] : undefined;
    return doc?.walls[wallId]?.wainscoting?.[side];
  });

  const wainscotStyles = useWainscotStyleStore((s) => s.items);
  const toggleWainscoting = useCADStore.getState().toggleWainscoting;

  // Click-outside dismissal
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  // Dismiss on zoom/pan change
  useEffect(() => {
    const unsub = useUIStore.subscribe(
      (state, prev) => {
        if (state.userZoom !== prev.userZoom || state.panOffset !== prev.panOffset) {
          onClose();
        }
      }
    );
    return unsub;
  }, [onClose]);

  // Auto-focus for Escape handling
  useEffect(() => {
    ref.current?.focus();
  }, []);

  if (!wainscotConfig || !wainscotConfig.enabled) return null;

  const config = wainscotConfig;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      style={style}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
      className="glass-panel ghost-border rounded-sm p-2 w-[180px] outline-none"
    >
      <div className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-2">
        WAINSCOT_EDIT
      </div>

      {/* Style dropdown */}
      <div className="mb-1.5">
        <div className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-0.5">
          STYLE
        </div>
        <select
          value={config.styleItemId ?? ""}
          onChange={(e) => {
            const id = e.target.value || undefined;
            const selected = id ? wainscotStyles.find((s) => s.id === id) : null;
            toggleWainscoting(
              wallId,
              side,
              true,
              selected?.heightFt ?? config.heightFt,
              selected?.color ?? config.color,
              id
            );
          }}
          className="w-full font-mono text-[11px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
        >
          <option value="">(LEGACY_DEFAULT)</option>
          {wainscotStyles.map((it) => (
            <option key={it.id} value={it.id}>
              {it.name.toUpperCase()} &middot; {STYLE_META[it.style].label}
            </option>
          ))}
        </select>
      </div>

      {/* Height input */}
      <div>
        <div className="font-mono text-[10px] text-text-ghost tracking-widest uppercase mb-0.5">
          HEIGHT_FT
        </div>
        <input
          type="number"
          step="0.25"
          min="1"
          max="8"
          value={config.heightFt}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isFinite(val) || val < 1 || val > 8) return;
            toggleWainscoting(
              wallId,
              side,
              true,
              val,
              config.color,
              config.styleItemId
            );
          }}
          className="w-full font-mono text-[11px] bg-obsidian-high text-accent-light border border-outline-variant/30 px-1 py-0.5 rounded-sm"
        />
      </div>
    </div>
  );
}
