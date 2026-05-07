import React, { createContext, useContext, useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springTransition } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// ─── Context ───────────────────────────────────────────────────────────────

interface TabsContextValue {
  value: string;
  onValueChange: (v: string) => void;
  groupId: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must be used inside <Tabs>");
  return ctx;
}

// ─── Tabs Root ─────────────────────────────────────────────────────────────

interface TabsProps {
  value: string;
  onValueChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const groupId = useId();
  return (
    <TabsContext.Provider value={{ value, onValueChange, groupId }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// ─── TabsList ──────────────────────────────────────────────────────────────

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 bg-muted/50 p-1 rounded-smooth-md",
        className
      )}
    >
      {children}
    </div>
  );
}

// ─── TabsTrigger ───────────────────────────────────────────────────────────

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: activeValue, onValueChange, groupId } = useTabsContext();
  const isActive = activeValue === value;
  const reduced = useReducedMotion();

  return (
    <button
      role="tab"
      aria-selected={isActive}
      data-active={isActive ? "true" : undefined}
      onClick={() => onValueChange(value)}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-smooth-md px-3 py-1.5",
        "text-sm font-sans font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:pointer-events-none disabled:opacity-50",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId={`tab-pill-${groupId}`}
          className="absolute inset-0 bg-muted rounded-smooth-md"
          transition={springTransition(reduced)}
          style={{ zIndex: -1 }}
        />
      )}
      {children}
    </button>
  );
}

// ─── TabsContent ───────────────────────────────────────────────────────────

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabsContext();
  if (activeValue !== value) return null;
  return (
    <div
      role="tabpanel"
      className={cn("mt-2 focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}
