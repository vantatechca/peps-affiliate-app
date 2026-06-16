// AFFEXCH promo code generator — format: PEP-XXXX-XXXX
// Uses unambiguous alphabet (no 0/O/1/I) so codes are easy to read & say aloud.
// Uniqueness is enforced by the promo_codes.code UNIQUE constraint; we retry
// on collision (vanishingly rare with 32^8 = ~1.1T codes).
import { db } from "./db";
import { promoCodes, legacyOrders } from "../shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { randomInt } from "crypto";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function block4(): string {
  let out = "";
  for (let i = 0; i < 4; i++) out += CODE_CHARS[randomInt(0, CODE_CHARS.length)];
  return out;
}

export function generatePromoCode(): string {
  return `PEP-${block4()}-${block4()}`;
}

export async function mintUniquePromoCode(creatorId: string, applicationId: string | null = null): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generatePromoCode();
    try {
      await db.insert(promoCodes).values({
        creatorId,
        code,
        status: "active",
      });
      return code;
    } catch (err: any) {
      // 23505 = unique_violation in Postgres — retry on collision only
      if (err?.code === "23505") continue;
      throw err;
    }
  }
  throw new Error("Failed to mint unique promo code after 8 attempts");
}

export async function getCreatorPromoCode(creatorId: string): Promise<string | null> {
  const [row] = await db
    .select({ code: promoCodes.code })
    .from(promoCodes)
    .where(eq(promoCodes.creatorId, creatorId))
    .limit(1);
  return row?.code ?? null;
}

// Custom promo codes the creator picks themselves. 3–20 chars, letters/digits
// only — no PEP- prefix requirement. Uppercased so codes are case-insensitive
// at checkout (validation compares the stored code).
const CUSTOM_CODE_RE = /^[A-Z0-9]{3,20}$/;

/**
 * Set (or replace) the creator's promo code to a custom value.
 * Updates their existing promo_codes row in place so historical redemptions —
 * which reference the row id, not the code string — stay intact. Throws an
 * error carrying `statusCode` (400 invalid format, 409 already taken) so the
 * route can map it to the right HTTP status.
 */
export async function setCreatorPromoCode(creatorId: string, rawCode: string): Promise<string> {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!CUSTOM_CODE_RE.test(code)) {
    const e: any = new Error("Code must be 3–20 characters, letters and numbers only.");
    e.statusCode = 400;
    throw e;
  }

  const [existing] = await db
    .select({ id: promoCodes.id })
    .from(promoCodes)
    .where(eq(promoCodes.creatorId, creatorId))
    .limit(1);

  try {
    if (existing) {
      await db.update(promoCodes).set({ code }).where(eq(promoCodes.id, existing.id));
    } else {
      await db.insert(promoCodes).values({ creatorId, code, status: "active" });
    }
    return code;
  } catch (err: any) {
    // 23505 = unique_violation — another creator already owns this code
    if (err?.code === "23505") {
      const e: any = new Error("That code is already taken. Try a different one.");
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}

/** List ALL of a creator's promo codes (the old DiscountCode model allows many),
 *  with the count of orders attributed to each (for display + the delete prompt). */
export async function listCreatorPromoCodes(creatorId: string) {
  return db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      status: promoCodes.status,
      active: promoCodes.active,
      createdAt: promoCodes.createdAt,
      orderCount: sql<number>`count(${legacyOrders.id})::int`,
    })
    .from(promoCodes)
    .leftJoin(legacyOrders, eq(legacyOrders.promoCodeId, promoCodes.id))
    .where(eq(promoCodes.creatorId, creatorId))
    .groupBy(promoCodes.id, promoCodes.code, promoCodes.status, promoCodes.active, promoCodes.createdAt)
    .orderBy(desc(promoCodes.createdAt));
}

/** Activate/deactivate a creator-owned code. Keeps `status` and the old `active`
 *  flag in sync so the storefront's checkout validation honours it. */
export async function setPromoCodeActive(creatorId: string, id: string, active: boolean) {
  const res = await db
    .update(promoCodes)
    .set({ status: active ? "active" : "paused", active })
    .where(and(eq(promoCodes.id, id), eq(promoCodes.creatorId, creatorId)))
    .returning({ id: promoCodes.id, code: promoCodes.code, status: promoCodes.status, active: promoCodes.active });
  if (!res[0]) { const e: any = new Error("Promo code not found"); e.statusCode = 404; throw e; }
  return res[0];
}

/** Orders/sales/commission tied to a code — drives the delete confirmation prompt. */
export async function getPromoCodeDeletionInfo(creatorId: string, id: string) {
  const [code] = await db
    .select({ id: promoCodes.id, code: promoCodes.code })
    .from(promoCodes)
    .where(and(eq(promoCodes.id, id), eq(promoCodes.creatorId, creatorId)))
    .limit(1);
  if (!code) { const e: any = new Error("Promo code not found"); e.statusCode = 404; throw e; }
  const [agg] = await db
    .select({
      orderCount: sql<number>`count(*)::int`,
      totalSales: sql<string>`coalesce(sum(${legacyOrders.orderTotal}),0)`,
      totalCommission: sql<string>`coalesce(sum(${legacyOrders.commissionEarned}),0)`,
    })
    .from(legacyOrders)
    .where(eq(legacyOrders.promoCodeId, id));
  return {
    code: code.code,
    orderCount: agg?.orderCount ?? 0,
    totalSales: agg?.totalSales ?? "0",
    totalCommission: agg?.totalCommission ?? "0",
  };
}

/** Delete a creator-owned code — ONLY allowed when it has no attributed orders.
 *  If orders exist, refuses (409 with counts); the creator should deactivate
 *  instead. We never delete shared Order/OrderCommission records. */
export async function deleteCreatorPromoCode(creatorId: string, id: string) {
  const info = await getPromoCodeDeletionInfo(creatorId, id);
  if (info.orderCount > 0) {
    const e: any = new Error(`This code has ${info.orderCount} attributed order(s) and can't be deleted. Deactivate it instead.`);
    e.statusCode = 409;
    e.info = info;
    throw e;
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from "CommissionSplit" where "discountCodeId" = ${id}`);
    await tx.delete(promoCodes).where(and(eq(promoCodes.id, id), eq(promoCodes.creatorId, creatorId)));
  });
  return info;
}

/** Create an ADDITIONAL promo code for the creator (does not replace existing). */
export async function createCreatorPromoCode(creatorId: string, rawCode: string): Promise<string> {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!CUSTOM_CODE_RE.test(code)) {
    const e: any = new Error("Code must be 3–20 characters, letters and numbers only.");
    e.statusCode = 400;
    throw e;
  }
  try {
    // 0.1000 = 10% customer discount (matches existing codes); commission uses
    // the affiliate's default rate (commissionRateOverride left null).
    await db.insert(promoCodes).values({ creatorId, code, status: "active", legacyDiscountPercent: "0.1000" } as any);
    return code;
  } catch (err: any) {
    if (err?.code === "23505") {
      const e: any = new Error("That code is already taken. Try a different one.");
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
}
