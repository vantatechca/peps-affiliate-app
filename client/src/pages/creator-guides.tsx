import { GuidesSection } from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Sparkles,
  Send,
  TrendingUp,
  Instagram,
  Music2,
  Youtube,
  HelpCircle,
} from "lucide-react";

export default function CreatorGuidesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Guides</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          How to share your code and grow your AFFEXCH earnings.
        </p>
      </header>

      <GuidesSection />

      {/* Quick start */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Quick start
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-xs sm:text-sm">
            <Step
              n={1}
              icon={Sparkles}
              title="Grab your code"
              body="Your PEP code is on the dashboard and Promo Code page. Copy once, paste everywhere."
            />
            <Step
              n={2}
              icon={Send}
              title="Post your content"
              body="Post a video / story / image that includes your code so your audience can redeem it at checkout."
            />
            <Step
              n={3}
              icon={TrendingUp}
              title="Climb tiers"
              body="Each approved link bumps your tier (1 = Verified, 5 = Silver, 10 = Gold, 20 = Elite)."
            />
          </ol>
        </CardContent>
      </Card>

      {/* Per-platform tips */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Per-platform tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <PlatformTip
              icon={Instagram}
              name="Instagram"
              bullets={[
                "Put the code in your bio link or pinned comment.",
                "Reels outperform feed posts ~3:1 for redemptions.",
                "Tag the merchant's IG handle for higher reach.",
              ]}
            />
            <PlatformTip
              icon={Music2}
              name="TikTok"
              bullets={[
                "Pinned comments convert best. Don't bury the code.",
                "Talk about a specific peptide, not just \"peptides.\"",
                "Add the code on-screen too — captions get truncated.",
              ]}
            />
            <PlatformTip
              icon={Youtube}
              name="YouTube"
              bullets={[
                "Top of description + verbal mention.",
                "Long-form (10+ min) drives way more redemptions.",
                "Add timestamp chapter \"Discount Code\" so viewers can jump.",
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-primary" /> FAQ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Faq
            q="When do redemptions show up?"
            a="Merchants report sales daily. Most redemptions appear in the Sales Tracker within 24 hours of checkout."
          />
          <Faq
            q="How do I get paid?"
            a="Commissions accrue against your account. Payout method is being finalised — we'll notify you in-app once it's wired."
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  body,
}: {
  n: number;
  icon: any;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="shrink-0 h-7 w-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 font-semibold">
          <Icon className="h-3.5 w-3.5 text-primary" />
          {title}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
      </div>
    </li>
  );
}

function PlatformTip({
  icon: Icon,
  name,
  bullets,
}: {
  icon: any;
  name: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-1.5 font-semibold text-sm mb-2">
        <Icon className="h-4 w-4 text-primary" />
        {name}
      </div>
      <ul className="text-[11px] sm:text-xs text-muted-foreground space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-1.5">
            <span className="text-primary mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-md border bg-background p-3">
      <summary className="cursor-pointer text-xs sm:text-sm font-semibold list-none flex items-center justify-between gap-2">
        {q}
        <span className="text-muted-foreground group-open:rotate-180 transition-transform">⌄</span>
      </summary>
      <p className="text-xs text-muted-foreground mt-2">{a}</p>
    </details>
  );
}
