import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../hooks/use-toast";
import { Zap, User } from "lucide-react";
import { GenericErrorDialog } from "../components/GenericErrorDialog";

export default function SelectRole() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; title: string; description: string }>({
    open: false,
    title: "",
    description: "",
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/google/complete-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "creator" }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete registration");
      }

      await response.json();

      toast({
        title: "Welcome!",
        description: "Your affiliate account has been created successfully.",
      });

      setTimeout(() => {
        window.location.href = "/creator/dashboard";
      }, 1000);
    } catch (error: any) {
      setErrorDialog({
        open: true,
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-10 min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">AffiliateXchange</span>
        </div>

        <Card className="bg-panel neon-border neon-glow rounded-lg backdrop-blur-md">
          <CardHeader className="text-center">
            <CardTitle>You're almost in</CardTitle>
            <CardDescription>
              We'll set up your affiliate account so you can start earning.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-between rounded-lg border-2 border-primary bg-primary/5 p-6">
              <User className="h-12 w-12 mb-3 text-primary" />
              <div className="text-center">
                <div className="font-semibold text-lg">Affiliate (Creator)</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Share your promo code, promote peptides, and earn commission.
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={isLoading}
              data-testid="button-continue"
            >
              {isLoading ? "Setting up your account..." : "Continue"}
            </Button>
          </CardContent>
        </Card>
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
