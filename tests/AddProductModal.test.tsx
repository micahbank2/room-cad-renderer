import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AddProductModal from "@/components/AddProductModal";

describe("AddProductModal Skip Dimensions (LIB-04)", () => {
  it("renders Skip dimensions checkbox", () => {
    render(<AddProductModal onAdd={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Skip dimensions")).toBeTruthy();
  });

  it("toggling Skip greys out dimension inputs", () => {
    const { container } = render(<AddProductModal onAdd={vi.fn()} onClose={vi.fn()} />);
    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(container.querySelector(".opacity-40.pointer-events-none")).toBeTruthy();
  });

  it("submit with skipDims=true calls onAdd with null dims", () => {
    const onAdd = vi.fn();
    render(<AddProductModal onAdd={onAdd} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/EAMES/i), { target: { value: "Test" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByText("Add to registry"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      width: null, depth: null, height: null, name: "Test",
    }));
  });

  it("submit with skipDims=false calls onAdd with numeric dims", () => {
    const onAdd = vi.fn();
    const { container } = render(<AddProductModal onAdd={onAdd} onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/EAMES/i), { target: { value: "Test" } });
    // Explicitly set W/D/H — do not rely on component useState defaults.
    // Order within the dimensions grid: [0]=width, [1]=depth, [2]=height.
    const numberInputs = container.querySelectorAll('input[type="number"]');
    fireEvent.change(numberInputs[0], { target: { value: "4" } });
    fireEvent.change(numberInputs[1], { target: { value: "2.5" } });
    fireEvent.change(numberInputs[2], { target: { value: "3" } });
    fireEvent.click(screen.getByText("Add to registry"));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      width: 4, depth: 2.5, height: 3,
    }));
  });
});
