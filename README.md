# Smart Mobile Shop Management System

Phase 1 MVP for an online multi-branch mobile shop platform.

## Features Built

- Owner login and registration
- Unique owner invitation link
- Shopkeeper registration through invite token/link
- Shop creation under the owner's account
- Shopkeeper daily entry workflow
- Accessories sales with favorites, quantity, price, and payment method
- Repair sales with model, repair type, price, and payment method
- Telephone sales with brand, model, IMEI, storage, price, and payment method
- Expense / Spesa entries
- Delivery / supplier payment entries
- Owner dashboard with totals, cash, Bancomat, expenses, delivery payments, and cash in hand
- Date filters: today, yesterday, week, month, previous month, all time
- Branch comparison chart
- Individual shop filtering
- Excel-compatible CSV export

## Demo Login

The app includes a browser-based demo store so it can be tested before Supabase keys are connected.

- Owner: `owner@demo.com` / `demo123`
- Shopkeeper: `shop@demo.com` / `demo123`
- Invite token: `DEMO2026`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Direction

Recommended stack:

- Next.js frontend and API/server actions
- Supabase Auth
- Supabase PostgreSQL
- Render or Vercel hosting

Copy `.env.example` to `.env.local` and add Supabase keys when the cloud project is ready.

## Shareable Online Demo

To send a real platform link to shop owners, deploy the app online and connect Supabase:

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. In Supabase Auth settings, disable email confirmation for MVP testing.
4. Copy the Supabase project URL and anon key.
5. Push this project to GitHub.
6. Create a Render Web Service from the GitHub repo.
7. Add these Render environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ADMIN_SECRET=a_long_private_secret_only_you_know
```

8. Deploy on Render.
9. Send the Render URL to a shop owner.

Once deployed with Supabase keys, all owner and shopkeeper data is shared online through Supabase. The browser demo storage is only used when Supabase keys are missing.

## Super Admin Access

The hidden admin panel is available at:

```text
/secure-platform-admin
```

It is not linked from the normal app. Access requires `ADMIN_SECRET`, and admin data/actions are handled server-side with `SUPABASE_SERVICE_ROLE_KEY`.

For existing Supabase projects, run:

```text
supabase/add_admin_status.sql
```

Admin capabilities:

- View total owners and workers
- View all owners, shops, and associated workers
- Suspend or activate owners
- Suspend or activate workers
- Delete worker accounts
- Delete owner workspaces and related data

## Supabase

The initial database schema is in `supabase/schema.sql`.

This MVP currently runs with a local browser demo store. The schema is included so the next step can replace local persistence with Supabase Auth and database calls without changing the product flow.
