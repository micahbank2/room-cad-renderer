import { describe, it, expect, beforeEach } from "vitest";
import { clientToFeet, attachDragDropHandlers, DRAG_MIME } from "@/canvas/dragDrop";
import { useCADStore, resetCADStoreForTests } from "@/stores/cadStore";
import { useUIStore } from "@/stores/uiStore";

function activeDoc() {
  const s = useCADStore.getState();
  return s.rooms[s.activeRoomId!];
}

// Minimal DataTransfer polyfill for jsdom (does not implement it natively).
class MockDataTransfer {
  private store = new Map<string, string>();
  dropEffect = "none";
  effectAllowed = "all";
  get types() { return Array.from(this.store.keys()); }
  setData(type: string, data: string) { this.store.set(type, data); }
  getData(type: string) { return this.store.get(type) ?? ""; }
}
function makeDropEvent(
  type: string,
  init: { clientX: number; clientY: number; dt: MockDataTransfer }
): DragEvent {
  const ev = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(ev, "clientX", { value: init.clientX });
  Object.defineProperty(ev, "clientY", { value: init.clientY });
  Object.defineProperty(ev, "dataTransfer", { value: init.dt });
  return ev;
}

beforeEach(() => {
  resetCADStoreForTests();
  useUIStore.setState({ selectedIds: [], gridSnap: 0.5 });
});

describe("drag-drop placement", () => {
  it("coord translation: clientX/Y minus rect + origin divided by scale yields feet", () => {
    const feet = clientToFeet(150, 250, { left: 50, top: 100 }, 10, { x: 20, y: 30 });
    expect(feet.x).toBe((150 - 50 - 20) / 10); // 8
    expect(feet.y).toBe((250 - 100 - 30) / 10); // 12
  });

  it("snap + place: dropped point snaps to grid then calls placeProduct", () => {
    const wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
    // Force a getBoundingClientRect by setting layout
    wrapper.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

    const cleanup = attachDragDropHandlers(wrapper, () => ({ scale: 10, origin: { x: 0, y: 0 } }));

    const dt = new MockDataTransfer();
    dt.setData(DRAG_MIME, "prod_xyz");
    wrapper.dispatchEvent(makeDropEvent("drop", { clientX: 32, clientY: 47, dt }));

    const products = Object.values(activeDoc().placedProducts);
    expect(products).toHaveLength(1);
    // clientToFeet -> (32/10, 47/10) = (3.2, 4.7); snap 0.5 -> (3.0, 4.5)
    expect(products[0].position).toEqual({ x: 3.0, y: 4.5 });
    expect(products[0].productId).toBe("prod_xyz");
    cleanup();
    wrapper.remove();
  });

  it("auto-select: newly placed product id is set in uiStore.selectedIds", () => {
    const wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
    wrapper.getBoundingClientRect = () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;
    const cleanup = attachDragDropHandlers(wrapper, () => ({ scale: 10, origin: { x: 0, y: 0 } }));

    const dt = new MockDataTransfer();
    dt.setData(DRAG_MIME, "prod_xyz");
    wrapper.dispatchEvent(makeDropEvent("drop", { clientX: 10, clientY: 10, dt }));

    const selected = useUIStore.getState().selectedIds;
    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatch(/^pp_/);
    const placedIds = Object.keys(activeDoc().placedProducts);
    expect(selected[0]).toBe(placedIds[0]);
    cleanup();
    wrapper.remove();
  });
});
