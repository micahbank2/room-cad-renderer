import { ErrorBoundary } from "react-error-boundary";
import type { ReactNode } from "react";

interface Props {
  /** What to render when PBR loading throws (e.g., broken URL). */
  fallback: ReactNode;
  children: ReactNode;
}

/** Per-mesh error boundary for PBR loading (D-15 / MUST-SUSP).
 *  Catches thrown errors from the PBR render subtree and renders `fallback`
 *  — typically a plain <meshStandardMaterial> with the material's base hex color.
 *  Rest of the scene continues rendering; no React root error boundary trip. */
export function PbrErrorBoundary({ fallback, children }: Props): JSX.Element {
  return (
    <ErrorBoundary fallback={<>{fallback}</>}>
      {children}
    </ErrorBoundary>
  );
}
