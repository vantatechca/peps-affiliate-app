import { Fragment, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Link, useLocation } from "wouter";
// Tours removed in the AFFEXCH revision — sidebar features are self-explanatory.
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
  SidebarTrigger,
} from "./ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Home,
  TrendingUp,
  Building2,
  Users,
  ScrollText,
  Sliders,
  BarChart3,
  CheckCircle,
  Sparkles,
  Award,
  BookOpen,
  Wallet,
  Store,
} from "lucide-react";
import logoUrl from "../assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

type LeafItem = {
  title: string;
  icon: any;
  url?: string;
  onClick?: () => void;
  /** Render a SidebarSeparator above this item. */
  separatorBefore?: boolean;
};
type GroupItem = {
  title: string;
  icon: any;
  children: LeafItem[];
  separatorBefore?: boolean;
};
type MenuItem = LeafItem | GroupItem;

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const currentYear = new Date().getFullYear();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const isCreator = user?.role !== 'admin';

  // Close sidebar on mobile when navigation link is clicked
  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // AFFEXCH creator nav — feature tabs that map 1:1 to the AFFEXCH dashboard
  // sections. Notifications / Profile / Settings live in the topbar avatar
  // dropdown instead.
  const creatorItems: MenuItem[] = [
    { title: "Dashboard", url: "/", icon: Home },
    { title: "Promo Code", url: "/creator/promo-code", icon: Sparkles },
    { title: "Merchants", url: "/creator/merchants", icon: Store },
    { title: "Sales Tracker", url: "/creator/sales", icon: TrendingUp },
    { title: "Milestone Progress", url: "/creator/milestone", icon: Award },
    { title: "Payouts", url: "/creator/payouts", icon: Wallet },
    // Community Chat is reachable via the bottom-right FAB (mounted in
    // AuthenticatedLayout) — same UX as the landing page launcher.
    // Guides sits at the bottom, separated from the action items above.
    { title: "Guides", url: "/creator/guides", icon: BookOpen, separatorBefore: true },
  ];

  const adminItems: MenuItem[] = [
    { title: "Dashboard", url: "/admin", icon: Home },
    { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
    {
      title: "Management",
      icon: Sliders,
      children: [
        { title: "Merchants", url: "/admin/merchants", icon: Building2 },
        { title: "Creators", url: "/admin/creators", icon: Users },
      ],
    },
    // Removed from AFFEXCH admin (no longer fit the flow):
    //   Reviews, Keywords, Niches, Moderation, Messages, Platform Settings, Link Approval.
    { title: "Payouts", url: "/admin/payouts", icon: Wallet },
    { title: "Audit Trail", url: "/admin/audit-logs", icon: ScrollText },
  ];

  const getMenuItems = (): MenuItem[] => {
    if (user?.role === 'admin') return adminItems;
    return creatorItems;
  };

  const menuItems = getMenuItems();

  const toggleSubmenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !(prev[title] ?? false),
    }));
  };

  return (
    <>
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-3 py-2.5 group-data-[collapsible=icon]:p-1.5">
        <div className="flex items-center gap-2">
          <SidebarTrigger
            aria-label="Toggle navigation menu"
            className="shrink-0 rounded-md border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          />
          <Link href="/" onClick={handleNavClick}>
            <div className="flex items-center gap-1.5 cursor-pointer">
              <img src={logoUrl} alt="AffiliateXchange Logo" onError={hideOnError} className="h-6 w-6 rounded-md object-cover shrink-0 fx-logo-glow" />
              <span className="font-bold text-sm tracking-wider text-primary group-data-[collapsible=icon]:hidden fx-glitch">AFFEXCH</span>
            </div>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {user?.role === 'admin' ? 'Admin Panel' : 'Creator Portal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="fx-stagger gap-1.5 [&_span]:text-[15px] [&_span]:font-medium [&_svg]:!size-5">
              {menuItems.map((item) => {
                const hasChildren = "children" in item && Array.isArray((item as GroupItem).children);
                const leaf = item as LeafItem;
                const group = item as GroupItem;
                const isActive = hasChildren
                  ? group.children?.some((child) => child.url === location)
                  : leaf.url ? location === leaf.url : false;
                const isOpen = hasChildren ? openMenus[item.title] ?? isActive : false;
                const sep = item.separatorBefore ? (
                  <SidebarSeparator key={`sep-${item.title}`} className="my-2" />
                ) : null;

                if (hasChildren) {
                  // When collapsed, use dropdown menu for items with children
                  if (isCollapsed) {
                    return (
                      <Fragment key={item.title}>
                      {sep}
                      <SidebarMenuItem>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={`flex w-8 h-8 items-center justify-center rounded-md p-2 transition-all duration-200 hover:text-primary hover:font-bold ${isActive ? "text-primary font-bold" : ""}`}
                              data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                            >
                              <item.icon className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" sideOffset={8} className="min-w-[200px] z-[100]">
                            {group.children?.map((child) => (
                              <DropdownMenuItem
                                key={child.url}
                                asChild
                                className="hover:bg-transparent focus:bg-transparent cursor-pointer"
                              >
                                <Link
                                  href={child.url!}
                                  onClick={handleNavClick}
                                  className={`hover:text-primary hover:font-bold transition-all duration-200 ${location === child.url ? "text-primary font-bold" : ""}`}
                                >
                                  <child.icon className="h-4 w-4 mr-2" />
                                  <span>{child.title}</span>
                                </Link>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </SidebarMenuItem>
                      </Fragment>
                    );
                  }

                  // When expanded, use inline submenu
                  return (
                    <Fragment key={item.title}>
                    {sep}
                    <SidebarMenuItem className="group/item">
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isActive}
                        className="hover:bg-transparent hover:text-primary hover:font-bold data-[active=true]:bg-transparent data-[active=true]:text-primary transition-all duration-200"
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                        onClick={() => toggleSubmenu(item.title)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                      <SidebarMenuSub className={isOpen ? "" : "hidden"}>
                        {group.children?.map((child) => (
                          <SidebarMenuSubItem key={child.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={location === child.url}
                              className="hover:bg-transparent data-[active=true]:bg-transparent hover:text-primary data-[active=true]:text-primary hover:font-bold"
                            >
                              <Link href={child.url!} onClick={handleNavClick}>
                                <child.icon className="h-4 w-4" />
                                <span>{child.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </SidebarMenuItem>
                    </Fragment>
                  );
                }

                // Leaf with onClick (e.g. Change City) — render as button, not link
                if (leaf.onClick) {
                  return (
                    <Fragment key={item.title}>
                    {sep}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        size="default"
                        tooltip={item.title}
                        className="hover:bg-transparent hover:text-primary hover:font-bold transition-all duration-200"
                        data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                        onClick={leaf.onClick}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    </Fragment>
                  );
                }

                // Leaf with url
                return (
                  <Fragment key={leaf.url ?? item.title}>
                  {sep}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      size="default"
                      isActive={isActive}
                      tooltip={item.title}
                      className="hover:bg-transparent hover:text-primary hover:font-bold data-[active=true]:bg-transparent data-[active=true]:text-primary transition-all duration-200"
                      data-testid={`nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      <Link href={leaf.url!} onClick={handleNavClick}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  </Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 p-3 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-1 rounded-full bg-primary" />
            <p className="text-[10px] font-semibold tracking-wide text-primary">AFFEXCH</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Professional affiliate marketing platform
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              © {currentYear} AffiliateXchange. All rights reserved.
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
    </>
  );
}
