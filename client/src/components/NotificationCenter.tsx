import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  Trash2,
  X,
  MessageSquare,
  DollarSign,
  Star,
  FileText,
  AlertTriangle,
  Building2,
  Video,
  RefreshCw
} from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { useToast } from "../hooks/use-toast";
import { ToastAction } from "./ui/toast";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
  metadata?: {
    companyName?: string;
    companyUserId?: string;
    offerId?: string;
    offerTitle?: string;
    [key: string]: any;
  };
}

async function fetchNotifications(): Promise<Notification[]> {
  const response = await fetch("/api/notifications", {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch notifications");
  return response.json();
}

async function fetchUnreadCount(): Promise<number> {
  const response = await fetch("/api/notifications/unread/count", {
    credentials: "include",
  });
  if (!response.ok) return 0;
  const data = await response.json();
  return data.count;
}

async function markAsRead(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}/read`, {
    method: "POST",
    credentials: "include",
  });
}

async function markAllAsRead(): Promise<void> {
  await fetch("/api/notifications/read-all", {
    method: "POST",
    credentials: "include",
  });
}

async function deleteNotification(id: string): Promise<void> {
  await fetch(`/api/notifications/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}

async function clearAllNotifications(): Promise<void> {
  await fetch("/api/notifications", {
    method: "DELETE",
    credentials: "include",
  });
}

export function NotificationCenter() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousNotificationIds = useRef<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: fetchNotifications,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread/count"],
    queryFn: fetchUnreadCount,
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Show toast for new company registration notifications
  useEffect(() => {
    if (isLoading || notifications.length === 0) return;

    // Detect new notifications
    const newNotifications = notifications.filter(
      (notif) => !previousNotificationIds.current.has(notif.id)
    );

    // Update the reference with current notification IDs
    previousNotificationIds.current = new Set(notifications.map((n) => n.id));

    // Show toast only for new company registration notifications that need review
    newNotifications.forEach((notification) => {
      const isNewCompanyRegistration =
        notification.type === "new_application" &&
        notification.metadata?.companyName &&
        notification.metadata?.companyUserId &&
        !notification.metadata?.offerId; // Ensure it's not an offer submission

      // Only show toast if notification is unread (needs review)
      if (isNewCompanyRegistration && notification.linkUrl && !notification.isRead) {
        toast({
          title: notification.title ?? "New Company Registration",
          description: notification.message,
          action: (
            <ToastAction
              altText="Review Company"
              onClick={() => {
                // Mark notification as read
                markAsRead(notification.id).catch(() => {
                  // Silently fail - the notification will still be marked as read when viewed
                });

                // Navigate to company details
                setLocation(notification.linkUrl!);
              }}
            >
              Review
            </ToastAction>
          ),
        });
      }
    });
  }, [notifications, isLoading, toast, setLocation]);

  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: clearAllNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread/count"] });
    },
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Close the dropdown
    setIsOpen(false);

    // If notification has a linkUrl, navigate directly to it
    if (notification.linkUrl) {
      // If it's an absolute external URL, navigate the browser there.
      if (/^https?:\/\//.test(notification.linkUrl)) {
        window.location.href = notification.linkUrl;
      } else {
        setLocation(notification.linkUrl);
      }
      return;
    }

    // Fall back to notification detail page if no linkUrl is provided
    if (notification.id) {
      setLocation(`/notifications/${notification.id}`);
    }
  };

  const getNotificationIcon = (notification: Notification) => {
    const iconProps = { className: "h-5 w-5" };
    const type = notification.type;

    // Check if this is a company registration notification
    const isCompanyRegistration =
      type === "new_application" &&
      notification.metadata?.companyName &&
      notification.metadata?.companyUserId &&
      !notification.metadata?.offerId;

    if (isCompanyRegistration) {
      return <Building2 {...iconProps} className="h-5 w-5 text-blue-600" />;
    }

    switch (type) {
      case "new_message":
        return <MessageSquare {...iconProps} />;
      case "application_status_change":
      case "offer_approved":
      case "registration_approved":
        return <Check {...iconProps} className="h-5 w-5 text-green-600" />;
      case "payment_received":
      case "payment_approved":
        return <DollarSign {...iconProps} className="h-5 w-5 text-green-600" />;
      case "payment_pending":
        return <DollarSign {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case "payment_failed_insufficient_funds":
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-orange-600" />;
      case "new_application":
        return <FileText {...iconProps} />;
      case "review_received":
        return <Star {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case "system_announcement":
        return <Bell {...iconProps} className="h-5 w-5 text-blue-600" />;
      case "offer_rejected":
      case "registration_rejected":
        return <X {...iconProps} className="h-5 w-5 text-red-600" />;
      case "work_completion_approval":
        return <Check {...iconProps} className="h-5 w-5 text-green-600" />;
      case "priority_listing_expiring":
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-yellow-600" />;
      case "deliverable_submitted":
        return <Video {...iconProps} className="h-5 w-5 text-blue-600" />;
      case "deliverable_resubmitted":
        return <RefreshCw {...iconProps} className="h-5 w-5 text-purple-600" />;
      case "revision_requested":
        return <AlertTriangle {...iconProps} className="h-5 w-5 text-orange-600" />;
      case "deliverable_rejected":
        return <X {...iconProps} className="h-5 w-5 text-red-600" />;
      default:
        return <Bell {...iconProps} />;
    }
  };

  const unreadNotifications = notifications.filter((n) => !n.isRead);
  const hasUnread = unreadNotifications.length > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-7 w-7 sm:h-8 sm:w-8" data-testid="button-notifications">
          <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-3.5 w-3.5 sm:h-4 sm:w-4 flex items-center justify-center p-0 text-[8px] sm:text-[9px]"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] sm:w-96 max-w-96">
        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
          <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
          <div className="flex gap-1 sm:gap-2">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAllAsReadMutation.mutate()}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                data-testid="button-mark-all-read"
              >
                <Check className="h-3 w-3 sm:mr-1" />
                <span className="hidden xs:inline">Mark all read</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearAllMutation.mutate()}
                className="h-7 sm:h-8 text-[10px] sm:text-xs px-2 sm:px-3"
                data-testid="button-clear-all"
              >
                <Trash2 className="h-3 w-3 sm:mr-1" />
                <span className="hidden xs:inline">Clear all</span>
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="h-[300px] sm:h-[400px]">
          {isLoading ? (
            <div className="p-6 sm:p-8 text-center text-muted-foreground text-xs sm:text-sm">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-muted-foreground">
              <Bell className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 opacity-20" />
              <p className="text-xs sm:text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b last:border-0 transition-colors ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-950/20" : ""
                }`}
              >
                <div className="p-3 sm:p-4 hover:bg-accent/50 cursor-pointer group relative">
                  <div
                    onClick={() => handleNotificationClick(notification)}
                    className="pr-7 sm:pr-8"
                    data-testid="notification-item"
                  >
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                          <h4 className="font-medium text-xs sm:text-sm">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 sm:top-4 right-3 sm:right-4 h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotificationMutation.mutate(notification.id);
                    }}
                    data-testid="button-delete-notification"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
