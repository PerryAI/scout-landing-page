// Prints every sign-up as CSV. Usage:
//   vercel env pull .env.local && node --env-file=.env.local scripts/leads.mjs > leads.csv
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const rows = await neon(url).query('SELECT * FROM signups ORDER BY created_at DESC');
const columns = [
  'id', 'created_at', 'email', 'field', 'verification', 'years', 'likely_fit',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'fbclid', 'gclid', 'host', 'submit_count', 'updated_at',
];
const cell = (v) => {
  const s = v instanceof Date ? v.toISOString() : v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
console.log(columns.join(','));
for (const row of rows) console.log(columns.map((c) => cell(row[c])).join(','));
