// Applies db/company-schema.sql to the company database in COMPANY_DATABASE_URL. Safe to run more than once.
import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const url = process.env.COMPANY_DATABASE_URL;
if (!url) {
  console.error('COMPANY_DATABASE_URL is not set. Copy it from the winston-company-leads database in Vercel (Storage) or the Neon console.');
  process.exit(1);
}

const sql = neon(url);
const schema = await readFile(new URL('../db/company-schema.sql', import.meta.url), 'utf8');
const statements = schema
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}
console.log(`Applied ${statements.length} statements.`);
