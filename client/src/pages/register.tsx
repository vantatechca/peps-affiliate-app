import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { CityCombobox } from "../components/CityCombobox";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../components/ui/form";
import { Input } from "../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { useToast } from "../hooks/use-toast";
import { Check, X, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { GenericErrorDialog } from "../components/GenericErrorDialog";
import { motion } from "framer-motion";
import { registrationSchema, validatePasswordComplexity } from "../../../shared/validation";
import logoUrl from "../assets/logo.png";

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  e.currentTarget.style.display = "none";
};

type RegisterForm = z.infer<typeof registrationSchema>;

const cardAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

export default function Register() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [errorDialog, setErrorDialog] = useState({
    open: false,
    title: "Error",
    description: "An error occurred",
    errorDetails: "",
  });

  const [passwordValue, setPasswordValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const passwordRequirements = validatePasswordComplexity(passwordValue);

  // Optional city at signup — powers "merchants near you". Can be changed later.
  const [city, setCity] = useState<string | null>(null);
  const { data: cities = [] } = useQuery<string[]>({ queryKey: ["/api/public/merchant-cities"] });

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      role: "creator",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: data.username,
          email: data.email,
          password: data.password,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          acceptTerms: data.acceptTerms,
          city: city ?? undefined,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Registration failed");
      }

      toast({
        title: "Success!",
        description: "Account created successfully. Redirecting...",
      });

      // Phase 9: onboarding wizards removed (collected payment-method info that
      // no longer exists). Drop straight to the role's dashboard.
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    } catch (error: any) {
      setErrorDialog({
        open: true,
        title: "Registration Failed",
        description: "We couldn't create your account. Please check your information and try again.",
        errorDetails: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    // Redirect to Google OAuth endpoint
    window.location.href = "/api/auth/google";
  };

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
      <div className="flex items-center justify-center px-4 py-4 sm:py-8">
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
            <CardContent className="pt-8 pb-8 px-6 sm:px-8 relative">
              {/* Logo and Title */}
              <div className="text-center mb-6">
                <div className="flex justify-center mb-4">
                  <img
                    src={logoUrl}
                    alt="AffiliateXchange Logo"
                    onError={hideOnError}
                    className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover neon-glow-strong"
                  />
                </div>
                <h1 className="text-xl sm:text-2xl font-black mono tracking-wider neon-strong uppercase">
                  Initialize_Account
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 mono">
                  // join the marketplace and start earning
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Role Selection */}
                  <FormField
                    control={form.control}
                    name="role"
                    render={() => (
                      // AFFEXCH peptide pivot: only one user-facing role exists now
                      // (affiliate, stored in DB as `creator`). The role selector
                      // is removed from the UI; the default in useForm() above
                      // ensures the submitted payload still carries role="creator".
                      <FormItem className="hidden">
                        <FormControl>
                          <input type="hidden" value="creator" readOnly />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* Username */}
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder=""
                            {...field}
                            data-testid="input-username"
                            className="h-11 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder=""
                            {...field}
                            data-testid="input-email"
                            className="h-11 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* First Name and Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// First Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder=""
                              {...field}
                              data-testid="input-firstname"
                              className="h-11 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// Last Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder=""
                              {...field}
                              data-testid="input-lastname"
                              className="h-11 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* City (optional) */}
                  <div className="space-y-2">
                    <label className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// City</label>
                    <div>
                      <CityCombobox
                        cities={cities}
                        value={city}
                        onChange={setCity}
                        placeholder="Select your city (optional)"
                        className="w-full"
                      />
                      <p className="text-[0.65rem] text-muted-foreground/60 mono mt-1">
                        Shows peptide merchants near you. You can change this later.
                      </p>
                    </div>
                  </div>

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder=""
                              {...field}
                              data-testid="input-password"
                              className="h-11 pr-10 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                              onChange={(e) => {
                                field.onChange(e);
                                setPasswordValue(e.target.value);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        {passwordValue && (
                          <div className="mt-3 space-y-1 text-xs mono">
                            <p className="text-muted-foreground font-bold tracking-widest uppercase text-[0.65rem]">
                              // password requirements
                            </p>
                            {[
                              { label: "min 8 characters", met: passwordValue.length >= 8 },
                              { label: "one uppercase letter", met: /[A-Z]/.test(passwordValue) },
                              { label: "one lowercase letter", met: /[a-z]/.test(passwordValue) },
                              { label: "one number", met: /[0-9]/.test(passwordValue) },
                              { label: "one special char (!@#$%^&*...)", met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(passwordValue) },
                            ].map((req) => (
                              <div key={req.label} className="flex items-center gap-2">
                                {req.met ? (
                                  <Check className="h-3 w-3 text-primary" />
                                ) : (
                                  <X className="h-3 w-3 text-muted-foreground" />
                                )}
                                <span className={req.met ? "neon-text" : "text-muted-foreground"}>
                                  {req.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[0.7rem] font-bold mono tracking-widest uppercase text-muted-foreground">// Confirm Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder=""
                              {...field}
                              data-testid="input-confirm-password"
                              className="h-11 pr-10 bg-panel-2 neon-border text-foreground mono placeholder:text-muted-foreground/40 focus-visible:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showConfirmPassword ? (
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

                  {/* Terms and Conditions */}
                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-accept-terms"
                            className="neon-border data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground mt-0.5"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-snug">
                          <FormLabel className="text-xs font-normal text-muted-foreground mono leading-relaxed">
                            // I agree to the{" "}
                            <Link
                              href="/terms-of-service"
                              className="neon-text hover:underline font-bold"
                            >
                              Terms of Service
                            </Link>
                            {" "}and{" "}
                            <Link
                              href="/privacy-policy"
                              className="neon-text hover:underline font-bold"
                            >
                              Privacy Policy
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-sm font-black mono tracking-widest mx-cta"
                    disabled={isLoading}
                    data-testid="button-register"
                  >
                    {isLoading ? "CREATING_ACCOUNT..." : "CREATE_ACCOUNT"}
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

              {/* Google Signup */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-sm font-bold mono tracking-wide neon-border bg-panel-2 hover:bg-primary/10 hover:border-primary"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                data-testid="button-google-signup"
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

              {/* Sign in link */}
              <p className="text-center text-xs text-muted-foreground mt-6 mono tracking-wide">
                // already registered?{" "}
                <Link
                  href="/login"
                  className="neon-text hover:underline font-bold"
                  data-testid="link-login"
                >
                  Sign_in
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
