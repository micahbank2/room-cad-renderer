/**
 * Phase 32 Plan 05 — Debounced-disposal tests for `pbrTextureCache`.
 *
 * Context: Plan 03's D-05 cache migration routed wallpaper/wallArt through the
 * shared acquireTexture/releaseTexture cache. When ThreeViewport unmounts on a
 * view-mode toggle (2D ↔ 3D), `useSharedTexture` cleanup fires `releaseTexture`,
 * dropping refs to 0. The pre-fix behavior was "dispose immediately" — so a
 * re-acquire on remount had to do a fresh TextureLoader fetch and the overlay
 * disappeared during the load gap. Plan 05 makes dispose debounced: refs=0
 * schedules a dispose after a 3000ms grace window; any re-acquire inside that
 * window cancels the pending dispose and reuses the cached texture.
 *
 * These tests lock the debounce behavior using vi.useFakeTimers().
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as THREE from "three";
import {
  acquireTexture,
  releaseTexture,
  __resetPbrCacheForTests,
  __setDisposeGraceMsForTests,
} from "@/three/pbrTextureCache";

// Mock THREE.TextureLoader so tests don't hit network.
// Same pattern as tests/pbrTextureCache.test.ts — queueMicrotask async dispatch.
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

// Helper: yield so queueMicrotask-dispatched onLoad + its .then can resolve.
// queueMicrotask is NOT faked by vi.useFakeTimers by default, so microtasks
// still run naturally — we just need to yield the await chain.
async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  __resetPbrCacheForTests();
  // Default reset sets grace back to 3000. Fake timers so we can control it.
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pbrTextureCache — debounced disposal", () => {
  it("acquire-after-release-within-grace reuses same Texture and does NOT dispose", async () => {
    const t1 = await acquireTexture("/a.jpg", "albedo");
    const disposeSpy = vi.spyOn(t1, "dispose");

    releaseTexture("/a.jpg");
    // Inside grace window (3000ms default) — advance 1000ms.
    vi.advanceTimersByTime(1000);

    const t2 = await acquireTexture("/a.jpg", "albedo");
    await flushMicrotasks();

    expect(t2).toBe(t1);
    expect(disposeSpy).not.toHaveBeenCalled();

    // And, critically, the scheduled dispose must NOT fire after the full grace
    // has elapsed (acquire cancelled it).
    vi.advanceTimersByTime(5000);
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it("release + grace elapses → dispose and evict", async () => {
    const t1 = await acquireTexture("/a.jpg", "albedo");
    const disposeSpy = vi.spyOn(t1, "dispose");

    releaseTexture("/a.jpg");
    expect(disposeSpy).not.toHaveBeenCalled(); // still within grace

    // Advance past grace (default 3000ms).
    vi.advanceTimersByTime(3500);

    expect(disposeSpy).toHaveBeenCalledTimes(1);

    // Next acquire should load fresh (cache evicted).
    const t2Promise = acquireTexture("/a.jpg", "albedo");
    await flushMicrotasks();
    const t2 = await t2Promise;
    expect(t2).not.toBe(t1);
  });

  it("multi-ref release leaves entry alive and schedules no timer", async () => {
    const t1 = await acquireTexture("/a.jpg", "albedo");
    await acquireTexture("/a.jpg", "albedo"); // refs = 2 (returns t1, no new load)
    const disposeSpy = vi.spyOn(t1, "dispose");

    releaseTexture("/a.jpg"); // refs = 1, no dispose scheduled
    vi.advanceTimersByTime(10_000);

    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it("pending dispose is cancelled on re-acquire", async () => {
    const t1 = await acquireTexture("/a.jpg", "albedo");
    const disposeSpy = vi.spyOn(t1, "dispose");

    releaseTexture("/a.jpg"); // schedule dispose
    // Re-acquire BEFORE timer fires (fires at 3000ms).
    vi.advanceTimersByTime(500);
    const t2 = await acquireTexture("/a.jpg", "albedo");
    await flushMicrotasks();

    // Timer should be cancelled — advancing past the original grace must NOT dispose.
    vi.advanceTimersByTime(5000);

    expect(t2).toBe(t1);
    expect(disposeSpy).not.toHaveBeenCalled();
  });

  it("grace=0 disposes synchronously (test-only knob)", async () => {
    __setDisposeGraceMsForTests(0);
    const t1 = await acquireTexture("/a.jpg", "albedo");
    const disposeSpy = vi.spyOn(t1, "dispose");

    releaseTexture("/a.jpg");

    // No timer advance needed — grace=0 is synchronous.
    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it("independent URLs do not share grace timers", async () => {
    const tA = await acquireTexture("/a.jpg", "albedo");
    const tB = await acquireTexture("/b.jpg", "albedo");
    const disposeSpyA = vi.spyOn(tA, "dispose");
    const disposeSpyB = vi.spyOn(tB, "dispose");

    releaseTexture("/a.jpg");
    releaseTexture("/b.jpg");

    // Both inside grace.
    vi.advanceTimersByTime(1000);
    expect(disposeSpyA).not.toHaveBeenCalled();
    expect(disposeSpyB).not.toHaveBeenCalled();

    // Both past grace.
    vi.advanceTimersByTime(3000);
    expect(disposeSpyA).toHaveBeenCalledTimes(1);
    expect(disposeSpyB).toHaveBeenCalledTimes(1);

    // Cache empty — re-acquire loads fresh (proves eviction).
    const tA2Promise = acquireTexture("/a.jpg", "albedo");
    await flushMicrotasks();
    const tA2 = await tA2Promise;
    expect(tA2).not.toBe(tA);
  });
});
