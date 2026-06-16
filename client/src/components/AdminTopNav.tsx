import { Link, useLocation } from "wouter";
import {
  Home,
  Building2,
  Users,
  ScrollText,
  Sliders,
  BarChart3,
  CheckCircle,
  Wallet,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Leaf = { title: string; url: string; icon: any };
type Group = { title: string; icon: any; children: Leaf[] };
type Item = Leaf | Group;

const ITEMS: Item[] = [
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
  { title: "Payouts", url: "/admin/payouts", icon: Wallet },
  { title: "Audit Trail", url: "/admin/audit-logs", icon: ScrollText },
];

export function AdminTopNav() {
  const [location] = useLocation();

  return (
    <nav className="hidden md:flex items-center gap-0.5 shrink-0">
      {ITEMS.map((item) => {
        if ("children" in item) {
          const isActive = item.children.some((c) => c.url === location);
          return (
            <DropdownMenu key={item.title}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium mono tracking-wide transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  }`}
                  data-testid={`adminnav-${item.title.toLowerCase()}`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {item.children.map((child) => (
                  <DropdownMenuItem key={child.url} asChild>
                    <Link
                      href={child.url}
                      className={`flex items-center gap-2 cursor-pointer ${
                        location === child.url ? "text-primary font-semibold" : ""
                      }`}
                    >
                      <child.icon className="h-4 w-4" />
                      {child.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        const isActive = location === item.url;
        return (
          <Link
            key={item.url}
            href={item.url}
            data-testid={`adminnav-${item.title.toLowerCase().replace(/\s/g, "-")}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium mono tracking-wide transition-colors whitespace-nowrap ${
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            }`}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
