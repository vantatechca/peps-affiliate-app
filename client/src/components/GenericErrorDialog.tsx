import { AlertCircle, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "./ui/alert-dialog";

export interface GenericErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  errorDetails?: string;
  variant?: "error" | "info" | "warning";
  onAction?: () => void;
  actionLabel?: string;
  showAction?: boolean;
}

export function GenericErrorDialog({
  open,
  onOpenChange,
  title = "Notification",
  description = "An issue occurred. Please review the details below.",
  errorDetails,
  variant = "info",
  onAction,
  actionLabel = "Retry",
  showAction = false,
}: GenericErrorDialogProps) {
  const getIcon = () => {
    switch (variant) {
      case "error":
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case "warning":
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      default:
        return <Info className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStyles = () => {
    switch (variant) {
      case "error":
        return {
          titleColor: "text-gray-900",
          descriptionBg: "bg-red-50 border-red-200",
          descriptionText: "text-red-800",
          detailsBg: "bg-red-50 border-red-200",
          detailsTitle: "text-red-900",
          detailsText: "text-red-800",
        };
      case "warning":
        return {
          titleColor: "text-gray-900",
          descriptionBg: "bg-yellow-50 border-yellow-200",
          descriptionText: "text-yellow-800",
          detailsBg: "bg-yellow-50 border-yellow-200",
          detailsTitle: "text-yellow-900",
          detailsText: "text-yellow-800",
        };
      default:
        return {
          titleColor: "text-gray-900",
          descriptionBg: "bg-gray-50 border-gray-200",
          descriptionText: "text-gray-800",
          detailsBg: "bg-blue-50 border-blue-200",
          detailsTitle: "text-blue-900",
          detailsText: "text-blue-800",
        };
    }
  };

  const styles = getStyles();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${styles.titleColor}`}>
            {getIcon()}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-3">
            <div className={`rounded-lg ${styles.descriptionBg} border-2 p-4`}>
              <p className={`${styles.descriptionText} leading-relaxed`}>
                {description}
              </p>
            </div>

            {errorDetails && (
              <div className={`rounded-lg ${styles.detailsBg} border p-3`}>
                <p className={`text-sm font-semibold ${styles.detailsTitle} mb-2`}>
                  Details:
                </p>
                <p className={`text-sm ${styles.detailsText}`}>
                  {errorDetails}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Close</AlertDialogCancel>
          {showAction && onAction && (
            <AlertDialogAction onClick={onAction}>
              {actionLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
