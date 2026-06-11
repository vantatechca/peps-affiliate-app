import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  Lightbulb,
  Target,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  MessageSquare,
  BarChart3,
  Shield,
  MousePointerClick,
  CheckCircle2,
  BookOpen,
  Handshake,
  GraduationCap,
} from "lucide-react";
import { Link } from "wouter";

const tips = [
  {
    number: 1,
    title: "Know Your Audience Inside Out",
    icon: Users,
    description:
      "Understanding your audience is the foundation of successful affiliate marketing. The better you know who follows you, the better you can match them with relevant offers.",
    keyPoints: [
      "Analyze your audience demographics (age, location, interests)",
      "Study which content gets the most engagement",
      "Pay attention to comments and DMs to understand their needs",
      "Create audience personas to guide your offer selection",
    ],
    proTip:
      "Use your platform's analytics tools to identify your audience's peak activity times and interests. This data is gold for choosing the right offers.",
  },
  {
    number: 2,
    title: "Choose Quality Over Quantity",
    icon: Target,
    description:
      "It's tempting to promote every offer that comes your way, but being selective builds trust with your audience and leads to higher conversion rates.",
    keyPoints: [
      "Only promote products you genuinely believe in",
      "Test products yourself when possible before promoting",
      "Research the brand's reputation and customer reviews",
      "Consider how the product aligns with your personal brand",
    ],
    proTip:
      "Your audience trusts your recommendations. One bad product promotion can damage that trust. Choose offers that you'd recommend to a friend.",
  },
  {
    number: 3,
    title: "Create Authentic Content",
    icon: MessageSquare,
    description:
      "Authentic content outperforms obvious advertisements every time. Your audience follows you for your unique voice and perspective—keep that in your promotions.",
    keyPoints: [
      "Share personal experiences with the product",
      "Be honest about pros and cons",
      "Integrate promotions naturally into your content style",
      "Tell stories rather than just listing features",
    ],
    proTip:
      "The best affiliate content doesn't feel like an ad. Create content that provides value first, with the affiliate link as a natural next step for interested viewers.",
  },
  {
    number: 4,
    title: "Diversify Your Income Streams",
    icon: DollarSign,
    description:
      "Don't put all your eggs in one basket. Working with multiple brands and offer types protects your income and opens more opportunities.",
    keyPoints: [
      "Mix one-time commissions with recurring programs",
      "Work with brands across different niches (within your expertise)",
      "Balance high-ticket items with accessible everyday products",
      "Consider retainer deals for stable monthly income",
    ],
    proTip:
      "Aim for a portfolio of 5-10 active affiliate partnerships. This provides stability while keeping each promotion fresh and not overwhelming your audience.",
  },
  {
    number: 5,
    title: "Optimize Your Timing",
    icon: Clock,
    description:
      "When you post matters almost as much as what you post. Strategic timing can significantly boost your conversion rates.",
    keyPoints: [
      "Post when your audience is most active",
      "Align promotions with relevant seasons or events",
      "Plan content around product launches or sales",
      "Don't promote too frequently—space out your affiliate content",
    ],
    proTip:
      "Most successful creators limit affiliate content to 20-30% of their total posts. This keeps your feed authentic while still generating income.",
  },
  {
    number: 6,
    title: "Master the Art of CTAs",
    icon: MousePointerClick,
    description:
      "A strong call-to-action (CTA) guides your audience on what to do next. Without it, even great content won't convert.",
    keyPoints: [
      "Be clear and specific about the action you want",
      "Create urgency without being pushy",
      "Use action words: 'Get', 'Try', 'Discover', 'Save'",
      "Place CTAs strategically throughout your content",
    ],
    proTip:
      "Test different CTAs to see what resonates with your audience. 'Link in bio' performs differently than 'Swipe up to save 20%' or 'Comment LINK for the deal'.",
  },
  {
    number: 7,
    title: "Track Everything",
    icon: BarChart3,
    description:
      "Data-driven creators earn more. Understanding your metrics helps you double down on what works and drop what doesn't.",
    keyPoints: [
      "Monitor click-through rates on your affiliate links",
      "Track conversion rates for each offer and platform",
      "Analyze which content formats perform best",
      "Compare earnings across different brands and products",
    ],
    proTip:
      "Use AffiliateXchange's analytics dashboard to track your performance. Review your stats weekly and adjust your strategy based on what the data tells you.",
  },
  {
    number: 8,
    title: "Build Long-term Brand Relationships",
    icon: Handshake,
    description:
      "One-off promotions are fine, but long-term partnerships are where the real money is. Brands value reliable creators and reward them accordingly.",
    keyPoints: [
      "Deliver on your promises and meet deadlines",
      "Communicate proactively with brand partners",
      "Go above and beyond with your content quality",
      "Ask for feedback and continuously improve",
    ],
    proTip:
      "After a successful campaign, reach out to the brand to discuss ongoing collaboration. Retainer deals and brand ambassador roles often pay 2-3x standard rates.",
  },
  {
    number: 9,
    title: "Stay Compliant and Transparent",
    icon: Shield,
    description:
      "Transparency isn't just ethical—it's required by law. Proper disclosure protects you legally and actually increases audience trust.",
    keyPoints: [
      "Always disclose affiliate relationships (#ad, #sponsored, #affiliate)",
      "Follow FTC guidelines and platform-specific rules",
      "Be upfront about receiving compensation or free products",
      "Keep disclosure clear and conspicuous",
    ],
    proTip:
      "Audiences appreciate honesty. Studies show that clear disclosures don't hurt conversion rates—in fact, they often increase trust and engagement.",
  },
  {
    number: 10,
    title: "Never Stop Learning",
    icon: GraduationCap,
    description:
      "The affiliate marketing landscape evolves constantly. Successful creators stay curious and adapt to new trends, platforms, and strategies.",
    keyPoints: [
      "Follow industry news and algorithm updates",
      "Learn from other successful affiliate creators",
      "Experiment with new content formats and platforms",
      "Invest in your skills through courses and resources",
    ],
    proTip:
      "Join creator communities and attend industry events. The connections you make and insights you gain are often more valuable than any course.",
  },
];

export default function HelpAffiliateMarketingTips() {
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
              <Lightbulb className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">10 Affiliate Marketing Tips for Success</h1>
              <p className="text-muted-foreground text-sm">
                Master the fundamentals and maximize your earnings potential
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
              Whether you're just starting out or looking to level up your affiliate game, these
              proven tips will help you build a sustainable income while maintaining authenticity
              with your audience. From choosing the right offers to optimizing your content
              strategy, here's everything you need to know to succeed in affiliate marketing.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tips Grid */}
      <div className="space-y-4">
        {tips.map((tip) => {
          const Icon = tip.icon;
          return (
            <Card key={tip.number} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        Tip #{tip.number}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{tip.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <p className="text-muted-foreground">{tip.description}</p>

                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Key Points:</h4>
                  <ul className="space-y-1.5">
                    {tip.keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-sm">Pro Tip: </span>
                      <span className="text-sm text-muted-foreground">{tip.proTip}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="h-5 w-5 text-foreground" />
            <h3 className="font-semibold text-lg">Quick Recap</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {tips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div key={tip.number} className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>#{tip.number} {tip.title}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Remember: Success in affiliate marketing doesn't happen overnight. Stay consistent,
              keep learning, and focus on providing value to your audience. The commissions will
              follow.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Related Resources */}
      <div className="space-y-3">
        <h3 className="font-semibold">Continue Learning</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/help/affiliate-links-guide">
            <Card className="hover:shadow-md hover:border-primary/30 transition-all cursor-pointer h-full">
              <CardContent className="p-4">
                <h4 className="font-medium text-sm">Getting Started with Affiliate Links</h4>
                <p className="text-xs text-muted-foreground mt-1">Learn to generate and promote links</p>
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
