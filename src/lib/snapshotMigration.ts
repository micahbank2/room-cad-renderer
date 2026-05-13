import type { CADSnapshot, RoomDoc, LegacySnapshotV1, FloorMaterial } from "@/types/cad";
import { computeSHA256, saveUserTextureWithDedup } from "@/lib/userTextureStore";
import {
  findPaintMaterialByHex,
  saveMaterialDirect,
  saveMaterialWithDedup,
} from "@/lib/materialStore";
import { resolvePaintHex } from "@/lib/colorUtils";
import type { PaintColor } from "@/types/paint";

export function defaultSnapshot(): CADSnapshot {
  // Phase 62 MEASURE-01 (D-02): seed `measureLines: {}` and `annotations: {}`
  // alongside the Phase 60 `stairs: {}` seed so consumers don't need to
  // defensively check for undefined on freshly-created rooms.
  const mainRoom: RoomDoc = {
    id: "room_main",
    name: "Main Room",
    room: { width: 20, length: 16, wallHeight: 8 },
    walls: {},
    placedProducts: {},
    stairs: {},
    measureLines: {},
    annotations: {},
  };
  return {
    version: 8,
    rooms: { room_main: mainRoom },
    activeRoomId: "room_main",
  };
}

/** Phase 17: wrap legacy singleton treatments in { A, B } shape. Mutates in place. */
function migrateWallsPerSide(rooms: Record<string, RoomDoc> | undefined): void {
  if (!rooms) return;
  for (const doc of Object.values(rooms)) {
    if (!doc?.walls) continue;
    for (const wall of Object.values(doc.walls)) {
      const w = wall as any;
      // Wallpaper: detect legacy singleton (has .kind)
      if (w.wallpaper && typeof w.wallpaper === "object" && "kind" in w.wallpaper) {
        w.wallpaper = { A: w.wallpaper };
      }
      // Wainscoting: detect legacy (has .enabled)
      if (w.wainscoting && typeof w.wainscoting === "object" && "enabled" in w.wainscoting) {
        w.wainscoting = { A: w.wainscoting };
      }
      // Crown: same pattern
      if (w.crownMolding && typeof w.crownMolding === "object" && "enabled" in w.crownMolding) {
        w.crownMolding = { A: w.crownMolding };
      }
      // WallArt items: default missing side to "A"
      if (Array.isArray(w.wallArt)) {
        for (const art of w.wallArt) {
          if (!art.side) art.side = "A";
        }
      }
    }
  }
}

export function migrateSnapshot(raw: unknown): CADSnapshot {
  // Phase 81 IA-03 (D-04): v8 passthrough — already at current.
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 8 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
  // Phase 81 IA-03 (D-04): v7 inputs flow through migrateV7ToV8 (passthrough — name is optional).
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 7 &&
    (raw as CADSnapshot).rooms
  ) {
    return migrateV7ToV8(raw as CADSnapshot);
  }
  // Phase 68 MAT-APPLY-01: v6 passthrough (handed to migrateV5ToV6 / migrateV6ToV7 in cadStore pipeline).
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 6 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
  // Phase 62 MEASURE-01 (D-02): v5 passthrough.
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 5 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
  // Phase 60 STAIRS-01 (D-12): v4 passthrough (handed to migrateV4ToV5 in cadStore pipeline).
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 4 &&
    (raw as CADSnapshot).rooms
  ) {
    return raw as CADSnapshot;
  }
  // Phase 60 STAIRS-01 (D-12): v3 → v4 — seed `stairs: {}` per RoomDoc.
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 3 &&
    (raw as CADSnapshot).rooms
  ) {
    const snap = raw as CADSnapshot;
    for (const doc of Object.values(snap.rooms)) {
      if (!(doc as RoomDoc).stairs) {
        (doc as RoomDoc).stairs = {};
      }
    }
    (snap as { version: number }).version = 4;
    return snap;
  }
  // v2 passthrough
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { version?: number }).version === 2 &&
    (raw as CADSnapshot).rooms
  ) {
    const snap = raw as CADSnapshot;
    migrateWallsPerSide(snap.rooms);
    return snap;
  }
  // v1 legacy shape
  if (
    raw &&
    typeof raw === "object" &&
    "room" in raw &&
    "walls" in (raw as Record<string, unknown>)
  ) {
    const legacy = raw as LegacySnapshotV1;
    const mainRoom: RoomDoc = {
      id: "room_main",
      name: "Main Room",
      room: legacy.room,
      walls: legacy.walls ?? {},
      placedProducts: legacy.placedProducts ?? {},
    };
    const rooms = { room_main: mainRoom };
    migrateWallsPerSide(rooms);
    return {
      // Returned at v2 — downstream pipeline (migrateFloorMaterials → v3,
      // migrateV3ToV4 → v4, migrateV4ToV5 → v5, migrateV5ToV6 → v6) lifts to v6.
      version: 2 as unknown as 6,
      rooms,
      activeRoomId: "room_main",
    };
  }
  // unknown / empty
  return defaultSnapshot();
}

/**
 * Phase 51 — DEBT-05: migrate a single FloorMaterial entry from the legacy
 * { kind: "custom", imageUrl: "data:..." } shape to { kind: "user-texture", userTextureId }.
 * On any failure, preserves the original entry (graceful degradation per D-03).
 */
async function migrateOneFloorMaterial(mat: FloorMaterial): Promise<FloorMaterial> {
  if (mat.kind !== "custom" || !(mat as any).imageUrl?.startsWith("data:")) return mat;
  try {
    const imageUrl = (mat as any).imageUrl as string;
    const commaIdx = imageUrl.indexOf(",");
    if (commaIdx === -1) throw new Error("no comma in data URL");
    const header = imageUrl.slice(5, commaIdx);
    const mimeType = header.split(";")[0] || "image/jpeg";
    const b64 = imageUrl.slice(commaIdx + 1);
    if (!b64) throw new Error("empty base64 payload");
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType });
    const sha256 = await computeSHA256(bytes.buffer);
    const { id } = await saveUserTextureWithDedup(
      { name: "Imported Floor", tileSizeFt: mat.scaleFt ?? 4, blob, mimeType },
      sha256,
    );
    return { kind: "user-texture", userTextureId: id, scaleFt: mat.scaleFt, rotationDeg: mat.rotationDeg };
  } catch (err) {
    console.warn("[Phase51] FloorMaterial migration failed — entry preserved as legacy:", err);
    return mat;
  }
}

/**
 * Phase 51 — DEBT-05: async migration pass. Runs AFTER migrateSnapshot (sync v1→v2).
 * Converts any { kind: "custom", imageUrl: "data:..." } FloorMaterial to
 * { kind: "user-texture", userTextureId } via the SHA-256 dedup IDB pipeline.
 * Idempotent: v3+ snapshots are returned immediately with no IDB calls.
 *
 * Contract: ends at version 3 (Phase 51 boundary). Phase 60 v3 → v4 stair
 * migration runs separately via migrateV3ToV4() so the Phase 51 floorMaterial
 * test fixtures (which assert `version === 3` post-migration) keep working.
 */
export async function migrateFloorMaterials(snap: CADSnapshot): Promise<CADSnapshot> {
  if (snap.version >= 3) return snap; // idempotency gate — v3+ already past Phase 51
  for (const doc of Object.values(snap.rooms)) {
    if (doc?.floorMaterial) {
      (doc as any).floorMaterial = await migrateOneFloorMaterial(doc.floorMaterial as FloorMaterial);
    }
  }
  (snap as { version: number }).version = 3;
  return snap;
}

/**
 * Phase 60 STAIRS-01 (D-12): v3 → v4 — seed `stairs: {}` per RoomDoc.
 *
 * Runs AFTER migrateFloorMaterials in the cadStore.loadSnapshot pipeline.
 * Idempotent: v4 inputs returned unchanged.
 *
 * Why a separate function (vs. inlining into migrateSnapshot or
 * migrateFloorMaterials):
 *   - migrateSnapshot is synchronous and handles raw → v2 (or passthrough);
 *     it would short-circuit when given a v2 input.
 *   - migrateFloorMaterials must end at v3 to preserve the Phase 51 test
 *     contract (D-17 zero-regression).
 *   - The cadStore pipeline runs migrateSnapshot → migrateFloorMaterials →
 *     migrateV3ToV4 in sequence so a v2 snapshot reaches v4 cleanly.
 */
export function migrateV3ToV4(snap: CADSnapshot): CADSnapshot {
  if ((snap as { version: number }).version >= 4) return snap;
  for (const doc of Object.values(snap.rooms)) {
    if (!(doc as RoomDoc).stairs) (doc as RoomDoc).stairs = {};
  }
  (snap as { version: number }).version = 4;
  return snap;
}

/**
 * Phase 62 MEASURE-01 (D-02): v4 → v5 — seed `measureLines: {}` and
 * `annotations: {}` per RoomDoc.
 *
 * Runs AFTER migrateV3ToV4 in the cadStore.loadSnapshot pipeline.
 * Idempotent: v5 inputs returned unchanged.
 *
 * Mirrors the Phase 60 v3→v4 8-line template exactly.
 */
export function migrateV4ToV5(snap: CADSnapshot): CADSnapshot {
  if ((snap as { version: number }).version >= 5) return snap;
  for (const doc of Object.values(snap.rooms)) {
    if (!(doc as RoomDoc).measureLines) (doc as RoomDoc).measureLines = {};
    if (!(doc as RoomDoc).annotations) (doc as RoomDoc).annotations = {};
  }
  (snap as { version: number }).version = 5;
  return snap;
}

/* ------------------------------------------------------------------------- *
 * Phase 68 MAT-APPLY-01 — v5 → v6 surface Material migration.
 *
 * Converts pre-v6 surface assignments (legacy `wallpaper`, `floorMaterial`,
 * ceiling `paintId/surfaceMaterialId/userTextureId/material`) into Material
 * references (`wall.materialIdA/B`, `room.floorMaterialId`, `ceiling.materialId`).
 *
 * Idempotency gate: v6 inputs returned untouched (no IDB calls).
 * Per-entity try/catch: any helper failure preserves the legacy field and logs
 * a `[Phase68]` warn — the legacy fallback chain in the renderers picks it up.
 *
 * Mirrors the Phase 51 async pre-pass pattern: runs BEFORE produce() in
 * cadStore.loadSnapshot so Immer never sees an in-flight promise.
 * ------------------------------------------------------------------------- */

/**
 * Synthesize a 1×1 PNG `File` colored with the given hex. Used by paint
 * Material migration to feed the dedup pipeline (saveMaterialWithDedup
 * requires a colorFile). 1px is sufficient: the renderer reads paint
 * Materials as a flat color from `colorHex`, never from the texture map.
 */
function paintHexToFile(hex: string): File {
  const clean = hex.replace(/^#/, "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // Minimal 1x1 PNG byte sequence with the given RGBA pixel.
  // Build via canvas if available (browser/jsdom), fall back to a fixed PNG.
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(0, 0, 1, 1);
      // toDataURL is synchronous and available in jsdom.
      const dataUrl = c.toDataURL("image/png");
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new File([bytes], `paint-${clean}.png`, { type: "image/png" });
    }
  }
  // Fallback: tiny opaque PNG (single pixel, channel-agnostic). Hex is in the
  // filename so dedup keys still differ per color (filename → SHA via
  // processTextureFile downstream).
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // signature
  ]);
  return new File([bytes], `paint-${clean}.png`, { type: "image/png" });
}

/**
 * Migrate a single Wallpaper entry to a Material id. Returns "" when no
 * Material can be produced (e.g. pattern with neither userTextureId nor a
 * recoverable data URL — caller skips writing materialIdX, legacy field
 * remains as fallback per D-01).
 *
 * Throws on IDB failure — caller wraps in try/catch + warn.
 */
async function migrateWallpaperToMaterial(
  wp: any,
  customPaints: PaintColor[],
): Promise<string> {
  if (!wp || typeof wp !== "object") return "";

  // PAINT — explicit paintId reference. Resolve to hex via colorUtils.
  if (wp.kind === "paint" && wp.paintId) {
    const hex = resolvePaintHex(wp.paintId, customPaints);
    return await savePaintMaterialDeduped(hex, `Paint ${hex}`);
  }

  // COLOR — direct hex.
  if (wp.kind === "color" && typeof wp.color === "string") {
    return await savePaintMaterialDeduped(wp.color, `Paint ${wp.color}`);
  }

  // PATTERN — userTextureId is the v1.17 happy path.
  if (wp.kind === "pattern" && wp.userTextureId) {
    const tileSizeFt = typeof wp.scaleFt === "number" ? wp.scaleFt : 1;
    const mat = await saveMaterialDirect({
      name: "Migrated wallpaper",
      tileSizeFt,
      colorMapId: wp.userTextureId,
    });
    return mat.id;
  }

  // PATTERN with legacy data-URL only — Phase 51 should have already converted
  // these on the floor side, but wallpapers were never migrated. Defer to v1.18:
  // log a warn and let the legacy `wallpaper.imageUrl` field render via fallback.
  if (wp.kind === "pattern" && typeof wp.imageUrl === "string") {
    // eslint-disable-next-line no-console
    console.warn(
      "[Phase68] legacy data-URL wallpaper not auto-migrated; user must reapply",
    );
    return "";
  }

  return "";
}

/**
 * Save (or dedup) a paint Material for `hex`. Funnels through
 * `saveMaterialWithDedup` so the IDB-failure contract test can mock it,
 * but tolerates the jsdom-only `DECODE_FAILED` (which fires because
 * happy-dom/jsdom ship neither `createImageBitmap` nor `OffscreenCanvas`).
 * On `DECODE_FAILED` we fall back to a direct write — paint Materials don't
 * need a texture map, so the synthesized 1×1 PNG was only there to give the
 * dedup pipeline something to chew. Other errors (e.g. mocked `idb down`)
 * propagate up to the caller's try/catch which preserves legacy + warns.
 */
async function savePaintMaterialDeduped(hex: string, name: string): Promise<string> {
  // 1. Reuse existing paint Material when one already wraps this hex.
  const existing = await findPaintMaterialByHex(hex);
  if (existing) return existing.id;

  // 2. Funnel a synthesized 1×1 File through the dedup pipeline. This is the
  //    call the failure-mode test mocks; on rejection (other than DECODE_FAILED
  //    in jsdom test envs), our caller catches and preserves legacy.
  let id: string | undefined;
  try {
    const file = paintHexToFile(hex);
    const result = await saveMaterialWithDedup({
      name,
      tileSizeFt: 1,
      colorFile: file,
    });
    id = result.id;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code !== "DECODE_FAILED") {
      // Real failure (e.g. IDB down) — propagate so caller preserves legacy.
      throw err;
    }
    // jsdom can't decode; fall through to direct write.
  }

  // 3. Stamp colorHex (paint short-circuit). Reuse the dedup-allocated id when
  //    saveMaterialWithDedup succeeded; otherwise let saveMaterialDirect mint
  //    a fresh `mat_*` id.
  const mat = await saveMaterialDirect({
    id,
    name,
    tileSizeFt: 1,
    colorHex: hex.toLowerCase(),
  });
  return mat.id;
}

/**
 * Migrate a single FloorMaterial entry to a Material id. PRESET ids pass
 * through unchanged (catalog id is its own materialId namespace per
 * RESEARCH Open Question 6).
 */
async function migrateFloorMaterialToMaterialId(fm: FloorMaterial): Promise<string> {
  if (!fm) return "";
  if (fm.kind === "preset" && fm.presetId) {
    return fm.presetId; // catalog id namespace — resolver looks up SURFACE_MATERIALS
  }
  if (fm.kind === "user-texture" && (fm as any).userTextureId) {
    const tileSizeFt = typeof fm.scaleFt === "number" ? fm.scaleFt : 1;
    const mat = await saveMaterialDirect({
      name: "Migrated floor",
      tileSizeFt,
      colorMapId: (fm as any).userTextureId,
    });
    return mat.id;
  }
  // kind === "custom" with leftover data URL — Phase 51 already migrated these
  // to "user-texture"; if any leak through, log + skip.
  // eslint-disable-next-line no-console
  console.warn("[Phase68] floor migration skipped — unrecognized FloorMaterial shape");
  return "";
}

/**
 * Migrate a single Ceiling entry to a Material id. Priority order matches
 * CeilingMesh's existing legacy fallback chain (userTextureId → surfaceMaterialId
 * → paintId → legacy `material` string).
 */
async function migrateCeilingToMaterialId(c: any, customPaints: PaintColor[]): Promise<string> {
  if (!c) return "";

  // 1. userTextureId wins.
  if (c.userTextureId) {
    const tileSizeFt = typeof c.scaleFt === "number" ? c.scaleFt : 1;
    const mat = await saveMaterialDirect({
      name: "Migrated ceiling",
      tileSizeFt,
      colorMapId: c.userTextureId,
    });
    return mat.id;
  }
  // 2. surfaceMaterialId — preset namespace passthrough.
  if (typeof c.surfaceMaterialId === "string" && c.surfaceMaterialId) {
    return c.surfaceMaterialId;
  }
  // 3. paintId — resolve hex.
  if (typeof c.paintId === "string" && c.paintId) {
    const hex = resolvePaintHex(c.paintId, customPaints);
    return await savePaintMaterialDeduped(hex, `Paint ${hex}`);
  }
  // 4. Legacy `material` string — `#hex` paint or preset id.
  if (typeof c.material === "string" && c.material) {
    if (c.material.startsWith("#")) {
      return await savePaintMaterialDeduped(c.material, `Paint ${c.material}`);
    }
    return c.material; // assume preset id
  }
  return "";
}

/**
 * Phase 68 MAT-APPLY-01: v5 → v6 entry point. Asynchronous (matches
 * `migrateFloorMaterials` so cadStore.loadSnapshot can keep its single
 * async-pre-pass + produce() shape).
 */
export async function migrateV5ToV6(snap: CADSnapshot): Promise<CADSnapshot> {
  if ((snap as { version: number }).version >= 6) return snap;
  const customPaints: PaintColor[] = (snap as any).customPaints ?? [];

  for (const doc of Object.values(snap.rooms ?? {}) as RoomDoc[]) {
    // 1. Floor.
    const docAny = doc as any;
    if (docAny.floorMaterial && !docAny.floorMaterialId) {
      try {
        const id = await migrateFloorMaterialToMaterialId(docAny.floorMaterial as FloorMaterial);
        if (id) docAny.floorMaterialId = id;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Phase68] floor migration failed — entry preserved as legacy: ${(err as Error)?.message ?? String(err)}`,
        );
      }
    }

    // 2. Walls — per side.
    for (const wall of Object.values(docAny.walls ?? {}) as any[]) {
      const wp = wall.wallpaper;
      if (!wp) continue;
      for (const side of ["A", "B"] as const) {
        const w = wp[side];
        if (!w) continue;
        const field = side === "A" ? "materialIdA" : "materialIdB";
        if (wall[field]) continue; // idempotency — already migrated
        try {
          const id = await migrateWallpaperToMaterial(w, customPaints);
          if (id) wall[field] = id;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[Phase68] wallpaper migration failed — entry preserved as legacy: ${(err as Error)?.message ?? String(err)}`,
          );
        }
      }
    }

    // 3. Ceilings.
    for (const c of Object.values(docAny.ceilings ?? {}) as any[]) {
      if (c.materialId) continue; // idempotency
      try {
        const id = await migrateCeilingToMaterialId(c, customPaints);
        if (id) c.materialId = id;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[Phase68] ceiling migration failed — entry preserved as legacy: ${(err as Error)?.message ?? String(err)}`,
        );
      }
    }

    // 4. Custom elements — D-07: faceMaterials starts empty per-placement,
    //    no migration. Existing `color` field continues rendering until the
    //    user explicitly applies a Material to a face.
  }

  (snap as { version: number }).version = 6;
  return snap;
}

/* ----------------------------------------------------------------- *
 * Phase 69 MAT-LINK-01 — v6 → v7. Trivial passthrough: adds optional
 * PlacedProduct.finishMaterialId. Old snapshots that lack the field
 * render with catalog default (correct legacy behavior).
 * Mirrors the Phase 62 v4→v5 template — pure version bump, no per-room
 * seeding required.
 * ----------------------------------------------------------------- */
export function migrateV6ToV7(snap: CADSnapshot): CADSnapshot {
  if ((snap as { version: number }).version >= 7) return snap;
  (snap as { version: number }).version = 7;
  return snap;
}

/* ----------------------------------------------------------------- *
 * Phase 81 IA-03 (D-04) — v7 → v8. Trivial passthrough: adds optional
 * WallSegment.name. Absence renders the default cardinal label via
 * wallCardinalLabel(), so legacy v7 walls have correct behavior with
 * no data transformation. Pure version bump — matches the Phase 69
 * v6→v7 + Phase 62 v4→v5 template.
 * ----------------------------------------------------------------- */
export function migrateV7ToV8(snap: CADSnapshot): CADSnapshot {
  if ((snap as { version: number }).version >= 8) return snap;
  (snap as { version: number }).version = 8;
  return snap;
}
