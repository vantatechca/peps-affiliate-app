import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { format } from "date-fns";
import { TopNavBar } from "../components/TopNavBar";
import { Copy, CheckCircle, ExternalLink } from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { GenericErrorDialog } from "../components/GenericErrorDialog";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

async function fetchNotificationById(id?: string): Promise<Notification | null> {
  if (!id) return null;
  const res = await fetch(`/api/notifications/${encodeURIComponent(id)}`, { credentials: "include" });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch notification");
  }
  return res.json();
}

async function markAsRead(id: string) {
  await fetch(`/api/notifications/${id}/read`, { method: "POST", credentials: "include" });
}

export default function NotificationDetail() {
  const [, params] = useRoute("/notifications/:id");
  const id = params?.id as string | undefined;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: "",
    description: "",
  });

  const { data: notification, isLoading } = useQuery<Notification | null>({
    queryKey: ["/api/notifications", id],
    queryFn: () => fetchNotificationById(id),
    enabled: !!id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => markAsRead(id || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications", id] });
    },
  });

  useEffect(() => {
    if (id && notification && !notification.isRead) {
      markAsReadMutation.mutate();
    }
  }, [id, notification]);

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  if (!notification) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Notification not found</p>
        <div className="mt-4">
          <Link href="/notifications"><Button>Back to notifications</Button></Link>
        </div>
      </div>
    );
  }
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      toast({
        title: "Copied!",
        description: "Tracking link copied to clipboard",
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      setErrorDialog({
        open: true,
        title: "Failed to copy",
        description: "Please copy the link manually",
      });
    }
  };

  const renderBody = (n: Notification) => {
    const meta = n.metadata || {};

    switch (n.type) {
      case "payment_received":
      case "payment_approved":
      case "payment": {
        const amount = meta.amount || meta.total || (n.message.match(/\$\d+[\d,.]*/)?.[0]) || null;
        const grossAmount = meta.grossAmount;
        const platformFee = meta.platformFee;
        const processingFee = meta.processingFee;
        const platformFeePercentage = meta.platformFeePercentage || '4%';
        const processingFeePercentage = meta.processingFeePercentage || '3%';
        const transactionId = meta.transactionId;
        const isApproved = n.type === 'payment_approved';
        const hasBreakdown = grossAmount && platformFee && processingFee;

        return (
          <div className="space-y-4">
            <p className="text-lg">{n.message}</p>

            {/* Net Amount Display */}
            {amount && (
              <div className={`p-6 rounded-lg border-2 ${
                isApproved
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                  : 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
              }`}>
                <p className={`text-sm font-medium mb-2 ${
                  isApproved ? 'text-blue-700 dark:text-blue-300' : 'text-green-700 dark:text-green-300'
                }`}>
                  {n.type === 'payment_received' ? 'Amount You Received' : 'Payment Amount'}
                </p>
                <div className={`text-4xl font-bold ${
                  isApproved ? 'text-blue-900 dark:text-blue-100' : 'text-green-900 dark:text-green-100'
                }`}>
                  {amount}
                </div>
              </div>
            )}

            {/* Payment Breakdown */}
            {hasBreakdown && (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Payment Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Gross Amount</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{grossAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">Platform Fee ({platformFeePercentage})</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-{platformFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-600 dark:text-red-400">Processing Fee ({processingFeePercentage})</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-{processingFee}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 dark:border-gray-700 flex justify-between">
                    <span className="font-bold text-green-700 dark:text-green-300">Net Amount</span>
                    <span className="font-bold text-green-700 dark:text-green-300 text-lg">{amount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fee Explanation */}
            {hasBreakdown && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>How fees work:</strong> Platform fee ({platformFeePercentage}) and processing fee ({processingFeePercentage}) are automatically deducted from gross earnings.{' '}
                  The net amount is what you receive.
                </p>
              </div>
            )}

            {/* Transaction ID */}
            {transactionId && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Transaction ID:</strong> {transactionId}
              </div>
            )}

            {n.linkUrl && (
              <Link href={n.linkUrl}>
                <Button className="w-full">View Full Payment Details</Button>
              </Link>
            )}
          </div>
        );
      }

      case "payment_pending": {
        const amount = meta.amount || (n.message.match(/\$\d+[\d,.]*/)?.[0]) || null;
        const offerTitle = meta.offerTitle;
        const paymentId = meta.paymentId;

        return (
          <div className="space-y-4">
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                ⏳ Payment Awaiting Processing
              </h3>
              <p className="text-yellow-800 dark:text-yellow-200">{n.message}</p>
            </div>

            {/* Payment Amount Display */}
            {amount && (
              <div className="p-6 rounded-lg border-2 bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800">
                <p className="text-sm font-medium mb-2 text-yellow-700 dark:text-yellow-300">
                  Net Payment Amount
                </p>
                <div className="text-4xl font-bold text-yellow-900 dark:text-yellow-100">
                  {amount}
                </div>
                {offerTitle && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                    For offer: <strong>{offerTitle}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Action Required */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Action Required
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                This payment needs to be reviewed and approved before it can be sent to the creator.
                Click below to view the full payment details and process the payment.
              </p>
            </div>

            {/* Payment ID */}
            {paymentId && (
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Payment ID: {paymentId}
              </div>
            )}

            {n.linkUrl && (
              <Link href={n.linkUrl}>
                <Button className="w-full bg-yellow-600 hover:bg-yellow-700">
                  Review & Process Payment
                </Button>
              </Link>
            )}
          </div>
        );
      }

      case "payment_failed_insufficient_funds": {
        const amount = meta.amount || (n.message.match(/\$\d+[\d,.]*/)?.[0]) || null;
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                Payment Processing Failed
              </h3>
              <p className="text-orange-800 dark:text-orange-200">{n.message}</p>
              {amount && (
                <div className="mt-3 text-lg font-bold text-orange-900 dark:text-orange-100">
                  Payment Amount: {amount}
                </div>
              )}
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                What to do next:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-green-800 dark:text-green-200">
                <li>Add funds to your PayPal business account</li>
                <li>Wait a few moments for the funds to become available</li>
                <li>Contact the admin to retry the payment</li>
              </ol>
            </div>
            {n.linkUrl && (
              <Link href={n.linkUrl}>
                <Button className="w-full">View Payment Details</Button>
              </Link>
            )}
          </div>
        );
      }

      case "new_message":
      case "message": {
        // Messages flow removed in the AFFEXCH revision — display message only.
        return (
          <div className="space-y-4">
            <p>{n.message}</p>
            {n.linkUrl && (
              <a href={n.linkUrl} className="text-primary hover:underline">Open</a>
            )}
          </div>
        );
      }

      case "application_status_change":
      case "application": {
        const appId = meta.applicationId || meta.application_id;
        const trackingLink = meta.trackingLink;
        const trackingCode = meta.trackingCode;
        const applicationStatus = meta.applicationStatus;
        const offerTitle = meta.offerTitle;

        return (
          <div className="space-y-4">
            {/* Status Badge */}
            {applicationStatus === 'approved' && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Application Approved! 🎉
                  </h3>
                </div>
                <p className="text-green-800 dark:text-green-200">{n.message}</p>
              </div>
            )}

            {applicationStatus === 'rejected' && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-200">{n.message}</p>
              </div>
            )}

            {!applicationStatus && <p>{n.message}</p>}

            {/* Tracking Link Section - Only show for approved applications */}
            {trackingLink && applicationStatus === 'approved' && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Your Tracking Link
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Use this link to promote {offerTitle && `"${offerTitle}"`} and track your conversions
                  </p>
                </div>

                {/* Tracking Link Display */}
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm text-blue-600 dark:text-blue-400 break-all">
                        {trackingLink}
                      </code>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(trackingLink)}
                      className="flex-shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Tracking Code */}
                {trackingCode && (
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                    Tracking Code: {trackingCode}
                  </div>
                )}

                {/* Quick Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(trackingLink, '_blank')}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test Link
                  </Button>
                </div>
              </div>
            )}

            {/* Application detail / per-offer apply pages were removed in
                the AFFEXCH revision. Show the link URL if present, otherwise
                just the notification body. */}
            {n.linkUrl && (
              <a href={n.linkUrl} className="text-primary hover:underline">Open</a>
            )}
          </div>
        );
      }

      case "offer_approved":
      case "offer_rejected":
      case "offer": {
        // Per-offer detail pages were removed in the AFFEXCH revision —
        // show the message only.
        return (
          <div className="space-y-4">
            <p>{n.message}</p>
            {n.linkUrl && <a href={n.linkUrl} className="text-primary hover:underline">Open</a>}
          </div>
        );
      }

      case "review_received":
      case "review": {
        return (
          <div className="space-y-4">
            <p>{n.message}</p>
            {n.linkUrl && <a href={n.linkUrl} className="text-primary hover:underline">View review</a>}
          </div>
        );
      }

      case "new_application": {
        const companyName = meta.companyName;
        const companyUserId = meta.companyUserId;
        const offerId = meta.offerId;
        const offerTitle = meta.offerTitle;

        // Check if this is a company registration or offer submission
        const isCompanyRegistration = companyName && companyUserId;
        const isOfferSubmission = offerId || offerTitle;

        if (isCompanyRegistration) {
          // New Company Registration
          return (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  🏢 New Company Registration
                </h3>
                <p className="text-blue-800 dark:text-blue-200">{n.message}</p>
                {companyName && (
                  <div className="mt-3 text-lg font-bold text-blue-900 dark:text-blue-100">
                    Company: {companyName}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Action Required
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This company registration is pending approval. Please review the company details,
                  verify their information, and approve or reject their registration.
                </p>
              </div>

              {companyUserId && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Company User ID: {companyUserId}
                </div>
              )}

              {n.linkUrl && (
                <Link href={n.linkUrl}>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Review Company Details
                  </Button>
                </Link>
              )}
            </div>
          );
        } else if (isOfferSubmission) {
          // New Offer Submission
          return (
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  📋 New Offer Pending Review
                </h3>
                <p className="text-purple-800 dark:text-purple-200">{n.message}</p>
                {offerTitle && (
                  <div className="mt-3 text-lg font-bold text-purple-900 dark:text-purple-100">
                    Offer: {offerTitle}
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Action Required
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  This offer is pending review. Please review the offer details and approve or reject it.
                </p>
              </div>

              {offerId && (
                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  Offer ID: {offerId}
                </div>
              )}

              {n.linkUrl && (
                <Link href={n.linkUrl}>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Review Offer
                  </Button>
                </Link>
              )}
            </div>
          );
        } else {
          // Generic new application
          return (
            <div className="space-y-4">
              <p>{n.message}</p>
              {n.linkUrl && (
                <Link href={n.linkUrl}>
                  <Button className="w-full">View Details</Button>
                </Link>
              )}
            </div>
          );
        }
      }

      case "content_flagged": {
        const contentType = meta.contentType || 'content';
        const contentId = meta.contentId;
        const flagId = meta.flagId;
        const flaggedUserId = meta.flaggedUserId;
        const matchedKeywords = meta.matchedKeywords || [];
        const moderationUrl = meta.moderationUrl;
        const reviewStatus = meta.reviewStatus;
        const actionTaken = meta.actionTaken;
        const reason = meta.reason;

        // Check if this is for admin (has flaggedUserId) or for user
        const isAdminNotification = !!flaggedUserId;

        // Determine notification status based on metadata
        const isReviewComplete = reviewStatus && reviewStatus !== 'pending';

        if (isAdminNotification) {
          // Admin notification - content was flagged for review
          return (
            <div className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  ⚠️ Content Flagged for Review
                </h3>
                <p className="text-orange-800 dark:text-orange-200">{n.message}</p>
              </div>

              {/* Content Details */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Flag Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Content Type</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 capitalize">{contentType}</span>
                  </div>
                  {contentId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Content ID</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{contentId}</span>
                    </div>
                  )}
                  {flagId && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Flag ID</span>
                      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{flagId}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Matched Keywords */}
              {matchedKeywords.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    Matched Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {matchedKeywords.map((keyword: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 rounded text-sm"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Required */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Action Required
                </h4>
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Please review this flagged content and take appropriate action. You can view all flagged content
                  in the Content Moderation dashboard.
                </p>
              </div>

              {/* Go to Moderation Dashboard */}
              {moderationUrl && (
                <Link href={moderationUrl}>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Go to Content Moderation
                  </Button>
                </Link>
              )}
            </div>
          );
        } else {
          // User notification - their content was flagged or review is complete
          if (isReviewComplete) {
            // Review completed
            const statusColor = reviewStatus === 'dismissed'
              ? 'green'
              : reviewStatus === 'action_taken'
              ? 'red'
              : 'blue';

            return (
              <div className="space-y-4">
                <div className={`bg-${statusColor}-50 dark:bg-${statusColor}-950/20 border border-${statusColor}-200 dark:border-${statusColor}-800 rounded-lg p-4`}
                  style={{
                    backgroundColor: statusColor === 'green' ? 'rgb(240 253 244)' : statusColor === 'red' ? 'rgb(254 242 242)' : 'rgb(239 246 255)',
                    borderColor: statusColor === 'green' ? 'rgb(187 247 208)' : statusColor === 'red' ? 'rgb(254 202 202)' : 'rgb(191 219 254)',
                  }}
                >
                  <h3 className="font-semibold mb-2"
                    style={{
                      color: statusColor === 'green' ? 'rgb(20 83 45)' : statusColor === 'red' ? 'rgb(127 29 29)' : 'rgb(30 58 138)',
                    }}
                  >
                    {reviewStatus === 'dismissed' ? '✓ No Issues Found' : reviewStatus === 'action_taken' ? '⚠️ Action Taken' : '📋 Review Complete'}
                  </h3>
                  <p style={{
                    color: statusColor === 'green' ? 'rgb(22 101 52)' : statusColor === 'red' ? 'rgb(153 27 27)' : 'rgb(30 64 175)',
                  }}>
                    {n.message}
                  </p>
                </div>

                {/* Action Taken Details */}
                {actionTaken && reviewStatus === 'action_taken' && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                      Action Taken
                    </h4>
                    <p className="text-red-800 dark:text-red-200">{actionTaken}</p>
                  </div>
                )}

                {/* Content Type */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Content Type:</strong> <span className="capitalize">{contentType}</span>
                </div>
              </div>
            );
          } else {
            // Content flagged - pending review
            return (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                    ⏳ Content Under Review
                  </h3>
                  <p className="text-yellow-800 dark:text-yellow-200">{n.message}</p>
                </div>

                {/* Reason */}
                {(reason || matchedKeywords.length > 0) && (
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Reason for Review
                    </h4>
                    <p className="text-gray-700 dark:text-gray-300">
                      {matchedKeywords.length > 0 ? matchedKeywords.join(', ') : reason || 'Potential policy violation'}
                    </p>
                  </div>
                )}

                {/* What happens next */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    What happens next?
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                    <li>Our moderation team will review your content</li>
                    <li>You will be notified once the review is complete</li>
                    <li>If any action is required, we will provide detailed information</li>
                  </ul>
                </div>

                {/* Content Type */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>Content Type:</strong> <span className="capitalize">{contentType}</span>
                </div>
              </div>
            );
          }
        }
      }

      case "system_announcement":
      case "announcement":
      default:
        return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: n.message }} />;
    }
  };

  return (
    <div className="fx-page">
      <TopNavBar />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{notification.title}</h1>
        <div className="text-sm text-muted-foreground">{format(new Date(notification.createdAt), 'PPP p')}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{notification.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {renderBody(notification)}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Link href="/notifications"><Button variant="ghost">Back</Button></Link>
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
