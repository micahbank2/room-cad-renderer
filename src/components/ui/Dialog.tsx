/**
 * Dialog primitive — Phase 72-04
 * Radix Dialog + motion/react spring entry animation
 *
 * D-15: lucide-react only for icons; D-16: forwardRef pattern.
 * Reduced-motion users get instant snap via springTransition().
 */
import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springTransition } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Re-export Radix primitives directly ─────────────────────────────────────
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

// ─── DialogTitle ─────────────────────────────────────────────────────────────
export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("font-sans text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

// ─── DialogDescription ───────────────────────────────────────────────────────
export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

// ─── DialogContent ───────────────────────────────────────────────────────────
interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  className?: string;
  children?: React.ReactNode;
}

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, ...props }, ref) => {
  const reduced = useReducedMotion();

  return (
    <DialogPrimitive.Portal>
      {/* Overlay */}
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      />
      {/* Content — use asChild to let motion.div own the DOM node */}
      <DialogPrimitive.Content asChild ref={ref} {...props}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={springTransition(reduced)}
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-lg bg-card rounded-smooth-lg border border-border shadow-lg p-6",
            className
          )}
        >
          {children}
        </motion.div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
});
DialogContent.displayName = "DialogContent";
