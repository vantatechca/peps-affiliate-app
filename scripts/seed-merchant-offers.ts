// AFFEXCH — generate 6 random peptide offers per merchant from
// `products_export_1 (5).csv`. Skips merchants that already have offers,
// so this is safe to re-run.
//
// Run: npx tsx --env-file=.env scripts/seed-merchant-offers.ts
//   --dry         preview without writing
//   --per N       offers per merchant (default 6)

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import path from "path";

neonConfig.webSocketConstructor = ws;

const DRY = process.argv.includes("--dry");
const perFlagIdx = process.argv.indexOf("--per");
const PER_MERCHANT =
  perFlagIdx >= 0 && process.argv[perFlagIdx + 1]
    ? parseInt(process.argv[perFlagIdx + 1]!, 10)
    : 6;

const CSV = path.resolve(process.cwd(), "products_export_1 (5).csv");
const COMMISSION_PCT = 20;

type Product = { handle: string; title: string; priceUsd: number };

function loadCatalog(): Product[] {
  const wb = XLSX.readFile(CSV, { type: "file" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

  // Group variant rows by handle; product title sits on the first row of each group.
  const grouped = new Map<string, { title: string; prices: number[] }>();
  for (const r of rows) {
    const handle = String(r["Handle"] || "").trim();
    if (!handle) continue;
    if (!grouped.has(handle)) {
      grouped.set(handle, { title: String(r["Title"] || "").trim(), prices: [] });
    }
    const entry = grouped.get(handle)!;
    if (!entry.title && r["Title"]) entry.title = String(r["Title"]).trim();
    const price = parseFloat(String(r["Variant Price"] || ""));
    if (Number.isFinite(price) && price > 0) entry.prices.push(price);
  }

  // Build catalog — use the LOWEST variant price for each product so the
  // offer reflects the entry-level package.
  const out: Product[] = [];
  for (const [handle, { title, prices }] of grouped) {
    if (!title || prices.length === 0) continue;
    out.push({ handle, title, priceUsd: Math.min(...prices) });
  }
  return out;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

async function main() {
  console.log(`[seed-offers] loading catalog from ${CSV}`);
  const catalog = loadCatalog();
  console.log(`[seed-offers] loaded ${catalog.length} priced products`);
  if (catalog.length < PER_MERCHANT) {
    console.error(`[seed-offers] FATAL: catalog (${catalog.length}) < per-merchant (${PER_MERCHANT})`);
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Every merchant gets up to PER_MERCHANT new offers. Existing offers are
  // preserved; only product names they don't already carry are added.
  const { rows: targets } = await pool.query<{
    id: string;
    legal_name: string;
    trade_name: string;
    city: string | null;
    website_url: string | null;
    existing_products: string[];
  }>(`
    SELECT vp.id, vp.legal_name, vp.trade_name, vp.city, vp.website_url,
           COALESCE(
             (SELECT array_agg(o.product_name) FROM offers o WHERE o.vendor_id = vp.id),
             '{}'::text[]
           ) AS existing_products
    FROM vendor_profiles vp
    ORDER BY vp.created_at
  `);
  console.log(`[seed-offers] ${targets.length} merchants will receive offers (${PER_MERCHANT} each, skipping dupes)`);

  if (DRY) {
    console.log(`[dry] would insert ${targets.length * PER_MERCHANT} offers total`);
    if (targets.length) {
      const sampleMerchant = targets[0];
      const samplePicks = pickRandom(catalog, PER_MERCHANT);
      console.log(`[dry] sample for "${sampleMerchant.legal_name}":`);
      for (const p of samplePicks) {
        console.log(`  - ${p.title} @ $${p.priceUsd} (${COMMISSION_PCT}% commission)`);
      }
    }
    await pool.end();
    return;
  }

  let inserted = 0;
  let failedMerchants = 0;

  for (const m of targets) {
    const existing = new Set(m.existing_products || []);
    const available = catalog.filter((p) => !existing.has(p.title));
    const picks = pickRandom(available, PER_MERCHANT);
    const tradeName = m.trade_name || m.legal_name;
    const city = m.city || "Canada";

    for (const p of picks) {
      try {
        const offerId = randomUUID();
        const offerSlug = `${p.title}-${tradeName}-${m.id.slice(0, 8)}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 200);
        const commissionDetails = JSON.stringify({
          type: "promo_code",
          percentage: COMMISSION_PCT,
        });
        const title = `${p.title} — ${tradeName}`.slice(0, 100);
        const shortDescription = `${p.title} from ${tradeName} in ${city}.`.slice(0, 200);
        const fullDescription =
          `Promote ${p.title} from ${tradeName} (${city}). Customers redeem ` +
          `your PEP-XXXX-XXXX promo code at checkout for a discount, and you ` +
          `earn ${COMMISSION_PCT}% commission.`;
        const productUrl =
          m.website_url ||
          `https://${tradeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`;

        await pool.query(
          `INSERT INTO offers
             (id, vendor_id, title, product_name, short_description, full_description,
              primary_niche, product_url, commission_type, commission_percentage,
              average_order_value, status, slug, commission_details, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'wellness', $7, 'promo_code', $8, $9,
                   'approved', $10, $11::jsonb, NOW(), NOW())`,
          [
            offerId,
            m.id,
            title,
            p.title,
            shortDescription,
            fullDescription,
            productUrl,
            COMMISSION_PCT.toFixed(2),
            p.priceUsd.toFixed(2),
            offerSlug,
            commissionDetails,
          ],
        );
        inserted++;
      } catch (err: any) {
        console.error(
          `[seed-offers] FAILED ${m.legal_name} / ${p.title}:`,
          err?.message || err,
        );
      }
    }

    if (inserted && inserted % 300 === 0) {
      console.log(`[seed-offers] inserted ${inserted} offers so far…`);
    }
  }

  console.log(
    `[seed-offers] done. inserted=${inserted} merchants_processed=${targets.length - failedMerchants}`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error("[seed-offers] fatal:", err);
  process.exit(1);
});
