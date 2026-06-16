import { useState } from "react";
import { PromoCodeSection, useAffiliateMe } from "../components/AffexchDashboardSections";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Instagram,
  Music2,
  Youtube,
  Share2,
  Copy,
  Check,
  Lightbulb,
} from "lucide-react";

export default function CreatorPromoCodePage() {
  const { data: me } = useAffiliateMe();
  // Falls back to a placeholder in the share/caption snippets until the creator
  // sets their own code in the section below (none is auto-assigned at signup).
  const code = me?.promoCode ?? "YOURCODE";

  return (
    <div className="max-w-4xl mx-auto space-y-4 fx-page">
      <header>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground fx-text-in fx-text-glow"><span className="fx-text-sweep">Promo Code</span><span className="fx-caret ml-1">_</span></h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 fx-slide-up fx-delay-2">
          Your unique code for audiences to redeem at checkout on peptide merchant sites.
        </p>
      </header>

      <PromoCodeSection />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        <HowItWorksCard />
        <SharePresetsCard code={code} />
      </div>

      <PostTemplatesCard code={code} />
    </div>
  );
}

function HowItWorksCard() {
  const steps = [
    "Copy your PEP code above.",
    "Drop it in your Instagram, TikTok, or YouTube bio / pinned comment / video caption.",
    "When a viewer enters the code at checkout on a partner peptide merchant's site, the sale is credited to you.",
    "Track redemptions in real time on the Sales Tracker page.",
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" /> How it works
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2 text-xs sm:text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0 mt-0.5">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function SharePresetsCard({ code }: { code: string }) {
  const platforms = [
    { name: "Instagram bio", icon: Instagram, snippet: `🧬 Use ${code} for 10% off your first peptide order` },
    { name: "TikTok pinned comment", icon: Music2, snippet: `code: ${code} | 10% off | linked merchants below` },
    { name: "YouTube description", icon: Youtube, snippet: `Promo code: ${code} — 10% off at partner peptide merchants` },
  ];
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Share presets
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {platforms.map((p) => (
          <SnippetRow key={p.name} icon={p.icon} label={p.name} snippet={p.snippet} />
        ))}
      </CardContent>
    </Card>
  );
}

function SnippetRow({ icon: Icon, label, snippet }: { icon: any; label: string; snippet: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  };
  return (
    <div className="flex items-start gap-2 rounded-md border bg-background p-2.5">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs text-foreground break-words">{snippet}</div>
      </div>
      <Button size="sm" variant="ghost" className="shrink-0 h-8 px-2" onClick={copy}>
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function PostTemplatesCard({ code }: { code: string }) {
  const templates = [
    `Been on the BPC-157 protocol for 6 weeks now — recovery is unreal. If you've been curious, use my code ${code} at checkout for 10% off your first order from any of our partner merchants. Link in bio.`,
    `Question I keep getting: which peptide for sleep? Personally I run Epithalon nightly. Code ${code} gets you 10% off. Asked the merchant to drop the link in my bio.`,
    `Real talk: most peptide sites are sketchy. The ones we partner with are vetted. Use code ${code} at checkout — 10% off + helps support the channel. Stack receipts.`,
  ];
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Caption templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-[11px] text-muted-foreground">
          Drop these into your own voice. The code is already inlined.
        </p>
        {templates.map((t, i) => (
          <div key={i} className="space-y-1">
            <Textarea readOnly value={t} className="text-xs min-h-[88px] resize-none" />
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => copy(t, i)}>
                {copiedIdx === i ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                {copiedIdx === i ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
