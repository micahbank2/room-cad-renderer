// Phase 87 Plan 01 — Settings popover with theme toggle.
//
// Renders a gear button in TopBar that opens a Popover containing a "Theme"
// SegmentedControl (Light / Dark / System). Per D-03, the popover stays open
// after a segment click — Radix default close-on-outside-click + Escape still
// apply.

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/Tooltip";
import { Button } from "@/components/ui/Button";
import { Settings } from "lucide-react";
import { useTheme, type ThemeChoice } from "@/hooks/useTheme";

interface SettingsPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function SettingsPopover({
  open,
  onOpenChange,
}: SettingsPopoverProps): JSX.Element {
  const { theme, setTheme } = useTheme();

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Settings"
              data-testid="topbar-settings-button"
            >
              <Settings size={16} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Settings</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={6}
        className="w-64"
        data-testid="settings-popover"
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="font-sans text-xs font-medium text-muted-foreground">
              Theme
            </label>
            <SegmentedControl
              value={theme}
              onValueChange={(v) => setTheme(v as ThemeChoice)}
              options={THEME_OPTIONS}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
