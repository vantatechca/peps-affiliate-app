// Merchant performance, levels, and ranking — derived from the legacy Order
// table (orders link to a merchant by normalized storeName = vendor_profiles.domain).
import { db } from "./db";
import { legacyOrders, vendorProfiles } from "../shared/schema";
import { sql } from "drizzle-orm";

// Levels are driven by LIFETIME order count. Thresholds are tunable here.
export const MERCHANT_LEVELS = [
  { key: "super", label: "Super Merchant", min: 100 },
  { key: "performing", label: "Performing", min: 50 },
  { key: "rising", label: "Rising", min: 10 },
  { key: "new", label: "New in the game", min: 0 },
] as const;

export function levelForOrders(orders: number) {
  const idx = MERCHANT_LEVELS.findIndex((l) => orders >= l.min);
  const level = MERCHANT_LEVELS[idx];
  const next = idx > 0 ? MERCHANT_LEVELS[idx - 1] : null;
  return {
    key: level.key,
    label: level.label,
    ordersToNext: next ? Math.max(0, next.min - orders) : null,
    nextLabel: next?.label ?? null,
  };
}

type Agg = { orders: number; revenue: number; commission: number };
const ZERO: Agg = { orders: 0, revenue: 0, commission: 0 };

// Strip the " | ref:ORD-..." suffix so each store aggregates under its domain.
const normDomain = sql<string>`trim(split_part(${legacyOrders.storeName}, '|', 1))`;
const notBlank = sql`${legacyOrders.storeName} is not null and ${legacyOrders.storeName} <> ''`;

async function aggregate(extra?: ReturnType<typeof sql>): Promise<Map<string, Agg>> {
  const rows = await db
    .select({
      domain: normDomain,
      orders: sql<number>`count(*)::int`,
      revenue: sql<string>`coalesce(sum(${legacyOrders.orderTotal}),0)`,
      commission: sql<string>`coalesce(sum(${legacyOrders.commissionEarned}),0)`,
    })
    .from(legacyOrders)
    .where(extra ? sql`${notBlank} and ${extra}` : notBlank)
    .groupBy(normDomain);
  return new Map(rows.map((r) => [r.domain, { orders: r.orders, revenue: parseFloat(r.revenue), commission: parseFloat(r.commission) }]));
}

function rankBy(map: Map<string, Agg>, metric: "orders" | "revenue"): Map<string, number> {
  const sorted = Array.from(map.entries())
    .filter(([, a]) => a[metric] > 0)
    .sort((a, b) => b[1][metric] - a[1][metric]);
  return new Map(sorted.map(([domain], i): [string, number] => [domain, i + 1]));
}

export type RankedMerchant = {
  id: string;
  name: string;
  domain: string | null;
  city: string | null;
  country: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  status: string | null;
  createdAt: Date | null;
  level: ReturnType<typeof levelForOrders>;
  orders: number;
  revenue: number;
  commission: number;
  rank: number;
  movement: number | null; // positive = climbed N spots vs prior window; null = no comparable
  isNew: boolean; // active this window, not the prior one
};

// Full merchant list with level + lifetime stats + movement vs the prior window.
export async function getRankedMerchants(opts: { metric?: "orders" | "revenue"; windowDays?: number } = {}): Promise<RankedMerchant[]> {
  const metric = opts.metric ?? "orders";
  const w = opts.windowDays ?? 30;

  const [lifetime, last, prior] = await Promise.all([
    aggregate(),
    aggregate(sql`${legacyOrders.createdAt} >= now() - make_interval(days => ${w})`),
    aggregate(sql`${legacyOrders.createdAt} >= now() - make_interval(days => ${w * 2}) and ${legacyOrders.createdAt} < now() - make_interval(days => ${w})`),
  ]);
  const lastRank = rankBy(last, metric);
  const priorRank = rankBy(prior, metric);

  const merchants = await db
    .select({
      id: vendorProfiles.id,
      name: vendorProfiles.tradeName,
      legalName: vendorProfiles.legalName,
      domain: vendorProfiles.domain,
      city: vendorProfiles.city,
      country: vendorProfiles.country,
      websiteUrl: vendorProfiles.websiteUrl,
      logoUrl: vendorProfiles.logoUrl,
      status: vendorProfiles.status,
      createdAt: vendorProfiles.createdAt,
    })
    .from(vendorProfiles);

  const list: RankedMerchant[] = merchants.map((m) => {
    const a = (m.domain && lifetime.get(m.domain)) || ZERO;
    const cur = m.domain ? lastRank.get(m.domain) ?? null : null;
    const pri = m.domain ? priorRank.get(m.domain) ?? null : null;
    const movement = cur != null && pri != null ? pri - cur : null;
    return {
      id: m.id,
      name: m.name || m.legalName,
      domain: m.domain,
      city: m.city,
      country: m.country,
      websiteUrl: m.websiteUrl,
      logoUrl: m.logoUrl,
      status: m.status,
      createdAt: m.createdAt,
      level: levelForOrders(a.orders),
      orders: a.orders,
      revenue: a.revenue,
      commission: a.commission,
      rank: 0,
      movement,
      isNew: cur != null && pri == null,
    };
  });

  // Rank by the chosen metric (lifetime), highest first.
  list.sort((x, y) => (metric === "revenue" ? y.revenue - x.revenue : y.orders - x.orders) || y.orders - x.orders);
  list.forEach((m, i) => (m.rank = i + 1));
  return list;
}
