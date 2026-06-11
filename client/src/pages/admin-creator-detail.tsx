import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  ArrowLeft,
  Mail,
  User as UserIcon,
  Calendar,
  ShieldCheck,
  ShieldOff,
  Ban,
  Loader2,
} from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";
import { TopNavBar } from "../components/TopNavBar";
import { useLocation, useRoute } from "wouter";
import { GenericErrorDialog } from "../components/GenericErrorDialog";

type CreatorRow = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  accountStatus: string;
  createdAt: string | null;
  isDeleted: boolean;
  profile: {
    bio: string | null;
    youtubeFollowers: number | null;
    tiktokFollowers: number | null;
    instagramFollowers: number | null;
  } | null;
};

const formatDate = (d: string | null | undefined) => {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const fullName = (c: CreatorRow) =>
  c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.username;

const statusBadge = (creator: CreatorRow) => {
  if (creator.isDeleted) {
    return <Badge variant="outline" className="text-gray-500">Deleted</Badge>;
  }
  switch (creator.accountStatus) {
    case "active":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>;
    case "suspended":
      return <Badge className="bg-yellow-600 hover:bg-yellow-600">Suspended</Badge>;
    case "banned":
      return <Badge variant="destructive">Banned</Badge>;
    default:
      return <Badge variant="outline">{creator.accountStatus}</Badge>;
  }
};

export default function AdminCreatorDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/creators/:id");
  const creatorId = params?.id;

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: "suspend" | "ban" | "unsuspend" | null;
  }>({ open: false, action: null });

  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    errorDetails?: string;
  }>({ open: false, title: "", description: "" });

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

  // Reuse the list endpoint — react-query shares the cache with admin-creators.tsx
  // so navigating from the list shows the profile instantly without a refetch.
  const { data: creators = [], isLoading: loadingCreators } = useQuery<CreatorRow[]>({
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

  const creator = creators.find((c) => c.id === creatorId);

  const suspendMutation = useMutation({
    mutationFn: async (id: string) =>
      apiRequest("POST", `/api/admin/creators/${id}/suspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({ title: "Success", description: "Creator account suspended" });
      setActionDialog({ open: false, action: null });
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
    mutationFn: async (id: string) =>
      apiRequest("POST", `/api/admin/creators/${id}/unsuspend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({ title: "Success", description: "Creator account reinstated" });
      setActionDialog({ open: false, action: null });
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
    mutationFn: async (id: string) =>
      apiRequest("POST", `/api/admin/creators/${id}/ban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/creators"] });
      toast({ title: "Success", description: "Creator account banned" });
      setActionDialog({ open: false, action: null });
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

  const confirmAction = () => {
    if (!creator || !actionDialog.action) return;
    if (actionDialog.action === "suspend") suspendMutation.mutate(creator.id);
    else if (actionDialog.action === "unsuspend") unsuspendMutation.mutate(creator.id);
    else if (actionDialog.action === "ban") banMutation.mutate(creator.id);
  };

  const actionIsPending =
    suspendMutation.isPending || unsuspendMutation.isPending || banMutation.isPending;

  if (loadingCreators) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavBar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/creators")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Creators
          </Button>
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-lg font-semibold text-foreground">Creator not found</p>
              <p className="text-sm text-muted-foreground mt-1">
                This creator may have been deleted or the link is invalid.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavBar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/creators")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Creators
        </Button>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={creator.profileImageUrl ?? undefined} alt={creator.username} />
                <AvatarFallback className="text-xl bg-muted">
                  {creator.firstName?.[0] || creator.username?.[0]?.toUpperCase() || "C"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate" data-testid="text-creator-name">
                  {fullName(creator)}
                </h1>
                <p className="text-sm text-muted-foreground truncate">@{creator.username}</p>
                <div className="mt-2">{statusBadge(creator)}</div>
              </div>
              {!creator.isDeleted && (
                <div className="flex flex-wrap gap-2">
                  {creator.accountStatus === "active" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActionDialog({ open: true, action: "suspend" })}
                        data-testid="button-suspend"
                      >
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setActionDialog({ open: true, action: "ban" })}
                        data-testid="button-ban"
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Ban
                      </Button>
                    </>
                  )}
                  {creator.accountStatus === "suspended" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActionDialog({ open: true, action: "unsuspend" })}
                      data-testid="button-unsuspend"
                    >
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Reinstate
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm break-all" data-testid="text-creator-email">{creator.email}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <UserIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm">{creator.username}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Joined</p>
                <p className="text-sm">{formatDate(creator.createdAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {creator.profile?.bio && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap" data-testid="text-creator-bio">
                {creator.profile.bio}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) => !actionIsPending && setActionDialog({ open, action: open ? actionDialog.action : null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.action === "suspend" && "Suspend Creator Account"}
              {actionDialog.action === "ban" && "Ban Creator Account"}
              {actionDialog.action === "unsuspend" && "Reinstate Creator Account"}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.action === "suspend" &&
                `Temporarily disable ${fullName(creator)}'s account. They will not be able to log in until reinstated.`}
              {actionDialog.action === "ban" &&
                `Permanently ban ${fullName(creator)}. This action is severe and should be reserved for serious violations.`}
              {actionDialog.action === "unsuspend" &&
                `Restore access for ${fullName(creator)}. They will be able to log in again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, action: null })}
              disabled={actionIsPending}
            >
              Cancel
            </Button>
            <Button
              variant={actionDialog.action === "ban" ? "destructive" : "default"}
              onClick={confirmAction}
              disabled={actionIsPending}
              data-testid="button-confirm-action"
            >
              {actionIsPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
