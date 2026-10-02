// POST /api/signup: stores a landing page sign-up in Postgres (Neon, via Vercel).
// One row per email. Submitting again updates that row instead of adding a duplicate.
import { neon } from '@neondatabase/serverless';

const FIELDS = ['Nursing', 'Medicine', 'Law', 'Engineering', 'Accounting', 'Pharmacy', 'Consulting', 'Finance', 'Other'];
const VERIFICATIONS = ['License', 'Degree', 'Other'];
const YEARS = ['Less than 2', '2–4', '5–9', '10–19', '20+'];
const ATTRIBUTION = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FIELD_OTHER_MAX = 100;

let sql;
const db = () => (sql ??= neon(process.env.DATABASE_URL));

const reply = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
};

const clean = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return reply(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  // Browsers always send Origin on a cross-site POST. Only accept the page's own host.
  const origin = req.headers.origin;
  if (origin) {
    let originHost = '';
    try { originHost = new URL(origin).host; } catch { /* leave empty */ }
    if (originHost !== req.headers.host) return reply(res, 403, { ok: false, error: 'forbidden' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return reply(res, 400, { ok: false, error: 'invalid_request' });
  }

  // Hidden field that people never see. A bot that fills it in gets a fake success and nothing is saved.
  if (typeof body.reference_code === 'string' && body.reference_code.trim() !== '') {
    return reply(res, 200, { ok: true });
  }

  const email = clean(body.email, 254)?.toLowerCase();
  if (!email || !EMAIL.test(email)) return reply(res, 400, { ok: false, error: 'invalid_email' });
  if (!FIELDS.includes(body.field) || !VERIFICATIONS.includes(body.verification) || !YEARS.includes(body.years)) {
    return reply(res, 400, { ok: false, error: 'invalid_answers' });
  }

  // "Other" must come with what the person typed. Tidy it up: no control characters, single spaces, capped length.
  let fieldOther = null;
  if (body.field === 'Other') {
    fieldOther = typeof body.field_other === 'string'
      ? body.field_other.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, FIELD_OTHER_MAX)
      : '';
    if (fieldOther.length < 2) return reply(res, 400, { ok: false, error: 'invalid_field_other' });
  }

  // Work this out here instead of trusting the browser.
  const likelyFit = body.verification !== 'Other' && body.years !== 'Less than 2';
  const attribution = Object.fromEntries(ATTRIBUTION.map((key) => [key, clean(body[key], 200)]));

  try {
    const rows = await db()`
      INSERT INTO signups
        (email, field, field_other, verification, years, likely_fit,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, host)
      VALUES
        (${email}, ${body.field}, ${fieldOther}, ${body.verification}, ${body.years}, ${likelyFit},
         ${attribution.utm_source}, ${attribution.utm_medium}, ${attribution.utm_campaign},
         ${attribution.utm_content}, ${attribution.utm_term}, ${attribution.fbclid}, ${attribution.gclid},
         ${clean(req.headers.host, 200)})
      ON CONFLICT (email) DO UPDATE SET
        field        = EXCLUDED.field,
        field_other  = EXCLUDED.field_other,
        verification = EXCLUDED.verification,
        years        = EXCLUDED.years,
        likely_fit   = EXCLUDED.likely_fit,
        submit_count = signups.submit_count + 1,
        updated_at   = now()
      RETURNING (xmax = 0) AS inserted`;
    return reply(res, 200, { ok: true, likelyFit, returning: !rows[0]?.inserted });
  } catch (error) {
    // Log the cause for the Vercel logs, but never send database details to the browser.
    console.error('signup insert failed:', error?.code ?? '', error?.message ?? error);
    return reply(res, 500, { ok: false, error: 'server_error' });
  }
}
