import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Wallet,
  Users,
  Store,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AffexchBootLoader } from "../components/AffexchBootLoader";
import { MerchantLogo } from "../components/MerchantLogo";

type Kpi = { value: number; deltaPct: number };
const LEVEL_CLASS: Record<string, string> = {
  super: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950 dark:text-fuchsia-400",
  performing: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  rising: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  new: "bg-muted text-muted-foreground",
};

type Summary = {
  kpis: { revenue: Kpi; orders: Kpi; commission: Kpi; aov: Kpi };
  counts: { creators: number; merchants: number; offers: number };
  pending: { links: number; payoutCount: number; payoutAmount: number };
  lifetime: {
    sales: number;
    grossSales: number;
    commissionAccrued: number;
    commissionPaid: number;
  };
  timeSeries: Array<{
    date: string;
    label: string;
    sales: number;
    commission: number;
    count: number;
  }>;
  topCreators: Array<{
    creatorId: string;
    name: string;
    email: string | null;
    totalCommission: number;
    totalSales: number;
    saleCount: number;
  }>;
  topMerchants: Array<{
    vendorId: string;
    name: string;
    domain: string | null;
    city: string | null;
    country: string | null;
    totalSales: number;
    totalCommission: number;
    saleCount: number;
    level: { key: string; label: string };
    movement: number | null;
    isNew: boolean;
  }>;
};

export default function AdminAnalytics() {
  const [range, setRange] = useState(30);
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ["/api/admin/affexch-summary", range],
    queryFn: async () => {
      const r = await fetch(`/api/admin/affexch-summary?days=${range}`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load analytics");
      return r.json();
    },
  });

  if (isLoading) return <AffexchBootLoader />;

  const series = summary?.timeSeries ?? [];
  const hasActivity = series.some((d) => d.sales > 0 || d.commission > 0);
  const outstanding =
    (summary?.lifetime.commissionAccrued ?? 0) - (summary?.lifetime.commissionPaid ?? 0);

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground fx-text-in fx-text-glow">
          <span className="fx-text-sweep">Analytics</span><span className="fx-caret ml-1">_</span>
        </h1>
        <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 fx-slide-up fx-delay-2">
          AFFEXCH platform performance — sales, commissions, top creators and merchants.
        </p>
      </header>

      {/* Last 30 days — KPIs with trend vs prior 30 days */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Last 30 days</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
          <KpiCard icon={Store} label="Revenue" value={`$${(summary?.kpis.revenue.value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} delta={summary?.kpis.revenue.deltaPct} />
          <KpiCard icon={Receipt} label="Orders" value={summary?.kpis.orders.value ?? 0} delta={summary?.kpis.orders.deltaPct} />
          <KpiCard icon={TrendingUp} label="Avg order value" value={`$${(summary?.kpis.aov.value ?? 0).toFixed(2)}`} delta={summary?.kpis.aov.deltaPct} />
          <KpiCard icon={DollarSign} label="Commission" value={`$${(summary?.kpis.commission.value ?? 0).toFixed(2)}`} delta={summary?.kpis.commission.deltaPct} primary />
        </div>
      </div>

      {/* Lifetime stats */}
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground -mb-1">Lifetime</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
        <StatCard icon={Receipt} label="Sales" value={summary?.lifetime.sales ?? 0} />
        <StatCard
          icon={Store}
          label="Gross sales"
          value={`$${(summary?.lifetime.grossSales ?? 0).toFixed(2)}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Commission accrued"
          value={`$${(summary?.lifetime.commissionAccrued ?? 0).toFixed(2)}`}
        />
        <StatCard
          icon={DollarSign}
          label="Commission paid"
          value={`$${(summary?.lifetime.commissionPaid ?? 0).toFixed(2)}`}
          primary
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 fx-stagger fx-cards">
        <StatCard
          icon={Wallet}
          label="Outstanding to pay"
          value={`$${outstanding.toFixed(2)}`}
          hint={`${summary?.pending.payoutCount ?? 0} pending requests · $${(summary?.pending.payoutAmount ?? 0).toFixed(2)}`}
        />
        <StatCard icon={Users} label="Active creators" value={summary?.counts.creators ?? 0} />
        <StatCard icon={Store} label="Merchants" value={summary?.counts.merchants ?? 0} />
      </div>

      {/* 30-day chart */}
      <Card className="fx-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Sales + commission
          </CardTitle>
          <div className="flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${range === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                data-testid={`analytics-range-${d}`}
              >
                {d}d
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            {hasActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="adminSalesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(173 100% 50%)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(173 100% 50%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="adminCommGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(173 100% 80%)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(173 100% 80%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                    formatter={(v: number, name: string) => [`$${v.toFixed(2)}`, name === "sales" ? "Gross sales" : "Commission"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="hsl(173 100% 50%)"
                    strokeWidth={2}
                    fill="url(#adminSalesGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="hsl(173 100% 80%)"
                    strokeWidth={2}
                    fill="url(#adminCommGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                No sales activity in the last {range} days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top creators + top merchants side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <Card className="fx-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Top creators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.topCreators || summary.topCreators.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No earning creators yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.topCreators.map((c, i) => (
                  <li
                    key={c.creatorId}
                    className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground w-6 shrink-0">
                      #{String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{c.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {c.saleCount} {c.saleCount === 1 ? "sale" : "sales"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono font-semibold text-primary">
                        ${c.totalCommission.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        ${c.totalSales.toFixed(2)} gross
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="fx-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Store className="h-4 w-4 text-primary" /> Top merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary?.topMerchants || summary.topMerchants.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No merchant sales yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {summary.topMerchants.map((m, i) => (
                  <li
                    key={m.vendorId}
                    className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background"
                  >
                    <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                    <MerchantLogo domain={m.domain} name={m.name} className="h-7 w-7 rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        <span className="truncate">{m.name}</span>
                        {m.level && <span className={`text-[9px] px-1 py-0.5 rounded shrink-0 ${LEVEL_CLASS[m.level.key] ?? LEVEL_CLASS.new}`}>{m.level.label}</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {m.city ?? "—"} · {m.saleCount} {m.saleCount === 1 ? "sale" : "sales"}
                      </div>
                    </div>
                    <Movement m={m.movement} isNew={m.isNew} />
                    <div className="text-right shrink-0 w-16">
                      <div className="font-mono font-semibold">${m.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Movement({ m, isNew }: { m: number | null; isNew: boolean }) {
  if (isNew) return <span className="text-[9px] uppercase font-semibold text-primary shrink-0">new</span>;
  if (m == null || m === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  return m > 0
    ? <span className="inline-flex items-center text-emerald-500 text-[11px] font-semibold shrink-0"><ArrowUp className="h-3 w-3" />{m}</span>
    : <span className="inline-flex items-center text-rose-500 text-[11px] font-semibold shrink-0"><ArrowDown className="h-3 w-3" />{Math.abs(m)}</span>;
}

function KpiCard({ icon: Icon, label, value, delta, primary }: {
  icon: any; label: string; value: number | string; delta?: number; primary?: boolean;
}) {
  const d = delta ?? 0;
  return (
    <Card className="fx-card fx-card-scan">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`text-lg sm:text-2xl font-bold ${primary ? "text-primary" : ""}`}>{value}</div>
        {delta !== undefined && (
          <div className={`text-[10px] mt-1 inline-flex items-center gap-0.5 ${d > 0 ? "text-emerald-500" : d < 0 ? "text-rose-500" : "text-muted-foreground"}`}>
            {d > 0 ? <TrendingUp className="h-3 w-3" /> : d < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(d).toFixed(0)}% vs prior 30d
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  primary,
}: {
  icon: any;
  label: string;
  value: number | string;
  hint?: string;
  primary?: boolean;
}) {
  return (
    <Card className="fx-card fx-card-scan">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`text-lg sm:text-2xl font-bold ${primary ? "text-primary" : ""}`}>
          {value}
        </div>
        {hint && (
          <div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
