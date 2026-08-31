# Flashpoint Photography Club — UIUC

Official website for Flashpoint Photography Club at the University of Illinois Urbana-Champaign.

**Live site:** [flashpointuiuc.com](https://flashpointuiuc.com)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Docker for VPS deployment
- Vercel-ready for future migration (connect repo, deploy — no Docker needed)

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker (local)

```bash
docker compose up --build
```

## Content updates

Edit [`src/config/site.ts`](src/config/site.ts) for links, board roster, event descriptions, and membership copy. The membership form stays on Google Forms — update the URL in `siteConfig.links.membershipForm`.

## VPS deployment

Prerequisites:
- DNS A records for `flashpointuiuc.com` and `www.flashpointuiuc.com` → your VPS IP
- SSH access to `rack` (or set `REMOTE_HOST`)

First-time domain setup:

```bash
./deploy/setup-domain.sh
```

Deploy (build locally, rsync to VPS, restart container on port 3012):

```bash
./deploy/deploy.sh
```

The app runs in Docker at `127.0.0.1:3012`, proxied by host nginx.

## Future: Vercel

1. Push repo to GitHub
2. Import project in Vercel
3. Deploy — no changes to app code required

## Membership flow

Members must complete the [Google Form membership sign-up](https://forms.gle/SEZn9jdcg2dPdndF8) before paying dues. Payment info is in the form.
