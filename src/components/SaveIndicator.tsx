import { useProjectStore } from "@/stores/projectStore";

export default function SaveIndicator() {
  const status = useProjectStore((s) => s.saveStatus);
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <span
        data-testid="save-indicator"
        className="font-mono text-[9px] tracking-widest text-text-dim transition-opacity duration-200"
      >
        SAVING...
      </span>
    );
  }
  return (
    <span
      data-testid="save-indicator"
      className="font-mono text-[9px] tracking-widest text-success transition-opacity duration-200"
    >
      SAVED
    </span>
  );
}
