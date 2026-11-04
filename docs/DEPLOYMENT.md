# Documentation Site Deployment

The documentation at [look-docs.modelcontextprotocol.name](https://look-docs.modelcontextprotocol.name) is a MkDocs Material site hosted on Cloudflare Pages.

| Item | Value |
|------|-------|
| Host | Cloudflare Pages, project `look-docs` |
| Production URL | `https://look-docs.modelcontextprotocol.name` |
| Security headers | `/home/user/.lyra-deploy/src/LooK/docs/_headers` (copied into the build) |
| DNS | Proxied CNAME in the `modelcontextprotocol.name` Cloudflare zone, pointing to `look-docs.pages.dev` |

## Build

```bash
pip install mkdocs-material mkdocs-minify-plugin
mkdocs build            # output: site/
```

## Deploy

Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, then run from the repository root:

```bash
npx wrangler@4 pages deploy site --project-name=look-docs --branch=main
```

Deploys are manual. GitHub Actions is not used for this site.

## Verify

```bash
curl -sI https://look-docs.modelcontextprotocol.name | head -1   # HTTP/2 200
```

## Rollback

In the Cloudflare dashboard, open **Workers & Pages → look-docs → Deployments**.
Pick an earlier production deployment and select **Rollback to this deployment**.

## Web app

The `look` server (`node bin/repovideo.js serve`) runs on Google Cloud Run (project `aerial-vehicle-466722-p5`, `us-central1`, 2 GiB, 900 s timeout) and is served at https://look.modelcontextprotocol.name through the Cloudflare Worker `look-proxy`.

```bash
gcloud run deploy look --source . --region us-central1 --project aerial-vehicle-466722-p5 \
  --allow-unauthenticated --memory 2Gi --cpu 2 --timeout 900 --port 8080
```
