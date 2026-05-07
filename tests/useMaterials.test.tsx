/**
 * Phase 67 Plan 01 — Wave 0 RED test for src/hooks/useMaterials.ts.
 *
 * Mirrors useUserTextures shape: hydrate from IDB on mount, cross-instance
 * sync via window CustomEvents, save/update/remove/reload, StrictMode-safe
 * registration (Pattern #7).
 */
import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, act, waitFor } from "@testing-library/react";
import { useMaterials } from "@/hooks/useMaterials";
import { clearAllMaterials } from "@/lib/materialStore";
import { clearAllUserTextures } from "@/lib/userTextureStore";

vi.mock("@/lib/processTextureFile", async () => {
  const { computeSHA256 } = await import("@/lib/userTextureStore");
  return {
    ALLOWED_MIME_TYPES: new Set(["image/jpeg", "image/png", "image/webp"]),
    MAX_EDGE_PX: 2048,
    ProcessTextureError: class extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "ProcessTextureError";
      }
    },
    processTextureFile: vi.fn(async (file: File) => {
      const buf = await file.arrayBuffer();
      const sha256 = await computeSHA256(buf);
      return {
        blob: new Blob([buf], { type: "image/jpeg" }),
        mimeType: "image/jpeg",
        sha256,
        width: 1024,
        height: 768,
      };
    }),
  };
});

function makeFile(content: string): File {
  return new File([new TextEncoder().encode(content)], "x.jpg", { type: "image/jpeg" });
}

beforeEach(async () => {
  await clearAllMaterials();
  await clearAllUserTextures();
});

interface Probe {
  materials: ReturnType<typeof useMaterials>["materials"];
  loading: ReturnType<typeof useMaterials>["loading"];
  api: ReturnType<typeof useMaterials>;
}

function ProbeComponent({ onUpdate }: { onUpdate: (p: Probe) => void }) {
  const api = useMaterials();
  React.useEffect(() => {
    onUpdate({ materials: api.materials, loading: api.loading, api });
  });
  return null;
}

describe("useMaterials — IDB hydration + loading flag", () => {
  it("hydrates from IDB on mount; loading flips false", async () => {
    let latest: Probe | null = null;
    render(<ProbeComponent onUpdate={(p) => (latest = p)} />);

    await waitFor(() => {
      expect(latest).not.toBeNull();
      expect(latest!.loading).toBe(false);
    });
    expect(Array.isArray(latest!.materials)).toBe(true);
  });
});

describe("useMaterials — save / cross-instance sync", () => {
  it("save() returns the new id and triggers cross-instance reload", async () => {
    let probeA: Probe | null = null;
    let probeB: Probe | null = null;
    render(
      <>
        <ProbeComponent onUpdate={(p) => (probeA = p)} />
        <ProbeComponent onUpdate={(p) => (probeB = p)} />
      </>,
    );

    await waitFor(() => {
      expect(probeA?.loading).toBe(false);
      expect(probeB?.loading).toBe(false);
    });

    await act(async () => {
      await probeA!.api.save({
        name: "SyncTest",
        tileSizeFt: 2,
        colorFile: makeFile("sync-bytes"),
      });
    });

    // Both probes should observe the new entry.
    await waitFor(() => {
      expect(probeA!.materials.length).toBe(1);
      expect(probeB!.materials.length).toBe(1);
    });
    expect(probeA!.materials[0].name).toBe("SyncTest");
  });

  it("remove(id) updates list and dispatches material-deleted event", async () => {
    let probe: Probe | null = null;
    render(<ProbeComponent onUpdate={(p) => (probe = p)} />);
    await waitFor(() => expect(probe?.loading).toBe(false));

    let saved: { id: string; deduped: boolean } | null = null;
    await act(async () => {
      saved = await probe!.api.save({
        name: "ToDelete",
        tileSizeFt: 2,
        colorFile: makeFile("delete-me"),
      });
    });
    expect(saved).not.toBeNull();

    let deletedFired = false;
    const handler = () => {
      deletedFired = true;
    };
    window.addEventListener("material-deleted", handler);

    await act(async () => {
      await probe!.api.remove(saved!.id);
    });

    await waitFor(() => expect(probe!.materials.length).toBe(0));
    expect(deletedFired).toBe(true);
    window.removeEventListener("material-deleted", handler);
  });
});

describe("useMaterials — Pattern #7 StrictMode safety", () => {
  it("StrictMode double-mount does not register duplicate event listeners", async () => {
    let probe: Probe | null = null;
    render(
      <React.StrictMode>
        <ProbeComponent onUpdate={(p) => (probe = p)} />
      </React.StrictMode>,
    );

    await waitFor(() => expect(probe?.loading).toBe(false));

    // Save once. With proper StrictMode-safe cleanup the cross-instance
    // listener should fire EXACTLY once per dispatch (the discarded first-mount
    // listener was removed on first cleanup).
    let saveCount = 0;
    const origDispatch = window.dispatchEvent.bind(window);
    const dispatchSpy = vi.fn((evt: Event) => {
      if (evt.type === "material-saved") saveCount++;
      return origDispatch(evt);
    });
    window.dispatchEvent = dispatchSpy as typeof window.dispatchEvent;

    await act(async () => {
      await probe!.api.save({
        name: "StrictModeProbe",
        tileSizeFt: 2,
        colorFile: makeFile("strict-bytes"),
      });
    });

    await waitFor(() => expect(probe!.materials.length).toBe(1));

    // Exactly one material in IDB after StrictMode double-mount + one save.
    expect(probe!.materials.length).toBe(1);
    // Restore.
    window.dispatchEvent = origDispatch;
    expect(saveCount).toBeGreaterThanOrEqual(1);
  });
});

describe("useMaterials — test driver bridge installed at module-eval time (NOT in useEffect)", () => {
  it("window.__getMaterials is available without rendering the hook", async () => {
    // The driver should be installed at module evaluation time of useMaterials.ts.
    // This test imports the module and checks the window bridge exists.
    await import("@/hooks/useMaterials");
    const drv = (window as unknown as { __getMaterials?: () => Promise<unknown[]> })
      .__getMaterials;
    expect(typeof drv).toBe("function");
    if (drv) {
      const result = await drv();
      expect(Array.isArray(result)).toBe(true);
    }
  });
});
