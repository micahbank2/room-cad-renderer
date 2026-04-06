export type StepPlacement = "top" | "bottom" | "left" | "right" | "center";

export interface OnboardingStep {
  id: string;
  /** CSS selector for the element to highlight. Empty string = center (no spotlight). */
  target: string;
  title: string;
  body: string;
  placement: StepPlacement;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    target: "",
    title: "Welcome to Room CAD Renderer",
    body: "Design a room with your own furniture, then walk through it in 3D. This quick tour shows the core loop — takes about 30 seconds.",
    placement: "center",
  },
  {
    id: "wall-tool",
    target: '[data-onboarding="tool-wall"]',
    title: "Draw walls",
    body: "Press W or click this button to draw walls. Click-click to place each wall segment. Hold Shift for orthogonal-only walls.",
    placement: "right",
  },
  {
    id: "door-tool",
    target: '[data-onboarding="tool-door"]',
    title: "Add doors and windows",
    body: "Press D for door, N for window. Click anywhere on an existing wall to cut an opening.",
    placement: "right",
  },
  {
    id: "select-tool",
    target: '[data-onboarding="tool-select"]',
    title: "Select and move things",
    body: "Press V for the select tool. Click walls or products to select, drag to move, Delete to remove.",
    placement: "right",
  },
  {
    id: "help-button",
    target: '[data-onboarding="help-button"]',
    title: "Help is always here",
    body: "Click the ? icon any time — or press ? on your keyboard — to open the full guide with every keyboard shortcut.",
    placement: "bottom",
  },
  {
    id: "done",
    target: "",
    title: "You're ready",
    body: "Draw a room, upload a product, switch to 3D VIEW, and press E to walk through. Everything auto-saves.",
    placement: "center",
  },
];
