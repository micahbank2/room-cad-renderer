import { create } from "zustand";
import {
  getOnboardingCompleted,
  setOnboardingCompleted,
} from "@/lib/onboardingPersistence";
import { ONBOARDING_STEPS } from "@/components/onboarding/onboardingSteps";

interface OnboardingState {
  running: boolean;
  completed: boolean;
  stepIndex: number;

  start: () => void;
  next: () => void;
  prev: () => void;
  skip: () => void;
  finish: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  running: false,
  completed: getOnboardingCompleted(),
  stepIndex: 0,

  start: () => set({ running: true, stepIndex: 0 }),
  next: () => {
    const { stepIndex } = get();
    if (stepIndex >= ONBOARDING_STEPS.length - 1) {
      get().finish();
    } else {
      set({ stepIndex: stepIndex + 1 });
    }
  },
  prev: () => {
    const { stepIndex } = get();
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1 });
  },
  skip: () => {
    setOnboardingCompleted(true);
    set({ running: false, completed: true });
  },
  finish: () => {
    setOnboardingCompleted(true);
    set({ running: false, completed: true });
  },
  reset: () => {
    setOnboardingCompleted(false);
    set({ running: false, completed: false, stepIndex: 0 });
  },
}));
