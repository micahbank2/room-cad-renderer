import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore cameraMode state", () => {
  beforeEach(() => {
    useUIStore.getState().setCameraMode("orbit");
  });

  it("default cameraMode is 'orbit'", () => {
    // reset in beforeEach ensures clean state
    expect(useUIStore.getState().cameraMode).toBe("orbit");
  });

  it("setCameraMode('walk') sets cameraMode to 'walk'", () => {
    useUIStore.getState().setCameraMode("walk");
    expect(useUIStore.getState().cameraMode).toBe("walk");
  });

  it("setCameraMode('orbit') sets cameraMode to 'orbit'", () => {
    useUIStore.getState().setCameraMode("walk");
    useUIStore.getState().setCameraMode("orbit");
    expect(useUIStore.getState().cameraMode).toBe("orbit");
  });

  it("toggleCameraMode flips orbit -> walk", () => {
    expect(useUIStore.getState().cameraMode).toBe("orbit");
    useUIStore.getState().toggleCameraMode();
    expect(useUIStore.getState().cameraMode).toBe("walk");
  });

  it("toggleCameraMode flips walk -> orbit", () => {
    useUIStore.getState().setCameraMode("walk");
    useUIStore.getState().toggleCameraMode();
    expect(useUIStore.getState().cameraMode).toBe("orbit");
  });
});
