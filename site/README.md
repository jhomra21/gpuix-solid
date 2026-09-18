# GPUix Solid site

This directory contains the public browser site for GPUix Solid. It is separate from the native renderer. The Worker serves the site, and the site uses screenshots captured from native examples.

## Local build

```bash
cd site
bun run build
bun run dev
```

The build copies the existing screenshots from `../docs/images` into `site/dist/images`. The repository keeps one copy of each screenshot.

## Cloudflare

The Worker name is `gpuix-solid`. `wrangler.jsonc` is the source of truth.

Connect the GitHub repository from Cloudflare Workers & Pages and use these build settings:

```text
Root directory: site
Production branch: main
Build command: bun run build
Deploy command: bunx wrangler@4.134.0 deploy
Non-production branch builds: enabled
Non-production deploy command: bunx wrangler@4.134.0 versions upload
```

No Cloudflare API token or account ID belongs in GitHub.

Production pushes deploy the active Worker. Non-production branches upload Worker versions so Cloudflare can attach preview URLs and build status to pull requests.

The Worker exposes `/health` for deployment checks. Static requests use Workers Static Assets.
