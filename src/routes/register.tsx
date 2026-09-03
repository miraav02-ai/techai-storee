import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Lock, Mail, ArrowRight, Loader2, Laptop, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create Account — LaptopAI Store" },
      {
        name: "description",
        content:
          "Create a new LaptopAI Store account to track orders, save laptop comparisons, and receive AI-powered recommendations.",
      },
      { property: "og:title", content: "Create Account — LaptopAI Store" },
      {
        property: "og:description",
        content: "Register for a free LaptopAI Store account.",
      },
    ],
  }),
  component: Register,
});

function Register() {
  const { signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already logged in, redirect home
  useEffect(() => {
    if (!authLoading && user && !successMessage) {
      void navigate({ to: "/" });
    }
  }, [user, authLoading, navigate, successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please ensure both passwords are identical.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await signUp(trimmedEmail, password, trimmedName);
      if (authError) {
        let displayError = authError.message;
        const lowerMsg = authError.message.toLowerCase();
        if (
          lowerMsg.includes("rate limit") ||
          lowerMsg.includes("over_email_send_rate_limit") ||
          (authError as any).status === 429
        ) {
          displayError =
            "Registration request rate limit exceeded. Please wait a few moments before trying again.";
        } else if (
          lowerMsg.includes("user already registered") ||
          lowerMsg.includes("already exists")
        ) {
          displayError = "This email is already registered. Please sign in instead.";
        } else if (
          lowerMsg.includes("weak_password") ||
          lowerMsg.includes("password should be at least")
        ) {
          displayError = "Password is too weak. Please use at least 6 characters.";
        }
        setError(displayError);
        toast.error("Registration Failed", { description: displayError });
      } else if (data?.user) {
        // If session created immediately (Confirm Email is OFF)
        if (data.session) {
          toast.success("Account created successfully!", {
            description: `Welcome to TechAI Store, ${trimmedName}!`,
          });
          void navigate({ to: "/shop" });
        } else {
          setSuccessMessage(
            "Account registered successfully! You can now sign in with your email and password.",
          );
          toast.success("Registration Successful", {
            description: "Your profile has been created.",
          });
        }
      }
    } catch (err: any) {
      let msg = err?.message || "An unexpected error occurred during registration.";
      if (msg.toLowerCase().includes("failed to fetch")) {
        msg =
          "Unable to connect to Supabase authentication service. Please check your internet connection or verify Supabase project status.";
      }
      setError(msg);
      toast.error("Registration Error", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12">
      <div className="surface-card w-full max-w-md p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl gradient-ai text-secondary-foreground shadow-lg">
            <Laptop className="size-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Join LaptopAI Store for smart recommendations
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="size-5 shrink-0" />
            <div className="flex-1 font-medium">{error}</div>
          </div>
        )}

        {successMessage ? (
          <div className="space-y-6 text-center">
            <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-left text-sm text-success">
              <CheckCircle2 className="size-5 shrink-0 text-success" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
            <Button asChild className="w-full rounded-xl py-5 text-sm font-semibold shadow-md">
              <Link to="/login">
                Proceed to Sign In <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="register-name" className="text-sm font-medium">
                Full Name
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-name"
                  type="text"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Almira Ramadani"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email" className="text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-confirm-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="rounded-xl pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-5 text-sm font-semibold shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" /> Creating Account...
                </>
              ) : (
                <>
                  Register <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-secondary transition-colors hover:underline"
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
