import { useMemo } from "react";
import {
  SalesTrackerSection,
  useAffiliateRedemptions,
  type Redemption,
} from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { TrendingUp, Store, DollarSign, Receipt } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function CreatorSalesPage() {
  const { data: redemptions } = useAffiliateRedemptions();
  const rows = redemptions ?? [];

  const totalSales = rows.reduce((s, r) => s + parseFloat(r.saleAmount ?? "0"), 0);
  const totalCommission = rows.reduce((s, r) => s + parseFloat(r.commissionAmount ?? "0"), 0);
  const avgCommission = rows.length > 0 ? totalCommission / rows.length : 0;

  const series = useMemo(() => buildSeries(rows, 30), [rows]);
  const hasData = series.some((d) => d.commission > 0);

  const vendorBreakdown = useMemo(() => buildVendorBreakdown(rows), [rows]);

  return (
    <div className="max-w-5xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Sales Tracker</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Redemptions reported by merchants and the commission credited to you.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
        <StatBox icon={Receipt} label="Sales" value={rows.length.toString()} />
        <StatBox icon={Store} label="Gross sales" value={`$${totalSales.toFixed(2)}`} />
        <StatBox icon={DollarSign} label="Your commission" value={`$${totalCommission.toFixed(2)}`} primary />
        <StatBox icon={TrendingUp} label="Avg per sale" value={`$${avgCommission.toFixed(2)}`} />
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Commission, last 30 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 sm:h-56">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 6, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesCommission" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(173 100% 50%)" stopOpacity={0.55} />
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
                  <YAxis
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 6 }}
                    formatter={(v: number) => [`$${v.toFixed(2)}`, "Commission"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="commission"
                    stroke="hsl(173 100% 50%)"
                    strokeWidth={2}
                    fill="url(#salesCommission)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-muted-foreground">
                No commission activity in the last 30 days.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top merchants */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Store className="h-4 w-4 text-primary" /> Top merchants
            <span className="ml-auto text-[10px] text-muted-foreground font-normal">
              {vendorBreakdown.length} {vendorBreakdown.length === 1 ? "merchant" : "merchants"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendorBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Merchant breakdown will populate once sales are reported.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {vendorBreakdown.slice(0, 8).map((v) => (
                <li
                  key={v.name}
                  className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {v.city ?? "Unknown city"} · {v.count} {v.count === 1 ? "sale" : "sales"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono">${v.gross.toFixed(2)}</div>
                    <div className="text-[10px] text-primary font-mono">
                      +${v.commission.toFixed(2)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Full list (reused section) */}
      <SalesTrackerSection redemptions={rows} />
    </div>
  );
}

function StatBox({
  icon: Icon,
  label,
  value,
  primary,
}: {
  icon: any;
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <Card className="fx-card fx-card-scan">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider mb-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <div className={`text-lg sm:text-xl font-bold ${primary ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function buildSeries(rows: Redemption[], days: number) {
  const out: { date: string; label: string; commission: number }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = new Date(r.redeemedAt);
    d.setHours(0, 0, 0, 0);
    const k = d.toISOString().slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + parseFloat(r.commissionAmount ?? "0"));
  }
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    out.push({
      date: k,
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      commission: byDay.get(k) ?? 0,
    });
  }
  return out;
}

function buildVendorBreakdown(rows: Redemption[]) {
  const map = new Map<string, { name: string; city: string | null; count: number; gross: number; commission: number }>();
  for (const r of rows) {
    const name = r.vendorName ?? r.vendorLegalName;
    if (!name) continue;
    const cur = map.get(name) ?? { name, city: r.vendorCity ?? null, count: 0, gross: 0, commission: 0 };
    cur.count += 1;
    cur.gross += parseFloat(r.saleAmount ?? "0");
    cur.commission += parseFloat(r.commissionAmount ?? "0");
    if (!cur.city && r.vendorCity) cur.city = r.vendorCity;
    map.set(name, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.commission - a.commission);
}
