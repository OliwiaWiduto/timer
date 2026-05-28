# Freelance Timer

Desktop time tracking for freelancers: **Tauri 2** + **React** + **TypeScript** on the front end, **Supabase** (Postgres + Auth + Row Level Security) on the back end.

## Features

- **Projects** with hourly rate, currency, and optional client details for invoices.
- **Timer** per project: **Play**, **Pause**, and **Stop (✕)**. Stop opens a sheet to **describe the session** before it is saved.
- **Time logs** across all projects with optional project filter.
- **Invoices (per project)** that default to **unbilled sessions only**, optional date range filter, multi-select, **atomic billing** via a Postgres RPC, and **PDF download** (jsPDF).
- **Project list** sorted by **most recently logged** time (`last_logged_at`).

## Prerequisites

- Node.js 20+ recommended.
- Rust **stable** (1.88+ recommended for current Tauri dependencies). Install from [rustup.rs](https://rustup.rs/).
- **macOS**: Xcode command line tools for Tauri.
- **Linux** (dev/build): WebKitGTK and GTK, for example on Ubuntu:

```bash
sudo apt-get install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Supabase setup

1. Create a project at [https://supabase.com](https://supabase.com).
2. In the SQL editor (or CLI), run the migration in `supabase/migrations/20250526120000_init.sql`.
3. Enable **Email** auth (sign-in and sign-up) under Authentication → Providers.
4. Copy **Project URL** and **anon public key** from Project Settings → API.

## Environment

Create `.env` in the repo root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

See `.env.example`.

## Scripts

```bash
npm install
npm run dev          # Vite only (browser)
npm run tauri:dev    # Tauri shell + Vite
npm run build        # Web production build
npm run tauri:build  # Platform app bundle
```

## Desktop releases & auto-update

macOS builds and in-app updates use GitHub Releases. See **[docs/RELEASES.md](docs/RELEASES.md)** for signing keys, GitHub secrets, and how to publish `v*` tags.

## Notes

- **Billing**: `finalize_invoice` marks selected sessions as billed and creates `invoices` + `invoice_lines` in one transaction. Only `billing_status = unbilled` rows for the chosen project are accepted.
- **PDFs** are generated in the client and downloaded; you can later add Supabase Storage upload if you want cloud copies.
