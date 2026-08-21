/**
 * oauth-proxy/worker.js
 * ────────────────────────────────────────────────────────────────────
 * Cloudflare Worker backend for the LIA Math Curriculum site (a static
 * Next.js export hosted on GitHub Pages, which cannot run any server
 * code of its own). This Worker does two jobs:
 *
 * 1. GET  /  ?code=...   — GitHub OAuth token exchange (sign-in).
 *    Exchanges the code for an access token, fetches the user's GitHub
 *    profile + verified email, derives their role from config/roles.json,
 *    and returns a short-lived signed session token alongside the profile.
 *
 * 2. POST /commit        — Admin CMS actions (create/update/delete topic).
 *    Requires the signed session token from step 1 as a Bearer token.
 *    Verifies the caller's role, then commits the change directly to
 *    content/taxonomy.json (and, for new topics, placeholder lesson HTML
 *    files) using a repo-scoped GitHub token held only as a Worker secret
 *    — the browser never sees a token with write access to the repo.
 *
 * Required Worker secrets (set via `wrangler secret put`, never in code):
 *   GITHUB_CLIENT_ID       — OAuth App client ID
 *   GITHUB_CLIENT_SECRET   — OAuth App client secret
 *   SESSION_SECRET         — random string used to sign session tokens
 *   GITHUB_REPO_TOKEN      — fine-grained PAT, contents:write on this repo only
 *
 * Worker vars (see wrangler.toml):
 *   ALLOWED_ORIGIN, REPO_OWNER, REPO_NAME, REPO_BRANCH
 */

import rolesConfig from "../config/roles.json";

const GH_API = "https://api.github.com";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

// ── CORS ─────────────────────────────────────────────────────────────────

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin && allowedOrigin !== "*" ? allowedOrigin : (origin ?? "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

function json(data, status, cors) {
  return Response.json(data, { status, headers: cors });
}

// ── Role derivation (mirrors app/contexts/AuthContext.js) ──────────────────

function deriveRole(email) {
  if (!email) return null;
  const lower = email.toLowerCase();
  const { admins = [], editors = [], allowedDomains = [] } = rolesConfig.roles;

  if (admins.map((e) => e.toLowerCase()).includes(lower)) return "admin";
  if (editors.map((e) => e.toLowerCase()).includes(lower)) return "editor";

  const domain = lower.split("@")[1] ?? "";
  if (allowedDomains.map((d) => d.toLowerCase()).includes(domain)) return "student";

  return null;
}

// ── Session tokens (HMAC-signed, not encrypted — payload is not secret) ────

function base64url(bytes) {
  let str = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  return atob(padded);
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signSessionToken(payload, secret) {
  const body = base64url(JSON.stringify(payload));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${base64url(sig)}`;
}

/** Returns the verified payload, or null if missing/invalid/expired. */
async function verifySessionToken(token, secret) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const key = await hmacKey(secret);
  const expectedSigBytes = Uint8Array.from(base64urlDecode(sig), (c) => c.charCodeAt(0));
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    expectedSigBytes,
    new TextEncoder().encode(body),
  );
  if (!valid) return null;
  let payload;
  try {
    payload = JSON.parse(base64urlDecode(body));
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

// ── GitHub content helpers ──────────────────────────────────────────────

function ghHeaders(token, extra) {
  return {
    Authorization: "token " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "lia-math-oauth-proxy",
    ...extra,
  };
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

async function getFile(env, path) {
  const url = `${GH_API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${path}?ref=${env.REPO_BRANCH}`;
  const res = await fetch(url, { headers: ghHeaders(env.GITHUB_REPO_TOKEN) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed for ${path}: ${res.status}`);
  const data = await res.json();
  return { sha: data.sha, content: decodeURIComponent(escape(atob(data.content))) };
}

async function putFile(env, path, content, message, sha, committer) {
  const res = await fetch(
    `${GH_API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}/contents/${path}`,
    {
      method: "PUT",
      headers: ghHeaders(env.GITHUB_REPO_TOKEN, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        message,
        content: utf8ToBase64(content),
        branch: env.REPO_BRANCH,
        ...(sha ? { sha } : {}),
        ...(committer ? { author: committer, committer } : {}),
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub write failed for ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

function placeholderLessonHtml(topicTitle, pageLabel) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${topicTitle} · ${pageLabel}</title>
<link rel="stylesheet" href="/Math/Lessons/lesson-shared.css" />
</head>
<body>
<main class="lesson">
  <h1>${topicTitle} — ${pageLabel}</h1>
  <p><em>This page was scaffolded from the Admin CMS and doesn't have content yet. Edit this file to add the lesson.</em></p>
</main>
</body>
</html>
`;
}

// ── taxonomy.json mutation ──────────────────────────────────────────────

function findSubjectTopics(taxonomyData, gradeSlug, subjectSlug) {
  const grade = taxonomyData.grades.find((g) => g.slug === gradeSlug);
  const subject = grade?.subjects.find((s) => s.slug === subjectSlug);
  return subject?.topics ?? null;
}

async function handleCommit(request, env, cors) {
  const secret = env.SESSION_SECRET;
  const payload = await verifySessionToken(bearerToken(request), secret);
  if (!payload) return json({ error: "unauthorized" }, 401, cors);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400, cors);
  }

  const { action, gradeSlug, subjectSlug, topic, topicSlug } = body;
  if (!["create", "update", "delete"].includes(action)) {
    return json({ error: "invalid action" }, 400, cors);
  }
  if (!["admin", "editor"].includes(payload.role)) {
    return json({ error: "forbidden" }, 403, cors);
  }
  if (action === "delete" && payload.role !== "admin") {
    return json({ error: "only admins can delete topics" }, 403, cors);
  }
  if (!gradeSlug || !subjectSlug) {
    return json({ error: "missing gradeSlug/subjectSlug" }, 400, cors);
  }

  const file = await getFile(env, "content/taxonomy.json");
  if (!file) return json({ error: "content/taxonomy.json not found" }, 500, cors);
  const taxonomyData = JSON.parse(file.content);

  const topics = findSubjectTopics(taxonomyData, gradeSlug, subjectSlug);
  if (!topics) return json({ error: "grade/subject not found" }, 404, cors);

  const committer = { name: payload.name || payload.login, email: payload.email };
  let commitMessage;

  if (action === "create") {
    if (!topic?.slug) return json({ error: "missing topic" }, 400, cors);
    if (topics.some((t) => t.slug === topic.slug)) {
      return json({ error: "a topic with this slug already exists" }, 409, cors);
    }
    topics.push(topic);
    commitMessage = `Admin CMS: create topic "${topic.title}" (${gradeSlug}/${subjectSlug})`;
  } else if (action === "update") {
    if (!topic?.slug) return json({ error: "missing topic" }, 400, cors);
    const idx = topics.findIndex((t) => t.slug === topic.slug);
    if (idx === -1) return json({ error: "topic not found" }, 404, cors);
    topics[idx] = topic;
    commitMessage = `Admin CMS: update topic "${topic.title}" (${gradeSlug}/${subjectSlug})`;
  } else {
    if (!topicSlug) return json({ error: "missing topicSlug" }, 400, cors);
    const idx = topics.findIndex((t) => t.slug === topicSlug);
    if (idx === -1) return json({ error: "topic not found" }, 404, cors);
    const [removed] = topics.splice(idx, 1);
    commitMessage = `Admin CMS: delete topic "${removed.title}" (${gradeSlug}/${subjectSlug})`;
  }

  await putFile(
    env,
    "content/taxonomy.json",
    JSON.stringify(taxonomyData, null, 2) + "\n",
    commitMessage,
    file.sha,
    committer,
  );

  // Scaffold placeholder HTML for any brand-new page so its link doesn't 404.
  if (action === "create" && Array.isArray(topic.pages)) {
    for (const page of topic.pages) {
      if (!page.sourcePath) continue;
      const existing = await getFile(env, page.sourcePath).catch(() => null);
      if (existing) continue;
      await putFile(
        env,
        page.sourcePath,
        placeholderLessonHtml(topic.title, page.label ?? page.title),
        `Admin CMS: scaffold ${page.label ?? page.title} for "${topic.title}"`,
        undefined,
        committer,
      );
    }
  }

  return json({ ok: true, message: commitMessage }, 200, cors);
}

// ── OAuth token exchange (sign-in) ──────────────────────────────────────

async function handleOAuthExchange(request, env, cors) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return json({ error: "missing code" }, 400, cors);

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "OAuth credentials not configured on the proxy" }, 500, cors);
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });
  if (!tokenRes.ok) return json({ error: "token exchange failed" }, 502, cors);

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return json({ error: tokenData.error_description ?? "no access_token" }, 400, cors);
  }

  const profileRes = await fetch(GH_API + "/user", { headers: ghHeaders(accessToken) });
  if (!profileRes.ok) return json({ error: "failed to fetch profile" }, 502, cors);
  const profile = await profileRes.json();

  let email = profile.email ?? "";
  if (!email) {
    const emailRes = await fetch(GH_API + "/user/emails", { headers: ghHeaders(accessToken) });
    if (emailRes.ok) {
      const emails = await emailRes.json();
      const primary = emails.find((e) => e.primary && e.verified);
      email = primary?.email ?? emails[0]?.email ?? "";
    }
  }

  const role = deriveRole(email);
  let sessionToken = null;
  if (role) {
    const now = Math.floor(Date.now() / 1000);
    sessionToken = await signSessionToken(
      {
        login: profile.login,
        name: profile.name ?? profile.login,
        email,
        role,
        iat: now,
        exp: now + SESSION_TTL_SECONDS,
      },
      env.SESSION_SECRET,
    );
  }

  return json(
    {
      login: profile.login,
      name: profile.name ?? profile.login,
      email,
      avatar_url: profile.avatar_url ?? "",
      sessionToken,
    },
    200,
    cors,
  );
}

// ── Router ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Normalize away accidental double slashes (e.g. a trailing slash on the
    // configured proxy URL producing "//commit") so routing is robust either way.
    const pathname = new URL(request.url).pathname.replace(/\/+/g, "/");

    try {
      if (pathname === "/commit" && request.method === "POST") {
        return await handleCommit(request, env, cors);
      }
      return await handleOAuthExchange(request, env, cors);
    } catch (err) {
      return json({ error: err.message ?? "internal error" }, 500, cors);
    }
  },
};
