import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import { queryClient } from "../lib/queryClient";
import { Star, TrendingUp, Sparkles, Crown, Check } from "lucide-react";
import { GenericErrorDialog } from "./GenericErrorDialog";

interface PriorityListingPurchaseProps {
  offerId: string;
  offerTitle: string;
  isOpen: boolean;
  onClose: () => void;
  isRenewal?: boolean;
}

export function PriorityListingPurchase({
  offerId,
  offerTitle,
  isOpen,
  onClose,
  isRenewal = false,
}: PriorityListingPurchaseProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "Error",
    description: "An error occurred",
    errorDetails: "",
  });

  // Fetch priority listing settings
  const { data: settings } = useQuery({
    queryKey: ["/api/platform-settings/priority-listing"],
    queryFn: async () => {
      // For now, return default values
      // In a real implementation, fetch from API
      return {
        fee: 199,
        durationDays: 30,
      };
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      const endpoint = isRenewal
        ? `/api/offers/${offerId}/renew-priority`
        : `/api/offers/${offerId}/purchase-priority`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to process priority listing");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: isRenewal ? "Priority Listing Renewed!" : "Priority Listing Activated!",
        description: `Your offer "${offerTitle}" is now featured until ${new Date(
          data.expiresAt
        ).toLocaleDateString()}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/offers"] });
      queryClient.invalidateQueries({ queryKey: [`/api/offers/${offerId}`] });
      onClose();
    },
    onError: (error: Error) => {
      setErrorDialog({
        open: true,
        title: "Priority Listing Error",
        description: "We couldn't process your priority listing request at this time. Please try again later.",
        errorDetails: error.message || "Failed to process priority listing",
      });
    },
  });

  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
      await purchaseMutation.mutateAsync();
    } finally {
      setIsProcessing(false);
    }
  };

  const benefits = [
    { icon: TrendingUp, text: "Featured above standard listings" },
    { icon: Crown, text: "Priority badge displayed" },
    { icon: Star, text: "Increased visibility to creators" },
    { icon: Sparkles, text: "Shown in priority section" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-600" />
            {isRenewal ? "Renew Priority Listing" : "Make This a Priority Listing"}
          </DialogTitle>
          <DialogDescription>
            Boost your offer's visibility and attract more creators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Pricing Card */}
          <div className="rounded-lg border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 p-6">
            <div className="text-center mb-4">
              <div className="text-4xl font-bold text-yellow-700 dark:text-yellow-400">
                CA${settings?.fee || 199}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                for {settings?.durationDays || 30} days
              </div>
            </div>

            <Badge
              variant="outline"
              className="w-full justify-center py-2 border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
            >
              Limited Time Offer
            </Badge>
          </div>

          {/* Benefits List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">What you'll get:</h4>
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="rounded-full bg-green-500/10 p-1.5">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex items-center gap-2">
                  <benefit.icon className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">{benefit.text}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Offer Info */}
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Offer to be featured:
            </div>
            <div className="font-semibold">{offerTitle}</div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={isProcessing}
            className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
          >
            {isProcessing ? (
              "Processing..."
            ) : (
              <>
                <Crown className="h-4 w-4 mr-2" />
                {isRenewal
                  ? `Renew for CA$${settings?.fee || 199}`
                  : `Purchase for CA$${settings?.fee || 199}`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Generic Error Dialog */}
      <GenericErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        errorDetails={errorDialog.errorDetails}
        variant="error"
      />
    </Dialog>
  );
}
