import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { useToast } from "../hooks/use-toast";
import { Zap, User, Building2 } from "lucide-react";
import { GenericErrorDialog } from "../components/GenericErrorDialog";

export default function SelectRole() {
  const [selectedRole, setSelectedRole] = useState<"creator" | "company">("creator");
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
        body: JSON.stringify({ role: selectedRole }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to complete registration");
      }

      const result = await response.json();

      toast({
        title: "Welcome!",
        description: "Your account has been created successfully.",
      });

      // Redirect based on role
      setTimeout(() => {
        if (result.role === "creator") {
          window.location.href = "/browse";
        } else if (result.role === "company") {
          window.location.href = "/company/dashboard";
        } else {
          window.location.href = "/";
        }
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold">AffiliateXchange</span>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>Choose Your Account Type</CardTitle>
            <CardDescription>
              Select how you'll be using AffiliateXchange
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as "creator" | "company")}
              className="grid gap-4"
            >
              <div>
                <RadioGroupItem
                  value="creator"
                  id="creator"
                  className="peer sr-only"
                />
                <label
                  htmlFor="creator"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  data-testid="role-creator"
                >
                  <User className="h-12 w-12 mb-3" />
                  <div className="text-center">
                    <div className="font-semibold text-lg">Creator</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Browse offers and earn through affiliate marketing
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <RadioGroupItem
                  value="company"
                  id="company"
                  className="peer sr-only"
                />
                <label
                  htmlFor="company"
                  className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-6 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                  data-testid="role-company"
                >
                  <Building2 className="h-12 w-12 mb-3" />
                  <div className="text-center">
                    <div className="font-semibold text-lg">Company</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Post affiliate offers and work with creators
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>

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
