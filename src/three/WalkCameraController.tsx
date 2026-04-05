import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useCADStore } from "@/stores/cadStore";
import { canMoveTo } from "./walkCollision";

export const EYE_HEIGHT = 5.5; // feet — D-06
export const WALK_SPEED = 4; // ft/s — D-05
export const RUN_MULTIPLIER = 2; // Shift -> 8 ft/s — D-05

interface KeyState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
}

export default function WalkCameraController() {
  const { camera } = useThree();
  const room = useCADStore((s) => s.room);
  const wallsRecord = useCADStore((s) => s.walls);

  const keys = useRef<KeyState>({ forward: false, back: false, left: false, right: false, run: false });
  const didSpawn = useRef(false);

  // D-10: spawn at room center, eye level, yaw 0 — only on first mount
  useEffect(() => {
    if (!didSpawn.current) {
      camera.position.set(room.width / 2, EYE_HEIGHT, room.length / 2);
      camera.rotation.set(0, 0, 0);
      didSpawn.current = true;
    }
  }, [camera, room.width, room.length]);

  // D-05: keyboard listeners (WASD + arrows + Shift)
  useEffect(() => {
    const setKey = (e: KeyboardEvent, pressed: boolean) => {
      // Skip if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keys.current.forward = pressed;
      else if (k === "s" || k === "arrowdown") keys.current.back = pressed;
      else if (k === "a" || k === "arrowleft") keys.current.left = pressed;
      else if (k === "d" || k === "arrowright") keys.current.right = pressed;
      else if (k === "shift") keys.current.run = pressed;
    };
    const onDown = (e: KeyboardEvent) => setKey(e, true);
    const onUp = (e: KeyboardEvent) => setKey(e, false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      keys.current = { forward: false, back: false, left: false, right: false, run: false };
    };
  }, []);

  // D-05 + D-06 + D-07 + D-08: per-frame movement integration
  useFrame((_state, delta) => {
    const k = keys.current;
    const moving = k.forward || k.back || k.left || k.right;
    if (!moving) {
      // Still clamp Y to eye level in case something else moved it
      if (camera.position.y !== EYE_HEIGHT) camera.position.y = EYE_HEIGHT;
      return;
    }

    // Get horizontal look direction (yaw) from camera
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    if (dir.lengthSq() < 1e-6) return;
    dir.normalize();
    // Right vector = dir rotated -90° around Y
    const right = new THREE.Vector3(dir.z, 0, -dir.x);

    const speed = WALK_SPEED * (k.run ? RUN_MULTIPLIER : 1);
    const step = speed * delta;

    let dx = 0;
    let dz = 0;
    if (k.forward) { dx += dir.x; dz += dir.z; }
    if (k.back)    { dx -= dir.x; dz -= dir.z; }
    if (k.right)   { dx += right.x; dz += right.z; }
    if (k.left)    { dx -= right.x; dz -= right.z; }

    const mag = Math.sqrt(dx * dx + dz * dz);
    if (mag < 1e-6) return;
    dx = (dx / mag) * step;
    dz = (dz / mag) * step;

    const from = { x: camera.position.x, z: camera.position.z };
    const to = { x: from.x + dx, z: from.z + dz };
    const walls = Object.values(wallsRecord);
    const safe = canMoveTo(from, to, walls, room);

    camera.position.x = safe.x;
    camera.position.z = safe.z;
    camera.position.y = EYE_HEIGHT; // D-06 lock Y
  });

  return null;
}
