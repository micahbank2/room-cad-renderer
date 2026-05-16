// Phase 92 Plan 01 — In-app feedback dialog (FB-01..FB-08).
//
// Opens from HelpModal → "Send feedback" footer button. Collects a Title,
// Description, and Type (Bug / Suggestion / Question), appends auto-collected
// triage context (app version, viewport, view mode, theme, user agent), and
// POSTs to the GitHub Issues REST API via @/lib/githubFeedback.
//
// Decisions referenced (see .planning/phases/92-feedback-dialog/92-CONTEXT.md):
//   D-02: GitHub Issues destination
//   D-03: VITE_FEEDBACK_GITHUB_TOKEN + VITE_FEEDBACK_GITHUB_REPO env vars
//   D-05: Form layout — Title input, Description textarea, Type segmented
//         control, footnote link to public repo issues page
//   D-06: Loading + error states (Sending… spinner, inline error, alert
//         fallback on success since no toast primitive ships yet)
//   D-15: lucide-react only for icons
//   D-39: useReducedMotion gates the Loader2 spin animation

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTheme } from "@/hooks/useTheme";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import {
  createGitHubIssue,
  isFeedbackConfigured,
} from "@/lib/githubFeedback";
import pkg from "../../package.json";

const APP_VERSION = (pkg as { version?: string }).version ?? "0.0.0";

const TYPE_OPTIONS = [
  { value: "Bug", label: "Bug" },
  { value: "Suggestion", label: "Suggestion" },
  { value: "Question", label: "Question" },
] as const;

const TYPE_TO_LABEL: Record<string, string> = {
  Bug: "bug",
  Suggestion: "enhancement",
  Question: "question",
};

export interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: "2d" | "3d" | "split" | "library";
}

export function FeedbackDialog({
  open,
  onOpenChange,
  viewMode,
}: FeedbackDialogProps): JSX.Element {
  const configured = isFeedbackConfigured();
  const { resolved: resolvedTheme } = useTheme();
  const reducedMotion = useReducedMotion();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("Bug");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // FB-08: missing-token fallback. Render Dialog with a single Cancel
  // affordance so the user gets a clear "not broken — just no destination"
  // signal instead of a confused disabled-submit state.
  if (!configured) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[480px] max-w-[90vw]">
          <DialogTitle>Feedback</DialogTitle>
          <DialogDescription className="mt-2">
            Feedback isn't configured yet — contact the developer.
          </DialogDescription>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const canSubmit =
    title.trim().length > 0 && description.trim().length > 0 && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);
    setIsSubmitting(true);

    const viewport =
      typeof window !== "undefined"
        ? `${window.innerWidth}×${window.innerHeight}`
        : "unknown";
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : "unknown";

    const fullBody =
      `${description.trim()}\n\n---\n` +
      `**Context (auto-collected):**\n` +
      `- App version: ${APP_VERSION}\n` +
      `- Viewport: ${viewport}\n` +
      `- View mode: ${viewMode}\n` +
      `- Theme: ${resolvedTheme}\n` +
      `- User agent: ${userAgent}\n`;

    const ghLabel = TYPE_TO_LABEL[type] ?? "bug";

    try {
      const result = await createGitHubIssue({
        title: `[Feedback] ${title.trim()}`,
        body: fullBody,
        labels: [ghLabel],
      });
      setIsSubmitting(false);
      // Reset form so a reopened dialog starts fresh.
      setTitle("");
      setDescription("");
      setType("Bug");
      onOpenChange(false);
      // TODO Phase 93: replace alert() with proper Toast primitive (D-06).
      window.alert(
        `Feedback sent. View it on GitHub: ${result.issueUrl}`,
      );
    } catch (err) {
      setIsSubmitting(false);
      setErrorMsg("Couldn't send — try again or contact the developer.");
      // eslint-disable-next-line no-console
      console.error("Feedback submit failed:", err);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[480px] max-w-[90vw]">
        <DialogTitle>Send feedback</DialogTitle>
        <DialogDescription className="sr-only">
          Send a bug report, suggestion, or question. Creates a public GitHub
          issue.
        </DialogDescription>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="feedback-title"
              className="font-sans text-[12px] font-medium text-muted-foreground"
            >
              Title
            </label>
            <input
              id="feedback-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Short summary"
              className={
                "h-9 w-full rounded-smooth-md border border-border bg-background " +
                "px-3 text-[13px] font-sans text-foreground transition-colors " +
                "placeholder:text-muted-foreground focus-visible:outline-none " +
                "focus-visible:ring-1 focus-visible:ring-ring"
              }
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label
              htmlFor="feedback-description"
              className="font-sans text-[12px] font-medium text-muted-foreground"
            >
              Description
            </label>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened or what would help?"
              className={
                "w-full rounded-smooth-md border border-border bg-background " +
                "px-3 py-2 text-[13px] font-sans text-foreground transition-colors " +
                "placeholder:text-muted-foreground focus-visible:outline-none " +
                "focus-visible:ring-1 focus-visible:ring-ring resize-y"
              }
            />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <label className="font-sans text-[12px] font-medium text-muted-foreground">
              Type
            </label>
            <SegmentedControl
              value={type}
              onValueChange={setType}
              options={[...TYPE_OPTIONS]}
            />
          </div>

          {/* Footnote with public link */}
          <p className="font-sans text-[11px] text-muted-foreground">
            This will create a public issue at{" "}
            <a
              href="https://github.com/micahbank2/room-cad-renderer/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-2 hover:text-accent-foreground"
            >
              github.com/micahbank2/room-cad-renderer
            </a>
            .
          </p>

          <DialogFooter>
            <div className="flex flex-col items-end gap-2 w-full">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  disabled={!canSubmit}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2
                        size={14}
                        className={reducedMotion ? "" : "animate-spin"}
                      />
                      Sending…
                    </>
                  ) : (
                    <>
                      <MessageSquare size={14} />
                      Send feedback
                    </>
                  )}
                </Button>
              </div>
              {errorMsg && (
                <p
                  role="alert"
                  className="font-sans text-[12px] text-destructive"
                >
                  {errorMsg}
                </p>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default FeedbackDialog;
