# DropSend

DropSend is an open source expense-tracker web app. Drop images of your receipts or bills and AI tracks your expenses.

## Features

- _Auth_: sign up, log in and log out with email and password (Supabase Auth). All app pages and APIs require a session.
- _Receipt upload_: drag and drop up to 4 JPG, PNG or WebP images (1 MB each) at a time. Files go straight to a private Supabase Storage bucket.
- _Background OCR_: an Inngest worker checks each upload and sends the image to Gemma 4 on the Gemini API. The model extracts the merchant, amount, currency, date, category, payment method and line items. Each receipt is processed in its own run, with retries.
- _Live status_: receipt status (processing, needs review, failed) updates in the UI as it changes, through Supabase Realtime. No page refresh needed.
- _Receipts page_: a table of all your receipts with the extracted merchant, amount, date and category, plus a link to each receipt image.
  - Sort by amount or receipt date, and filter by category or status. Sort and filters are kept in the URL.
  - _View extraction_ opens a side panel with the receipt image, all extracted details and the line items.
  - Delete receipts. Retry failed ones from the upload page.

  ## Tech stack

- [Turborepo](https://turbo.build) monorepo
- [Bun](https://bun.sh) package manager
- [Next.js](https://nextjs.org) (App Router) in apps/web
- [Tailwind CSS](https://tailwindcss.com) and [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com): Postgres, Auth, Storage and Realtime
- [Inngest](https://www.inngest.com): background processing
- [Gemma 4](https://ai.google.dev/gemma) on the [Gemini API](https://ai.google.dev): receipt OCR

Product and feature specs for the coding agent live in [specs/](./specs).

App name and copy come from [apps/web/src/lib/constants.ts](./apps/web/src/lib/constants.ts).

## Getting started

### Prerequisites

- [Bun](https://bun.sh) 1.3 or later
- A [Supabase](https://supabase.com/dashboard) project
- A [Gemini API key](https://aistudio.google.com/apikey)

### 1. Install dependencies

bash
bun install

### 2. Set environment variables

bash
cp .env.example apps/web/.env

Fill in apps/web/.env:

| Variable                               | Where to find it                                                            |
| -------------------------------------- | --------------------------------------------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL               | Supabase dashboard → Project Settings → API                                 |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY   | Supabase dashboard → Project Settings → API Keys (publishable key)          |
| SUPABASE_SECRET_KEY                    | Supabase dashboard → Project Settings → API Keys (secret key). Server-only. |
| GEMINI_API_KEY                         | [Google AI Studio](https://aistudio.google.com/apikey). Server-only.        |
| INNGEST_DEV                            | Leave as 1 for local development.                                           |
| INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY | Production only, from the Inngest dashboard. Leave empty locally.           |

### 3. Set up the database

The migrations in [supabase/migrations](./supabase/migrations) create the tables, Row Level Security policies, the private receipts Storage bucket and the Realtime publication. Apply them to your Supabase project with the Supabase CLI:

bash
bunx supabase login
bunx supabase link --project-ref <your-project-ref>
bunx supabase db push


Your project ref is in the project URL: https://<your-project-ref>.supabase.co.

### 4. Run the app

Run these in two terminals from the repository root:

bash
# Terminal 1: the web app
bun dev

# Terminal 2: the Inngest dev server (runs background OCR)
bun run dev:inngest


- Web app: [http://localhost:3000](http://localhost:3000)
- Inngest dashboard: [http://localhost:8288](http://localhost:8288)

Without the Inngest dev server, uploads work but receipts are never processed and end up failed with "Couldn't start processing." Start it and use retry on the upload page.

### 5. Try it

1. Sign up at [http://localhost:3000/signup](http://localhost:3000/signup).
2. Open *Upload Receipt* and drop a receipt image. Its status moves from Processing to Needs review.
3. Open *Receipts* to see the extracted data, then click *View extraction* for the details and line items.

## Other commands

Run from the repository root unless noted.

bash
bun run build                 # production build
bun run lint                  # ESLint
cd apps/web && bunx tsc --noEmit   # type check

# Run OCR on a local image without touching Supabase (needs GEMINI_API_KEY)
cd apps/web && bun run ocr:test path/to/receipt.jpg


## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branch and commit conventions.