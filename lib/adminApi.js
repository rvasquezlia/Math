/**
 * lib/adminApi.js
 * ────────────────
 * Client for the Cloudflare Worker's POST /commit endpoint
 * (oauth-proxy/worker.js). The Worker holds the actual GitHub write-token
 * and commits changes to the repo; there's no login/auth on this endpoint
 * -- the admin UI that calls it is gated by a simple client-side password
 * prompt (see app/contexts/AuthContext.js), not real server-side auth.
 */

// Strip any trailing slash so the proxy URL configured either way ("...workers.dev"
// or "...workers.dev/") produces the same path, never a double slash.
const PROXY_URL = (process.env.NEXT_PUBLIC_OAUTH_PROXY_URL ?? "").replace(/\/+$/, "");

async function commit(body) {
  if (!PROXY_URL) {
    throw new Error("NEXT_PUBLIC_OAUTH_PROXY_URL is not configured.");
  }

  const res = await fetch(`${PROXY_URL}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export function createTopic(gradeSlug, subjectSlug, topic) {
  return commit({ action: "create", gradeSlug, subjectSlug, topic });
}

export function updateTopic(gradeSlug, subjectSlug, topic) {
  return commit({ action: "update", gradeSlug, subjectSlug, topic });
}

export function deleteTopic(gradeSlug, subjectSlug, topicSlug) {
  return commit({ action: "delete", gradeSlug, subjectSlug, topicSlug });
}

export function savePageContent(gradeSlug, subjectSlug, topicSlug, pageSlug, html) {
  return commit({ action: "update-page", gradeSlug, subjectSlug, topicSlug, pageSlug, html });
}
