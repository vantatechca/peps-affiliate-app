import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { X, Cookie, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { useAuth } from "../hooks/useAuth";

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "cookie-consent";
const COOKIE_PREFERENCES_KEY = "cookie-preferences";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true, // Always true
    analytics: false,
    marketing: false,
  });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Check if user has already made a choice
    const consentGiven = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentGiven) {
      // Small delay to avoid showing banner immediately on page load
      setTimeout(() => setShowBanner(true), 1000);
    } else {
      // Load saved preferences
      const savedPreferences = localStorage.getItem(COOKIE_PREFERENCES_KEY);
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error("Failed to parse cookie preferences:", error);
        }
      }
    }
  }, []);

  const savePreferences = async (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(prefs));
    setPreferences(prefs);
    setShowBanner(false);
    setShowSettings(false);

    // Save to backend if user is authenticated (for GDPR compliance)
    if (isAuthenticated) {
      try {
        await fetch("/api/user/cookie-consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
      } catch (error) {
        console.error("Failed to save cookie consent to server:", error);
      }
    }

    // Apply preferences (in a real app, this would configure analytics/marketing tools)
    if (prefs.analytics) {
      // Enable Google Analytics, etc.
    }
    if (prefs.marketing) {
      // Enable marketing pixels, etc.
    }
  };

  const acceptAll = () => {
    savePreferences({
      essential: true,
      analytics: true,
      marketing: true,
    });
  };

  const acceptEssential = () => {
    savePreferences({
      essential: true,
      analytics: false,
      marketing: false,
    });
  };

  const saveCustomPreferences = () => {
    savePreferences(preferences);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <>
      {/* Mobile: Bottom banner */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 p-3">
        <Card className="w-full border shadow-lg bg-background rounded-xl">
          <CardContent className="p-3">
            {/* Header with icon and close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">🍪</span>
                <h3 className="font-semibold text-sm">Cookies & Privacy</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowBanner(false)}
                className="h-6 w-6 rounded-full -mr-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground my-2">
              We use cookies to improve your experience, analyze traffic, and personalize content.
            </p>

            {/* Buttons - 2 column */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={acceptAll} className="h-9 text-xs">
                Accept All
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                className="h-9 text-xs"
              >
                Manage
              </Button>
            </div>

            {/* Footer links */}
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Read our{" "}
              <a href="/privacy-policy" className="underline hover:text-primary">
                Privacy Policy
              </a>{" "}
              and{" "}
              <a href="/cookie-policy" className="underline hover:text-primary">
                Cookies
              </a>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Desktop: Bottom banner */}
      <div className="hidden sm:block fixed bottom-0 left-0 right-0 z-50 p-6">
        <Card className="max-w-4xl mx-auto border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">We value your privacy</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We use cookies to enhance your browsing experience, serve personalized
                      content, and analyze our traffic. By clicking "Accept All", you consent
                      to our use of cookies.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowBanner(false)}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button onClick={acceptAll} className="flex-1 sm:flex-none">
                    Accept All
                  </Button>
                  <Button
                    onClick={acceptEssential}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    Essential Only
                  </Button>
                  <Button
                    onClick={() => setShowSettings(true)}
                    variant="outline"
                    className="flex-1 sm:flex-none"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Read our{" "}
                  <a href="/privacy-policy" className="underline hover:text-primary">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="/cookie-policy" className="underline hover:text-primary">
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
            <DialogDescription>
              Manage your cookie preferences. Essential cookies are required for the site
              to function and cannot be disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="essential"
                  checked={true}
                  disabled
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="essential" className="font-semibold cursor-not-allowed">
                    Essential Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Required for the website to function properly. These cookies enable
                    core functionality such as security, authentication, and accessibility.
                    Cannot be disabled.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, analytics: checked as boolean }))
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="analytics" className="font-semibold cursor-pointer">
                    Analytics Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors interact with our website by
                    collecting and reporting information anonymously. This helps us improve
                    our services.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, marketing: checked as boolean }))
                  }
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="marketing" className="font-semibold cursor-pointer">
                    Marketing Cookies
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Used to track visitors across websites to display relevant
                    advertisements and measure the effectiveness of advertising campaigns.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={saveCustomPreferences} className="flex-1">
              Save Preferences
            </Button>
            <Button onClick={acceptAll} variant="outline" className="flex-1">
              Accept All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
