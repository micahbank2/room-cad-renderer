import { describe, it, expect } from "vitest";
import { formatExportFilename } from "@/lib/exportFilename";

describe("exportFilename (SAVE-03)", () => {
  it("formatExportFilename: Date 2026-04-04T23:15 yields room-20260404-2315.png", () => {
    // Local time constructor: new Date(y, m-1, d, h, mi)
    const d = new Date(2026, 3, 4, 23, 15);
    expect(formatExportFilename(d)).toBe("room-20260404-2315.png");
  });

  it("formatExportFilename: pads single-digit month/day/hour/minute with leading zeros", () => {
    const d = new Date(2026, 0, 5, 3, 7); // Jan 5, 03:07
    expect(formatExportFilename(d)).toBe("room-20260105-0307.png");
  });

  it("formatExportFilename: uses local time components, not UTC", () => {
    // Build a date that differs from UTC; verify output matches local getters.
    const d = new Date(2026, 5, 15, 14, 30); // June 15, 14:30 local
    const expected =
      "room-" +
      d.getFullYear().toString() +
      (d.getMonth() + 1).toString().padStart(2, "0") +
      d.getDate().toString().padStart(2, "0") +
      "-" +
      d.getHours().toString().padStart(2, "0") +
      d.getMinutes().toString().padStart(2, "0") +
      ".png";
    expect(formatExportFilename(d)).toBe(expected);
  });
});
