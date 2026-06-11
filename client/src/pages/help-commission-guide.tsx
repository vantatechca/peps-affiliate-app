import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft,
  TrendingUp,
  DollarSign,
  Percent,
  RefreshCw,
  Layers,
  Target,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Calculator,
  Scale,
  ArrowRight,
  Clock,
  Wallet,
  Calendar,
  BarChart3,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import { Link } from "wouter";

const commissionTypes = [
  {
    name: "Percentage-Based (CPS)",
    icon: Percent,
    description:
      "Earn a percentage of each sale made through your link. The more expensive the product, the higher your earnings.",
    example: "15% commission on a $100 product = $15 per sale",
    bestFor: ["High-ticket items", "Fashion & lifestyle", "Electronics", "Subscription services"],
    pros: ["Scales with product price", "Great for premium products", "Unlimited earning potential"],
    cons: ["Lower returns on cheap items", "Dependent on cart value", "Refunds affect earnings"],
  },
  {
    name: "Fixed Amount (CPA)",
    icon: DollarSign,
    description:
      "Earn a set dollar amount for each conversion, regardless of the purchase value. Predictable and straightforward.",
    example: "$25 flat commission per sale, regardless of order value",
    bestFor: ["Lead generation", "App installs", "Free trials", "Service sign-ups"],
    pros: ["Predictable earnings", "Great for low-ticket items", "Easy to calculate ROI"],
    cons: ["No benefit from large orders", "Fixed regardless of effort", "May be lower overall"],
  },
  {
    name: "Recurring Commissions",
    icon: RefreshCw,
    description:
      "Earn commissions every time a referred customer renews their subscription. Build passive income over time.",
    example: "20% recurring monthly on $50/month subscription = $10/month ongoing",
    bestFor: ["SaaS products", "Subscription boxes", "Membership sites", "Online tools"],
    pros: ["Passive income stream", "Compounds over time", "Rewards customer retention"],
    cons: ["Takes time to build up", "Dependent on retention", "May have caps or limits"],
  },
  {
    name: "Tiered Commissions",
    icon: Target,
    description:
      "Earn higher commission rates as you hit performance milestones. Top performers are rewarded with better rates.",
    example: "10% for 1-10 sales, 15% for 11-50 sales, 20% for 50+ sales",
    bestFor: ["High-volume creators", "Dedicated brand partners", "Long-term relationships"],
    pros: ["Rewards top performers", "Incentivizes growth", "Higher earning ceiling"],
    cons: ["Starts at lower rates", "May reset monthly", "Requires consistent volume"],
  },
  {
    name: "Hybrid Models",
    icon: Layers,
    description:
      "Combination of commission types, like a flat fee plus percentage, or one-time bonus plus recurring.",
    example: "$50 sign-up bonus + 10% recurring commission",
    bestFor: ["Premium partnerships", "Brand ambassadors", "Exclusive deals"],
    pros: ["Best of both worlds", "Higher total earnings", "Multiple income streams"],
    cons: ["More complex tracking", "May have more requirements", "Less common"],
  },
];

const comparisonFactors = [
  {
    factor: "Cookie Duration",
    description: "How long after a click you get credit for the sale",
    importance: "Longer is better - 30-90 days ideal",
    icon: Clock,
  },
  {
    factor: "Payment Threshold",
    description: "Minimum earnings before you can withdraw",
    importance: "Lower thresholds mean faster access to your money",
    icon: Wallet,
  },
  {
    factor: "Payment Frequency",
    description: "How often commissions are paid out",
    importance: "Weekly or bi-weekly payments improve cash flow",
    icon: Calendar,
  },
  {
    factor: "Conversion Rate",
    description: "Percentage of clicks that result in sales",
    importance: "Higher rates mean more earnings per click",
    icon: BarChart3,
  },
  {
    factor: "Average Order Value",
    description: "Typical purchase amount from the brand",
    importance: "Higher AOV = higher percentage-based earnings",
    icon: ShoppingCart,
  },
  {
    factor: "Return Policy Impact",
    description: "How returns affect your commissions",
    importance: "Some brands claw back commissions on returns",
    icon: RotateCcw,
  },
];

const calculationExamples = [
  {
    scenario: "Fashion Influencer",
    offer: "25% commission on clothing brand",
    assumptions: "500 clicks/month, 3% conversion rate, $80 avg order",
    calculation: "500 x 0.03 x $80 x 0.25 = $300/month",
  },
  {
    scenario: "Tech Reviewer",
    offer: "$50 flat per software subscription",
    assumptions: "1000 clicks/month, 2% conversion rate",
    calculation: "1000 x 0.02 x $50 = $1,000/month",
  },
  {
    scenario: "Fitness Creator",
    offer: "15% recurring on $30/month app",
    assumptions: "20 new subscribers/month, 6-month avg retention",
    calculation: "20 x $30 x 0.15 x 6 months = $540 lifetime per cohort",
  },
];

export default function HelpCommissionGuide() {
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
              <TrendingUp className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Understanding Commission Structures</h1>
              <p className="text-muted-foreground text-sm">
                Deep dive into commission types and how to choose the best offers
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
              Not all commissions are created equal. Understanding the different commission
              structures helps you choose offers that maximize your earnings based on your audience,
              content style, and goals. This guide breaks down every commission type you'll
              encounter on AffiliateXchange.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Commission Types */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-foreground" />
          Commission Types Explained
        </h2>

        {commissionTypes.map((type) => {
          const Icon = type.icon;
          return (
            <Card key={type.name} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{type.name}</CardTitle>
                    <p className="text-muted-foreground text-sm mt-1">{type.description}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm font-medium">Example: {type.example}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" /> Best For
                    </h4>
                    <ul className="space-y-1">
                      {type.bestFor.map((item, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Pros
                    </h4>
                    <ul className="space-y-1">
                      {type.pros.map((item, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <XCircle className="h-3.5 w-3.5" /> Cons
                    </h4>
                    <ul className="space-y-1">
                      {type.cons.map((item, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Comparison Factors */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-foreground" />
          What to Compare Beyond Commission Rate
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {comparisonFactors.map((factor) => {
            const Icon = factor.icon;
            return (
              <Card key={factor.factor}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{factor.factor}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                      <p className="text-xs font-medium mt-2">{factor.importance}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Calculation Examples */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-foreground" />
          Real-World Calculation Examples
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {calculationExamples.map((example, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Badge variant="secondary" className="w-fit mb-1">
                  {example.scenario}
                </Badge>
                <CardTitle className="text-base">{example.offer}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-muted-foreground">{example.assumptions}</p>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm font-mono font-medium">{example.calculation}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pro Tips */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-foreground" />
            Pro Tips for Choosing Offers
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>High commission isn't everything</strong> - A 5% commission with 10%
                conversion rate beats 20% with 0.5% conversion.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Consider your content frequency</strong> - Recurring commissions work best
                if you post consistently about the product.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Match commission type to audience</strong> - Impulse buyers = flat rate;
                researchers = percentage-based.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Negotiate after proving value</strong> - Once you show results, brands often
                increase your rates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-lg mb-3">Ready to Start Earning?</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Grab your unique promo code and share it with your audience — they redeem it at checkout
            on partner peptide merchant sites and you get credit for the sale.
          </p>
          <Link href="/creator/promo-code">
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              View My Promo Code
            </Button>
          </Link>
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
