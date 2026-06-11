// AFFEXCH Phase 5 — seed stub peptide-vendor catalog
// Creates one system user, then 4 vendor (company_profile + offer) pairs per city
// across the 30 AFFEXCH-supported cities (120 vendors total).
// Idempotent: skips vendors whose legalName already exists.
// See docs/AFFEXCH_SESSION_HANDOFF.md §5 Phase 5.
//
// Run: npx tsx --env-file=.env scripts/seed-affexch-vendors.ts
//   --dry      preview without writing
//   --replace  delete existing seed rows first (use to refresh)

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import { eq, like } from "drizzle-orm";
import { randomUUID } from "crypto";
import { users, companyProfiles, offers } from "../shared/schema";

neonConfig.webSocketConstructor = ws;

// Internal marker on legalName so we can find + clean these later (--replace).
const SEED_MARKER = "[affexch-seed]";

const PEPTIDES = [
  { name: "BPC-157",    priceUsd: 120, badge: "20%" },
  { name: "TB-500",     priceUsd: 140, badge: "20%" },
  { name: "CJC-1295",   priceUsd: 95,  badge: "20%" },
  { name: "Ipamorelin", priceUsd: 90,  badge: "20%" },
  { name: "Sermorelin", priceUsd: 110, badge: "20%" },
  { name: "Epithalon",  priceUsd: 130, badge: "20%" },
];

type City = { id: string; name: string; country: "CA" | "US"; tag: string; neighborhoods: string[] };

const ALL_CITIES: City[] = [
  { id: "tor", name: "Toronto",        country: "CA", tag: "TOR", neighborhoods: ["Yorkville", "Queen West", "Liberty Village", "The Annex"] },
  { id: "nyc", name: "New York",       country: "US", tag: "NYC", neighborhoods: ["SoHo", "Chelsea", "Tribeca", "Williamsburg"] },
  { id: "lax", name: "Los Angeles",    country: "US", tag: "LAX", neighborhoods: ["Venice", "Silver Lake", "West Hollywood", "Pasadena"] },
  { id: "van", name: "Vancouver",      country: "CA", tag: "VAN", neighborhoods: ["Yaletown", "Kitsilano", "Gastown", "Mount Pleasant"] },
  { id: "chi", name: "Chicago",        country: "US", tag: "CHI", neighborhoods: ["Lincoln Park", "Wicker Park", "River North", "Logan Square"] },
  { id: "mtl", name: "Montreal",       country: "CA", tag: "MTL", neighborhoods: ["Plateau", "Mile End", "Old Port", "Westmount"] },
  { id: "hou", name: "Houston",        country: "US", tag: "HOU", neighborhoods: ["Montrose", "The Heights", "Midtown", "Rice Village"] },
  { id: "yyc", name: "Calgary",        country: "CA", tag: "YYC", neighborhoods: ["Kensington", "Inglewood", "Mission", "Beltline"] },
  { id: "mia", name: "Miami",          country: "US", tag: "MIA", neighborhoods: ["Wynwood", "Brickell", "Coral Gables", "South Beach"] },
  { id: "ott", name: "Ottawa",         country: "CA", tag: "OTT", neighborhoods: ["Glebe", "ByWard Market", "Westboro", "Hintonburg"] },
  { id: "sea", name: "Seattle",        country: "US", tag: "SEA", neighborhoods: ["Capitol Hill", "Ballard", "Fremont", "Queen Anne"] },
  { id: "bos", name: "Boston",         country: "US", tag: "BOS", neighborhoods: ["Back Bay", "Cambridge", "South End", "Beacon Hill"] },
  { id: "sfo", name: "San Francisco",  country: "US", tag: "SFO", neighborhoods: ["Mission", "SoMa", "Marina", "Castro"] },
  { id: "atl", name: "Atlanta",        country: "US", tag: "ATL", neighborhoods: ["Buckhead", "Midtown", "Inman Park", "Virginia-Highland"] },
  { id: "phx", name: "Phoenix",        country: "US", tag: "PHX", neighborhoods: ["Roosevelt Row", "Arcadia", "Old Town Scottsdale", "Biltmore"] },
  { id: "yeg", name: "Edmonton",       country: "CA", tag: "YEG", neighborhoods: ["Whyte Avenue", "Garneau", "124 Street", "Downtown"] },
  { id: "ywg", name: "Winnipeg",       country: "CA", tag: "YWG", neighborhoods: ["Exchange District", "Osborne Village", "Wolseley", "Corydon"] },
  { id: "yqb", name: "Quebec City",    country: "CA", tag: "YQB", neighborhoods: ["Saint-Roch", "Old Quebec", "Sillery", "Montcalm"] },
  { id: "yhz", name: "Halifax",        country: "CA", tag: "YHZ", neighborhoods: ["South End", "North End", "Spring Garden", "Waterfront"] },
  { id: "den", name: "Denver",         country: "US", tag: "DEN", neighborhoods: ["LoDo", "RiNo", "Cherry Creek", "Highlands"] },
  { id: "pdx", name: "Portland",       country: "US", tag: "PDX", neighborhoods: ["Pearl District", "Alberta Arts", "Hawthorne", "Mississippi"] },
  { id: "san", name: "San Diego",      country: "US", tag: "SAN", neighborhoods: ["Gaslamp", "La Jolla", "Hillcrest", "North Park"] },
  { id: "dal", name: "Dallas",         country: "US", tag: "DAL", neighborhoods: ["Deep Ellum", "Uptown", "Bishop Arts", "Knox-Henderson"] },
  { id: "phl", name: "Philadelphia",   country: "US", tag: "PHL", neighborhoods: ["Rittenhouse", "Old City", "Fishtown", "Northern Liberties"] },
  { id: "det", name: "Detroit",        country: "US", tag: "DET", neighborhoods: ["Corktown", "Midtown", "Eastern Market", "Greektown"] },
  { id: "msp", name: "Minneapolis",    country: "US", tag: "MSP", neighborhoods: ["Uptown", "North Loop", "Northeast", "Lyn-Lake"] },
  { id: "aus", name: "Austin",         country: "US", tag: "AUS", neighborhoods: ["South Congress", "East Austin", "Domain", "Zilker"] },
  { id: "las", name: "Las Vegas",      country: "US", tag: "LAS", neighborhoods: ["The Strip", "Summerlin", "Downtown", "Henderson"] },
  { id: "dca", name: "Washington",     country: "US", tag: "DCA", neighborhoods: ["Georgetown", "Dupont Circle", "Capitol Hill", "U Street"] },
  { id: "yyz", name: "Mississauga",    country: "CA", tag: "YYZ", neighborhoods: ["Port Credit", "Streetsville", "Square One", "Erin Mills"] },
];

const BIZ_TEMPLATES = [
  (_c: City, h: string) => `${h} Peptide Lab`,
  (c: City, h: string) => `${c.tag} ${h} BioRx`,
  (_c: City, h: string) => `${h} Compound Pharmacy`,
  (_c: City, h: string) => `${h} Wellness Group`,
];

function deterministicSeed(cityId: string) {
  return cityId.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
}

function rowsForCity(city: City) {
  const seed = deterministicSeed(city.id);
  return Array.from({ length: 4 }, (_, i) => {
    const hood = city.neighborhoods[i % city.neighborhoods.length];
    const pep = PEPTIDES[(seed + i * 3) % PEPTIDES.length];
    const business = BIZ_TEMPLATES[i](city, hood);
    return {
      i,
      legalName: `${business} ${SEED_MARKER}`,
      tradeName: business,
      neighborhood: hood,
      peptide: pep,
      websiteUrl: `https://${business.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
    };
  });
}

async function main() {
  const replaceMode = process.argv.includes("--replace");
  const dryRun = process.argv.includes("--dry");
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Use --env-file=.env.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  async function insertOfferRaw(args: {
    id: string;
    companyId: string;
    title: string;
    productName: string;
    shortDescription: string;
    fullDescription: string;
    primaryNiche: string;
    productUrl: string;
    commissionPercentage: string;
    averageOrderValue: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    // Raw SQL because the live `offers` table has columns (slug, others) that
    // are NOT NULL in DB but absent from shared/schema.ts. Drizzle would strip
    // any field not declared in the schema, causing a NOT NULL violation.
    // commission_details is a NOT NULL jsonb column on the live offers table.
    const commissionDetails = JSON.stringify({
      type: "promo_code",
      percentage: Number(args.commissionPercentage),
    });
    await pool.query(
      `INSERT INTO offers
       (id, company_id, title, product_name, short_description, full_description,
        primary_niche, product_url, commission_type, commission_percentage,
        average_order_value, status, slug, commission_details, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'promo_code',$9,$10,'approved',$11,$12::jsonb,$13,$14)`,
      [
        args.id,
        args.companyId,
        args.title,
        args.productName,
        args.shortDescription,
        args.fullDescription,
        args.primaryNiche,
        args.productUrl,
        args.commissionPercentage,
        args.averageOrderValue,
        args.slug,
        commissionDetails,
        args.createdAt,
        args.updatedAt,
      ]
    );
  }

  try {
    if (replaceMode && !dryRun) {
      console.log(`[seed] --replace: deleting existing seed rows tagged ${SEED_MARKER}...`);
      // Cascade from company_profiles → offers (FK is offers.company_id ON DELETE CASCADE)
      await db.delete(companyProfiles).where(like(companyProfiles.legalName, `%${SEED_MARKER}%`));
    }

    let inserted = 0;
    let skipped = 0;

    for (const city of ALL_CITIES) {
      for (const v of rowsForCity(city)) {
        // Skip if a company with this legalName already exists (idempotency)
        const [exists] = await db
          .select({ id: companyProfiles.id })
          .from(companyProfiles)
          .where(eq(companyProfiles.legalName, v.legalName))
          .limit(1);
        if (exists) { skipped++; continue; }

        if (dryRun) {
          console.log(`[dry] would create: ${v.tradeName} (${city.name}/${city.country}) - ${v.peptide.name} $${v.peptide.priceUsd}`);
          inserted++;
          continue;
        }

        // Each seed vendor reuses the system user. The DB has user_id UNIQUE on
        // company_profiles, so we must drop that constraint OR create a stub
        // user per vendor. Quickest: create one stub user per company.
        const now = new Date();
        const stubUser = await db
          .insert(users)
          .values({
            id: randomUUID(),
            username: `affexch_${city.id}_${v.i}_${Date.now()}`,
            email: `affexch-${city.id}-${v.i}-${Date.now()}@vantatechca.local`,
            password: null,
            firstName: v.tradeName,
            role: "merchant",
            accountStatus: "active",
            emailVerified: true,
            tosAcceptedAt: now,
            privacyAcceptedAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: users.id });

        const [company] = await db
          .insert(companyProfiles)
          .values({
            id: randomUUID(),
            userId: stubUser[0].id,
            legalName: v.legalName,
            tradeName: v.tradeName,
            industry: "Peptides & Wellness",
            websiteUrl: v.websiteUrl,
            description: `Peptide vendor in ${v.neighborhood}, ${city.name}. Seeded for AFFEXCH catalog stub.`,
            city: city.name,
            country: city.country,
            status: "approved",
            websiteVerified: false,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        const slug = `${v.peptide.name}-${v.tradeName}-${city.tag}-${v.i}`
          .toLowerCase().replace(/[^a-z0-9]+/g, "-");
        await insertOfferRaw({
          id: randomUUID(),
          companyId: company.id,
          title: `${v.peptide.name} — ${v.tradeName}`,
          productName: v.peptide.name,
          shortDescription: `${v.peptide.name} from ${v.tradeName} in ${city.name}.`,
          fullDescription: `Promote ${v.peptide.name} from ${v.tradeName} (${v.neighborhood}, ${city.name}). Customers redeem your PEP-XXXX-XXXX promo code at checkout for a discount, and you earn 20% commission. This is a stub catalog entry — replace with real vendor data when available.`,
          primaryNiche: "peptides",
          productUrl: v.websiteUrl,
          commissionPercentage: "20.00",
          averageOrderValue: v.peptide.priceUsd.toFixed(2),
          slug,
          createdAt: now,
          updatedAt: now,
        });

        inserted++;
      }
    }

    console.log(`[seed] done. inserted=${inserted} skipped=${skipped} dry=${dryRun}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
