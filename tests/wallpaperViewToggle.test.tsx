/**
 * Phase 32 Plan 05 — Regression tests for the wallpaper view-toggle bug.
 *
 * Bug (pre-fix): applying a wallpaper in 3D, toggling to 2D, then back to 3D
 * left the wall blank. `ThreeViewport` unmounts on view-mode toggle, which
 * runs `useSharedTexture` cleanup → `releaseTexture` → refs=0 → synchronous
 * dispose + evict. Remount re-acquires, but has to fetch the texture again,
 * and the overlay renders no texture during the load gap.
 *
 * Fix (Plan 05 Task 1): debounced disposal — refs=0 schedules dispose after
 * a grace window (default 3000ms). Re-acquire inside the grace cancels the
 * pending dispose and reuses the SAME cached Texture instance.
 *
 * These tests exercise the hook in isolation (not inside WallMesh) to lock
 * the unmount+remount semantics that the view-toggle path relies on.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, act } from "@testing-library/react";
import * as THREE from "three";
import { useSharedTexture } from "@/three/useSharedTexture";
import {
  __resetPbrCacheForTests,
  __setDisposeGraceMsForTests,
} from "@/three/pbrTextureCache";

// Same THREE mock pattern as tests/pbrTextureCache.test.ts.
vi.mock("three", async () => {
  const actual = await vi.importActual<typeof import("three")>("three");
  class MockLoader {
    load(
      url: string,
      onLoad: (tex: any) => void,
      _onProg: unknown,
      onError: (e: Error) => void
    ) {
      if (url.includes("fail")) {
        queueMicrotask(() => onError(new Error("mock load error")));
      } else {
        const tex = new actual.Texture();
        queueMicrotask(() => onLoad(tex));
      }
    }
  }
  return {
    ...actual,
    TextureLoader: MockLoader,
  };
});

function Probe({
  url,
  capture,
}: {
  url: string;
  capture: (t: THREE.Texture | null) => void;
}) {
  const tex = useSharedTexture(url);
  capture(tex);
  return null;
}

beforeEach(() => {
  __resetPbrCacheForTests();
  __setDisposeGraceMsForTests(3000);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// Helper to let the useSharedTexture effect run and the acquire promise resolve.
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("wallpaper view-toggle regression", () => {
  it("same-URL remount within grace returns same Texture instance", async () => {
    const captured1: Array<THREE.Texture | null> = [];
    const { unmount } = render(
      <Probe url="/wallpaper.jpg" capture={(t) => captured1.push(t)} />
    );
    await settle();
    const texRef1 = captured1.filter((t): t is THREE.Texture => t !== null).pop();
    expect(texRef1).toBeDefined();

    // Simulate view-toggle unmount (ThreeViewport disappears when switching to 2D).
    unmount();

    // Advance 1000ms — well inside 3000ms grace window.
    vi.advanceTimersByTime(1000);

    // Remount a new consumer of the same URL (user toggles back to 3D).
    const captured2: Array<THREE.Texture | null> = [];
    render(<Probe url="/wallpaper.jpg" capture={(t) => captured2.push(t)} />);
    await settle();
    const texRef2 = captured2.filter((t): t is THREE.Texture => t !== null).pop();
    expect(texRef2).toBeDefined();

    expect(texRef2).toBe(texRef1);
  });

  it("remount after grace elapses returns a new Texture", async () => {
    const captured1: Array<THREE.Texture | null> = [];
    const { unmount } = render(
      <Probe url="/wallpaper.jpg" capture={(t) => captured1.push(t)} />
    );
    await settle();
    const texRef1 = captured1.filter((t): t is THREE.Texture => t !== null).pop();
    expect(texRef1).toBeDefined();

    unmount();

    // Advance past grace (4000 > 3000ms).
    vi.advanceTimersByTime(4000);

    const captured2: Array<THREE.Texture | null> = [];
    render(<Probe url="/wallpaper.jpg" capture={(t) => captured2.push(t)} />);
    await settle();
    const texRef2 = captured2.filter((t): t is THREE.Texture => t !== null).pop();
    expect(texRef2).toBeDefined();

    expect(texRef2).not.toBe(texRef1);
  });

  it("multi-consumer unmount keeps texture alive for remaining consumers", async () => {
    // Two concurrent consumers — e.g., two WallMesh instances on same wallpaper URL.
    const capturedA: Array<THREE.Texture | null> = [];
    const capturedB: Array<THREE.Texture | null> = [];

    const { unmount: unmountA } = render(
      <Probe url="/wallpaper.jpg" capture={(t) => capturedA.push(t)} />
    );
    const { unmount: unmountB } = render(
      <Probe url="/wallpaper.jpg" capture={(t) => capturedB.push(t)} />
    );
    await settle();

    const texA1 = capturedA.filter((t): t is THREE.Texture => t !== null).pop();
    const texB1 = capturedB.filter((t): t is THREE.Texture => t !== null).pop();
    expect(texA1).toBeDefined();
    expect(texB1).toBeDefined();
    expect(texA1).toBe(texB1); // shared cache entry

    const disposeSpy = vi.spyOn(texA1!, "dispose");

    // Unmount ONE consumer.
    unmountA();

    // Advance well past grace. Texture should NOT dispose — other consumer still holds a ref.
    vi.advanceTimersByTime(5000);
    expect(disposeSpy).not.toHaveBeenCalled();

    // Now unmount the remaining consumer. Past grace, dispose should fire.
    unmountB();
    vi.advanceTimersByTime(4000);
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });
});
