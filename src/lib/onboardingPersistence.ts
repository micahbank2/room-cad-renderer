const KEY = "room-cad-onboarding-completed";

export function getOnboardingCompleted(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setOnboardingCompleted(completed: boolean): void {
  try {
    if (completed) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // ignore storage errors (private mode, disabled, etc.)
  }
}
