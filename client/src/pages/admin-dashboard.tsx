import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Users,
  Building2,
  DollarSign,
  Wallet,
  ArrowRight,
  Inbox,
  ScrollText,
} from "lucide-react";
import { AffexchBootLoader } from "../components/AffexchBootLoader";

type Summary = {
  counts: { creators: number; merchants: number; offers: number };
  pending: { payoutCount: number; payoutAmount: number };
  lifetime: {
    sales: number;
    grossSales: number;
    commissionAccrued: number;
    commissionPaid: number;
  };
  topCreators: Array<{
    creatorId: string;
    name: string;
    email: string | null;
    totalCommission: number;
    totalSales: number;
    saleCount: number;
  }>;
};

type AuditLog = {
  id: string;
  action: string;
  entityType: string | null;
  details: any;
  timestamp: string;
};

export default function AdminDashboard() {
  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ["/api/admin/affexch-summary"],
  });
  const { data: recentLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit-logs", { limit: 8 }],
    queryFn: async () => {
      const r = await fetch("/api/admin/audit-logs?limit=8", { credentials: "include" });
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : data?.logs ?? [];
    },
  });

  if (isLoading) return <AffexchBootLoader />;

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-6 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground fx-text-in fx-text-glow">
          <span className="fx-text-sweep">Admin Dashboard</span><span className="fx-caret ml-1">_</span>
        </h1>
        <p className="text-[11px] sm:text-xs md:text-sm text-muted-foreground mt-0.5 fx-slide-up fx-delay-2">
          AFFEXCH platform overview — creators, merchants, and the payout pipeline.
        </p>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 fx-stagger fx-cards">
        <StatCard icon={Users} label="Creators" value={summary?.counts.creators ?? 0} href="/admin/creators" />
        <StatCard icon={Building2} label="Merchants" value={summary?.counts.merchants ?? 0} href="/admin/merchants" />
        <StatCard
          icon={DollarSign}
          label="Commission Paid"
          value={`$${(summary?.lifetime.commissionPaid ?? 0).toFixed(2)}`}
          primary
          href="/admin/payouts"
        />
      </div>

      {/* Pending action queues */}
      <div className="grid grid-cols-1 fx-stagger fx-cards">
        <PendingCard
          icon={Wallet}
          accent={(summary?.pending.payoutCount ?? 0) > 0 ? "amber" : "neutral"}
          title="Payout requests"
          count={summary?.pending.payoutCount ?? 0}
          countLabel={`requests · $${(summary?.pending.payoutAmount ?? 0).toFixed(2)} total`}
          description="Creator payout requests waiting to be processed off-platform."
          href="/admin/payouts"
        />
      </div>

      {/* Top creators preview */}
      <Card className="fx-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Top creators by commission
            </h2>
            <Link href="/admin/creators">
              <a className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
                All creators <ArrowRight className="h-3 w-3" />
              </a>
            </Link>
          </div>
          {!summary?.topCreators || summary.topCreators.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No earning creators yet — top performers will appear here once merchants start
              reporting sales.
            </p>
          ) : (
            <ul className="space-y-2">
              {summary.topCreators.map((c, i) => (
                <li
                  key={c.creatorId}
                  className="flex items-center gap-3 text-xs p-2 rounded-md border bg-background"
                >
                  <span className="font-mono text-[10px] text-muted-foreground w-6 shrink-0">
                    #{String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {c.saleCount} {c.saleCount === 1 ? "sale" : "sales"} · {c.email}
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

      {/* Recent activity */}
      <Card className="fx-card">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-primary" /> Recent admin activity
            </h2>
            <Link href="/admin/audit-logs">
              <a className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1">
                Full audit trail <ArrowRight className="h-3 w-3" />
              </a>
            </Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No recorded admin actions yet.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {recentLogs.slice(0, 8).map((log) => (
                <li
                  key={log.id}
                  className="flex items-center gap-2 text-[11px] p-2 rounded-md border bg-background"
                >
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {log.action.replace(/_/g, " ")}
                  </Badge>
                  <span className="flex-1 min-w-0 truncate text-muted-foreground">
                    {log.entityType ?? "—"}
                    {log.details?.reason ? ` · ${log.details.reason}` : ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  primary,
}: {
  icon: any;
  label: string;
  value: number | string;
  href: string;
  primary?: boolean;
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
            <div className={`text-lg sm:text-2xl font-bold ${primary ? "text-primary" : ""}`}>
              {value}
            </div>
          </CardContent>
        </Card>
      </a>
    </Link>
  );
}

function PendingCard({
  icon: Icon,
  accent,
  title,
  count,
  countLabel,
  description,
  href,
}: {
  icon: any;
  accent: "amber" | "neutral";
  title: string;
  count: number;
  countLabel: string;
  description: string;
  href: string;
}) {
  return (
    <Card className={`fx-card fx-card-scan h-full ${accent === "amber" && count > 0 ? "border-amber-300 dark:border-amber-900" : ""}`}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div
            className={`h-10 w-10 rounded-md flex items-center justify-center shrink-0 ${
              accent === "amber" && count > 0
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2">
              <h3 className="font-semibold text-sm sm:text-base">{title}</h3>
              <Badge variant="outline" className="text-[10px]">
                <Inbox className="h-3 w-3 mr-1" />
                {count} {countLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            <Link href={href}>
              <a>
                <Button size="sm" variant="outline" className="mt-3 gap-1.5">
                  Review queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </a>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
