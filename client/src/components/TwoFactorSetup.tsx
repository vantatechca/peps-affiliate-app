import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Shield, ShieldCheck, ShieldOff, Copy, Download, RefreshCw, Eye, EyeOff, Smartphone, Key } from "lucide-react";

interface TwoFactorStatus {
  enabled: boolean;
  hasBackupCodes: boolean;
}

interface SetupResponse {
  secret: string;
  qrCode: string;
  message: string;
}

interface EnableResponse {
  success: boolean;
  message: string;
  backupCodes: string[];
}

export function TwoFactorSetup() {
  const { toast } = useToast();

  // UI state
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showBackupCodesDialog, setShowBackupCodesDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);

  // Setup state
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showSecret, setShowSecret] = useState(false);

  // Disable state
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableMethod, setDisableMethod] = useState<"password" | "code">("password");

  // Regenerate state
  const [regenerateCode, setRegenerateCode] = useState("");

  // Fetch 2FA status
  const { data: twoFactorStatus, isLoading } = useQuery<TwoFactorStatus>({
    queryKey: ["/api/auth/2fa/status"],
  });

  // Start 2FA setup mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to setup 2FA");
      }
      return response.json();
    },
    onSuccess: (data: SetupResponse) => {
      setSetupData(data);
      setShowSetupDialog(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to enable 2FA");
      }
      return response.json();
    },
    onSuccess: (data: EnableResponse) => {
      setBackupCodes(data.backupCodes);
      setShowSetupDialog(false);
      setShowBackupCodesDialog(true);
      setVerificationCode("");
      setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: async ({ password, code }: { password?: string; code?: string }) => {
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password, code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to disable 2FA");
      }
      return response.json();
    },
    onSuccess: () => {
      setShowDisableDialog(false);
      setDisablePassword("");
      setDisableCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/2fa/status"] });
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Regenerate backup codes mutation
  const regenerateMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/auth/2fa/backup-codes/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to regenerate backup codes");
      }
      return response.json();
    },
    onSuccess: (data: { backupCodes: string[] }) => {
      setBackupCodes(data.backupCodes);
      setShowRegenerateDialog(false);
      setShowBackupCodesDialog(true);
      setRegenerateCode("");
      toast({
        title: "Backup Codes Regenerated",
        description: "Your old backup codes are no longer valid.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const downloadBackupCodes = () => {
    const content = `AffiliateXchange Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes safely. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join("\n")}

If you lose access to your authenticator app, use one of these codes to sign in.
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affiliatexchange-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEnableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 6) {
      enableMutation.mutate(verificationCode);
    }
  };

  const handleDisableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disableMethod === "password" && disablePassword) {
      disableMutation.mutate({ password: disablePassword });
    } else if (disableMethod === "code" && disableCode) {
      disableMutation.mutate({ code: disableCode });
    }
  };

  const handleRegenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (regenerateCode.length === 6) {
      regenerateMutation.mutate(regenerateCode);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {twoFactorStatus?.enabled ? (
              <ShieldCheck className="h-5 w-5 text-green-500" />
            ) : (
              <Shield className="h-5 w-5" />
            )}
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {twoFactorStatus?.enabled ? (
            <>
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200">2FA is enabled</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Your account is protected with two-factor authentication.
                </AlertDescription>
              </Alert>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowRegenerateDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Key className="h-4 w-4" />
                  Regenerate Backup Codes
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowDisableDialog(true)}
                  className="flex items-center gap-2"
                >
                  <ShieldOff className="h-4 w-4" />
                  Disable 2FA
                </Button>
              </div>
            </>
          ) : (
            <>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Protect your account</AlertTitle>
                <AlertDescription>
                  Two-factor authentication adds an extra layer of security by requiring a code from your authenticator app when signing in.
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => setupMutation.mutate()}
                disabled={setupMutation.isPending}
                className="flex items-center gap-2"
              >
                <Smartphone className="h-4 w-4" />
                {setupMutation.isPending ? "Setting up..." : "Enable Two-Factor Authentication"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
            </DialogDescription>
          </DialogHeader>

          {setupData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={setupData.qrCode}
                  alt="QR Code for 2FA setup"
                  className="border rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Can't scan? Enter this code manually:
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-muted rounded text-sm font-mono break-all">
                    {showSecret ? setupData.secret : "••••••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowSecret(!showSecret)}
                  >
                    {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(setupData.secret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <form onSubmit={handleEnableSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verification-code">Enter the 6-digit code from your app</Label>
                  <Input
                    id="verification-code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    autoComplete="one-time-code"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowSetupDialog(false);
                      setSetupData(null);
                      setVerificationCode("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={verificationCode.length !== 6 || enableMutation.isPending}
                  >
                    {enableMutation.isPending ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Backup Codes Dialog */}
      <Dialog open={showBackupCodesDialog} onOpenChange={setShowBackupCodesDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Save Your Backup Codes
            </DialogTitle>
            <DialogDescription>
              Store these codes in a safe place. You can use them to sign in if you lose access to your authenticator app.
            </DialogDescription>
          </DialogHeader>

          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
            <AlertTitle className="text-amber-800 dark:text-amber-200">Important</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Each code can only be used once. Keep them somewhere secure.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-muted-foreground">{index + 1}.</span>
                <span>{code}</span>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => copyToClipboard(backupCodes.join("\n"))}
              className="flex items-center gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy All
            </Button>
            <Button
              variant="outline"
              onClick={downloadBackupCodes}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button onClick={() => setShowBackupCodesDialog(false)}>
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extra security from your account. You'll only need your password to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleDisableSubmit} className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={disableMethod === "password" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisableMethod("password")}
              >
                Use Password
              </Button>
              <Button
                type="button"
                variant={disableMethod === "code" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisableMethod("code")}
              >
                Use 2FA Code
              </Button>
            </div>

            {disableMethod === "password" ? (
              <div className="space-y-2">
                <Label htmlFor="disable-password">Enter your password</Label>
                <Input
                  id="disable-password"
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Your password"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="disable-code">Enter 2FA code from your app</Label>
                <Input
                  id="disable-code"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="text-center text-xl tracking-widest font-mono"
                  maxLength={6}
                />
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDisablePassword("");
                setDisableCode("");
              }}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={
                  disableMutation.isPending ||
                  (disableMethod === "password" && !disablePassword) ||
                  (disableMethod === "code" && disableCode.length !== 6)
                }
              >
                {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              This will invalidate all your existing backup codes and generate new ones.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegenerateSubmit} className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <AlertTitle className="text-amber-800 dark:text-amber-200">Warning</AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                Your old backup codes will no longer work after regeneration.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="regenerate-code">Enter 2FA code from your app to confirm</Label>
              <Input
                id="regenerate-code"
                value={regenerateCode}
                onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="text-center text-2xl tracking-widest font-mono"
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowRegenerateDialog(false);
                  setRegenerateCode("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={regenerateCode.length !== 6 || regenerateMutation.isPending}
              >
                {regenerateMutation.isPending ? "Regenerating..." : "Regenerate Codes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
