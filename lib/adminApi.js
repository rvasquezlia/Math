/**
 * lib/adminApi.js
 * ────────────────
 * Client for the Admin CMS commit endpoint (oauth-proxy/worker.js: POST /commit).
 * The Worker verifies the caller's signed session token and role, then commits
 * the change to the repo using a token that only ever lives on the Worker.
 */

// Strip any trailing slash so a proxy URL configured either way ("...workers.dev"
// or "...workers.dev/") produces the same "/commit" path, never "//commit".
const OAUTH_PROXY_URL = (process.env.NEXT_PUBLIC_OAUTH_PROXY_URL ?? "").replace(/\/+$/, "");

async function commit(user, body) {
  if (!OAUTH_PROXY_URL) {
    throw new Error("NEXT_PUBLIC_OAUTH_PROXY_URL is not configured.");
  }
  if (!user?.token) {
    throw new Error("Your session has no admin token — try signing out and back in.");
  }

  const res = await fetch(`${OAUTH_PROXY_URL}/commit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data;
}

export function createTopic(user, gradeSlug, subjectSlug, topic) {
  return commit(user, { action: "create", gradeSlug, subjectSlug, topic });
}

export function updateTopic(user, gradeSlug, subjectSlug, topic) {
  return commit(user, { action: "update", gradeSlug, subjectSlug, topic });
}

export function deleteTopic(user, gradeSlug, subjectSlug, topicSlug) {
  return commit(user, { action: "delete", gradeSlug, subjectSlug, topicSlug });
}
