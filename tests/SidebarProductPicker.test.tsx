import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, createEvent } from "@testing-library/react";

vi.mock("idb-keyval", () => ({
  get: vi.fn(() => Promise.resolve(undefined)),
  set: vi.fn(() => Promise.resolve()),
  del: vi.fn(() => Promise.resolve()),
  keys: vi.fn(() => Promise.resolve([])),
  values: vi.fn(() => Promise.resolve([])),
  clear: vi.fn(() => Promise.resolve()),
  createStore: vi.fn(() => ({})),
}));

import SidebarProductPicker from "@/components/SidebarProductPicker";
import { useProductStore } from "@/stores/productStore";
import { DRAG_MIME } from "@/canvas/dragDrop";
import type { Product } from "@/types/product";

const fixture = (id: string, name: string): Product => ({
  id, name, category: "Other",
  width: 2, depth: 2, height: 2,
  material: "", imageUrl: "", textureUrls: [],
});

beforeEach(() => {
  useProductStore.setState({
    products: [fixture("p1", "Eames Lounge Chair"), fixture("p2", "Oak Desk")],
    loaded: true,
  });
});

describe("SidebarProductPicker (LIB-05)", () => {
  it("renders SEARCH... input", () => {
    render(<SidebarProductPicker />);
    expect(screen.getByPlaceholderText("SEARCH...")).toBeTruthy();
  });

  it("typing 'eames' filters to Eames product (case-insensitive)", () => {
    render(<SidebarProductPicker />);
    fireEvent.change(screen.getByPlaceholderText("SEARCH..."), { target: { value: "eames" } });
    const rows = screen.getAllByTestId("picker-row");
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain("EAMES LOUNGE CHAIR");
  });

  it("empty search shows all products", () => {
    render(<SidebarProductPicker />);
    const rows = screen.getAllByTestId("picker-row");
    expect(rows).toHaveLength(2);
  });

  it("dragstart sets DRAG_MIME to product id", () => {
    render(<SidebarProductPicker />);
    const row = screen.getAllByTestId("picker-row")[0];
    const setData = vi.fn();
    fireEvent.dragStart(row, { dataTransfer: { setData, effectAllowed: "" } });
    expect(setData).toHaveBeenCalledWith(DRAG_MIME, "p1");
  });

  it("dragstart sets effectAllowed to copy", () => {
    render(<SidebarProductPicker />);
    const row = screen.getAllByTestId("picker-row")[0];
    // happy-dom's DragEvent creates its own DataTransfer that ignores the
    // `init.dataTransfer` argument passed via fireEvent. Override the
    // event's dataTransfer property directly so the component's
    // `e.dataTransfer.effectAllowed = "copy"` write lands on our spy.
    const dt = { setData: vi.fn(), effectAllowed: "" };
    const event = createEvent.dragStart(row);
    Object.defineProperty(event, "dataTransfer", { value: dt, writable: false });
    fireEvent(row, event);
    expect(dt.effectAllowed).toBe("copy");
  });
});
