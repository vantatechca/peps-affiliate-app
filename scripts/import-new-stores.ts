// AFFEXCH — import merchants from `New Stores.xlsx`
//
// Reads the spreadsheet, creates one stub `users` row + one `vendor_profiles`
// row per non-empty data row. Idempotent: rows whose legalName already
// exists in vendor_profiles are skipped, so this is safe to re-run.
//
// Run: npx tsx --env-file=.env scripts/import-new-stores.ts
//   --dry   preview without writing

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import path from "path";

neonConfig.webSocketConstructor = ws;

const DRY = process.argv.includes("--dry");
const FILE = path.resolve(process.cwd(), "New Stores.xlsx");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type Row = {
  legalName: string;
  country: string;
  email: string;
  contactName: string;
  phone: string;
  address: string;
  city: string;
};

function parseRow(r: any[]): Row | null {
  const legalName = (r[0] ?? "").toString().trim();
  const country = ((r[1] ?? "").toString().trim() || "CA").toUpperCase();
  const email = (r[3] ?? "").toString().trim();
  const contactName = (r[5] ?? "").toString().trim();
  const phone = (r[6] ?? "").toString().trim();
  const address = (r[10] ?? "").toString().trim();

  if (!legalName && !email) return null;

  // Extract city as the second comma-delimited chunk if present.
  let city = "";
  if (address) {
    const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) city = parts[1];
  }

  return {
    legalName: legalName || `(unnamed merchant) ${email}`,
    country,
    email,
    contactName,
    phone,
    address,
    city,
  };
}

async function main() {
  console.log(`[import-new-stores] reading ${FILE}`);
  const wb = XLSX.readFile(FILE);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });

  // Skip first 2 rows (blank + header).
  const dataRows = raw.slice(2);

  const parsed: Row[] = [];
  for (const r of dataRows) {
    const p = parseRow(r);
    if (p) parsed.push(p);
  }

  console.log(`[import-new-stores] parsed ${parsed.length} candidate merchants`);

  // Pull existing legalNames so we can skip dupes.
  const { rows: existing } = await pool.query<{ legal_name: string }>(
    `SELECT legal_name FROM vendor_profiles`
  );
  const taken = new Set(existing.map((x) => x.legal_name.toLowerCase()));
  console.log(`[import-new-stores] ${taken.size} merchants already in DB`);

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of parsed) {
    if (taken.has(row.legalName.toLowerCase())) {
      skipped++;
      continue;
    }

    if (DRY) {
      console.log(`[dry] would insert: ${row.legalName} (${row.city || "no-city"}) <${row.email}>`);
      inserted++;
      taken.add(row.legalName.toLowerCase());
      continue;
    }

    try {
      const userId = randomUUID();
      const vendorId = randomUUID();
      const slug = row.legalName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
      const stamp = Date.now();
      // Use the merchant's gmail if present, else a synthetic placeholder.
      const userEmail = row.email || `merchant-${slug}-${stamp}@affexch.local`;
      const username = `merchant_${slug}_${stamp}`;
      const firstName = row.contactName || row.legalName.slice(0, 80);

      await pool.query(
        `INSERT INTO users
           (id, username, email, password, role, account_status, email_verified,
            first_name, tos_accepted_at, privacy_accepted_at, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, 'merchant', 'active', true, $4, NOW(), NOW(), NOW(), NOW())`,
        [userId, username, userEmail, firstName],
      );

      const description = row.city
        ? `Peptide merchant in ${row.city}. Imported from New Stores spreadsheet.`
        : `Peptide merchant. Imported from New Stores spreadsheet.`;

      await pool.query(
        `INSERT INTO vendor_profiles
           (id, user_id, legal_name, trade_name, industry, description,
            contact_name, phone_number, business_address, city, country,
            status, website_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Peptides & Wellness', $5,
                 $6, $7, $8, $9, $10,
                 'approved', false, NOW(), NOW())`,
        [
          vendorId,
          userId,
          row.legalName,
          row.legalName,
          description,
          row.contactName || null,
          row.phone || null,
          row.address || null,
          row.city || null,
          row.country,
        ],
      );

      inserted++;
      taken.add(row.legalName.toLowerCase());
      if (inserted % 50 === 0) {
        console.log(`[import-new-stores] inserted ${inserted}…`);
      }
    } catch (err: any) {
      failed++;
      console.error(`[import-new-stores] FAILED row "${row.legalName}":`, err?.message || err);
    }
  }

  console.log(
    `[import-new-stores] done. inserted=${inserted} skipped=${skipped} failed=${failed} dry=${DRY}`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error("[import-new-stores] fatal:", err);
  process.exit(1);
});
