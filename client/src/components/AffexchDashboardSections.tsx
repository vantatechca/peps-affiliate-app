import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  Copy,
  Check,
  TrendingUp,
  Award,
  Link as LinkIcon,
  Send,
  BookOpen,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";

// AFFEXCH peptide pivot — dashboard sections per docs/AFFEXCH_SESSION_HANDOFF.md §5 Phase 4
// Six sections: PROMO CODE / SALES TRACKER / MILESTONE PROGRESS / SUBMITTED LINKS / SUBMIT A LINK / GUIDES
// Each section is exported individually so it can render either on the
// combined dashboard or on its own dedicated /creator/<feature> page.

export type AffiliateMe = {
  promoCode: string;
  tier: "pending" | "verified" | "silver" | "gold" | "elite";
  nextTier: { tier: string; min: number; remaining: number } | null;
  linkCounts: { pending: number; approved: number; rejected: number };
  city: string | null;
};

export type ContentLink = {
  id: string;
  url: string;
  platform: "youtube" | "tiktok" | "instagram";
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
};

export type Redemption = {
  id: string;
  saleAmount: string;
  commissionAmount: string;
  redeemedAt: string;
  vendorName: string | null;
  vendorLegalName: string;
  vendorCity: string | null;
  promoCode: string;
};

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

export function useAffiliateMe() {
  return useQuery<AffiliateMe>({ queryKey: ["/api/affiliate/me"] });
}
export function useAffiliateContentLinks() {
  return useQuery<ContentLink[]>({ queryKey: ["/api/affiliate/content-links"] });
}
export function useAffiliateRedemptions() {
  return useQuery<Redemption[]>({ queryKey: ["/api/affiliate/redemptions"] });
}

export function PromoCodeSection({ me: meProp }: { me?: AffiliateMe } = {}) {
  const { data: meFetched } = useAffiliateMe();
  const me = meProp ?? meFetched;
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!me?.promoCode) return;
    try {
      await navigator.clipboard.writeText(me.promoCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may fail in non-secure contexts — silently degrade */
    }
  };
  return (
    <Card data-testid="affexch-promo-code">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Sparkles className="h-4 w-4 text-primary" /> Your Promo Code
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Share this code with your audience. They enter it at checkout on peptide merchant sites to redeem a discount and credit you the commission.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="flex-1 font-mono text-lg sm:text-2xl font-bold tracking-wider px-3 py-2 sm:py-3 rounded-md border bg-muted text-foreground text-center select-all">
            {me?.promoCode ?? "—"}
          </div>
          <Button onClick={copy} disabled={!me?.promoCode} className="min-h-11 sm:min-h-10">
            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SalesTrackerSection({ redemptions: redemptionsProp }: { redemptions?: Redemption[] } = {}) {
  const { data: redemptionsFetched } = useAffiliateRedemptions();
  const rows = redemptionsProp ?? redemptionsFetched ?? [];
  const totalSales = rows.reduce((s, r) => s + parseFloat(r.saleAmount ?? "0"), 0);
  const totalCommission = rows.reduce((s, r) => s + parseFloat(r.commissionAmount ?? "0"), 0);

  return (
    <Card data-testid="affexch-sales-tracker">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <TrendingUp className="h-4 w-4 text-primary" /> Sales Tracker
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {rows.length} {rows.length === 1 ? "sale" : "sales"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm font-medium text-foreground">No sales yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sales appear here once a merchant reports a redemption of your promo code.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Gross sales</div>
                <div className="text-base sm:text-lg font-semibold">${totalSales.toFixed(2)}</div>
              </div>
              <div className="rounded-md border bg-muted/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Your commission</div>
                <div className="text-base sm:text-lg font-semibold text-primary">${totalCommission.toFixed(2)}</div>
              </div>
            </div>
            <ul className="space-y-2 max-h-72 overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{r.vendorName ?? r.vendorLegalName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {r.vendorCity ? `${r.vendorCity} · ` : ""}{new Date(r.redeemedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">${parseFloat(r.saleAmount).toFixed(2)}</div>
                    <div className="text-[10px] text-primary font-mono">+${parseFloat(r.commissionAmount).toFixed(2)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MilestoneSection({ me: meProp }: { me?: AffiliateMe } = {}) {
  const { data: meFetched } = useAffiliateMe();
  const me = meProp ?? meFetched;
  if (!me) return null;
  const approved = me.linkCounts.approved;
  const next = me.nextTier;
  const pct = next ? Math.min(100, Math.round(((next.min - next.remaining) / next.min) * 100)) : 100;

  return (
    <Card data-testid="affexch-milestone">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Award className="h-4 w-4 text-primary" /> Milestone Progress
          <Badge className={`ml-auto text-[10px] ${TIER_BADGE_CLASS[me.tier]}`}>
            {TIER_LABEL[me.tier]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Approved links</span>
          <span className="font-semibold">{approved}</span>
        </div>
        {next ? (
          <>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {next.remaining} more approved {next.remaining === 1 ? "link" : "links"} to reach{" "}
              <span className="font-semibold text-foreground">{TIER_LABEL[next.tier as AffiliateMe["tier"]]}</span>.
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">You've reached the top tier. Keep posting!</p>
        )}
      </CardContent>
    </Card>
  );
}

export function SubmittedLinksSection({ links: linksProp }: { links?: ContentLink[] } = {}) {
  const { data: linksFetched } = useAffiliateContentLinks();
  const links = linksProp ?? linksFetched;
  return (
    <Card data-testid="affexch-submitted-links">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <LinkIcon className="h-4 w-4 text-primary" /> Submitted Links
          <span className="ml-auto text-[10px] text-muted-foreground font-normal">
            {links?.length ?? 0} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!links || links.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No links yet — submit your first one below.
          </p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-2 text-xs p-2 rounded-md border bg-background">
                <span className="uppercase text-[10px] font-mono text-muted-foreground w-16 shrink-0">{l.platform}</span>
                <a
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-foreground hover:underline"
                >
                  {l.url}
                </a>
                <StatusBadge status={l.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: ContentLink["status"] }) {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="outline" className="text-[10px] gap-1 border-destructive/40 text-destructive">
        <XCircle className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export function SubmitLinkSection() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<"youtube" | "tiktok" | "instagram" | "">("");
  const [err, setErr] = useState("");

  const mut = useMutation({
    mutationFn: async () => {
      const resp = await fetch("/api/affiliate/content-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: url.trim(), platform }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Failed to submit link");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/affiliate/content-links"] });
      qc.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
      setUrl("");
      setPlatform("");
      setErr("");
    },
    onError: (e: any) => setErr(e?.message || "Failed to submit link"),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (!url.trim()) return setErr("URL is required");
    if (!platform) return setErr("Pick a platform");
    mut.mutate();
  };

  return (
    <Card data-testid="affexch-submit-link">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Send className="h-4 w-4 text-primary" /> Submit a Link
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-2">
          <Input
            type="url"
            placeholder="https://instagram.com/p/your-post"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            disabled={mut.isPending}
            className="text-base sm:text-sm"
          />
          <Select value={platform} onValueChange={(v) => setPlatform(v as any)} disabled={mut.isPending}>
            <SelectTrigger>
              <SelectValue placeholder="Select platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
            </SelectContent>
          </Select>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <Button type="submit" disabled={mut.isPending} className="w-full min-h-11 sm:min-h-10">
            {mut.isPending ? "Submitting…" : "Submit for review"}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            Approved links count toward your tier. Admin review usually within 24 hours.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function GuidesSection() {
  return (
    <Card data-testid="affexch-guides">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <BookOpen className="h-4 w-4 text-primary" /> Guides
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href="https://help.affiliatexchange.ca/share-your-code"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">How to share your code</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Best practices for posting your PEP code on Instagram, TikTok, and YouTube.
            </p>
          </a>
          <a
            href="https://help.affiliatexchange.ca/tracking-earnings"
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold">Tracking earnings</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              How merchants report sales, when commissions clear, and weekly USD payouts.
            </p>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AffexchDashboardSections() {
  const { data: me } = useAffiliateMe();
  const { data: links } = useAffiliateContentLinks();
  const { data: redemptions } = useAffiliateRedemptions();

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <PromoCodeSection me={me} />
        <MilestoneSection me={me} />
      </div>
      <SalesTrackerSection redemptions={redemptions} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <SubmittedLinksSection links={links} />
        <SubmitLinkSection />
      </div>
      <GuidesSection />
    </div>
  );
}
