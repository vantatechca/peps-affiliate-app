// Backfill vendor_profiles.website_url for merchants whose domain wasn't in
// the spreadsheet, and replace .example placeholder URLs on their offers.
// Uses the same `<slug>peptides.ca` pattern the real domains in the file use
// (e.g. "Scarborough Peptides (PC)" → scarboroughpeptides.ca).

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

function deriveDomain(legalName: string): string {
  // Drop "(PC)", strip non-alphanumeric, lowercase. Keep "peptides" suffix.
  const slug = legalName
    .replace(/\(PC\)/gi, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  return `${slug}.ca`;
}

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: vendors } = await pool.query<{
    id: string;
    legal_name: string;
    website_url: string | null;
  }>(`SELECT id, legal_name, website_url FROM vendor_profiles`);

  let vendorsUpdated = 0;
  for (const v of vendors) {
    const current = (v.website_url || "").trim();
    const needsFix = !current || current === "" || current.includes(".example");
    if (!needsFix) continue;
    const newUrl = `https://${deriveDomain(v.legal_name)}`;
    await pool.query("UPDATE vendor_profiles SET website_url = $1 WHERE id = $2", [newUrl, v.id]);
    vendorsUpdated++;
  }
  console.log(`[fix-urls] updated ${vendorsUpdated} vendor_profiles`);

  // Now rewrite offers.product_url to match the parent vendor's website_url.
  // Only touch ones currently pointing at .example.
  const offersUpdate = await pool.query(`
    UPDATE offers
    SET product_url = vp.website_url
    FROM vendor_profiles vp
    WHERE offers.vendor_id = vp.id
      AND offers.product_url LIKE '%.example%'
      AND vp.website_url IS NOT NULL
  `);
  console.log(`[fix-urls] updated ${offersUpdate.rowCount} offers`);

  // Sample a few after-state rows for sanity.
  const { rows: sample } = await pool.query<{ legal_name: string; website_url: string }>(`
    SELECT legal_name, website_url
    FROM vendor_profiles
    ORDER BY random()
    LIMIT 5
  `);
  console.log("Random sample:");
  for (const r of sample) console.log(`  ${r.legal_name} → ${r.website_url}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
