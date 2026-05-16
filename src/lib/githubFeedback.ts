// Phase 92 Plan 01 — GitHub Issues API helper for the in-app feedback dialog.
//
// Reads VITE_FEEDBACK_GITHUB_TOKEN (PAT with `public_repo` scope) and
// VITE_FEEDBACK_GITHUB_REPO (defaults to "micahbank2/room-cad-renderer").
//
// D-02 / D-03 / FB-04 / FB-08:
//   - Missing token → isFeedbackConfigured() returns false; createGitHubIssue
//     throws synchronously-rejected promise with a recognizable message so
//     the dialog can fall back to "not configured" before submit even runs.
//   - On 201, returns { issueUrl, issueNumber }.
//   - On any non-201, throws an Error with status + body excerpt; caller
//     surfaces an inline error and logs to console.

export interface CreateGitHubIssueInput {
  title: string;
  body: string;
  labels: string[];
}

export interface CreateGitHubIssueResult {
  issueUrl: string;
  issueNumber: number;
}

const DEFAULT_REPO = "micahbank2/room-cad-renderer";

function getToken(): string {
  const t = import.meta.env.VITE_FEEDBACK_GITHUB_TOKEN;
  return typeof t === "string" ? t : "";
}

function getRepo(): string {
  const r = import.meta.env.VITE_FEEDBACK_GITHUB_REPO;
  return typeof r === "string" && r.length > 0 ? r : DEFAULT_REPO;
}

/**
 * Returns true iff a non-empty VITE_FEEDBACK_GITHUB_TOKEN is configured.
 * FB-08: gates the dialog form vs. fallback "not configured" message.
 */
export function isFeedbackConfigured(): boolean {
  return getToken().length > 0;
}

/**
 * POST /repos/{owner}/{repo}/issues — creates a new GitHub issue.
 *
 * Throws on missing token, non-201 response, or network failure.
 * Returns { issueUrl, issueNumber } on success.
 */
export async function createGitHubIssue(
  input: CreateGitHubIssueInput,
): Promise<CreateGitHubIssueResult> {
  const token = getToken();
  if (!token) {
    throw new Error("Feedback is not configured");
  }
  const repo = getRepo();
  const url = `https://api.github.com/repos/${repo}/issues`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      labels: input.labels,
    }),
  });

  if (res.status !== 201) {
    let excerpt = "";
    try {
      const text = await res.text();
      excerpt = text.slice(0, 200);
    } catch {
      /* ignore body read errors */
    }
    throw new Error(
      `GitHub Issues API returned ${res.status} ${res.statusText}: ${excerpt}`,
    );
  }

  const payload = (await res.json()) as {
    html_url?: string;
    number?: number;
  };
  if (typeof payload.html_url !== "string" || typeof payload.number !== "number") {
    throw new Error("GitHub Issues API returned 201 with unexpected payload shape");
  }

  return {
    issueUrl: payload.html_url,
    issueNumber: payload.number,
  };
}
