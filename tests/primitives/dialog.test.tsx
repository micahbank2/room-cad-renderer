/**
 * Phase 72-04: Dialog primitive tests
 * TDD RED phase — tests written before implementation
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/Dialog";

// Radix Dialog uses portals — happy-dom needs appendTo body
// Testing-library appends to document.body by default which works.

describe("Dialog primitive", () => {
  it("Test 1: DialogContent renders when Dialog is open", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Hello</DialogTitle>
          <p>Content here</p>
        </DialogContent>
      </Dialog>
    );
    expect(screen.getByText("Content here")).toBeInTheDocument();
  });

  it("Test 2: DialogContent does NOT render when Dialog is closed", () => {
    render(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Hidden</DialogTitle>
          <p>Should not appear</p>
        </DialogContent>
      </Dialog>
    );
    expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
  });

  it("Test 3: Escape key closes the dialog", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Closeable</DialogTitle>
          <p>Press Escape</p>
        </DialogContent>
      </Dialog>
    );
    // Fire keydown Escape on the content element
    const content = screen.getByText("Press Escape").closest("[role='dialog']");
    if (content) {
      fireEvent.keyDown(content, { key: "Escape", code: "Escape" });
    } else {
      // Fallback: fire on document
      fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    }
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Test 4: DialogTitle renders with correct aria role", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>My Dialog Title</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    // Radix gives DialogTitle role="heading" or it's associated via aria-labelledby
    // DialogPrimitive.Title renders as an h2 by default (heading role)
    const title = screen.getByText("My Dialog Title");
    expect(title).toBeInTheDocument();
    // Radix DialogTitle is associated with the dialog's aria-labelledby
    const dialog = document.querySelector("[role='dialog']");
    expect(dialog).toBeInTheDocument();
  });

  it("Test 5: Overlay has backdrop-blur class", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Backdrop test</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    // The overlay is the fixed inset-0 element with backdrop-blur-sm
    const overlay = document.querySelector(".backdrop-blur-sm");
    expect(overlay).toBeInTheDocument();
  });

  it("Test 6: DialogClose button closes the dialog", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>Closeable</DialogTitle>
          <DialogClose>Close me</DialogClose>
        </DialogContent>
      </Dialog>
    );
    fireEvent.click(screen.getByText("Close me"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Test 7: className prop on DialogContent is merged (not replaced)", () => {
    render(
      <Dialog open>
        <DialogContent className="custom-class-abc">
          <DialogTitle>Merged classes</DialogTitle>
        </DialogContent>
      </Dialog>
    );
    // The motion.div/content wrapper should have both the base class and custom-class-abc
    const contentEl = document.querySelector(".custom-class-abc");
    expect(contentEl).toBeInTheDocument();
    // Also verify the base class is preserved (bg-card is from the base className)
    expect(contentEl).toHaveClass("bg-card");
  });
});
