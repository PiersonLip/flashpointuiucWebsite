# Flashpoint Photography Club — UIUC

Official website and equipment rental system for Flashpoint Photography Club at the University of Illinois Urbana-Champaign.

**Main site:** [flashpointuiuc.com](https://flashpointuiuc.com)  
**Equipment rentals:** [rentals.flashpointuiuc.com](https://rentals.flashpointuiuc.com)

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Drizzle ORM + Better Auth (rental system)
- Docker for VPS deployment

## Local development

```bash
cp env.example .env   # set DATABASE_URL, BETTER_AUTH_SECRET, etc.
docker compose up -d db
npm install
npm run db:push       # create tables
npm run seed          # bootstrap manager account
npm run seed:equipment
npm run dev
```

- Marketing site: [http://localhost:3000](http://localhost:3000)
- Rentals (local): [http://localhost:3000/rentals](http://localhost:3000/rentals) or `/gear`, `/login`, etc.

## Content updates

Edit [`src/config/site.ts`](src/config/site.ts) for links, event descriptions, and membership copy.

**Gallery photos and executive board** (names, roles, portraits) are edited in the site admin dashboard at [rentals.flashpointuiuc.com/admin](https://rentals.flashpointuiuc.com/admin) (manager login). Uploaded images persist in `/var/www/flashpoint/uploads` on the VPS.

Equipment inventory is seeded from [`scripts/seed-equipment.ts`](scripts/seed-equipment.ts). Managers can also add/edit gear in the manager dashboard.

## VPS deployment

Prerequisites:
- DNS A records for `flashpointuiuc.com`, `www.flashpointuiuc.com`, and `rentals.flashpointuiuc.com` → your VPS IP
- SSH access to `rack` (or set `REMOTE_HOST`)
- `.env` on the VPS with database credentials, auth secrets, and email settings (see `env.example`)

First-time domain setup (includes TLS for rentals subdomain):

```bash
./deploy/setup-domain.sh
```

Deploy (build locally, rsync to VPS, run migrations, restart):

```bash
./deploy/deploy.sh
```

The app runs in Docker at `127.0.0.1:3012` (web) with Postgres on `127.0.0.1:5434`, proxied by host nginx.

## Rental system

Ported from the UIAS gear rental platform with Flashpoint branding and camera inventory:

- Member accounts (`@illinois.edu` + NetID)
- Request → manager approve → pickup → return flow
- Availability grid for coordinating pickup/return times
- Waitlist with 24-hour claim windows
- Manager dashboard for inventory, approvals, and member admin

## Membership flow

Members must complete the [Google Form membership sign-up](https://forms.gle/SEZn9jdcg2dPdndF8) before paying dues. Payment info is in the form. Equipment rentals require a separate account on the rentals subdomain.
