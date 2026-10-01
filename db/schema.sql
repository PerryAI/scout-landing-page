-- Sign-ups from the landing page form. One row per email address.
-- Apply once with: npm run migrate   (needs DATABASE_URL in the environment)
CREATE TABLE IF NOT EXISTS signups (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  field         TEXT        NOT NULL,
  verification  TEXT        NOT NULL,
  years         TEXT        NOT NULL,
  likely_fit    BOOLEAN     NOT NULL,
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

CREATE INDEX IF NOT EXISTS signups_created_at_idx ON signups (created_at DESC);
