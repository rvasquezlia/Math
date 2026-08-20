/**
 * oauth-proxy/worker.js
 * ────────────────────────────────────────────────────────────────────
 * Cloudflare Worker: GitHub OAuth token-exchange proxy for the LIA Math
 * Curriculum site (a static Next.js export hosted on GitHub Pages).
 *
 * GitHub Pages cannot run server code, so it cannot safely hold
 * GITHUB_CLIENT_SECRET. This Worker is the minimal backend that does:
 *   1. Receive `?code=...` from the client after the GitHub OAuth redirect.
 *   2. Exchange it server-side for an access token (using the secret).
 *   3. Fetch the user's profile + verified primary email.
 *   4. Return { login, name, email, avatar_url } as JSON.
 *
 * Required Worker secrets (set via `wrangler secret put`, never in code):
 *   GITHUB_CLIENT_ID
 *   GITHUB_CLIENT_SECRET
 *
 * Optional Worker var (restricts which origins may call this proxy):
 *   ALLOWED_ORIGIN   e.g. "https://rvasquezlia.github.io"
 */

const GH_API = "https://api.github.com";

function corsHeaders(origin, allowedOrigin) {
  const allow = allowedOrigin && allowedOrigin !== "*" ? allowedOrigin : (origin ?? "*");
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function ghHeaders(token) {
  return {
    Authorization: "token " + token,
    Accept: "application/vnd.github+json",
    "User-Agent": "lia-math-oauth-proxy",
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return Response.json({ error: "missing code" }, { status: 400, headers: cors });
    }

    const clientId = env.GITHUB_CLIENT_ID;
    const clientSecret = env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "OAuth credentials not configured on the proxy" },
        { status: 500, headers: cors },
      );
    }

    // 1. Exchange code → access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });

    if (!tokenRes.ok) {
      return Response.json({ error: "token exchange failed" }, { status: 502, headers: cors });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return Response.json(
        { error: tokenData.error_description ?? "no access_token" },
        { status: 400, headers: cors },
      );
    }

    // 2. Fetch user profile
    const profileRes = await fetch(GH_API + "/user", { headers: ghHeaders(accessToken) });
    if (!profileRes.ok) {
      return Response.json({ error: "failed to fetch profile" }, { status: 502, headers: cors });
    }
    const profile = await profileRes.json();

    // 3. Fetch primary verified email (GitHub omits it from /user if private)
    let email = profile.email ?? "";
    if (!email) {
      const emailRes = await fetch(GH_API + "/user/emails", { headers: ghHeaders(accessToken) });
      if (emailRes.ok) {
        const emails = await emailRes.json();
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email ?? emails[0]?.email ?? "";
      }
    }

    return Response.json(
      {
        login: profile.login,
        name: profile.name ?? profile.login,
        email,
        avatar_url: profile.avatar_url ?? "",
      },
      { headers: cors },
    );
  },
};
