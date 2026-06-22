import { GuidesSection } from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Sparkles,
  Send,
  TrendingUp,
  DollarSign,
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
              body="Post a video / story / image that includes your code AND the merchant's website link, so your audience knows exactly where to buy and apply it at checkout."
            />
            <Step
              n={3}
              icon={DollarSign}
              title="How your code pays"
              body="Your code gives customers 10% off their order — and earns you 20% commission on every sale they make with it."
            />
            <Step
              n={4}
              icon={TrendingUp}
              title="Climb tiers"
              body="Your tier climbs with the number of sales your code drives: new accounts start at Verified, then 1–9 sales = Starter, 10–29 = Silver, 30–59 = Gold, 60+ = Elite."
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
                "Add the merchant's website link (bio or sticker) so customers can go buy directly.",
              ]}
            />
            <PlatformTip
              icon={Music2}
              name="TikTok"
              bullets={[
                "Pinned comments convert best. Don't bury the code.",
                "Talk about a specific peptide, not just \"peptides.\"",
                "Add the code on-screen too — captions get truncated.",
                "Drop the merchant's website in your bio so viewers can buy directly.",
              ]}
            />
            <PlatformTip
              icon={Youtube}
              name="YouTube"
              bullets={[
                "Top of description + verbal mention.",
                "Long-form (10+ min) drives way more redemptions.",
                "Add timestamp chapter \"Discount Code\" so viewers can jump.",
                "Put the merchant's website link in the description so customers know where to buy.",
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
            a="Your commission accrues against your account. Once you've earned at least $50, set up a payment method (PayPal, Interac e-Transfer, crypto, or bank wire) on the Payouts page and request a payout. An admin reviews it and sends the money via the method you saved."
          />
          <Faq
            q="What should I promote?"
            a="Check the 'Hot selling peptides' list on your dashboard — it's curated by our team and refreshed daily. Feature those products in your content with your code and the merchant's website link."
          />
          <Faq
            q="How do I get support?"
            a="Tap the SUPPORT button in the bottom-right corner of any page to open your private support chat. Our team reads every message and replies right there."
          />
          <Faq
            q="How many promo codes can I create?"
            a="Up to 3. Need more than that? Message the support team in chat and we'll set up additional codes for you."
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
