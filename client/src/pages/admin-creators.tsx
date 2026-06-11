import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Users,
  Search,
  Ban,
  ShieldOff,
  ShieldCheck,
  MoreHorizontal,
  Eye,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowUpDown,
  X,
  UserX,
  ChevronLeft,
} from "lucide-react";
import { SiYoutube, SiTiktok, SiInstagram } from "react-icons/si";
import { apiRequest, queryClient } from "../lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { TopNavBar } from "../components/TopNavBar";
import { ListSkeleton } from "../components/skeletons";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { Link, useLocation } from "wouter";

type SortField = "name" | "earnings" | "joined" | "status";
type SortDirection = "asc" | "desc";

export default function AdminCreators() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "suspend" | "ban" | "unsuspend" | null;
  }>({ open: false, action: null });
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    errorDetails?: string;
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

  const { data: creators = [], isLoading: loadingCreators } = useQuery<any[]>({
    queryKey: ["/api/admin/creators"],
    queryFn: async () => {
      const response = await fetch("/api/admin/creators", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch creators");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const suspendMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      return await apiRequest("POST", `/api/admin/creators/${creatorId}/suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({
        title: "Success",
        description: "Creator account suspended",
      });
      setActionDialog({ open: false, action: null });
      setSelectedCreator(null);
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: "Failed to suspend creator",
        errorDetails: error.message,
      });
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      return await apiRequest("POST", `/api/admin/creators/${creatorId}/unsuspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({
        title: "Success",
        description: "Creator account reactivated",
      });
      setActionDialog({ open: false, action: null });
      setSelectedCreator(null);
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: "Failed to unsuspend creator",
        errorDetails: error.message,
      });
    },
  });

  const banMutation = useMutation({
    mutationFn: async (creatorId: string) => {
      return await apiRequest("POST", `/api/admin/creators/${creatorId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({
        title: "Success",
        description: "Creator account banned",
      });
      setActionDialog({ open: false, action: null });
      setSelectedCreator(null);
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: "Failed to ban creator",
        errorDetails: error.message,
      });
    },
  });

  const handleAction = (creator: any, action: "suspend" | "ban" | "unsuspend") => {
    setSelectedCreator(creator);
    setActionDialog({ open: true, action });
  };

  const confirmAction = () => {
    if (!selectedCreator || !actionDialog.action) return;

    if (actionDialog.action === "suspend") {
      suspendMutation.mutate(selectedCreator.id);
    } else if (actionDialog.action === "ban") {
      banMutation.mutate(selectedCreator.id);
    } else if (actionDialog.action === "unsuspend") {
      unsuspendMutation.mutate(selectedCreator.id);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter and sort creators
  const filteredCreators = useMemo(() => {
    let result = creators.filter((creator) => {
      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "deleted") {
          if (!creator.isDeleted) return false;
        } else {
          if (creator.isDeleted) return false;
          if (creator.accountStatus !== statusFilter) return false;
        }
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          creator.username?.toLowerCase().includes(search) ||
          creator.email?.toLowerCase().includes(search) ||
          creator.firstName?.toLowerCase().includes(search) ||
          creator.lastName?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          const nameA = a.firstName && a.lastName ? `${a.firstName} ${a.lastName}` : a.username || "";
          const nameB = b.firstName && b.lastName ? `${b.firstName} ${b.lastName}` : b.username || "";
          comparison = nameA.localeCompare(nameB);
          break;
        case "earnings":
          comparison = (a.totalEarnings || 0) - (b.totalEarnings || 0);
          break;
        case "joined":
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case "status":
          comparison = (a.accountStatus || "").localeCompare(b.accountStatus || "");
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [creators, searchTerm, statusFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: creators.length,
      active: creators.filter((c) => c.accountStatus === "active" && !c.isDeleted).length,
      suspended: creators.filter((c) => c.accountStatus === "suspended" && !c.isDeleted).length,
      banned: creators.filter((c) => c.accountStatus === "banned" && !c.isDeleted).length,
      deleted: creators.filter((c) => c.isDeleted).length,
    };
  }, [creators]);

  const getStatusBadge = (creator: any) => {
    if (creator.isDeleted) {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
          Deleted
        </Badge>
      );
    }
    switch (creator.accountStatus) {
      case "active":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Active
          </Badge>
        );
      case "suspended":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Suspended
          </Badge>
        );
      case "banned":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100">
            Banned
          </Badge>
        );
      default:
        return <Badge variant="secondary">{creator.accountStatus}</Badge>;
    }
  };

  const formatFollowers = (count: number | undefined) => {
    if (!count) return null;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
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
    { key: "active", label: "Active", count: stats.active },
    { key: "suspended", label: "Suspended", count: stats.suspended },
    { key: "banned", label: "Banned", count: stats.banned },
    { key: "deleted", label: "Deleted", count: stats.deleted },
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
            <h1 className="text-xl font-bold text-gray-900 fx-text-in fx-text-glow"><span className="fx-text-sweep">Creators</span><span className="fx-caret ml-1">_</span></h1>
            <p className="text-sm text-gray-500">{stats.total} total</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6 space-y-4 md:space-y-6 fx-page">
        {/* Desktop Header */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-gray-900 fx-text-in fx-text-glow"><span className="fx-text-sweep">Creator Management</span><span className="fx-caret ml-1">_</span></h1>
          <p className="text-gray-500 mt-1 fx-slide-up fx-delay-2">View and manage creator accounts on the platform</p>
        </div>

        {/* Mobile Compact Stats */}
        <div className="md:hidden">
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.total}</span>
              <span className="text-xs text-gray-500">Total</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <ShieldCheck className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.active}</span>
              <span className="text-xs text-gray-500">Active</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <ShieldOff className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.suspended}</span>
              <span className="text-xs text-gray-500">Suspended</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg shadow-sm border border-gray-100 min-w-fit">
              <Ban className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">{stats.banned}</span>
              <span className="text-xs text-gray-500">Banned</span>
            </div>
          </div>
        </div>

        {/* Desktop Stats Cards */}
        <div className="hidden md:grid md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Creators</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-gray-600" />
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
                  <ShieldOff className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Banned</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.banned}</p>
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
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-gray-50 border-gray-200 h-9 md:h-10 text-sm"
                    data-testid="input-search-creators"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="border-0 shadow-sm hidden md:block">
          <CardContent className="p-0">
            {loadingCreators ? (
              <div className="p-6">
                <ListSkeleton count={5} />
              </div>
            ) : filteredCreators.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No creators found</h3>
                <p className="text-sm text-gray-500">
                  {searchTerm ? "Try adjusting your search terms" : "No creators match the current filter"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="w-[300px]">
                      <button
                        onClick={() => handleSort("name")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Creator
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </TableHead>
                    <TableHead>Platforms</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort("earnings")}
                        className="flex items-center gap-1 font-medium text-gray-700 hover:text-gray-900"
                      >
                        Earnings
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
                    <TableHead className="w-[100px] text-right sticky right-0 bg-gray-50 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCreators.map((creator) => (
                    <TableRow
                      key={creator.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      data-testid={`row-creator-${creator.id}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage src={creator.profileImageUrl} alt={creator.username} />
                            <AvatarFallback className="bg-gray-100 text-gray-600">
                              {creator.firstName?.[0] || creator.username?.[0]?.toUpperCase() || "C"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate" data-testid={`text-name-${creator.id}`}>
                              {creator.firstName && creator.lastName
                                ? `${creator.firstName} ${creator.lastName}`
                                : creator.username}
                            </p>
                            <p className="text-sm text-gray-500 truncate">{creator.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {creator.profile?.youtubeFollowers && (
                            <div className="flex items-center gap-1 text-sm">
                              <SiYoutube className="h-4 w-4 text-red-500" />
                              <span className="text-gray-600">{formatFollowers(creator.profile.youtubeFollowers)}</span>
                            </div>
                          )}
                          {creator.profile?.tiktokFollowers && (
                            <div className="flex items-center gap-1 text-sm">
                              <SiTiktok className="h-4 w-4 text-gray-900" />
                              <span className="text-gray-600">{formatFollowers(creator.profile.tiktokFollowers)}</span>
                            </div>
                          )}
                          {creator.profile?.instagramFollowers && (
                            <div className="flex items-center gap-1 text-sm">
                              <SiInstagram className="h-4 w-4 text-pink-500" />
                              <span className="text-gray-600">{formatFollowers(creator.profile.instagramFollowers)}</span>
                            </div>
                          )}
                          {!creator.profile?.youtubeFollowers &&
                            !creator.profile?.tiktokFollowers &&
                            !creator.profile?.instagramFollowers && (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          ${(creator.totalEarnings || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`badge-status-${creator.id}`}>
                        {getStatusBadge(creator)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{formatDate(creator.createdAt)}</span>
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
                              onClick={() => navigate(`/admin/creators/${creator.id}`)}
                              className="cursor-pointer"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {creator.accountStatus === "active" && !creator.isDeleted && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleAction(creator, "suspend")}
                                  className="cursor-pointer"
                                  data-testid={`button-suspend-${creator.id}`}
                                >
                                  <ShieldOff className="h-4 w-4 mr-2" />
                                  Suspend Account
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleAction(creator, "ban")}
                                  className="cursor-pointer"
                                  data-testid={`button-ban-${creator.id}`}
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Ban Account
                                </DropdownMenuItem>
                              </>
                            )}
                            {(creator.accountStatus === "suspended" || creator.accountStatus === "banned") &&
                              !creator.isDeleted && (
                                <DropdownMenuItem
                                  onClick={() => handleAction(creator, "unsuspend")}
                                  className="cursor-pointer"
                                  data-testid={`button-unsuspend-${creator.id}`}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-2" />
                                  Reactivate Account
                                </DropdownMenuItem>
                              )}
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
          {loadingCreators ? (
            <ListSkeleton count={5} />
          ) : filteredCreators.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No creators found</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm ? "Try adjusting your search terms" : "No creators match the current filter"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredCreators.map((creator) => (
              <Card
                key={creator.id}
                className="border-0 shadow-sm"
                data-testid={`card-creator-${creator.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={creator.profileImageUrl} alt={creator.username} />
                      <AvatarFallback className="bg-gray-100 text-gray-600">
                        {creator.firstName?.[0] || creator.username?.[0]?.toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 truncate" data-testid={`text-name-${creator.id}`}>
                          {creator.firstName && creator.lastName
                            ? `${creator.firstName} ${creator.lastName}`
                            : creator.username}
                        </p>
                        <div data-testid={`badge-status-${creator.id}`}>{getStatusBadge(creator)}</div>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{creator.email}</p>
                    </div>
                  </div>

                  {/* Platforms */}
                  {(creator.profile?.youtubeFollowers ||
                    creator.profile?.tiktokFollowers ||
                    creator.profile?.instagramFollowers) && (
                    <div className="flex items-center gap-4 mb-3 py-2 border-y border-gray-100">
                      {creator.profile?.youtubeFollowers && (
                        <div className="flex items-center gap-1.5">
                          <SiYoutube className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-gray-600">
                            {formatFollowers(creator.profile.youtubeFollowers)}
                          </span>
                        </div>
                      )}
                      {creator.profile?.tiktokFollowers && (
                        <div className="flex items-center gap-1.5">
                          <SiTiktok className="h-4 w-4 text-gray-900" />
                          <span className="text-sm text-gray-600">
                            {formatFollowers(creator.profile.tiktokFollowers)}
                          </span>
                        </div>
                      )}
                      {creator.profile?.instagramFollowers && (
                        <div className="flex items-center gap-1.5">
                          <SiInstagram className="h-4 w-4 text-pink-500" />
                          <span className="text-sm text-gray-600">
                            {formatFollowers(creator.profile.instagramFollowers)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">
                          ${(creator.totalEarnings || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formatDate(creator.createdAt)}</span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate(`/admin/creators/${creator.id}`)}
                          className="cursor-pointer"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {creator.accountStatus === "active" && !creator.isDeleted && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleAction(creator, "suspend")}
                              className="cursor-pointer text-yellow-600"
                              data-testid={`button-suspend-${creator.id}`}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleAction(creator, "ban")}
                              className="cursor-pointer text-red-600"
                              data-testid={`button-ban-${creator.id}`}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Ban
                            </DropdownMenuItem>
                          </>
                        )}
                        {(creator.accountStatus === "suspended" || creator.accountStatus === "banned") &&
                          !creator.isDeleted && (
                            <DropdownMenuItem
                              onClick={() => handleAction(creator, "unsuspend")}
                              className="cursor-pointer text-green-600"
                              data-testid={`button-unsuspend-${creator.id}`}
                            >
                              <ShieldCheck className="h-4 w-4 mr-2" />
                              Reactivate
                            </DropdownMenuItem>
                          )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Results count */}
        {!loadingCreators && filteredCreators.length > 0 && (
          <p className="text-sm text-gray-500 text-center">
            Showing {filteredCreators.length} of {creators.length} creators
          </p>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ open, action: null })}>
        <DialogContent data-testid="dialog-confirm-action">
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "suspend" && "Suspend Creator Account"}
              {actionDialog.action === "ban" && "Ban Creator Account"}
              {actionDialog.action === "unsuspend" && "Reactivate Creator Account"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "suspend" &&
                `Are you sure you want to suspend ${selectedCreator?.username}? They won't be able to access their account until unsuspended.`}
              {actionDialog.action === "ban" &&
                `Are you sure you want to ban ${selectedCreator?.username}? This is a serious action that will permanently restrict their access.`}
              {actionDialog.action === "unsuspend" &&
                `Are you sure you want to reactivate ${selectedCreator?.username}? They will regain full access to their account.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialog({ open: false, action: null });
                setSelectedCreator(null);
              }}
              data-testid="button-cancel-action"
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "ban" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={suspendMutation.isPending || banMutation.isPending || unsuspendMutation.isPending}
              data-testid="button-confirm-action"
            >
              {suspendMutation.isPending || banMutation.isPending || unsuspendMutation.isPending
                ? "Processing..."
                : actionDialog.action === "suspend"
                  ? "Suspend Account"
                  : actionDialog.action === "ban"
                    ? "Ban Account"
                    : "Reactivate Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <GenericErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        errorDetails={errorDialog.errorDetails}
        variant="error"
      />
    </div>
  );
}
