-- Requests from the "For companies" form on the landing page. This lives in its own Neon database
-- (winston-company-leads, COMPANY_DATABASE_URL), separate from the expert waitlist in signups.
-- One row per work email. status starts as 'new'; change it (for example to 'contacted') when you reach out.
-- needs and fields hold every option the company picked. field_other and industry_other hold what they typed
-- when they picked "Another field" or "Another industry".
-- Apply with: npm run migrate:company   (needs COMPANY_DATABASE_URL in the environment)
CREATE TABLE IF NOT EXISTS company_leads (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email           TEXT        NOT NULL UNIQUE,
  name            TEXT        NOT NULL,
  title           TEXT        NOT NULL,
  company         TEXT        NOT NULL,
  website         TEXT        NOT NULL,
  industry        TEXT        NOT NULL,
  industry_other  TEXT,
  needs           TEXT[]      NOT NULL,
  fields          TEXT[]      NOT NULL,
  field_other     TEXT,
  budget          TEXT        NOT NULL,
  notes           TEXT,
  status          TEXT        NOT NULL DEFAULT 'new',
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  fbclid          TEXT,
  gclid           TEXT,
  host            TEXT,
  submit_count    INTEGER     NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_leads_created_at_idx ON company_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS company_leads_status_idx ON company_leads (status);
