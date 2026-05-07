import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/cn";

// ─── Tooltip ───────────────────────────────────────────────────────────────

/**
 * TooltipProvider: sets delayDuration={200} per D-18.
 * Wrap the root of the app (or section) once with this.
 */
export const TooltipProvider = ({
  children,
  delayDuration = 200,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider delayDuration={delayDuration} {...props}>
    {children}
  </TooltipPrimitive.Provider>
);
TooltipProvider.displayName = "TooltipProvider";

/** Thin wrapper around TooltipPrimitive.Root */
export const Tooltip = TooltipPrimitive.Root;

/** Re-export of TooltipPrimitive.Trigger */
export const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * TooltipContent: dark chip style per D-18.
 * z-50, bg-foreground text-background, text-xs, rounded-md, px-2 py-1.
 */
export function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 bg-foreground text-background text-xs rounded-md px-2 py-1",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </TooltipPrimitive.Portal>
  );
}
TooltipContent.displayName = "TooltipContent";
