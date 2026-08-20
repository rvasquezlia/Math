# Wiring up GitHub sign-in (one-time setup)

The site (`app/contexts/AuthContext.js`, `app/components/SignInButton.js`)
needs two things at build time, or it silently falls back to a
"Dev mode — auth not configured" badge instead of a working Sign In button,
and nobody can get past the login screen to see lessons:

- `NEXT_PUBLIC_GITHUB_CLIENT_ID` — your GitHub OAuth App's Client ID
- `NEXT_PUBLIC_OAUTH_PROXY_URL` — a small backend that exchanges the OAuth
  code for a token (GitHub Pages can't hold the Client **Secret** itself,
  since it only serves static files)

This repo now includes that backend as a free Cloudflare Worker
(`oauth-proxy/`) plus a workflow (`.github/workflows/deploy-oauth-proxy.yml`)
that deploys it automatically. You only need to do the one-time setup below.

## 1. Confirm your GitHub OAuth App

GitHub → Settings → Developer settings → OAuth Apps → your app.

- **Homepage URL**: `https://rvasquezlia.github.io/Math/`
- **Authorization callback URL**: `https://rvasquezlia.github.io/Math/`
  (must match exactly, including the trailing slash)

Copy the **Client ID**. Click **Generate a new client secret** and copy it
too — you'll only see it once.

## 2. Create a free Cloudflare account + API token

1. Sign up at https://dash.cloudflare.com/sign-up (no credit card needed).
2. Go to **My Profile → API Tokens → Create Token → Edit Cloudflare Workers**
   template. Create it and copy the token.
3. Copy your **Account ID** (right sidebar of the Cloudflare dashboard, or
   Workers & Pages → Overview).

## 3. Add repository secrets and variables

In the `rvasquezlia/Math` repo: **Settings → Secrets and variables →
Actions**.

**Secrets** tab — click "New repository secret" for each:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the API token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | the Account ID from step 2 |
| `GITHUB_OAUTH_CLIENT_SECRET` | the Client Secret from step 1 |

**Variables** tab — click "New repository variable" for each:

| Name | Value |
|---|---|
| `GITHUB_OAUTH_CLIENT_ID` | the Client ID from step 1 |
| `OAUTH_PROXY_URL` | leave empty for now — you'll fill this in step 5 |

## 4. Deploy the OAuth proxy

**Actions** tab → **Deploy OAuth Proxy (Cloudflare Worker)** → **Run
workflow** (on `main`).

Once it finishes, open the run and check the "Deploy Worker" step's log —
it prints the Worker's URL, something like:

```
https://lia-math-oauth-proxy.<your-subdomain>.workers.dev
```

(You can also find it in the Cloudflare dashboard under Workers & Pages.)

## 5. Set the proxy URL and redeploy the site

Back in **Settings → Secrets and variables → Actions → Variables**, edit
`OAUTH_PROXY_URL` and set it to the Worker URL from step 4.

Then **Actions** tab → **Deploy GitHub Pages** → **Run workflow** to rebuild
the site with both variables baked in.

## Done

Visit `https://rvasquezlia.github.io/Math/` — you should now see a real
"Sign in with GitHub" button. After signing in, your role is looked up in
`config/roles.json` by email; `rvasquez@lincoln.edu.ni` is already listed
as `admin`.

## Troubleshooting

- Still see "Dev mode — auth not configured"? The Pages build didn't pick
  up `GITHUB_OAUTH_CLIENT_ID` — re-check the Variables tab (not Secrets)
  and re-run the Pages workflow.
- Sign-in redirects back but nothing happens / stays signed out? Open
  DevTools → Network on the redirect and check the request to
  `OAUTH_PROXY_URL` — a non-200 response usually means the Worker secrets
  (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`) weren't set, or the
  Authorization callback URL in the GitHub OAuth App doesn't match exactly.
- "Access Denied" after signing in? Your GitHub account's verified email
  isn't in `config/roles.json`'s `admins`, `editors`, or `allowedDomains`.
