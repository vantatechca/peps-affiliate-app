// AFFEXCH promo code generator — format: PEP-XXXX-XXXX
// Uses unambiguous alphabet (no 0/O/1/I) so codes are easy to read & say aloud.
// Uniqueness is enforced by the promo_codes.code UNIQUE constraint; we retry
// on collision (vanishingly rare with 32^8 = ~1.1T codes).
import { db } from "./db";
import { promoCodes } from "../shared/schema";
import { eq } from "drizzle-orm";
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
        applicationId: applicationId ?? undefined,
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
