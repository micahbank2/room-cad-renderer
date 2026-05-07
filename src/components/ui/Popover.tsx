import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

// ─── Popover ───────────────────────────────────────────────────────────────

/** Thin wrapper around PopoverPrimitive.Root (D-17) */
export const Popover = PopoverPrimitive.Root;

/** Re-export of PopoverPrimitive.Trigger */
export const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * PopoverContent: styled with Pascal card tokens.
 * z-50, w-72, rounded-smooth-lg, border border-border, bg-card, p-4, shadow-md.
 */
export function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 rounded-smooth-lg border border-border bg-card p-4 shadow-md outline-none",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
PopoverContent.displayName = "PopoverContent";
