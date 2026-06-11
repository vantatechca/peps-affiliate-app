import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/use-toast";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
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
  CheckCircle2,
  XCircle,
  Edit3,
  Star,
  Trash2,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  FileText,
  Clock,
  MapPin,
  Link as LinkIcon,
  Play,
  BarChart3,
  AlertCircle,
  Pause,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "../components/ui/alert";
import { TopNavBar } from "../components/TopNavBar";
import { apiRequest, queryClient } from "../lib/queryClient";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { proxiedSrc } from "../lib/image";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  pending_review: { label: "Pending", variant: "secondary" },
  approved: { label: "Live", variant: "default" },
  paused: { label: "Paused", variant: "outline" },
  archived: { label: "Archived", variant: "destructive" },
};

export default function AdminOfferDetail() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, params1] = useRoute("/admin-offer-detail/:id");
  const [, params2] = useRoute("/admin/offers/:id");
  const [, navigate] = useLocation();
  const offerId = params1?.id || params2?.id;

  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editDialog, setEditDialog] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [rejectDeleteDialog, setRejectDeleteDialog] = useState(false);
  const [rejectDeleteReason, setRejectDeleteReason] = useState("");
  const [rejectSuspendDialog, setRejectSuspendDialog] = useState(false);
  const [rejectSuspendReason, setRejectSuspendReason] = useState("");
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({ open: false, title: "", description: "" });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setErrorDialog({
        open: true,
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isAuthenticated, authLoading]);

  const { data: offerData, isLoading } = useQuery({
    queryKey: [`/api/admin/offers/${offerId}`],
    queryFn: async () => {
      const response = await fetch(`/api/admin/offers/${offerId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch offer");
      return response.json();
    },
    enabled: isAuthenticated && !!offerId,
  });

  const { data: videos = [] } = useQuery({
    queryKey: [`/api/offers/${offerId}/videos`],
    queryFn: async () => {
      const response = await fetch(`/api/offers/${offerId}/videos`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: isAuthenticated && !!offerId,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      toast({
        title: "Success",
        description: "Offer approved successfully",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to approve offer",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/reject`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      setRejectDialog(false);
      setRejectReason("");
      toast({
        title: "Success",
        description: "Offer rejected",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to reject offer",
      });
    },
  });

  const requestEditsMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/request-edits`, { notes });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      setEditDialog(false);
      setEditNotes("");
      toast({
        title: "Success",
        description: "Edit request sent to company",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to request edits",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/admin/offers/${offerId}/remove`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      toast({
        title: "Success",
        description: "Offer removed from platform",
      });
      navigate("/admin/offers");
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to remove offer",
      });
    },
  });

  // Approve delete request
  const approveDeleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/approve-delete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers/pending-actions"] });
      toast({
        title: "Deletion Approved",
        description: "The offer has been deleted successfully",
      });
      navigate("/admin/offers");
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to approve deletion",
      });
    },
  });

  // Reject delete request
  const rejectDeleteMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/reject-delete`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers/pending-actions"] });
      setRejectDeleteDialog(false);
      setRejectDeleteReason("");
      toast({
        title: "Deletion Rejected",
        description: "The deletion request has been rejected",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to reject deletion",
      });
    },
  });

  // Approve suspend request
  const approveSuspendMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/approve-suspend`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers/pending-actions"] });
      toast({
        title: "Suspension Approved",
        description: "The offer has been suspended successfully",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to approve suspension",
      });
    },
  });

  // Reject suspend request
  const rejectSuspendMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await apiRequest("POST", `/api/admin/offers/${offerId}/reject-suspend`, { reason });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/offers/${offerId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/offers/pending-actions"] });
      setRejectSuspendDialog(false);
      setRejectSuspendReason("");
      toast({
        title: "Suspension Rejected",
        description: "The suspension request has been rejected",
      });
    },
    onError: (error: any) => {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message || "Failed to reject suspension",
      });
    },
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );
  }

  if (!offerData?.offer) {
    return (
      <div className="space-y-6">
        <TopNavBar />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Offer not found</h3>
            <Button onClick={() => navigate("/admin/offers")}>Back to Offers</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { offer } = offerData;

  return (
    <div className="space-y-6 fx-page">
      <TopNavBar />

      {/* Header - Desktop */}
      <div className="hidden sm:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/offers")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{offer.title}</h1>
            <p className="text-muted-foreground mt-1">{offer.productName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_MAP[offer.status]?.variant || "secondary"} className="text-sm">
            {STATUS_MAP[offer.status]?.label || offer.status}
          </Badge>
          {offer.featuredOnHomepage && (
            <Badge variant="default" className="gap-1">
              <Star className="h-3 w-3" />
              Featured
            </Badge>
          )}
          {offer.pendingAction && (
            <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600">
              <Loader2 className="h-3 w-3 animate-spin" />
              Pending {offer.pendingAction === 'delete' ? 'Deletion' : 'Suspension'}
            </Badge>
          )}
        </div>
      </div>

      {/* Header - Mobile */}
      <div className="sm:hidden space-y-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/offers")} className="p-0 h-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge variant={STATUS_MAP[offer.status]?.variant || "secondary"} className="text-xs">
              {STATUS_MAP[offer.status]?.label || offer.status}
            </Badge>
            {offer.featuredOnHomepage && (
              <Badge variant="default" className="gap-1 text-xs">
                <Star className="h-3 w-3" />
                Featured
              </Badge>
            )}
            {offer.pendingAction && (
              <Badge variant="outline" className="gap-1 text-yellow-600 border-yellow-600 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                Pending {offer.pendingAction === 'delete' ? 'Deletion' : 'Suspension'}
              </Badge>
            )}
          </div>
          <h1 className="text-xl font-bold">{offer.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{offer.productName}</p>
        </div>
      </div>

      {/* Pending Action Alert */}
      {offer.pendingAction && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-yellow-700">
              <AlertCircle className="h-5 w-5" />
              {offer.pendingAction === 'delete' ? 'Deletion' : 'Suspension'} Request
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-yellow-700">
                  The company has requested to <strong>{offer.pendingAction}</strong> this offer.
                </p>
                {offer.pendingActionReason && (
                  <div className="mt-2 p-3 bg-white rounded-lg border border-yellow-200">
                    <p className="text-sm font-medium text-gray-700">Reason:</p>
                    <p className="text-sm text-gray-600">{offer.pendingActionReason}</p>
                  </div>
                )}
                {offer.pendingActionRequestedAt && (
                  <p className="text-xs text-yellow-600 mt-2">
                    Requested on: {new Date(offer.pendingActionRequestedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {offer.pendingAction === 'delete' ? (
                  <>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => approveDeleteMutation.mutate()}
                      disabled={approveDeleteMutation.isPending}
                      className="gap-2"
                    >
                      {approveDeleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Approve Deletion
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectDeleteDialog(true)}
                      disabled={rejectDeleteMutation.isPending}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Deletion
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => approveSuspendMutation.mutate()}
                      disabled={approveSuspendMutation.isPending}
                      className="gap-2 bg-yellow-600 hover:bg-yellow-700"
                    >
                      {approveSuspendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Pause className="h-4 w-4" />
                      )}
                      Approve Suspension
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectSuspendDialog(true)}
                      disabled={rejectSuspendMutation.isPending}
                      className="gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject Suspension
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions - Desktop */}
      <Card className="border-card-border hidden sm:block">
        <CardHeader>
          <CardTitle className="text-lg">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending || offer.status === 'approved'}
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectDialog(true)}
              disabled={rejectMutation.isPending}
              className="gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reject Offer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialog(true)}
              disabled={requestEditsMutation.isPending}
              className="gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Request Edits
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to remove this offer from the platform?")) {
                  removeMutation.mutate();
                }
              }}
              disabled={removeMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Remove from Platform
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Actions - Mobile */}
      <div className="sm:hidden">
        <h3 className="text-sm font-semibold mb-3">Actions</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Button
            variant="default"
            size="sm"
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || offer.status === 'approved'}
            className="gap-2 whitespace-nowrap flex-shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" />
            Approve Offer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRejectDialog(true)}
            disabled={rejectMutation.isPending}
            className="gap-2 whitespace-nowrap flex-shrink-0"
          >
            <XCircle className="h-4 w-4" />
            Reject Offer
          </Button>
        </div>
      </div>

      {/* Offer Details */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Offer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Short Description</div>
              <p className="text-xs sm:text-sm">{offer.shortDescription}</p>
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Full Description</div>
              <p className="text-xs sm:text-sm whitespace-pre-wrap">{offer.fullDescription}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Primary Niche</div>
                <Badge variant="outline" className="text-xs">{offer.primaryNiche}</Badge>
              </div>
              {offer.additionalNiches && offer.additionalNiches.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Additional Niches</div>
                  <div className="flex flex-wrap gap-1">
                    {offer.additionalNiches.map((niche: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">{niche}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {offer.productUrl && (
              <div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Product URL</div>
                <a
                  href={offer.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-primary hover:underline flex items-center gap-1 break-all"
                >
                  <LinkIcon className="h-3 w-3 flex-shrink-0" />
                  {offer.productUrl}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Commission & Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div>
              <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Commission Type</div>
              <Badge className="text-xs">{offer.commissionType?.replace(/_/g, ' ')}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {offer.commissionPercentage && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Commission %</div>
                  <div className="text-base sm:text-lg font-semibold">{offer.commissionPercentage}%</div>
                </div>
              )}
              {offer.commissionAmount && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Commission Amount</div>
                  <div className="text-base sm:text-lg font-semibold">${offer.commissionAmount}</div>
                </div>
              )}
              {offer.cookieDuration && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Cookie Duration</div>
                  <div className="text-xs sm:text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {offer.cookieDuration} days
                  </div>
                </div>
              )}
              {offer.minimumFollowers && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Min. Followers</div>
                  <div className="text-xs sm:text-sm">{offer.minimumFollowers.toLocaleString()}</div>
                </div>
              )}
            </div>
            {offer.creatorRequirements && (
              <div>
                <div className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">Creator Requirements</div>
                <p className="text-xs sm:text-sm whitespace-pre-wrap">{offer.creatorRequirements}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Example Videos */}
      {videos.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Example Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
              {videos.map((video: any) => (
                <div key={video.id} className="border rounded-lg overflow-hidden">
                  {video.videoUrl ? (
                    <div className="aspect-video bg-muted flex items-center justify-center relative group">
                      <video
                        src={proxiedSrc(video.videoUrl)}
                        controls
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center">
                      <Play className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  {video.title && (
                    <div className="p-2 sm:p-3">
                      <p className="text-xs sm:text-sm font-medium line-clamp-1">{video.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Requests History */}
      {offer.editRequests && Array.isArray(offer.editRequests) && offer.editRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-2 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Edit Request History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 sm:space-y-3">
              {offer.editRequests.map((request: any, idx: number) => (
                <div key={idx} className="p-3 sm:p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-medium">Edit Request #{idx + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{request.notes}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Offer</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this offer. The company will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectMutation.mutate(rejectReason)}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              Reject Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Edits</DialogTitle>
            <DialogDescription>
              Specify what changes need to be made to this offer. The company will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter edit notes..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => requestEditsMutation.mutate(editNotes)}
              disabled={!editNotes || requestEditsMutation.isPending}
            >
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Delete Dialog */}
      <Dialog open={rejectDeleteDialog} onOpenChange={setRejectDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deletion Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this deletion request. The company will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason (optional)..."
            value={rejectDeleteReason}
            onChange={(e) => setRejectDeleteReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectDeleteMutation.mutate(rejectDeleteReason)}
              disabled={rejectDeleteMutation.isPending}
            >
              {rejectDeleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                "Reject Deletion"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Suspend Dialog */}
      <Dialog open={rejectSuspendDialog} onOpenChange={setRejectSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suspension Request</DialogTitle>
            <DialogDescription>
              Optionally provide a reason for rejecting this suspension request. The company will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason (optional)..."
            value={rejectSuspendReason}
            onChange={(e) => setRejectSuspendReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => rejectSuspendMutation.mutate(rejectSuspendReason)}
              disabled={rejectSuspendMutation.isPending}
            >
              {rejectSuspendMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Rejecting...
                </>
              ) : (
                "Reject Suspension"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
