import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Checkbox } from "../components/ui/checkbox";
import { useToast } from "../hooks/use-toast";
import { Eye, EyeOff, Shield, ArrowLeft, Key, Home } from "lucide-react";
import { Link, useSearch } from "wouter";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { motion } from "framer-motion";
import { loginSchema } from "../../../shared/validation";
import logoUrl from "../assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

type LoginForm = z.infer<typeof loginSchema>;

const cardAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stayConnected, setStayConnected] = useState(false);
  const [loginError, setLoginError] = useState("");
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "Error",
    description: "An error occurred",
    errorDetails: "",
  });

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [pending2FAUserId, setPending2FAUserId] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  // Check for 2FA redirect from Google OAuth
  const searchString = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const require2fa = params.get("require2fa");
    const userId = params.get("userId");

    if (require2fa === "true" && userId) {
      setRequires2FA(true);
      setPending2FAUserId(userId);
    }
  }, [searchString]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Login failed");
      }

      const result = await response.json();

      // Check if 2FA is required
      if (result.requiresTwoFactor) {
        setRequires2FA(true);
        setPending2FAUserId(result.userId);
        toast({
          title: "Two-Factor Authentication Required",
          description: "Please enter your authentication code to continue.",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting...",
      });

      // Redirect based on role (company role removed — out of scope)
      setTimeout(() => {
        if (result.role === "admin") {
          window.location.href = "/admin";
        } else {
          // creator or unknown → creator dashboard
          window.location.href = "/";
        }
      }, 1000);
    } catch (error: any) {
      setLoginError("Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pending2FAUserId || !twoFactorCode) return;

    setIsVerifying2FA(true);
    try {
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pending2FAUserId,
          code: twoFactorCode,
          isBackupCode: useBackupCode,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Verification failed");
      }

      const result = await response.json();

      toast({
        title: "Welcome back!",
        description: "Login successful. Redirecting...",
      });

      // Redirect based on role (company role removed — out of scope)
      setTimeout(() => {
        if (result.role === "admin") {
          window.location.href = "/admin";
        } else {
          // creator or unknown → creator dashboard
          window.location.href = "/";
        }
      }, 1000);
    } catch (error: any) {
      setErrorDialog({
        open: true,
        title: "Verification Failed",
        description: "The code you entered is invalid. Please try again.",
        errorDetails: error.message,
      });
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const handleBack = () => {
    setRequires2FA(false);
    setPending2FAUserId(null);
    setTwoFactorCode("");
    setUseBackupCode(false);
    // Clear URL params
    window.history.replaceState({}, "", "/login");
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

  // Render 2FA verification form
  if (requires2FA) {
    return (
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <header className="p-5 sm:p-6">
          <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoUrl} alt="AffiliateXchange Logo" onError={hideOnError} className="h-8 w-8 rounded-md object-cover neon-glow" />
            <span className="text-base sm:text-lg font-bold neon-text mono tracking-wide">AFFEXCH</span>
          </Link>
        </header>

        {/* Main Content */}
        <div className="flex items-center justify-center px-4 py-6 sm:py-10">
          <motion.div {...cardAnimation} className="w-full max-w-md">
            <Card className="bg-panel neon-border neon-glow rounded-lg backdrop-blur-md">
              <CardContent className="pt-7 pb-7 px-6 sm:px-8">
                {/* Back button and title */}
                <div className="flex items-center gap-3 mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h1 className="text-lg sm:text-xl font-black flex items-center gap-2 neon-text mono uppercase tracking-wider">
                      <Shield className="h-5 w-5 text-primary" />
                      Two-Factor Auth
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 mono">
                      {useBackupCode
                        ? "// enter one of your backup codes"
                        : "// enter the 6-digit code from your authenticator"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-6">
                  <div className="space-y-2">
                    <Input
                      value={twoFactorCode}
                      onChange={(e) => {
                        if (useBackupCode) {
                          setTwoFactorCode(e.target.value.toUpperCase().slice(0, 9));
                        } else {
                          setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                        }
                      }}
                      placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                      className="text-center text-2xl tracking-[0.4em] font-mono h-14 bg-panel-2 neon-border text-primary placeholder:text-muted-foreground/40"
                      maxLength={useBackupCode ? 9 : 6}
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-black mono tracking-widest mx-cta"
                    disabled={
                      isVerifying2FA ||
                      (useBackupCode
                        ? twoFactorCode.replace(/-/g, "").length !== 8
                        : twoFactorCode.length !== 6)
                    }
                  >
                    {isVerifying2FA ? "VERIFYING..." : "VERIFY"}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setUseBackupCode(!useBackupCode);
                        setTwoFactorCode("");
                      }}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      {useBackupCode ? (
                        <>
                          <Shield className="h-4 w-4 mr-1" />
                          Use authenticator app instead
                        </>
                      ) : (
                        <>
                          <Key className="h-4 w-4 mr-1" />
                          Use a backup code instead
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Generic Error Dialog */}
        <GenericErrorDialog
          open={errorDialog.open}
          onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
          title={errorDialog.title}
          description={errorDialog.description}
          errorDetails={errorDialog.errorDetails}
          variant="error"
        />
      </div>
    );
  }

  // Regular login form
  return (
    <div className="relative z-10 min-h-screen">
      {/* Header */}
      <header className="p-5 sm:p-6">
        <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logoUrl} alt="AffiliateXchange Logo" onError={hideOnError} className="h-8 w-8 rounded-md object-cover neon-glow" />
          <span className="text-base sm:text-lg font-bold neon-text mono tracking-wide">AFFEXCH</span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex items-center justify-center px-4 py-6 sm:py-10">
        <motion.div {...cardAnimation} className="w-full max-w-md">
          <Card className="relative bg-panel neon-border neon-glow rounded-lg backdrop-blur-md overflow-hidden">
            {/* animated running border */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                padding: 1,
                background: "linear-gradient(90deg,transparent,rgba(0,255,231,0.55),transparent)",
                backgroundSize: "200% 100%",
                animation: "mx-borderRun 3.5s linear infinite",
                WebkitMask: "linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                borderRadius: "inherit",
              }}
            />
            <CardContent className="pt-9 pb-8 px-6 sm:px-8 relative">
              {/* Logo and Title */}
              <div className="text-center mb-7">
                <div className="flex justify-center mb-4">
                  <img
                    src={logoUrl}
                    alt="AffiliateXchange Logo"
                    onError={hideOnError}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover neon-glow-strong"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-black mono tracking-wider neon-strong uppercase">
                  Welcome_Back
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 mono">
                  // sign in to your account to continue
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">
                          // Email
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="enter.email.address"
                            {...field}
                            data-testid="input-email"
                            className="h-12 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                            autoComplete="email"
                            inputMode="email"
                            onChange={(e) => {
                              field.onChange(e);
                              setLoginError("");
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">
                          // Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              {...field}
                              data-testid="input-password"
                              className="h-12 pr-10 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                              autoComplete="current-password"
                              onChange={(e) => {
                                field.onChange(e);
                                setLoginError("");
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              data-testid="toggle-password-visibility"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Inline error message */}
                  {loginError && (
                    <p className="text-sm text-destructive font-bold mono tracking-wide">
                      ✕ {loginError}
                    </p>
                  )}

                  {/* Stay connected and Forgot password row */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="stay-connected"
                        checked={stayConnected}
                        onCheckedChange={(checked) => setStayConnected(checked as boolean)}
                        className="neon-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <label
                        htmlFor="stay-connected"
                        className="text-xs text-muted-foreground cursor-pointer mono tracking-wide"
                      >
                        Stay connected
                      </label>
                    </div>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-primary hover:underline font-bold mono tracking-wide"
                    >
                      Forgot your password?
                    </Link>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-black mt-2 mono tracking-widest mx-cta"
                    disabled={isLoading}
                    data-testid="button-login"
                  >
                    {isLoading ? "AUTHENTICATING..." : "LOG IN"}
                  </Button>
                </form>
              </Form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[0.65rem] uppercase">
                  <span className="bg-panel px-3 text-muted-foreground mono tracking-widest">
                    // or continue with
                  </span>
                </div>
              </div>

              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-sm font-bold mono tracking-wide neon-border bg-panel-2 hover:bg-primary/10 hover:border-primary"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                data-testid="button-google-login"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </Button>

              {/* Sign up link */}
              <p className="text-center text-xs text-muted-foreground mt-6 mono tracking-wide">
                // no account yet?{" "}
                <Link
                  href="/register"
                  className="neon-text hover:underline font-bold"
                  data-testid="link-register"
                >
                  Create_one_free
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Generic Error Dialog */}
      <GenericErrorDialog
        open={errorDialog.open}
        onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}
        title={errorDialog.title}
        description={errorDialog.description}
        errorDetails={errorDialog.errorDetails}
        variant="error"
      />
    </div>
  );
}
