# Winston landing page

`index.html` is the landing page (static, no build step). `api/signup.js` is the Vercel function that saves form sign-ups to a Postgres database (Neon, installed from the Vercel Marketplace).

## The waitlist

Every sign-up is a waitlist entry. The `status` column starts as `waitlist`. When you reach out to someone, set their `status` to `invited` (or any label) in the Neon table view so you can filter on it.

## How a sign-up is saved

1. The 4-step form in `index.html` POSTs JSON to `/api/signup`.
2. `api/signup.js` checks the origin, the answers and the email, then inserts one row into the `signups` table. The same email again updates its row.
3. The page shows its success screen only after the row is saved.

The connection string is the `DATABASE_URL` environment variable, set by the Neon integration. Nothing secret lives in this repo.

## Set up the database (once)

```
vercel integration add neon --name winston-signups   # accept Neon's terms in the browser first
vercel env pull .env.local
node --env-file=.env.local scripts/migrate.mjs        # creates the signups table from db/schema.sql
```

## Read the sign-ups

```
vercel env pull .env.local
node --env-file=.env.local scripts/leads.mjs > leads.csv
```

Or open the Neon dashboard from the project's Storage tab in Vercel and run `SELECT * FROM signups ORDER BY created_at DESC;`.

## Company requests (separate database)

The hero's "For companies" button opens a 5-step form (what they need, which fields, company type, budget, contact details). It POSTs to `/api/company`, and `api/company.js` saves one row per work email in the `company_leads` table of its own Neon database, `winston-company-leads`. That function only reads `COMPANY_DATABASE_URL`, so company requests never touch the expert waitlist. `status` starts as `new`.

```
vercel integration add neon --name winston-company-leads --prefix COMPANY_ --plan free_v3 -e production -e preview
COMPANY_DATABASE_URL=... node scripts/migrate-company.mjs        # creates company_leads from db/company-schema.sql
COMPANY_DATABASE_URL=... node scripts/company-leads.mjs > company-leads.csv
```

The connection string is marked Sensitive in Vercel, so `vercel env pull` can't read it. Copy it from the database's page in Vercel (Storage) or from the Neon console.

## Deploying

Pushing to `main` deploys production. Other branches get a login-protected Preview.
