import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Award,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  useAffiliateMe,
  useAffiliateRedemptions,
  type AffiliateMe,
  type Redemption,
} from "../components/AffexchDashboardSections";
import { ChangeCityModal } from "../components/ChangeCityModal";
import { AffexchBootLoader } from "../components/AffexchBootLoader";

const TIER_LABEL: Record<AffiliateMe["tier"], string> = {
  pending: "Pending",
  verified: "Verified",
  silver: "Silver",
  gold: "Gold",
  elite: "Elite",
};

const TIER_BADGE_CLASS: Record<AffiliateMe["tier"], string> = {
  pending: "bg-muted text-muted-foreground border-border",
  verified: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  silver: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  gold: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  elite: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:border-fuchsia-800",
};

type DashboardOffer = {
  id: string;
  business: string;
  peptide: string;
  neighborhood: string | null;
  city: string | null;
  country: string | null;
  price: string;
  earn: string;
  badge: string;
};

// AFFEXCH creator dashboard hub.
//   - Stat strip + promo code + sales chart + local peptide offers near saved city
//   - No tours, no tutorials, no redundant action tiles (sidebar covers those)
export default function CreatorDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setErrorDialog({ title: "Unauthorized", message: "You are logged out. Logging in again..." });
      setTimeout(() => { window.location.href = "/api/login"; }, 500);
    }
  }, [isAuthenticated, isLoading]);

  const { data: me } = useAffiliateMe();
  const { data: redemptions } = useAffiliateRedemptions();

  const totalCommission = (redemptions ?? []).reduce(
    (s, r) => s + parseFloat(r.commissionAmount ?? "0"),
    0,
  );
  const salesCount = redemptions?.length ?? 0;
  const approved = me?.linkCounts.approved ?? 0;
  const pending = me?.linkCounts.pending ?? 0;
  const tier = me?.tier ?? "pending";
  const city = me?.city ?? null;

  // Build a 14-day earnings series for the dashboard chart.
  const chartData = useMemo(() => buildEarningsSeries(redemptions ?? [], 14), [redemptions]);
  const hasEarnings = chartData.some((d) => d.earnings > 0);

  // Fetch local peptide vendors for the creator's saved city.
  const { data: localOffers } = useQuery<DashboardOffer[]>({
    queryKey: ["/api/affiliate/offers", { city, limit: 4 }],
    queryFn: async () => {
      const url = city
        ? `/api/affiliate/offers?city=${encodeURIComponent(city)}&limit=4`
        : `/api/affiliate/offers?limit=4`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) throw new Error("offers fetch failed");
      return r.json();
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  if (isLoading) {
    return <AffexchBootLoader />;
  }

  return (
    <div className="min-h-screen bg-background fx-page">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-foreground fx-text-in fx-text-glow">
            <span className="fx-text-sweep">Welcome back, {user?.firstName || "Creator"}!</span><span className="fx-caret ml-1">_</span>
          </h1>
          <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 fx-slide-up fx-delay-2">
            Here's a quick look at your AFFEXCH affiliate account.
          </p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
          <StatCard
            icon={Award}
            label="Tier"
            value={
              <Badge className={`text-[10px] ${TIER_BADGE_CLASS[tier]}`}>{TIER_LABEL[tier]}</Badge>
            }
            hint={
              me?.nextTier
                ? `${me.nextTier.remaining} link${me.nextTier.remaining === 1 ? "" : "s"} to ${TIER_LABEL[me.nextTier.tier as AffiliateMe["tier"]]}`
                : "Top tier reached"
            }
            href="/creator/milestone"
          />
          <StatCard
            icon={CheckCircle2}
            label="Approved links"
            value={<span className="text-xl sm:text-2xl font-bold">{approved}</span>}
            hint={pending > 0 ? `${pending} pending review` : "No pending submissions"}
            href="/creator/links"
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
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Your Promo Code
              </div>
              <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-foreground select-all truncate">
                {me?.promoCode ?? "—"}
              </div>
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

        {/* Earnings chart */}
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
                      contentStyle={{ fontSize: 11, borderRadius: 6 }}
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

        {/* Offers near city */}
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {city ? `Offers near ${city}` : "Top peptide offers"}
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {city
                  ? `Local peptide merchants in ${city}`
                  : "Set your city to see businesses near you"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCityModalOpen(true)}
              className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
            >
              <RefreshCw className="h-3 w-3" /> {city ? "Change city" : "Set city"}
            </button>
          </div>

          {!localOffers || localOffers.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No peptide merchants to show yet.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  We'll surface 4 closest local businesses once merchants are seeded for your city.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
              {localOffers.slice(0, 4).map((o, i) => (
                <OfferCard key={o.id ?? i} offer={o} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>

      <GenericErrorDialog
        open={!!errorDialog}
        onOpenChange={(open) => !open && setErrorDialog(null)}
        title={errorDialog?.title}
        description={errorDialog?.message}
      />

      <ChangeCityModal open={cityModalOpen} onOpenChange={setCityModalOpen} />
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

function OfferCard({ offer: o, index: i }: { offer: DashboardOffer; index: number }) {
  return (
    <Card className="fx-card fx-card-scan h-full">
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-muted-foreground">
            NO_{String(i + 1).padStart(3, "0")}
          </span>
          <Badge className="text-[10px] bg-primary/15 text-primary border-primary/30">
            {o.badge || "20%"}
          </Badge>
        </div>
        <div>
          <h3 className="font-semibold text-sm truncate" title={o.business}>
            {o.business}
          </h3>
          <p className="text-[11px] text-muted-foreground truncate">{o.peptide}</p>
          {(o.neighborhood || o.city) && (
            <p className="text-[10px] text-muted-foreground/80 mt-0.5 font-mono truncate">
              // {[o.neighborhood, o.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        <div className="flex items-end justify-between pt-2 border-t">
          <span className="text-sm font-semibold">{o.price || "—"}</span>
          <span className="text-xs font-mono text-primary">{o.earn || ""}</span>
        </div>
      </CardContent>
    </Card>
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
