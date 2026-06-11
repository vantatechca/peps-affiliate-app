import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

// Platform icons for display
const platformIcons: Record<string, JSX.Element> = {
  youtube: (
    <svg className="h-8 w-8 text-red-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  tiktok: (
    <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  instagram: (
    <svg className="h-8 w-8 text-pink-600" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
};

const platformNames: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
};

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [platform, setPlatform] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [followers, setFollowers] = useState<string | null>(null);

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");
    const platformParam = params.get("platform");
    const usernameParam = params.get("username");
    const followersParam = params.get("followers");

    setPlatform(platformParam);
    setUsername(usernameParam);
    setFollowers(followersParam);

    if (success === "true" && platformParam) {
      setStatus("success");
      setMessage(
        `Successfully connected your ${platformNames[platformParam] || platformParam} account!`
      );

      // Send message to parent window (opener)
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "OAUTH_SUCCESS",
            platform: platformParam,
            username: usernameParam,
            followers: followersParam ? parseInt(followersParam, 10) : null,
          },
          window.location.origin
        );

        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        // If opened directly (not in popup), redirect to profile management
        setTimeout(() => {
          setLocation("/profile-management");
        }, 2000);
      }
    } else if (error) {
      setStatus("error");
      setMessage(decodeURIComponent(error));

      // Send error message to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "OAUTH_ERROR",
            platform: platformParam,
            error: decodeURIComponent(error),
          },
          window.location.origin
        );

        // Close popup after a short delay
        setTimeout(() => {
          window.close();
        }, 3000);
      } else {
        // If opened directly, redirect to profile management
        setTimeout(() => {
          setLocation("/profile-management");
        }, 3000);
      }
    } else {
      // Still loading or unknown state
      setTimeout(() => {
        if (status === "loading") {
          setStatus("error");
          setMessage("Connection timed out. Please try again.");
        }
      }, 10000);
    }
  }, [setLocation, status]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Platform Icon */}
            {platform && platformIcons[platform] && (
              <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                {platformIcons[platform]}
              </div>
            )}

            {/* Status Icon */}
            {status === "loading" && (
              <>
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <h2 className="text-xl font-semibold">Connecting your account...</h2>
                <p className="text-muted-foreground">
                  Please wait while we complete the connection.
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-green-600">Connected!</h2>
                <p className="text-muted-foreground">{message}</p>
                {username && (
                  <p className="text-sm text-muted-foreground">
                    Connected as <span className="font-medium">@{username}</span>
                    {followers && ` with ${parseInt(followers, 10).toLocaleString()} followers`}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-4">
                  This window will close automatically...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600">Connection Failed</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-xs text-muted-foreground mt-4">
                  This window will close automatically...
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
