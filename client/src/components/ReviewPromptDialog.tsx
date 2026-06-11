import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { useLocation } from "wouter";
import { Star } from "lucide-react";

interface ReviewPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
  applicationId: string;
}

export function ReviewPromptDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  applicationId,
}: ReviewPromptDialogProps) {
  const [, setLocation] = useLocation();
  const [remindLater, setRemindLater] = useState(false);

  const handleWriteReview = () => {
    // Navigate to review form with pre-filled data
    setLocation(`/review?companyId=${companyId}&applicationId=${applicationId}`);
    onOpenChange(false);
  };

  const handleRemindLater = () => {
    // Store in localStorage to remind later
    const reminders = JSON.parse(localStorage.getItem('reviewReminders') || '[]');
    reminders.push({
      companyId,
      companyName,
      applicationId,
      timestamp: Date.now(),
    });
    localStorage.setItem('reviewReminders', JSON.stringify(reminders));

    setRemindLater(true);
    setTimeout(() => {
      onOpenChange(false);
      setRemindLater(false);
    }, 1500);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star key={star} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            How was your experience?
          </DialogTitle>
          <DialogDescription className="text-center">
            You've completed your first campaign with <strong>{companyName}</strong>!
            <br />
            Your feedback helps other creators make informed decisions.
          </DialogDescription>
        </DialogHeader>

        {remindLater ? (
          <div className="py-6 text-center text-sm text-green-600 dark:text-green-400">
            We'll remind you later to leave a review!
          </div>
        ) : (
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="w-full sm:w-auto order-3 sm:order-1"
            >
              Skip
            </Button>
            <Button
              variant="secondary"
              onClick={handleRemindLater}
              className="w-full sm:w-auto order-2"
            >
              Remind Me Later
            </Button>
            <Button
              onClick={handleWriteReview}
              className="w-full sm:w-auto order-1 sm:order-3"
            >
              Write Review
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
