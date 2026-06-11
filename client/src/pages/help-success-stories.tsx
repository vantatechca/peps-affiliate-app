import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Heart,
  Quote,
  TrendingUp,
  Users,
  DollarSign,
  Award,
  Star,
  Target,
  Lightbulb,
  ArrowRight,
  Clock,
} from "lucide-react";
import { SiInstagram, SiYoutube } from "react-icons/si";
import { Link } from "wouter";

const successStories = [
  {
    name: "Sarah Chen",
    handle: "@sarahfitlife",
    avatar: "SC",
    platform: "Instagram",
    platformIcon: SiInstagram,
    niche: "Fitness & Wellness",
    followers: "125K",
    monthlyEarnings: "$4,200",
    timeOnPlatform: "8 months",
    topOffer: "Fitness App Subscription",
    story:
      "I started with just sharing my workout routines. When I joined AffiliateXchange, I was skeptical about promoting products. But the fitness app I found aligned perfectly with my values. My audience could tell it was genuine, and conversions followed naturally.",
    keyTakeaway:
      "Authenticity is everything. I only promote products I actually use in my daily routine.",
    tips: [
      "Share real before/after results (with permission)",
      "Create dedicated workout content featuring the product",
      "Use Stories to show daily usage",
      "Respond to DMs about the product personally",
    ],
    growth: [
      { metric: "Monthly Earnings", before: "$0", after: "$4,200" },
      { metric: "Avg. Conversions", before: "0", after: "85/month" },
      { metric: "Brand Partnerships", before: "1", after: "6" },
    ],
  },
  {
    name: "Marcus Johnson",
    handle: "@techwitmarc",
    avatar: "MJ",
    platform: "YouTube",
    platformIcon: SiYoutube,
    niche: "Tech Reviews",
    followers: "89K",
    monthlyEarnings: "$6,800",
    timeOnPlatform: "14 months",
    topOffer: "VPN Service",
    story:
      "I was already making tech review videos, but monetization was tough. AffiliateXchange connected me with a VPN service that made sense for my privacy-focused audience. The key was integrating it naturally into my existing content format.",
    keyTakeaway:
      "Don't change your content for affiliate offers. Find offers that fit your existing style.",
    tips: [
      "Create dedicated review videos for top products",
      "Include links in every relevant video description",
      "Use pinned comments for current deals",
      "Be transparent about what you like AND dislike",
    ],
    growth: [
      { metric: "Monthly Earnings", before: "$800", after: "$6,800" },
      { metric: "Click-through Rate", before: "1.2%", after: "4.8%" },
      { metric: "Subscriber Growth", before: "+500/mo", after: "+2,100/mo" },
    ],
  },
  {
    name: "Emma Rodriguez",
    handle: "@emmacooks",
    avatar: "ER",
    platform: "Instagram",
    platformIcon: SiInstagram,
    niche: "Food & Cooking",
    followers: "67K",
    monthlyEarnings: "$2,900",
    timeOnPlatform: "6 months",
    topOffer: "Kitchen Appliance Brand",
    story:
      "With a smaller following, I thought affiliate marketing wasn't for me yet. But I learned that engagement matters more than follower count. My cooking tutorials featuring the appliances felt natural, and my engaged community trusted my recommendations.",
    keyTakeaway:
      "Micro-influencers can absolutely succeed. High engagement beats high follower counts.",
    tips: [
      "Feature products in recipe tutorials naturally",
      "Share honest reviews including limitations",
      "Create comparison content with alternatives",
      "Engage with every comment about the product",
    ],
    growth: [
      { metric: "Monthly Earnings", before: "$0", after: "$2,900" },
      { metric: "Engagement Rate", before: "4.2%", after: "7.1%" },
      { metric: "Repeat Customers", before: "N/A", after: "23%" },
    ],
  },
  {
    name: "David Park",
    handle: "@davidgames",
    avatar: "DP",
    platform: "YouTube",
    platformIcon: SiYoutube,
    niche: "Gaming",
    followers: "210K",
    monthlyEarnings: "$8,500",
    timeOnPlatform: "11 months",
    topOffer: "Gaming Peripherals",
    story:
      "Gaming affiliate marketing is competitive, but I found my edge by focusing on honest, detailed reviews. I test products for weeks before recommending them. My audience knows that when I say something is good, it actually is.",
    keyTakeaway:
      "Build trust through thorough testing. Short-term gains from pushing bad products destroy long-term potential.",
    tips: [
      "Create in-depth comparison videos",
      "Show products in actual gameplay scenarios",
      "Update old reviews when opinions change",
      "Build relationships with brands for exclusive deals",
    ],
    growth: [
      { metric: "Monthly Earnings", before: "$1,200", after: "$8,500" },
      { metric: "Conversion Rate", before: "2.1%", after: "5.9%" },
      { metric: "Avg. Commission", before: "$15", after: "$42" },
    ],
  },
  {
    name: "Aisha Williams",
    handle: "@aishabeauty",
    avatar: "AW",
    platform: "Instagram",
    platformIcon: SiInstagram,
    niche: "Beauty & Skincare",
    followers: "156K",
    monthlyEarnings: "$5,100",
    timeOnPlatform: "9 months",
    topOffer: "Clean Beauty Brand",
    story:
      "I was picky about which brands to work with because my audience trusts me for clean, sustainable beauty. AffiliateXchange helped me find brands that match my values. That alignment is why my conversion rates are so high.",
    keyTakeaway:
      "Values alignment between you, the brand, and your audience is the foundation of high conversions.",
    tips: [
      "Only promote products that fit your brand values",
      "Create tutorial content showing application",
      "Share long-term results, not just first impressions",
      "Be vocal about ingredients and what makes products special",
    ],
    growth: [
      { metric: "Monthly Earnings", before: "$400", after: "$5,100" },
      { metric: "Brand Partnerships", before: "2", after: "9" },
      { metric: "Avg. Order Value", before: "$35", after: "$68" },
    ],
  },
];

const commonThemes = [
  {
    theme: "Authenticity First",
    description: "Every successful creator emphasizes genuine recommendations over pushing products",
    icon: Heart,
  },
  {
    theme: "Patience Pays Off",
    description: "Most saw significant results after 3-6 months of consistent effort",
    icon: Clock,
  },
  {
    theme: "Quality Over Quantity",
    description: "Fewer, better-aligned partnerships outperform many random promotions",
    icon: Target,
  },
  {
    theme: "Engagement Matters",
    description: "Creators with engaged audiences succeed regardless of follower count",
    icon: Users,
  },
];

export default function HelpSuccessStories() {
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
              <Award className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Creator Success Stories</h1>
              <p className="text-muted-foreground text-sm">
                Get inspired by top creators and learn from their journeys
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
              Real creators, real results. These are the stories of content creators who turned
              their passion into profit through affiliate marketing on AffiliateXchange. Learn from
              their strategies, avoid their early mistakes, and get inspired to start your own
              journey.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Success Stories */}
      <div className="space-y-6">
        {successStories.map((creator, index) => {
          const PlatformIcon = creator.platformIcon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-lg border">
                      {creator.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{creator.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <PlatformIcon className="h-4 w-4" />
                        <span>{creator.handle}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:ml-auto">
                    <Badge variant="secondary">{creator.niche}</Badge>
                    <Badge variant="outline">{creator.followers} followers</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-foreground mx-auto mb-1" />
                    <p className="text-lg font-bold">{creator.monthlyEarnings}</p>
                    <p className="text-xs text-muted-foreground">Monthly Earnings</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Clock className="h-5 w-5 text-foreground mx-auto mb-1" />
                    <p className="text-lg font-bold">{creator.timeOnPlatform}</p>
                    <p className="text-xs text-muted-foreground">On Platform</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <Star className="h-5 w-5 text-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold leading-tight">
                      {creator.topOffer}
                    </p>
                    <p className="text-xs text-muted-foreground">Top Offer</p>
                  </div>
                </div>

                {/* Story */}
                <div className="relative">
                  <Quote className="absolute -top-1 -left-1 h-6 w-6 text-muted-foreground/20" />
                  <p className="text-muted-foreground pl-6 italic">{creator.story}</p>
                </div>

                {/* Key Takeaway */}
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-5 w-5 text-foreground shrink-0" />
                    <div>
                      <span className="font-semibold text-sm">Key Takeaway:</span>
                      <p className="text-sm text-muted-foreground mt-1">{creator.keyTakeaway}</p>
                    </div>
                  </div>
                </div>

                {/* Tips and Growth */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Star className="h-4 w-4 text-foreground" />
                      {creator.name.split(" ")[0]}'s Tips
                    </h4>
                    <ul className="space-y-1.5">
                      {creator.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="flex items-start gap-2 text-sm">
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-foreground" />
                      Growth Journey
                    </h4>
                    <div className="space-y-2">
                      {creator.growth.map((item, growthIndex) => (
                        <div
                          key={growthIndex}
                          className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-1.5"
                        >
                          <span className="text-muted-foreground">{item.metric}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground line-through text-xs">
                              {item.before}
                            </span>
                            <ArrowRight className="h-3 w-3" />
                            <span className="font-medium">{item.after}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Common Themes */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">What All Successful Creators Have in Common</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {commonThemes.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">{item.theme}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <Card>
        <CardContent className="p-6 text-center">
          <Award className="h-8 w-8 text-foreground mx-auto mb-3" />
          <h3 className="font-semibold text-xl mb-2">Ready to Write Your Success Story?</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
            Every creator on this page started exactly where you are now. The difference? They took
            the first step.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/creator/submit-link">
              <Button>
                <Target className="h-4 w-4 mr-2" />
                Submit a Link
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
          <Link href="/help/affiliate-links-guide">
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm">Getting Started with Affiliate Links</h4>
                <p className="text-xs text-muted-foreground mt-1">Generate and promote your links</p>
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
        </div>
      </div>
    </div>
  );
}
