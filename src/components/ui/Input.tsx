import React from "react";
import { cn } from "@/lib/cn";

// ─── Input ─────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

/**
 * Styled input wrapper (D-19, D-20).
 * forwardRef component supporting any HTML input type.
 * Optionally renders a <label> above when `label` prop is provided.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id;
    const input = (
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-9 w-full rounded-smooth-md border border-border bg-background",
          "px-3 py-1 text-sm font-sans text-foreground shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );

    if (label) {
      return (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor={inputId}
            className="text-sm font-sans font-medium text-foreground"
          >
            {label}
          </label>
          {input}
        </div>
      );
    }

    return input;
  }
);
Input.displayName = "Input";
