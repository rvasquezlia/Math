# Admin editing setup (one-time)

The site is public to everyone by default -- no login needed to browse
lessons. A teacher unlocks the edit/create buttons by visiting any admin
page (e.g. `/Math/admin/`) and entering a shared password. That password
check is a **client-side UI gate, not real security** -- it just keeps
casual visitors from seeing edit controls. Saving an actual edit is a
separate step handled by a small Cloudflare Worker, since GitHub Pages
can't hold a GitHub write-token itself.

## 1. Change the shared teacher password (optional)

It's set in `app/contexts/AuthContext.js`:

```js
const ADMIN_PASSWORD = "Password1!";
```

Change it there and commit, if you want something other than the default.
Because this file ships in the site's public JS, anyone who reads the
source can find this string -- treat it as a light deterrent, not a secret.

## 2. Create a free Cloudflare account + API token

1. Sign up at https://dash.cloudflare.com/sign-up (no credit card needed).
2. Go to **My Profile → API Tokens → Create Token → Edit Cloudflare Workers**
   template. Create it and copy the token.
3. Copy your **Account ID** (right sidebar of the Cloudflare dashboard, or
   Workers & Pages → Overview).

## 3. Create a GitHub fine-grained token for the Worker

1. GitHub → Settings → Developer settings → **Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. **Repository access**: "Only select repositories" → `rvasquezlia/Math`.
3. **Permissions → Repository permissions → Contents**: **Read and write**.
4. Generate it and copy the token (starts with `github_pat_`).

## 4. Add repository secrets and variables

In the `rvasquezlia/Math` repo: **Settings → Secrets and variables →
Actions**.

**Secrets** tab:

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the API token from step 2 |
| `CLOUDFLARE_ACCOUNT_ID` | the Account ID from step 2 |
| `ADMIN_COMMIT_TOKEN` | the GitHub token from step 3 |

**Variables** tab:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_OAUTH_PROXY_URL` | leave empty for now -- you'll fill this in step 6 |

## 5. Deploy the Worker

**Actions** tab → **Deploy Admin Worker (Cloudflare)** → **Run workflow**.

Open the finished run and check the "Deploy Worker" step's log for the
Worker's URL, e.g.:

```
https://lia-math-oauth-proxy.<your-subdomain>.workers.dev
```

## 6. Point the site at the Worker and rebuild

Back in **Settings → Secrets and variables → Actions → Variables**, set
`NEXT_PUBLIC_OAUTH_PROXY_URL` to that URL.

Then **Actions** tab → **Deploy GitHub Pages** → **Run workflow**.

## Done

Visit `https://rvasquezlia.github.io/Math/admin/` and enter the password
from step 1 -- the edit/create buttons should appear across the site, and
saving a change should show up live in about a minute.

## Troubleshooting

- "NEXT_PUBLIC_OAUTH_PROXY_URL is not configured" when saving? The Pages
  build didn't pick up the variable -- re-check the Variables tab and
  re-run the Pages workflow.
- Save fails with a GitHub API error? The fine-grained PAT either expired
  or doesn't have **Contents: Read and write** on `rvasquezlia/Math` --
  regenerate it and update `ADMIN_COMMIT_TOKEN`, then redeploy the Worker.
