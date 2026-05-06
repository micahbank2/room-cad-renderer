// src/test-utils/measureDrivers.ts
// Phase 62 MEASURE-01 (D-15): window-level drivers for measure-line + annotation
// placement and introspection. Gated by import.meta.env.MODE === "test"; production no-op.
//
// Mirrors src/test-utils/openingDrivers.ts (Phase 61) registration pattern.

import { useCADStore } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";
import { polygonArea } from "@/lib/geometry";
import type { Point } from "@/types/cad";

declare global {
  interface Window {
    /** Place a measure line in the given room; returns the new measureLine id. */
    __drivePlaceMeasureLine?: (
      roomId: string,
      start: Point,
      end: Point,
    ) => string;
    /** Place a text annotation; returns the new annotation id. Empty text → mid-edit state. */
    __drivePlaceAnnotation?: (
      roomId: string,
      position: Point,
      text: string,
    ) => string;
    /** Read computed area (sq ft) for a room — 0 if non-closed loop. */
    __getRoomArea?: (roomId: string) => number;
    /** Count measure lines in a room. */
    __getMeasureLineCount?: (roomId: string) => number;
    /** Read an annotation's text (empty string when missing — mirrors getCustomElementLabel). */
    __getAnnotationText?: (roomId: string, annotationId: string) => string;
    /** Open the DOM-overlay annotation editor. */
    __openAnnotationEditor?: (annotationId: string) => void;
  }
}

export function installMeasureDrivers(): void {
  if (typeof window === "undefined") return;
  if (import.meta.env.MODE !== "test") return;

  window.__drivePlaceMeasureLine = (roomId, start, end) =>
    useCADStore.getState().addMeasureLine(roomId, { start, end });

  window.__drivePlaceAnnotation = (roomId, position, text) => {
    const id = useCADStore.getState().addAnnotation(roomId, { position, text: "" });
    if (text) {
      useCADStore.getState().updateAnnotation(roomId, id, { text });
    }
    return id;
  };

  window.__getRoomArea = (roomId) => {
    const doc = useCADStore.getState().rooms[roomId];
    return doc ? polygonArea(Object.values(doc.walls)) : 0;
  };

  window.__getMeasureLineCount = (roomId) =>
    Object.keys(useCADStore.getState().rooms[roomId]?.measureLines ?? {}).length;

  window.__getAnnotationText = (roomId, annotationId) =>
    useCADStore.getState().rooms[roomId]?.annotations?.[annotationId]?.text ?? "";

  window.__openAnnotationEditor = (annotationId) =>
    useUIStore.getState().setEditingAnnotationId(annotationId);
}

export {};
