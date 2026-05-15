import * as THREE from "three";
import { Suspense, useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, PointerLockControls } from "@react-three/drei";
import { registerRenderer } from "./pbrTextureCache";
import { useCADStore, useActiveRoom, useCustomElements } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import type { Product } from "@/types/product";
import { angle as wallAngleRad } from "@/lib/geometry";
import Lighting from "./Lighting";
import { RoomGroup, computeRoomOffsets } from "./RoomGroup";
import { computeRoomBboxCenter, getCutawayWallId } from "./cutawayDetection";
import WalkCameraController from "./WalkCameraController";
import { GestureChip } from "@/components/ui/GestureChip";
import { getPresetPose, type PresetId } from "@/three/cameraPresets";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { isClick } from "@/hooks/useClickDetect";

/**
 * Phase 35 CAM-02: cubic-in-out easing for preset tween.
 * Research §1 — chosen over exponential lerp so cancel-and-restart can
 * capture `from` from the LIVE camera and resume smoothly; time-based
 * progress normalizes the distance.
 */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Phase 36 Plan 01 — VIZ-10 lifecycle tap (test-mode gated).
// Mirrors the tap functions in userTextureCache.ts / wallpaperTextureCache.ts /
// wallArtTextureCache.ts. The events buffer is a shared singleton on window.
type LifecycleEvent = {
  t: number;
  event: string;
  id?: string;
  uuid?: string;
  context?: Record<string, unknown>;
};
function tapEvent(e: Omit<LifecycleEvent, "t">): void {
  if (typeof window === "undefined" || import.meta.env.MODE !== "test") return;
  const w = window as unknown as { __textureLifecycleEvents?: LifecycleEvent[] };
  if (!w.__textureLifecycleEvents) w.__textureLifecycleEvents = [];
  w.__textureLifecycleEvents.push({ t: performance.now(), ...e });
}

interface Props {
  productLibrary: Product[];
}

function Scene({ productLibrary }: Props) {
  // Keep active room for camera presets, walk-mode bounds, grid centering.
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const customCatalog = useCustomElements();
  const selectedIds = useUIStore((s) => s.selectedIds);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const wallSideCameraTarget = useUIStore((s) => s.wallSideCameraTarget);
  // Phase 35 CAM-02: preset tween subscriptions.
  const pendingPresetRequest = useUIStore((s) => s.pendingPresetRequest);
  const prefersReducedMotion = useReducedMotion();

  // Phase 46 D-11/D-12: visibility + camera-target subscriptions.
  const hiddenIds = useUIStore((s) => s.hiddenIds);
  const activeRoomId = useCADStore((s) => s.activeRoomId);
  const pendingCameraTarget = useUIStore((s) => s.pendingCameraTarget);

  // Phase 47 D-02: multi-room render gate.
  const rooms = useCADStore((s) => s.rooms);
  const displayMode = useUIStore((s) => s.displayMode);

  // Phase 59 CUTAWAY-01: subscriptions for the per-frame cutaway-detection loop.
  // useFrame block below reads these via closure on each tick.
  const cutawayMode = useUIStore((s) => s.cutawayMode);
  const setCutawayAutoDetectedWall = useUIStore((s) => s.setCutawayAutoDetectedWall);

  // Phase 47 D-03: per-room X offsets (cumulative sum for EXPLODE; 0 for NORMAL/SOLO).
  const roomOffsets = useMemo(
    () => computeRoomOffsets(rooms, displayMode),
    [rooms, displayMode],
  );

  const halfW = room.width / 2;
  const halfL = room.length / 2;

  // Register the renderer once so pbrTextureCache applies device anisotropy (clamped ≤8).
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    registerRenderer(gl);
  }, [gl]);

  // Phase 36 Plan 01 — VIZ-10 harness: viewport mount/unmount lifecycle.
  // Test-mode only; zero production path impact.
  useEffect(() => {
    if (import.meta.env.MODE !== "test") return;
    tapEvent({
      event: "viewport-mount",
      context: {
        rendererUuid: (gl as unknown as { uuid?: string }).uuid ?? null,
        domWidth: gl.domElement?.clientWidth ?? null,
        domHeight: gl.domElement?.clientHeight ?? null,
      },
    });
    return () => {
      tapEvent({ event: "viewport-unmount" });
    };
  }, [gl]);

  // D-09: preserve orbit camera position+target across mode switches
  const orbitPosRef = useRef<[number, number, number]>([halfW + 15, 12, halfL + 15]);
  const orbitTargetRef = useRef<[number, number, number]>([halfW, room.wallHeight / 3, halfL]);
  const orbitControlsRef = useRef<any>(null);

  // Phase 36 Plan 01 — VIZ-10 harness: deterministic camera pose helper.
  // Mirrors Phase 31 `window.__drive*` convention (install/cleanup via
  // useEffect; test-mode gated).
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __setTestCamera?: (p: {
        position: [number, number, number];
        target: [number, number, number];
      }) => void;
    }).__setTestCamera = ({ position, target }) => {
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return;
      ctrl.object.position.set(position[0], position[1], position[2]);
      ctrl.target.set(target[0], target[1], target[2]);
      ctrl.update();
      // Persist so D-09 restore path uses the test pose.
      orbitPosRef.current = [position[0], position[1], position[2]];
      orbitTargetRef.current = [target[0], target[1], target[2]];
    };
    return () => {
      delete (window as unknown as { __setTestCamera?: unknown }).__setTestCamera;
    };
  }, []);

  // Phase 35 Plan 02 — test drivers for preset motion e2e specs.
  // Install/cleanup pattern mirrors __setTestCamera above (test-mode gated).
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __applyCameraPreset?: (presetId: PresetId) => void;
    }).__applyCameraPreset = (presetId) => {
      // Thin shim over the production code path (Research §6 Recommendation B)
      // — same entry point as Toolbar click / hotkey.
      useUIStore.getState().requestPreset(presetId);
    };
    return () => {
      delete (window as unknown as { __applyCameraPreset?: unknown }).__applyCameraPreset;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __getActivePreset?: () => PresetId | null;
    }).__getActivePreset = () => useUIStore.getState().activePreset;
    return () => {
      delete (window as unknown as { __getActivePreset?: unknown }).__getActivePreset;
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as {
      __getCameraPose?: () => {
        position: [number, number, number];
        target: [number, number, number];
      } | null;
    }).__getCameraPose = () => {
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return null;
      const cam = ctrl.object as THREE.Camera;
      return {
        position: [cam.position.x, cam.position.y, cam.position.z],
        target: [ctrl.target.x, ctrl.target.y, ctrl.target.z],
      };
    };
    return () => {
      delete (window as unknown as { __getCameraPose?: unknown }).__getCameraPose;
    };
  }, []);

  // Phase 48 CAM-04: install cross-component camera-capture bridge.
  // PropertiesPanel reads useUIStore.getState().getCameraCapture?.() to read
  // the live OrbitControls pose at Save-button click. Bridge mirrors Phase 46's
  // requestCameraTarget pattern in reverse (ThreeViewport writes; PropertiesPanel reads).
  useEffect(() => {
    useUIStore.getState().installCameraCapture(() => {
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return null;
      const cam = ctrl.object as THREE.Camera;
      return {
        pos: [cam.position.x, cam.position.y, cam.position.z] as [number, number, number],
        target: [ctrl.target.x, ctrl.target.y, ctrl.target.z] as [number, number, number],
      };
    });
    return () => {
      useUIStore.getState().clearCameraCapture();
    };
  }, []);

  // Camera animation target (smooth lerp)
  const cameraAnimTarget = useRef<{ pos: THREE.Vector3; look: THREE.Vector3 } | null>(null);

  // Phase 35 CAM-02: time-based preset tween state. Coexists with
  // cameraAnimTarget — mutually exclusive per frame (only one runs).
  // Phase 46: presetId widened to PresetId | null so pendingCameraTarget
  // consumer can reuse the same tween infrastructure without a preset id.
  const presetTween = useRef<null | {
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    startMs: number;
    durationMs: number;
    presetId: PresetId | null;
  }>(null);

  // 05.1 fix: restore saved camera position when returning to orbit mode.
  // Phase 35 Risk 5: also tear down any in-flight preset tween on walk-mode
  // entry and restore damping (guard against walk-mode flip mid-tween).
  useEffect(() => {
    if (cameraMode !== "orbit") {
      presetTween.current = null;
      const ctrl = orbitControlsRef.current;
      if (ctrl) ctrl.enableDamping = true;
      return;
    }
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    const [x, y, z] = orbitPosRef.current;
    ctrl.object.position.set(x, y, z);
    ctrl.update();
  }, [cameraMode]);

  // Phase 35 Risk 6: Scene unmount clears in-flight tween (belt-and-suspenders;
  // ref is GC'd with Scene anyway, but this makes the intent explicit).
  useEffect(() => {
    return () => {
      presetTween.current = null;
    };
  }, []);

  // MIC-35: animate camera to face selected wall side.
  // Phase 44 A11Y-01: when prefers-reduced-motion is on, snap directly to the
  // wall-side pose instead of populating cameraAnimTarget (which drives a
  // useFrame lerp). Mirrors Phase 35 preset-tween reduced-motion path.
  useEffect(() => {
    if (!wallSideCameraTarget || cameraMode !== "orbit") return;
    // Derive active room's walls from rooms record for wall-side camera animation.
    const activeWalls = activeRoomId ? (rooms[activeRoomId]?.walls ?? {}) : {};
    const wall = activeWalls[wallSideCameraTarget.wallId];
    if (!wall) return;
    // Wall center in 3D (x = 2D x, z = 2D y, y = height/2)
    const cx = (wall.start.x + wall.end.x) / 2;
    const cz = (wall.start.y + wall.end.y) / 2;
    const cy = wall.height / 2;
    // Wall perpendicular in 2D: rotate direction 90° CCW
    const a = wallAngleRad(wall.start, wall.end);
    const perpAngle = a + Math.PI / 2;
    // Side A = left (-perp), Side B = right (+perp)
    // Camera should be on the chosen side, looking at the wall
    const sign = wallSideCameraTarget.side === "A" ? -1 : 1;
    const dist = 8; // feet back from wall
    const nx = Math.cos(perpAngle) * sign;
    const nz = Math.sin(perpAngle) * sign;
    // Camera position: wall center + normal * distance (in 3D coords: x→x, y→up, z→z)
    const camPos = new THREE.Vector3(cx + nx * dist, cy + 2, cz + nz * dist);
    const lookAt = new THREE.Vector3(cx, cy, cz);
    if (prefersReducedMotion) {
      // Snap directly — never enter useFrame lerp.
      const ctrl = orbitControlsRef.current;
      if (ctrl?.object) {
        ctrl.object.position.copy(camPos);
        ctrl.target.copy(lookAt);
        ctrl.update();
      }
    } else {
      cameraAnimTarget.current = { pos: camPos, look: lookAt };
    }
    useUIStore.getState().clearWallSideCameraTarget();
  }, [wallSideCameraTarget, rooms, activeRoomId, cameraMode, prefersReducedMotion]);

  // Phase 35 CAM-02: consume pendingPresetRequest from uiStore.
  // Research §1 cancel-and-restart — startPresetTween captures `from` from
  // the LIVE camera pose, so a mid-tween request restarts smoothly without
  // the prior tween's `toPos` being stranded.
  useEffect(() => {
    if (!pendingPresetRequest) return;
    // D-01 + D-03 guards are applied upstream (App.tsx hotkey + Toolbar disabled).
    // Belt-and-suspenders: if a request arrives while in walk mode, drop it.
    if (cameraMode === "walk") {
      useUIStore.getState().clearPendingPresetRequest();
      return;
    }
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) {
      // Scene not yet ready (OrbitControls mounts after Scene effect runs
      // on first render). Clear the request so it doesn't re-fire; the
      // user will have to click again — rare edge (only possible if
      // hotkey fires within ~1 frame of 3D view mount).
      useUIStore.getState().clearPendingPresetRequest();
      return;
    }
    const cam = ctrl.object as THREE.Camera;
    const pose = getPresetPose(pendingPresetRequest.id, room);
    if (prefersReducedMotion) {
      // D-04 + Phase 33 D-39: instant snap, no tween.
      cam.position.set(pose.position[0], pose.position[1], pose.position[2]);
      ctrl.target.set(pose.target[0], pose.target[1], pose.target[2]);
      ctrl.update();
      orbitPosRef.current = pose.position;
      orbitTargetRef.current = pose.target;
      presetTween.current = null;
      ctrl.enableDamping = true;
    } else {
      // Time-based tween. Capture `from` LIVE for cancel-and-restart (§1).
      const fromPos = cam.position.clone();
      const fromTarget = ctrl.target.clone();
      const toPos = new THREE.Vector3(...pose.position);
      const toTarget = new THREE.Vector3(...pose.target);
      ctrl.enableDamping = false; // imperative — avoids post-tween overshoot.
      presetTween.current = {
        fromPos,
        fromTarget,
        toPos,
        toTarget,
        startMs: performance.now(),
        durationMs: 600,
        presetId: pendingPresetRequest.id,
      };
    }
    useUIStore.getState().clearPendingPresetRequest();
  }, [pendingPresetRequest, cameraMode, prefersReducedMotion, room]);

  // Phase 46: consume pendingCameraTarget — mirrors Phase 35 pattern above.
  // Set by tree-row click via useUIStore.requestCameraTarget(position, target).
  // Reuses the same presetTween infrastructure for animation; D-39 reduced-motion
  // snap; D-04 cancel-and-restart-safe.
  useEffect(() => {
    if (!pendingCameraTarget) return;
    if (cameraMode === "walk") {
      useUIStore.getState().clearPendingCameraTarget();
      return;
    }
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) {
      useUIStore.getState().clearPendingCameraTarget();
      return;
    }
    const cam = ctrl.object as THREE.Camera;
    const { position, target } = pendingCameraTarget;
    if (prefersReducedMotion) {
      cam.position.set(position[0], position[1], position[2]);
      ctrl.target.set(target[0], target[1], target[2]);
      ctrl.update();
      orbitPosRef.current = position;
      orbitTargetRef.current = target;
      presetTween.current = null;
      ctrl.enableDamping = true;
    } else {
      const fromPos = cam.position.clone();
      const fromTarget = ctrl.target.clone();
      const toPos = new THREE.Vector3(...position);
      const toTarget = new THREE.Vector3(...target);
      ctrl.enableDamping = false;
      presetTween.current = {
        fromPos,
        fromTarget,
        toPos,
        toTarget,
        startMs: performance.now(),
        durationMs: 600,
        presetId: null,
      };
    }
    useUIStore.getState().clearPendingCameraTarget();
  }, [pendingCameraTarget, cameraMode, prefersReducedMotion, room]);

  // Smooth camera animation via useFrame.
  // Two mutually-exclusive branches: wall-side lerp (MIC-35) runs first,
  // preset tween (CAM-02) runs only when wall-side is idle.
  useFrame(() => {
    // --- wall-side branch (existing, unchanged) ---
    if (cameraAnimTarget.current) {
      const ctrl = orbitControlsRef.current;
      if (!ctrl?.object) return;
      const { pos, look } = cameraAnimTarget.current;
      const cam = ctrl.object as THREE.Camera;
      const speed = 0.08;
      cam.position.lerp(pos, speed);
      ctrl.target.lerp(look, speed);
      ctrl.update();
      // Stop when close enough
      if (cam.position.distanceTo(pos) < 0.05) {
        cam.position.copy(pos);
        ctrl.target.copy(look);
        ctrl.update();
        orbitPosRef.current = [pos.x, pos.y, pos.z];
        orbitTargetRef.current = [look.x, look.y, look.z];
        cameraAnimTarget.current = null;
      }
      return;
    }

    // --- preset-tween branch (Phase 35 CAM-02) ---
    const t = presetTween.current;
    if (!t) return;
    const ctrl = orbitControlsRef.current;
    if (!ctrl?.object) return;
    const elapsed = performance.now() - t.startMs;
    const raw = Math.min(elapsed / t.durationMs, 1);
    const eased = easeInOutCubic(raw);
    const cam = ctrl.object as THREE.Camera;
    cam.position.lerpVectors(t.fromPos, t.toPos, eased);
    ctrl.target.lerpVectors(t.fromTarget, t.toTarget, eased);
    ctrl.update();
    if (raw >= 1) {
      // Settle: snap to exact target, restore damping, clear tween.
      cam.position.copy(t.toPos);
      ctrl.target.copy(t.toTarget);
      ctrl.update();
      orbitPosRef.current = [t.toPos.x, t.toPos.y, t.toPos.z];
      orbitTargetRef.current = [t.toTarget.x, t.toTarget.y, t.toTarget.z];
      ctrl.enableDamping = true;
      presetTween.current = null;
    }
  });

  // Phase 59 CUTAWAY-01: per-frame cutaway-detection loop.
  // Gated on cutawayMode !== "off" + cameraMode !== "walk" (D-08).
  // viewMode gate is implicit — Scene only mounts in 3D / split (App.tsx).
  // Per-room iteration follows displayMode (D-03):
  //   normal: only activeRoomId
  //   solo:   only activeRoomId (the visible room)
  //   explode: every room in `rooms`
  // Setter is compare-then-set in uiStore — same value on consecutive frames
  // does NOT trigger React re-renders. Allocation budget for the loop is the
  // single `{x,y}` object returned by computeRoomBboxCenter per room per
  // frame (≤6 rooms × 60fps = 360 small objects/sec — negligible GC).
  useFrame(({ camera }) => {
    if (cutawayMode === "off") return;
    if (cameraMode === "walk") return;

    // Choose room set per displayMode (D-03).
    let roomIdsToScan: string[];
    if (displayMode === "explode") {
      roomIdsToScan = Object.keys(rooms);
    } else {
      roomIdsToScan = activeRoomId ? [activeRoomId] : [];
    }

    for (const roomId of roomIdsToScan) {
      const room = rooms[roomId];
      if (!room) continue;
      const wallsArray = Object.values(room.walls ?? {});
      const offsetX = roomOffsets[roomId] ?? 0;
      // Bbox center + wall coords are in room-LOCAL 2D space. The outward
      // normal is a DIRECTION, not a position — translation by offsetX does
      // not change it. Pass local center; sign test stays consistent.
      // (offsetX retained as the 4th arg for future "world-space sign test"
      // refactors; cutawayDetection currently treats it as documentation.)
      const localCenter = computeRoomBboxCenter(wallsArray);
      const { wallId } = getCutawayWallId(wallsArray, camera, localCenter, offsetX);
      setCutawayAutoDetectedWall(roomId, wallId);
    }
  });

  return (
    <>
      <Lighting />

      {/* Ambient PBR bounce — D-08 (bundled local HDR) */}
      <Suspense fallback={null}>
        <Environment files="/hdr/studio_small_09_1k.hdr" />
      </Suspense>

      {/* Floor grid helper — kept at Scene level (Pitfall 3, Phase 47 D-03) */}
      <gridHelper
        args={[Math.max(room.width, room.length), Math.max(room.width, room.length), "#9ca3af", "#d1d5db"]}
        position={[halfW, 0.01, halfL]}
      />

      {/* Phase 47 D-03/D-04/D-06: multi-room render branches.
          SOLO: render only active room at offsetX=0 (null activeRoomId → empty scene per D-06).
          NORMAL/EXPLODE: iterate all rooms with computed X-axis offsets. */}
      {displayMode === "solo"
        ? activeRoomId && rooms[activeRoomId]
          ? (
            <RoomGroup
              key={activeRoomId}
              roomDoc={rooms[activeRoomId]}
              offsetX={0}
              productLibrary={productLibrary}
              selectedIds={selectedIds}
              hiddenIds={hiddenIds}
              customCatalog={customCatalog}
            />
          )
          : null  /* D-06: SOLO + null/missing activeRoomId → empty scene */
        : Object.entries(rooms).map(([id, doc]) => (
            <RoomGroup
              key={id}
              roomDoc={doc}
              offsetX={roomOffsets[id] ?? 0}
              productLibrary={productLibrary}
              selectedIds={selectedIds}
              hiddenIds={hiddenIds}
              customCatalog={customCatalog}
            />
          ))}

      {cameraMode === "orbit" ? (
        <OrbitControls
          ref={orbitControlsRef}
          target={orbitTargetRef.current}
          // Polar 0 = camera directly above target (looks down); π/2 = horizontal;
          // π = directly below target (looks up). Allow ~60° of "look up" — enough
          // to see the ceiling without letting the camera flip or clip under the floor.
          maxPolarAngle={Math.PI * 0.85}
          minDistance={3}
          maxDistance={80}
          enableDamping
          dampingFactor={0.1}
          onChange={() => {
            const cam = orbitControlsRef.current?.object;
            const tgt = orbitControlsRef.current?.target;
            if (cam && tgt) {
              orbitPosRef.current = [cam.position.x, cam.position.y, cam.position.z];
              orbitTargetRef.current = [tgt.x, tgt.y, tgt.z];
            }
          }}
        />
      ) : (
        <>
          <PointerLockControls maxPolarAngle={Math.PI - 0.1} minPolarAngle={0.1} />
          <WalkCameraController />
        </>
      )}
    </>
  );
}

export default function ThreeViewport({ productLibrary }: Props) {
  const room = useActiveRoom() ?? { width: 20, length: 16, wallHeight: 8 };
  const cameraMode = useUIStore((s) => s.cameraMode);
  const halfW = room.width / 2;
  const halfL = room.length / 2;

  // Phase 54 PROPS3D-01: track canvas pointer-down position for drag-threshold check.
  const canvasDownPos = useRef<{ x: number; y: number } | null>(null);

  // Phase 54 PROPS3D-01: test driver for selection-state setup without testing the click path.
  useEffect(() => {
    if (import.meta.env.MODE !== "test" || typeof window === "undefined") return;
    (window as unknown as { __driveMeshSelect?: (id: string) => void }).__driveMeshSelect =
      (id: string) => useUIStore.getState().select([id]);
    return () => {
      delete (window as unknown as { __driveMeshSelect?: unknown }).__driveMeshSelect;
    };
  }, []);

  const [showToast, setShowToast] = useState(false);
  useEffect(() => {
    if (cameraMode === "walk") {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(t);
    } else {
      setShowToast(false);
    }
  }, [cameraMode]);

  return (
    <div className="w-full h-full bg-background relative">
      <Canvas
        shadows="soft"
        gl={{ preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        camera={{
          position: [halfW + 15, 12, halfL + 15],
          fov: 50,
          near: 0.1,
          far: 200,
        }}
        onContextMenu={(e: React.MouseEvent) => {
          // Phase 53 CTXMENU-01: empty-canvas right-click in 3D.
          // Only fires when no mesh handler called stopPropagation (D-03 empty-canvas case).
          e.preventDefault();
          useUIStore.getState().openContextMenu("empty", null, {
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onPointerDown={(e: React.PointerEvent) => {
          // Phase 54 PROPS3D-01: record down position for drag-threshold check on empty-space click.
          // D-02: only left button.
          if (e.button === 0) canvasDownPos.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMissed={(e: MouseEvent) => {
          // Phase 54 PROPS3D-01: left-click on empty 3D space deselects.
          // D-02: only fires when no mesh called e.stopPropagation() (confirmed by RESEARCH §2).
          // Drag-threshold guard: don't deselect after orbit-drag release.
          if (e.button === 0 && canvasDownPos.current) {
            if (isClick(canvasDownPos.current.x, canvasDownPos.current.y, e.clientX, e.clientY)) {
              useUIStore.getState().select([]);
            }
            canvasDownPos.current = null;
          }
        }}
      >
        <Scene productLibrary={productLibrary} />
      </Canvas>
      {showToast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 font-mono text-[12px] tracking-widest text-muted-foreground/80 bg-background/80 backdrop-blur-sm border border-border/50 rounded-sm pointer-events-none transition-opacity duration-500"
          style={{ opacity: showToast ? 1 : 0 }}
        >
          WALK MODE · WASD to move · Mouse to look · ESC to exit
        </div>
      )}
      {/* Phase 33 GH #86 — persistent gesture hint chip (3D variant).
          Rendered as DOM overlay sibling of the R3F Canvas, not inside the
          3D scene. */}
      <GestureChip mode="3d" />
    </div>
  );
}
