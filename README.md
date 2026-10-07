# DropSend

DropSend is an open source expense-tracker web app. Drop images of your receipts or bills and AI tracks your expenses.

## Tech stack

- [Turborepo](https://turbo.build) monorepo
- [Bun](https://bun.sh) package manager
- [Next.js](https://nextjs.org) (App Router) in `apps/web`
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com) (client starter only)

Product and feature specs for the coding agent live in [`specs/`](./specs).

App name and copy come from [`apps/web/src/lib/constants.ts`](./apps/web/src/lib/constants.ts).

## Getting started

```bash
bun install
cp .env.example apps/web/.env

# Ensure to fill supabase env vars before running bun dev

bun dev
```
The web app runs at [http://localhost:3000](http://localhost:3000).
