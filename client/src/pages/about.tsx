import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { ArrowLeft, Users, Building2, TrendingUp, Shield, Zap, Heart } from "lucide-react";
import { Link } from "wouter";
import logoUrl from "../assets/logo.png";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logoUrl} alt="AffiliateXchange Logo" className="h-8 w-8 rounded-md object-cover" />
              <span className="text-xl font-bold">AFFEXCH</span>
            </a>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">About AffiliateXchange</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Connecting creators with top brands. From discovering offers to earning commissions -
            AffiliateXchange makes it simple.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-12">
          {/* Mission Section */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed">
                AffiliateXchange was built with a simple mission: to bridge the gap between content creators
                and brands looking to grow through authentic partnerships. We believe that when creators and
                companies work together transparently, everyone wins - creators earn fair compensation for
                their influence, brands reach engaged audiences, and consumers discover products they'll love.
              </p>
            </CardContent>
          </Card>

          {/* What We Do Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">What We Do</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">For Creators</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Discover affiliate offers from verified brands, apply with confidence, and start earning
                    commissions. Track your performance with detailed analytics, manage your earnings, and
                    grow your creator business - all in one place.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">For Companies</h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Create compelling affiliate offers, find the perfect creators for your brand, and manage
                    your influencer marketing campaigns. Review applications, approve content, process payments,
                    and measure ROI with comprehensive analytics.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Why Choose AffiliateXchange</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Easy Discovery</h4>
                  <p className="text-sm text-muted-foreground">
                    Browse curated offers across multiple niches and platforms
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Verified Brands</h4>
                  <p className="text-sm text-muted-foreground">
                    All companies are verified to ensure safe partnerships
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Real-Time Analytics</h4>
                  <p className="text-sm text-muted-foreground">
                    Track clicks, conversions, and earnings in real-time
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Heart className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Monthly Retainers</h4>
                  <p className="text-sm text-muted-foreground">
                    Secure stable income with ongoing brand partnerships
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Users className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Creator-First</h4>
                  <p className="text-sm text-muted-foreground">
                    Transparent fees and creator-friendly payment terms
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Building2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Full Control</h4>
                  <p className="text-sm text-muted-foreground">
                    Companies manage campaigns with complete oversight
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Section */}
          <Card>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Create Your Profile</h4>
                    <p className="text-sm text-muted-foreground">
                      Sign up as a creator or company and complete your profile with your social platforms,
                      audience demographics, and content style.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Discover & Apply</h4>
                    <p className="text-sm text-muted-foreground">
                      Creators browse affiliate offers and monthly retainer opportunities, applying to
                      partnerships that match their niche and audience.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Create & Share</h4>
                    <p className="text-sm text-muted-foreground">
                      Once approved, create authentic content using your unique affiliate links. Share across
                      your social platforms and start driving traffic.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium mb-1">Earn & Grow</h4>
                    <p className="text-sm text-muted-foreground">
                      Track your performance in real-time, earn commissions on conversions, and receive
                      payouts directly to your preferred payment method.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Section */}
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <h2 className="text-2xl font-semibold mb-4">Get In Touch</h2>
              <p className="text-muted-foreground mb-6">
                Have questions or need support? We're here to help you succeed.
              </p>
              <p className="text-primary font-medium">support@affiliatexchange.com</p>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AffiliateXchange. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
