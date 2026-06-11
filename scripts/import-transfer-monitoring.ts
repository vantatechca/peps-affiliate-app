// AFFEXCH — replace merchants + offers from "New Store Transfer Monitoring"
//
// Uses the "Old 600 Stores CANADA" sheet (which contains the authoritative
// per-store product list + public domain) as the source of truth. Each
// product token is normalized + fuzzy-matched against products_export
// catalog to get the canonical title + entry-level price.
//
// DESTRUCTIVE: deletes every existing merchant + offer before re-inserting.
//
// Run:
//   npx tsx --env-file=.env scripts/import-transfer-monitoring.ts --dry
//   npx tsx --env-file=.env scripts/import-transfer-monitoring.ts --confirm

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "crypto";
import XLSX from "xlsx";
import path from "path";

neonConfig.webSocketConstructor = ws;

const DRY = !process.argv.includes("--confirm");
const COMMISSION_PCT = 20;
const TRANSFER_FILE = path.resolve(process.cwd(), "New Store Transfer Monitoring.xlsx");
const CATALOG_FILE = path.resolve(process.cwd(), "products_export_1 (5).csv");

type CatalogEntry = { title: string; priceUsd: number };

function buildCatalog(): Map<string, CatalogEntry> {
  const wb = XLSX.readFile(CATALOG_FILE, { type: "file" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
  const grouped = new Map<string, { title: string; prices: number[] }>();
  for (const r of rows) {
    const h = String(r["Handle"] || "").trim();
    if (!h) continue;
    if (!grouped.has(h)) grouped.set(h, { title: String(r["Title"] || "").trim(), prices: [] });
    const e = grouped.get(h)!;
    if (!e.title && r["Title"]) e.title = String(r["Title"]).trim();
    const p = parseFloat(String(r["Variant Price"] || ""));
    if (Number.isFinite(p) && p > 0) e.prices.push(p);
  }
  // Map keyed by NORMALIZED title for fast fuzzy lookups.
  const out = new Map<string, CatalogEntry>();
  for (const { title, prices } of grouped.values()) {
    if (!title || !prices.length) continue;
    const entry: CatalogEntry = { title, priceUsd: Math.min(...prices) };
    out.set(normalizeName(title), entry);
  }
  return out;
}

// Lowercase + strip parens, descriptors, spaces around dashes etc.
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*-\s*premium research peptide\s*$/, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .replace(/[^a-z0-9+ -]/g, "")
    .trim();
}

// Hand-curated aliases for things normalize() can't fix on its own.
const ALIASES: Record<string, string> = {
  "aod9604": "AOD-9604",
  "bpc-157": "BPC-157",
  "cjc-1295": "CJC-1295 (No DAC)",
  "epithalon": "Epitalon (Epithalon)",
  "epitalon": "Epitalon (Epithalon)",
  "glow": "Glow BPC-157 + GHK-CU + TB-500",
  "glow blend": "Glow BPC-157 + GHK-CU + TB-500",
  "klow blend": "KLOW Blend - GHK-CU + TB-500 + BPC-157 + KPV 10mg",
  "kpv": "KPV Tripeptide",
  "retatrutide": "Retatrutide Triple Agonist",
  "melanotan ii": "Melanotan II (MT2)",
  "hgh 191aa": "HGH 191AA (Somatropin)",
  "igf-1 lr3": "IGF-1 LR3 (Long R3)",
  "slu-pp-322": "SLU-PP-332",
  "bac water": "Sterile Water",
  "bac bacteriostatic water": "Sterile Water",
  "bacteriostatic water": "Sterile Water",
  "sterile water": "Sterile Water",
  "hgh fragment": "HGH Fragment 176-191",
  "hgh fargment 176-191": "HGH Fragment 176-191",
  "hyaluric acid": "Hyaluronic",
  "hyaluronic acid": "Hyaluronic",
  "cagrilatide": "Cagrilintide",
  "cagrilinride": "Cagrilintide",
  "cagrilitntide+semaglutide": "Cagrilintide",
  "cagrilintide+semaglutide": "Cagrilintide",
  "snap-8": "Snap-8",
  "ss-31": "SS-31",
  "lemon bottle 10mg": "Lemon Bottle",
  "lipo-c with vitamins c": "Lipo-C with B Vitamins",
  "acetic acid water": "Acetic Acid Water 0.6%",
  "acetic acid": "Acetic Acid Water 0.6%",
  "benzyl alcohol": "Benzyl Alcohol 0.9%",
  "cjc-1295 no dac": "CJC-1295 (No DAC)",
  "igf-1 lr3 long r3": "IGF-1 LR3 (Long R3)",
  "melanotan ii mt2": "Melanotan II (MT2)",
  "epitalon epithalon": "Epitalon (Epithalon)",
  "hgh 191aa somatropin": "HGH 191AA (Somatropin)",
};

function matchProduct(catalog: Map<string, CatalogEntry>, token: string): CatalogEntry | null {
  const norm = normalizeName(token);
  if (!norm) return null;
  // Direct match on normalized title.
  if (catalog.has(norm)) return catalog.get(norm)!;
  // Hand-curated alias.
  if (ALIASES[norm]) {
    const aliasNorm = normalizeName(ALIASES[norm]);
    if (catalog.has(aliasNorm)) return catalog.get(aliasNorm)!;
  }
  return null;
}

// Pull the per-store rows out of the xlsx.
function parseRows() {
  const wb = XLSX.readFile(TRANSFER_FILE);
  const ws = wb.Sheets["Old 600 Stores CANADA"];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });
  const out: {
    storeName: string;
    domain: string;
    address: string;
    productList: string;
  }[] = [];
  // Row 0 is the header in this sheet.
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const storeName = (r[7] || "").toString().trim();
    if (!storeName) continue;
    out.push({
      storeName,
      domain: (r[8] || "").toString().trim(),
      address: (r[9] || "").toString().trim(),
      productList: (r[6] || "").toString().trim(),
    });
  }
  return out;
}

function parseProductList(s: string): string[] {
  if (!s) return [];
  // Strip 'GMC (' wrapper: "GMC (a, b, c)" -> "a, b, c"
  let t = s.replace(/^GMC\s*\(/i, "").replace(/\)\s*$/, "");
  return t
    .split(/[,|]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function extractCity(addr: string): string {
  if (!addr) return "";
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[1] : "";
}

function buildWebsiteUrl(domain: string): string {
  const d = (domain || "").trim().replace(/^\s+/, "");
  if (!d) return "";
  if (/^https?:\/\//i.test(d)) return d;
  return `https://${d}`;
}

async function main() {
  console.log(`[transfer] mode = ${DRY ? "DRY RUN" : "WRITE"}`);

  const catalog = buildCatalog();
  console.log(`[transfer] catalog: ${catalog.size} priced products`);

  const stores = parseRows();
  console.log(`[transfer] stores: ${stores.length} rows`);

  // Stats pass — count matches/unmatches before any DB writes.
  const unmatched = new Map<string, number>();
  let totalOffers = 0;
  let storesWithOffers = 0;
  for (const s of stores) {
    const tokens = parseProductList(s.productList);
    let merchantOfferCount = 0;
    const seen = new Set<string>();
    for (const t of tokens) {
      const match = matchProduct(catalog, t);
      if (!match) {
        unmatched.set(t, (unmatched.get(t) || 0) + 1);
        continue;
      }
      if (seen.has(match.title)) continue;
      seen.add(match.title);
      merchantOfferCount++;
    }
    if (merchantOfferCount > 0) storesWithOffers++;
    totalOffers += merchantOfferCount;
  }

  console.log(`[transfer] would insert ${stores.length} merchants, ${totalOffers} offers`);
  console.log(`[transfer] stores with at least one offer: ${storesWithOffers}`);
  console.log(`[transfer] unmatched product tokens (top 10):`);
  const sorted = [...unmatched.entries()].sort((a, b) => b[1] - a[1]);
  for (const [tok, n] of sorted.slice(0, 10)) console.log(`  ${n}× "${tok}"`);

  if (DRY) {
    console.log(`[transfer] dry run complete. Re-run with --confirm to write.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // ----- DESTRUCTIVE WIPE -----
  console.log(`[transfer] wiping current merchants + offers…`);
  const offersDel = await pool.query("DELETE FROM offers");
  console.log(`[transfer]   deleted offers: ${offersDel.rowCount}`);
  const vpDel = await pool.query("DELETE FROM vendor_profiles");
  console.log(`[transfer]   deleted vendor_profiles: ${vpDel.rowCount}`);
  const userDel = await pool.query(`DELETE FROM users WHERE role = 'merchant'`);
  console.log(`[transfer]   deleted merchant users: ${userDel.rowCount}`);

  // ----- BUILD ROW ARRAYS IN MEMORY -----
  type UserRow = [string, string, string, string]; // id, username, email, first_name
  type VendorRow = [string, string, string, string, string | null, string, string | null, string | null]; // id, user_id, legal, trade, website, description, address, city
  type OfferRow = [string, string, string, string, string, string, string, string, string, string, string]; // id, vendor, title, product, short, full, url, pct, aov, slug, commissionDetails

  const userRows: UserRow[] = [];
  const vendorRows: VendorRow[] = [];
  const offerRows: OfferRow[] = [];

  const stamp = Date.now();
  let i = 0;
  for (const s of stores) {
    const city = extractCity(s.address);
    const websiteUrl = buildWebsiteUrl(s.domain);
    const userId = randomUUID();
    const vendorId = randomUUID();
    const slug = s.storeName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
    const userEmail = `merchant-${slug}-${stamp}-${i}@affexch.local`;
    const username = `merchant_${slug}_${stamp}_${i}`;
    const firstName = s.storeName.slice(0, 80);

    userRows.push([userId, username, userEmail, firstName]);

    const description = city
      ? `Peptide merchant in ${city}. Imported from Transfer Monitoring spreadsheet.`
      : `Peptide merchant. Imported from Transfer Monitoring spreadsheet.`;
    vendorRows.push([
      vendorId,
      userId,
      s.storeName,
      s.storeName,
      websiteUrl || null,
      description,
      s.address || null,
      city || null,
    ]);

    const seen = new Set<string>();
    for (const token of parseProductList(s.productList)) {
      const match = matchProduct(catalog, token);
      if (!match || seen.has(match.title)) continue;
      seen.add(match.title);

      const offerId = randomUUID();
      const offerSlug = `${match.title}-${s.storeName}-${vendorId.slice(0, 8)}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 200);
      const commissionDetails = JSON.stringify({
        type: "promo_code",
        percentage: COMMISSION_PCT,
      });
      const title = `${match.title} — ${s.storeName}`.slice(0, 100);
      const shortDescription = `${match.title} from ${s.storeName}${city ? ` in ${city}` : ""}.`.slice(0, 200);
      const fullDescription =
        `Promote ${match.title} from ${s.storeName}${city ? ` (${city})` : ""}. Customers redeem ` +
        `your PEP-XXXX-XXXX promo code at checkout for a discount, and you ` +
        `earn ${COMMISSION_PCT}% commission.`;
      const productUrl = websiteUrl || `https://${slug}.example`;

      offerRows.push([
        offerId,
        vendorId,
        title,
        match.title,
        shortDescription,
        fullDescription,
        productUrl,
        COMMISSION_PCT.toFixed(2),
        match.priceUsd.toFixed(2),
        offerSlug,
        commissionDetails,
      ]);
    }
    i++;
  }

  console.log(`[transfer] built rows: ${userRows.length} users, ${vendorRows.length} vendors, ${offerRows.length} offers`);

  // ----- BULK INSERT IN BATCHES -----
  // Postgres caps each statement at ~65k params, so 200 rows × ~11 cols stays
  // well under the limit while cutting roundtrips by 200×.
  const BATCH = 200;

  console.log(`[transfer] inserting users…`);
  {
    let written = 0;
    for (let start = 0; start < userRows.length; start += BATCH) {
      const chunk = userRows.slice(start, start + BATCH);
      const values: any[] = [];
      const placeholders = chunk
        .map((row, idx) => {
          const base = idx * 4;
          values.push(...row);
          return `($${base + 1}, $${base + 2}, $${base + 3}, NULL, 'merchant', 'active', true, $${base + 4}, NOW(), NOW(), NOW(), NOW())`;
        })
        .join(", ");
      await pool.query(
        `INSERT INTO users (id, username, email, password, role, account_status,
           email_verified, first_name, tos_accepted_at, privacy_accepted_at, created_at, updated_at)
         VALUES ${placeholders}`,
        values,
      );
      written += chunk.length;
      console.log(`[transfer]   users: ${written}/${userRows.length}`);
    }
  }

  console.log(`[transfer] inserting vendor_profiles…`);
  {
    let written = 0;
    for (let start = 0; start < vendorRows.length; start += BATCH) {
      const chunk = vendorRows.slice(start, start + BATCH);
      const values: any[] = [];
      const placeholders = chunk
        .map((row, idx) => {
          const base = idx * 8;
          values.push(...row);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, 'Peptides & Wellness', $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, 'CA', 'approved', false, NOW(), NOW())`;
        })
        .join(", ");
      await pool.query(
        `INSERT INTO vendor_profiles
           (id, user_id, legal_name, trade_name, industry, website_url, description,
            business_address, city, country, status, website_verified, created_at, updated_at)
         VALUES ${placeholders}`,
        values,
      );
      written += chunk.length;
      if (written % 1000 === 0 || written === vendorRows.length) {
        console.log(`[transfer]   vendor_profiles: ${written}/${vendorRows.length}`);
      }
    }
  }

  console.log(`[transfer] inserting offers…`);
  {
    let written = 0;
    for (let start = 0; start < offerRows.length; start += BATCH) {
      const chunk = offerRows.slice(start, start + BATCH);
      const values: any[] = [];
      const placeholders = chunk
        .map((row, idx) => {
          const base = idx * 11;
          values.push(...row);
          return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, 'wellness', $${base + 7}, 'promo_code', $${base + 8}, $${base + 9}, 'approved', $${base + 10}, $${base + 11}::jsonb, NOW(), NOW())`;
        })
        .join(", ");
      await pool.query(
        `INSERT INTO offers
           (id, vendor_id, title, product_name, short_description, full_description,
            primary_niche, product_url, commission_type, commission_percentage,
            average_order_value, status, slug, commission_details, created_at, updated_at)
         VALUES ${placeholders}`,
        values,
      );
      written += chunk.length;
      if (written % 1000 === 0 || written === offerRows.length) {
        console.log(`[transfer]   offers: ${written}/${offerRows.length}`);
      }
    }
  }

  console.log(`[transfer] done.`);
  await pool.end();
}

main().catch((err) => {
  console.error("[transfer] fatal:", err);
  process.exit(1);
});
