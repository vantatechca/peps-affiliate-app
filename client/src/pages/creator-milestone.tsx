import { MilestoneSection, useAffiliateMe, type AffiliateMe } from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Award, CheckCircle2, Lock, Sparkles } from "lucide-react";

// Tier ladder — must mirror TIER_THRESHOLDS in server/affexchRoutes.ts.
// Driven by the NUMBER of attributed orders only. `max` is the last order count
// still in that tier (null = open-ended top tier) — used to label the range.
const TIERS: Array<{
  tier: AffiliateMe["tier"];
  label: string;
  minOrders: number;
  max: number | null;
  perk: string;
}> = [
  { tier: "verified", label: "Verified", minOrders: 0, max: 0, perk: "Your account is verified — share your promo code to start selling." },
  { tier: "starter", label: "Starter", minOrders: 1, max: 9, perk: "You're on the board. Featured in the affiliate directory for your city." },
  { tier: "silver", label: "Silver", minOrders: 10, max: 29, perk: "Higher commission tier on select merchants." },
  { tier: "gold", label: "Gold", minOrders: 30, max: 59, perk: "Priority support and early access to new offers." },
  { tier: "elite", label: "Elite", minOrders: 60, max: null, perk: "Custom co-branded landing pages with top merchants." },
];

function rangeLabel(t: { minOrders: number; max: number | null }) {
  if (t.minOrders === 0) return "On signup";
  if (t.max === null) return `${t.minOrders}+ sales`;
  if (t.max === t.minOrders) return `${t.minOrders} ${t.minOrders === 1 ? "sale" : "sales"}`;
  return `${t.minOrders}–${t.max} sales`;
}

const TIER_BADGE_CLASS: Record<AffiliateMe["tier"], string> = {
  verified: "bg-muted text-muted-foreground border-border",
  starter: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800",
  silver: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
  gold: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
  elite: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300 dark:bg-fuchsia-950 dark:text-fuchsia-400 dark:border-fuchsia-800",
};

export default function CreatorMilestonePage() {
  const { data: me } = useAffiliateMe();
  const orders = me?.sales?.orders ?? 0;
  const currentTier = me?.tier ?? "verified";

  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Milestone Progress</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Sales attributed to your promo codes push you up the affiliate tier ladder.
        </p>
      </header>

      <MilestoneSection />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Tier ladder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 fx-stagger">
            {TIERS.map((t) => {
              const isCurrent = t.tier === currentTier;
              const isReached = orders >= t.minOrders;
              return (
                <li
                  key={t.tier}
                  className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                    isCurrent ? "border-primary bg-primary/5" : isReached ? "border-border bg-background" : "border-dashed bg-muted/30"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {isReached ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{t.label}</span>
                      <Badge className={`text-[10px] ${TIER_BADGE_CLASS[t.tier]}`}>
                        {rangeLabel(t)}
                      </Badge>
                      {isCurrent && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-primary/40">
                          You're here
                        </Badge>
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${isReached ? "text-foreground" : "text-muted-foreground"}`}>
                      <Sparkles className="h-3 w-3 inline mr-1 -mt-0.5" />
                      {t.perk}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">How tiers work</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-xs sm:text-sm space-y-1.5 text-muted-foreground">
            <li>• New accounts start at <strong>Verified</strong>. Your tier then climbs by the number of orders attributed to your promo codes.</li>
            <li>• 1–9 sales is Starter, 10–29 Silver, 30–59 Gold, and 60+ Elite.</li>
            <li>• Revenue is shown for information but doesn't affect your tier.</li>
            <li>• Tier perks apply across all partner merchants, not just one.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
