// POST /api/company: stores a request from the landing page's "For companies" form.
// It writes to its own Neon database (COMPANY_DATABASE_URL), never to the expert waitlist database.
// One row per work email. Submitting again updates that row instead of adding a duplicate.
import { neon } from '@neondatabase/serverless';

// Keep these lists in sync with the data-need, data-cfield, data-industry and data-budget buttons in index.html.
const NEEDS = ['Grading', 'Tasks and rubrics', 'Reference solutions', 'Red-teaming', 'Custom project', 'Something else'];
const FIELDS = ['Nursing', 'Medicine', 'Law', 'Engineering', 'Accounting', 'Pharmacy', 'Consulting', 'Finance', 'Other'];
const INDUSTRIES = ['Frontier AI lab', 'AI lab or startup', 'AI product company', 'Healthcare', 'Legal', 'Financial services', 'Other'];
const BUDGETS = ['Under $10K', '$10K–$50K', '$50K–$250K', '$250K–$1M', '$1M+', 'Not sure yet'];
const ATTRIBUTION = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let sql;
const db = () => (sql ??= neon(process.env.COMPANY_DATABASE_URL));

const reply = (res, status, body) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
};

const clean = (value, max) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

// One line of text: no control characters, single spaces, capped length. Returns '' when empty.
const line = (value, max) => (typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max)
  : '');

// Free text that may keep line breaks. Returns null when empty.
const paragraph = (value, max) => {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
  return text || null;
};

// A list of picks: must be an array of known values, at least one, no repeats.
const picks = (value, allowed) => {
  if (!Array.isArray(value) || value.length === 0 || value.length > allowed.length) return null;
  if (!value.every((v) => allowed.includes(v))) return null;
  return [...new Set(value)];
};

// Accepts "acme.com", "www.acme.com/team" or a full http(s) address. Returns https://host[/path], or null.
const normalizeWebsite = (value) => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 200 || /\s/.test(raw)) return null;
  let url;
  try { url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || !/^[^.]+\..+[a-z0-9]$/i.test(url.hostname)) return null;
  const path = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  return `${url.protocol}//${url.hostname.toLowerCase()}${path}`.slice(0, 200);
};

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
  const website = normalizeWebsite(body.website);
  if (!website) return reply(res, 400, { ok: false, error: 'invalid_website' });
  const name = line(body.name, 100);
  const title = line(body.title, 100);
  const company = line(body.company, 150);
  if (name.length < 2 || title.length < 2 || company.length < 1) return reply(res, 400, { ok: false, error: 'invalid_contact' });

  const needs = picks(body.needs, NEEDS);
  const fields = picks(body.fields, FIELDS);
  if (!needs || !fields || !INDUSTRIES.includes(body.industry) || !BUDGETS.includes(body.budget)) {
    return reply(res, 400, { ok: false, error: 'invalid_answers' });
  }

  // "Other" must come with what the person typed.
  let fieldOther = null;
  if (fields.includes('Other')) {
    fieldOther = line(body.field_other, 100);
    if (fieldOther.length < 2) return reply(res, 400, { ok: false, error: 'invalid_field_other' });
  }
  let industryOther = null;
  if (body.industry === 'Other') {
    industryOther = line(body.industry_other, 100);
    if (industryOther.length < 2) return reply(res, 400, { ok: false, error: 'invalid_industry_other' });
  }

  const notes = paragraph(body.notes, 2000);
  const attribution = Object.fromEntries(ATTRIBUTION.map((key) => [key, clean(body[key], 200)]));

  try {
    const rows = await db()`
      INSERT INTO company_leads
        (email, name, title, company, website, industry, industry_other, needs, fields, field_other, budget, notes,
         utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, host)
      VALUES
        (${email}, ${name}, ${title}, ${company}, ${website}, ${body.industry}, ${industryOther},
         ${needs}, ${fields}, ${fieldOther}, ${body.budget}, ${notes},
         ${attribution.utm_source}, ${attribution.utm_medium}, ${attribution.utm_campaign},
         ${attribution.utm_content}, ${attribution.utm_term}, ${attribution.fbclid}, ${attribution.gclid},
         ${clean(req.headers.host, 200)})
      ON CONFLICT (email) DO UPDATE SET
        name           = EXCLUDED.name,
        title          = EXCLUDED.title,
        company        = EXCLUDED.company,
        website        = EXCLUDED.website,
        industry       = EXCLUDED.industry,
        industry_other = EXCLUDED.industry_other,
        needs          = EXCLUDED.needs,
        fields         = EXCLUDED.fields,
        field_other    = EXCLUDED.field_other,
        budget         = EXCLUDED.budget,
        notes          = EXCLUDED.notes,
        submit_count   = company_leads.submit_count + 1,
        updated_at     = now()
      RETURNING (xmax = 0) AS inserted`;
    return reply(res, 200, { ok: true, returning: !rows[0]?.inserted });
  } catch (error) {
    // Log the cause for the Vercel logs, but never send database details to the browser.
    console.error('company insert failed:', error?.code ?? '', error?.message ?? error);
    return reply(res, 500, { ok: false, error: 'server_error' });
  }
}
