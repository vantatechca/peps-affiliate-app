// AFFEXCH peptide pivot — Phase 4-7 routes
// See docs/AFFEXCH_SESSION_HANDOFF.md §5 Phases 4-7
import type { Express, Request, Response, NextFunction } from "express";
import { createHash, timingSafeEqual, randomUUID } from "crypto";
import { db, pool } from "./db";
import { promoCodes, contentLinks, creatorProfiles, users, offers, vendorProfiles, codeRedemptions, communityChatMessages, creatorPayoutMethods, creatorPayouts, auditLogs, legacyOrders, legacyOrderCommissions } from "../shared/schema";
import { eq, and, desc, sql, inArray, sum } from "drizzle-orm";
import { isAuthenticated } from "./localAuth";
import { getCreatorPromoCode, setCreatorPromoCode } from "./affexchPromoCode";
import { NotificationService } from "./notifications/notificationService";
import { storage } from "./storage";

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as any;
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (user.role !== "admin") return res.status(403).json({ error: "Admin role required" });
  next();
}

// Tier thresholds (approved content_links count → tier).
// Source of truth: docs/AFFEXCH_SESSION_HANDOFF.md §3 ("0=PENDING, 1=VERIFIED, 5=SILVER, 10=GOLD, 20=ELITE")
const TIER_THRESHOLDS: Array<{ tier: "pending" | "verified" | "silver" | "gold" | "elite"; min: number }> = [
  { tier: "elite", min: 20 },
  { tier: "gold", min: 10 },
  { tier: "silver", min: 5 },
  { tier: "verified", min: 1 },
  { tier: "pending", min: 0 },
];

function tierFromApprovedCount(approved: number) {
  for (const t of TIER_THRESHOLDS) if (approved >= t.min) return t.tier;
  return "pending" as const;
}

function nextTierForApprovedCount(approved: number) {
  for (let i = TIER_THRESHOLDS.length - 2; i >= 0; i--) {
    const t = TIER_THRESHOLDS[i];
    if (approved < t.min) return { tier: t.tier, min: t.min, remaining: t.min - approved };
  }
  return null;
}

const PLATFORM_REGEX = /^(youtube|tiktok|instagram)$/i;
const URL_REGEX = /^https?:\/\/.+\..+/i;
const PROMO_CODE_REGEX = /^PEP-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

// Hash a customer email so we never store it in cleartext.
// SHA-256 with no salt — purpose is privacy + de-duplication, not credential storage.
function hashCustomerEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// Constant-time string compare so vendor key lookups can't be timing-side-channel'd.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Vendor-API-key auth middleware. Expects either:
//   Authorization: Bearer <key>
//   X-Vendor-API-Key: <key>
// Loads the matching company_profiles row and attaches it as (req as any).vendor.
async function vendorApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let presented = req.header("x-vendor-api-key");
    if (!presented) {
      const auth = req.header("authorization") ?? "";
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (m) presented = m[1];
    }
    if (!presented) return res.status(401).json({ error: "Merchant API key required" });
    if (presented.length < 16 || presented.length > 64) {
      return res.status(401).json({ error: "Invalid merchant API key" });
    }

    // Look up by exact match. trackingApiKey is unique enough that loading all
    // vendors then constant-time-comparing isn't required for current scale.
    const [vendor] = await db
      .select({
        id: vendorProfiles.id,
        userId: vendorProfiles.userId,
        legalName: vendorProfiles.legalName,
        tradeName: vendorProfiles.tradeName,
        status: vendorProfiles.status,
        trackingApiKey: vendorProfiles.trackingApiKey,
      })
      .from(vendorProfiles)
      .where(eq(vendorProfiles.trackingApiKey, presented))
      .limit(1);

    if (!vendor || !vendor.trackingApiKey || !safeEqual(presented, vendor.trackingApiKey)) {
      return res.status(401).json({ error: "Invalid merchant API key" });
    }
    if (vendor.status !== "approved") {
      return res.status(403).json({ error: "Merchant account not approved" });
    }
    (req as any).vendor = vendor;
    next();
  } catch (err: any) {
    console.error("[AFFEXCH] vendor auth error:", err);
    res.status(500).json({ error: "Merchant auth failed" });
  }
}

// Lightweight audit-log helper. Fire-and-forget — admin actions don't
// fail if logging hiccups. Captures who did what + a small JSON payload.
async function writeAudit(
  req: Request,
  action: string,
  entityType: string,
  entityId: string | null,
  changes: Record<string, any> = {},
  reason: string | null = null,
) {
  try {
    const user = req.user as any;
    if (!user?.id) return;
    await db.insert(auditLogs).values({
      userId: user.id,
      action,
      entityType,
      entityId: entityId ?? undefined,
      changes,
      reason: reason ?? undefined,
      ipAddress: (req.ip ?? req.headers["x-forwarded-for"]?.toString() ?? null) as string | undefined,
      userAgent: req.headers["user-agent"]?.toString() ?? undefined,
    });
  } catch (err) {
    console.warn("[AFFEXCH] audit log write failed:", err);
  }
}

// Per-method sanitiser for payout-method `details` payload. Keeps junk
// out of the DB and ensures admin sees the minimum fields needed to pay
// the creator off-platform.
function sanitizePayoutDetails(method: string, details: Record<string, any>): { value: Record<string, any> } | { error: string; value?: never } {
  const str = (v: any, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  if (method === "paypal") {
    const email = str(details.email, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "A valid PayPal email is required" };
    return { value: { email } };
  }
  if (method === "interac") {
    // Interac e-Transfer sends to either email OR phone — accept either, require at least one.
    const email = str(details.email, 120);
    const phone = str(details.phone, 30);
    const securityAnswer = str(details.securityAnswer, 200);
    const hasEmail = email.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const hasPhone = phone.length >= 7;
    if (!hasEmail && !hasPhone) {
      return { error: "Interac e-Transfer needs an email or phone number" };
    }
    if (email && !hasEmail) {
      return { error: "Interac email is invalid" };
    }
    return {
      value: {
        ...(hasEmail ? { email } : {}),
        ...(hasPhone ? { phone } : {}),
        ...(securityAnswer ? { securityAnswer } : {}),
      },
    };
  }
  if (method === "crypto") {
    const wallet = str(details.wallet, 200);
    const network = str(details.network, 30) || "USDC-ERC20";
    if (wallet.length < 6) return { error: "Wallet address is required" };
    return { value: { wallet, network } };
  }
  if (method === "wire") {
    const accountHolder = str(details.accountHolder, 120);
    const accountNumber = str(details.accountNumber, 60);
    const routing = str(details.routing, 60);
    const bank = str(details.bank, 120);
    if (!accountHolder || !accountNumber) return { error: "Account holder + account number are required" };
    return { value: { accountHolder, accountNumber, routing, bank } };
  }
  // "other" — free text, capped
  return { value: { details: str(details.details, 500) } };
}

export function registerAffexchRoutes(app: Express) {
  // GET /api/affiliate/me — dashboard summary: promo code, tier, link counts
  app.get("/api/affiliate/me", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }

      // Promo code is creator-chosen; null until they set one on the Promo
      // Code page. No auto-generation.
      const code = await getCreatorPromoCode(user.id);

      // Counts by status
      const rows = await db
        .select({ status: contentLinks.status })
        .from(contentLinks)
        .where(eq(contentLinks.creatorId, user.id));

      const counts = { pending: 0, approved: 0, rejected: 0 };
      for (const r of rows) counts[r.status as keyof typeof counts]++;

      const tier = tierFromApprovedCount(counts.approved);
      const next = nextTierForApprovedCount(counts.approved);

      // Pull creator_profiles affiliate_tier — keep DB in sync if it drifted
      const [profile] = await db
        .select({ affiliateTier: creatorProfiles.affiliateTier, city: creatorProfiles.city })
        .from(creatorProfiles)
        .where(eq(creatorProfiles.userId, user.id))
        .limit(1);

      if (profile && profile.affiliateTier !== tier) {
        await db
          .update(creatorProfiles)
          .set({ affiliateTier: tier, updatedAt: new Date() })
          .where(eq(creatorProfiles.userId, user.id));
      }

      res.json({
        promoCode: code,
        tier,
        nextTier: next, // { tier, min, remaining } or null if already elite
        linkCounts: counts,
        city: profile?.city ?? null,
      });
    } catch (err: any) {
      console.error("[AFFEXCH] /me error:", err);
      res.status(500).json({ error: err?.message || "Failed to load affiliate summary" });
    }
  });

  // PATCH /api/affiliate/me/city — creator updates their saved city.
  // The city is used downstream to highlight local peptide vendors on the
  // dashboard / landing flow. We accept the city display name (e.g. "Toronto")
  // — matches creatorProfiles.city column and vendorProfiles.city joins.
  app.patch("/api/affiliate/me/city", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const { city } = req.body ?? {};
      if (city !== null && (typeof city !== "string" || city.length > 60 || city.trim().length === 0)) {
        return res.status(400).json({ error: "City must be a non-empty string (max 60 chars) or null" });
      }
      const value = city === null ? null : city.trim();
      const [row] = await db
        .update(creatorProfiles)
        .set({ city: value, updatedAt: new Date() })
        .where(eq(creatorProfiles.userId, user.id))
        .returning({ city: creatorProfiles.city });
      if (!row) return res.status(404).json({ error: "Creator profile not found" });
      res.json({ city: row.city });
    } catch (err: any) {
      console.error("[AFFEXCH] /me/city PATCH error:", err);
      res.status(500).json({ error: err?.message || "Failed to update city" });
    }
  });

  // PATCH /api/affiliate/me/promo-code — creator sets a custom promo code,
  // replacing the auto-assigned PEP-XXXX-XXXX. Format is validated and
  // uniqueness enforced by setCreatorPromoCode (409 if the code is taken).
  app.patch("/api/affiliate/me/promo-code", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const { code } = req.body ?? {};
      if (typeof code !== "string") {
        return res.status(400).json({ error: "Code is required" });
      }
      const promoCode = await setCreatorPromoCode(user.id, code);
      res.json({ promoCode });
    } catch (err: any) {
      const status = err?.statusCode ?? 500;
      if (status === 500) console.error("[AFFEXCH] /me/promo-code PATCH error:", err);
      res.status(status).json({ error: err?.message || "Failed to update promo code" });
    }
  });

  // GET /api/affiliate/content-links — list this creator's submitted links
  app.get("/api/affiliate/content-links", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const rows = await db
        .select()
        .from(contentLinks)
        .where(eq(contentLinks.creatorId, user.id))
        .orderBy(desc(contentLinks.createdAt));
      res.json(rows);
    } catch (err: any) {
      console.error("[AFFEXCH] content-links GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to list content links" });
    }
  });

  // GET /api/affiliate/offers — public catalog query for the landing page.
  // ?city=Toronto&limit=4 → 4 peptide vendors in Toronto.
  // No city → returns up to `limit` offers across all cities (catalog browse).
  // Shape mirrors the algorithmic offersForCity() in client/src/landing-affexch/lib/cities.js
  // so the React swap is seamless.
  app.get("/api/affiliate/offers", async (req: Request, res) => {
    try {
      const city = typeof req.query.city === "string" ? req.query.city : null;
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "4"), 10) || 4, 1), 20);

      const whereClauses = [eq(offers.status, "approved"), eq(offers.commissionType, "promo_code" as any)];
      if (city) whereClauses.push(eq(vendorProfiles.city, city));

      const rows = await db
        .select({
          id: offers.id,
          productName: offers.productName,
          title: offers.title,
          commissionPercentage: offers.commissionPercentage,
          averageOrderValue: offers.averageOrderValue,
          tradeName: vendorProfiles.tradeName,
          legalName: vendorProfiles.legalName,
          city: vendorProfiles.city,
          country: vendorProfiles.country,
          description: vendorProfiles.description,
        })
        .from(offers)
        .innerJoin(vendorProfiles, eq(offers.companyId, vendorProfiles.id))
        .where(and(...whereClauses))
        .orderBy(sql`random()`)
        .limit(limit);

      // Map to the PeptideOffers card shape.
      const result = rows.map((r) => {
        const pct = parseFloat(r.commissionPercentage ?? "0");
        const aov = parseFloat(r.averageOrderValue ?? "0");
        const earn = pct && aov ? "+$" + Math.round((pct / 100) * aov) : "";
        // Extract neighborhood from description (seed wrote "Peptide vendor in <neighborhood>, <city>.")
        const neighborhood = r.description?.match(/in\s+(.+?),/i)?.[1] ?? null;
        return {
          id: r.id,
          business: r.tradeName ?? r.legalName,
          peptide: r.productName,
          neighborhood,
          city: r.city,
          country: r.country,
          price: aov ? "$" + aov.toFixed(0) : "",
          earn,
          badge: pct ? `${Math.round(pct)}%` : "20%",
        };
      });

      res.json(result);
    } catch (err: any) {
      console.error("[AFFEXCH] offers GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to list offers" });
    }
  });

  // POST /api/affiliate/content-links — submit a new link
  app.post("/api/affiliate/content-links", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const { url, platform } = req.body ?? {};
      if (!url || typeof url !== "string" || !URL_REGEX.test(url)) {
        return res.status(400).json({ error: "A valid URL (http:// or https://) is required" });
      }
      if (!platform || !PLATFORM_REGEX.test(platform)) {
        return res.status(400).json({ error: "Platform must be youtube, tiktok, or instagram" });
      }
      const [row] = await db
        .insert(contentLinks)
        .values({
          creatorId: user.id,
          url: url.trim(),
          platform: platform.toLowerCase() as any,
          status: "pending",
        })
        .returning();

      // Notify every admin so the approval queue gets attention.
      try {
        const ns = new NotificationService(storage);
        const admins = await storage.getAdminUsers();
        const creatorLabel = user.firstName || user.email || "A creator";
        for (const a of admins) {
          await ns.sendNotification(
            a.id,
            "system_announcement" as any,
            "New content link to review",
            `${creatorLabel} submitted a ${platform.toLowerCase()} link awaiting approval.`,
            { linkUrl: "/admin/content-links" }
          );
        }
      } catch (notifyErr) {
        console.error("[AFFEXCH] notify on link submit failed:", notifyErr);
      }

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] content-links POST error:", err);
      res.status(500).json({ error: err?.message || "Failed to submit content link" });
    }
  });

  // GET /api/affiliate/redemptions — list this creator's redemptions for the
  // dashboard Sales Tracker section.
  app.get("/api/affiliate/redemptions", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      // CUTOVER: a creator's redemptions = their rows in the OrderCommission
      // ledger, joined to the Order for sale amount / store / date.
      const rows = await db
        .select({
          id: legacyOrderCommissions.id,
          saleAmount: legacyOrders.orderTotal,
          commissionAmount: legacyOrderCommissions.amount,
          redeemedAt: legacyOrders.createdAt,
          vendorName: legacyOrders.storeName,
          promoCode: promoCodes.code,
        })
        .from(legacyOrderCommissions)
        .innerJoin(legacyOrders, eq(legacyOrderCommissions.orderId, legacyOrders.id))
        .leftJoin(promoCodes, eq(legacyOrders.promoCodeId, promoCodes.id))
        .where(eq(legacyOrderCommissions.recipientUserId, user.id))
        .orderBy(desc(legacyOrders.createdAt))
        .limit(100);
      res.json(rows.map((r) => ({ ...r, vendorLegalName: r.vendorName, vendorCity: null })));
    } catch (err: any) {
      console.error("[AFFEXCH] redemptions GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to list redemptions" });
    }
  });

  // ===== AFFEXCH manual payout flow =====
  // No payment processor wired — admin moves money off-platform and records
  // it here. Balance = sum(commission_amount) - sum(amount where status='paid').

  const PAYOUT_METHOD_REGEX = /^(paypal|interac|crypto|wire|other)$/i;
  const MIN_PAYOUT_AMOUNT = 50; // USD floor — keeps admin from chasing dust payouts.

  // Compute the creator's accrued commission + payout aggregates in one shot.
  async function getCreatorBalance(creatorId: string) {
    // CUTOVER: earnings come from the OrderCommission ledger (recipient = creator).
    const [redRow] = await db
      .select({ total: sum(legacyOrderCommissions.amount) })
      .from(legacyOrderCommissions)
      .where(eq(legacyOrderCommissions.recipientUserId, creatorId));
    const [paidRow] = await db
      .select({ total: sum(creatorPayouts.amount) })
      .from(creatorPayouts)
      .where(and(eq(creatorPayouts.creatorId, creatorId), eq(creatorPayouts.status, "PAID")));
    const [pendingRow] = await db
      .select({ total: sum(creatorPayouts.amount) })
      .from(creatorPayouts)
      .where(and(eq(creatorPayouts.creatorId, creatorId), eq(creatorPayouts.status, "PENDING")));

    const earned = parseFloat(redRow?.total ?? "0");
    const paid = parseFloat(paidRow?.total ?? "0");
    const pending = parseFloat(pendingRow?.total ?? "0");
    const available = Math.max(0, earned - paid - pending);
    return { earned, paid, pending, available };
  }

  // GET /api/affiliate/balance — total earned + paid + pending + available
  app.get("/api/affiliate/balance", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const balance = await getCreatorBalance(user.id);
      res.json({ ...balance, minPayout: MIN_PAYOUT_AMOUNT });
    } catch (err: any) {
      console.error("[AFFEXCH] balance GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to load balance" });
    }
  });

  // GET /api/affiliate/payout-method — current saved method (or null)
  app.get("/api/affiliate/payout-method", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const [row] = await db
        .select()
        .from(creatorPayoutMethods)
        .where(eq(creatorPayoutMethods.creatorId, user.id))
        .limit(1);
      res.json(row ?? null);
    } catch (err: any) {
      console.error("[AFFEXCH] payout-method GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to load payout method" });
    }
  });

  // PUT /api/affiliate/payout-method — upsert saved method
  app.put("/api/affiliate/payout-method", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const { method, details } = req.body ?? {};
      if (!method || !PAYOUT_METHOD_REGEX.test(method)) {
        return res.status(400).json({ error: "method must be paypal, interac, crypto, wire, or other" });
      }
      if (details && typeof details !== "object") {
        return res.status(400).json({ error: "details must be an object" });
      }
      const cleanDetails = sanitizePayoutDetails(method.toLowerCase(), details ?? {});
      if ("error" in cleanDetails) {
        return res.status(400).json({ error: cleanDetails.error });
      }

      const [existing] = await db
        .select({ id: creatorPayoutMethods.id })
        .from(creatorPayoutMethods)
        .where(eq(creatorPayoutMethods.creatorId, user.id))
        .limit(1);

      let row;
      if (existing) {
        [row] = await db
          .update(creatorPayoutMethods)
          .set({ method: method.toLowerCase(), details: cleanDetails.value, updatedAt: new Date() })
          .where(eq(creatorPayoutMethods.id, existing.id))
          .returning();
      } else {
        [row] = await db
          .insert(creatorPayoutMethods)
          .values({ creatorId: user.id, method: method.toLowerCase(), details: cleanDetails.value })
          .returning();
      }
      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] payout-method PUT error:", err);
      res.status(500).json({ error: err?.message || "Failed to save payout method" });
    }
  });

  // GET /api/affiliate/payouts — payout history for the current creator
  app.get("/api/affiliate/payouts", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const rows = await db
        .select()
        .from(creatorPayouts)
        .where(eq(creatorPayouts.creatorId, user.id))
        .orderBy(desc(creatorPayouts.createdAt))
        .limit(50);
      res.json(rows);
    } catch (err: any) {
      console.error("[AFFEXCH] payouts GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to load payouts" });
    }
  });

  // POST /api/affiliate/payouts/request — creator initiates a payout request.
  // Creates a pending row; admin will mark it paid after sending money
  // off-platform. The creator's saved method drives where the money goes.
  app.post("/api/affiliate/payouts/request", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const amt = parseFloat(String(req.body?.amount));
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      if (amt < MIN_PAYOUT_AMOUNT) {
        return res.status(400).json({ error: `Minimum payout is $${MIN_PAYOUT_AMOUNT.toFixed(2)}` });
      }

      // Must have a saved method so admin knows where to send the money.
      const [savedMethod] = await db
        .select()
        .from(creatorPayoutMethods)
        .where(eq(creatorPayoutMethods.creatorId, user.id))
        .limit(1);
      if (!savedMethod) {
        return res
          .status(400)
          .json({ error: "Save a payment method before requesting a payout" });
      }

      // Re-check balance server-side — the client's number is just a hint.
      const balance = await getCreatorBalance(user.id);
      if (amt > balance.available + 0.001) {
        return res
          .status(400)
          .json({ error: `Requested amount exceeds available balance ($${balance.available.toFixed(2)})` });
      }

      const notes = typeof req.body?.notes === "string" ? req.body.notes.slice(0, 2000) : null;
      const [row] = await db
        .insert(creatorPayouts)
        .values({
          creatorId: user.id,
          amount: amt.toFixed(2),
          method: savedMethod.method,
          status: "PENDING",
          notes,
        })
        .returning();

      // Ping every admin — payouts get processed off-platform so the queue needs eyes.
      try {
        const ns = new NotificationService(storage);
        const admins = await storage.getAdminUsers();
        const creatorLabel = user.firstName || user.email || "A creator";
        for (const a of admins) {
          await ns.sendNotification(
            a.id,
            "payment_received" as any,
            "Payout request received",
            `${creatorLabel} requested a $${amt.toFixed(2)} payout via ${savedMethod.method}.`,
            { linkUrl: "/admin/payouts" }
          );
        }
      } catch (notifyErr) {
        console.error("[AFFEXCH] notify on payout request failed:", notifyErr);
      }

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] payout request error:", err);
      res.status(500).json({ error: err?.message || "Failed to request payout" });
    }
  });

  // POST /api/affiliate/payouts/:id/cancel — creator cancels their own pending request.
  // Limited to rows they own + status='pending' — they can't undo a paid payout.
  app.post("/api/affiliate/payouts/:id/cancel", isAuthenticated, async (req: Request, res) => {
    try {
      const user = req.user as any;
      if (!user || user.role !== "creator") {
        return res.status(403).json({ error: "Affiliate role required" });
      }
      const [row] = await db
        .update(creatorPayouts)
        .set({ status: "CANCELLED" })
        .where(
          and(
            eq(creatorPayouts.id, req.params.id),
            eq(creatorPayouts.creatorId, user.id),
            eq(creatorPayouts.status, "PENDING"),
          ),
        )
        .returning();
      if (!row) return res.status(404).json({ error: "Pending payout not found" });
      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] creator payout cancel error:", err);
      res.status(500).json({ error: err?.message || "Failed to cancel payout" });
    }
  });

  // POST /api/admin/merchants — manually add a single peptide merchant.
  // No offer is created here; merchants start with no offers.
  app.post("/api/admin/merchants", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const str = (v: any, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

      const legalName = str(req.body?.legalName, 200);
      const tradeName = str(req.body?.tradeName, 200) || legalName;
      const city = str(req.body?.city, 80);
      const country = (str(req.body?.country, 4) || "US").toUpperCase();
      const website = str(req.body?.website, 300);
      const neighborhood = str(req.body?.neighborhood, 120);

      if (!legalName) return res.status(400).json({ error: "Legal name is required" });
      if (!city) return res.status(400).json({ error: "City is required" });

      // Merchants are created without any offer, so a same-named merchant has
      // nothing to append to — reject the duplicate instead of upserting.
      const existing = await db
        .select({ id: vendorProfiles.id })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.legalName, legalName))
        .limit(1);
      if (existing.length > 0) {
        return res.status(409).json({ error: "A merchant with that legal name already exists" });
      }

      const stubUserId = randomUUID();
      const slug = legalName.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40);
      await pool.query(
        `INSERT INTO users
           (id, username, email, password, role, account_status, email_verified,
            first_name, tos_accepted_at, privacy_accepted_at, created_at, updated_at)
         VALUES ($1, $2, $3, NULL, 'merchant', 'active', true, $4, NOW(), NOW(), NOW(), NOW())`,
        [
          stubUserId,
          `merchant_${slug}_${Date.now()}`,
          `merchant-${slug}-${Date.now()}@affexch.local`,
          tradeName.slice(0, 80),
        ],
      );

      const vendorId = randomUUID();
      const description = neighborhood
        ? `Peptide merchant in ${neighborhood}, ${city}. Added manually by admin.`
        : `Peptide merchant in ${city}. Added manually by admin.`;
      await pool.query(
        `INSERT INTO vendor_profiles
           (id, user_id, legal_name, trade_name, industry, website_url, description,
            city, country, status, website_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 'Peptides & Wellness', $5, $6, $7, $8, 'approved', false, NOW(), NOW())`,
        [vendorId, stubUserId, legalName, tradeName, website || null, description, city, country],
      );

      await writeAudit(req, "add_merchant", "merchant", vendorId, { legalName, city });

      res.json({ ok: true, vendorId });
    } catch (err: any) {
      console.error("[AFFEXCH] add merchant error:", err);
      res.status(500).json({ error: err?.message || "Failed to add merchant" });
    }
  });

  // POST /api/admin/merchants/:id/offers — add another peptide offer to an
  // existing merchant. Per-row admin action triggered from the merchants table.
  app.post("/api/admin/merchants/:id/offers", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const vendorId = req.params.id;
      const str = (v: any, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      const num = (v: any) => {
        const n = parseFloat(String(v));
        return Number.isFinite(n) ? n : NaN;
      };

      const peptideName = str(req.body?.peptideName, 80);
      const priceUsd = num(req.body?.priceUsd);
      const commissionPct = Number.isFinite(num(req.body?.commissionPct))
        ? num(req.body?.commissionPct)
        : 20;

      if (!peptideName) return res.status(400).json({ error: "Peptide name is required" });
      if (!Number.isFinite(priceUsd) || priceUsd <= 0) {
        return res.status(400).json({ error: "Price must be a positive number" });
      }
      if (commissionPct < 0 || commissionPct > 100) {
        return res.status(400).json({ error: "Commission % must be between 0 and 100" });
      }

      // Confirm the merchant exists + grab its display data for the offer copy.
      const [vendor] = await db
        .select({
          id: vendorProfiles.id,
          legalName: vendorProfiles.legalName,
          tradeName: vendorProfiles.tradeName,
          city: vendorProfiles.city,
          websiteUrl: vendorProfiles.websiteUrl,
        })
        .from(vendorProfiles)
        .where(eq(vendorProfiles.id, vendorId))
        .limit(1);
      if (!vendor) return res.status(404).json({ error: "Merchant not found" });

      const tradeName = vendor.tradeName ?? vendor.legalName;
      const city = vendor.city ?? "unknown city";

      const offerId = randomUUID();
      const offerSlug = `${peptideName}-${tradeName}-${vendorId.slice(0, 8)}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 200);
      const commissionDetails = JSON.stringify({ type: "promo_code", percentage: commissionPct });
      const title = `${peptideName} — ${tradeName}`.slice(0, 100);
      const shortDescription = `${peptideName} from ${tradeName} in ${city}.`.slice(0, 200);
      const fullDescription =
        `Promote ${peptideName} from ${tradeName} (${city}). Customers redeem ` +
        `your PEP-XXXX-XXXX promo code at checkout for a discount, and you ` +
        `earn ${commissionPct}% commission.`;

      await pool.query(
        `INSERT INTO offers
           (id, vendor_id, title, product_name, short_description, full_description,
            primary_niche, product_url, commission_type, commission_percentage,
            average_order_value, status, slug, commission_details, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'wellness', $7, 'promo_code', $8, $9,
                 'approved', $10, $11::jsonb, NOW(), NOW())`,
        [
          offerId,
          vendorId,
          title,
          peptideName,
          shortDescription,
          fullDescription,
          vendor.websiteUrl || `https://${tradeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.example`,
          commissionPct.toFixed(2),
          priceUsd.toFixed(2),
          offerSlug,
          commissionDetails,
        ],
      );

      await writeAudit(req, "add_offer_to_merchant", "merchant", vendorId, {
        legalName: vendor.legalName,
        peptideName,
        priceUsd,
        commissionPct,
        offerId,
      });

      res.json({ ok: true, vendorId, offerId });
    } catch (err: any) {
      console.error("[AFFEXCH] add offer to merchant error:", err);
      res.status(500).json({ error: err?.message || "Failed to add offer" });
    }
  });

  // GET /api/admin/affexch-summary — single source of AFFEXCH metrics for the
  // admin dashboard + analytics page. Returns counts + 30-day time series +
  // top creators + top merchants in one call so the UI can render without a
  // pile of round-trips.
  app.get("/api/admin/affexch-summary", isAuthenticated, requireAdmin, async (_req: Request, res) => {
    try {
      // ---- Counts ----
      // CUTOVER: old "User".role uses AFFILIATE; sales live in legacy Order tables.
      const [creatorCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, "AFFILIATE"));
      const [merchantCountRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(vendorProfiles);

      // Pending payout requests (old PayoutStatus enum is UPPERCASE)
      const [pendingPayoutsRow] = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sum(creatorPayouts.amount),
        })
        .from(creatorPayouts)
        .where(eq(creatorPayouts.status, "PENDING"));

      // Lifetime totals — from legacy Order / OrderCommission (system of record)
      const [lifetimeEarnedRow] = await db
        .select({ total: sum(legacyOrders.commissionEarned) })
        .from(legacyOrders);
      const [lifetimeSalesRow] = await db
        .select({
          count: sql<number>`count(*)::int`,
          total: sum(legacyOrders.orderTotal),
        })
        .from(legacyOrders);
      const [lifetimePaidRow] = await db
        .select({ total: sum(creatorPayouts.amount) })
        .from(creatorPayouts)
        .where(eq(creatorPayouts.status, "PAID"));

      // ---- 30-day time series ----
      const since = new Date();
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);
      const seriesRows = await db
        .select({
          day: sql<string>`to_char(${legacyOrders.createdAt}, 'YYYY-MM-DD')`,
          sales: sum(legacyOrders.orderTotal),
          commission: sum(legacyOrders.commissionEarned),
          count: sql<number>`count(*)::int`,
        })
        .from(legacyOrders)
        .where(sql`${legacyOrders.createdAt} >= ${since.toISOString()}`)
        .groupBy(sql`to_char(${legacyOrders.createdAt}, 'YYYY-MM-DD')`);

      const seriesMap = new Map(seriesRows.map((r) => [r.day, r]));
      const timeSeries: Array<{ date: string; label: string; sales: number; commission: number; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const r = seriesMap.get(key);
        timeSeries.push({
          date: key,
          label: `${d.getMonth() + 1}/${d.getDate()}`,
          sales: parseFloat(r?.sales ?? "0"),
          commission: parseFloat(r?.commission ?? "0"),
          count: r?.count ?? 0,
        });
      }

      // ---- Top creators (by commission) ---- from the OrderCommission ledger
      const topCreatorRows = await db
        .select({
          creatorId: legacyOrderCommissions.recipientUserId,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          totalCommission: sum(legacyOrderCommissions.amount),
          saleCount: sql<number>`count(*)::int`,
        })
        .from(legacyOrderCommissions)
        .innerJoin(users, eq(legacyOrderCommissions.recipientUserId, users.id))
        .groupBy(legacyOrderCommissions.recipientUserId, users.firstName, users.lastName, users.email)
        .orderBy(desc(sum(legacyOrderCommissions.amount)))
        .limit(5);

      // ---- Top merchants (by gross sales) ---- grouped by store (old orders carry
      // a free-text storeName, not a vendor_profiles link).
      const topMerchantRows = await db
        .select({
          storeName: legacyOrders.storeName,
          totalSales: sum(legacyOrders.orderTotal),
          totalCommission: sum(legacyOrders.commissionEarned),
          saleCount: sql<number>`count(*)::int`,
        })
        .from(legacyOrders)
        .where(sql`${legacyOrders.storeName} is not null and ${legacyOrders.storeName} <> ''`)
        .groupBy(legacyOrders.storeName)
        .orderBy(desc(sum(legacyOrders.orderTotal)))
        .limit(5);

      res.json({
        counts: {
          creators: creatorCountRow?.count ?? 0,
          merchants: merchantCountRow?.count ?? 0,
          offers: 0,
        },
        pending: {
          links: 0,
          payoutCount: pendingPayoutsRow?.count ?? 0,
          payoutAmount: parseFloat(pendingPayoutsRow?.total ?? "0"),
        },
        lifetime: {
          sales: lifetimeSalesRow?.count ?? 0,
          grossSales: parseFloat(lifetimeSalesRow?.total ?? "0"),
          commissionAccrued: parseFloat(lifetimeEarnedRow?.total ?? "0"),
          commissionPaid: parseFloat(lifetimePaidRow?.total ?? "0"),
        },
        timeSeries,
        topCreators: topCreatorRows.map((r) => ({
          creatorId: r.creatorId,
          name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email || r.creatorId,
          email: r.email,
          totalCommission: parseFloat(r.totalCommission ?? "0"),
          totalSales: 0,
          saleCount: r.saleCount,
        })),
        topMerchants: topMerchantRows.map((r) => ({
          vendorId: r.storeName,
          name: r.storeName,
          city: null,
          totalSales: parseFloat(r.totalSales ?? "0"),
          totalCommission: parseFloat(r.totalCommission ?? "0"),
          saleCount: r.saleCount,
        })),
      });
    } catch (err: any) {
      console.error("[AFFEXCH] admin summary error:", err);
      res.status(500).json({ error: err?.message || "Failed to load admin summary" });
    }
  });

  // GET /api/admin/payouts/queue — creators with available balance ≥ min
  app.get("/api/admin/payouts/queue", isAuthenticated, requireAdmin, async (_req: Request, res) => {
    try {
      // Pull earned per creator, subtract paid + pending. Done as 3 grouped
      // queries because Drizzle's compound subselect syntax is awkward here.
      const earnedRows = await db
        .select({
          creatorId: legacyOrderCommissions.recipientUserId,
          earned: sum(legacyOrderCommissions.amount),
        })
        .from(legacyOrderCommissions)
        .groupBy(legacyOrderCommissions.recipientUserId);

      const paidRows = await db
        .select({
          creatorId: creatorPayouts.creatorId,
          paid: sum(creatorPayouts.amount),
        })
        .from(creatorPayouts)
        .where(eq(creatorPayouts.status, "PAID"))
        .groupBy(creatorPayouts.creatorId);

      const pendingRows = await db
        .select({
          creatorId: creatorPayouts.creatorId,
          pending: sum(creatorPayouts.amount),
        })
        .from(creatorPayouts)
        .where(eq(creatorPayouts.status, "PENDING"))
        .groupBy(creatorPayouts.creatorId);

      const paidMap = new Map(paidRows.map((r) => [r.creatorId, parseFloat(r.paid ?? "0")]));
      const pendingMap = new Map(pendingRows.map((r) => [r.creatorId, parseFloat(r.pending ?? "0")]));

      const creatorIds = earnedRows.map((r) => r.creatorId);
      const userRows = creatorIds.length
        ? await db
            .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
            })
            .from(users)
            .where(inArray(users.id, creatorIds))
        : [];
      const methodRows = creatorIds.length
        ? await db
            .select()
            .from(creatorPayoutMethods)
            .where(inArray(creatorPayoutMethods.creatorId, creatorIds))
        : [];
      const userMap = new Map(userRows.map((u) => [u.id, u]));
      const methodMap = new Map(methodRows.map((m) => [m.creatorId, m]));

      const queue = earnedRows
        .map((r) => {
          const earned = parseFloat(r.earned ?? "0");
          const paid = paidMap.get(r.creatorId) ?? 0;
          const pending = pendingMap.get(r.creatorId) ?? 0;
          const available = Math.max(0, earned - paid - pending);
          const u = userMap.get(r.creatorId);
          return {
            creatorId: r.creatorId,
            firstName: u?.firstName ?? null,
            lastName: u?.lastName ?? null,
            email: u?.email ?? null,
            earned,
            paid,
            pending,
            available,
            method: methodMap.get(r.creatorId) ?? null,
          };
        })
        .filter((r) => r.available >= MIN_PAYOUT_AMOUNT || r.pending > 0)
        .sort((a, b) => b.available - a.available);

      res.json({ minPayout: MIN_PAYOUT_AMOUNT, queue });
    } catch (err: any) {
      console.error("[AFFEXCH] admin payouts queue error:", err);
      res.status(500).json({ error: err?.message || "Failed to load payout queue" });
    }
  });

  // GET /api/admin/payouts — every payout record (history)
  app.get("/api/admin/payouts", isAuthenticated, requireAdmin, async (_req: Request, res) => {
    try {
      const rows = await db
        .select({
          payout: creatorPayouts,
          creatorEmail: users.email,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
        })
        .from(creatorPayouts)
        .leftJoin(users, eq(creatorPayouts.creatorId, users.id))
        .orderBy(desc(creatorPayouts.createdAt))
        .limit(200);
      res.json(rows.map((r) => ({ ...r.payout, creatorEmail: r.creatorEmail, creatorFirstName: r.creatorFirstName, creatorLastName: r.creatorLastName })));
    } catch (err: any) {
      console.error("[AFFEXCH] admin payouts list error:", err);
      res.status(500).json({ error: err?.message || "Failed to load payouts" });
    }
  });

  // POST /api/admin/payouts — admin records a payout (manual transfer done off-platform)
  app.post("/api/admin/payouts", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const admin = req.user as any;
      const { creatorId, amount, method, reference, notes, markPaid } = req.body ?? {};
      if (!creatorId || typeof creatorId !== "string") {
        return res.status(400).json({ error: "creatorId is required" });
      }
      const amt = parseFloat(String(amount));
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ error: "amount must be a positive number" });
      }
      if (!method || !PAYOUT_METHOD_REGEX.test(method)) {
        return res.status(400).json({ error: "method must be paypal, interac, crypto, wire, or other" });
      }
      const balance = await getCreatorBalance(creatorId);
      if (amt > balance.available + balance.pending + 0.001) {
        return res.status(400).json({ error: `Payout exceeds available balance ($${balance.available.toFixed(2)})` });
      }
      const status = markPaid ? "PAID" : "PENDING";
      const [row] = await db
        .insert(creatorPayouts)
        .values({
          creatorId,
          amount: amt.toFixed(2),
          method: method.toLowerCase(),
          status,
          reference: typeof reference === "string" ? reference.slice(0, 200) : null,
          notes: typeof notes === "string" ? notes.slice(0, 2000) : null,
          paidByUserId: markPaid ? admin.id : null,
          paidAt: markPaid ? new Date() : null,
        })
        .returning();

      await writeAudit(req, markPaid ? "issue_payout_paid" : "issue_payout_pending", "payout", row.id, {
        creatorId,
        amount: amt,
        method: method.toLowerCase(),
        reference: reference ?? null,
      });

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] admin payout create error:", err);
      res.status(500).json({ error: err?.message || "Failed to record payout" });
    }
  });

  // POST /api/admin/payouts/:id/mark-paid — flip a pending payout to paid
  app.post("/api/admin/payouts/:id/mark-paid", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const admin = req.user as any;
      const { reference, notes } = req.body ?? {};
      const [row] = await db
        .update(creatorPayouts)
        .set({
          status: "PAID",
          paidByUserId: admin.id,
          paidAt: new Date(),
          reference: typeof reference === "string" ? reference.slice(0, 200) : undefined,
          notes: typeof notes === "string" ? notes.slice(0, 2000) : undefined,
        })
        .where(and(eq(creatorPayouts.id, req.params.id), eq(creatorPayouts.status, "PENDING")))
        .returning();
      if (!row) return res.status(404).json({ error: "Pending payout not found" });

      await writeAudit(req, "mark_payout_paid", "payout", row.id, {
        creatorId: row.creatorId,
        amount: parseFloat(row.amount),
        method: row.method,
        reference: row.reference,
      });

      // Tell the creator the money's out the door.
      try {
        const ns = new NotificationService(storage);
        const amount = parseFloat(row.amount);
        await ns.sendNotification(
          row.creatorId,
          "payment_received" as any,
          "Payout sent",
          `Your $${amount.toFixed(2)} payout was processed via ${row.method}${row.reference ? ` (ref: ${row.reference})` : ""}.`,
          { linkUrl: "/creator/payouts" }
        );
      } catch (notifyErr) {
        console.error("[AFFEXCH] notify on payout paid failed:", notifyErr);
      }

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] admin payout mark-paid error:", err);
      res.status(500).json({ error: err?.message || "Failed to mark payout paid" });
    }
  });

  // POST /api/admin/payouts/:id/cancel — drop a pending payout
  app.post("/api/admin/payouts/:id/cancel", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const [row] = await db
        .update(creatorPayouts)
        .set({ status: "CANCELLED" })
        .where(and(eq(creatorPayouts.id, req.params.id), eq(creatorPayouts.status, "PENDING")))
        .returning();
      if (!row) return res.status(404).json({ error: "Pending payout not found" });

      await writeAudit(req, "cancel_payout", "payout", row.id, {
        creatorId: row.creatorId,
        amount: parseFloat(row.amount),
        method: row.method,
      });

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] admin payout cancel error:", err);
      res.status(500).json({ error: err?.message || "Failed to cancel payout" });
    }
  });

  // ===== Phase 6: vendor webhook endpoints =====
  // Called by external peptide-vendor sites (not by browsers).
  // Auth: per-vendor API key in X-Vendor-API-Key or Authorization: Bearer header.

  // POST /api/promo-codes/validate — checkout-time check.
  // Returns 200 with valid=false (not 4xx) for "not found / revoked" so vendors
  // can show a friendly "code not valid" UI without HTTP error handling.
  app.post("/api/promo-codes/validate", vendorApiKeyAuth, async (req: Request, res) => {
    try {
      const vendor = (req as any).vendor;
      const { code } = req.body ?? {};
      if (!code || typeof code !== "string" || !PROMO_CODE_REGEX.test(code)) {
        return res.status(400).json({ valid: false, reason: "Invalid code format" });
      }

      const [row] = await db
        .select({
          id: promoCodes.id,
          creatorId: promoCodes.creatorId,
          status: promoCodes.status,
        })
        .from(promoCodes)
        .where(eq(promoCodes.code, code))
        .limit(1);

      if (!row) return res.json({ valid: false, reason: "Code not found" });
      if (row.status !== "active") return res.json({ valid: false, reason: `Code is ${row.status}` });

      const [vendorOffer] = await db
        .select({ commissionPercentage: offers.commissionPercentage })
        .from(offers)
        .where(and(eq(offers.companyId, vendor.id), eq(offers.commissionType, "promo_code" as any), eq(offers.status, "approved")))
        .limit(1);
      const discountPercent = vendorOffer ? parseFloat(vendorOffer.commissionPercentage ?? "20") : 20;

      res.json({ valid: true, discountPercent, affiliateId: row.creatorId });
    } catch (err: any) {
      console.error("[AFFEXCH] validate error:", err);
      res.status(500).json({ valid: false, reason: "Validation failed" });
    }
  });

  // POST /api/promo-codes/redeem — sale-completion webhook.
  // Body: { code, saleAmount, customerEmail? }
  app.post("/api/promo-codes/redeem", vendorApiKeyAuth, async (req: Request, res) => {
    try {
      const vendor = (req as any).vendor;
      const { code, saleAmount, customerEmail } = req.body ?? {};

      if (!code || typeof code !== "string" || !PROMO_CODE_REGEX.test(code)) {
        return res.status(400).json({ error: "Invalid code format" });
      }
      const saleAmt = typeof saleAmount === "number" ? saleAmount : parseFloat(String(saleAmount));
      if (!Number.isFinite(saleAmt) || saleAmt <= 0) {
        return res.status(400).json({ error: "saleAmount must be a positive number" });
      }
      if (customerEmail && typeof customerEmail !== "string") {
        return res.status(400).json({ error: "customerEmail must be a string if provided" });
      }

      const [promo] = await db
        .select({ id: promoCodes.id, status: promoCodes.status, creatorId: promoCodes.creatorId })
        .from(promoCodes)
        .where(eq(promoCodes.code, code))
        .limit(1);

      if (!promo) return res.status(404).json({ error: "Code not found" });
      if (promo.status !== "active") return res.status(409).json({ error: `Code is ${promo.status}` });

      const [vendorOffer] = await db
        .select({ commissionPercentage: offers.commissionPercentage })
        .from(offers)
        .where(and(eq(offers.companyId, vendor.id), eq(offers.commissionType, "promo_code" as any), eq(offers.status, "approved")))
        .limit(1);
      const ratePct = vendorOffer ? parseFloat(vendorOffer.commissionPercentage ?? "20") : 20;
      const commissionAmt = Math.round(saleAmt * (ratePct / 100) * 100) / 100;

      const emailHash = customerEmail ? hashCustomerEmail(customerEmail) : null;

      const [row] = await db
        .insert(codeRedemptions)
        .values({
          promoCodeId: promo.id,
          vendorId: vendor.id,
          saleAmount: saleAmt.toFixed(2),
          commissionAmount: commissionAmt.toFixed(2),
          customerEmailHash: emailHash,
        })
        .returning({ id: codeRedemptions.id });

      res.json({ success: true, redemptionId: row.id, commissionAmount: commissionAmt });
    } catch (err: any) {
      console.error("[AFFEXCH] redeem error:", err);
      res.status(500).json({ error: err?.message || "Redemption failed" });
    }
  });

  // ===== Phase 7: admin content-link approval queue =====

  // GET /api/admin/content-links — list submissions, optionally filtered by status.
  // Joins creator info so the admin UI doesn't need a second roundtrip.
  app.get("/api/admin/content-links", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : null;
      const whereClauses: any[] = [];
      if (status === "pending" || status === "approved" || status === "rejected") {
        whereClauses.push(eq(contentLinks.status, status));
      }

      const baseQuery = db
        .select({
          id: contentLinks.id,
          url: contentLinks.url,
          platform: contentLinks.platform,
          status: contentLinks.status,
          rejectionReason: contentLinks.rejectionReason,
          approvedAt: contentLinks.approvedAt,
          createdAt: contentLinks.createdAt,
          creatorId: contentLinks.creatorId,
          creatorUsername: users.username,
          creatorEmail: users.email,
          creatorFirstName: users.firstName,
          creatorLastName: users.lastName,
        })
        .from(contentLinks)
        .innerJoin(users, eq(contentLinks.creatorId, users.id));

      const rows = await (whereClauses.length > 0
        ? baseQuery.where(and(...whereClauses))
        : baseQuery
      )
        .orderBy(desc(contentLinks.createdAt))
        .limit(500);

      res.json(rows);
    } catch (err: any) {
      console.error("[AFFEXCH] admin content-links GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to list content links" });
    }
  });

  // Helper: recompute tier from approved-link count and update profile if it changed.
  // Returns { oldTier, newTier, approved } so callers can fire notifications on bump.
  async function recomputeAffiliateTier(creatorId: string) {
    const rows = await db
      .select({ status: contentLinks.status })
      .from(contentLinks)
      .where(eq(contentLinks.creatorId, creatorId));
    const approved = rows.filter((r) => r.status === "approved").length;
    const newTier = tierFromApprovedCount(approved);

    const [profile] = await db
      .select({ affiliateTier: creatorProfiles.affiliateTier })
      .from(creatorProfiles)
      .where(eq(creatorProfiles.userId, creatorId))
      .limit(1);
    const oldTier = profile?.affiliateTier ?? "pending";

    if (oldTier !== newTier) {
      await db
        .update(creatorProfiles)
        .set({ affiliateTier: newTier, updatedAt: new Date() })
        .where(eq(creatorProfiles.userId, creatorId));
    }
    return { oldTier, newTier, approved };
  }

  // POST /api/admin/content-links/:id/approve
  app.post("/api/admin/content-links/:id/approve", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const admin = req.user as any;
      const linkId = req.params.id;

      const [link] = await db.select().from(contentLinks).where(eq(contentLinks.id, linkId)).limit(1);
      if (!link) return res.status(404).json({ error: "Content link not found" });
      if (link.status === "approved") return res.status(409).json({ error: "Already approved" });

      const [updated] = await db
        .update(contentLinks)
        .set({
          status: "approved",
          approvedBy: admin.id,
          approvedAt: new Date(),
          rejectionReason: null,
        })
        .where(eq(contentLinks.id, linkId))
        .returning();

      const { oldTier, newTier } = await recomputeAffiliateTier(link.creatorId);

      await writeAudit(req, "approve_content_link", "content_link", linkId, {
        creatorId: link.creatorId,
        url: link.url,
        platform: link.platform,
        oldTier,
        newTier,
      });

      // In-app notification (no email — Phase 6.5 removed email integration)
      try {
        const ns = new NotificationService(storage);
        if (oldTier !== newTier) {
          await ns.sendNotification(
            link.creatorId,
            "system_announcement" as any,
            `You reached ${newTier.toUpperCase()} tier!`,
            `Your latest content link was approved and you've been bumped to the ${newTier} tier.`,
            { linkUrl: "/creator/dashboard" }
          );
        } else {
          await ns.sendNotification(
            link.creatorId,
            "system_announcement" as any,
            "Content link approved",
            "Your submitted link was approved by the admin team.",
            { linkUrl: "/creator/dashboard" }
          );
        }
      } catch (notifyErr) {
        console.error("[AFFEXCH] notify on approve failed:", notifyErr);
      }

      res.json({ success: true, contentLink: updated, oldTier, newTier });
    } catch (err: any) {
      console.error("[AFFEXCH] admin approve error:", err);
      res.status(500).json({ error: err?.message || "Approval failed" });
    }
  });

  // POST /api/admin/content-links/:id/reject — body { reason? }
  app.post("/api/admin/content-links/:id/reject", isAuthenticated, requireAdmin, async (req: Request, res) => {
    try {
      const admin = req.user as any;
      const linkId = req.params.id;
      const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : null;

      const [link] = await db.select().from(contentLinks).where(eq(contentLinks.id, linkId)).limit(1);
      if (!link) return res.status(404).json({ error: "Content link not found" });
      if (link.status === "rejected") return res.status(409).json({ error: "Already rejected" });

      const wasApproved = link.status === "approved";

      const [updated] = await db
        .update(contentLinks)
        .set({
          status: "rejected",
          approvedBy: admin.id,
          approvedAt: null,
          rejectionReason: reason,
        })
        .where(eq(contentLinks.id, linkId))
        .returning();

      // If flipping approved → rejected, recompute tier (might drop down).
      let oldTier: string | undefined;
      let newTier: string | undefined;
      if (wasApproved) {
        const tiers = await recomputeAffiliateTier(link.creatorId);
        oldTier = tiers.oldTier;
        newTier = tiers.newTier;
      }

      await writeAudit(req, "reject_content_link", "content_link", linkId, {
        creatorId: link.creatorId,
        url: link.url,
        platform: link.platform,
        wasApproved,
        oldTier,
        newTier,
      }, reason);

      try {
        const ns = new NotificationService(storage);
        await ns.sendNotification(
          link.creatorId,
          "system_announcement" as any,
          "Content link rejected",
          reason
            ? `Your submitted link was rejected. Reason: ${reason}`
            : "Your submitted link was rejected by the admin team.",
          { linkUrl: "/creator/dashboard" }
        );
      } catch (notifyErr) {
        console.error("[AFFEXCH] notify on reject failed:", notifyErr);
      }

      res.json({ success: true, contentLink: updated, oldTier, newTier });
    } catch (err: any) {
      console.error("[AFFEXCH] admin reject error:", err);
      res.status(500).json({ error: err?.message || "Rejection failed" });
    }
  });

  // ===== Community chat (public, anonymous) =====
  // Landing-page chat popup. No auth — anyone can read + post with a
  // pseudonymous handle. In-memory rate limit guards against spam.

  const COMMUNITY_HANDLE_REGEX = /^[a-z0-9_]{2,32}$/i;
  const recentPostsByIp = new Map<string, number[]>(); // ip → recent post timestamps
  const COMMUNITY_POST_LIMIT = 5; // max posts per minute per IP
  const COMMUNITY_WINDOW_MS = 60_000;

  // GET /api/community-chat?limit=50 — recent messages, oldest→newest
  app.get("/api/community-chat", async (req: Request, res) => {
    try {
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 100);
      const rows = await db
        .select()
        .from(communityChatMessages)
        .orderBy(desc(communityChatMessages.createdAt))
        .limit(limit);
      // Reverse so the client gets oldest→newest (matches chat-feed semantics)
      res.json(rows.reverse());
    } catch (err: any) {
      console.error("[AFFEXCH] community-chat GET error:", err);
      res.status(500).json({ error: err?.message || "Failed to load chat" });
    }
  });

  // POST /api/community-chat — body { handle, text }
  app.post("/api/community-chat", async (req: Request, res) => {
    try {
      const { handle, text } = req.body ?? {};
      if (!handle || typeof handle !== "string" || !COMMUNITY_HANDLE_REGEX.test(handle)) {
        return res.status(400).json({ error: "Handle must be 2-32 chars: letters, numbers, underscores" });
      }
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Message text required" });
      }
      const trimmed = text.trim();
      if (trimmed.length < 1 || trimmed.length > 280) {
        return res.status(400).json({ error: "Message must be 1-280 chars" });
      }

      // Per-IP rate limit
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const now = Date.now();
      const recent = (recentPostsByIp.get(ip) ?? []).filter((t) => now - t < COMMUNITY_WINDOW_MS);
      if (recent.length >= COMMUNITY_POST_LIMIT) {
        return res.status(429).json({ error: "Slow down — too many messages in the last minute" });
      }
      recent.push(now);
      recentPostsByIp.set(ip, recent);

      const [row] = await db
        .insert(communityChatMessages)
        .values({ handle: handle.toLowerCase(), text: trimmed })
        .returning();

      res.json(row);
    } catch (err: any) {
      console.error("[AFFEXCH] community-chat POST error:", err);
      res.status(500).json({ error: err?.message || "Failed to post message" });
    }
  });
}
