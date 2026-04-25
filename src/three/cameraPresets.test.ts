import { describe, expect, it } from "vitest";
import { PRESETS, getPresetPose, type PresetId } from "@/three/cameraPresets";

describe("getPresetPose", () => {
  it("three-quarter returns the literal v1.7.5 baseline (D-05 regression guard)", () => {
    // Phase 35 CONTEXT §D-05 locks this pose literally. A room with
    // width=20, length=16, wallHeight=8 yields halfW=10, halfL=8, so:
    //   position = [halfW + 15, 12, halfL + 15] = [25, 12, 23]
    //   target   = [halfW, halfL / 2, halfL]    = [10, 4, 8]
    // If this test fails, a refactor broke D-05. Do NOT "fix" by updating the
    // expected values — re-read .planning/phases/35-camera-presets/35-CONTEXT.md §D-05.
    const pose = getPresetPose("three-quarter", {
      width: 20,
      length: 16,
      wallHeight: 8,
    });
    expect(pose.position).toEqual([25, 12, 23]);
    expect(pose.target).toEqual([10, 4, 8]);
  });

  it("eye-level has Y = 5.5 for both position and target across varied rooms", () => {
    const shapes = [
      { width: 20, length: 16, wallHeight: 8 },
      { width: 40, length: 40, wallHeight: 10 },
      { width: 8, length: 24, wallHeight: 9 },
    ];
    for (const room of shapes) {
      const pose = getPresetPose("eye-level", room);
      expect(pose.position[1]).toBe(5.5);
      expect(pose.target[1]).toBe(5.5);
    }
  });

  it("top-down position[1] equals 1.5 * max(width, length)", () => {
    const cases: Array<{ room: { width: number; length: number; wallHeight: number }; expectedY: number }> = [
      { room: { width: 20, length: 16, wallHeight: 8 }, expectedY: 30 },
      { room: { width: 16, length: 20, wallHeight: 8 }, expectedY: 30 },
      { room: { width: 40, length: 40, wallHeight: 10 }, expectedY: 60 },
    ];
    for (const { room, expectedY } of cases) {
      const pose = getPresetPose("top-down", room);
      expect(pose.position[1]).toBe(expectedY);
    }
  });

  it("top-down target Y is always 0 (looking straight down)", () => {
    const rooms = [
      { width: 20, length: 16, wallHeight: 8 },
      { width: 40, length: 40, wallHeight: 10 },
      { width: 100, length: 5, wallHeight: 12 },
    ];
    for (const room of rooms) {
      const pose = getPresetPose("top-down", room);
      expect(pose.target[1]).toBe(0);
    }
  });

  it("corner places camera at far corner and targets origin corner at wallHeight - 0.5", () => {
    const room = { width: 20, length: 16, wallHeight: 8 };
    const pose = getPresetPose("corner", room);
    expect(pose.position).toEqual([20, 7.5, 16]);
    expect(pose.target).toEqual([0, 7.5, 0]);
  });

  it("every PresetId returns 6 finite numbers across position + target (exhaustive ID handling)", () => {
    const room = { width: 20, length: 16, wallHeight: 8 };
    for (const { id } of PRESETS) {
      const presetId: PresetId = id;
      const pose = getPresetPose(presetId, room);
      const all = [...pose.position, ...pose.target];
      expect(all).toHaveLength(6);
      for (const n of all) {
        expect(Number.isFinite(n)).toBe(true);
      }
    }
  });
});
