-- Sign-ups from the landing page form. One row per email address. This table is the waitlist:
-- status starts as 'waitlist'; move a person to 'invited' (or any label you like) when you reach out.
-- field_other holds what a person typed when they picked "Other" for their field.
-- phone is stored as +<country code><number>, e.g. +15551234567. Rows from before 5 Oct 2026 have no phone.
-- Apply with: npm run migrate   (needs DATABASE_URL in the environment)
CREATE TABLE IF NOT EXISTS signups (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  phone         TEXT,
  field         TEXT        NOT NULL,
  field_other   TEXT,
  verification  TEXT        NOT NULL,
  years         TEXT        NOT NULL,
  likely_fit    BOOLEAN     NOT NULL,
  status        TEXT        NOT NULL DEFAULT 'waitlist',
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  utm_content   TEXT,
  utm_term      TEXT,
  fbclid        TEXT,
  gclid         TEXT,
  host          TEXT,
  submit_count  INTEGER     NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For databases created before field_other existed. Does nothing if the column is already there.
ALTER TABLE signups ADD COLUMN IF NOT EXISTS field_other TEXT;
ALTER TABLE signups ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'waitlist';
ALTER TABLE signups ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE INDEX IF NOT EXISTS signups_created_at_idx ON signups (created_at DESC);
CREATE INDEX IF NOT EXISTS signups_status_idx ON signups (status);
