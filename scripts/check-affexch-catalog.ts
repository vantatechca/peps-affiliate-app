// Verify AFFEXCH Phase 5 catalog state
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const totalCompanies = await pool.query(
    `SELECT COUNT(*)::int AS n FROM company_profiles WHERE legal_name LIKE '%[affexch-seed]%';`
  );
  console.log(`Seeded companies: ${totalCompanies.rows[0].n}`);

  const totalOffers = await pool.query(
    `SELECT COUNT(*)::int AS n FROM offers WHERE commission_type = 'promo_code' AND status = 'approved';`
  );
  console.log(`Promo-code offers (approved): ${totalOffers.rows[0].n}`);

  const byCity = await pool.query(
    `SELECT cp.city, COUNT(o.id)::int AS offers
       FROM company_profiles cp
       LEFT JOIN offers o ON o.company_id = cp.id AND o.status = 'approved'
       WHERE cp.legal_name LIKE '%[affexch-seed]%'
       GROUP BY cp.city
       ORDER BY offers DESC, cp.city
       LIMIT 35;`
  );
  console.log('\nOffers per city:');
  console.table(byCity.rows);

  const sample = await pool.query(
    `SELECT o.id, o.title, o.product_name, o.commission_percentage, o.average_order_value, cp.trade_name AS vendor, cp.city, cp.country
       FROM offers o JOIN company_profiles cp ON cp.id = o.company_id
       WHERE cp.city = 'Toronto'
       ORDER BY cp.trade_name
       LIMIT 6;`
  );
  console.log('\nSample (Toronto):');
  console.table(sample.rows);

  await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
