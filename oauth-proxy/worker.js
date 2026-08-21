/**
 * oauth-proxy/worker.js
 * ────────────────────────────────────────────────────────────────────
 * Cloudflare Worker backend for the LIA Math Curriculum site (a static
 * Next.js export hosted on GitHub Pages, which cannot run any server
 * code of its own, and so cannot safely hold a GitHub write-token
 * itself). This Worker's only job:
 *
 * POST /commit — Admin CMS actions (create/update/delete topic, edit page
 * content). Commits the change directly to content/taxonomy.json (and
 * lesson HTML files) using a repo-scoped GitHub token held only as a
 * Worker secret -- the browser never sees that token.
 *
 * There is no login/session verification here on purpose: the admin UI on
 * the site is gated by a simple client-side password prompt (not real
 * auth), and this endpoint trusts whatever it's sent. Its URL isn't
 * published anywhere public-facing besides the site's own bundled JS.
 *
 * Required Worker secret (set via `wrangler secret put`, never in code):
 *   GITHUB_REPO_TOKEN   — fine-grained PAT, contents:write on this repo only
 *
 * Worker vars (see wrangler.toml):
 *   ALLOWED_ORIGIN, REPO_OWNER, REPO_NAME, REPO_BRANCH
 */

const GH_API = "https://api.github.com";

// ── CORS ─────────────────────────────────────────────────────────────────

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin && allowedOrigin !== "*" ? allowedOrigin : (origin ?? "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(data, status, cors) {
  return Response.json(data, { status, headers: cors });
}

// ── GitHub content helpers ──────────────────────────────────────────────

function ghHeaders(token, extra) {
  return {
    Authorization: "token " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "lia-math-admin-worker",
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

async function ghJson(env, method, path, body) {
  const res = await fetch(`${GH_API}/repos/${env.REPO_OWNER}/${env.REPO_NAME}${path}`, {
    method,
    headers: ghHeaders(env.GITHUB_REPO_TOKEN, { "Content-Type": "application/json" }),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${method} ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/**
 * Commit any number of files in a single atomic commit via the Git Data API
 * (blobs -> tree -> commit -> ref update). One commit means one push event,
 * so one Pages deploy -- unlike doing a Contents-API PUT per file, which
 * fires a separate push (and a separate, competing Pages deployment) for
 * every single file and can leave GitHub Pages' own deployment lock stuck,
 * causing the *real* final deploy to fail outright.
 */
async function commitFiles(env, files, message) {
  const branch = env.REPO_BRANCH;
  const ref = await ghJson(env, "GET", `/git/ref/heads/${branch}`);
  const headSha = ref.object.sha;
  const headCommit = await ghJson(env, "GET", `/git/commits/${headSha}`);

  const treeItems = await Promise.all(
    files.map(async ({ path, content }) => {
      const blob = await ghJson(env, "POST", "/git/blobs", {
        content: utf8ToBase64(content),
        encoding: "base64",
      });
      return { path, mode: "100644", type: "blob", sha: blob.sha };
    }),
  );

  const tree = await ghJson(env, "POST", "/git/trees", {
    base_tree: headCommit.tree.sha,
    tree: treeItems,
  });

  const commit = await ghJson(env, "POST", "/git/commits", {
    message,
    tree: tree.sha,
    parents: [headSha],
  });
  await ghJson(env, "PATCH", `/git/refs/heads/${branch}`, { sha: commit.sha });
  return commit;
}

/** Relative "../" prefix from a Lessons/-relative sourcePath back up to Lessons/. */
function relativeToLessonsRoot(sourcePath) {
  const segments = sourcePath.split("/"); // ["Lessons", grade, "Topics", topic, ...maybe "practice", "file.html"]
  const depth = segments.length - 2; // drop "Lessons" and the filename
  return "../".repeat(Math.max(depth, 1));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Scaffolds a brand-new page in the same branded shell every hand-built
 * lesson page uses (Montserrat, brand header, badge, lesson-shared.css),
 * as a starting point for the HTML editor. */
function placeholderLessonHtml(sourcePath, topicTitle, pageLabel) {
  const rel = relativeToLessonsRoot(sourcePath);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(topicTitle)} - ${escapeHtml(pageLabel)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}lesson-shared.css">
<script src="${rel}lesson-shared.js"></script>
</head>
<body>
<div class="app-container">
  <header>
    <div class="brand-row">
      <img src="${rel}assets/lia-logo.png" alt="Lincoln International Academy logo" class="brand-logo">
      <span class="brand-name">Lincoln International Academy</span>
    </div>
    <span class="badge">${escapeHtml(topicTitle)} - ${escapeHtml(pageLabel)}</span>
    <h1>${escapeHtml(pageLabel)}</h1>
  </header>
  <div class="panel active">
    <p><em>This page was scaffolded from the Admin CMS and doesn't have content yet. Use "Edit Content" to write the lesson.</em></p>
  </div>
</div>
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

async function handleUpdatePageContent(body, env, cors) {
  const { gradeSlug, subjectSlug, topicSlug, pageSlug, html } = body;
  if (!gradeSlug || !subjectSlug || !topicSlug || !pageSlug) {
    return json({ error: "missing gradeSlug/subjectSlug/topicSlug/pageSlug" }, 400, cors);
  }
  if (typeof html !== "string" || !html.trim()) {
    return json({ error: "missing html" }, 400, cors);
  }

  const file = await getFile(env, "content/taxonomy.json");
  if (!file) return json({ error: "content/taxonomy.json not found" }, 500, cors);
  const taxonomyData = JSON.parse(file.content);

  const topics = findSubjectTopics(taxonomyData, gradeSlug, subjectSlug);
  if (!topics) return json({ error: "grade/subject not found" }, 404, cors);
  const topicNode = topics.find((t) => t.slug === topicSlug);
  if (!topicNode) return json({ error: "topic not found" }, 404, cors);
  const pageNode = topicNode.pages.find((p) => p.slug === pageSlug);
  if (!pageNode || !pageNode.sourcePath) return json({ error: "page not found" }, 404, cors);

  const pageLabel = pageNode.label ?? pageNode.title;
  const commitMessage = `Admin CMS: edit content for "${topicNode.title}" - ${pageLabel} (${gradeSlug}/${subjectSlug})`;

  // The editor sends the complete HTML document as the teacher wrote it --
  // no server-side wrapping needed, so nothing can get double-wrapped on re-save.
  await commitFiles(env, [{ path: pageNode.sourcePath, content: html }], commitMessage);
  return json({ ok: true, message: commitMessage }, 200, cors);
}

async function handleCommit(request, env, cors) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400, cors);
  }

  const { action, gradeSlug, subjectSlug, topic, topicSlug } = body;
  if (!["create", "update", "delete", "update-page"].includes(action)) {
    return json({ error: "invalid action" }, 400, cors);
  }

  if (action === "update-page") {
    return handleUpdatePageContent(body, env, cors);
  }

  if (!gradeSlug || !subjectSlug) {
    return json({ error: "missing gradeSlug/subjectSlug" }, 400, cors);
  }

  const file = await getFile(env, "content/taxonomy.json");
  if (!file) return json({ error: "content/taxonomy.json not found" }, 500, cors);
  const taxonomyData = JSON.parse(file.content);

  const topics = findSubjectTopics(taxonomyData, gradeSlug, subjectSlug);
  if (!topics) return json({ error: "grade/subject not found" }, 404, cors);

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

  const files = [
    { path: "content/taxonomy.json", content: JSON.stringify(taxonomyData, null, 2) + "\n" },
  ];

  // Scaffold placeholder HTML for any brand-new page so its link doesn't 404.
  if (action === "create" && Array.isArray(topic.pages)) {
    for (const page of topic.pages) {
      if (!page.sourcePath) continue;
      const existing = await getFile(env, page.sourcePath).catch(() => null);
      if (existing) continue;
      files.push({
        path: page.sourcePath,
        content: placeholderLessonHtml(page.sourcePath, topic.title, page.label ?? page.title),
      });
    }
  }

  // Everything above lands in ONE commit -- see commitFiles() for why that matters.
  await commitFiles(env, files, commitMessage);

  return json({ ok: true, message: commitMessage }, 200, cors);
}

// ── Router ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const pathname = new URL(request.url).pathname.replace(/\/+/g, "/");

    try {
      if (pathname === "/commit" && request.method === "POST") {
        return await handleCommit(request, env, cors);
      }
      return json({ error: "not found" }, 404, cors);
    } catch (err) {
      return json({ error: err.message ?? "internal error" }, 500, cors);
    }
  },
};
