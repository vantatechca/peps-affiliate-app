import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  BookOpen,
  Link as LinkIcon,
  Copy,
  Share2,
  MousePointerClick,
  Globe,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  Mic,
} from "lucide-react";
import { SiInstagram, SiYoutube, SiTiktok } from "react-icons/si";
import { Link } from "wouter";

const steps = [
  {
    number: 1,
    title: "Find an Offer You Want to Promote",
    description:
      "Browse the marketplace to discover offers that align with your audience and content style. Look for products you genuinely believe in.",
    details: [
      "Go to the Offers page from your dashboard",
      "Use filters to narrow down by niche, commission type, or brand",
      "Review offer details, requirements, and commission rates",
      "Check if you meet the minimum follower or engagement requirements",
    ],
  },
  {
    number: 2,
    title: "Apply to the Offer",
    description:
      "Most offers require you to apply before you can generate affiliate links. Brands review applications to ensure creator-brand fit.",
    details: [
      "Click 'Apply' on the offer you're interested in",
      "Complete any required application questions",
      "Showcase why you're a good fit for the brand",
      "Wait for approval (usually 1-3 business days)",
    ],
  },
  {
    number: 3,
    title: "Generate Your Unique Affiliate Link",
    description:
      "Once approved, you can generate your personalized tracking link. This link is unique to you and tracks all clicks and conversions.",
    details: [
      "Go to 'My Offers' in your dashboard",
      "Find your approved offer and click 'Get Link'",
      "Your unique affiliate link will be generated automatically",
      "Copy the link to your clipboard",
    ],
  },
  {
    number: 4,
    title: "Share Your Link",
    description:
      "Integrate your affiliate link into your content strategy. The key is to make it accessible without being pushy.",
    details: [
      "Add to your bio (Instagram, TikTok, Twitter)",
      "Include in video descriptions (YouTube)",
      "Share in stories with swipe-up links",
      "Mention in podcasts or livestreams",
    ],
  },
  {
    number: 5,
    title: "Track Your Performance",
    description:
      "Monitor how your links are performing to understand what content drives the most conversions.",
    details: [
      "Check your Analytics dashboard regularly",
      "Track clicks, conversions, and earnings",
      "Identify which content performs best",
      "Optimize your strategy based on data",
    ],
  },
];

const platforms = [
  {
    name: "Instagram",
    icon: SiInstagram,
    tips: [
      "Add link to your bio using Linktree or similar",
      "Use 'Link' sticker in Stories",
      "Mention 'link in bio' in your captions",
      "Create dedicated highlight for deals",
    ],
  },
  {
    name: "YouTube",
    icon: SiYoutube,
    tips: [
      "Add links in video description",
      "Pin comment with link",
      "Use end screens to direct to description",
      "Mention link verbally in videos",
    ],
  },
  {
    name: "TikTok",
    icon: SiTiktok,
    tips: [
      "Add link to your bio",
      "Mention 'link in bio' in videos",
      "Use TikTok Shop if available",
      "Create dedicated content around products",
    ],
  },
  {
    name: "Email/Newsletter",
    icon: Mail,
    tips: [
      "Include links naturally in content",
      "Create dedicated product review emails",
      "Use clear CTAs with buttons",
      "Disclose affiliate relationship",
    ],
  },
  {
    name: "Blog/Website",
    icon: Globe,
    tips: [
      "Write product reviews with links",
      "Create comparison articles",
      "Add banner ads to sidebar",
      "Use contextual links in content",
    ],
  },
  {
    name: "Podcasts",
    icon: Mic,
    tips: [
      "Mention promo codes verbally",
      "Include links in show notes",
      "Create dedicated sponsor segments",
      "Use memorable short URLs",
    ],
  },
];

const bestPractices = [
  {
    title: "Always Disclose",
    description: "Use #ad, #sponsored, or #affiliate to stay FTC compliant",
    icon: AlertTriangle,
    type: "warning",
  },
  {
    title: "Test Your Links",
    description: "Always click your link to verify it works before sharing",
    icon: CheckCircle2,
    type: "success",
  },
  {
    title: "Don't Spam",
    description: "Balance promotional content with valuable, non-promotional posts",
    icon: AlertTriangle,
    type: "warning",
  },
  {
    title: "Track Everything",
    description: "Use UTM parameters if needed to track which content performs best",
    icon: CheckCircle2,
    type: "success",
  },
];

export default function HelpAffiliatLinksGuide() {
  return (
    <div className="space-y-6 pb-8 fx-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Getting Started with Affiliate Links</h1>
              <p className="text-muted-foreground text-sm">
                Learn to generate and promote your unique affiliate links
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="p-6">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p className="text-base leading-relaxed">
              Affiliate links are the foundation of your earnings on AffiliateXchange. Each link is
              uniquely tied to you, allowing brands to track when your audience clicks and makes
              purchases. This guide will walk you through everything from generating your first link
              to optimizing your promotion strategy across different platforms.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Step by Step Guide */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-foreground" />
          Step-by-Step Guide
        </h2>

        {steps.map((step) => (
          <Card key={step.number}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-foreground font-bold shrink-0 border">
                  {step.number}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-muted-foreground mt-1">{step.description}</p>
                  </div>
                  <ul className="space-y-1.5">
                    {step.details.map((detail, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Platform-Specific Tips */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Share2 className="h-5 w-5 text-foreground" />
          Platform-Specific Tips
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            return (
              <Card key={platform.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {platform.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1.5">
                    {platform.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Best Practices */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-foreground" />
          Best Practices
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {bestPractices.map((practice, index) => {
            const Icon = practice.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{practice.title}</h4>
                    <p className="text-sm text-muted-foreground">{practice.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Related Resources */}
      <div className="space-y-3">
        <h3 className="font-semibold">Continue Learning</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/help/affiliate-marketing-tips">
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm">10 Affiliate Marketing Tips</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Maximize your earnings potential
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/help/commission-guide">
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm">Understanding Commission Structures</h4>
                <p className="text-xs text-muted-foreground mt-1">Choose the best offers for you</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/help/success-stories">
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm">Creator Success Stories</h4>
                <p className="text-xs text-muted-foreground mt-1">Get inspired by top creators</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
