import * as React from "react";
import {
  LayoutDashboard,
  Search,
  FileText,
  TrendingUp,
  Settings,
  Users,
  Plus,
  CheckCircle,
  Heart,
  BarChart3,
  ClipboardList,
  DollarSign,
  ArrowUp,
  Star,
  Filter,
  Bookmark,
  Download,
  Target,
  MousePointerClick,
} from "lucide-react";
import type { TutorialStep, TutorialConfig } from "../components/FirstTimeTutorial";

// Tutorial IDs. AFFEXCH revision keeps only the creator dashboard tutorial —
// company role, browse page, and analytics page are out of scope.
export const TUTORIAL_IDS = {
  CREATOR_DASHBOARD: "creator-dashboard-tutorial",
} as const;

// ============================================
// Preview Components for Tutorial Cards
// ============================================

// Creator Dashboard Preview: Analytics Chart
function AnalyticsPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground">Earnings</span>
        <BarChart3 className="h-3 w-3 text-primary" />
      </div>
      <div className="flex items-end gap-1 h-12">
        {[40, 60, 45, 80, 65, 90, 75].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/20 rounded-t"
            style={{ height: `${height}%` }}
          >
            <div
              className="w-full bg-primary rounded-t"
              style={{ height: `${height * 0.6}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1">
        <span className="text-xs font-semibold">$1,234</span>
        <ArrowUp className="h-3 w-3 text-green-500" />
      </div>
    </div>
  );
}

// Creator Dashboard Preview: Offer Card
function OfferCardPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
          <Star className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-medium truncate">Brand Name</p>
          <p className="text-[8px] text-muted-foreground">Fashion</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-green-600">15% Commission</span>
        <Heart className="h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}

// Creator Dashboard Preview: Quick Actions
function QuickActionsPreview() {
  return (
    <div className="w-full max-w-[160px] space-y-2">
      {[
        { icon: Search, label: "Browse Offers", color: "text-blue-500" },
        { icon: ClipboardList, label: "Applications", color: "text-purple-500" },
        { icon: Settings, label: "Settings", color: "text-gray-500" },
      ].map((item, i) => (
        <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
          <item.icon className={`h-3 w-3 ${item.color}`} />
          <span className="text-[10px] font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// Company Dashboard Preview: Stats Cards
function StatsPreview() {
  return (
    <div className="w-full max-w-[160px] grid grid-cols-2 gap-2">
      {[
        { label: "Creators", value: "24", icon: Users },
        { label: "Offers", value: "8", icon: FileText },
        { label: "Clicks", value: "1.2K", icon: TrendingUp },
        { label: "Apps", value: "45", icon: ClipboardList },
      ].map((stat, i) => (
        <div key={i} className="rounded-md border border-border bg-card p-2 text-center">
          <stat.icon className="h-3 w-3 mx-auto mb-1 text-primary" />
          <p className="text-xs font-semibold">{stat.value}</p>
          <p className="text-[8px] text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

// Company Dashboard Preview: Create Offer
function CreateOfferPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-2 py-3 border-2 border-dashed border-primary/30 rounded-md bg-primary/5">
        <Plus className="h-5 w-5 text-primary" />
      </div>
      <p className="text-[10px] font-medium text-center">Create New Offer</p>
      <p className="text-[8px] text-muted-foreground text-center mt-1">
        Attract top creators
      </p>
    </div>
  );
}

// Company Dashboard Preview: Applications List
function ApplicationsPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-2 shadow-sm space-y-2">
      {["Pending", "Approved", "Review"].map((status, i) => (
        <div key={i} className="flex items-center justify-between p-1.5 rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-primary/30 to-primary/10" />
            <span className="text-[9px] font-medium">Creator {i + 1}</span>
          </div>
          <span className={`text-[8px] px-1.5 py-0.5 rounded ${
            status === "Approved" ? "bg-green-100 text-green-700" :
            status === "Pending" ? "bg-yellow-100 text-yellow-700" :
            "bg-blue-100 text-blue-700"
          }`}>
            {status}
          </span>
        </div>
      ))}
    </div>
  );
}

// Browse Page Preview: Search & Filter
function SearchFilterPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 p-2 rounded-md border border-border mb-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground">Search offers...</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {["Fashion", "Tech", "Health"].map((cat, i) => (
          <span key={i} className={`text-[8px] px-2 py-1 rounded-full ${
            i === 0 ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}>
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}

// Browse Page Preview: Offer Grid
function OfferGridPreview() {
  return (
    <div className="w-full max-w-[160px] grid grid-cols-2 gap-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-md border border-border bg-card p-2">
          <div className="h-8 w-full rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 mb-1" />
          <div className="h-1.5 w-3/4 bg-muted rounded" />
          <div className="h-1 w-1/2 bg-muted rounded mt-1" />
        </div>
      ))}
    </div>
  );
}

// Browse Page Preview: Favorites
function FavoritesPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Bookmark className="h-4 w-4 text-primary" />
        <span className="text-[10px] font-medium">Saved Offers</span>
      </div>
      <div className="space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50">
            <Heart className="h-3 w-3 text-red-400 fill-red-400" />
            <span className="text-[9px]">Saved Offer {i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics Preview: Earnings Dashboard
function EarningsDashboardPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground">Total Earnings</span>
        <DollarSign className="h-3 w-3 text-green-500" />
      </div>
      <div className="text-lg font-bold text-green-600 mb-2">$2,847.50</div>
      <div className="flex items-end gap-1 h-10">
        {[30, 45, 35, 60, 50, 75, 65].map((height, i) => (
          <div
            key={i}
            className="flex-1 bg-green-500/20 rounded-t"
            style={{ height: `${height}%` }}
          >
            <div
              className="w-full bg-green-500 rounded-t"
              style={{ height: `${height * 0.7}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2">
        <ArrowUp className="h-2.5 w-2.5 text-green-500" />
        <span className="text-[9px] text-green-600">+12.5% this month</span>
      </div>
    </div>
  );
}

// Analytics Preview: Performance Charts
function PerformanceChartsPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground">Performance</span>
        <BarChart3 className="h-3 w-3 text-primary" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-3 w-3 text-blue-500" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-blue-500 rounded-full" />
          </div>
          <span className="text-[9px] font-medium">1.2K</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-3 w-3 text-orange-500" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-orange-500 rounded-full" />
          </div>
          <span className="text-[9px] font-medium">89</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-green-500" />
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-2/3 bg-green-500 rounded-full" />
          </div>
          <span className="text-[9px] font-medium">7.4%</span>
        </div>
      </div>
    </div>
  );
}

// Analytics Preview: Export Options
function ExportOptionsPreview() {
  return (
    <div className="w-full max-w-[160px] rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-medium text-muted-foreground">Export Data</span>
        <Download className="h-3 w-3 text-primary" />
      </div>
      <div className="space-y-1.5">
        {[
          { icon: FileText, label: "PDF Report", color: "text-red-500" },
          { icon: BarChart3, label: "CSV Export", color: "text-green-500" },
          { icon: TrendingUp, label: "Analytics API", color: "text-blue-500" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 p-1.5 rounded-md bg-muted/50">
            <item.icon className={`h-3 w-3 ${item.color}`} />
            <span className="text-[9px] font-medium">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// New Tutorial Configs (Star Shop Style)
// ============================================

export const creatorDashboardTutorialConfig: TutorialConfig = {
  badgeText: "Pro Creator",
  headline: "to boost your earnings",
  features: [
    {
      accentText: "Track Earnings",
      accentColor: "teal",
      subtitle: "Real-time analytics",
      preview: <AnalyticsPreview />,
    },
    {
      accentText: "Discover Offers",
      accentColor: "purple",
      subtitle: "Personalized recommendations",
      preview: <OfferCardPreview />,
    },
    {
      accentText: "Quick Actions",
      accentColor: "orange",
      subtitle: "Navigate with ease",
      preview: <QuickActionsPreview />,
    },
  ],
  welcomeTitle: "Welcome to Your Creator Dashboard",
  welcomeDescription:
    "This is your command center for managing affiliate partnerships. Track your performance, discover new opportunities from verified brands, and grow your influence. Set up your content niches in Settings to get personalized offer recommendations!",
  learnMoreText: "View Help Center",
  learnMoreLink: "/help",
  ctaText: "Get Started",
};

export const companyDashboardTutorialConfig: TutorialConfig = {
  badgeText: "Partner Brand",
  headline: "to find top creators",
  features: [
    {
      accentText: "Monitor Stats",
      accentColor: "teal",
      subtitle: "Track performance metrics",
      preview: <StatsPreview />,
    },
    {
      accentText: "Create Offers",
      accentColor: "purple",
      subtitle: "Attract quality creators",
      preview: <CreateOfferPreview />,
    },
    {
      accentText: "Manage Applications",
      accentColor: "orange",
      subtitle: "Review & approve creators",
      preview: <ApplicationsPreview />,
    },
  ],
  welcomeTitle: "Welcome to Your Company Dashboard",
  welcomeDescription:
    "Manage your affiliate marketing campaigns from one place. Create compelling offers, review creator applications, and track performance metrics. Our platform connects you with verified content creators who match your brand.",
  learnMoreText: "View Help Center",
  learnMoreLink: "/help",
  ctaText: "Get Started",
};

export const browsePageTutorialConfig: TutorialConfig = {
  badgeText: "Explorer",
  headline: "to find perfect offers",
  features: [
    {
      accentText: "Smart Search",
      accentColor: "teal",
      subtitle: "Filter by category & niche",
      preview: <SearchFilterPreview />,
    },
    {
      accentText: "Browse Offers",
      accentColor: "purple",
      subtitle: "From verified brands",
      preview: <OfferGridPreview />,
    },
    {
      accentText: "Save Favorites",
      accentColor: "orange",
      subtitle: "Quick access later",
      preview: <FavoritesPreview />,
    },
  ],
  welcomeTitle: "Discover Affiliate Opportunities",
  welcomeDescription:
    "Find affiliate offers that match your content style. Use filters to narrow down by category, commission type, and more. Save your favorite offers and search filters for quick access later.",
  learnMoreText: "Browse Tips",
  learnMoreLink: "/help",
  ctaText: "Start Browsing",
};

export const analyticsTutorialConfig: TutorialConfig = {
  badgeText: "Data Pro",
  headline: "to master your metrics",
  features: [
    {
      accentText: "Track Earnings",
      accentColor: "teal",
      subtitle: "Real-time revenue insights",
      preview: <EarningsDashboardPreview />,
    },
    {
      accentText: "View Performance",
      accentColor: "purple",
      subtitle: "Clicks, conversions & trends",
      preview: <PerformanceChartsPreview />,
    },
    {
      accentText: "Export Reports",
      accentColor: "orange",
      subtitle: "CSV, PDF & integrations",
      preview: <ExportOptionsPreview />,
    },
  ],
  welcomeTitle: "Welcome to Your Analytics Dashboard",
  welcomeDescription:
    "Your complete analytics hub for tracking affiliate performance. Monitor your earnings in real-time, analyze click and conversion trends, and export detailed reports. Use the date range selector to view different time periods and the export options to share your data.",
  learnMoreText: "View Analytics Guide",
  learnMoreLink: "/help",
  ctaText: "Get Started",
};

// ============================================
// Legacy Step-based Configs (Backwards Compatibility)
// ============================================

// Creator Dashboard Tutorial Steps
export const creatorDashboardTutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Your Dashboard!",
    description:
      "This is your central hub for managing your affiliate campaigns. Here you can track your performance, view recommended offers, and take quick actions.",
    icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
  },
  {
    title: "Discover Your Perks",
    description:
      "Check out the carousel above to learn about all the benefits of being a creator on our platform, including competitive commissions and real-time analytics.",
    icon: <Heart className="h-8 w-8 text-primary" />,
  },
  {
    title: "Track Your Activity",
    description:
      "The activity chart shows your earnings over time. You can see trends in your performance and click 'View full analytics suite' for detailed insights.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
  },
  {
    title: "Quick Actions",
    description:
      "Use the Quick Actions cards to navigate to common tasks like browsing offers, viewing applications, checking messages, and updating your profile.",
    icon: <ClipboardList className="h-8 w-8 text-primary" />,
  },
  {
    title: "Recommended Offers",
    description:
      "We match you with offers based on your content niches. Make sure to set up your niches in Settings to get personalized recommendations!",
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
  },
];

// Company Dashboard Tutorial Steps
export const companyDashboardTutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Your Company Dashboard!",
    description:
      "This is your command center for managing affiliate campaigns. Track creator performance, manage applications, and monitor your offers.",
    icon: <LayoutDashboard className="h-8 w-8 text-primary" />,
  },
  {
    title: "Create New Offers",
    description:
      "Click the 'Create New Offer' button to post new affiliate opportunities. Creators will be able to discover and apply to your offers.",
    icon: <Plus className="h-8 w-8 text-primary" />,
  },
  {
    title: "Monitor Your Stats",
    description:
      "The stats cards show your active creators, live offers, total applications, and click performance at a glance.",
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
  },
  {
    title: "Manage Applications",
    description:
      "Review creator applications in the 'Recent Applications' section. You can approve, reject, or mark work as complete from here.",
    icon: <FileText className="h-8 w-8 text-primary" />,
  },
  {
    title: "Top Performing Creators",
    description:
      "See which creators are driving the most results for your campaigns. Use this insight to build stronger partnerships.",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
];

// Browse Page Tutorial Steps
export const browsePageTutorialSteps: TutorialStep[] = [
  {
    title: "Discover Affiliate Offers",
    description:
      "Welcome to the Browse page! Here you can find affiliate opportunities from verified brands that match your content style.",
    icon: <Search className="h-8 w-8 text-primary" />,
  },
  {
    title: "Filter by Category",
    description:
      "Use the category pills at the top to quickly filter offers by type. Select 'Trending' for popular offers or choose specific niches.",
    icon: <ClipboardList className="h-8 w-8 text-primary" />,
  },
  {
    title: "Advanced Filters",
    description:
      "Click the 'Filters' button to access advanced options like commission type, minimum payout, company rating, and more.",
    icon: <Settings className="h-8 w-8 text-primary" />,
  },
  {
    title: "Save Your Favorite Offers",
    description:
      "Click the heart icon on any offer card to save it to your favorites. You can access them later from the Favorites page.",
    icon: <Heart className="h-8 w-8 text-primary" />,
  },
  {
    title: "Save Your Searches",
    description:
      "Found a useful filter combination? Save it using the 'Save search' button to quickly apply the same filters later.",
    icon: <CheckCircle className="h-8 w-8 text-primary" />,
  },
];
