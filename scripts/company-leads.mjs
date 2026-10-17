// Prints every company request as CSV. Usage:
//   COMPANY_DATABASE_URL=... node scripts/company-leads.mjs > company-leads.csv
import { neon } from '@neondatabase/serverless';

const url = process.env.COMPANY_DATABASE_URL;
if (!url) {
  console.error('COMPANY_DATABASE_URL is not set.');
  process.exit(1);
}

const rows = await neon(url).query('SELECT * FROM company_leads ORDER BY created_at DESC');
const columns = [
  'id', 'created_at', 'status', 'name', 'title', 'email', 'company', 'website', 'industry', 'industry_other',
  'needs', 'fields', 'field_other', 'budget', 'notes',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'host', 'submit_count', 'updated_at',
];
const cell = (v) => {
  const s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
console.log(columns.join(','));
for (const row of rows) console.log(columns.map((c) => cell(row[c])).join(','));
