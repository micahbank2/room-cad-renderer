// Phase 92 Plan 01 — RED tests for FeedbackDialog (FB-02..FB-08).
//
// Covers:
//   Test 1 (FB-02): Renders all form fields + buttons.
//   Test 2 (FB-03): Submit disabled until both Title + Description non-empty.
//   Test 3 (FB-04 + FB-05): Submit calls createGitHubIssue with prefixed title,
//                           auto-context-appended body, and mapped GH label.
//   Test 4 (FB-06): Success path — onOpenChange(false) + alert with issue URL.
//   Test 5 (FB-07): Failure path — dialog stays open, form preserved,
//                   inline error visible, console.error called.
//   Test 6 (FB-08): Missing VITE_FEEDBACK_GITHUB_TOKEN → "not configured"
//                   fallback message; no Submit button rendered.
//
// All tests MUST be RED on Task 1 commit — FeedbackDialog + createGitHubIssue
// don't exist yet.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the GitHub helper BEFORE importing FeedbackDialog (vi.mock is hoisted).
vi.mock("@/lib/githubFeedback", () => ({
  createGitHubIssue: vi.fn(),
  isFeedbackConfigured: vi.fn(() => true),
}));

import { FeedbackDialog } from "@/components/FeedbackDialog";
import {
  createGitHubIssue,
  isFeedbackConfigured,
} from "@/lib/githubFeedback";

const mockedCreateGitHubIssue = vi.mocked(createGitHubIssue);
const mockedIsFeedbackConfigured = vi.mocked(isFeedbackConfigured);

describe("FeedbackDialog — Phase 92 (FB-02..FB-08)", () => {
  let alertSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubEnv("VITE_FEEDBACK_GITHUB_TOKEN", "test-token-stub");
    vi.stubEnv("VITE_FEEDBACK_GITHUB_REPO", "test-owner/test-repo");

    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 900,
    });

    mockedIsFeedbackConfigured.mockReturnValue(true);
    mockedCreateGitHubIssue.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  function renderDialog(
    overrides: Partial<{
      open: boolean;
      onOpenChange: (open: boolean) => void;
      viewMode: "2d" | "3d" | "split" | "library";
    }> = {},
  ) {
    const onOpenChange = overrides.onOpenChange ?? vi.fn();
    const utils = render(
      <FeedbackDialog
        open={overrides.open ?? true}
        onOpenChange={onOpenChange}
        viewMode={overrides.viewMode ?? "3d"}
      />,
    );
    return { ...utils, onOpenChange };
  }

  it("FB-02: renders Title, Description, Type, footnote, Submit + Cancel", () => {
    renderDialog();

    // Title input (look for "Title" label/placeholder)
    const titleInput = screen.getByLabelText(/title/i);
    expect(titleInput).toBeInTheDocument();
    expect(titleInput.tagName.toLowerCase()).toBe("input");

    // Description textarea
    const descInput = screen.getByLabelText(/description/i);
    expect(descInput).toBeInTheDocument();
    expect(descInput.tagName.toLowerCase()).toBe("textarea");

    // Type selector — three labels must be present
    expect(screen.getByText(/^bug$/i)).toBeInTheDocument();
    expect(screen.getByText(/^suggestion$/i)).toBeInTheDocument();
    expect(screen.getByText(/^question$/i)).toBeInTheDocument();

    // Footnote linking to the public repo issues page
    const footnoteLink = screen.getByRole("link", {
      name: /github\.com\/micahbank2\/room-cad-renderer/i,
    });
    expect(footnoteLink).toBeInTheDocument();
    expect(footnoteLink.getAttribute("href")).toContain(
      "github.com/micahbank2/room-cad-renderer",
    );

    // Submit + Cancel buttons
    expect(
      screen.getByRole("button", { name: /send feedback/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument();
  });

  it("FB-03: Submit disabled until both Title and Description filled (trimmed)", async () => {
    const user = userEvent.setup();
    renderDialog();

    const submit = screen.getByRole("button", {
      name: /send feedback/i,
    }) as HTMLButtonElement;
    expect(submit).toBeDisabled();

    const titleInput = screen.getByLabelText(/title/i);
    const descInput = screen.getByLabelText(/description/i);

    // Fill Title only — still disabled
    await user.type(titleInput, "hello");
    expect(submit).toBeDisabled();

    // Fill Description too — enables
    await user.type(descInput, "world");
    expect(submit).not.toBeDisabled();

    // Clear Title — disables again
    await user.clear(titleInput);
    expect(submit).toBeDisabled();
  });

  it("FB-04 + FB-05: Submit posts prefixed title + auto-context body + 'bug' label", async () => {
    const user = userEvent.setup();
    mockedCreateGitHubIssue.mockResolvedValue({
      issueUrl: "https://github.com/foo/bar/issues/42",
      issueNumber: 42,
    });

    renderDialog({ viewMode: "3d" });

    await user.type(screen.getByLabelText(/title/i), "Bug report");
    await user.type(screen.getByLabelText(/description/i), "Broken");

    // "Bug" should be default — submit
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => {
      expect(mockedCreateGitHubIssue).toHaveBeenCalledTimes(1);
    });

    const payload = mockedCreateGitHubIssue.mock.calls[0][0];
    expect(payload.title).toBe("[Feedback] Bug report");
    expect(payload.labels).toEqual(["bug"]);

    expect(payload.body).toContain("Broken");
    expect(payload.body).toMatch(/app version/i);
    expect(payload.body).toMatch(/view mode:\s*3d/i);
    expect(payload.body).toMatch(/viewport/i);
    expect(payload.body).toMatch(/user agent/i);
  });

  it("FB-06: Success closes the dialog and surfaces the issue URL", async () => {
    const user = userEvent.setup();
    mockedCreateGitHubIssue.mockResolvedValue({
      issueUrl: "https://github.com/foo/bar/issues/42",
      issueNumber: 42,
    });

    const { onOpenChange } = renderDialog();

    await user.type(screen.getByLabelText(/title/i), "Bug report");
    await user.type(screen.getByLabelText(/description/i), "Broken");
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    expect(alertSpy).toHaveBeenCalled();
    const alertText = String(alertSpy.mock.calls[0][0] ?? "");
    expect(alertText).toContain("https://github.com/foo/bar/issues/42");
  });

  it("FB-07: Failure keeps the dialog open with form values + inline error", async () => {
    const user = userEvent.setup();
    mockedCreateGitHubIssue.mockRejectedValue(new Error("403 rate limit"));

    const { onOpenChange } = renderDialog();

    const titleInput = screen.getByLabelText(/title/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(/description/i) as HTMLTextAreaElement;

    await user.type(titleInput, "Bug report");
    await user.type(descInput, "Broken");
    await user.click(screen.getByRole("button", { name: /send feedback/i }));

    await waitFor(() => {
      expect(mockedCreateGitHubIssue).toHaveBeenCalled();
    });

    // Dialog stays open: onOpenChange(false) NOT called
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    // Form values preserved
    expect(titleInput.value).toBe("Bug report");
    expect(descInput.value).toBe("Broken");

    // Inline error visible
    expect(screen.getByText(/couldn't send/i)).toBeInTheDocument();

    // console.error logged
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("FB-08: Missing token → 'not configured' fallback; no Submit button", () => {
    mockedIsFeedbackConfigured.mockReturnValue(false);

    renderDialog();

    expect(screen.getByText(/feedback isn't configured/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send feedback/i }),
    ).not.toBeInTheDocument();
  });
});
