import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  DollarSign,
  MapPin,
  FlaskConical,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  useAffiliateMe,
  useAffiliateRedemptions,
  useAffiliatePromoCodes,
  type AffiliateMe,
  type Redemption,
} from "../components/AffexchDashboardSections";
import { AffexchBootLoader } from "../components/AffexchBootLoader";

const TIER_LABEL: Record<AffiliateMe["tier"], string> = {
  verified: "Verified",
  starter: "Starter",
  silver: "Silver",
  gold: "Gold",
  elite: "Elite",
};

const TIER_BADGE_CLASS: Record<AffiliateMe["tier"], string> = {
  verified: "bg-muted text-muted-foreground border-border",
  starter: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  silver: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  gold: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  elite: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:border-fuchsia-800",
};

// AFFEXCH creator dashboard hub.
//   - Stat strip + promo code + sales chart
//   - No tours, no tutorials, no redundant action tiles (sidebar covers those)
export default function CreatorDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setErrorDialog({ title: "Unauthorized", message: "You are logged out. Logging in again..." });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading]);

  const { data: me } = useAffiliateMe();
  const { data: redemptions } = useAffiliateRedemptions();
  const { data: promoCodes } = useAffiliatePromoCodes();

  const totalCommission = (redemptions ?? []).reduce(
    (s, r) => s + parseFloat(r.commissionAmount ?? "0"),
    0,
  );
  const salesCount = redemptions?.length ?? 0;
  const tier = me?.tier ?? "verified";
  const city = me?.city ?? null;

  // Build a 14-day earnings series for the dashboard chart.
  const chartData = useMemo(() => buildEarningsSeries(redemptions ?? [], 14), [redemptions]);
  const hasEarnings = chartData.some((d) => d.earnings > 0);

  if (isLoading) {
    return <AffexchBootLoader />;
  }

  return (
    <div className="min-h-screen bg-background fx-page">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground fx-text-in fx-text-glow">
            <span className="fx-text-sweep">Welcome back, {user?.firstName || "Creator"}!</span><span className="fx-caret ml-1">_</span>
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 fx-slide-up fx-delay-2">
            Here's a quick look at your AFFEXCH affiliate account.
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 fx-stagger fx-cards">
          <StatCard
            icon={Award}
            label="Tier"
            value={
              <Badge className={`text-[10px] ${TIER_BADGE_CLASS[tier]}`}>{TIER_LABEL[tier]}</Badge>
            }
            hint="Affiliate tier"
            href="/creator/milestone"
          />
          <StatCard
            icon={TrendingUp}
            label="Sales"
            value={<span className="text-xl sm:text-2xl font-bold">{salesCount}</span>}
            hint={salesCount === 0 ? "No sales yet" : "Reported by merchants"}
            href="/creator/sales"
          />
          <StatCard
            icon={DollarSign}
            label="Commission"
            value={
              <span className="text-xl sm:text-2xl font-bold text-primary">
                ${totalCommission.toFixed(2)}
              </span>
            }
            hint="Lifetime, all sales"
            href="/creator/sales"
          />
        </div>

        {/* Promo code strip */}
        <Card>
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {promoCodes && promoCodes.length > 1 ? "Your Promo Codes" : "Your Promo Code"}
              </div>
              {promoCodes && promoCodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {promoCodes.map((c) => (
                    <span
                      key={c.id}
                      className={`font-mono text-lg sm:text-xl font-bold tracking-wider px-2.5 py-1 rounded-md border bg-muted select-all ${c.status === "active" ? "text-foreground" : "text-muted-foreground line-through decoration-1"}`}
                    >
                      {c.code}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-foreground select-all break-all">
                  {me?.promoCode ?? "—"}
                </div>
              )}
              {city && (
                <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {city}
                </div>
              )}
            </div>
            <Link href="/creator/promo-code">
              <a className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors min-h-10">
                Manage
                <ArrowRight className="h-4 w-4" />
              </a>
            </Link>
          </CardContent>
        </Card>

        {/* Earnings chart — comes before the offers list */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" /> Earnings (last 14 days)
                </h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Daily commission across all peptide merchants
                </p>
              </div>
              <Link href="/creator/sales">
                <a className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
                  Sales detail <ArrowRight className="h-3 w-3" />
                </a>
              </Link>
            </div>
            <div className="h-36 w-full">
              {hasEarnings ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashEarnings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(173 100% 50%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(173 100% 50%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 11,
                        borderRadius: 6,
                        backgroundColor: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        color: "hsl(var(--popover-foreground))",
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, "Earnings"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="earnings"
                      stroke="hsl(173 100% 50%)"
                      strokeWidth={2}
                      fill="url(#dashEarnings)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-center text-[11px] text-muted-foreground">
                  Earnings will appear here once merchants start reporting redemptions of your code.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top peptide offers to promote — admin-curated, shuffled daily */}
        <TopPeptideOffers />

      </div>

      <GenericErrorDialog
        open={!!errorDialog}
        onOpenChange={(open) => !open && setErrorDialog(null)}
        title={errorDialog?.title}
        description={errorDialog?.message}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href}>
      <a className="block fx-tap">
        <Card className="fx-card fx-card-scan h-full">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="mb-1">{value}</div>
            <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{hint}</div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}

// Roll up redemptions into a per-day earnings series for the chart.
function buildEarningsSeries(rows: Redemption[], days: number) {
  const out: { date: string; label: string; earnings: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.redeemedAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + parseFloat(r.commissionAmount ?? "0"));
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      date: key,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      earnings: byDay.get(key) ?? 0,
    });
  }
  return out;
}

// ---- Top peptide offers to promote (dashboard strip) ----
// Admin-curated catalogue served from /api/affiliate/peptides, shuffled daily
// server-side so the list rotates every day.
type PeptideOffer = {
  id: string;
  productName: string;
  merchantUrl: string | null;
  discountPercent: number;
  commissionPercent: number;
  priceUsd: string | null;
  size: string | null;
};

// "120.00" → "$120", "120.50" → "$120.50". Drops trailing .00 for tidiness.
function formatMoney(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${str}`;
}

function TopPeptideOffers() {
  const { data = [], isLoading } = useQuery<PeptideOffer[]>({
    queryKey: ["/api/affiliate/peptides"],
    queryFn: async () => {
      const r = await fetch("/api/affiliate/peptides?limit=6", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load peptide offers");
      return r.json();
    },
  });

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-3">
          <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" /> Hot selling peptides
          </h2>
          <div className="flex items-center gap-3">
            <Link href="/creator/guides#promote">
              <a className="text-[11px] text-primary hover:underline flex items-center gap-1">
                How to promote <ArrowRight className="h-3 w-3" />
              </a>
            </Link>
            <span className="text-[11px] text-muted-foreground">Refreshed daily</span>
          </div>
        </div>

        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : !data.length ? (
          <p className="text-xs text-muted-foreground">No peptides listed right now — check back soon.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.map((p) => {
              const price = p.priceUsd != null && p.priceUsd !== "" ? parseFloat(p.priceUsd) : null;
              const earned = price != null && Number.isFinite(price)
                ? (price * p.commissionPercent) / 100
                : null;
              const inner = (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm leading-tight">{p.productName}</p>
                    {p.size ? (
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                        {p.size}
                      </span>
                    ) : null}
                  </div>
                  {price != null ? (
                    <p className="text-xs text-muted-foreground">{formatMoney(price)}</p>
                  ) : null}
                  <Badge className="text-[10px] bg-primary/15 text-primary border-primary/40 w-fit">
                    {p.commissionPercent}% commission
                    {earned != null ? ` · earn ${formatMoney(earned)}` : ""}
                  </Badge>
                </>
              );
              return p.merchantUrl ? (
                <a
                  key={p.id}
                  href={p.merchantUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md border bg-background hover:border-primary/50 transition-colors p-3 flex flex-col gap-2"
                >
                  {inner}
                </a>
              ) : (
                <div
                  key={p.id}
                  className="rounded-md border bg-background p-3 flex flex-col gap-2"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
