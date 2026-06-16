import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { MerchantLogo } from "../components/MerchantLogo";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Building2,
  ExternalLink,
  Search,
  X,
  MoreHorizontal,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  Globe,
  ChevronLeft,
} from "lucide-react";
import { TopNavBar } from "../components/TopNavBar";
import { Link, useLocation } from "wouter";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { ListSkeleton } from "../components/skeletons";
import { AddMerchantDialog } from "../components/AddMerchantDialog";
import { AddOfferDialog } from "../components/AddOfferDialog";
import { UserPlus, Plus } from "lucide-react";

type Company = {
  id: string;
  legalName: string;
  tradeName?: string;
  industry?: string;
  websiteUrl?: string;
  logoUrl?: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt: string;
  approvedAt?: string;
  isDeletedUser?: boolean;
  user?: {
    email: string;
    username: string;
  };
  // Merchant performance (added by /api/admin/companies/all)
  domain?: string | null;
  city?: string | null;
  country?: string | null;
  salesCount?: number;
  grossSales?: number;
  totalCommission?: number;
  level?: { key: string; label: string };
  rank?: number;
  movement?: number | null;
  isNew?: boolean;
};

const LEVEL_CLASS: Record<string, string> = {
  super: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300",
  performing: "bg-amber-100 text-amber-700 border-amber-300",
  rising: "bg-emerald-100 text-emerald-700 border-emerald-300",
  new: "bg-gray-100 text-gray-600 border-gray-300",
};

function MovementArrow({ m, isNew }: { m?: number | null; isNew?: boolean }) {
  if (isNew) return <span className="text-[10px] uppercase font-semibold text-primary">new</span>;
  if (m == null || m === 0) return <Minus className="h-3.5 w-3.5 text-gray-400" />;
  return m > 0
    ? <span className="inline-flex items-center text-emerald-600 text-xs font-semibold"><ArrowUp className="h-3.5 w-3.5" />{m}</span>
    : <span className="inline-flex items-center text-rose-600 text-xs font-semibold"><ArrowDown className="h-3.5 w-3.5" />{Math.abs(m)}</span>;
}

type SortField = "name" | "industry" | "status" | "joined" | "rank";
type SortDirection = "asc" | "desc";

export default function AdminCompanies() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page, setPage] = useState<number>(1);
  const [addOpen, setAddOpen] = useState(false);
  const [addOfferTarget, setAddOfferTarget] = useState<{ id: string; name: string } | null>(null);
  const PAGE_SIZE = 10;
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setErrorDialog({
        open: true,
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, isLoading]);

  const [metric, setMetric] = useState<"orders" | "revenue">("revenue");

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies/all", metric],
    queryFn: async () => {
      const response = await fetch(`/api/admin/companies/all?metric=${metric}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch companies");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort companies
  const filteredCompanies = useMemo(() => {
    let result = companies.filter((company) => {
      // Status filter
      if (statusFilter !== "all" && company.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          company.legalName?.toLowerCase().includes(query) ||
          company.tradeName?.toLowerCase().includes(query) ||
          company.user?.email?.toLowerCase().includes(query) ||
          company.user?.username?.toLowerCase().includes(query) ||
          company.industry?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.legalName || "").localeCompare(b.legalName || "");
          break;
        case "industry":
          comparison = (a.industry || "").localeCompare(b.industry || "");
          break;
        case "status":
          comparison = (a.status || "").localeCompare(b.status || "");
          break;
        case "joined":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case "rank":
          comparison = (a.rank ?? 1e9) - (b.rank ?? 1e9);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [companies, searchQuery, statusFilter, sortField, sortDirection]);

  // Reset to page 1 whenever the filter/sort/search changes the underlying list size
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, sortField, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filteredCompanies.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCompanies = useMemo(
    () => filteredCompanies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredCompanies, currentPage],
  );

  // Stats
  const stats = useMemo(() => {
    return {
      total: companies.length,
      approved: companies.filter((c) => c.status === "approved").length,
      pending: companies.filter((c) => c.status === "pending").length,
      rejected: companies.filter((c) => c.status === "rejected").length,
      suspended: companies.filter((c) => c.status === "suspended").length,
    };
  }, [companies]);

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 capitalize">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  const statusTabs = [
    { key: "all", label: "All", count: stats.total },
    { key: "approved", label: "Approved", count: stats.approved },
    { key: "pending", label: "Pending", count: stats.pending },
    { key: "rejected", label: "Rejected", count: stats.rejected },
    { key: "suspended", label: "Suspended", count: stats.suspended },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />

      {/* Mobile Header */}
      <div className="md:hidden px-4 py-4 bg-white border-b">
        <div className="flex items-center gap-3">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 fx-text-in fx-text-glow"><span className="fx-text-sweep">Merchants</span><span className="fx-caret ml-1">_</span></h1>
            <p className="text-sm text-gray-500">{stats.total} total</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 fx-page">
        {/* Desktop Header */}
        <div className="hidden md:flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 fx-text-in fx-text-glow"><span className="fx-text-sweep">Merchant Management</span><span className="fx-caret ml-1">_</span></h1>
            <p className="text-gray-500 mt-1 fx-slide-up fx-delay-2">Manage all merchants on the platform</p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 shrink-0">
            <UserPlus className="h-4 w-4" />
            Add merchant
          </Button>
        </div>

        {/* Mobile: Add merchant under the chrome-only header */}
        <div className="md:hidden">
          <Button onClick={() => setAddOpen(true)} className="gap-1.5 w-full" size="sm">
            <UserPlus className="h-3.5 w-3.5" />
            Add merchant
          </Button>
        </div>

        <AddMerchantDialog open={addOpen} onOpenChange={setAddOpen} />
        <AddOfferDialog
          open={!!addOfferTarget}
          onOpenChange={(o) => !o && setAddOfferTarget(null)}
          merchantId={addOfferTarget?.id ?? null}
          merchantName={addOfferTarget?.name ?? null}
        />

        {/* Mobile Compact Stats */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.total}</span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <CheckCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.approved}</span>
              <span className="text-xs text-gray-500">Approved</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <Clock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.pending}</span>
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <XCircle className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.rejected}</span>
              <span className="text-xs text-gray-500">Rejected</span>
            </div>
          </div>
        </div>

        {/* Desktop Stats Cards */}
        <div className="hidden md:grid md:grid-cols-5 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rejected</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Suspended</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.suspended}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Ban className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              {/* Status Tabs */}
              <div className="flex gap-1 overflow-x-auto pb-1 md:pb-0 -mx-1 px-1">
                {statusTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-colors ${
                      statusFilter === tab.key
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tab.label}
                    <span className="ml-1 text-[10px] md:text-xs opacity-70">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex-1 md:max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 h-9 md:h-10 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Rank-by metric toggle */}
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-gray-500 mr-1">Rank by</span>
                {(["revenue", "orders"] as const).map((mt) => (
                  <button
                    key={mt}
                    onClick={() => setMetric(mt)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                      metric === mt ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                    data-testid={`rank-metric-${mt}`}
                  >
                    {mt}
                  </button>
                ))}
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="border-0 shadow-sm hidden md:block">
          <CardContent className="p-0">
            {loadingCompanies ? (
              <div className="p-6">
                <ListSkeleton count={5} />
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No merchants found</h3>
                <p className="text-sm text-gray-500">
                  {searchQuery ? "Try adjusting your search terms" : "No merchants match the current filter"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[280px]">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Merchant
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("rank")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Performance
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("status")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Status
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("joined")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Joined
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead className="w-[80px] text-right sticky right-0 bg-gray-50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedCompanies.map((company) => (
                    <TableRow key={company.id} className="hover:bg-gray-50 cursor-pointer">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <MerchantLogo domain={company.domain} name={company.legalName} className="h-10 w-10 rounded-lg shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{company.legalName}</p>
                            {company.tradeName && company.tradeName !== company.legalName && (
                              <p className="text-xs text-gray-500 truncate">{company.tradeName}</p>
                            )}
                            {company.websiteUrl && (
                              <a
                                href={company.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Globe className="h-3 w-3" />
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {company.level
                          ? <Badge variant="outline" className={`text-[10px] ${LEVEL_CLASS[company.level.key] ?? LEVEL_CLASS.new}`}>{company.level.label}</Badge>
                          : <span className="text-sm text-gray-400">-</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-7 shrink-0">#{company.rank ?? "—"}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {metric === "revenue"
                                ? `$${(company.grossSales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                : `${company.salesCount ?? 0} ${(company.salesCount ?? 0) === 1 ? "order" : "orders"}`}
                            </p>
                            <p className="text-[11px] text-gray-500">
                              {metric === "revenue"
                                ? `${company.salesCount ?? 0} ${(company.salesCount ?? 0) === 1 ? "order" : "orders"}`
                                : `$${(company.grossSales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} revenue`}
                            </p>
                          </div>
                          <MovementArrow m={company.movement} isNew={company.isNew} />
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(company.createdAt)}</span>
                      </TableCell>
                      <TableCell className="text-right sticky right-0 bg-background z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={() => navigate(`/admin/merchants/${company.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setAddOfferTarget({
                                  id: company.id,
                                  name: company.tradeName || company.legalName,
                                })
                              }
                              className="cursor-pointer"
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add offer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loadingCompanies ? (
            <ListSkeleton count={5} />
          ) : filteredCompanies.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No merchants found</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchQuery ? "Try adjusting your search terms" : "No merchants match the current filter"}
                </p>
              </CardContent>
            </Card>
          ) : (
            pagedCompanies.map((company) => (
              <Card key={company.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <MerchantLogo domain={company.domain} name={company.legalName} className="h-12 w-12 rounded-lg shrink-0" />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{company.legalName}</p>
                        {company.tradeName && company.tradeName !== company.legalName && (
                          <p className="text-xs text-gray-500 truncate">{company.tradeName}</p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(company.status)}
                  </div>

                  {/* Info Row */}
                  {company.industry && (
                    <div className="flex items-center gap-4 mb-3 py-2 border-y border-gray-100">
                      <span className="text-sm text-gray-600">{company.industry}</span>
                    </div>
                  )}

                  {/* Contact */}
                  <div className="mb-3">
                    <p
                      className={`text-sm ${company.isDeletedUser ? "line-through text-gray-400" : "text-gray-700"}`}
                    >
                      {company.user?.email || "-"}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">@{company.user?.username}</span>
                      {company.isDeletedUser && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          Deleted
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{formatDate(company.createdAt)}</span>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/merchants/${company.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination + results count */}
        {!loadingCompanies && filteredCompanies.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCompanies.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{filteredCompanies.length}</span> merchants
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <span className="text-xs px-3 text-muted-foreground font-mono">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <GenericErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        variant="error"
      />
    </div>
  );
}
